const { getAIProvider } = require('../index');
const { getInterviewQuestionPrompt } = require('../prompts/interview.prompt');
const embeddingService = require('../EmbeddingService');

class InterviewAgent {
  /**
   * Detect input language (English, Hindi, Hinglish)
   */
  detectLanguage(text = '') {
    if (!text || typeof text !== 'string') return 'English';
    
    // Check for Devanagari Unicode range
    const devanagariRegex = /[\u0900-\u097F]/;
    if (devanagariRegex.test(text)) {
      return 'Hindi';
    }

    // Check for common Hinglish marker words
    const hinglishMarkers = [
      'mujhe', 'chahiye', 'karna', 'karega', 'hoga', 'banana', 'hona', 'kaise', 
      'jisme', 'apne', 'bhi', 'kare', 'sakta', 'sakti', 'wala', 'wali', 'karo', 
      'hota', 'rahega', 'nahi', 'kuch', 'aur', 'karna hai', 'banana hai'
    ];
    const textLower = text.toLowerCase();
    const isHinglish = hinglishMarkers.some(marker => new RegExp(`\\b${marker}\\b`, 'i').test(textLower));
    if (isHinglish) {
      return 'Hinglish';
    }

    return 'English';
  }

  /**
   * Context Guard: Detect if user query is out-of-scope trivia, casual greeting, or bot identity question
   */
  isOutOfScopeQuery(userText = '', projectContext = {}) {
    if (!userText || typeof userText !== 'string') return { isOutOfScope: true, reason: 'EMPTY' };
    const lower = userText.toLowerCase().trim();

    if (lower.length === 0) return { isOutOfScope: true, reason: 'EMPTY' };

    // 1. Casual Greetings & Non-Informative Fillers (e.g. 'hello', 'hi', 'ok', 'thanks')
    const greetingPatterns = [
      /^(hello|hi|hey|heya|namaste|hola|greetings|wassup|yo)(\s*(!|\?|\.|\,))*$/i,
      /^(good\s+(morning|afternoon|evening|night))(\s*(!|\?|\.|\,))*$/i,
      /^(kaise\s+ho|kya\s+hal\s+hai|kya\s+chal\s+raha\s+hai)(\s*(!|\?|\.|\,))*$/i,
      /^(ok|okay|k|cool|sure|thanks|thank\s+you|dhanyawad|bye|exit|test|testing)(\s*(!|\?|\.|\,))*$/i
    ];
    if (greetingPatterns.some(p => p.test(lower))) {
      return { isOutOfScope: true, reason: 'GREETING' };
    }

    // 2. Identity / Bot questions
    const identityPatterns = [
      /^(who\s+are\s+you|what\s+is\s+your\s+name|what\s+do\s+you\s+do|who\s+made\s+you|aap\s+kaun\s+ho|tum\s+kaun\s+ho|tera\s+naam\s+kya\s+hai|help)(\s*(!|\?|\.|\,))*$/i
    ];
    if (identityPatterns.some(p => p.test(lower))) {
      return { isOutOfScope: true, reason: 'IDENTITY' };
    }

    // 3. Trivia / Off-topic domain queries
    const outOfScopePatterns = [
      /\b(weather|temperature|forecast|barish|mausam|rain\s+today)\b/i,
      /\b(prime minister|president|modi|biden|trump|election|rajneeti|politics)\b/i,
      /\b(who is|who was|kon hai|koun hai)\s+(the|a)?\s*(pm|prime minister|president|actor|cricketer|ceo)/i,
      /\b(tell me a joke|chutkula|joke sunao|sing a song|recipe|khana kaise banaye|biryani|movie|film)\b/i,
      /\b(cricket score|ipl score|match score|fifa|football|world cup)\b/i,
      /\b(capital of|rajdhani|currency of)\b/i
    ];
    if (outOfScopePatterns.some(p => p.test(lower))) {
      return { isOutOfScope: true, reason: 'TRIVIA' };
    }

    return { isOutOfScope: false, reason: null };
  }

