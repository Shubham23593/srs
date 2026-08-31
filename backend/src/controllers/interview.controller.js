const InterviewSession = require('../models/InterviewSession');
const InterviewMessage = require('../models/InterviewMessage');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const interviewAgent = require('../ai/agents/InterviewAgent');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const ragService = require('../services/ragService');
const { SECTIONS_CONFIG } = require('../constants/interviewSections');
const InterviewContext = require('../ai/pipeline/InterviewContext');

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

      // Dynamic tailored welcome question for Step 1 using InterviewContext
      const initialContext = await InterviewContext.fromProjectAndSession(project, session);
      const initialQuestion = await interviewAgent.generateStageIntroQuestion(
        SECTIONS_CONFIG[0],
        initialContext,
        'English',
        []
      );

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

    let messages = await InterviewMessage.find({ projectId }).sort({ timestamp: 1 });
    if (messages.length === 0) {
      const activeSection = SECTIONS_CONFIG[session.sectionIndex || 0] || SECTIONS_CONFIG[0];
      const initialContext = await InterviewContext.fromProjectAndSession(project, session);
      const initialQuestion = await interviewAgent.generateStageIntroQuestion(
        activeSection,
        initialContext,
        'English',
        []
      );

      const initialMsg = await InterviewMessage.create({
        sessionId: session._id,
        projectId,
        sender: 'AI',
        content: initialQuestion,
        section: activeSection.id,
        topic: activeSection.name,
        stepIndex: activeSection.stepIndex,
        languageDetected: 'English',
        isOutOfScope: false
      });
      messages = [initialMsg];
      await Project.findByIdAndUpdate(projectId, { status: 'INTERVIEWING' });
    }

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

    // Optional: caller may state which elicitation section the answer belongs to.
    // The stage is the authoritative guard for extraction/follow-up/completion,
    // so an ANSWER carrying an explicit sectionId MUST be evaluated against that
    // stage (the client/UI is the source of the current step). This applies to
    // plain answers AND explicit 'ANSWER' actions; only navigation/lock actions
    // below override the stage themselves.
    const isLockOrReopen = action === 'CONFIRM_AND_LOCK' || action === 'REOPEN';
    if (sectionId && !isLockOrReopen) {
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

    // Build Single Source of Truth InterviewContext
    const interviewContext = await InterviewContext.fromProjectAndSession(project, session, {
      userLanguage: detectedLang,
      existingRequirements: existingReqs
    });

    // Run AI Interview Agent (with Strict Context Guard, Language & Quality Engine)
    const turnResult = await interviewAgent.processInterviewTurn({
      interviewContext,
      currentQuestion,
      lastUserMessage: content || '',
      sectionRequirementsCount: currentSecState.requirementsExtracted || 0
    });

    // 🔴 HARD BLOCK: If out-of-scope, casual greeting, or context mismatch, STOP and STAY in the same section!
    if (turnResult.isOutOfScope && !userExplicitlySkipped) {
      userMsg.isOutOfScope = true;
      userMsg.analysisResult = {
        // --- structured contract (out-of-scope branch) ---
        accepted: false,
        relevanceStatus: turnResult.analysis?.relevance?.status || 'UNRELATED',
        informationType: 'OUT_OF_SCOPE',
        stage: { stageId: currentSectionConfig.id, stageName: currentSectionConfig.name },
        extractedEntities: {},
        requirementCandidates: [],
        rejectedCandidates: [{ clause: content, reason: turnResult.analysis?.relevance?.reason || 'Out of project scope' }],
        clarificationNeeded: false,
        clarificationQuestion: null,
        missingInformation: [],
        stageComplete: false,
        shouldAdvance: false,
        nextStage: null,
        followUpQuestion: turnResult.question || '',
        providerStatus: turnResult.analysis?.providerStatus || 'DETERMINISTIC_ENGINE',
        warnings: ['Answer rejected as out of scope; stage not advanced'],
        // --- detail fields ---
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

    // Persist extracted structured KNOWLEDGE (kept separate from requirements)
    if (turnResult.analysis?.entities) {
      const ent = turnResult.analysis.entities;
      const { stakeholdersInfo, constraintsInfo, dependenciesInfo, rolesInfo, projectInfo, interfacesInfo } = ent;
      let projectModified = false;
      const merge = (field, values) => {
        const vals = (values || []).filter((v) => v && String(v).trim());
        if (!vals.length) return false;
        project[field] = [...new Set([...(project[field] || []), ...vals])];
        return true;
      };

      if (stakeholdersInfo) {
        projectModified = merge('targetUsers', stakeholdersInfo.primaryUsers) || projectModified;
        projectModified = merge('targetUsers', stakeholdersInfo.beneficiaries) || projectModified;
        projectModified = merge('stakeholders', stakeholdersInfo.stakeholders) || projectModified;
        projectModified = merge('stakeholders', stakeholdersInfo.administrators) || projectModified;
        projectModified = merge('stakeholders', stakeholdersInfo.partnerOrganizations) || projectModified;
      }

      if (rolesInfo) {
        projectModified = merge('roles', rolesInfo.userRoles) || projectModified;
        projectModified = merge('permissions', rolesInfo.permissions) || projectModified;
        projectModified = merge('permissions', rolesInfo.accessRules) || projectModified;
      }

      projectModified = merge('constraints', constraintsInfo?.technologyConstraints) || projectModified;
      projectModified = merge('dependencies', dependenciesInfo?.dependencies) || projectModified;
      projectModified = merge('dependencies', dependenciesInfo?.thirdPartyServices) || projectModified;
      projectModified = merge('assumptions', dependenciesInfo?.assumptions) || projectModified;
      projectModified = merge('externalInterfaces', interfacesInfo?.interfaces) || projectModified;

      // Project information knowledge (problem/objective) — store as text, not requirement.
      if (projectInfo?.problemStatement && !project.problemStatement) {
        project.problemStatement = String(projectInfo.problemStatement).slice(0, 2000);
        projectModified = true;
      }

      if (projectModified) {
        await project.save();
      }
    }

    // Store the structured analysis result on the message (evidence). This is
    // the ISO 29148 structured result contract for one answer: information type
    // classification, relevance, stage, extracted entities/requirement
    // candidates, rejected candidates, clarification/missing info, stage
    // completion/advance, follow-up question, and provider status.
    const analysis = turnResult.analysis || {};
    const relevance = analysis.relevance || {};
    userMsg.analysisResult = {
      // --- structured contract ---
      accepted: !turnResult.isOutOfScope,
      relevanceStatus: relevance.status || relevance.classification || (turnResult.isOutOfScope ? 'UNRELATED' : 'RELEVANT'),
      informationType: analysis.informationType || (analysis.requirements?.length ? 'REQUIREMENT_EVIDENCE' : 'KNOWLEDGE'),
      stage: { stageId: analysis.stageId || currentSectionConfig.id, stageName: analysis.stageName || currentSectionConfig.name },
      extractedEntities: analysis.entities || {},
      requirementCandidates: (analysis.requirements || []).map((r) => ({
        type: r.type,
        nfrSubcategory: r.nfrSubcategory,
        title: r.title,
        normalizedDescription: r.normalizedDescription,
        status: r.status,
        sourceInterviewStage: r.sourceInterviewStage
      })),
      rejectedCandidates: persistResult.rejectedByGate || analysis.ignoredClauses || [],
      clarificationNeeded: Boolean(analysis.clarificationQuestion) ||
        (analysis.requirements || []).some((r) => r.status === 'NEEDS_CLARIFICATION'),
      clarificationQuestion: analysis.clarificationQuestion || null,
      missingInformation: turnResult.missingInformation || turnResult.stageGate?.missingFields || [],
      stageComplete: Boolean(turnResult.sectionCompleted),
      shouldAdvance: Boolean(userExplicitlySkipped || turnResult.sectionCompleted),
      nextStage: (userExplicitlySkipped || turnResult.sectionCompleted)
        ? SECTIONS_CONFIG[Math.min(currentSectionIdx + 1, SECTIONS_CONFIG.length - 1)]?.id
        : null,
      followUpQuestion: turnResult.question || null,
      providerStatus: analysis.providerStatus || 'DETERMINISTIC_ENGINE',
      warnings: [
        ...(analysis.providerStatus === 'FAILED_DETERMINISTIC_FALLBACK' ? ['AI provider unavailable; deterministic fallback used'] : []),
        ...((persistResult.skippedDuplicates || []).length ? ['Duplicate requirement(s) flagged, not duplicated'] : []),
        ...((persistResult.rejectedByGate || []).length ? ['Requirement candidate(s) not allowed in current stage'] : [])
      ],
      // --- detail fields ---
      language: analysis.language?.language || detectedLang,
      informationQuality: analysis.informationQuality || null,
      skippedDuplicates: persistResult.skippedDuplicates
    };
    userMsg.extractedRequirementIds = extractedIds;
    await userMsg.save();

    // Update section extraction counter
    if (session.sectionsState[currentSectionIdx]) {
      session.sectionsState[currentSectionIdx].questionsAsked = (session.sectionsState[currentSectionIdx].questionsAsked || 0) + 1;
      session.sectionsState[currentSectionIdx].requirementsExtracted = (session.sectionsState[currentSectionIdx].requirementsExtracted || 0) + extractedIds.length;
    }

    // 🔴 STRICT STAGE ADVANCEMENT GATE (deterministic, stage-gate driven):
    // Advance ONLY when (a) the user explicitly skipped, or (b) the agent's
    // stage gate decided the current section has collected sufficient
    // stage-appropriate knowledge/requirements. A message on its own never
    // advances the stage, nor does a raw requirement count.
    const shouldAdvanceSection = userExplicitlySkipped || turnResult.sectionCompleted === true;

    let aiQuestionText = '';

    if (shouldAdvanceSection) {
      // Mark current section complete
      if (session.sectionsState[currentSectionIdx]) {
        session.sectionsState[currentSectionIdx].status = userExplicitlySkipped && !extractedIds.length && !turnResult.analysis?.entities ? 'SKIPPED' : 'COMPLETED';
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
          const prevQuestions = history.filter((m) => m.sender === 'AI').map((m) => m.content);
          aiQuestionText = await interviewAgent.generateStageIntroQuestion(nextSec, interviewContext, detectedLang, prevQuestions);
        }
      }
    } else {
      // 🟢 STAY IN CURRENT SECTION:
      // Ask a targeted follow-up question for the CURRENT section
      aiQuestionText = turnResult.question || interviewAgent.buildSmartDeterministicQuestion({
        projectContext: interviewContext,
        currentSectionConfig,
        missingInformation: turnResult.missingInformation,
        isNewStage: false,
        detectedLanguage: detectedLang
      });
    }

    // Recompute total requirements & coverage
    const totalReqCount = await Requirement.countDocuments({ projectId });
    session.coverage = calculateCoverage(session.sectionsState, totalReqCount);

    // If reaching Review section (Step 9) or coverage >= 90%
    if (session.sectionIndex === 8 || session.coverage >= 90) {
      session.status = 'AWAITING_CONFIRMATION';
    }

    session.summary = await buildProjectRequirementsSummary(projectId);
    if (typeof session.markModified === 'function') {
      session.markModified('sectionsState');
    }
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

