/**
 * Interview Agent.
 *
 * REFACTORED: This agent no longer extracts requirements itself and never copies
 * raw user text into requirement descriptions. It is a thin orchestration layer
 * that:
 *   - detects language (for question localization)
 *   - delegates ALL semantic analysis to the single authoritative
 *     RequirementsPipeline (guard -> understand -> decompose -> classify ->
 *     normalize -> quality/duplicate/conflict analysis)
 *   - produces the next interview question / redirection
 *
 * The RequirementsPipeline is the ONE authoritative production pipeline.
 */

const pipeline = require('../pipeline/requirementsPipeline');
const { detectLanguage } = require('../pipeline/languageDetector');
const { evaluateStageCompletion } = require('../pipeline/stageGate');

class InterviewAgent {
  detectLanguage(text = '') {
    return detectLanguage(text).language;
  }

  getSectionInitialQuestion(sectionId, projectName, language = 'English') {
    return QUESTIONS.initial[sectionId]
      ? localize(QUESTIONS.initial[sectionId], language, projectName)
      : localize(QUESTIONS.initial.PROJECT_INFORMATION, language, projectName);
  }

  getSectionFollowUpQuestion(sectionId, projectName, language = 'English') {
    return QUESTIONS.followUp[sectionId]
      ? localize(QUESTIONS.followUp[sectionId], language, projectName)
      : localize(QUESTIONS.followUp.PROJECT_INFORMATION, language, projectName);
  }

  /**
   * Process one interview turn through the authoritative pipeline.
   * Returns the structured analysis plus the next question to ask.
   */
  async processInterviewTurn({
    projectContext,
    conversationHistory = [],
    currentSectionConfig,
    existingRequirements = [],
    currentStats = {},
    lastUserMessage = '',
    sectionRequirementsCount = 0,
    currentQuestion = ''
  }) {
    const detectedLanguage = this.detectLanguage(lastUserMessage);

    // ===== THE AUTHORITATIVE PIPELINE (Phases 1-13) =====
    const analysis = await pipeline.analyzeAnswer({
      rawText: lastUserMessage,
      project: projectContext,
      sectionConfig: currentSectionConfig,
      currentQuestion,
      conversationHistory,
      existingRequirements
    });

    const isMismatch = analysis.isOutOfScope || analysis.relevance?.status === 'CONTEXT_MISMATCH' || analysis.relevance?.status === 'INVALID';

    // ---- Out of scope / Context Mismatch: redirect, create nothing ----
    if (isMismatch) {
      const redirection = this._redirectionMessage(
        analysis.message,
        projectContext,
        currentSectionConfig,
        detectedLanguage,
        currentQuestion
      );
      return {
        question: redirection,
        section: currentSectionConfig.name,
        step: currentSectionConfig.stepIndex,
        language: detectedLanguage,
        progress: currentStats.coverage || 15,
        isOutOfScope: true,
        contextMismatch: true,
        isRelevant: false,
        sectionCompleted: false,
        interviewCompleted: false,
        extractedRequirements: [],
        analysis,
        missingInformation: [],
        notes: `Out-of-scope/Context-mismatch input intercepted (${analysis.relevance?.reason || analysis.relevance?.status}).`
      };
    }

    // ---- Partially Relevant: ask for clarification, do NOT complete section ----
    const isPartial = analysis.relevance?.status === 'PARTIALLY_RELEVANT' || analysis.relevance?.classification === 'PARTIALLY_RELEVANT';

    // ---- Relevant answer ----
    const newRequirementCount = analysis.requirements.length;
    const totalSectionRequirements = sectionRequirementsCount + newRequirementCount;
    // ---- STAGE GATE (deterministic): completeness decided by stage-appropriate
    //      knowledge/requirements, NOT message count. Partial answers never
    //      auto-complete a stage.
    const gate = evaluateStageCompletion({
      stageId: currentSectionConfig?.id,
      entities: analysis.entities || {},
      project: projectContext || {},
      stageRequirements: totalSectionRequirements,
      outOfScope: false,
      userSkipped: false
    });
    const sectionCompleted = !isPartial && gate.complete;
    const stageGateReason = gate.reason;

    // Normalized requirements in the shape the controller expects for display
    const extractedRequirements = analysis.requirements.map((r) => ({
      title: r.title,
      description: r.normalizedDescription,
      normalizedDescription: r.normalizedDescription,
      type: r.type,
      nfrSubcategory: r.nfrSubcategory,
      category: r.category,
      topicCluster: r.topicCluster,
      priority: r.priority,
      status: isPartial ? 'NEEDS_CLARIFICATION' : r.status,
      ambiguityFlags: r.ambiguityFlags,
      clarificationQuestion: r.clarificationQuestion,
      qualityFlags: r.qualityFlags,
      isAtomic: r.isAtomic,
      confidence: r.confidence
    }));

    // Build next question. Priority: relevance feedback > clarification >
    // targeted missing-info hint (from the stage gate) > LLM dynamic > static bank.
    let nextQuestion;
    if (isPartial && (analysis.relevance?.feedbackMessage || analysis.relevance?.message)) {
      nextQuestion = analysis.relevance.feedbackMessage || analysis.relevance.message;
    } else if (analysis.clarificationQuestion && !sectionCompleted) {
      nextQuestion = analysis.clarificationQuestion;
    } else if (!sectionCompleted) {
      const missingHint = (gate.missingFields && gate.missingFields[0]) || '';
      nextQuestion = await this.generateDynamicFollowUp({
        sectionConfig: currentSectionConfig,
        projectName: projectContext.projectName,
        detectedLanguage,
        userAnswer: lastUserMessage,
        extractedEntities: analysis.entities,
        extractedRequirements,
        conversationHistory,
        missingHint
      });
      // Fall back to the deterministic, non-repetitive missing-info hint,
      // then to the static section follow-up bank.
      if ((!nextQuestion || nextQuestion.length < 5) && missingHint) {
        nextQuestion = missingHint;
      }
      if (!nextQuestion) {
        nextQuestion = this.getSectionFollowUpQuestion(
          currentSectionConfig.id, projectContext.projectName, detectedLanguage
        );
      }
    } else {
      nextQuestion = this.getSectionFollowUpQuestion(
        currentSectionConfig.id, projectContext.projectName, detectedLanguage
      );
    }

    return {
      question: nextQuestion,
      section: currentSectionConfig.name,
      step: currentSectionConfig.stepIndex,
      language: detectedLanguage,
      progress: currentStats.coverage || 15,
      isOutOfScope: false,
      isRelevant: true,
      isPartiallyRelevant: isPartial,
      sectionCompleted,
      interviewCompleted: false,
      extractedRequirements,
      analysis,
      stageGate: gate,
      missingInformation: gate.missingFields || [],
      notes: newRequirementCount
        ? `Pipeline extracted ${newRequirementCount} atomic normalized requirement(s); ${analysis.informationQuality.ambiguities} need clarification.`
        : analysis.message
    };
  }