  /**
   * Get initial question for a section
   */
  getSectionInitialQuestion(sectionId, projectName, language = 'English') {
    const questions = {
      PROJECT_INFORMATION: {
        en: `What is the core problem that "${projectName}" solves, and what is its primary business or operational objective?`,
        hi: `"${projectName}" मुख्य रूप से किस समस्या का समाधान करेगा और इसका मुख्य उद्देश्य क्या है?`,
        hng: `"${projectName}" ka main problem statement aur core objective kya hai?`
      },
      STAKEHOLDERS_AND_USERS: {
        en: `Who will be the primary end users and key beneficiaries of "${projectName}" (e.g., customers, operators, managers, patients)?`,
        hi: `"${projectName}" के मुख्य उपयोगकर्ता और हितधारक (stakeholders) कौन-कौन होंगे?`,
        hng: `"${projectName}" ke main users aur stakeholders (jaise students, admins, managers) kaun honge?`
      },
      USER_ROLES_AND_PERMISSIONS: {
        en: `What specific user roles will exist in "${projectName}", and what permissions or access restrictions should apply to each role?`,
        hi: `सिस्टम में कौन-कौन सी भूमिकाएँ (Roles) होंगी और प्रत्येक भूमिका के क्या अधिकार होंगे?`,
        hng: `Kaun kaun se user roles honge aur kis role ke paas kya permissions ya restrictions honi chahiye?`
      },
      FUNCTIONAL_REQUIREMENTS: {
        en: `What core functional features and operations must "${projectName}" provide for its users?`,
        hi: `सिस्टम की मुख्य कार्यक्षमताएँ (features) क्या हैं जिन्हें उपयोगकर्ता निष्पादित कर सकते हैं?`,
        hng: `Users ke liye main features aur core functional workflows kya kya hone chahiye?`
      },
      NON_FUNCTIONAL_REQUIREMENTS: {
        en: `What are the performance (e.g. response time < 2s), security, availability, and scalability benchmarks for "${projectName}"?`,
        hi: `सिस्टम के प्रदर्शन (performance), सुरक्षा (security) और मापनीयता (scalability) के क्या मानक होंगे?`,
        hng: `Performance (response time), security aur scalability ke specific requirements kya hain?`
      },
      EXTERNAL_INTERFACES: {
        en: `Which third-party APIs, payment gateways, databases, or notification services must "${projectName}" integrate with?`,
        hi: `क्या सिस्टम किसी बाहरी API, पेमेंट गेटवे, या डेटाबेस से जुड़ेगा?`,
        hng: `Kya system kisi third-party API, payment gateway, ya email/SMS service ke saath integrate karega?`
      },
      CONSTRAINTS: {
        en: `Are there specific technology stack, deployment, budget, or regulatory compliance constraints for "${projectName}"?`,
        hi: `क्या कोई तकनीकी, वित्तीय या नियामक (compliance) सीमाएँ हैं?`,
        hng: `Koi technology stack constraints, budget limitations ya legal compliance requirements hain?`
      },
      ASSUMPTIONS_AND_DEPENDENCIES: {
        en: `What operational assumptions and third-party dependencies does "${projectName}" rely upon?`,
        hi: `यह प्रोजेक्ट किन मान्यताओं (assumptions) और बाहरी निर्भरताओं (dependencies) पर आधारित है?`,
        hng: `Is project ke main assumptions aur dependencies kya hain?`
      },
      REVIEW_AND_CONFIRMATION: {
        en: `I have compiled the comprehensive requirements across all 8 elicitation sections. Would you like to review the summary and confirm to generate the baseline SRS?`,
        hi: `मैंने सभी 8 अनुभागों की आवश्यकताएं एकत्र कर ली हैं। क्या आप सारांश की समीक्षा कर SRS जनरेट करना चाहते हैं?`,
        hng: `Maine sabhi sections ke requirements collect kar liye hain. Kya aap summary review karke final SRS generate karna chahte hain?`
      }
    };

    const sec = questions[sectionId] || questions.PROJECT_INFORMATION;
    if (language === 'Hindi') return sec.hi;
    if (language === 'Hinglish') return sec.hng;
    return sec.en;
  }

