/**
 * ============================================================================
 * INTERVIEW AGENT (ISO/IEC/IEEE 29148 Conversational Elicitation)
 * ============================================================================
 *
 * Orchestrates natural, conversational AI requirements interviews:
 *   - Detects language (English, Hindi, Marathi, Hinglish, Mixed)
 *   - Evaluates answers via authoritative RequirementsPipeline & StageGate
 *   - Uses InterviewContext as the Single Source of Truth
 *   - Generates contextual, dynamic questions via Ollama (Zero-Hallucination)
 *   - Prevents question repetition using normalized intent & history checks
 *   - Uses deterministic contextual fallback when LLM is unavailable
 *   - Preserves deterministic authority: stageGate decides completeness
 */

const pipeline = require('../pipeline/requirementsPipeline');
const { detectLanguage } = require('../pipeline/languageDetector');
const { evaluateStageCompletion } = require('../pipeline/stageGate');
const InterviewContext = require('../pipeline/InterviewContext');
const { SECTIONS_CONFIG } = require('../../constants/interviewSections');

class InterviewAgent {
  detectLanguage(text = '') {
    return detectLanguage(text).language;
  }

  getSectionInitialQuestion(sectionId, projectName, language = 'English') {
    return this.buildSmartDeterministicQuestion({
      projectContext: { projectName },
      currentSectionConfig: { id: sectionId },
      isNewStage: true,
      detectedLanguage: language
    });
  }

  getSectionFollowUpQuestion(sectionId, projectName, language = 'English') {
    return this.buildSmartDeterministicQuestion({
      projectContext: { projectName },
      currentSectionConfig: { id: sectionId },
      isNewStage: false,
      detectedLanguage: language
    });
  }

  async generateDynamicFollowUp({
    sectionConfig,
    projectName,
    detectedLanguage = 'English',
    userAnswer = '',
    extractedEntities = {},
    extractedRequirements = [],
    conversationHistory = [],
    missingHint = ''
  }) {
    const res = await this.generateDynamicQuestion({
      projectContext: { projectName },
      currentSectionConfig: sectionConfig,
      conversationHistory,
      existingRequirements: extractedRequirements,
      extractedEntities,
      missingInformation: missingHint ? [missingHint] : [],
      lastUserAnswer: userAnswer,
      isNewStage: false,
      detectedLanguage
    });
    return res.question;
  }

