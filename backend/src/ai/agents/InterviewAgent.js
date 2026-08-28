const { getAIProvider } = require('../index');
const { getInterviewQuestionPrompt } = require('../prompts/interview.prompt');
const embeddingService = require('../EmbeddingService');

class InterviewAgent {
  /**
   * Detect input language (English, Hindi, Hinglish)
   */
  detectLanguage(text = '') {
    if (!text || typeof text !== 'string') {
      return 'English';
    }

    // Hindi / Devanagari
    const devanagariRegex = /[\u0900-\u097F]/;

    if (devanagariRegex.test(text)) {
      return 'Hindi';
    }

    // Hinglish marker words
    const hinglishMarkers = [
      'mujhe',
      'chahiye',
      'karna',
      'karega',
      'hoga',
      'banana',
      'hona',
      'kaise',
      'jisme',
      'apne',
      'bhi',
      'kare',
      'sakta',
      'sakti',
      'wala',
      'wali',
      'karo',
      'hota',
      'rahega',
      'nahi',
      'kuch',
      'aur'
    ];

    const textLower = text.toLowerCase();

    const isHinglish = hinglishMarkers.some((marker) =>
      new RegExp(`\\b${marker}\\b`, 'i').test(textLower)
    );

    if (isHinglish) {
      return 'Hinglish';
    }

    return 'English';
  }

  /**
   * Detect greetings, identity questions and irrelevant queries
   */
  isOutOfScopeQuery(userText = '') {
    if (!userText || typeof userText !== 'string') {
      return {
        isOutOfScope: true,
        reason: 'EMPTY'
      };
    }

    const lower = userText.toLowerCase().trim();

    if (lower.length === 0) {
      return {
        isOutOfScope: true,
        reason: 'EMPTY'
      };
    }

    // Greetings
    const greetingPatterns = [
      /^(hello|hi|hey|heya|namaste|hola|greetings|wassup|yo)[!?. ,]*$/i,
      /^good\s+(morning|afternoon|evening|night)[!?. ,]*$/i,
      /^(kaise\s+ho|kya\s+hal\s+hai|kya\s+chal\s+raha\s+hai)[!?. ,]*$/i,
      /^(ok|okay|k|cool|sure|thanks|thank\s+you|dhanyawad|bye|exit|test|testing)[!?. ,]*$/i
    ];

    if (greetingPatterns.some((pattern) => pattern.test(lower))) {
      return {
        isOutOfScope: true,
        reason: 'GREETING'
      };
    }

    // Identity questions
    const identityPatterns = [
      /^(who\s+are\s+you|what\s+is\s+your\s+name|what\s+do\s+you\s+do|who\s+made\s+you|aap\s+kaun\s+ho|tum\s+kaun\s+ho|tera\s+naam\s+kya\s+hai|help)[!?. ,]*$/i
    ];

    if (identityPatterns.some((pattern) => pattern.test(lower))) {
      return {
        isOutOfScope: true,
        reason: 'IDENTITY'
      };
    }

    // Off-topic trivia
    const outOfScopePatterns = [
      /\b(weather|temperature|forecast|barish|mausam|rain today)\b/i,
      /\b(prime minister|president|modi|biden|trump|election|rajneeti|politics)\b/i,
      /\b(tell me a joke|chutkula|joke sunao|sing a song|recipe|khana kaise banaye|biryani|movie|film)\b/i,
      /\b(cricket score|ipl score|match score|fifa|football|world cup)\b/i,
      /\b(capital of|rajdhani|currency of)\b/i
    ];

    if (outOfScopePatterns.some((pattern) => pattern.test(lower))) {
      return {
        isOutOfScope: true,
        reason: 'TRIVIA'
      };
    }

    return {
      isOutOfScope: false,
      reason: null
    };
  }

