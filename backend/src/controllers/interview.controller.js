const InterviewSession = require('../models/InterviewSession');
const InterviewMessage = require('../models/InterviewMessage');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const interviewAgent = require('../ai/agents/InterviewAgent');
const ragService = require('../services/ragService');

const SECTIONS_CONFIG = [
  { id: 'PROJECT_INFORMATION', name: 'Project Information', stepIndex: 1, description: 'Project name, problem solved, primary objective, and high-level scope.' },
  { id: 'STAKEHOLDERS_AND_USERS', name: 'Stakeholders & Users', stepIndex: 2, description: 'Primary and secondary stakeholders, user categories, admins, managers, and clients.' },
  { id: 'USER_ROLES_AND_PERMISSIONS', name: 'User Roles & Permissions', stepIndex: 3, description: 'Role hierarchy, access control rules, permission boundaries, and restrictions.' },
  { id: 'FUNCTIONAL_REQUIREMENTS', name: 'Functional Requirements', stepIndex: 4, description: 'Core capabilities, workflows, actions, and atomic system behaviors (FR-XXX).' },
  { id: 'NON_FUNCTIONAL_REQUIREMENTS', name: 'Non-Functional Requirements', stepIndex: 5, description: 'Performance targets, security standards, scalability, and availability (NFR-XXX).' },
  { id: 'EXTERNAL_INTERFACES', name: 'External Interfaces', stepIndex: 6, description: 'APIs, payment gateways, database integrations, email/SMS services, and third-party systems.' },
  { id: 'CONSTRAINTS', name: 'Constraints', stepIndex: 7, description: 'Technology stack, budget, timeline, regulatory compliance, and legal limitations.' },
  { id: 'ASSUMPTIONS_AND_DEPENDENCIES', name: 'Assumptions & Dependencies', stepIndex: 8, description: 'Operational assumptions, external software dependencies, and network requirements.' },
  { id: 'REVIEW_AND_CONFIRMATION', name: 'Review & Confirmation', stepIndex: 9, description: 'Final requirements summary review, coverage validation, and lock confirmation before SRS generation.' }
];

function calculateCoverage(sectionsState, totalRequirementsCount) {
  const completedCount = sectionsState.filter(s => s.status === 'COMPLETED' && s.id !== 'REVIEW_AND_CONFIRMATION').length;
  const inProgressCount = sectionsState.filter(s => s.status === 'IN_PROGRESS' && s.id !== 'REVIEW_AND_CONFIRMATION').length;
  
  // 8 elicitation sections total
  let baseScore = Math.round((completedCount / 8) * 80) + (inProgressCount > 0 ? 5 : 0);
  if (totalRequirementsCount >= 6) baseScore += 10;
  else if (totalRequirementsCount >= 3) baseScore += 5;

  if (completedCount === 8) baseScore = 95;
  return Math.min(100, Math.max(10, baseScore));
}

async function buildProjectRequirementsSummary(projectId) {
  const requirements = await Requirement.find({ projectId });
  const frs = requirements.filter(r => r.type === 'FUNCTIONAL');
  const nfrs = requirements.filter(r => r.type === 'NON_FUNCTIONAL');
  const constraints = requirements.filter(r => r.type === 'CONSTRAINT');
  const assumptions = requirements.filter(r => r.type === 'ASSUMPTION');
  const interfaces = requirements.filter(r => r.type === 'INTERFACE');
  const stakeholders = requirements.filter(r => r.type === 'STAKEHOLDER');

  return {
    totalRequirements: requirements.length,
    functionalCount: frs.length,
    nonFunctionalCount: nfrs.length,
    constraintsCount: constraints.length,
    assumptionsCount: assumptions.length,
    interfacesCount: interfaces.length,
    stakeholdersCount: stakeholders.length,
    functionalList: frs.map(f => ({ id: f.requirementId, title: f.title })),
    nonFunctionalList: nfrs.map(n => ({ id: n.requirementId, title: n.title, subcategory: n.nfrSubcategory }))
  };
}

