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

  // Always-on RE domain vocabulary (requirements-elicitation context)
  [
    'user', 'users', 'admin', 'system', 'feature', 'require', 'requirement', 'data',
    'account', 'login', 'report', 'expense', 'budget', 'manage', 'view', 'add',
    'create', 'delete', 'edit', 'access', 'permission', 'role', 'performance',
    'security', 'secure', 'fast', 'interface', 'api', 'database', 'integrate',
    'notify', 'notification', 'export', 'search', 'dashboard', 'password',
    'kharch', 'kharcha', 'kharch', 'expense', 'report', 'paisa', 'hisab',
    'व्यय', 'खर्च', 'रिपोर्ट', 'अहवाल', 'उपयोगकर्ता', 'सिस्टम', 'खाते'
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

async function assessRelevance({ rawText, project, sectionConfig }) {
  const text = (rawText || '').trim();

  if (!text) {
    return { relevant: false, reason: 'EMPTY', score: 0, isOutOfScope: true, category: 'INVALID' };
  }

  // 1. Hard out-of-scope patterns
  for (const entry of OUT_OF_SCOPE_PATTERNS) {
    if (entry.patterns.some((p) => p.test(text))) {
      return {
        relevant: false,
        reason: entry.reason,
        score: 0,
        isOutOfScope: true,
        category: 'OUT_OF_SCOPE',
        message: `This input appears unrelated to ${project?.projectName ? 'the ' + project.projectName : 'this project'}. Please provide information relevant to the current interview topic.`
      };
    }
  }

  // 2. Too short / no signal
  if (text.length < 3) {
    return { relevant: false, reason: 'TOO_SHORT', score: 0, isOutOfScope: true, category: 'INVALID' };
  }

  // 3. Capability vocabulary overlap (works across languages via lexicon)
  const capHits = capabilityKeywordHits(text);

  // 4. Domain keyword overlap
  const domainKw = buildDomainKeywords(project, sectionConfig);
  const tokens = text.toLowerCase().split(/[^a-zऀ-ॿ]+/).filter(Boolean);
  const domainHits = tokens.filter((t) => domainKw.has(t)).length;

  // 5. Embedding similarity to project context (single batched model call)
  let embeddingScore = 0;
  try {
    const context = [
      project?.projectName, project?.description, project?.scope,
      sectionConfig?.name, sectionConfig?.description
    ].filter(Boolean).join(' ');
    if (context) {
      const [a, b] = await embeddingService.generateEmbeddings([text, context]);
      embeddingScore = embeddingService.cosineSimilarity(a, b);
    }
  } catch (e) {
    embeddingScore = 0;
  }

  const score = Math.min(1, capHits * 0.18 + Math.min(domainHits, 6) * 0.06 + embeddingScore * 0.35);

  // Relevance decision: any recognized capability in ANY language is relevant;
  // otherwise require enough domain/embedding signal.
  const relevant = capHits >= 1 || domainHits >= 2 || embeddingScore >= 0.55;

  if (!relevant) {
    return {
      relevant: false,
      reason: 'NOT_RELATED_TO_PROJECT',
      score: Math.round(score * 100) / 100,
      isOutOfScope: true,
      category: 'OUT_OF_SCOPE',
      message: `This input appears unrelated to ${project?.projectName ? 'the ' + project.projectName : 'this project'}. Please provide information relevant to the current interview topic (${sectionConfig?.name || 'requirements'}).`
    };
  }

  return {
    relevant: true,
    reason: null,
    score: Math.round(score * 100) / 100,
    isOutOfScope: false,
    category: 'RELEVANT',
    signals: { capabilityHits: capHits, domainHits, embeddingScore: Math.round(embeddingScore * 100) / 100 }
  };
}

module.exports = { assessRelevance, buildDomainKeywords };