  /**
   * Process one interview turn through the authoritative pipeline and stage gate.
   * Uses InterviewContext as the single source of truth.
   */
  async processInterviewTurn({
    interviewContext = null,
    projectContext = {},
    conversationHistory = [],
    currentSectionConfig = {},
    existingRequirements = [],
    currentStats = {},
    lastUserMessage = '',
    sectionRequirementsCount = 0,
    currentQuestion = ''
  }) {
    // 1. Build or use canonical InterviewContext
    const ctx = interviewContext || new InterviewContext({
      ...projectContext,
      conversationHistory,
      currentStage: currentSectionConfig,
      existingRequirements,
      coverage: currentStats.coverage || 0
    });

    if (currentSectionConfig && currentSectionConfig.id) {
      ctx.currentStage = currentSectionConfig;
      if (typeof currentSectionConfig.stepIndex === 'number') {
        ctx.stageIndex = currentSectionConfig.stepIndex - 1;
      }
    }

    const detectedLanguage = this.detectLanguage(lastUserMessage);
    ctx.userLanguage = detectedLanguage;

    // ===== 2. AUTHORITATIVE SEMANTIC ANALYSIS =====
    const analysis = await pipeline.analyzeAnswer({
      rawText: lastUserMessage,
      project: ctx,
      sectionConfig: ctx.currentStage,
      currentQuestion,
      conversationHistory: ctx.conversationHistory,
      existingRequirements: ctx.existingRequirements
    });

    const isMismatch = analysis.isOutOfScope ||
      analysis.relevance?.status === 'CONTEXT_MISMATCH' ||
      analysis.relevance?.status === 'INVALID';

    // ---- Out of scope / Invalid: polite redirection ----
    if (isMismatch) {
      const redirection = this._redirectionMessage(
        analysis.message,
        ctx,
        ctx.currentStage,
        detectedLanguage,
        currentQuestion
      );

      this._logTurnTrace({
        projectId: ctx.projectId,
        currentStage: ctx.currentStage.id,
        userLanguage: detectedLanguage,
        relevanceStatus: analysis.relevance?.status || 'INVALID',
        informationType: 'OUT_OF_SCOPE',
        extractedEntities: {},
        extractedRoles: [],
        extractedPermissions: [],
        requirementCandidates: [],
        existingKnowledge: ctx.toMergedKnowledge(),
        mergedKnowledge: ctx.toMergedKnowledge(),
        missingInformation: [],
        stageGateResult: { complete: false, status: 'BLOCKED_OUT_OF_SCOPE' },
        sectionCompleted: false,
        shouldAdvance: false,
        nextStage: null,
        generatedQuestion: redirection,
        providerStatus: analysis.providerStatus || 'DETERMINISTIC_ENGINE'
      });

      return {
        question: redirection,
        section: ctx.currentStage.name,
        step: ctx.currentStage.stepIndex,
        language: detectedLanguage,
        progress: ctx.coverage || 15,
        isOutOfScope: true,
        contextMismatch: true,
        isRelevant: false,
        sectionCompleted: false,
        interviewCompleted: false,
        extractedRequirements: [],
        analysis,
        missingInformation: [],
        questionSource: 'REDIRECTION',
        notes: `Out-of-scope/Context-mismatch input intercepted (${analysis.relevance?.reason || analysis.relevance?.status}).`
      };
    }

    const isPartial = analysis.relevance?.status === 'PARTIALLY_RELEVANT' ||
      analysis.relevance?.classification === 'PARTIALLY_RELEVANT';

    // ---- 3. MERGE KNOWLEDGE & EVALUATE STAGE GATE (DETERMINISTIC AUTHORITY) ----
    const newRequirementCount = analysis.requirements.length;
    const totalSectionRequirements = sectionRequirementsCount + newRequirementCount;

    // Merge extracted entities into InterviewContext
    if (analysis.entities) {
      ctx.mergeExtractedEntities(analysis.entities);
    }

    const mergedKnowledge = ctx.toMergedKnowledge();

    const gate = evaluateStageCompletion({
      stageId: ctx.currentStage.id,
      entities: analysis.entities || {},
      project: mergedKnowledge,
      stageRequirements: totalSectionRequirements,
      outOfScope: false,
      userSkipped: false
    });

    // Deterministic gate completeness decision (never blocked by PARTIALLY_RELEVANT if criteria satisfied)
    const sectionCompleted = Boolean(gate.complete);

    // Normalized requirements for display
    const extractedRequirements = analysis.requirements.map((r) => ({
      title: r.title,
      description: r.normalizedDescription,
      normalizedDescription: r.normalizedDescription,
      type: r.type,
      nfrSubcategory: r.nfrSubcategory,
      category: r.category,
      topicCluster: r.topicCluster,
      priority: r.priority,
      status: isPartial && !sectionCompleted ? 'NEEDS_CLARIFICATION' : r.status,
      ambiguityFlags: r.ambiguityFlags,
      clarificationQuestion: r.clarificationQuestion,
      qualityFlags: r.qualityFlags,
      isAtomic: r.isAtomic,
      confidence: r.confidence
    }));

    // ---- 4. GENERATE DYNAMIC FOLLOW-UP QUESTION IF STAGE INCOMPLETE ----
    let nextQuestion = '';
    let questionSource = 'DETERMINISTIC_CONTEXTUAL';

    if (!sectionCompleted) {
      const dynamicRes = await this.generateDynamicQuestion({
        projectContext: ctx,
        currentSectionConfig: ctx.currentStage,
        conversationHistory: ctx.conversationHistory,
        existingRequirements: ctx.existingRequirements,
        extractedEntities: analysis.entities,
        missingInformation: gate.missingFields,
        lastUserAnswer: lastUserMessage,
        isNewStage: false,
        detectedLanguage,
        previousQuestions: ctx.previousQuestions
      });

      nextQuestion = dynamicRes.question;
      questionSource = dynamicRes.source;
    }

    // Trace logging for auditability
    this._logTurnTrace({
      projectId: ctx.projectId,
      currentStage: ctx.currentStage.id,
      userLanguage: detectedLanguage,
      relevanceStatus: analysis.relevance?.status || (isPartial ? 'PARTIALLY_RELEVANT' : 'RELEVANT'),
      informationType: analysis.informationType || (analysis.requirements?.length ? 'REQUIREMENT_EVIDENCE' : 'KNOWLEDGE'),
      extractedEntities: analysis.entities || {},
      extractedRoles: analysis.entities?.rolesInfo?.userRoles || [],
      extractedPermissions: analysis.entities?.rolesInfo?.permissions || [],
      requirementCandidates: extractedRequirements.map(r => r.title),
      existingKnowledge: ctx.toMergedKnowledge(),
      mergedKnowledge,
      missingInformation: gate.missingFields || [],
      stageGateResult: gate,
      sectionCompleted,
      shouldAdvance: sectionCompleted,
      nextStage: sectionCompleted ? 'ADVANCING' : ctx.currentStage.id,
      generatedQuestion: nextQuestion,
      providerStatus: analysis.providerStatus || 'DETERMINISTIC_ENGINE'
    });

    return {
      question: nextQuestion,
      section: ctx.currentStage.name,
      step: ctx.currentStage.stepIndex,
      language: detectedLanguage,
      progress: ctx.coverage || 15,
      isOutOfScope: false,
      isRelevant: true,
      isPartiallyRelevant: isPartial,
      sectionCompleted,
      interviewCompleted: false,
      extractedRequirements,
      analysis,
      stageGate: gate,
      missingInformation: gate.missingFields || [],
      questionSource,
      notes: newRequirementCount
        ? `Extracted ${newRequirementCount} atomic requirement(s).`
        : analysis.message
    };
  }