  /**
   * Initial question for each section
   */
  getSectionInitialQuestion(
    sectionId,
    projectName,
    language = 'English'
  ) {
    const questions = {
      PROJECT_INFORMATION: {
        en: `What is the core problem that "${projectName}" solves, and what is its primary business or operational objective?`,
        hi: `"${projectName}" मुख्य रूप से किस समस्या का समाधान करेगा और इसका मुख्य उद्देश्य क्या है?`,
        hng: `"${projectName}" ka main problem statement aur core objective kya hai?`
      },

      STAKEHOLDERS_AND_USERS: {
        en: `Who will be the primary end users and key beneficiaries of "${projectName}"?`,
        hi: `"${projectName}" के मुख्य उपयोगकर्ता और हितधारक कौन-कौन होंगे?`,
        hng: `"${projectName}" ke main users aur stakeholders kaun honge?`
      },

      USER_ROLES_AND_PERMISSIONS: {
        en: `What specific user roles will exist in "${projectName}", and what permissions should apply to each role?`,
        hi: `सिस्टम में कौन-कौन सी भूमिकाएँ होंगी और प्रत्येक भूमिका के क्या अधिकार होंगे?`,
        hng: `Kaun kaun se user roles honge aur kis role ke paas kya permissions honi chahiye?`
      },

      FUNCTIONAL_REQUIREMENTS: {
        en: `What core functional features and operations must "${projectName}" provide for its users?`,
        hi: `सिस्टम की मुख्य कार्यक्षमताएँ क्या हैं जिन्हें उपयोगकर्ता निष्पादित कर सकते हैं?`,
        hng: `Users ke liye main features aur core functional workflows kya kya hone chahiye?`
      },

      NON_FUNCTIONAL_REQUIREMENTS: {
        en: `What are the performance, security, availability, and scalability requirements for "${projectName}"?`,
        hi: `सिस्टम के प्रदर्शन, सुरक्षा और मापनीयता के क्या मानक होंगे?`,
        hng: `Performance, security aur scalability ke specific requirements kya hain?`
      },

      EXTERNAL_INTERFACES: {
        en: `Which third-party APIs, payment gateways, databases, or notification services must "${projectName}" integrate with?`,
        hi: `क्या सिस्टम किसी बाहरी API, पेमेंट गेटवे, या डेटाबेस से जुड़ेगा?`,
        hng: `Kya system kisi third-party API, payment gateway, database ya email/SMS service ke saath integrate karega?`
      },

      CONSTRAINTS: {
        en: `Are there specific technology stack, deployment, budget, timeline, or regulatory constraints for "${projectName}"?`,
        hi: `क्या कोई तकनीकी, वित्तीय या नियामक सीमाएँ हैं?`,
        hng: `Koi technology stack constraints, budget limitations, timeline ya legal compliance requirements hain?`
      },

      ASSUMPTIONS_AND_DEPENDENCIES: {
        en: `What operational assumptions and third-party dependencies does "${projectName}" rely upon?`,
        hi: `यह प्रोजेक्ट किन मान्यताओं और बाहरी निर्भरताओं पर आधारित है?`,
        hng: `Is project ke main assumptions aur dependencies kya hain?`
      },

      REVIEW_AND_CONFIRMATION: {
        en: `I have compiled the requirements across all sections. Would you like to review the summary and confirm before generating the SRS?`,
        hi: `मैंने सभी अनुभागों की आवश्यकताएं एकत्र कर ली हैं। क्या आप सारांश की समीक्षा कर SRS जनरेट करना चाहते हैं?`,
        hng: `Maine sabhi sections ke requirements collect kar liye hain. Kya aap summary review karke final SRS generate karna chahte hain?`
      }
    };

    const section =
      questions[sectionId] ||
      questions.PROJECT_INFORMATION;

    if (language === 'Hindi') {
      return section.hi;
    }

    if (language === 'Hinglish') {
      return section.hng;
    }

    return section.en;
  }