  /**
   * Get follow-up question for partial information in a section
   */
  getSectionFollowUpQuestion(sectionId, projectName, language = 'English') {
    const followUps = {
      PROJECT_INFORMATION: {
        en: `Understood. Could you also clarify the secondary goals and what is explicitly OUT of scope for this version?`,
        hi: `समझ गया। क्या आप इसके द्वितीयक लक्ष्यों और उन चीज़ों को स्पष्ट कर सकते हैं जो इस संस्करण के दायरे से बाहर हैं?`,
        hng: `Sahi hai. Is version me kya secondary objectives hain aur kya explicitly OUT of scope rahega?`
      },
      STAKEHOLDERS_AND_USERS: {
        en: `Noted. Are there also administrators, partner institutions, support operators, or regulatory auditors who will interact with the system?`,
        hi: `नोट किया। क्या सिस्टम प्रशासक, साझेदार संस्थाएँ या सहायता ऑपरेटर भी इसमें हितधारक होंगे?`,
        hng: `Samajh gaya. Kya isme administrators, partner clinics, support staff ya managers bhi stakeholders hain?`
      },
      USER_ROLES_AND_PERMISSIONS: {
        en: `Understood. Are there specific permission restrictions (e.g. read-only vs edit/delete) or approval workflows for these roles?`,
        hi: `समझा। क्या इन भूमिकाओं के लिए विशिष्ट अनुमतियाँ (जैसे केवल देखना या संपादन/हटाना) या अनुमोदन प्रक्रियाएँ हैं?`,
        hng: `Samajh gaya. In roles me permissions boundary (jaise read-only vs delete access) ya approval workflows kya hain?`
      },
      FUNCTIONAL_REQUIREMENTS: {
        en: `Noted. What additional data processing, search/filtering, reporting, or notifications workflows are required?`,
        hi: `नोट किया। और कौन से डेटा प्रोसेसिंग, खोज/फ़िल्टरिंग, रिपोर्टिंग या अधिसूचना सुविधाएँ आवश्यक हैं?`,
        hng: `Noted. Aur kaun se main data workflows, search filters, reporting ya alert features hone chahiye?`
      },
      NON_FUNCTIONAL_REQUIREMENTS: {
        en: `Acknowledged. What are the specific targets for 99.9% uptime availability, peak concurrent users, and data backup frequency?`,
        hi: `स्वीकृत। 99.9% अपटाइम उपलब्धता, समवर्ती उपयोगकर्ताओं (concurrent users) और डेटा बैकअप के क्या लक्ष्य हैं?`,
        hng: `Samajh gaya. 99.9% uptime, peak concurrent users aur data backup frequency ke kya specific targets hain?`
      },
      EXTERNAL_INTERFACES: {
        en: `Understood. What authentication protocols (e.g. OAuth 2.0, API keys) and data exchange formats (JSON REST) will these interfaces use?`,
        hi: `समझा। इन बाहरी इंटरफेस के लिए कौन से प्रमाणीकरण प्रोटोकॉल (OAuth 2.0, API Keys) आवश्यक हैं?`,
        hng: `Samajh gaya. In external APIs ke liye kya authentication (OAuth2 / API Key) aur webhook mechanisms chahiye?`
      },
      CONSTRAINTS: {
        en: `Noted. Are there specific cloud hosting platforms (e.g. AWS/Azure), containerization (Docker), or compliance standards (GDPR/HIPAA)?`,
        hi: `नोट किया। क्या कोई विशिष्ट क्लाउड होस्टिंग (AWS, Azure) या नियामक अनुपालन मानक (GDPR, HIPAA) हैं?`,
        hng: `Noted. Cloud hosting (AWS/Docker) ya regulatory compliance (GDPR/HIPAA) ke koi specific rules hain?`
      },
      ASSUMPTIONS_AND_DEPENDENCIES: {
        en: `Understood. Are there any assumptions regarding end-user mobile/desktop hardware capabilities or internet connection reliability?`,
        hi: `समझा। क्या अंतिम उपयोगकर्ता के हार्डवेयर या इंटरनेट कनेक्टिविटी के बारे में कोई विशिष्ट धारणाएँ हैं?`,
        hng: `Samajh gaya. User device hardware, browser compatibility ya network connectivity ke kya assumptions hain?`
      },
      REVIEW_AND_CONFIRMATION: {
        en: `All sections are completed. Please confirm to finalize requirements and generate your SRS baseline.`,
        hi: `सभी अनुभाग पूरे हो गए हैं। कृपया आवश्यकताओं को अंतिम रूप देने और SRS तैयार करने की पुष्टि करें।`,
        hng: `Sabhi sections complete ho gaye hain. Final SRS generate karne ke liye confirmation dein.`
      }
    };

    const sec = followUps[sectionId] || followUps.PROJECT_INFORMATION;
    if (language === 'Hindi') return sec.hi;
    if (language === 'Hinglish') return sec.hng;
    return sec.en;
  }