  /**
   * Generates a context-aware dynamic question using Ollama with Zero-Hallucination rules,
   * strict stage boundary validation, repetition prevention, and smart deterministic fallback.
   */
  async generateDynamicQuestion({
    projectContext = {},
    currentSectionConfig = {},
    conversationHistory = [],
    existingRequirements = [],
    extractedEntities = {},
    missingInformation = [],
    lastUserAnswer = '',
    isNewStage = false,
    detectedLanguage = 'English',
    previousQuestions = []
  }) {
    const { getAIProvider } = require('../index');
    const { validateQuestionAgainstStage } = require('../pipeline/questionValidator');
    const ai = getAIProvider();

    const projectName = projectContext.projectName || 'the system';
    const projectDomain = projectContext.domain || 'Software System';
    const projectDesc = projectContext.description || 'Not provided';
    const projectScope = projectContext.scope || 'Not provided';
    const stageName = currentSectionConfig.name || 'Requirements Elicitation';
    const stageId = currentSectionConfig.id;
    const stageDesc = currentSectionConfig.description || '';
    const missingHint = (missingInformation && missingInformation[0]) || '';

    // Extract recent conversational context
    const recentAnswers = conversationHistory
      .filter((m) => m.sender === 'USER')
      .slice(-3)
      .map((m) => `"${m.content}"`)
      .join(', ');

    const knownRoles = (projectContext.roles || []).filter(Boolean);
    const knownUsers = (projectContext.targetUsers || []).filter(Boolean);
    const knownProblem = projectContext.problemStatement || projectContext.description || '';
    const knownInterfaces = (projectContext.externalInterfaces || []).filter(Boolean);
    const knownConstraints = (projectContext.constraints || []).filter(Boolean);
    const knownAssumptions = (projectContext.assumptions || []).filter(Boolean);
    const knownPermissions = (projectContext.permissions || []).filter(Boolean);

    // Build the dynamic Senior Requirements Engineer Prompt
    const dynamicProjectContext = `Project: "${projectName}"
Domain / Industry: ${projectDomain}
Description: ${projectDesc}
Scope: ${projectScope}
Core Problem Statement: ${knownProblem || 'Not specified'}`;

    const existingKnowledge = `Target Users: ${knownUsers.join(', ') || 'None identified yet'}
Stakeholders: ${(projectContext.stakeholders || []).join(', ') || 'None identified yet'}
Roles: ${knownRoles.join(', ') || 'None identified yet'}
Permissions/Access Rules: ${knownPermissions.join('; ') || 'None identified yet'}
External Interfaces: ${knownInterfaces.join(', ') || 'None identified yet'}
Constraints: ${knownConstraints.join(', ') || 'None identified yet'}
Assumptions: ${knownAssumptions.join(', ') || 'None identified yet'}
Requirements Captured So Far: ${existingRequirements.length}`;

    let currentStageKnowledge = 'None';
    if (stageId === 'USER_ROLES_AND_PERMISSIONS') {
      currentStageKnowledge = `Roles Identified: [${knownRoles.join(', ') || 'None'}]. Permissions Identified: [${knownPermissions.join(', ') || 'None'}].`;
    } else if (stageId === 'STAKEHOLDERS_AND_USERS') {
      currentStageKnowledge = `Users Identified: [${knownUsers.join(', ') || 'None'}]. Stakeholders Identified: [${(projectContext.stakeholders || []).join(', ') || 'None'}].`;
    } else if (stageId === 'PROJECT_INFORMATION') {
      currentStageKnowledge = `Problem Statement: ${knownProblem || 'Not set'}`;
    }

    const completedStages = (projectContext.completedStages || [])
      .concat(SECTIONS_CONFIG.filter((s) => s.stepIndex < currentSectionConfig.stepIndex).map((s) => s.id));

    let stageSpecificPromptGuidance = '';
    if (stageId === 'FUNCTIONAL_REQUIREMENTS') {
      stageSpecificPromptGuidance = `MANDATORY STAGE INSTRUCTION FOR FUNCTIONAL REQUIREMENTS:
- Ask ONLY about system actions, capabilities, workflows, features, and operational behaviors (what the system does).
- STRICTLY FORBIDDEN: Do NOT ask about permissions, access rules, role assignments, or who is allowed to do what (that was completed in stage 3).
- STRICTLY FORBIDDEN: Do NOT ask for performance SLAs, response times, or external APIs.`;
    } else if (stageId === 'NON_FUNCTIONAL_REQUIREMENTS') {
      stageSpecificPromptGuidance = `MANDATORY STAGE INSTRUCTION FOR NON-FUNCTIONAL REQUIREMENTS:
- Ask ONLY about measurable quality targets: performance (response times), uptime/availability, security/encryption, or reliability.
- STRICTLY FORBIDDEN: Do NOT ask for new features, user roles, or stakeholders.`;
    } else if (stageId === 'EXTERNAL_INTERFACES') {
      stageSpecificPromptGuidance = `MANDATORY STAGE INSTRUCTION FOR EXTERNAL INTERFACES:
- Ask ONLY about external systems, third-party APIs, hardware protocols, or communication gateways.
- STRICTLY FORBIDDEN: Do NOT ask about user permissions or general capabilities.`;
    } else if (stageId === 'CONSTRAINTS') {
      stageSpecificPromptGuidance = `MANDATORY STAGE INSTRUCTION FOR CONSTRAINTS:
- Ask ONLY about mandatory technology stacks, deployment hosting, budget limits, delivery timelines, or compliance regulations.
- STRICTLY FORBIDDEN: Do NOT ask for functional workflows or performance metrics.`;
    } else if (stageId === 'ASSUMPTIONS_AND_DEPENDENCIES') {
      stageSpecificPromptGuidance = `MANDATORY STAGE INSTRUCTION FOR ASSUMPTIONS & DEPENDENCIES:
- Ask ONLY about operational assumptions, network prerequisites, or external service dependencies.
- STRICTLY FORBIDDEN: Do NOT ask which new APIs or payment gateways to integrate with.`;
    }

    let violationFeedback = '';

    // Exactly 1 retry if validation fails (Attempt 1 -> Attempt 2 -> Fallback)
    for (let attempt = 1; attempt <= 2; attempt++) {
      const systemPrompt = `You are an expert AI Requirements Engineer conducting an ISO/IEC/IEEE 29148 requirements elicitation interview for "${projectName}".

PROJECT CONTEXT:
${dynamicProjectContext}

CURRENT STAGE (HARD SEMANTIC BOUNDARY):
Stage Name: ${stageName} (ID: ${stageId})
Stage Objective: ${stageDesc}
${isNewStage ? 'MODE: Introduce this new stage naturally, referencing the project context.' : 'MODE: Ask a targeted follow-up question for missing information in this stage.'}

${stageSpecificPromptGuidance}

COMPLETED STAGES (DO NOT ASK FOR INFORMATION FROM THESE):
${[...new Set(completedStages)].join(', ') || 'None'}

EXISTING EXTRACTED KNOWLEDGE:
${existingKnowledge}

CURRENT STAGE PROGRESS:
${currentStageKnowledge}

MISSING INFORMATION (YOUR SOLE TARGET):
${missingHint || 'Ask for concrete details strictly required to satisfy this stage objective.'}

PREVIOUS QUESTIONS ASKED IN THIS SESSION:
${previousQuestions.slice(-5).map((q, i) => `${i + 1}. "${q}"`).join('\n') || 'None'}

LATEST USER ANSWER:
"${lastUserAnswer || recentAnswers || 'None'}"

CRITICAL RULES:
1. DYNAMICITY = HOW THE QUESTION IS ASKED: Acknowledge and reference specific entities, roles, or concepts from the LATEST USER ANSWER naturally (e.g., "For students and faculty members...").
2. CURRENT STAGE = WHAT THE QUESTION IS ABOUT: The question must solicit ONLY information allowed in ${stageId}. Never ask for information that belongs to other stages (e.g., in Functional Requirements, ask for feature capabilities and workflows, NEVER permissions or access rules).
3. NO SEMANTIC REPETITION: Target ONLY missing information in this stage. Do NOT ask for information from completed stages.
4. LANGUAGE: Generate the question in the user's detected language (${detectedLanguage}).
5. Generate exactly ONE concise question ending with a question mark.

${violationFeedback}

Return ONLY a valid JSON object matching this schema:
{
  "question": "Your single dynamic question string ending with '?'",
  "intendedStage": "${stageId}",
  "informationTarget": "Short description of the missing information being elicited",
  "missingInformation": ["${missingHint || 'stage details'}"],
  "basedOnPreviousAnswer": true,
  "sourceEntitiesUsed": ["entities from context referenced"]
}`;

      if (ai && (await ai.isHealthy())) {
        try {
          const response = await ai.generateCompletion(systemPrompt, {
            temperature: 0.3,
            maxTokens: 300,
            timeout: 25000,
            retries: 0
          });

          // Resilient JSON extraction
          let rawText = (response || '').trim();
          let jsonStr = rawText;
          if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.replace(/^[\s\S]*?```json\s*/i, '').replace(/\s*```[\s\S]*$/, '');
          } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.replace(/^[\s\S]*?```\s*/, '').replace(/\s*```[\s\S]*$/, '');
          }

          let generatedData = null;
          try {
            generatedData = JSON.parse(jsonStr.trim());
          } catch (pe) {
            // Regex fallback to extract outermost JSON object
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                generatedData = JSON.parse(jsonMatch[0]);
              } catch (e2) {
                generatedData = null;
              }
            }
          }

