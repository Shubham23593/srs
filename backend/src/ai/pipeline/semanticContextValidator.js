/**
 * Semantic Context Relevance Validator for AI Requirements Interview.
 *
 * Uses AI/LLM-based semantic reasoning (with neural embedding similarity as a
 * secondary signal) to dynamically validate user answers against:
 *   1. Complete Project Context (Name, Description, Domain, Scope, Objectives, Target Users)
 *   2. Current Interview Stage & Description
 *   3. Current Question being asked
 *
 * Distinguishes between:
 *   - RELEVANT (Directly addresses project and question with valid software details)
 *   - PARTIALLY_RELEVANT (On-topic but underspecified, vague, or missing required details)
 *   - UNRELATED / CONTEXT_MISMATCH (Off-topic, unrelated projects, chit-chat, hobbies, sports)
 *   - INVALID (Gibberish, empty, random keystrokes)
 *
 * Works dynamically across ANY domain, project, or language (EN, HI, MR, Hinglish, Mixed)
 * without hardcoding.
 */

const { getAIProvider } = require('../index');
const embeddingService = require('../EmbeddingService');

class SemanticContextValidator {
  /**
   * Validate user answer against current project and interview question.
   *
   * @param {Object} params
   * @param {string} params.rawText - User's raw answer
   * @param {Object} params.project - Current project document
   * @param {Object} params.sectionConfig - Current interview section config
   * @param {string} params.currentQuestion - The specific question asked to the user
   * @param {Array} params.conversationHistory - Recent messages
   * @returns {Promise<Object>} { classification, isRelevant, isOutOfScope, status, explanation, feedbackMessage, clarificationNeeds, confidence }
   */
  async validateInterviewAnswer({
    rawText = '',
    project = {},
    sectionConfig = {},
    currentQuestion = '',
    conversationHistory = []
  }) {
    const text = String(rawText || '').trim();

    // 1. Basic sanity / empty check
    if (!text) {
      return {
        classification: 'INVALID',
        isRelevant: false,
        isOutOfScope: true,
        status: 'INVALID',
        confidence: 1.0,
        explanation: 'The response is empty.',
        feedbackMessage: 'Please provide an answer to the question so we can capture your project requirements.',
        clarificationNeeds: ['Please provide a response.']
      };
    }

    if (text.length < 2 || /^[^a-zA-Z0-9\u0900-\u097F]+$/.test(text)) {
      return {
        classification: 'INVALID',
        isRelevant: false,
        isOutOfScope: true,
        status: 'INVALID',
        confidence: 0.95,
        explanation: 'Input contains only symbols or is too short to convey meaning.',
        feedbackMessage: 'Please provide a clear and meaningful response related to the project.',
        clarificationNeeds: ['Meaningful explanation']
      };
    }

    const projName = project.projectName || 'the system';
    const projDesc = project.description || '';
    const projDomain = project.domain || 'General Software';
    const projScope = project.scope || '';
    const projObjectives = Array.isArray(project.objectives)
      ? project.objectives.join(', ')
      : project.objectives || '';
    const projUsers = Array.isArray(project.targetUsers)
      ? project.targetUsers.join(', ')
      : project.targetUsers || '';
    const stageName = sectionConfig.name || 'Requirements Elicitation';
    const stageDesc = sectionConfig.description || '';
    const questionText = currentQuestion || 'What are the requirements for this stage?';

    // 2. Compute neural embedding similarity signal
    let embeddingScore = 0.5;
    try {
      const projectProfile = [projName, projDesc, projDomain, projScope, stageName, questionText]
        .filter(Boolean)
        .join(' ');
      const [userVec, projVec] = await embeddingService.generateEmbeddings([text, projectProfile]);
      embeddingScore = embeddingService.cosineSimilarity(userVec, projVec);
    } catch (e) {
      embeddingScore = 0.5;
    }

    // 3. Primary: AI / LLM Semantic Evaluation
    const ai = getAIProvider();
    if (ai && (await ai.isHealthy())) {
      try {
        const prompt = `You are a Senior Requirements Engineer (ISO/IEC/IEEE 29148).
Analyze the user's interview answer semantically and evaluate its relevance.

PROJECT CONTEXT:
- Project Name: ${projName}
- Description: ${projDesc || 'Not specified'}
- Domain / Industry: ${projDomain}
- Objectives: ${projObjectives || 'Not specified'}
- Scope: ${projScope || 'Not specified'}
- Target Users: ${projUsers || 'Not specified'}

INTERVIEW CONTEXT:
- Current Stage: ${stageName} (${stageDesc})
- Current Question Asked: "${questionText}"

USER ANSWER (Language may be English, Hindi, Marathi, Hinglish, or mixed):
"${text}"

CRITICAL MULTILINGUAL & RELEVANCE RULES:
1. The user may answer in English, Hindi (हिंदी), Marathi (मराठी), Hinglish, or mixed.
2. Translate and understand the semantic meaning: e.g., "ऋण/कर्ज" = loan/credit, "आवेदक" = applicant, "मंजूरी/स्वीकृति" = approval/authorization, "शेतकरी/किसान" = farmer, "रुग्ण/मरीज" = patient, "डॉक्टर" = physician.
3. If the meaning discusses capabilities, roles, workflows, or rules relevant to "${projName}" (${projDomain}), you MUST classify it as "RELEVANT" or "PARTIALLY_RELEVANT".
4. NEVER classify meaningful Hindi/Marathi/Hinglish text as "INVALID" or "UNRELATED". "INVALID" is strictly reserved for keyboard mash/gibberish (e.g. "asdfgh", "123456").

Classify into EXACTLY one category:
- "RELEVANT": The answer meaningfully specifies software capabilities, workflows, personas, or requirements for ${projName} in any language.
- "PARTIALLY_RELEVANT": The answer is on-topic but excessively vague (e.g. "make it fast", "good quality") or missing necessary specifics.
- "UNRELATED": The answer discusses an entirely different subject or domain (e.g. sports, weather, cooking, personal budgeting in a hospital app, random chit-chat).
- "INVALID": Gibberish, random keystrokes ("asdfgh", "12345"), or nonsensical tokens.

Respond ONLY with a JSON object:
{
  "classification": "RELEVANT" | "PARTIALLY_RELEVANT" | "UNRELATED" | "INVALID",
  "confidence": 0.0 to 1.0,
  "explanation": "Clear explanation of why this answer is relevant or unrelated to ${projName}",
  "feedbackMessage": "If UNRELATED or INVALID, polite explanation to the user why this does not belong to ${projName} and what to provide instead. If PARTIALLY_RELEVANT, polite follow-up asking for the missing specific details. If RELEVANT, leave empty.",
  "clarificationNeeds": ["specific missing detail 1", "specific missing detail 2"]
}`;

        const result = await ai.generateStructuredJSON(prompt);
        if (result && ['RELEVANT', 'PARTIALLY_RELEVANT', 'UNRELATED', 'INVALID'].includes(result.classification)) {
          let classification = result.classification;

          // Hybrid safety guard: If LLM marked a real Hindi/Marathi/English domain sentence as INVALID or UNRELATED,
          // check deterministic semantic fallback to ensure genuine multilingual answers are never wrongly rejected.
          if ((classification === 'INVALID' || classification === 'UNRELATED') && (/[ऀ-ॿ]/.test(text) || text.length >= 10)) {
            const fallbackCheck = this._semanticFallbackEvaluation({
              text,
              project,
              projName,
              projDomain,
              stageName,
              questionText,
              embeddingScore
            });
            if (fallbackCheck.isRelevant) {
              classification = fallbackCheck.classification;
            }
          }

          const isRelevant = classification === 'RELEVANT' || classification === 'PARTIALLY_RELEVANT';
          const isOutOfScope = classification === 'UNRELATED' || classification === 'INVALID';

          return {
            classification,
            isRelevant,
            isOutOfScope,
            status: classification === 'UNRELATED' ? 'CONTEXT_MISMATCH' : classification,
            confidence: typeof result.confidence === 'number' ? result.confidence : 0.9,
            explanation: result.explanation || `Evaluated as ${classification}`,
            feedbackMessage: result.feedbackMessage || (isOutOfScope ? `Your response does not appear relevant to ${projName}. Please provide details related to ${stageName}.` : ''),
            clarificationNeeds: Array.isArray(result.clarificationNeeds) ? result.clarificationNeeds : [],
            embeddingScore: Math.round(embeddingScore * 100) / 100
          };
        }
      } catch (err) {
        console.warn('[SemanticContextValidator] Live AI evaluation error, using semantic fallback:', err.message);
      }
    }

    // 4. Semantic Fallback (Deterministic & Embedding Hybrid)
    return this._semanticFallbackEvaluation({
      text,
      project,
      projName,
      projDomain,
      stageName,
      questionText,
      embeddingScore
    });
  }