exports.startInterview = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    let session = await InterviewSession.findOne({ projectId });
    if (!session) {
      session = await InterviewSession.create({
        projectId,
        currentSection: 'PROJECT_INFORMATION',
        currentTopic: 'Project Information',
        sectionIndex: 0,
        coverage: 15,
        status: 'IN_PROGRESS',
        sectionsState: SECTIONS_CONFIG.map((sec, idx) => ({
          id: sec.id,
          name: sec.name,
          status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
          questionsAsked: 1,
          requirementsExtracted: 0
        }))
      });

      // Tailored welcome question for Step 1
      const initialQuestion = `Hello! I am your AI Requirements Engineer for "${project.projectName}". We will conduct a structured 9-stage elicitation interview conforming to ISO/IEC/IEEE 29148 standards.\n\nTo begin Step 1 (Project Information): What is the core problem that "${project.projectName}" solves, and what is its primary business or operational objective?`;

      await InterviewMessage.create({
        sessionId: session._id,
        projectId,
        sender: 'AI',
        content: initialQuestion,
        section: 'PROJECT_INFORMATION',
        topic: 'Project Information',
        stepIndex: 1,
        languageDetected: 'English',
        isOutOfScope: false
      });

      await Project.findByIdAndUpdate(projectId, { status: 'INTERVIEWING' });
    }

    const messages = await InterviewMessage.find({ projectId }).sort({ timestamp: 1 });
    const summary = await buildProjectRequirementsSummary(projectId);

    res.json({
      success: true,
      data: {
        session,
        messages,
        summary,
        sectionsConfig: SECTIONS_CONFIG
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { content, action } = req.body; // action: 'ANSWER' | 'SKIP_SECTION' | 'CONFIRM_AND_LOCK' | 'REOPEN'

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    let session = await InterviewSession.findOne({ projectId });
    if (!session) return res.status(400).json({ success: false, message: 'No active interview session found. Please start interview first.' });

    // Handle Lock / Reopen actions
    if (action === 'CONFIRM_AND_LOCK') {
      session.status = 'COMPLETED';
      session.isLocked = true;
      session.coverage = 100;
      session.sectionsState = session.sectionsState.map(s => ({ ...s, status: 'COMPLETED' }));
      session.summary = await buildProjectRequirementsSummary(projectId);
      await session.save();

      // Lock all requirements
      await Requirement.updateMany({ projectId }, { status: 'APPROVED' });
      await Project.findByIdAndUpdate(projectId, { status: 'ANALYZED' });

      return res.json({
        success: true,
        message: 'Requirements confirmed and locked successfully. Ready for SRS Generation.',
        data: { session, summary: session.summary }
      });
    }

    if (action === 'REOPEN') {
      session.status = 'IN_PROGRESS';
      session.isLocked = false;
      await session.save();
      return res.json({
        success: true,
        message: 'Interview session reopened for refinement.',
        data: { session }
      });
    }

    // If interview is already completed/locked, do not allow arbitrary interview questions
    if (session.status === 'COMPLETED' || session.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Interview session is COMPLETED and LOCKED. You can review requirements or proceed to SRS Generation.'
      });
    }

    let currentSectionIdx = session.sectionIndex || 0;
    if (currentSectionIdx < 0 || currentSectionIdx >= SECTIONS_CONFIG.length) {
      currentSectionIdx = 0;
    }
    const currentSectionConfig = SECTIONS_CONFIG[currentSectionIdx];

    const initialSectionIdx = currentSectionIdx;
    const currentSecState = session.sectionsState[currentSectionIdx] || { questionsAsked: 0, requirementsExtracted: 0 };

    // Record user message
    const detectedLang = interviewAgent.detectLanguage(content);
    const userMsg = await InterviewMessage.create({
      sessionId: session._id,
      projectId,
      sender: 'USER',
      content: content || (action === 'SKIP_SECTION' ? `[Skipped section: ${currentSectionConfig.name}]` : 'Proceeding.'),
      section: currentSectionConfig.id,
      topic: currentSectionConfig.name,
      stepIndex: currentSectionConfig.stepIndex,
      languageDetected: detectedLang,
      isOutOfScope: false
    });

    // Check if user chose to skip section
    const userExplicitlySkipped = action === 'SKIP_SECTION';

    // Fetch existing requirements for deduplication and context
    const existingReqs = await Requirement.find({ projectId });
    const history = await InterviewMessage.find({ projectId }).sort({ timestamp: -1 }).limit(8);
    history.reverse();

    // Run AI Interview Agent (with Strict Context Guard, Language & Quality Engine)
    const turnResult = await interviewAgent.processInterviewTurn({
      projectContext: project,
      conversationHistory: history,
      currentSectionConfig,
      existingRequirements: existingReqs,
      currentStats: { coverage: session.coverage },
      lastUserMessage: content || '',
      sectionRequirementsCount: currentSecState.requirementsExtracted || 0
    });

    // 🔴 HARD BLOCK: If out-of-scope or casual greeting, STOP and STAY in the same section!
    if (turnResult.isOutOfScope && !userExplicitlySkipped) {
      userMsg.isOutOfScope = true;
      await userMsg.save();

      const aiMsg = await InterviewMessage.create({
        sessionId: session._id,
        projectId,
        sender: 'AI',
        content: turnResult.question,
        section: currentSectionConfig.id,
        topic: currentSectionConfig.name,
        stepIndex: currentSectionConfig.stepIndex,
        languageDetected: turnResult.language || 'English',
        isOutOfScope: true
      });

      // Save unchanged session state
      await session.save();

      return res.json({
        success: true,
        data: {
          session,
          userMessage: userMsg,
          aiMessage: aiMsg,
          isOutOfScope: true,
          currentSection: currentSectionConfig.id,
          stageChanged: false,
          newRequirementsExtracted: []
        }
      });
    }

    // Save newly extracted atomic requirements
    const extractedIds = [];
    if (turnResult.extractedRequirements && turnResult.extractedRequirements.length > 0) {
      const allExisting = await Requirement.find({ projectId });
      let frCount = allExisting.filter(r => r.type === 'FUNCTIONAL').length;
      let nfrCount = allExisting.filter(r => r.type === 'NON_FUNCTIONAL').length;
      let conCount = allExisting.filter(r => r.type === 'CONSTRAINT').length;
      let asmCount = allExisting.filter(r => r.type === 'ASSUMPTION').length;
      let intCount = allExisting.filter(r => r.type === 'INTERFACE').length;
      let stkCount = allExisting.filter(r => r.type === 'STAKEHOLDER').length;

      for (const cr of turnResult.extractedRequirements) {
        let reqId;
        if (cr.type === 'NON_FUNCTIONAL') {
          nfrCount++;
          reqId = `NFR-${String(nfrCount).padStart(3, '0')}`;
        } else if (cr.type === 'CONSTRAINT') {
          conCount++;
          reqId = `CON-${String(conCount).padStart(3, '0')}`;
        } else if (cr.type === 'ASSUMPTION') {
          asmCount++;
          reqId = `ASM-${String(asmCount).padStart(3, '0')}`;
        } else if (cr.type === 'INTERFACE') {
          intCount++;
          reqId = `INT-${String(intCount).padStart(3, '0')}`;
        } else if (cr.type === 'STAKEHOLDER') {
          stkCount++;
          reqId = `STK-${String(stkCount).padStart(3, '0')}`;
        } else {
          frCount++;
          reqId = `FR-${String(frCount).padStart(3, '0')}`;
        }

        const newReq = await Requirement.create({
          projectId,
          requirementId: reqId,
          title: cr.title,
          description: cr.description,
          type: cr.type || 'FUNCTIONAL',
          nfrSubcategory: cr.nfrSubcategory || 'N/A',
          category: cr.category || currentSectionConfig.name,
          priority: cr.priority || 'MEDIUM',
          completenessScore: cr.completenessScore || 85,
          isAtomic: true,
          sourceMessageId: userMsg.messageId,
          sourceText: content,
          status: 'PROPOSED',
          validationStatus: 'VALID'
        });
        extractedIds.push(newReq.requirementId);
      }
    }

    userMsg.extractedRequirementIds = extractedIds;
    await userMsg.save();

    // Update section extraction counter
    if (session.sectionsState[currentSectionIdx]) {
      session.sectionsState[currentSectionIdx].questionsAsked = (session.sectionsState[currentSectionIdx].questionsAsked || 0) + 1;
      session.sectionsState[currentSectionIdx].requirementsExtracted = (session.sectionsState[currentSectionIdx].requirementsExtracted || 0) + extractedIds.length;
    }

    const currentSectionReqsTotal = session.sectionsState[currentSectionIdx]?.requirementsExtracted || 0;

    // 🔴 STRICT STAGE ADVANCEMENT GATE:
    // Only advance to the next section IF:
    // 1. User clicked Skip Section button (userExplicitlySkipped), OR
    // 2. We have at least 1 extracted requirement AND AI marked sectionCompleted: true, OR
    // 3. We have 2 or more extracted requirements for this section
    const shouldAdvanceSection = userExplicitlySkipped ||
      (currentSectionReqsTotal >= 1 && turnResult.sectionCompleted) ||
      (currentSectionReqsTotal >= 2);

    let aiQuestionText = '';

    if (shouldAdvanceSection) {
      // Mark current section complete
      if (session.sectionsState[currentSectionIdx]) {
        session.sectionsState[currentSectionIdx].status = 'COMPLETED';
      }

      // Advance to next section if not already at the end
      if (currentSectionIdx < SECTIONS_CONFIG.length - 1) {
        currentSectionIdx++;
        session.sectionIndex = currentSectionIdx;
        session.currentSection = SECTIONS_CONFIG[currentSectionIdx].id;
        session.currentTopic = SECTIONS_CONFIG[currentSectionIdx].name;

        if (session.sectionsState[currentSectionIdx]) {
          session.sectionsState[currentSectionIdx].status = 'IN_PROGRESS';
        }

        // Synchronize AI Question: ALWAYS ask the NEW section's introductory question!
        const nextSec = SECTIONS_CONFIG[currentSectionIdx];
        if (currentSectionIdx === 8) {
          // Review & Confirmation section
          const totalReqs = await Requirement.countDocuments({ projectId });
          aiQuestionText = `I have collected requirements across all elicitation sections with ${session.coverage}% coverage (${totalReqs} requirements captured).\n\nPlease review the summary below. When ready, click "Confirm & Generate SRS" to lock requirements and generate your IEEE 830 / ISO 29148 compliant SRS.`;
        } else {
          aiQuestionText = interviewAgent.getSectionInitialQuestion(nextSec.id, project.projectName, detectedLang);
        }
      }
    } else {
      // 🟢 STAY IN CURRENT SECTION:
      // Ask a targeted follow-up question for the CURRENT section
      aiQuestionText = turnResult.question || interviewAgent.getSectionFollowUpQuestion(currentSectionConfig.id, project.projectName, detectedLang);
    }

    // Recompute total requirements & coverage
    const totalReqCount = await Requirement.countDocuments({ projectId });
    session.coverage = calculateCoverage(session.sectionsState, totalReqCount);

    // If reaching Review section (Step 9) or coverage >= 90%
    if (session.sectionIndex === 8 || session.coverage >= 90) {
      session.status = 'AWAITING_CONFIRMATION';
    }

    session.summary = await buildProjectRequirementsSummary(projectId);
    await session.save();

    const activeSecConfig = SECTIONS_CONFIG[session.sectionIndex];
    const aiMsg = await InterviewMessage.create({
      sessionId: session._id,
      projectId,
      sender: 'AI',
      content: aiQuestionText,
      section: activeSecConfig.id,
      topic: activeSecConfig.name,
      stepIndex: activeSecConfig.stepIndex,
      languageDetected: turnResult.language || 'English',
      isOutOfScope: false
    });

    await ragService.indexProjectKnowledge(projectId);

    res.json({
      success: true,
      data: {
        session,
        userMessage: userMsg,
        aiMessage: aiMsg,
        isOutOfScope: false,
        currentSection: session.currentSection,
        stageChanged: (session.sectionIndex !== initialSectionIdx),
        newRequirementsExtracted: extractedIds,
        summary: session.summary
      }
    });
  } catch (error) {

    next(error);
  }
};

exports.getInterview = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const session = await InterviewSession.findOne({ projectId }).sort({ createdAt: -1 });
    if (!session) {
      return res.json({ success: true, data: { session: null, messages: [], sectionsConfig: SECTIONS_CONFIG } });
    }

    const messages = await InterviewMessage.find({ projectId }).sort({ timestamp: 1 });
    const summary = await buildProjectRequirementsSummary(projectId);

    res.json({
      success: true,
      data: {
        session,
        messages,
        summary,
        sectionsConfig: SECTIONS_CONFIG
      }
    });
  } catch (error) {
    next(error);
  }
};