  /**
   * Main interview turn processor
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
    const detectedLanguage = this.detectLanguage(lastUserMessage);

    // 1. Strict Context Guard & Non-informative Check
    const guardCheck = this.isOutOfScopeQuery(lastUserMessage, projectContext);
    if (guardCheck.isOutOfScope) {
      const initialSecQ = this.getSectionInitialQuestion(currentSectionConfig.id, projectContext.projectName, detectedLanguage);
      let redirection = '';

      if (guardCheck.reason === 'GREETING') {
        if (detectedLanguage === 'Hinglish') {
          redirection = `Namaste! Mai "${projectContext.projectName}" ke requirements elicitation interview me aapki help kar raha hu. Abhi hum **${currentSectionConfig.name}** stage par hain.\n\n${initialSecQ}`;
        } else if (detectedLanguage === 'Hindi') {
          redirection = `नमस्ते! मैं "${projectContext.projectName}" की आवश्यकताओं के साक्षात्कार में आपकी सहायता कर रहा हूँ। अभी हम **${currentSectionConfig.name}** चरण पर हैं।\n\n${initialSecQ}`;
        } else {
          redirection = `Hello! I am your AI Requirements Engineer for "${projectContext.projectName}". We are currently on the **${currentSectionConfig.name}** stage.\n\n${initialSecQ}`;
        }
      } else if (guardCheck.reason === 'IDENTITY') {
        if (detectedLanguage === 'Hinglish') {
          redirection = `Mai aapka AI Requirements Assistant hu jo "${projectContext.projectName}" ka IEEE/ISO 29148 SRS document banayega. Please **${currentSectionConfig.name}** ke details share karein:\n\n${initialSecQ}`;
        } else {
          redirection = `I am your AI Requirements Assistant conducting the software requirements interview for "${projectContext.projectName}". To proceed, please provide information for **${currentSectionConfig.name}**:\n\n${initialSecQ}`;
        }
      } else {
        // TRIVIA or General Out-of-scope
        if (detectedLanguage === 'Hinglish') {
          redirection = `Mai abhi "${projectContext.projectName}" ke software requirements par focus kar raha hu. Kripya **${currentSectionConfig.name}** se judi requirements share karein:\n\n${initialSecQ}`;
        } else if (detectedLanguage === 'Hindi') {
          redirection = `मैं अभी "${projectContext.projectName}" की आवश्यकताओं के साक्षात्कार पर ध्यान केंद्रित कर रहा हूँ। कृपया **${currentSectionConfig.name}** से संबंधित जानकारी प्रदान करें:\n\n${initialSecQ}`;
        } else {
          redirection = `I am strictly focused on gathering software requirements for "${projectContext.projectName}". Please provide information related to the current section: **${currentSectionConfig.name}**.\n\n${initialSecQ}`;
        }
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
        notes: 'Out of scope or greeting intercepted by Context Guard.'
      };
    }

    // 2. Call AI with Master Prompt for valid in-scope input
    const prompt = getInterviewQuestionPrompt(
      projectContext,
      conversationHistory,
      currentSectionConfig,
      existingRequirements,
      currentStats
    );

    let result;
    try {
      result = await ai.generateStructuredJSON(prompt);
    } catch (err) {
      console.warn('[InterviewAgent] LLM parsing fallback:', err.message);
      result = null;
    }

    // 3. Fallback requirement synthesis if LLM returned null or empty requirements
    const validExtracted = [];
    if (result?.extractedRequirements && Array.isArray(result.extractedRequirements) && result.extractedRequirements.length > 0) {
      for (const req of result.extractedRequirements) {
        if (!req.title || !req.description) continue;
        const isDuplicate = await this._isDuplicateRequirement(req, existingRequirements);
        if (!isDuplicate) {
          const formatted = this._enforceRequirementQuality(req, currentSectionConfig);
          validExtracted.push(formatted);
        }
      }
    } else if (lastUserMessage && lastUserMessage.trim().length >= 8) {
      // Heuristic extraction for domain-rich answer
      const autoReq = this._heuristicExtractRequirement(lastUserMessage, currentSectionConfig, projectContext);
      if (autoReq) {
        const isDup = await this._isDuplicateRequirement(autoReq, existingRequirements);
        if (!isDup) {
          validExtracted.push(autoReq);
        }
      }
    }

    // 4. Section Completion Gate:
    // Determine whether enough information was collected for this section
    const totalSectionReqs = sectionRequirementsCount + validExtracted.length;
    const isDetailedAnswer = lastUserMessage.length >= 60 || validExtracted.length >= 2;
    const sectionCompleted = Boolean(result?.sectionCompleted) || (totalSectionReqs >= 1 && isDetailedAnswer) || (totalSectionReqs >= 2);

    // 5. Next Question Selection:
    // If section is NOT completed, ask a section-specific follow-up question.
    // If section IS completed, the controller will advance stage and fetch the next section's question.
    let nextQuestion = result?.question;
    if (!sectionCompleted) {
      if (!nextQuestion || nextQuestion.toLowerCase().includes('who will be the primary') && currentSectionConfig.id !== 'STAKEHOLDERS_AND_USERS') {
        nextQuestion = this.getSectionFollowUpQuestion(currentSectionConfig.id, projectContext.projectName, detectedLanguage);
      }
    }

    return {
      question: nextQuestion || this.getSectionFollowUpQuestion(currentSectionConfig.id, projectContext.projectName, detectedLanguage),
      section: currentSectionConfig.name,
      step: currentSectionConfig.stepIndex,
      language: detectedLanguage,
      progress: result?.progress || currentStats.coverage || 15,
      isOutOfScope: false,
      isRelevant: true,
      sectionCompleted,
      interviewCompleted: Boolean(result?.interviewCompleted),
      extractedRequirements: validExtracted,
      missingInformation: result?.missingInformation || [],
      notes: result?.notes || ''
    };
  }

  /**
   * Fallback rule-based extractor when LLM times out on domain-rich text
   */
  _heuristicExtractRequirement(userText, sectionConfig, projectContext) {
    const text = userText.trim();
    if (text.length < 8) return null;

    let reqType = 'FUNCTIONAL';
    let subcat = 'N/A';
    let title = `${sectionConfig.name} Specification`;
    let desc = text;

    if (sectionConfig.id === 'STAKEHOLDERS_AND_USERS') {
      reqType = 'STAKEHOLDER';
      title = 'User & Stakeholder Roles';
      desc = `The system shall support interactions for: ${text}`;
    } else if (sectionConfig.id === 'USER_ROLES_AND_PERMISSIONS') {
      reqType = 'STAKEHOLDER';
      title = 'Role-Based Access Control';
      desc = `The system shall enforce role permissions: ${text}`;
    } else if (sectionConfig.id === 'NON_FUNCTIONAL_REQUIREMENTS') {
      reqType = 'NON_FUNCTIONAL';
      subcat = 'PERFORMANCE';
      title = 'Performance and Reliability Benchmark';
      desc = `The system shall satisfy quality criteria: ${text}`;
    } else if (sectionConfig.id === 'EXTERNAL_INTERFACES') {
      reqType = 'INTERFACE';
      title = 'External Interface Integration';
      desc = `The system shall integrate with external services: ${text}`;
    } else if (sectionConfig.id === 'CONSTRAINTS') {
      reqType = 'CONSTRAINT';
      title = 'System Constraints';
      desc = `The system implementation shall conform to: ${text}`;
    } else if (sectionConfig.id === 'ASSUMPTIONS_AND_DEPENDENCIES') {
      reqType = 'ASSUMPTION';
      title = 'Operating Assumption';
      desc = `The system assumes the following conditions: ${text}`;
    } else {
      reqType = 'FUNCTIONAL';
      title = 'Core Functional Operation';
      desc = `The system shall execute: ${text}`;
    }

    return this._enforceRequirementQuality({
      title,
      description: desc,
      type: reqType,
      nfrSubcategory: subcat,
      category: sectionConfig.name,
      priority: 'MEDIUM',
      completenessScore: 85,
      isAtomic: true
    }, sectionConfig);
  }

