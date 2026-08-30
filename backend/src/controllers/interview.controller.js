const InterviewSession = require('../models/InterviewSession');
const InterviewMessage = require('../models/InterviewMessage');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const interviewAgent = require('../ai/agents/InterviewAgent');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const ragService = require('../services/ragService');
const { SECTIONS_CONFIG } = require('../constants/interviewSections');

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
    const { content, action, sectionId } = req.body; // action: 'ANSWER' | 'SKIP_SECTION' | 'CONFIRM_AND_LOCK' | 'REOPEN'

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    let session = await InterviewSession.findOne({ projectId });
    if (!session) return res.status(400).json({ success: false, message: 'No active interview session found. Please start interview first.' });

    // Optional: caller may state which elicitation section the answer belongs to
    // (used when answers arrive out of band). The interview UI drives the
    // current section; this hint just aligns semantic classification context.
    if (sectionId && !action) {
      const idx = SECTIONS_CONFIG.findIndex((s) => s.id === sectionId);
      if (idx >= 0) {
        session.sectionIndex = idx;
        session.currentSection = SECTIONS_CONFIG[idx].id;
        session.currentTopic = SECTIONS_CONFIG[idx].name;
      }
    }

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

    // Identify the active question being answered
    const lastAiMsg = [...history].reverse().find(m => m.sender === 'AI' && !m.isOutOfScope);
    const rawQuestion = lastAiMsg?.content || '';
    const cleanQuestion = rawQuestion.includes('👉 **Current Question:**')
      ? rawQuestion.split('👉 **Current Question:**').pop().trim()
      : rawQuestion;
    const currentQuestion = cleanQuestion || interviewAgent.getSectionInitialQuestion(currentSectionConfig.id, project.projectName, detectedLang);

    // Run AI Interview Agent (with Strict Context Guard, Language & Quality Engine)
    const turnResult = await interviewAgent.processInterviewTurn({
      projectContext: project,
      conversationHistory: history,
      currentSectionConfig,
      currentQuestion,
      existingRequirements: existingReqs,
      currentStats: { coverage: session.coverage },
      lastUserMessage: content || '',
      sectionRequirementsCount: currentSecState.requirementsExtracted || 0
    });

    // 🔴 HARD BLOCK: If out-of-scope, casual greeting, or context mismatch, STOP and STAY in the same section!
    if (turnResult.isOutOfScope && !userExplicitlySkipped) {
      userMsg.isOutOfScope = true;
      userMsg.analysisResult = {
        status: 'CONTEXT_MISMATCH',
        reason: turnResult.analysis?.relevance?.reason,
        confidence: turnResult.analysis?.relevance?.confidence
      };
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
          contextMismatch: true,
          currentSection: currentSectionConfig.id,
          stageChanged: false,
          newRequirementsExtracted: []
        }
      });
    }

    // === Persist via the SINGLE AUTHORITATIVE PIPELINE WRITE PATH ===
    // The pipeline assigns stable IDs, embeddings, and guarantees that only
    // NORMALIZED requirements are stored (raw text lives only in rawSourceText).
    let persistResult = { saved: [], skippedDuplicates: [] };
    let extractedIds = [];
    if (turnResult.analysis && turnResult.analysis.requirements && turnResult.analysis.requirements.length > 0 && turnResult.analysis.isRequirementEvidence !== false) {
      persistResult = await pipeline.persistRequirements(projectId, turnResult.analysis, {
        sourceMessageId: userMsg.messageId
      });
      extractedIds = persistResult.saved.map(r => r.requirementId);

      // Record any duplicate / conflict / ambiguity issues raised for this answer
      if (turnResult.analysis.issues && turnResult.analysis.issues.length > 0) {
        for (const iss of turnResult.analysis.issues) {
          await RequirementIssue.create({ projectId, ...iss });
        }
      }
    }

    // Persist extracted structured entities to Project document
    if (turnResult.analysis?.entities) {
      const { stakeholdersInfo, constraintsInfo, dependenciesInfo } = turnResult.analysis.entities;
      let projectModified = false;

      if (stakeholdersInfo) {
        if (stakeholdersInfo.primaryUsers?.length) {
          project.targetUsers = [...new Set([...(project.targetUsers || []), ...stakeholdersInfo.primaryUsers])];
          projectModified = true;
        }
        if (stakeholdersInfo.stakeholders?.length) {
          project.stakeholders = [...new Set([...(project.stakeholders || []), ...stakeholdersInfo.stakeholders])];
          projectModified = true;
        }
      }

      if (constraintsInfo?.technologyConstraints?.length) {
        project.constraints = [...new Set([...(project.constraints || []), ...constraintsInfo.technologyConstraints])];
        projectModified = true;
      }

      if (dependenciesInfo?.dependencies?.length) {
        project.dependencies = [...new Set([...(project.dependencies || []), ...dependenciesInfo.dependencies])];
        projectModified = true;
      }

      if (projectModified) {
        await project.save();
      }
    }

    // Store the structured Phase-13 analysis result on the message (evidence)
    userMsg.analysisResult = {
      language: turnResult.analysis?.language?.language || detectedLang,
      informationQuality: turnResult.analysis?.informationQuality || null,
      clarificationQuestion: turnResult.analysis?.clarificationQuestion || null,
      skippedDuplicates: persistResult.skippedDuplicates
    };
    userMsg.extractedRequirementIds = extractedIds;
    await userMsg.save();

    // Update section extraction counter
    if (session.sectionsState[currentSectionIdx]) {
      session.sectionsState[currentSectionIdx].questionsAsked = (session.sectionsState[currentSectionIdx].questionsAsked || 0) + 1;
      session.sectionsState[currentSectionIdx].requirementsExtracted = (session.sectionsState[currentSectionIdx].requirementsExtracted || 0) + extractedIds.length;
    }

    const currentSectionReqsTotal = session.sectionsState[currentSectionIdx]?.requirementsExtracted || 0;
    const isEntitySection = ['PROJECT_INFORMATION', 'STAKEHOLDERS_AND_USERS', 'USER_ROLES_AND_PERMISSIONS', 'REVIEW_AND_CONFIRMATION'].includes(currentSectionConfig.id);

    // 🔴 STRICT STAGE ADVANCEMENT GATE:
    // Only advance to the next section IF:
    // 1. User clicked Skip Section button (userExplicitlySkipped), OR
    // 2. We are in an entity section and AI marked sectionCompleted: true, OR
    // 3. We have at least 1 extracted requirement AND AI marked sectionCompleted: true, OR
    // 4. We have 2 or more extracted requirements for this section
    const shouldAdvanceSection = userExplicitlySkipped ||
      (isEntitySection && turnResult.sectionCompleted) ||
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

