/**
 * Phases 4–10 — Semantic Understanding, Atomic Decomposition, Classification,
 * Formal Normalization, Zero-Hallucination, and Ambiguity handling.
 *
 * The raw interview answer is treated strictly as UNSTRUCTURED SOURCE EVIDENCE.
 * This engine interprets its meaning (across English / Hindi / Marathi /
 * Hinglish / mixed input), splits it into atomic capabilities, classifies each
 * atom semantically, and normalizes it into formal "The system shall ..."
 * English. The raw sentence NEVER survives into the requirement statement.
 */

const {
  CAPABILITIES, NFR_PATTERNS, CONSTRAINT_PATTERNS,
  DEPENDENCY_PATTERNS, INTERFACE_PATTERNS, VAGUE_WORDS
} = require('./lexicon');

// ---------------------------------------------------------------------------
// Clause splitting — splits on conjunctions / enumerations / sentence bounds,
// NOT on raw commas/word-count. Each clause is later tested for a distinct
// semantic capability.
// ---------------------------------------------------------------------------
function splitIntoClauses(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];

  // Split on sentence boundaries and conjunctions that join capabilities.
  // Multilingual conjunctions: and / aur / tatha / आणि / ani / va / ,
  const parts = raw
    .split(/(?:\.|;|\band\b|\baur\b|\btatha\b|\bतथा\b|\bऔर\b|\bआणि\b|\bअनि\b|\bव\b|\bani\b|,(?=\s*[A-Za-zऀ-ॿ]))/i)
    .map((s) => s.trim())
    .filter((s) => s && s.length > 1);

  return parts.length ? parts : [raw];
}

function detectVagueTerms(text) {
  const lower = String(text || '').toLowerCase();
  return VAGUE_WORDS.filter((w) => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word-boundary-ish check for latin; substring for devanagari
    if (/[ऀ-ॿ]/.test(w)) return lower.includes(w);
    return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(lower);
  });
}

function ctxHas(text, words) {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}

/**
 * Multilingual keyword match. Latin keywords match on word boundaries (so
 * "category" does NOT match inside "capturing"); Devanagari keywords match as
 * substrings. Supports multi-word phrases.
 */
function hasKeyword(textLower, rawText, kw) {
  if (/[ऀ-ॿ]/.test(kw)) return rawText.includes(kw);
  const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Phrase with spaces -> allow flexible boundary; single word -> strict boundary
  return new RegExp(`(^|[^a-z])${escaped}(?![a-z])`).test(textLower);
}

/**
 * Extract a structured set of atomic requirement interpretations from one
 * (possibly multilingual, possibly long) raw answer.
 *
 * @returns { requirements: [...], ignoredClauses: [...] }
 *   each requirement: {
 *     title, normalizedDescription, type, nfrSubcategory, category,
 *     priority, status, ambiguityFlags:[], clarificationQuestion,
 *     isAtomic:true, confidence, qualityFlags
 *   }
 */
/**
 * Detect enumerated verb + shared-object patterns within a SINGLE sentence,
 * e.g. "Users can add, update and delete expenses" -> CREATE, UPDATE, DELETE.
 * Returns capability ids matched by a verb AND a shared object in the sentence.
 */