  _semanticFallbackEvaluation({
    text,
    project,
    projName,
    projDomain,
    stageName,
    questionText,
    embeddingScore
  }) {
    const lower = text.toLowerCase();

    // --- 1. Gibberish / random keystroke detection ---------------------
    const words = text.split(/\s+/).filter(Boolean);
    // Common keyboard-walk / random mash patterns and very-low-vowel tokens.
    const KEYBOARD_MASH = /\b(qwerty|asdf|zxcv|qwerty|asdfg|zxcvb|qwertz|hjkl|poiuy|ljk|mnbv|dfgh)\b/i;
    const vowels = (s) => (s.match(/[aeiou]/gi) || []).length;
    // Known keyboard-walk strings are gibberish; otherwise be conservative and
    // only flag LONG consonant mashes (>=6 letters, no vowel) so legitimate
    // Hinglish/tech words ("hona", "postgresql") are never misclassified.
    const gibberishWords = words.filter((w) => {
      const letters = w.replace(/[^a-zA-Z]/g, '');
      if (!letters) return false;
      if (/[ऀ-ॿ]/.test(w)) return false;
      if (KEYBOARD_MASH.test(w) && /[^aeiou]/i.test(w)) return /[aeiou]/i.test(w) ? false : true;
      if (KEYBOARD_MASH.test(w) && letters.length >= 4) return true;
      if (letters.length < 6) return false;
      return vowels(letters) === 0; // pure consonant run, e.g. "qwrtyd"
    });
    // "Digit-only" only when the ENTIRE answer carries no letters of any script
    // (Devanagari letters are word chars in Unicode, so exclude them explicitly).
    const hasAnyLetter = /[a-zA-Zऀ-ॿ]/.test(text);
    const hasDigitOnly = words.length > 0 && !hasAnyLetter && words.every((w) => /^[\d\s\W]+$/.test(w));
    const isGibberish = hasDigitOnly ||
      (words.length >= 3 && gibberishWords.length / words.length >= 0.6 && !/[ऀ-ॿ]/.test(text) && gibberishWords.length >= 2);
    if (isGibberish) {
      return {
        classification: 'INVALID',
        isRelevant: false,
        isOutOfScope: true,
        status: 'INVALID',
        confidence: 0.9,
        explanation: 'Input appears to be random characters rather than a meaningful answer.',
        feedbackMessage: `I could not understand that response. Could you please describe, in your own words, the information requested for ${stageName}?`,
        clarificationNeeds: ['A meaningful, readable response'],
        embeddingScore
      };
    }

    // --- 2. Hard out-of-scope patterns (sports, weather, entertainment) --
    const outOfScopeKeywords = [
      'football', 'cricket', 'match score', 'ipl', 'fifa', 'weather', 'movie', 'cinema', 'song',
      'dinner', 'recipe', 'cooking', 'shopping mall', 'flight ticket', 'hotel booking', 'watch a'
    ];
    const isExplicitlyOutOfScope = outOfScopeKeywords.some((kw) => lower.includes(kw)) &&
      !lower.includes(projName.toLowerCase());
    if (isExplicitlyOutOfScope) {
      return {
        classification: 'UNRELATED',
        isRelevant: false,
        isOutOfScope: true,
        status: 'CONTEXT_MISMATCH',
        confidence: 0.9,
        explanation: `Input references topics unrelated to ${projName}.`,
        feedbackMessage: `This response does not appear related to ${projName}. Please provide information about ${stageName}.`,
        clarificationNeeds: [],
        embeddingScore
      };
    }

    // --- 3. Domain-content relevance -----------------------------------
    const stem = (w) => {
      if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
      if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
      return w;
    };
    // Generic verbs/nouns that appear in almost any project and must NOT count
    // as domain grounding (otherwise "track budget" matches "token tracking").
    const GENERIC_DOMAIN_WORDS = new Set([
      'track', 'tracking', 'manage', 'management', 'system', 'platform', 'user', 'users',
      'data', 'information', 'provide', 'service', 'services', 'support', 'access',
      'view', 'create', 'update', 'report', 'reports', 'notification', 'notifications',
      'monitor', 'real-time', 'realtime', 'online', 'digital', 'application', 'app'
    ]);
    const profileTerms = new Set(
      [projName, projDomain, project?.description, project?.scope]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .split(/[^a-z0-9\u0900-\u097F]+/)
        .filter((w) => w.length >= 4 && !GENERIC_DOMAIN_WORDS.has(w) && !GENERIC_DOMAIN_WORDS.has(stem(w)))
        .flatMap((w) => [w, stem(w)])
    );
    const answerTerms = lower.split(/[^a-z0-9\u0900-\u097F]+/).filter((w) => w.length >= 4);
    let domainHits = 0;
    const domainHitWords = [];
    for (const t of answerTerms) {
      if (!GENERIC_DOMAIN_WORDS.has(t) && !GENERIC_DOMAIN_WORDS.has(stem(t)) &&
          (profileTerms.has(t) || profileTerms.has(stem(t)))) {
        domainHits++;
        domainHitWords.push(t);
      }
    }

    // An explicit requirement about THE SYSTEM / a role performing an action.
    // Deliberately requires a system/role/modal anchor — generic software nouns
    // alone (e.g. the word "user") are not enough, to avoid accepting cross-domain
    // prose that merely mentions "a doctor" in a campus-event project.
    const ACTIONS_EN = '(?:upload|download|submit|create|add|view|see|edit|update|delete|remove|manage|record|capture|generate|send|receive|review|approve|register|sign up|log in|login|search|export|report|track|assign|request|book|browse|select|confirm|notify|notify|notify)';
    const ROLES_EN = '(?:users?|admins?|farmers?|officers?|managers?|citizens?|doctors?|patients?|workers?|volunteers?|patients?|receptionists?|staff|personnel|customers?|students?)';
    const explicitSystemReq =
      // "the system ... should/shall/must/... <verb>"
      /\b(?:the )?system\b[^.]{0,45}\b(?:shall|must|should|will|needs? to|has to|provide|allow|support|generate|send|store|display|record|notify|integrat|respond|enable|permit)\b/i.test(text) ||
      // "it ... should be ..." / impersonal modal (formal requirement style)
      /\b(?:it|the (?:system|application|platform|solution))\b[^.]{0,25}\b(?:should|must|shall|will|needs? to)\b/i.test(text) ||
      // "<role> can/should/shall/be able to <action> ..."
      new RegExp('\\b' + ROLES_EN + '\\b[^.]{0,25}\\b(?:can|could|shall|must|should|be able to)\\b[^.]{0,20}\\b' + ACTIONS_EN + '\\b', 'i').test(text) ||
      // Technology / platform constraint or interface ("must use PostgreSQL",
      // "integrate with Stripe") — explicit implementation requirement.
      /\b(?:must|should|shall|will|needs? to)?\s*(?:use|using|built with|implemented in|deployed on|based on|integrate with|connect to|run on)\b[^.]{0,30}\b(?:postgres|postgresql|mysql|mongo|mongodb|redis|docker|kubernetes|aws|azure|react|node|python|java|stripe|paypal|razorpay|twilio|firebase)\b/i.test(text) ||
      /\b(?:postgresql|mongodb|mysql|redis|stripe|paypal|razorpay|twilio|payment gateway|sms gateway|email provider)\b/i.test(text) &&
        /(?:use|using|must|should|shall|integrate|depend|built|deploy|technology|database)/i.test(text) ||
      // Hinglish / romanized system statement ("system fast hona chahiye",
      // "user accounts manage karu shakto"). Matches system/feature tokens + modal.
      /(?:system|users?|user|admin|accounts?|expense|kharch|feature|app|platform|login|report|mariz|kisan)[^.]*(?:chahiye|chahida|pahije|hona chahiye|honi|kar sake|kar sakte|kar sakta|kar sako|karu shakto|kar shakto|karne ki suvidha|manage kar)/i.test(text) ||
      /(?:manage|add|view|create|delete|update|record|dekh|bhar|jod)\s+(?:karu|kar)\s*(?:shakto|sake|sakte|sakta)/i.test(text) ||
      // Devanagari (Hindi/Marathi): modal/obligation markers + a system/action concept.
      (
        /[ऀ-ॿ]/.test(text) &&
        /(चाहिए|सके|सकता|सकती|सकते|पाहिजे|शकतो|शकते|होनी|करने|मिले|यावी|सुविधा)/.test(text)
      );

    // Content vocabulary that is inherently about building software. Such words
    // only accept the answer if it is also DOMAIN-GROUNDED (otherwise a grocery
    // expense answer mentioning "report/export" would be accepted for a hospital
    // system). Pure cross-cutting auth/role language remains accepted in roles
    // & permissions and generic system contexts.
    const crossCuttingAuth = /\b(login|log in|password|access control|authentication|authorization|role-based|user roles?)\b/i.test(text);
    const softwareNoun = /\b(api|database|dashboard|workflow|notification|feature|requirement|appointment|queue|registration|token|export|report|csv|pdf)\b/i.test(text);
    const softwareSignal =
      words.length >= 3 &&
      (crossCuttingAuth || (softwareNoun && (domainHits >= 1 || embeddingScore >= 0.82)));

    // Devanagari capability/requirement statement (Hindi/Marathi) in a
    // requirement stage: the modal markers indicate the user is describing what
    // the system should do, which is inherently relevant to an RE interview.
    const devanagariRequirement = /[ऀ-ॿ]/.test(text) &&
      /(चाहिए|सके|सकता|सकती|सकते|पाहिजे|शकतो|शकते|सुविधा|प्रणाली|सिस्टम)/.test(text);

    // Domain grounding: an explicit requirement about an actor/action still
    // must belong to THIS project. e5 crowding makes cosine weak, so anchor on
    // domain terms; accept a high-embedding actor requirement (genuinely on
    // topic), reject a mid-range cross-domain one (e.g. prescriptions in a
    // campus-events app). Cross-domain system requirements that share no domain
    // vocabulary and sit below the high band are treated as unrelated.
    // On-topic-but-vague quality language is PARTIALLY_RELEVANT (ask for the
    // metric), not unrelated and not an accepted answer.
    const vagueWords2 = ['good', 'fast', 'nice', 'simple', 'best', 'user-friendly', 'easy', 'reliable', 'secure', 'quick', 'great'];
    const hasVagueQ = vagueWords2.some((w) => new RegExp('\\b' + w + '\\b').test(lower));
    const hasConcrete = /\d|%|within [0-9]|seconds?|milliseconds?|percent|99\.|256|aes|tls|ssl|oauth|jwt/i.test(text);
    const stageIsQuality = /non.?functional|performance|quality|security|availability/i.test(stageName + ' ' + (questionText || ''));
    if (hasVagueQ && !hasConcrete && (stageIsQuality || words.length <= 9)) {
      return {
        classification: 'PARTIALLY_RELEVANT',
        isRelevant: true,
        isOutOfScope: false,
        status: 'PARTIALLY_RELEVANT',
        confidence: 0.8,
        explanation: 'Answer is on-topic but vague / non-measurable.',
        feedbackMessage: `Could you make that specific and measurable for ${projName} (e.g., a target response time, uptime percentage, or a concrete capability)?`,
        clarificationNeeds: ['Quantifiable metric', 'Specific behavior description'],
        embeddingScore
      };
    }

    // Explicit requirement statements in a requirement stage are relevant —
    // UNLESS they describe a DIFFERENT domain (actor-can-action with no domain
    // grounding, no project-specific nouns, and emb below the confusion band).
    // Technology constraints and Hinglish/Devanagari requirement constructions
    // don't name a competing domain, so they stay accepted.
    const requirementStage = /functional|non.?functional|constraint|assumption|interface/i.test(stageName);
    const technologyOrNativeModal =
      (/\b(?:postgresql|mongodb|mysql|redis|stripe|paypal|razorpay|twilio|firebase|docker|aws)\b/i.test(text)) ||
      /(?:chahiye|chahida|pahije|hona|karu|kar sake|kar sakte|kar sakta|shakto|सुविधा|चाहिए|पाहिजे)/i.test(text);
    const crossDomainExplicitReq = explicitSystemReq && requirementStage &&
      domainHits === 0 && embeddingScore < 0.80 && !technologyOrNativeModal &&
      words.length >= 5;
    const explicitReqInReqStage = explicitSystemReq && requirementStage && !crossDomainExplicitReq;
    const actorReqGrounded = explicitSystemReq && (domainHits >= 1 || embeddingScore >= 0.82);

    const isRolesStage = /roles?|permissions?|stakeholders?|users?/i.test(stageName);
    const rolesSignal = isRolesStage && (
      /[ऀ-ॿ]/.test(text) ||
      devanagariRequirement ||
      /\b(roles?|permissions?|users?|admins?|officers?|borrowers?|applicants?|underwriters?|managers?|auditors?|doctors?|patients?|farmers?|operators?|citizens?|clients?|customers?|members?|staff)\b/i.test(text)
    );

    const isRelevant =
      domainHits >= 1 ||
      actorReqGrounded ||
      explicitReqInReqStage ||
      softwareSignal ||
      devanagariRequirement ||
      rolesSignal;

    if (!isRelevant) {
      return {
        classification: 'UNRELATED',
        isRelevant: false,
        isOutOfScope: true,
        status: 'CONTEXT_MISMATCH',
        confidence: 0.75,
        explanation: `Input has little in common with ${projName} (${projDomain}) and the ${stageName} stage.`,
        feedbackMessage: `This does not seem to relate to ${projName}. Could you tell me about the ${stageName.toLowerCase()} for this project instead?`,
        clarificationNeeds: [],
        embeddingScore
      };
    }

    return {
      classification: 'RELEVANT',
      isRelevant: true,
      isOutOfScope: false,
      status: 'RELEVANT',
      confidence: 0.85,
      explanation: `Answer is relevant to ${projName} and the ${stageName} stage.`,
      feedbackMessage: '',
      clarificationNeeds: [],
      embeddingScore
    };
  }
}
module.exports = new SemanticContextValidator();