  /**
   * Two-level duplicate detection: Exact text match & Cosine similarity
   */
  async _isDuplicateRequirement(candidate, existingList = []) {
    if (!existingList || existingList.length === 0) return false;

    const candText = `${candidate.title} ${candidate.description}`.toLowerCase().trim();

    // 1. Exact string match / sub-string overlap
    for (const ex of existingList) {
      const exText = `${ex.title} ${ex.description}`.toLowerCase().trim();
      if (candText === exText) return true;

      // Jaccard word token overlap
      const candTokens = new Set(candText.split(/\s+/));
      const exTokens = new Set(exText.split(/\s+/));
      let intersection = 0;
      for (const t of candTokens) {
        if (exTokens.has(t)) intersection++;
      }
      const union = new Set([...candTokens, ...exTokens]).size;
      const jaccard = intersection / union;
      if (jaccard >= 0.85) return true;
    }

    // 2. Semantic Cosine Similarity
    try {
      const candEmb = await embeddingService.generateEmbedding(candText);
      for (const ex of existingList) {
        const exEmb = ex.embedding?.length === 384
          ? ex.embedding
          : await embeddingService.generateEmbedding(`${ex.title}: ${ex.description}`);

        const sim = embeddingService.cosineSimilarity(candEmb, exEmb);
        if (sim >= 0.88) {
          return true;
        }
      }
    } catch (e) {
      // Ignore embedding errors in duplicate check
    }

    return false;
  }