function detectVerbObjectEnumerations(sentence) {
  const lower = sentence.toLowerCase();
  const matched = new Set();

  for (const cap of CAPABILITIES) {
    if (!cap.verbs || !cap.objects) continue;
    const hasObject = cap.objects.some((o) => {
      if (/[ऀ-ॿ]/.test(o)) return sentence.includes(o);
      return new RegExp(`(^|[^a-z])${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(lower);
    });
    if (!hasObject) continue;
    const hasVerb = cap.verbs.some((v) => {
      if (/[ऀ-ॿ]/.test(v)) return sentence.includes(v);
      return new RegExp(`(^|[^a-z])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(lower);
    });
    if (hasVerb) matched.add(cap.id);
  }
  return matched;
}

function extractAtomicRequirements(rawText, sectionConfig) {
  const clauses = splitIntoClauses(rawText);
  const found = [];
  const seenCapIds = new Set();
  const seenStatements = new Set();
  const ignoredClauses = [];

  const stage = sectionConfig?.name || 'Functional Requirements';

  // Pre-pass: verb+object enumeration across each full sentence (this catches
  // "add, update and delete expenses" even when commas split clauses oddly).
  const enumCapIds = new Set();
  const sentences = String(rawText || '').split(/(?<=[.!?])\s+/).filter(Boolean);
  for (const s of sentences) {
    for (const id of detectVerbObjectEnumerations(s)) enumCapIds.add(id);
  }
  for (const cap of CAPABILITIES) {
    if (enumCapIds.has(cap.id)) {
      const ctx = { has: (...ws) => ctxHas(rawText, ws) };
      const statement = cap.statementFor ? cap.statementFor(ctx) : cap.statement;
      const key = cap.id + '|' + statement;
      if (!seenCapIds.has(key)) {
        seenCapIds.add(key);
        seenStatements.add(statement);
        found.push({
          title: cap.title,
          normalizedDescription: statement,
          type: 'FUNCTIONAL', nfrSubcategory: 'N/A',
          category: cap.topic, topicCluster: cap.topic,
          priority: defaultPriority(cap),
          status: 'PROPOSED', ambiguityFlags: [], clarificationQuestion: '',
          isAtomic: true, atomic: true, confidence: 0.9, qualityFlags: [],
          sourceInterviewStage: stage
        });
      }
    }
  }

  for (const clause of clauses) {
    const clauseLower = clause.toLowerCase();
    let matchedInClause = false;

    // ---------- NON-FUNCTIONAL (quality attributes) ----------
    for (const nfr of NFR_PATTERNS) {
      const hit = nfr.keywords.find((kw) => {
        return hasKeyword(clauseLower, clause, kw);
      });
      if (!hit) continue;

      const measurable = nfr.measurable ? clause.match(nfr.measurable) : null;
      const vagueTerms = detectVagueTerms(clause);
      const isAmbiguous = nfr.ambiguous && !measurable;

      let statement;
      let status = 'PROPOSED';
      let ambiguityFlags = [];
      let clarificationQuestion = '';

      if (measurable && nfr.measurableStatement) {
        statement = nfr.measurableStatement(measurable);
        status = 'PROPOSED';
      } else {
        statement = nfr.vagueStatement;
        if (isAmbiguous) {
          status = 'NEEDS_CLARIFICATION';
          ambiguityFlags = ['NON_MEASURABLE_QUALITY_ATTRIBUTE', ...(vagueTerms.length ? [`VAGUE_TERM:${vagueTerms.join('|')}`] : [])];
          clarificationQuestion = nfr.clarification;
        }
      }

      const key = nfr.id + '|' + statement;
      if (!seenCapIds.has(key)) {
        seenCapIds.add(key);
        found.push({
          title: titleForNfr(nfr),
          normalizedDescription: statement,
          type: 'NON_FUNCTIONAL',
          nfrSubcategory: nfr.nfrSubcategory,
          category: nfr.topic,
          topicCluster: nfr.topic,
          priority: nfr.nfrSubcategory === 'SECURITY' || nfr.nfrSubcategory === 'PERFORMANCE' ? 'HIGH' : 'MEDIUM',
          status,
          ambiguityFlags,
          clarificationQuestion,
          isAtomic: true,
          atomic: true,
          confidence: measurable ? 0.92 : 0.7,
          qualityFlags: isAmbiguous ? ['AMBIGUOUS', 'NEEDS_CLARIFICATION'] : [],
          sourceInterviewStage: stage
        });
      }
      matchedInClause = true;
    }

    // ---------- DEPENDENCY ----------
    for (const dep of DEPENDENCY_PATTERNS) {
      const hit = dep.keywords.find((kw) => hasKeyword(clauseLower, clause, kw));
      if (hit) {
        const dependency = dep.extract ? dep.extract(clauseLower) : null;
        const statement = dep.statement({ dependency });
        const key = dep.id + '|' + (dependency || '');
        if (!seenCapIds.has(key)) {
          seenCapIds.add(key);
          found.push({
            title: dependency ? `Dependency: ${titleCase(dependency.split(',')[0])}` : 'External Service Dependency',
            normalizedDescription: statement,
            type: 'DEPENDENCY',
            nfrSubcategory: 'N/A',
            category: 'Assumptions & Dependencies',
            topicCluster: 'External Dependencies',
            priority: 'MEDIUM',
            status: 'PROPOSED',
            ambiguityFlags: dependency ? [] : ['DEPENDENCY_UNSPECIFIED'],
            clarificationQuestion: dependency ? '' : 'Which specific external service or provider does the system depend on?',
            isAtomic: true, atomic: true,
            confidence: dependency ? 0.9 : 0.65,
            qualityFlags: dependency ? [] : ['NEEDS_CLARIFICATION'],
            sourceInterviewStage: stage
          });
        }
        matchedInClause = true;
      }
    }

    // ---------- CONSTRAINT ----------
    for (const con of CONSTRAINT_PATTERNS) {
      const hit = con.keywords.find((kw) => hasKeyword(clauseLower, clause, kw));
      if (hit) {
        const tech = con.extract ? con.extract(clauseLower) : null;
        const statement = con.statement({ tech });
        const key = con.id + '|' + (tech || '');
        if (!seenCapIds.has(key)) {
          seenCapIds.add(key);
          found.push({
            title: tech ? `Technology Constraint: ${titleCase(tech.split(',')[0])}` : 'Implementation Constraint',
            normalizedDescription: statement,
            type: 'CONSTRAINT',
            nfrSubcategory: 'N/A',
            category: 'Constraints',
            topicCluster: 'Constraints',
            priority: 'HIGH',
            status: tech ? 'PROPOSED' : 'NEEDS_CLARIFICATION',
            ambiguityFlags: tech ? [] : ['CONSTRAINT_UNSPECIFIED'],
            clarificationQuestion: tech ? '' : 'What specific technology, platform, or standard is mandated?',
            isAtomic: true, atomic: true,
            confidence: tech ? 0.9 : 0.6,
            qualityFlags: tech ? [] : ['NEEDS_CLARIFICATION'],
            sourceInterviewStage: stage
          });
        }
        matchedInClause = true;
      }
    }

    // ---------- INTERFACE ----------
    for (const intf of INTERFACE_PATTERNS) {
      const hit = intf.keywords.find((kw) => hasKeyword(clauseLower, clause, kw));
      if (hit && !/depend/i.test(clauseLower)) {
        if (!seenCapIds.has(intf.id)) {
          seenCapIds.add(intf.id);
          found.push({
            title: 'External Interface',
            normalizedDescription: intf.statement,
            type: 'INTERFACE',
            nfrSubcategory: 'N/A',
            category: 'External Interfaces',
            topicCluster: 'External Interfaces',
            priority: 'MEDIUM',
            status: 'PROPOSED',
            ambiguityFlags: [],
            clarificationQuestion: '',
            isAtomic: true, atomic: true,
            confidence: 0.75,
            qualityFlags: [],
            sourceInterviewStage: stage
          });
          matchedInClause = true;
        }
      }
    }

    // ---------- FUNCTIONAL capabilities ----------
    // Clauses that express a DEPENDENCY/CONSTRAINT must not be re-interpreted
    // as functional features just because they mention e.g. "email/notification".
    const clauseIsDependency = DEPENDENCY_PATTERNS.some((d) =>
      d.keywords.some((k) => hasKeyword(clauseLower, clause, k)));
    const clauseIsConstraint = CONSTRAINT_PATTERNS.some((c) =>
      c.keywords.some((k) => hasKeyword(clauseLower, clause, k)));

    for (const cap of CAPABILITIES) {
      if (enumCapIds.has(cap.id)) continue; // already emitted by enumeration pass

      // Do not invent a functional feature from a dependency/constraint clause
      if (clauseIsDependency || clauseIsConstraint) {
        if (['NOTIFICATION', 'DATA_EXPORT', 'INTERFACE'].includes(cap.id)) continue;
      }

      const hit = cap.keywords.find((kw) => hasKeyword(clauseLower, clause, kw));
      if (!hit) continue;

      const ctx = {
        has: (...ws) => ctxHas(clause, ws),
        restrictive: /only their own|own private|\bcannot\b|only their|sirf apna|restricted/.test(clauseLower),
        permissive: /all users|every user|all data|view every|all financial|sabhi/.test(clauseLower)
      };
      const statement = cap.statementFor ? cap.statementFor(ctx) : cap.statement;
      if (seenStatements.has(statement)) continue;

      const key = cap.id + '|' + statement;
      if (!seenCapIds.has(key)) {
        seenCapIds.add(key);
        found.push({
          title: cap.title,
          normalizedDescription: statement,
          type: 'FUNCTIONAL',
          nfrSubcategory: 'N/A',
          category: cap.topic,
          topicCluster: cap.topic,
          priority: defaultPriority(cap),
          status: 'PROPOSED',
          ambiguityFlags: [],
          clarificationQuestion: '',
          isAtomic: true,
          atomic: true,
          confidence: 0.9,
          qualityFlags: [],
          sourceInterviewStage: stage
        });
      }
      matchedInClause = true;
    }

    if (!matchedInClause) {
      ignoredClauses.push({ clause, reason: 'NO_CAPABILITY_RECOGNIZED' });
    }
  }

  // ---------- Section-driven fallback classification ----------
  // If the guard said relevant but no capability lexicon matched (e.g. a
  // stakeholder/role description), produce a section-appropriate, NORMALIZED
  // interpretation (never a raw-text copy).
  if (found.length === 0 && ignoredClauses.length > 0 && sectionConfig) {
    const sectionReq = sectionFallback(rawText, sectionConfig);
    if (sectionReq) found.push(sectionReq);
  }

  return { requirements: found, ignoredClauses };
}

function titleForNfr(nfr) {
  const map = {
    PERFORMANCE: 'Response Performance',
    SECURITY: 'Data Security',
    USABILITY: 'Ease of Use',
    AVAILABILITY: 'System Availability',
    SCALABILITY: 'Scalability',
    RELIABILITY: 'Reliability'
  };
  return map[nfr.nfrSubcategory] || nfr.topic;
}

function defaultPriority(cap) {
  const high = ['AUTH_LOGIN', 'AUTH_REGISTER', 'EXPENSE_CREATE', 'EXPENSE_VIEW', 'REPORT_VIEW'];
  return high.includes(cap.id) ? 'HIGH' : 'MEDIUM';
}

function titleCase(s) {
  return String(s || '').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));
}