  /**
   * Follow-up questions
   */
  getSectionFollowUpQuestion(
    sectionId,
    projectName,
    language = 'English'
  ) {
    const followUps = {
      PROJECT_INFORMATION: {
        en: `Understood. Could you also clarify the secondary goals and what is explicitly out of scope for this version?`,
        hi: `समझ गया। क्या आप इसके द्वितीयक लक्ष्यों और उन चीज़ों को स्पष्ट कर सकते हैं जो इस संस्करण के दायरे से बाहर हैं?`,
        hng: `Sahi hai. Is version me kya secondary objectives hain aur kya explicitly out of scope rahega?`
      },

      STAKEHOLDERS_AND_USERS: {
        en: `Are there also administrators, managers, partner organizations, support staff, or other stakeholders who will interact with the system?`,
        hi: `क्या सिस्टम प्रशासक, प्रबंधक, साझेदार संस्थाएँ या सहायता कर्मचारी भी इसमें हितधारक होंगे?`,
        hng: `Kya isme administrators, managers, partner organizations ya support staff bhi stakeholders hain?`
      },

      USER_ROLES_AND_PERMISSIONS: {
        en: `Are there specific permission restrictions such as read-only access, edit/delete access, or approval workflows for these roles?`,
        hi: `क्या इन भूमिकाओं के लिए विशिष्ट अनुमतियाँ या approval workflows हैं?`,
        hng: `In roles me permissions boundary jaise read-only, edit/delete access ya approval workflow kya hain?`
      },

      FUNCTIONAL_REQUIREMENTS: {
        en: `What additional workflows such as search, filtering, reporting, notifications, or data processing are required?`,
        hi: `और कौन से डेटा प्रोसेसिंग, खोज, फ़िल्टरिंग, रिपोर्टिंग या अधिसूचना सुविधाएँ आवश्यक हैं?`,
        hng: `Aur kaun se main workflows, search filters, reporting ya notification features hone chahiye?`
      },

      NON_FUNCTIONAL_REQUIREMENTS: {
        en: `What are the specific targets for response time, uptime, concurrent users, security, and data backup frequency?`,
        hi: `Response time, uptime, concurrent users और data backup के क्या specific targets हैं?`,
        hng: `Response time, uptime, concurrent users aur data backup frequency ke kya specific targets hain?`
      },

      EXTERNAL_INTERFACES: {
        en: `What authentication protocols and data exchange formats will these external interfaces use?`,
        hi: `इन बाहरी इंटरफेस के लिए कौन से authentication protocols और data formats उपयोग होंगे?`,
        hng: `In external APIs ke liye kya authentication aur data exchange format use hoga?`
      },

      CONSTRAINTS: {
        en: `Are there specific cloud hosting platforms, deployment restrictions, budget limitations, or compliance standards?`,
        hi: `क्या कोई विशिष्ट cloud hosting, deployment restrictions या compliance standards हैं?`,
        hng: `Cloud hosting, deployment, budget ya compliance ke koi specific rules hain?`
      },

      ASSUMPTIONS_AND_DEPENDENCIES: {
        en: `Are there any assumptions regarding user devices, browser compatibility, internet connectivity, or third-party service availability?`,
        hi: `क्या user devices, browser compatibility, internet connectivity या third-party services के बारे में कोई assumptions हैं?`,
        hng: `User device, browser compatibility, internet connectivity ya third-party services ke kya assumptions hain?`
      },

      REVIEW_AND_CONFIRMATION: {
        en: `All sections are completed. Please confirm to finalize the requirements and generate the SRS.`,
        hi: `सभी अनुभाग पूरे हो गए हैं। कृपया आवश्यकताओं को अंतिम रूप देने और SRS तैयार करने की पुष्टि करें।`,
        hng: `Sabhi sections complete ho gaye hain. Final SRS generate karne ke liye confirmation dein.`
      }
    };

    const section =
      followUps[sectionId] ||
      followUps.PROJECT_INFORMATION;

    if (language === 'Hindi') {
      return section.hi;
    }

    if (language === 'Hinglish') {
      return section.hng;
    }

    return section.en;
  }