  /**
   * Generates an intelligent, non-repetitive follow-up question using the LLM.
   * Falls back to the QUESTIONS dictionary if LLM is unavailable.
   */
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
    const { getAIProvider } = require('../index');
    const ai = getAIProvider();

    if (ai && (await ai.isHealthy())) {
      try {
        const prompt = `You are a Senior Requirements Engineer (ISO/IEC/IEEE 29148).
Write ONE concise, friendly, non-repetitive follow-up question for the CURRENT interview stage only.

PROJECT: ${projectName}
CURRENT STAGE: ${sectionConfig.name}
STAGE FOCUS: ${sectionConfig.description}
USER'S LAST ANSWER: "${userAnswer}"
ALREADY COLLECTED: ${JSON.stringify(extractedEntities || {})}; ${extractedRequirements.length} requirements captured.
SPECIFIC MISSING INFORMATION TO ASK FOR: ${missingHint || '(ask for the key remaining detail for this stage)'}

RULES:
1. Do NOT repeat what the user already provided.
2. Ask ONLY for the specific missing information above.
3. Do not invent features, metrics, or assumptions.
4. Write in the user's language: ${detectedLanguage} (English, Hindi, Marathi, or Hinglish).
5. Return ONLY the question, no markdown, no quotes, no preamble.`;

        // Bounded timeout so a slow model can never hang the interview.
        const response = await ai.generateCompletion(prompt, { temperature: 0.3, maxTokens: 120, timeout: 20000, retries: 0 });
        const clean = (response || '').trim().replace(/^["'👉*\s]+|["'*\s]+$/g, '');
        // Reject trivial/echoed/empty LLM output; fall through to deterministic.
        if (clean && clean.length > 12 && clean.includes('?')) {
          return clean;
        }
      } catch (err) {
        console.warn('[InterviewAgent] Dynamic LLM follow-up failed, using deterministic fallback:', err.message);
      }
    }

    // Deterministic: prefer the specific missing-info hint; else a section-aware
    // non-repetitive prompt from the static bank. Never returns empty so the
    // interview always has a valid next question even with the LLM offline.
    if (missingHint) return missingHint;
    return this.getSectionFollowUpQuestion(sectionConfig.id, projectName, detectedLanguage);
  }

  _redirectionMessage(reasonMessage, projectContext, sectionConfig, language, currentQuestion = '') {
    const base = reasonMessage ||
      `This input appears unrelated to ${projectContext.projectName}. Please provide information relevant to the current interview question.`;

    const activeQuestion = currentQuestion || this.getSectionInitialQuestion(
      sectionConfig.id, projectContext.projectName, language
    );

    if (language === 'Hinglish') {
      return `${base}\n\nHum abhi **${sectionConfig.name}** stage par hain.\n👉 **Current Question:** ${activeQuestion}`;
    }
    return `${base}\n\nWe are currently on the **${sectionConfig.name}** stage.\n👉 **Current Question:** ${activeQuestion}`;
  }
}

// ---------------------------------------------------------------------------
// Localized question bank (English always available; Hindi/Hinglish for
// conversational UX). Requirement statements themselves are ALWAYS English.
// ---------------------------------------------------------------------------
function localize(entry, language) {
  if (language === 'Hindi' && entry.hi) return entry.hi;
  if (language === 'Hinglish' && entry.hng) return entry.hng;
  return entry.en;
}

const QUESTIONS = {
  initial: {
    PROJECT_INFORMATION: {
      en: 'What is the core problem this system solves, and what is its primary business or operational objective?',
      hi: 'यह सिस्टम मुख्य रूप से किस समस्या का समाधान करेगा और इसका मुख्य उद्देश्य क्या है?',
      hng: 'Is system ka main problem kya hai aur core objective kya hai?'
    },
    STAKEHOLDERS_AND_USERS: {
      en: 'Who will be the primary end users and key beneficiaries of the system?',
      hi: 'सिस्टम के मुख्य उपयोगकर्ता और हितधारक कौन होंगे?',
      hng: 'System ke main users aur stakeholders kaun honge?'
    },
    USER_ROLES_AND_PERMISSIONS: {
      en: 'What specific user roles will exist, and what permissions should apply to each role?',
      hi: 'सिस्टम में कौन-कौन सी भूमिकाएँ होंगी और प्रत्येक के क्या अधिकार होंगे?',
      hng: 'Kaun se user roles honge aur har role ke paas kya permissions honi chahiye?'
    },
    FUNCTIONAL_REQUIREMENTS: {
      en: 'What core features and operations must the system provide for its users? You may answer in any language.',
      hi: 'सिस्टम को उपयोगकर्ताओं के लिए कौन-सी मुख्य कार्यक्षमताएँ प्रदान करनी चाहिए?',
      hng: 'Users ke liye system ke main features kya hone chahiye? Aap kisi bhi bhasha me jawab de sakte hain.'
    },
    NON_FUNCTIONAL_REQUIREMENTS: {
      en: 'What are the performance, security, availability, and scalability requirements? Please give measurable targets where possible.',
      hi: 'प्रदर्शन, सुरक्षा, उपलब्धता और मापनीयता के क्या मानक हैं?',
      hng: 'Performance, security, availability aur scalability ke kya requirements hain? Jahan ho sake measurable targets dein.'
    },
    EXTERNAL_INTERFACES: {
      en: 'Which third-party APIs, payment gateways, databases, or notification services must the system integrate with?',
      hi: 'सिस्टम किन बाहरी API, पेमेंट गेटवे या सेवाओं से जुड़ेगा?',
      hng: 'System kaun si third-party APIs, payment gateways ya notification services ke saath integrate karega?'
    },
    CONSTRAINTS: {
      en: 'Are there specific technology, deployment, budget, timeline, or regulatory constraints?',
      hi: 'क्या कोई तकनीकी, वित्तीय या नियामक सीमाएँ हैं?',
      hng: 'Koi technology, budget, timeline ya compliance constraints hain?'
    },
    ASSUMPTIONS_AND_DEPENDENCIES: {
      en: 'What operational assumptions and third-party dependencies does the project rely upon?',
      hi: 'यह प्रोजेक्ट किन मान्यताओं और बाहरी निर्भरताओं पर आधारित है?',
      hng: 'Project ke main assumptions aur third-party dependencies kya hain?'
    },
    REVIEW_AND_CONFIRMATION: {
      en: 'Requirements have been collected across all sections. Review the summary and confirm to generate the SRS.',
      hi: 'सभी अनुभागों की आवश्यकताएँ एकत्र हो गई हैं। समीक्षा करके SRS जनरेट करने की पुष्टि करें।',
      hng: 'Sabhi sections ke requirements collect ho gaye hain. Review karke SRS generate karne ki confirmation dein.'
    }
  },
  followUp: {
    PROJECT_INFORMATION: {
      en: 'Understood. Could you also clarify the secondary goals and what is explicitly out of scope for this version?',
      hi: 'क्या आप द्वितीयक लक्ष्य और इस संस्करण से बाहर की बातें स्पष्ट कर सकते हैं?',
      hng: 'Secondary objectives aur is version me kya out of scope hai, woh bhi bata dein.'
    },
    STAKEHOLDERS_AND_USERS: {
      en: 'Are there also administrators, managers, support staff, or partner organizations who will interact with the system?',
      hi: 'क्या प्रशासक, प्रबंधक या सहायता कर्मचारी भी हितधारक होंगे?',
      hng: 'Kya admins, managers, support staff ya partner organizations bhi system use karenge?'
    },
    USER_ROLES_AND_PERMISSIONS: {
      en: 'Are there specific permission restrictions such as read-only access, edit/delete access, or approval workflows?',
      hi: 'क्या इन भूमिकाओं के लिए विशिष्ट अनुमति प्रतिबंध या approval workflows हैं?',
      hng: 'In roles ke liye read-only, edit/delete ya approval workflow jaise restrictions kya hain?'
    },
    FUNCTIONAL_REQUIREMENTS: {
      en: 'What additional workflows such as search, filtering, reporting, notifications, or data processing are required?',
      hi: 'खोज, फ़िल्टरिंग, रिपोर्टिंग या अधिसूचना जैसी और कौन-सी सुविधाएँ चाहिए?',
      hng: 'Search, filter, reporting, notifications ya data processing jaise aur kaun se workflows chahiye?'
    },
    NON_FUNCTIONAL_REQUIREMENTS: {
      en: 'What specific targets for response time, uptime, concurrent users, security, and backup frequency apply?',
      hi: 'Response time, uptime, concurrent users और backup के क्या specific targets हैं?',
      hng: 'Response time, uptime, concurrent users, security aur backup frequency ke specific targets kya hain?'
    },
    EXTERNAL_INTERFACES: {
      en: 'What authentication protocols and data exchange formats will these external interfaces use?',
      hi: 'इन बाहरी इंटरफेस के लिए कौन-से authentication protocols और data formats उपयोग होंगे?',
      hng: 'In interfaces ke liye kaun se authentication protocols aur data formats use honge?'
    },
    CONSTRAINTS: {
      en: 'Are there specific cloud platforms, deployment restrictions, budget limits, or compliance standards?',
      hi: 'क्या कोई विशिष्ट cloud hosting, deployment या compliance मानक हैं?',
      hng: 'Cloud hosting, deployment restrictions, budget ya compliance ke specific rules kya hain?'
    },
    ASSUMPTIONS_AND_DEPENDENCIES: {
      en: 'Are there assumptions about user devices, browser compatibility, internet connectivity, or third-party availability?',
      hi: 'उपकरणों, ब्राउज़र संगतता, इंटरनेट कनेक्टिविटी के बारे में कोई मान्यताएँ हैं?',
      hng: 'User devices, browser compatibility, internet connectivity ya third-party services ke baare me kya assumptions hain?'
    },
    REVIEW_AND_CONFIRMATION: {
      en: 'All sections are complete. Please confirm to finalize the requirements and generate the SRS.',
      hi: 'सभी अनुभाग पूर्ण हैं। कृपया आवश्यकताओं को अंतिम रूप देने की पुष्टि करें।',
      hng: 'Sabhi sections complete hain. Requirements finalize karne ke liye confirmation dein.'
    }
  }
};

module.exports = new InterviewAgent();