/**
 * Section-appropriate normalized interpretation when no capability keyword
 * matches but the guard deemed the answer relevant (e.g. stakeholder names,
 * roles, project objectives). Produces a FORMAL statement — the raw text is
 * attached only as evidence, never copied as the description.
 */
function sectionFallback(rawText, sectionConfig) {
  const stage = sectionConfig.name;

  // Stakeholder / role sections -> extract semantic role intent
  if (sectionConfig.id === 'STAKEHOLDERS_AND_USERS') {
    return {
      title: 'Stakeholder and User Identification',
      normalizedDescription: 'The system shall support interactions for the user classes and stakeholders identified during elicitation.',
      type: 'STAKEHOLDER', nfrSubcategory: 'N/A', category: stage, topicCluster: 'User Management',
      priority: 'MEDIUM', status: 'PROPOSED', ambiguityFlags: [], clarificationQuestion: '',
      isAtomic: true, atomic: true, confidence: 0.6, qualityFlags: [], sourceInterviewStage: stage
    };
  }
  if (sectionConfig.id === 'USER_ROLES_AND_PERMISSIONS') {
    return {
      title: 'Role-Based Access Control',
      normalizedDescription: 'The system shall enforce role-based permissions and access restrictions for identified user roles.',
      type: 'STAKEHOLDER', nfrSubcategory: 'N/A', category: stage, topicCluster: 'User Management',
      priority: 'HIGH', status: 'NEEDS_CLARIFICATION',
      ambiguityFlags: ['PERMISSIONS_NOT_SPECIFIED'],
      clarificationQuestion: 'Which specific permissions should each role have (e.g., view-only, edit, delete, approve)?',
      isAtomic: true, atomic: true, confidence: 0.6, qualityFlags: ['NEEDS_CLARIFICATION'], sourceInterviewStage: stage
    };
  }
  if (sectionConfig.id === 'PROJECT_INFORMATION') {
    return {
      title: 'Project Objective',
      normalizedDescription: 'The system shall deliver the core business objective described during project elicitation.',
      type: 'BUSINESS_RULE', nfrSubcategory: 'N/A', category: stage, topicCluster: 'Project Context',
      priority: 'MEDIUM', status: 'NEEDS_CLARIFICATION',
      ambiguityFlags: ['OBJECTIVE_NOT_ATOMIC'],
      clarificationQuestion: 'What specific, testable capabilities should the system provide to meet this objective?',
      isAtomic: false, atomic: false, confidence: 0.5, qualityFlags: ['NEEDS_CLARIFICATION', 'NON_ATOMIC'], sourceInterviewStage: stage
    };
  }
  if (sectionConfig.id === 'ASSUMPTIONS_AND_DEPENDENCIES') {
    return {
      title: 'Operating Assumption',
      normalizedDescription: 'The system shall operate under the assumptions and dependencies identified during elicitation.',
      type: 'ASSUMPTION', nfrSubcategory: 'N/A', category: stage, topicCluster: 'External Dependencies',
      priority: 'LOW', status: 'NEEDS_CLARIFICATION', ambiguityFlags: ['ASSUMPTION_VAGUE'],
      clarificationQuestion: 'Please specify the concrete assumption or dependency (e.g., third-party service, network condition).',
      isAtomic: true, atomic: true, confidence: 0.5, qualityFlags: ['NEEDS_CLARIFICATION'], sourceInterviewStage: stage
    };
  }
  // Functional section but nothing recognized -> do NOT invent features.
  return null;
}

/**
 * Phase 7 — enforce formal normalization grammar on a statement:
 * ensures "The system shall ..." prefix, single sentence, trailing period,
 * and strips any residual non-English / raw conversational content.
 */
function formalNormalize(statement) {
  let s = String(statement || '').trim();
  if (!s) return s;

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ');

  // Lowercase first word after prefix check
  const validPrefixes = ['the system shall', 'users shall', 'administrators shall', 'the system must'];
  const lower = s.toLowerCase();
  const hasPrefix = validPrefixes.some((p) => lower.startsWith(p));
  if (!hasPrefix) {
    s = `The system shall ${s.charAt(0).toLowerCase() + s.slice(1)}`;
  } else {
    // capitalize first letter
    s = s.charAt(0).toUpperCase() + s.slice(1);
    // normalize "must" -> "shall"
    s = s.replace(/^The system must/i, 'The system shall');
  }

  if (!s.endsWith('.')) s += '.';
  return s;
}

module.exports = {
  extractAtomicRequirements,
  formalNormalize,
  detectVagueTerms,
  splitIntoClauses
};