  /**
   * Main interview processor
   */
  async processInterviewTurn({
    projectContext,
    conversationHistory,
    currentSectionConfig,
    existingRequirements = [],
    currentStats = {},
    lastUserMessage = '',
    sectionRequirementsCount = 0
  }) {
    const ai = getAIProvider();

    const detectedLanguage =
      this.detectLanguage(lastUserMessage);

    // Context guard
    const guardCheck =
      this.isOutOfScopeQuery(lastUserMessage);

    if (guardCheck.isOutOfScope) {
      const initialQuestion =
        this.getSectionInitialQuestion(
          currentSectionConfig.id,
          projectContext.projectName,
          detectedLanguage
        );

      let redirection = '';

      if (detectedLanguage === 'Hinglish') {
        redirection =
          `Mai "${projectContext.projectName}" ke software requirements collect kar raha hu. ` +
          `Abhi hum **${currentSectionConfig.name}** section par hain.\n\n` +
          initialQuestion;
      } else if (detectedLanguage === 'Hindi') {
        redirection =
          `मैं "${projectContext.projectName}" की requirements collect कर रहा हूँ। ` +
          `अभी हम **${currentSectionConfig.name}** section पर हैं।\n\n` +
          initialQuestion;
      } else {
        redirection =
          `I am collecting requirements for "${projectContext.projectName}". ` +
          `We are currently on the **${currentSectionConfig.name}** section.\n\n` +
          initialQuestion;
      }

      return {
        question: redirection,
        section: currentSectionConfig.name,
        step: currentSectionConfig.stepIndex,
        language: detectedLanguage,
        progress: currentStats.coverage || 15,
        isOutOfScope: true,
        isRelevant: false,
        sectionCompleted: false,
        interviewCompleted: false,
        extractedRequirements: [],
        missingInformation: [],
        notes: 'Out of scope input intercepted.'
      };
    }

    const prompt = getInterviewQuestionPrompt(
      projectContext,
      conversationHistory,
      currentSectionConfig,
      existingRequirements,
      currentStats
    );

    let result = null;

    try {
      result =
        await ai.generateStructuredJSON(prompt);
    } catch (error) {
      console.warn(
        '[InterviewAgent] AI generation failed:',
        error.message
      );
    }

    const validExtracted = [];

    if (
      result?.extractedRequirements &&
      Array.isArray(result.extractedRequirements)
    ) {
      for (const requirement of result.extractedRequirements) {
        if (
          !requirement ||
          !requirement.title ||
          !requirement.description
        ) {
          continue;
        }

        const isDuplicate =
          await this._isDuplicateRequirement(
            requirement,
            existingRequirements
          );

        if (!isDuplicate) {
          validExtracted.push(
            this._enforceRequirementQuality(
              requirement,
              currentSectionConfig
            )
          );
        }
      }
    }

    // Heuristic fallback
    if (
      validExtracted.length === 0 &&
      lastUserMessage &&
      lastUserMessage.trim().length >= 8
    ) {
      const autoRequirement =
        this._heuristicExtractRequirement(
          lastUserMessage,
          currentSectionConfig,
          projectContext
        );

      if (autoRequirement) {
        const duplicate =
          await this._isDuplicateRequirement(
            autoRequirement,
            existingRequirements
          );

        if (!duplicate) {
          validExtracted.push(autoRequirement);
        }
      }
    }

    const totalSectionRequirements =
      sectionRequirementsCount +
      validExtracted.length;

    const isDetailedAnswer =
      lastUserMessage.length >= 60 ||
      validExtracted.length >= 2;

    const sectionCompleted =
      Boolean(result?.sectionCompleted) ||
      (totalSectionRequirements >= 1 &&
        isDetailedAnswer) ||
      totalSectionRequirements >= 2;

    let nextQuestion = result?.question;

    if (!sectionCompleted && !nextQuestion) {
      nextQuestion =
        this.getSectionFollowUpQuestion(
          currentSectionConfig.id,
          projectContext.projectName,
          detectedLanguage
        );
    }

    return {
      question:
        nextQuestion ||
        this.getSectionFollowUpQuestion(
          currentSectionConfig.id,
          projectContext.projectName,
          detectedLanguage
        ),

      section: currentSectionConfig.name,
      step: currentSectionConfig.stepIndex,
      language: detectedLanguage,

      progress:
        result?.progress ||
        currentStats.coverage ||
        15,

      isOutOfScope: false,
      isRelevant: true,

      sectionCompleted,

      interviewCompleted:
        Boolean(result?.interviewCompleted),

      extractedRequirements: validExtracted,

      missingInformation:
        result?.missingInformation || [],

      notes:
        result?.notes || ''
    };
  }

  /**
   * Heuristic fallback extractor
   */
  _heuristicExtractRequirement(
    userText,
    sectionConfig
  ) {
    const text = userText.trim();

    if (text.length < 8) {
      return null;
    }

    let requirementType = 'FUNCTIONAL';
    let subcategory = 'N/A';

    let title =
      `${sectionConfig.name} Specification`;

    let description = text;

    switch (sectionConfig.id) {
      case 'STAKEHOLDERS_AND_USERS':
        requirementType = 'STAKEHOLDER';
        title = 'User and Stakeholder Identification';
        description =
          `The system shall support interactions for the following stakeholders and users: ${text}`;
        break;

      case 'USER_ROLES_AND_PERMISSIONS':
        requirementType = 'STAKEHOLDER';
        title = 'Role-Based Access Control';
        description =
          `The system shall enforce role permissions and access restrictions as follows: ${text}`;
        break;

      case 'NON_FUNCTIONAL_REQUIREMENTS':
        requirementType = 'NON_FUNCTIONAL';
        subcategory = 'PERFORMANCE';
        title = 'Performance and Quality Requirements';
        description =
          `The system shall satisfy the following quality criteria: ${text}`;
        break;

      case 'EXTERNAL_INTERFACES':
        requirementType = 'INTERFACE';
        title = 'External Interface Integration';
        description =
          `The system shall integrate with external services as follows: ${text}`;
        break;

      case 'CONSTRAINTS':
        requirementType = 'CONSTRAINT';
        title = 'System Constraints';
        description =
          `The system shall conform to the following constraints: ${text}`;
        break;

      case 'ASSUMPTIONS_AND_DEPENDENCIES':
        requirementType = 'ASSUMPTION';
        title = 'Operating Assumptions and Dependencies';
        description =
          `The system shall operate under the following assumptions and dependencies: ${text}`;
        break;

      default:
        requirementType = 'FUNCTIONAL';
        title = 'Core Functional Requirement';
        description =
          `The system shall support the following operation: ${text}`;
    }

    return this._enforceRequirementQuality(
      {
        title,
        description,
        type: requirementType,
        nfrSubcategory: subcategory,
        category: sectionConfig.name,
        priority: 'MEDIUM',
        completenessScore: 85,
        isAtomic: true
      },
      sectionConfig
    );
  }

