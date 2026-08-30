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

TASK:
1. Understand the semantic meaning and intent of the user's answer in its source language (English, Hindi, Marathi, Hinglish, or mixed).
2. Determine whether it describes features, workflows, roles, rules, or answers relevant to "${projName}".
3. Classify into EXACTLY one category:
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
          const classification = result.classification;
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

  /**
   * Deterministic semantic fallback when LLM is unavailable.
   */
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

    // Universal software cross-cutting infrastructure terms (valid for any software project)
    const universalInfra = [
      'user', 'admin', 'role', 'login', 'logout', 'auth', 'password', 'permission',
      'access', 'security', 'secure', 'encrypt', 'database', 'api', 'notification',
      'email', 'sms', 'report', 'export', 'pdf', 'csv', 'dashboard', 'search',
      'filter', 'performance', 'speed', 'latency', 'backup', 'audit', 'log',
      'उपयोगकर्ता', 'सिस्टम', 'लॉगिन', 'सुरक्षा', 'परमिशन', 'पासवर्ड', 'अहवाल', 'रिपोर्ट'
    ];

    const hasUniversalInfra = universalInfra.some((term) => lower.includes(term));

    // Hard out-of-scope patterns (casual greetings, sports, unrelated weather/movies)
    const outOfScopeKeywords = [
      'football', 'cricket', 'match', 'ipl', 'weather', 'movie', 'cinema', 'song',
      'dinner', 'recipe', 'food', 'cooking', 'shopping mall', 'flight ticket', 'hotel booking'
    ];

    const isExplicitlyOutOfScope = outOfScopeKeywords.some((kw) => lower.includes(kw));

    if (isExplicitlyOutOfScope && !lower.includes(projName.toLowerCase())) {
      return {
        classification: 'UNRELATED',
        isRelevant: false,
        isOutOfScope: true,
        status: 'CONTEXT_MISMATCH',
        confidence: 0.9,
        explanation: `Input references topics unrelated to ${projName}.`,
        feedbackMessage: `This response does not appear related to ${projName}. Please provide information about ${stageName} for this project.`,
        clarificationNeeds: [],
        embeddingScore
      };
    }

    // High vague words with no detail -> Partially Relevant
    const vagueWords = ['good', 'fast', 'nice', 'simple', 'best', 'user-friendly', 'easy'];
    const isOnlyVague = vagueWords.some((w) => lower.includes(w)) && text.split(/\s+/).length <= 4 && !hasUniversalInfra;
    if (isOnlyVague) {
      return {
        classification: 'PARTIALLY_RELEVANT',
        isRelevant: true,
        isOutOfScope: false,
        status: 'PARTIALLY_RELEVANT',
        confidence: 0.75,
        explanation: `Answer is on-topic but contains non-measurable or vague descriptions.`,
        feedbackMessage: `Could you specify measurable targets or specific functional details for ${projName}?`,
        clarificationNeeds: ['Quantifiable metrics', 'Specific behavior description'],
        embeddingScore
      };
    }

    // General software features or moderate embedding score
    if (hasUniversalInfra || embeddingScore >= 0.45) {
      return {
        classification: 'RELEVANT',
        isRelevant: true,
        isOutOfScope: false,
        status: 'RELEVANT',
        confidence: 0.85,
        explanation: `Answer relates to software capabilities and project context for ${projName}.`,
        feedbackMessage: '',
        clarificationNeeds: [],
        embeddingScore
      };
    }

    // Otherwise, low semantic similarity
    return {
      classification: 'UNRELATED',
      isRelevant: false,
      isOutOfScope: true,
      status: 'CONTEXT_MISMATCH',
      confidence: 0.7,
      explanation: `Input has low contextual similarity to ${projName} and ${stageName}.`,
      feedbackMessage: `This response does not appear relevant to ${projName}. Please provide details regarding ${stageName}.`,
      clarificationNeeds: [],
      embeddingScore
    };
  }
}

module.exports = new SemanticContextValidator();
