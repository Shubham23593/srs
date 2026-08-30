/**
 * Project Context Relevance Engine (Priority 4).
 *
 * Evaluates whether a candidate or catalog requirement is contextually relevant
 * to the active project (Project Name, Description, Scope, Domain, Objectives,
 * Stakeholders, and Target Users).
 *
 * Distinguishes between:
 *  - Core Domain Capabilities (directly aligned with project goals)
 *  - Cross-Cutting Infrastructure (auth, security, response-time, audit logs, export)
 *  - Context Mismatches (features belonging to completely unrelated domains)
 */

const embeddingService = require('../EmbeddingService');

const KNOWN_DOMAINS = {
  HEALTHCARE: {
    indicators: ['hospital', 'patient', 'doctor', 'clinic', 'appointment', 'queue', 'medical', 'prescription', 'health', 'triage', 'consultation', 'nurse', 'ambulance'],
    mismatchIndicators: ['expense', 'budget', 'student event', 'campus navigation', 'ecommerce checkout', 'shopping cart', 'flight booking', 'hotel room']
  },
  EDUCATION: {
    indicators: ['student', 'teacher', 'course', 'grade', 'campus', 'college', 'university', 'event registration', 'attendance', 'faculty', 'curriculum', 'exam'],
    mismatchIndicators: ['patient', 'doctor', 'prescription', 'triage', 'clinical', 'banking ledger', 'hospital bed']
  },
  FINTECH: {
    indicators: ['expense', 'budget', 'payment', 'transaction', 'account', 'invoice', 'salary', 'financial', 'tax', 'receipt', 'wallet', 'ledger'],
    mismatchIndicators: ['patient triage', 'doctor schedule', 'student exam', 'campus dining', 'medical report']
  }
};

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

/**
 * Evaluate requirement relevance to the specific project.
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
    // If project metadata is sparse, default to RELEVANT
    return {
      status: 'RELEVANT',
      score: 1.0,
      reason: 'Requirement accepted for generic software specification.'
    };
  }

  const projectText = buildProjectProfileText(project);
  const reqLower = reqText.toLowerCase();

  // 1. Identify project domain
  let activeDomain = null;
  for (const [domKey, domConfig] of Object.entries(KNOWN_DOMAINS)) {
    const hits = domConfig.indicators.filter((ind) => projectText.includes(ind)).length;
    if (hits >= 1 || (project.domain && project.domain.toLowerCase().includes(domKey.toLowerCase()))) {
      activeDomain = { key: domKey, ...domConfig };
      break;
    }
  }

  // 2. Check for explicit cross-domain mismatch
  if (activeDomain) {
    for (const badTerm of activeDomain.mismatchIndicators) {
      if (reqLower.includes(badTerm)) {
        return {
          status: 'CONTEXT_MISMATCH',
          score: 0.15,
          reason: `This requirement mentions "${badTerm}", which is unrelated to the ${project.projectName || 'active project'} (${activeDomain.key} domain).`
        };
      }
    }
  }

  // 3. Generic software infrastructure check
  if (isGenericInfrastructure(reqText)) {
    return {
      status: 'RELEVANT',
      score: 0.9,
      reason: 'Requirement specifies standard system infrastructure / security / performance capability applicable to this system.'
    };
  }

  // 4. Token overlap between requirement and project profile
  const projectTokens = new Set(projectText.split(/[^a-z0-9ऀ-ॿ]+/).filter((w) => w.length >= 3));
  const reqTokens = reqLower.split(/[^a-z0-9ऀ-ॿ]+/).filter((w) => w.length >= 3);
  let overlapCount = 0;
  for (const token of reqTokens) {
    if (projectTokens.has(token)) overlapCount++;
  }

  // 5. Neural Embedding Similarity between requirement and project profile
  let cosineSim = 0.5;
  try {
    const [reqVec, projVec] = await embeddingService.generateEmbeddings([reqText, projectText.slice(0, 1000)]);
    cosineSim = embeddingService.cosineSimilarity(reqVec, projVec);
  } catch (e) {
    cosineSim = 0.5;
  }

  // Calculate composite score
  const lexicalRatio = reqTokens.length ? overlapCount / reqTokens.length : 0;
  const compositeScore = Math.min(1.0, lexicalRatio * 0.4 + cosineSim * 0.6);

  if (activeDomain) {
    const domainHits = activeDomain.indicators.filter((ind) => reqLower.includes(ind)).length;
    if (domainHits >= 1) {
      return {
        status: 'RELEVANT',
        score: Math.max(0.85, compositeScore),
        reason: `Directly aligns with ${project.projectName} core domain capabilities.`
      };
    }
  }

  if (compositeScore >= 0.65 || overlapCount >= 2) {
    return {
      status: 'RELEVANT',
      score: compositeScore,
      reason: `Directly aligns with ${project.projectName} objectives and scope.`
    };
  }

  if (compositeScore >= 0.45 || overlapCount >= 1) {
    return {
      status: 'POSSIBLY_RELEVANT',
      score: compositeScore,
      reason: `Partially relates to ${project.projectName} context; review recommended to verify domain alignment.`
    };
  }

  return {
    status: 'CONTEXT_MISMATCH',
    score: compositeScore,
    reason: `This requirement appears unrelated to ${project.projectName}. Please verify whether it belongs in this project scope.`
  };
}

module.exports = {
  assessProjectRelevance,
  buildProjectProfileText,
  isGenericInfrastructure
};