  /**
   * Duplicate detection
   */
  async _isDuplicateRequirement(
    candidate,
    existingList = []
  ) {
    if (!existingList || existingList.length === 0) {
      return false;
    }

    const candidateText =
      `${candidate.title} ${candidate.description}`
        .toLowerCase()
        .trim();

    // Text similarity
    for (const existing of existingList) {
      const existingText =
        `${existing.title} ${existing.description}`
          .toLowerCase()
          .trim();

      if (candidateText === existingText) {
        return true;
      }

      const candidateTokens =
        new Set(candidateText.split(/\s+/));

      const existingTokens =
        new Set(existingText.split(/\s+/));

      let intersection = 0;

      for (const token of candidateTokens) {
        if (existingTokens.has(token)) {
          intersection++;
        }
      }

      const union =
        new Set([
          ...candidateTokens,
          ...existingTokens
        ]).size;

      const similarity =
        union > 0
          ? intersection / union
          : 0;

      if (similarity >= 0.85) {
        return true;
      }
    }

    // Embedding similarity
    try {
      const candidateEmbedding =
        await embeddingService.generateEmbedding(
          candidateText
        );

      for (const existing of existingList) {
        const existingEmbedding =
          existing.embedding &&
          existing.embedding.length > 0
            ? existing.embedding
            : await embeddingService.generateEmbedding(
                `${existing.title}: ${existing.description}`
              );

        const similarity =
          embeddingService.cosineSimilarity(
            candidateEmbedding,
            existingEmbedding
          );

        if (similarity >= 0.88) {
          return true;
        }
      }
    } catch (error) {
      console.warn(
        '[InterviewAgent] Duplicate embedding check failed:',
        error.message
      );
    }

    return false;
  }

  /**
   * Enforce requirement quality
   */
  _enforceRequirementQuality(
    rawRequirement,
    sectionConfig
  ) {
    let description =
      (rawRequirement.description || '').trim();

    if (!description) {
      description =
        'The system shall support the specified requirement.';
    }

    const validPrefixes = [
      'the system shall',
      'users shall',
      'administrators shall'
    ];

    const hasValidPrefix =
      validPrefixes.some((prefix) =>
        description
          .toLowerCase()
          .startsWith(prefix)
      );

    if (!hasValidPrefix) {
      description =
        `The system shall ${
          description.charAt(0).toLowerCase() +
          description.slice(1)
        }`;
    }

    if (!description.endsWith('.')) {
      description += '.';
    }

    let type =
      rawRequirement.type ||
      'FUNCTIONAL';

    if (
      sectionConfig.id ===
      'NON_FUNCTIONAL_REQUIREMENTS'
    ) {
      type = 'NON_FUNCTIONAL';
    } else if (
      sectionConfig.id === 'CONSTRAINTS'
    ) {
      type = 'CONSTRAINT';
    } else if (
      sectionConfig.id ===
      'ASSUMPTIONS_AND_DEPENDENCIES'
    ) {
      type = 'ASSUMPTION';
    } else if (
      sectionConfig.id ===
      'EXTERNAL_INTERFACES'
    ) {
      type = 'INTERFACE';
    } else if (
      sectionConfig.id ===
        'STAKEHOLDERS_AND_USERS' ||
      sectionConfig.id ===
        'USER_ROLES_AND_PERMISSIONS'
    ) {
      type = 'STAKEHOLDER';
    }

    return {
      title:
        rawRequirement.title?.trim() ||
        `${sectionConfig.name} Requirement`,

      description,

      type,

      nfrSubcategory:
        rawRequirement.nfrSubcategory ||
        (
          type === 'NON_FUNCTIONAL'
            ? 'PERFORMANCE'
            : 'N/A'
        ),

      category:
        rawRequirement.category ||
        sectionConfig.name,

      priority:
        ['HIGH', 'MEDIUM', 'LOW'].includes(
          rawRequirement.priority
        )
          ? rawRequirement.priority
          : 'MEDIUM',

      completenessScore:
        rawRequirement.completenessScore ||
        85,

      isAtomic: true
    };
  }
}

module.exports = new InterviewAgent();