  /**
   * Requirement Quality Engine: Enforce ISO/IEC/IEEE phrasing and atomic structure
   */
  _enforceRequirementQuality(rawReq, sectionConfig) {
    let desc = (rawReq.description || '').trim();
    if (!desc.toLowerCase().startsWith('the system shall') && !desc.toLowerCase().startsWith('users shall') && !desc.toLowerCase().startsWith('administrators shall')) {
      desc = `The system shall ${desc.charAt(0).toLowerCase() + desc.slice(1)}`;
    }
    if (!desc.endsWith('.')) {
      desc += '.';
    }

    let type = rawReq.type || 'FUNCTIONAL';
    if (sectionConfig.id === 'NON_FUNCTIONAL_REQUIREMENTS' || rawReq.nfrSubcategory) {
      type = 'NON_FUNCTIONAL';
    } else if (sectionConfig.id === 'CONSTRAINTS') {
      type = 'CONSTRAINT';
    } else if (sectionConfig.id === 'ASSUMPTIONS_AND_DEPENDENCIES') {
      type = 'ASSUMPTION';
    } else if (sectionConfig.id === 'EXTERNAL_INTERFACES') {
      type = 'INTERFACE';
    } else if (sectionConfig.id === 'STAKEHOLDERS_AND_USERS' || sectionConfig.id === 'USER_ROLES_AND_PERMISSIONS') {
      type = 'STAKEHOLDER';
    }

    return {
      title: rawReq.title.trim(),
      description: desc,
      type,
      nfrSubcategory: rawReq.nfrSubcategory || (type === 'NON_FUNCTIONAL' ? 'PERFORMANCE' : 'N/A'),
      category: rawReq.category || sectionConfig.name,
      priority: ['HIGH', 'MEDIUM', 'LOW'].includes(rawReq.priority) ? rawReq.priority : 'MEDIUM',
      completenessScore: rawReq.completenessScore || 85,
      isAtomic: true
    };
  }

}

module.exports = new InterviewAgent();

