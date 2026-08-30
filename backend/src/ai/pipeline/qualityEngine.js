/**
 * Phases 9, 11, 12 — Requirement Quality Analysis, Semantic Duplicate Detection
 * and Rule-Conflict Detection.
 *
 *  - Duplicate detection uses sentence embeddings + cosine similarity AND
 *    normalized-statement lexical overlap (configurable threshold).
 *  - Conflict detection uses semantic signatures (permission/obligation/denial
 *    on the same object) plus embedding similarity.
 *  - Neither duplicates nor conflicts are silently dropped: both requirements
 *    are preserved and flagged for resolution.
 */

const embeddingService = require('../EmbeddingService');
const { detectVagueTerms } = require('./semanticEngine');
const { assessProjectRelevance } = require('./contextRelevanceEngine');

// Duplicate detection thresholds.
const DUPLICATE_NEAR_IDENTICAL = 0.96;
const DUPLICATE_LEXICAL = 0.50;
const DUPLICATE_THRESHOLD = DUPLICATE_NEAR_IDENTICAL;
const DUPLICATE_HARD_THRESHOLD = 0.985;
const CONFLICT_SIMILARITY_FLOOR = 0.45;

const FORMULA_TOKENS = new Set([
  'system', 'shall', 'should', 'must', 'allow', 'allows', 'able', 'enable',
  'enables', 'provide', 'provides', 'support', 'supports', 'ensure', 'user',
  'users', 'administrator', 'administrators', 'admin', 'their', 'they',
  'them', 'with', 'from', 'into', 'onto', 'that', 'this', 'for', 'and',
  'the', 'are', 'can', 'will', 'may', 'each', 'all', 'any', 'via', 'use',
  'using', 'used', 'ability'
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function contentTokens(text) {
  return tokenize(text)
    .filter((w) => !FORMULA_TOKENS.has(w))
    .map((w) => {
      if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
      if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
      return w;
    });
}

function jaccard(aTokens, bTokens) {
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

/**
 * Score the 10 ISO/IEC/IEEE 29148 quality characteristics for a requirement.
 */
function scoreQuality(req) {
  const desc = req.normalizedDescription || req.description || '';
  const tokens = tokenize(desc);
  const vague = detectVagueTerms(desc);

  const scores = {
    atomicity: req.isAtomic === false ? 40 : 90,
    clarity: vague.length ? 45 : 88,
    completeness: /shall/.test(desc) && tokens.length >= 4 ? 85 : 55,
    consistency: (req.conflictReferences && req.conflictReferences.length) ? 40 : 85,
    testability: (vague.length || req.status === 'NEEDS_CLARIFICATION') ? 40 : 85,
    unambiguity: vague.length ? 40 : 88,
    feasibility: 80,
    traceability: req.requirementId ? 90 : 50
  };

  const validationDimensions = {
    specific: scores.clarity >= 60 && !vague.length,
    complete: scores.completeness >= 60,
    unambiguous: scores.unambiguity >= 60 && !vague.length,
    consistent: scores.consistency >= 60,
    feasible: scores.feasibility >= 60,
    verifiable: scores.testability >= 60,
    necessary: true,
    traceable: Boolean(req.requirementId),
    measurable: req.type === 'NON_FUNCTIONAL' ? !vague.length : true,
    projectContextRelevance: req.contextRelevance?.status !== 'CONTEXT_MISMATCH'
  };

  const flags = [];
  if (scores.atomicity < 60) flags.push('NON_ATOMIC');
  if (vague.length) flags.push('AMBIGUOUS_VAGUE_TERMS');
  if (scores.testability < 60) flags.push('NOT_TESTABLE');
  if (tokens.length > 60) flags.push('LARGE_UNSTRUCTURED_PARAGRAPH');
  if (!/the system shall|shall allow|shall (provide|support|enforce|maintain|generate|protect|operate|depend|be|respond|scale)/i.test(desc)) flags.push('NON_FORMAL_GRAMMAR');

  return { scores, flags, vagueTerms: vague, validationDimensions };
}

/**
 * Analyze a full set of requirements for a project: attaches quality scores,
 * context relevance, duplicate candidates and conflict references. Returns issues list + annotated
 * requirements.
 */
async function analyzeRequirementSet(requirements, project = null) {
  const issues = [];

  // Ensure embeddings exist — generate ONCE for every requirement that lacks
  // one via a single batched model call (then reused for duplicates/conflicts).
  const embeddingText = (r) => `${r.normalizedDescription || r.description || ''}`;
  const missing = requirements.filter((r) => !r.embedding || r.embedding.length === 0);
  if (missing.length) {
    const vecs = await embeddingService.generateEmbeddings(missing.map(embeddingText));
    missing.forEach((r, i) => { r.embedding = vecs[i]; });
  }

  // ---- 1. Context Relevance & Quality analysis per requirement ----
  for (const req of requirements) {
    if (project) {
      const rel = await assessProjectRelevance(req, project);
      req.contextRelevance = rel;
      if (rel.status === 'CONTEXT_MISMATCH') {
        issues.push({
          issueType: 'OUT_OF_SCOPE',
          severity: 'HIGH',
          description: `Context Mismatch: Requirement ${req.requirementId} ("${req.title}") is not aligned with ${project.projectName || 'the project'}. ${rel.reason}`,
          relatedRequirementIds: [req.requirementId],
          suggestedResolution: 'Verify if requirement belongs to project scope or remove it.'
        });
      }
    }

    const { scores, flags, vagueTerms, validationDimensions } = scoreQuality(req);
    req.qualityScores = scores;
    req.validationDimensions = validationDimensions;
    req.qualityFlags = Array.from(new Set([...(req.qualityFlags || []), ...flags]));
    req.ambiguityFlags = Array.from(new Set([...(req.ambiguityFlags || []), ...(vagueTerms.length ? vagueTerms.map((v) => `VAGUE_TERM:${v}`) : [])]));
    req.completenessScore = Math.round(
      (scores.atomicity + scores.clarity + scores.completeness + scores.testability + scores.unambiguity) / 5
    );

    if (flags.includes('AMBIGUOUS_VAGUE_TERMS') || flags.includes('NOT_TESTABLE')) {
      if (req.status === 'PROPOSED') req.status = 'NEEDS_CLARIFICATION';
      if (!req.clarificationQuestion) {
        req.clarificationQuestion = `The requirement "${req.title}" contains non-measurable or vague terms (${vagueTerms.join(', ') || 'unspecified metric'}). What measurable acceptance criteria should apply?`;
      }
      issues.push({
        issueType: 'AMBIGUITY',
        severity: 'MEDIUM',
        description: `Requirement ${req.requirementId} ("${req.title}") contains vague/non-testable terms: ${vagueTerms.join(', ') || 'unspecified metric'}. ISO/IEC/IEEE 29148 requires testable, verifiable statements.`,
        relatedRequirementIds: [req.requirementId],
        suggestedResolution: req.clarificationQuestion,
        clarificationQuestion: req.clarificationQuestion
      });
    }
  }

  // ---- 2. Semantic duplicate detection ----
  for (let i = 0; i < requirements.length; i++) {
    for (let j = i + 1; j < requirements.length; j++) {
      const a = requirements[i];
      const b = requirements[j];

      const aTok = contentTokens(`${a.title} ${a.normalizedDescription}`);
      const bTok = contentTokens(`${b.title} ${b.normalizedDescription}`);
      const lex = jaccard(aTok, bTok);
      const cos = embeddingService.cosineSimilarity(a.embedding, b.embedding);

      // Identical normalized statement -> definitive duplicate
      const identical = (a.normalizedDescription || '').trim().toLowerCase() === (b.normalizedDescription || '').trim().toLowerCase();
      // Near-identical neural semantics (paraphrase of the same requirement).
      const nearIdentical = cos >= DUPLICATE_NEAR_IDENTICAL;
      // Strong content-word lexical overlap (word-level duplicate).
      const strongLexical = lex >= DUPLICATE_LEXICAL;
      const isDuplicate = identical || nearIdentical || strongLexical;
      const similarity = Math.max(cos, lex);

      if (isDuplicate) {
        const score = Math.round(similarity * 100) / 100;
        a.duplicateCandidates = Array.from(new Set([...(a.duplicateCandidates || []), b.requirementId]));
        b.duplicateCandidates = Array.from(new Set([...(b.duplicateCandidates || []), a.requirementId]));
        a.duplicateScores = { ...(a.duplicateScores || {}), [b.requirementId]: score };
        b.duplicateScores = { ...(b.duplicateScores || {}), [a.requirementId]: score };

        // Generate intelligent merge suggestion
        const mergedTitle = a.title.length <= b.title.length ? a.title : b.title;
        const longerDesc = (a.normalizedDescription || '').length >= (b.normalizedDescription || '').length
          ? a.normalizedDescription
          : b.normalizedDescription;

        issues.push({
          issueType: 'DUPLICATE',
          severity: identical || cos >= DUPLICATE_HARD_THRESHOLD ? 'HIGH' : 'MEDIUM',
          description: `Potential semantic duplicate: ${a.requirementId} ("${a.title}") and ${b.requirementId} ("${b.title}") share ${(cos * 100).toFixed(1)}% neural similarity${identical ? ' and identical normalized text' : ` and ${(lex * 100).toFixed(0)}% content-word overlap`}. Preserved for review — not auto-deleted.`,
          relatedRequirementIds: [a.requirementId, b.requirementId],
          similarityScore: score,
          explanation: `Both requirements specify ${a.title.toLowerCase()} capabilities with ${Math.round(score * 100)}% semantic overlap.`,
          suggestedMerge: longerDesc || `The system shall allow authorized users to manage ${mergedTitle.toLowerCase()}.`,
          suggestedResolution: 'Merge into one comprehensive requirement or explicitly differentiate the capabilities.'
        });
      }
    }
  }

  // ---- 3. Rule-conflict detection ----
  for (let i = 0; i < requirements.length; i++) {
    for (let j = i + 1; j < requirements.length; j++) {
      const a = requirements[i];
      const b = requirements[j];
      if (a.type === 'NON_FUNCTIONAL' || b.type === 'NON_FUNCTIONAL') continue;

      const conflict = detectConflict(a, b, embeddingService);
      if (conflict) {
        a.conflictReferences = Array.from(new Set([...(a.conflictReferences || []), b.requirementId]));
        b.conflictReferences = Array.from(new Set([...(b.conflictReferences || []), a.requirementId]));
        issues.push({
          issueType: 'RULE_CONFLICT',
          severity: 'HIGH',
          description: `Rule conflict between ${a.requirementId} and ${b.requirementId}: ${conflict.reason}. Both requirements are preserved; the conflict must be resolved by the stakeholder.`,
          relatedRequirementIds: [a.requirementId, b.requirementId],
          similarityScore: conflict.score,
          suggestedResolution: conflict.resolution
        });
      }
    }
  }

  return { issues, requirements };
}

/**
 * Detect a contradiction between two requirements.
 * Strategy: classify each statement's semantic stance on an action/object as
 * PERMISSIVE (all users / every / automatically) or RESTRICTIVE (only their
 * own / private / cannot / only manually). A pair with opposite stances on the
 * same domain object/action is a RULE_CONFLICT. Both requirements are kept.
 */
function stanceOf(text) {
  const t = text.toLowerCase();
  const restrictive = [
    /only their own/, /own private/, /\bcannot\b/, /shall not/, /must not/,
    /only when manually/, /only manually/, /manual request/, /on request only/,
    /only on demand/, /not allowed/, /no access/, /\bprivate\b/, /restricted to/,
    /only their\b/, /sirf apna/, /sirf apne/
  ];
  const permissive = [
    /all users/, /every user/, /any user/, /everyone/, /all data/, /view every/,
    /access all/, /every user's/, /all financial/, /automatically/, /auto-generat/,
    /without manual/, /automatic\b/, /sabhi users/, /sab users/
  ];
  const isRestrictive = restrictive.some((p) => p.test(t));
  const isPermissive = permissive.some((p) => p.test(t));
  return { isRestrictive, isPermissive };
}

function detectConflict(a, b, emb) {
  const ta = `${a.normalizedDescription || ''} ${a.title} ${a.rawSourceText || ''}`.toLowerCase();
  const tb = `${b.normalizedDescription || ''} ${b.title} ${b.rawSourceText || ''}`.toLowerCase();

  const cos = emb.cosineSimilarity(a.embedding, b.embedding);
  const aTok = new Set(tokenize(ta));
  const bTok = new Set(tokenize(tb));
  let shared = 0;
  for (const t of aTok) if (bTok.has(t)) shared++;
  const overlap = shared / Math.max(1, new Set([...aTok, ...bTok]).size);
  const score = Math.max(cos, overlap);

  const sa = stanceOf(ta);
  const sb = stanceOf(tb);

  // Opposing stances?
  const opposing =
    (sa.isRestrictive && sb.isPermissive) || (sb.isRestrictive && sa.isPermissive);

  // Shared domain object / action?
  const domObjects = ['expense', 'expenses', 'report', 'reports', 'data', 'financial', 'account', 'accounts', 'information', 'record', 'records', 'user', 'users'];
  const sharedObjects = domObjects.filter((o) => ta.includes(o) && tb.includes(o));
  const sameAction =
    (/(view|see|access|read|dekh|pah|बघ|देख)/.test(ta) && /(view|see|access|read|dekh|pah|बघ|देख)/.test(tb)) ||
    (/(generat|create|banay|auto)/.test(ta) && /(generat|create|request|manual)/.test(tb)) ||
    (ta.includes('report') && tb.includes('report')) ||
    (ta.includes('data') && tb.includes('data'));

  const related = sharedObjects.length >= 1 || sameAction || score >= 0.5;

  if (opposing && related) {
    return {
      reason: 'one requirement permits broad/automated behavior while the other restricts/denies the same behavior',
      resolution: 'Clarify the exact rule (who may perform the action, on whose data, and whether it is automatic or manual). The system cannot simultaneously permit and forbid the behavior.',
      score: Math.round(score * 100) / 100
    };
  }

  return null;
}

module.exports = {
  analyzeRequirementSet,
  scoreQuality,
  detectConflict,
  DUPLICATE_THRESHOLD
};
