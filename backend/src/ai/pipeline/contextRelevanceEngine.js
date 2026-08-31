const { getAIProvider } = require('../index');
const embeddingService = require('../EmbeddingService');

const GENERIC_INFRA_TERMS = [
  'login', 'logout', 'authentication', 'password', 'role-based', 'access control',
  'permission', 'encryption', 'ssl', 'tls', 'security', 'audit log', 'notification',
  'response time', 'latency', 'availability', 'uptime', 'backup', 'disaster recovery',
  'export', 'pdf', 'csv', 'settings', 'profile', 'database', 'api', 'dashboard'
];

function buildProjectProfileText(project) {
  if (!project) return '';
  const parts = [
    project.projectName || '',
    project.description || '',
    project.scope || '',
    project.domain || '',
    Array.isArray(project.objectives) ? project.objectives.join(' ') : (project.objectives || ''),
    Array.isArray(project.targetUsers) ? project.targetUsers.join(' ') : (project.targetUsers || ''),
    Array.isArray(project.stakeholders) ? project.stakeholders.join(' ') : (project.stakeholders || '')
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/**
 * Check if the requirement text is generic software infrastructure.
 */
function isGenericInfrastructure(text) {
  const lower = (text || '').toLowerCase();
  return GENERIC_INFRA_TERMS.some((term) => lower.includes(term));
}

const GENERAL_STOP_WORDS = new Set([
  'the', 'system', 'shall', 'should', 'will', 'must', 'user', 'users',
  'allow', 'allows', 'provide', 'provides', 'enable', 'enables', 'with',
  'from', 'that', 'this', 'and', 'for', 'are', 'can', 'able', 'into',
  'access', 'manage', 'view', 'data', 'feature', 'features'
]);

/**
 * Evaluate requirement relevance to the specific project dynamically.
 *
 * @param {Object} requirement - { title, description, normalizedDescription, type, category }
 * @param {Object} project - { projectName, description, scope, domain, objectives, ... }
 * @returns {Promise<{ status: 'RELEVANT'|'POSSIBLY_RELEVANT'|'CONTEXT_MISMATCH', score: number, reason: string }>}
 */
async function assessProjectRelevance(requirement, project) {
  const reqText = `${requirement?.title || ''} ${requirement?.normalizedDescription || requirement?.description || ''}`.trim();
  if (!reqText) {
    return {
      status: 'CONTEXT_MISMATCH',
      score: 0,
      reason: 'Empty requirement statement.'
    };
  }

  if (!project || (!project.projectName && !project.description && !project.domain)) {
    return {
      status: 'RELEVANT',
      score: 1.0,
      reason: 'Requirement accepted for generic software specification.'
    };
  }

  // 1. Generic software infrastructure check
  if (isGenericInfrastructure(reqText)) {
    return {
      status: 'RELEVANT',
      score: 0.95,
      reason: 'Requirement specifies standard system infrastructure, security, or cross-cutting capability.'
    };
  }

  const projectText = buildProjectProfileText(project);
  const reqLower = reqText.toLowerCase();

  // 2. Token overlap between requirement and dynamic project profile (excluding generic stop words)
  const projectTokens = new Set(
    projectText.split(/[^a-z0-9ऀ-ॿ]+/).filter((w) => w.length >= 3 && !GENERAL_STOP_WORDS.has(w))
  );
  const reqTokens = reqLower
    .split(/[^a-z0-9ऀ-ॿ]+/)
    .filter((w) => w.length >= 3 && !GENERAL_STOP_WORDS.has(w));

  let overlapCount = 0;
  for (const token of reqTokens) {
    if (projectTokens.has(token)) overlapCount++;
  }

  // 3. Neural Embedding Similarity between requirement and project profile
  let cosineSim = 0.5;
  try {
    const [reqVec, projVec] = await embeddingService.generateEmbeddings([reqText, projectText.slice(0, 1000)]);
    cosineSim = embeddingService.cosineSimilarity(reqVec, projVec);
  } catch (e) {
    cosineSim = 0.5;
  }

  // If there are zero domain-specific keyword overlaps and it is not general infrastructure
  if (overlapCount === 0 && reqTokens.length >= 2) {
    return {
      status: 'CONTEXT_MISMATCH',
      score: Math.round(cosineSim * 0.4 * 100) / 100,
      reason: `This requirement appears unrelated to ${project.projectName || 'the active project'} (no overlapping domain concepts).`
    };
  }

  // Calculate composite semantic score
  const lexicalRatio = reqTokens.length ? overlapCount / reqTokens.length : 0;
  const compositeScore = Math.min(1.0, lexicalRatio * 0.45 + cosineSim * 0.55);

  if (compositeScore >= 0.55 || overlapCount >= 2) {
    return {
      status: 'RELEVANT',
      score: Math.round(compositeScore * 100) / 100,
      reason: `Directly aligns with ${project.projectName || 'project'} objectives and scope.`
    };
  }

  if (compositeScore >= 0.40 || overlapCount >= 1) {
    return {
      status: 'POSSIBLY_RELEVANT',
      score: Math.round(compositeScore * 100) / 100,
      reason: `Partially relates to ${project.projectName || 'project'} context.`
    };
  }

  return {
    status: 'CONTEXT_MISMATCH',
    score: Math.round(compositeScore * 100) / 100,
    reason: `This requirement appears unrelated to ${project.projectName || 'this project'}.`
  };
}

module.exports = {
  assessProjectRelevance,
  buildProjectProfileText,
  isGenericInfrastructure
};