          if (generatedData && typeof generatedData.question === 'string' && generatedData.question.trim().length >= 5) {
            // Ensure intendedStage defaults to stageId if omitted
            if (!generatedData.intendedStage) generatedData.intendedStage = stageId;

            // Run Layer 1-5 Deterministic Validation
            const validationResult = validateQuestionAgainstStage(generatedData, stageId, { completedStages });

            if (validationResult.valid) {
              const isRepetitive = this._isQuestionRepetitive(generatedData.question, previousQuestions);
              if (!isRepetitive) {
                return { question: generatedData.question.trim(), source: 'OLLAMA_DYNAMIC' };
              } else {
                violationFeedback = `PREVIOUS ATTEMPT FAILED: The generated question was semantically repetitive of an earlier question. Ask specifically for the missing information: "${missingHint || stageDesc}".`;
              }
            } else {
              violationFeedback = `CRITICAL REJECTION ON ATTEMPT ${attempt}: ${validationResult.reason}\nYou must stay strictly within the semantic boundary of ${stageId} and never ask about ${validationResult.detectedIntent} or completed stages.`;
            }
          } else {
            violationFeedback = `PREVIOUS ATTEMPT FAILED: Malformed or missing JSON. You must return a valid JSON object.`;
          }
        } catch (err) {
          console.warn(`[InterviewAgent] Dynamic LLM generation error on attempt ${attempt}:`, err.message);
          violationFeedback = `PREVIOUS ATTEMPT FAILED: Error during generation. Return valid JSON only.`;
        }
      }
    }

    // Safe Deterministic Contextual Fallback
    const fallbackQuestion = this.buildSmartDeterministicQuestion({
      projectContext,
      currentSectionConfig,
      missingInformation,
      isNewStage,
      detectedLanguage,
      lastUserAnswer
    });

    return { question: fallbackQuestion, source: 'DETERMINISTIC_CONTEXTUAL' };
  }

  /**
   * Generates a dynamic introductory question when advancing to a new stage.
   */
  async generateStageIntroQuestion(nextSectionConfig, projectContext, detectedLanguage = 'English', previousQuestions = []) {
    const dynamicRes = await this.generateDynamicQuestion({
      projectContext,
      currentSectionConfig: nextSectionConfig,
      conversationHistory: [],
      existingRequirements: [],
      isNewStage: true,
      detectedLanguage,
      previousQuestions
    });
    return dynamicRes.question;
  }

  /**
   * Smart deterministic contextual question builder that references project details
   * and previous entities instead of bare static strings.
   */
  buildSmartDeterministicQuestion({
    projectContext = {},
    currentSectionConfig = {},
    missingInformation = [],
    isNewStage = false,
    detectedLanguage = 'English',
    lastUserAnswer = ''
  }) {
    const projectName = projectContext.projectName || 'the system';
    const stageId = currentSectionConfig.id;
    const roles = (projectContext.roles || []).filter(Boolean);
    const users = (projectContext.targetUsers || []).filter(Boolean);
    const stakeholders = (projectContext.stakeholders || []).filter(Boolean);

    // Stage-specific contextual questions referencing known entities
    if (stageId === 'USER_ROLES_AND_PERMISSIONS' && roles.length > 0 && !isNewStage) {
      const rolesStr = roles.join(', ');
      if (detectedLanguage === 'Hindi') {
        return `आपने ${rolesStr} भूमिकाओं की पहचान की है। प्रत्येक भूमिका को सिस्टम में क्या करने की अनुमति होनी चाहिए?`;
      }
      if (detectedLanguage === 'Hinglish') {
        return `Aapne ${rolesStr} roles identify kiye hain. In roles ke specific access permissions aur rights kya hone chahiye?`;
      }
      return `You have identified ${rolesStr} roles. What specific permissions, access rights, or operational boundaries should each of these roles have in ${projectName}?`;
    }

    if (stageId === 'STAKEHOLDERS_AND_USERS' && users.length > 0 && !isNewStage) {
      const usersStr = users.join(', ');
      if (detectedLanguage === 'Hindi') {
        return `आपने ${usersStr} का उल्लेख किया है। क्या इस प्रणाली से जुड़े प्रशासक, पर्यवेक्षक, या अन्य संगठन भी हितधारक हैं?`;
      }
      if (detectedLanguage === 'Hinglish') {
        return `Aapne ${usersStr} mention kiya hai. Kya is system me administrators, supervisors ya partner organizations bhi stakeholders honge?`;
      }
      return `You mentioned ${usersStr}. Are there also administrators, supervisors, or partner organizations who will interact with or benefit from ${projectName}?`;
    }

    if (stageId === 'FUNCTIONAL_REQUIREMENTS') {
      const targetEntities = roles.length > 0 ? roles : users;
      if (targetEntities.length > 0) {
        const entityStr = targetEntities.slice(0, 4).join(', ');
        if (detectedLanguage === 'Hindi') {
          return `${entityStr} के लिए, वे ${projectName} में कौन-सी मुख्य सुविधाएँ, कार्य या वर्कफ़्लो निष्पादित करने में सक्षम होने चाहिए?`;
        }
        if (detectedLanguage === 'Hinglish') {
          return `${entityStr} ke liye, ${projectName} me core features, actions aur workflows kya hone chahiye?`;
        }
        return `For ${entityStr}, what core capabilities, actions, and workflows should they be able to perform in ${projectName}?`;
      }
    }

    if (stageId === 'ASSUMPTIONS_AND_DEPENDENCIES' && !isNewStage) {
      const knownServices = [...(projectContext.externalInterfaces || []), ...(projectContext.dependencies || [])].filter(Boolean);
      if (knownServices.length > 0) {
        const servicesStr = knownServices.slice(0, 3).join(' and ');
        if (detectedLanguage === 'Hindi') {
          return `${servicesStr} के सुचारू संचालन के लिए क्या परिचालन मान्यताएँ आवश्यक हैं, और ${projectName} किन बाहरी सेवाओं या नेटवर्क स्थितियों पर निर्भर करता है?`;
        }
        if (detectedLanguage === 'Hinglish') {
          return `${servicesStr} ke reliable working ke liye kya assumptions aur external service dependencies par ${projectName} rely karta hai?`;
        }
        return `What operational assumptions are required for ${servicesStr} to work reliably, and what external services or network conditions does ${projectName} depend on?`;
      }
    }

    if (!isNewStage && missingInformation && missingInformation.length > 0) {
      const missing = missingInformation[0];
      if (detectedLanguage === 'Hinglish') {
        return `${projectName} ke liye: ${missing}`;
      }
      return `For ${projectName}: ${missing}`;
    }

    const initialMap = {
      PROJECT_INFORMATION: {
        en: `What is the core problem that ${projectName} is intended to solve, and what is its primary objective?`,
        hi: `यह प्रणाली (${projectName}) मुख्य रूप से किस समस्या का समाधान करने के लिए है, और इसका प्राथमिक उद्देश्य क्या है?`,
        hng: `${projectName} main kis problem ko solve karne ke liye banaya ja raha hai, aur iska primary objective kya hai?`
      },
      STAKEHOLDERS_AND_USERS: {
        en: `Who are the primary end users, clients, and key stakeholders that will interact with or benefit from ${projectName}?`,
        hi: `वे मुख्य उपयोगकर्ता और हितधारक कौन हैं जो ${projectName} का उपयोग करेंगे या इससे लाभान्वित होंगे?`,
        hng: `Kaun se primary users aur stakeholders ${projectName} ko use karenge ya isse benefit lenge?`
      },
      USER_ROLES_AND_PERMISSIONS: {
        en: `What specific user roles will exist in ${projectName}, and what should each role be allowed to do?`,
        hi: `${projectName} में कौन-सी उपयोगकर्ता भूमिकाएँ होंगी, और प्रत्येक भूमिका को क्या करने की अनुमति होनी चाहिए?`,
        hng: `${projectName} me kaun se user roles honge, aur har role ko kya access permissions honi chahiye?`
      },
      FUNCTIONAL_REQUIREMENTS: {
        en: `What are the core capabilities, actions, or workflows that users must be able to perform in ${projectName}?`,
        hi: `उपयोगकर्ता ${projectName} में कौन-से मुख्य कार्य, सुविधाएँ या वर्कफ़्लो करने में सक्षम होने चाहिए?`,
        hng: `${projectName} me users ke core features, workflows aur actions kya hone chahiye?`
      },
      NON_FUNCTIONAL_REQUIREMENTS: {
        en: `What are the key performance (e.g. response time), security, availability, and reliability expectations for ${projectName}?`,
        hi: `${projectName} के लिए मुख्य प्रदर्शन (जैसे प्रतिक्रिया समय), सुरक्षा, उपलब्धता, और विश्वसनीयता अपेक्षाएं क्या हैं?`,
        hng: `${projectName} ke key performance (response time), security, availability aur reliability expectations kya hain?`
      },
      EXTERNAL_INTERFACES: {
        en: `Does ${projectName} need to connect with any external systems, third-party APIs, hardware sensors, or databases?`,
        hi: `क्या ${projectName} को किसी बाहरी सिस्टम, थर्ड-पार्टी एपीआई, हार्डवेयर सेंसर, या डेटाबेस से जुड़ने की आवश्यकता है?`,
        hng: `Kya ${projectName} ko kisi external systems, third-party APIs, hardware sensors ya databases se connect karna hoga?`
      },
      CONSTRAINTS: {
        en: `Are there any mandatory technology stack, budget, timeline, deployment, or regulatory compliance constraints for ${projectName}?`,
        hi: `क्या ${projectName} के लिए कोई अनिवार्य तकनीक, बजट, समयसीमा, या नियामक अनुपालन बाधाएं हैं?`,
        hng: `Kya ${projectName} ke liye koi mandatory tech stack, budget, timeline, deployment ya compliance constraints hain?`
      },
      ASSUMPTIONS_AND_DEPENDENCIES: {
        en: `What operational assumptions, network prerequisites, or external service dependencies does ${projectName} rely upon?`,
        hi: `${projectName} किन परिचालन मान्यताओं, नेटवर्क पूर्व-आवश्यकताओं, या बाहरी सेवा निर्भरताओं पर निर्भर करता है?`,
        hng: `${projectName} kin operational assumptions, network prerequisites ya external dependencies par depend karta hai?`
      },
      REVIEW_AND_CONFIRMATION: {
        en: `Please review the summarized requirements for ${projectName}. Is there anything you'd like to add or change before we lock these in for SRS generation?`,
        hi: `कृपया ${projectName} की आवश्यकताओं की समीक्षा करें। क्या आप कुछ जोड़ना या बदलना चाहेंगे?`,
        hng: `Kripya ${projectName} ke requirements ko review karein. Kya aap kuch add ya change karna chahte hain?`
      }
    };

    const entry = initialMap[stageId] || initialMap.PROJECT_INFORMATION;
    if (detectedLanguage === 'Hindi' && entry.hi) return entry.hi;
    if (detectedLanguage === 'Hinglish' && entry.hng) return entry.hng;
    return entry.en;
  }

  /**
   * Normalized intent and keyword repetition prevention check.
   */
  _isQuestionRepetitive(newQuestion = '', previousQuestions = []) {
    if (!previousQuestions || !previousQuestions.length) return false;
    const normalize = (q) =>
      q.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !['what', 'which', 'please', 'could', 'would', 'should', 'about', 'system', 'project', 'have', 'with', 'from', 'this', 'that'].includes(w));

    const newTokens = new Set(normalize(newQuestion));
    if (newTokens.size === 0) return false;

    for (const prev of previousQuestions.slice(-5)) {
      const prevTokens = new Set(normalize(prev));
      let overlap = 0;
      for (const t of newTokens) {
        if (prevTokens.has(t)) overlap++;
      }
      const similarity = overlap / Math.min(newTokens.size, prevTokens.size || 1);
      if (similarity >= 0.75) {
        return true;
      }
    }
    return false;
  }

  _redirectionMessage(reasonMessage, projectContext, sectionConfig, language, currentQuestion = '') {
    const base = reasonMessage ||
      `This input appears unrelated to ${projectContext.projectName || 'this project'}. Please provide information relevant to the current interview question.`;

    const activeQuestion = currentQuestion || this.buildSmartDeterministicQuestion({
      projectContext,
      currentSectionConfig: sectionConfig,
      isNewStage: true,
      detectedLanguage: language
    });

    if (language === 'Hinglish') {
      return `${base}\n\nHum abhi **${sectionConfig.name}** stage par hain.\n👉 **Current Question:** ${activeQuestion}`;
    }
    return `${base}\n\nWe are currently on the **${sectionConfig.name}** stage.\n👉 **Current Question:** ${activeQuestion}`;
  }

  _logTurnTrace(trace = {}) {
    if (process.env.NODE_ENV === 'test' || process.env.DEBUG) {
      console.log(`[TurnTrace][Stage: ${trace.currentStage}][Lang: ${trace.userLanguage}] Relevance: ${trace.relevanceStatus} | Reqs: ${trace.requirementCandidates?.length || 0} | Adv: ${trace.shouldAdvance} | Q: "${trace.generatedQuestion?.slice(0, 60)}..."`);
    }
  }
}

module.exports = new InterviewAgent();
