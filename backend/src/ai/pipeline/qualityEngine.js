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

const DUPLICATE_THRESHOLD = 0.82; // cosine
const DUPLICATE_HARD_THRESHOLD = 0.92;
const CONFLICT_SIMILARITY_FLOOR = 0.45;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
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
 * Score the 8 ISO/IEC/IEEE 29148 quality characteristics for a requirement.
 */
function scoreQuality(req) {
  const desc = req.normalizedDescription || req.description || '';
  const tokens = tokenize(desc);
  const vague = detectVagueTerms(desc);

  const scores = {
    atomicity: req.isAtomic === false ? 40 : 90,
    clarity: vague.length ? 45 : 88,
    completeness: /shall/.test(desc) && tokens.length >= 4 ? 85 : 55,
    consistency: 85, // checked globally for conflicts; baseline
    testability: (vague.length || req.status === 'NEEDS_CLARIFICATION') ? 40 : 85,
    unambiguity: vague.length ? 40 : 88,
    feasibility: 80,
    traceability: req.requirementId ? 90 : 50
  };

  const flags = [];
  if (scores.atomicity < 60) flags.push('NON_ATOMIC');
  if (vague.length) flags.push('AMBIGUOUS_VAGUE_TERMS');
  if (scores.testability < 60) flags.push('NOT_TESTABLE');
  if (tokens.length > 60) flags.push('LARGE_UNSTRUCTURED_PARAGRAPH');
  if (!/the system shall|shall allow|shall (provide|support|enforce|maintain|generate|protect|operate|depend|be|respond|scale)/i.test(desc)) flags.push('NON_FORMAL_GRAMMAR');

  return { scores, flags, vagueTerms: vague };
}

/**
 * Analyze a full set of requirements for a project: attaches quality scores,
 * duplicate candidates and conflict references. Returns issues list + annotated
 * requirements.
 */
async function analyzeRequirementSet(requirements) {
  const issues = [];

  // Ensure embeddings exist
  for (const r of requirements) {
    if (!r.embedding || r.embedding.length === 0) {
      r.embedding = await embeddingService.generateEmbedding(`${r.title}: ${r.normalizedDescription || r.description}`);
    }
  }

  // ---- 1. Quality analysis per requirement ----
  for (const req of requirements) {
    const { scores, flags, vagueTerms } = scoreQuality(req);
    req.qualityScores = scores;
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

      const aTok = tokenize(`${a.title} ${a.normalizedDescription}`);
      const bTok = tokenize(`${b.title} ${b.normalizedDescription}`);
      const lex = jaccard(aTok, bTok);
      const cos = embeddingService.cosineSimilarity(a.embedding, b.embedding);
      const similarity = Math.max(cos, lex * 0.95);

      // Identical normalized statement -> definitive duplicate
      const identical = (a.normalizedDescription || '').trim().toLowerCase() === (b.normalizedDescription || '').trim().toLowerCase();

      if (identical || similarity >= DUPLICATE_THRESHOLD) {
        const score = Math.round(similarity * 100) / 100;
        a.duplicateCandidates = Array.from(new Set([...(a.duplicateCandidates || []), b.requirementId]));
        b.duplicateCandidates = Array.from(new Set([...(b.duplicateCandidates || []), a.requirementId]));
        a.duplicateScores = { ...(a.duplicateScores || {}), [b.requirementId]: score };
        b.duplicateScores = { ...(b.duplicateScores || {}), [a.requirementId]: score };

        issues.push({
          issueType: 'DUPLICATE',
          severity: similarity >= DUPLICATE_HARD_THRESHOLD || identical ? 'HIGH' : 'MEDIUM',
          description: `Potential semantic duplicate: ${a.requirementId} ("${a.title}") and ${b.requirementId} ("${b.title}") share ${(score * 100).toFixed(1)}% semantic similarity. Preserved for review — not auto-deleted.`,
          relatedRequirementIds: [a.requirementId, b.requirementId],
          similarityScore: score,
          suggestedResolution: 'Merge into one requirement or explicitly differentiate the capabilities.'
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
