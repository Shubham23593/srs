/**
 * Phase 2 — Context & Project Scope Guard.
 *
 * Decides whether an interview answer is relevant to the current project /
 * interview topic BEFORE any requirements are extracted. Uses:
 *   1. Explicit out-of-scope patterns (sports, weather, politics, greetings...)
 *   2. Semantic relevance scoring (capability vocabulary overlap + embedding
 *      cosine similarity against the project/topic context).
 *
 * Unrelated input NEVER becomes a requirement.
 */

const { OUT_OF_SCOPE_PATTERNS, CAPABILITIES, NFR_PATTERNS, CONSTRAINT_PATTERNS, DEPENDENCY_PATTERNS, INTERFACE_PATTERNS } = require('./lexicon');
const embeddingService = require('../EmbeddingService');

function buildDomainKeywords(project, sectionConfig) {
  const words = new Set();
  const pushText = (t) => {
    if (!t) return;
    String(t).toLowerCase().split(/[^a-zऀ-ॿऀ-ॿ]+/).filter(Boolean).forEach((w) => {
      if (w.length >= 3) words.add(w);
    });
  };
  pushText(project?.projectName);
  pushText(project?.description);
  pushText(project?.scope);
  pushText(project?.domain);
  (project?.targetUsers || []).forEach(pushText);
  (project?.objectives || []).forEach(pushText);
  if (sectionConfig) pushText(sectionConfig.name + ' ' + sectionConfig.description);

  // Always-on RE generic vocabulary (general requirements-elicitation context)
  [
    'user', 'users', 'admin', 'system', 'feature', 'require', 'requirement', 'data',
    'account', 'login', 'manage', 'view', 'add', 'create', 'delete', 'edit',
    'access', 'permission', 'role', 'performance', 'security', 'secure', 'fast',
    'interface', 'api', 'database', 'integrate', 'notify', 'notification', 'export',
    'search', 'dashboard', 'password', 'record', 'information', 'schedule',
    'रिपोर्ट', 'अहवाल', 'उपयोगकर्ता', 'सिस्टम', 'खाते', 'नोंदणी', 'तपशील'
  ].forEach((w) => words.add(w));

  return words;
}

function capabilityKeywordHits(text) {
  const lower = text.toLowerCase();
  let hits = 0;
  const allKw = [];
  [...CAPABILITIES, ...NFR_PATTERNS, ...CONSTRAINT_PATTERNS, ...DEPENDENCY_PATTERNS, ...INTERFACE_PATTERNS]
    .forEach((c) => (c.keywords || []).forEach((k) => allKw.push(k)));
  for (const kw of allKw) {
    if (kw && lower.includes(kw.toLowerCase())) hits++;
  }
  return hits;
}

const semanticContextValidator = require('./semanticContextValidator');

async function assessRelevance({ rawText, project, sectionConfig, currentQuestion, conversationHistory }) {
  const result = await semanticContextValidator.validateInterviewAnswer({
    rawText,
    project,
    sectionConfig,
    currentQuestion,
    conversationHistory
  });

  return {
    relevant: result.isRelevant,
    isOutOfScope: result.isOutOfScope,
    classification: result.classification,
    status: result.status,
    category: result.status === 'CONTEXT_MISMATCH' || result.status === 'INVALID' ? 'OUT_OF_SCOPE' : result.classification,
    reason: result.explanation,
    message: result.feedbackMessage || `This input appears unrelated to ${project?.projectName || 'this project'}. Please provide information relevant to ${sectionConfig?.name || 'the current topic'}.`,
    clarificationNeeds: result.clarificationNeeds || [],
    confidence: result.confidence,
    score: result.confidence || (result.isRelevant ? 0.9 : 0.2),
    embeddingScore: result.embeddingScore
  };
}

module.exports = { assessRelevance, buildDomainKeywords };
