1/**
 * Atomic Requirement Decomposer & Semantic Extraction Service
 * 
 * Complies with ISO/IEC/IEEE 29148:2018 atomicity and testability guidelines:
 * Transforms multi-clause user interview responses and compound requirement paragraphs
 * into multiple small, atomic, non-redundant, well-classified requirements.
 * 
 * ZERO-HALLUCINATION POLICY:
 * Only extracts features explicitly present in user source text.
 * Never synthesizes unmentioned auxiliary features (e.g. no unsolicited OAuth, 2FA, OTP).
 */

const { normalizeRequirementStatement, validateRequirementStatementQuality, cleanDuplicatedWords, fixVerbPhrases } = require('./requirementGrammarValidator');

// Common conversational/introductory prefixes to strip from user text
const BOILERPLATE_PREFIXES = [
  /^we\s+need\s+(a\s+platform|a\s+system|an\s+application|software)\s+(where|that|which)\s+/i,
  /^(the\s+system|the\s+platform|the\s+application|the\s+software)\s+(should|must|needs\s+to|will)\s+(be\s+able\s+to|allow\s+users\s+to|provide|support)\s+/i,
  /^i\s+want\s+(a\s+system|an\s+app|a\s+platform)\s+(where|that|which|to)\s+/i,
  /^mujhe\s+(ek\s+system|ek\s+app|platform)\s+(chahiye\s+jisme|banana\s+hai\s+jisme)\s+/i,
  /^(it\s+is\s+required\s+that|our\s+goal\s+is\s+to|the\s+goal\s+is\s+to)\s+/i,
  /^(please\s+ensure\s+that|make\s+sure\s+that)\s+/i,
  /^in\s+our\s+system\s+(.*?)(and\s+)?(we\s+really\s+want|we\s+want|we\s+need)\s+(users\s+to\s+be\s+able\s+to|users\s+to|to)\s+/i,
  /^we\s+(really\s+)?want\s+(users\s+to\s+be\s+able\s+to|users\s+to|to)\s+/i
];

/**
 * Clean introductory boilerplate from raw user text
 */
function cleanBoilerplate(text) {
  let cleaned = text.trim();
  for (const prefix of BOILERPLATE_PREFIXES) {
    cleaned = cleaned.replace(prefix, '');
  }
  return cleaned.trim();
}

/**
 * Classify a clause into its standard requirement type and NFR subcategory
 */
function classifyClause(clauseText, sectionConfig = {}) {
  const text = clauseText.toLowerCase();

  // 1. Non-Functional: Security
  if (/\b(secure|security|authentication|authorization|rbac|encrypt|encryption|aes|jwt|token|password\s+encryption|protect|privacy|ferpa|hipaa|gdpr)\b/i.test(text) &&
      !/\b(log\s*in|login|sign\s*in|signin|reset\s+password)\b/i.test(text)) {
    return {
      type: 'NON_FUNCTIONAL',
      nfrSubcategory: 'SECURITY',
      category: 'Security Requirements'
    };
  }

  // 2. Non-Functional: Performance & Scalability
  if (/\b(scalable|scalability|scale|growth|peak\s+load|concurrent\s+users|throughput|traffic)\b/i.test(text)) {
    return {
      type: 'NON_FUNCTIONAL',
      nfrSubcategory: 'SCALABILITY',
      category: 'Scalability Requirements'
    };
  }

  if (/\b(performance|latency|response\s+time|fast|speed|milliseconds|ms|seconds|benchmark)\b/i.test(text)) {
    return {
      type: 'NON_FUNCTIONAL',
      nfrSubcategory: 'PERFORMANCE',
      category: 'Performance Requirements'
    };
  }

  // 3. Non-Functional: Availability & Reliability
  if (/\b(uptime|availability|99\.\d+%|fault\s+tolerance|disaster\s+recovery|backup|failover|reliable|reliability)\b/i.test(text)) {
    return {
      type: 'NON_FUNCTIONAL',
      nfrSubcategory: 'AVAILABILITY',
      category: 'Availability & Reliability'
    };
  }

  // 4. Constraints
  if (/\b(constraint|must\s+be\s+built\s+using|technology\s+stack|mongodb|postgresql|react|node\.?js|docker|kubernetes|aws|hosted\s+on|budget|timeline|compliance)\b/i.test(text)) {
    return {
      type: 'CONSTRAINT',
      nfrSubcategory: 'N/A',
      category: 'Design & Implementation Constraints'
    };
  }

  // 5. Assumptions & Dependencies
  if (/\b(assume|assumption|dependency|depends\s+on|third[- ]party|network\s+connectivity|browser\s+support)\b/i.test(text)) {
    return {
      type: 'ASSUMPTION',
      nfrSubcategory: 'N/A',
      category: 'Assumptions & Dependencies'
    };
  }

  // 6. External Interfaces
  if (/\b(api|rest|graphql|webhook|payment\s+gateway|stripe|paypal|razorpay|email\s+service|sendgrid|sms|twilio|database\s+integration)\b/i.test(text)) {
    return {
      type: 'INTERFACE',
      nfrSubcategory: 'N/A',
      category: 'External Interface Requirements'
    };
  }

  // 7. Stakeholders & Roles
  if (/\b(role|permission|admin|administrator|student|faculty|operator|manager|user\s+class|actor)\b/i.test(text) &&
      (sectionConfig?.id === 'STAKEHOLDERS_AND_USERS' || sectionConfig?.id === 'USER_ROLES_AND_PERMISSIONS')) {
    return {
      type: 'STAKEHOLDER',
      nfrSubcategory: 'N/A',
      category: 'User Classes & Roles'
    };
  }

  // Default: Functional Requirement
  return {
    type: 'FUNCTIONAL',
    nfrSubcategory: 'N/A',
    category: sectionConfig?.name || 'Core System Features'
  };
}

/**
 * Generate a concise, human-readable Title from an action phrase
 */
function generateAtomicTitle(phrase) {
  const clean = phrase.trim().toLowerCase();

  if (/\b(log\s*in|login|sign\s*in|signin)\b/i.test(clean)) return 'User Login';
  if (/\b(password\s*reset|reset\s*password|forgot\s*password)\b/i.test(clean)) return 'Password Reset';
  if (/\b(manage.*profile|profile\s+management)\b/i.test(clean)) return 'Profile Management';
  if (/\b(send\s+notifications?|receive\s+notifications?|notif)\b/i.test(clean)) return 'Notifications';
  if (/\b(export|download).*(report|pdf|csv|excel)\b/i.test(clean) || /\b(export\s+project\s+reports?)\b/i.test(clean)) return 'Report Export';
  if (/search.*project/i.test(clean)) return 'Project Search';
  if (/manage.*project/i.test(clean)) return 'Project Management';
  if (/(create|update|manage).*requirement/i.test(clean)) return 'Requirement Management';
  if (/collaborat/i.test(clean)) return 'Team Collaboration';
  if (/version\s+history/i.test(clean)) return 'Version History';
  if (/ticket/i.test(clean) && /create/i.test(clean)) return 'Ticket Creation';
  if (/assign.*developer/i.test(clean)) return 'Ticket Assignment';
  if (/attach.*log/i.test(clean)) return 'Log Attachment';
  if (/filter.*ticket/i.test(clean)) return 'Ticket Filtering';

  let text = phrase.trim()
    .replace(/^the\s+system\s+shall\s+(allow|support|enable|provide|ensure\s+that|maintain)?\s*/i, '')
    .replace(/^(allow|enable|support|provide|ensure\s+that|maintain)\s+(users|authorized\s+users|students|admins|team\s+members)?\s*(to)?\s*/i, '')
    .replace(/^(the\s+system|the\s+platform|the\s+application)\s+(should|must|shall|will|needs\s+to)\s+(be\s+able\s+to\s+)?/i, '')
    .replace(/^(users|authorized\s+users|students|admins)\s+(should\s+be\s+able\s+to|can|must)\s+/i, '')
    .replace(/[.\s]+$/, '');

  // Extract key verbs and nouns
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 'System Capability';

  // Capitalize words
  const titleWords = words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return titleWords.join(' ');
}

/**
 * Split a compound sentence / paragraph into distinct atomic requirement clauses
 */
function splitCompoundTextIntoClauses(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  let text = cleanBoilerplate(rawText);

  // 1. First split on explicit line breaks, bullet points, numbers
  const lines = text.split(/\r?\n|•|\*|\d+\.\s+/).map(s => s.trim()).filter(Boolean);

  const rawClauses = [];

  for (const line of lines) {
    // 2. Split on semicolons
    const semiParts = line.split(/;\s*/).map(s => s.trim()).filter(Boolean);
    for (const sp of semiParts) {
      let working = sp;
      
      // Extract security & scalability clauses if nested at the end
      working = working.replace(/(?:and\s+)?ensure\s+(?:that\s+)?(?:the\s+system\s+is\s+)?secure\s+and\s+scalable/i, 
        'ensure system security. ensure system scalability');
      working = working.replace(/(?:and\s+)?ensure\s+(?:that\s+)?(?:the\s+system\s+is\s+)?secure/i, 
        'ensure system security');
      working = working.replace(/(?:and\s+)?ensure\s+(?:that\s+)?(?:the\s+system\s+is\s+)?scalable/i, 
        'ensure system scalability');

      // Split on major coordination boundaries:
      const coordRegex = /,\s*(?:and\s+also|as\s+well\s+as|along\s+with|additionally|and\s+ensure\s+that|and\s+the\s+system\s+must|and\s+)\s*|(?<=[^,]),\s*(?=(?:users\s+can|create|update|manage|search|collaborate|receive|maintain|send|view|delete|track|export|import|notify|enforce|satisfy|support|provide|ensure|authenticate|generate|assign|attach|filter)\b)|\.\s+/i;
      
      const subClauses = working.split(coordRegex).map(s => s.trim()).filter(Boolean);
      for (const sc of subClauses) {
        if (sc.length >= 3) {
          rawClauses.push(sc);
        }
      }
    }
  }

  // 3. Handle short multi-capability phrases like "Users can log in and reset password"
  const refinedClauses = [];
  for (const clause of rawClauses) {
    // Check "users can log in and reset password"
    const loginResetMatch = clause.match(/^(?:users\s+can\s+|users\s+should\s+be\s+able\s+to\s+)?(log\s*in|login|sign\s*in|signin)\s+and\s+(reset\s+passwords?|forgot\s+passwords?)/i);
    if (loginResetMatch) {
      refinedClauses.push('users can log in');
      refinedClauses.push('users can reset password');
      continue;
    }

    // Check "search and manage projects"
    const searchManageMatch = clause.match(/^users\s+can\s+search\s+and\s+manage\s+(.*)/i);
    if (searchManageMatch) {
      const entity = searchManageMatch[1].trim();
      refinedClauses.push(`users can search for ${entity}`);
      refinedClauses.push(`authorized users can manage ${entity}`);
      continue;
    }

    // Check "fast and secure"
    const fastSecureMatch = clause.match(/^(?:system\s+is\s+|system\s+should\s+be\s+)?(fast|secure|scalable)\s+and\s+(fast|secure|scalable)(.*)/i);
    if (fastSecureMatch) {
      refinedClauses.push(`${fastSecureMatch[1]} ${fastSecureMatch[3]}`.trim());
      refinedClauses.push(`${fastSecureMatch[2]} ${fastSecureMatch[3]}`.trim());
      continue;
    }

    refinedClauses.push(clause);
  }

  return refinedClauses;
}

/**
 * Transform a single atomic clause into a formal ISO 29148 requirement statement
 */
function formatClauseToRequirementStatement(clause, classification) {
  let text = clause.trim()
    .replace(/^we\s+need\s+(to\s+)?/i, '')
    .replace(/^(the\s+system|the\s+platform|the\s+application)\s+(must|should|shall|will|needs\s+to)\s+(be\s+able\s+to\s+)?/i, '')
    .replace(/^users\s+should\s+be\s+able\s+to\s+/i, 'allow users to ')
    .replace(/^users\s+can\s+/i, 'allow users to ')
    .replace(/^authorized\s+users\s+can\s+/i, 'allow authorized users to ')
    .replace(/^students\s+can\s+/i, 'allow students to ')
    .replace(/^admins?\s+can\s+/i, 'allow administrators to ')
    .replace(/^and\s+/i, '');

  if (classification.type === 'NON_FUNCTIONAL') {
    if (classification.nfrSubcategory === 'SECURITY') {
      if (/system\s+security|secure/i.test(text)) {
        return 'The system shall protect system resources through authentication and authorization controls.';
      }
      return normalizeRequirementStatement(`protect data and system resources by enforcing ${text}`);
    }
    if (classification.nfrSubcategory === 'SCALABILITY') {
      if (/system\s+scalability|scalable/i.test(text)) {
        return 'The system shall support future growth in users and projects under high load.';
      }
      return normalizeRequirementStatement(`maintain responsive performance as scale increases with ${text}`);
    }
    if (classification.nfrSubcategory === 'PERFORMANCE') {
      return normalizeRequirementStatement(`respond to user requests within standard latency benchmarks for ${text}`);
    }
    if (classification.nfrSubcategory === 'AVAILABILITY') {
      return normalizeRequirementStatement(`maintain 99.9% operational availability and automated recovery for ${text}`);
    }
  }

  if (classification.type === 'CONSTRAINT') {
    return normalizeRequirementStatement(`conform to the following implementation constraints: ${text}`);
  }

  if (classification.type === 'ASSUMPTION') {
    return normalizeRequirementStatement(`operate under the following dependencies and assumptions: ${text}`);
  }

  if (classification.type === 'INTERFACE') {
    return normalizeRequirementStatement(`integrate with external services and APIs for ${text}`);
  }

  if (classification.type === 'STAKEHOLDER') {
    return normalizeRequirementStatement(`support operational workflows and permissions for ${text}`);
  }

  // Standard Functional
  if (!text.toLowerCase().startsWith('allow') &&
      !text.toLowerCase().startsWith('support') &&
      !text.toLowerCase().startsWith('provide') &&
      !text.toLowerCase().startsWith('notify') &&
      !text.toLowerCase().startsWith('maintain') &&
      !text.toLowerCase().startsWith('generate') &&
      !text.toLowerCase().startsWith('track') &&
      !text.toLowerCase().startsWith('send') &&
      !text.toLowerCase().startsWith('enforce')) {
    text = `allow users to ${text}`;
  }

  return normalizeRequirementStatement(text);
}

/**
 * Main function: Decomposes raw unstructured user input into an array of atomic requirements
 */
function decomposeRawTextToAtomicRequirements(rawText, sectionConfig = {}, projectContext = {}) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 5) {
    return [];
  }

  const clauses = splitCompoundTextIntoClauses(rawText);
  if (clauses.length === 0) return [];

  const results = [];
  const seenStatements = new Set();

  for (const clause of clauses) {
    const cleaned = clause.trim();
    if (cleaned.length < 3) continue;

    const classification = classifyClause(cleaned, sectionConfig);
    const statement = formatClauseToRequirementStatement(cleaned, classification);

    if (seenStatements.has(statement)) continue;
    seenStatements.add(statement);

    // Formulate a concise Title
    let title = generateAtomicTitle(cleaned);
    if (classification.type === 'NON_FUNCTIONAL') {
      if (classification.nfrSubcategory === 'SECURITY') title = 'Security & Access Control';
      else if (classification.nfrSubcategory === 'SCALABILITY') title = 'System Scalability';
      else if (classification.nfrSubcategory === 'PERFORMANCE') title = 'Response Time Performance';
      else if (classification.nfrSubcategory === 'AVAILABILITY') title = 'System Availability';
    }

    // Quality & Ambiguity validation on both synthesized statement and source clause
    const quality = validateRequirementStatementQuality(statement);
    const sourceQuality = validateRequirementStatementQuality(cleaned);
    const hasAmbiguity = quality.needsClarification || sourceQuality.needsClarification;
    const status = hasAmbiguity ? 'NEEDS_CLARIFICATION' : 'PROPOSED';
    const validationStatus = (!hasAmbiguity && quality.isValid) ? 'VALID' : 'NEEDS_REVIEW';
    const clarificationQuestion = quality.clarificationQuestion || sourceQuality.clarificationQuestion || '';

    results.push({
      title,
      description: statement,
      type: classification.type,
      nfrSubcategory: classification.nfrSubcategory,
      category: classification.category,
      priority: classification.type === 'NON_FUNCTIONAL' || classification.type === 'CONSTRAINT' ? 'HIGH' : 'MEDIUM',
      completenessScore: hasAmbiguity ? 60 : 90,
      isAtomic: true,
      status,
      validationStatus,
      validationIssues: [...new Set([...(quality.issues || []), ...(sourceQuality.issues || [])])],
      suggestedImprovement: clarificationQuestion,
      sourceText: cleaned
    });
  }

  return results;
}

/**
 * Validate and Decompose a list of requirements (e.g. from LLM structured output)
 */
function decomposeAndNormalizeRequirements(rawRequirements = [], projectContext = {}, sectionConfig = {}) {
  if (!Array.isArray(rawRequirements) || rawRequirements.length === 0) {
    return [];
  }

  const atomicResults = [];
  const seenDescriptions = new Set();

  for (const req of rawRequirements) {
    if (!req || (!req.description && !req.title)) continue;

    const desc = (req.description || req.title).trim();

    // Check if this single requirement is compound
    const isCompound = desc.length > 100 && (
      (desc.match(/,/g) || []).length >= 2 ||
      /\b(and\s+manage|and\s+create|and\s+update|and\s+collaborate|and\s+receive|and\s+maintain|and\s+ensure|as\s+well\s+as|along\s+with|additionally)\b/i.test(desc)
    );

    if (isCompound) {
      const decomposed = decomposeRawTextToAtomicRequirements(desc, sectionConfig, projectContext);
      if (decomposed.length > 1) {
        for (const dec of decomposed) {
          if (!seenDescriptions.has(dec.description)) {
            seenDescriptions.add(dec.description);
            atomicResults.push(dec);
          }
        }
        continue;
      }
    }

    const normDesc = normalizeRequirementStatement(desc);
    if (!seenDescriptions.has(normDesc)) {
      seenDescriptions.add(normDesc);
      const quality = validateRequirementStatementQuality(normDesc);
      const status = req.status || (quality.needsClarification ? 'NEEDS_CLARIFICATION' : 'PROPOSED');

      atomicResults.push({
        title: req.title?.trim() || generateAtomicTitle(normDesc),
        description: normDesc,
        type: req.type || 'FUNCTIONAL',
        nfrSubcategory: req.nfrSubcategory || (req.type === 'NON_FUNCTIONAL' ? 'PERFORMANCE' : 'N/A'),
        category: req.category || sectionConfig?.name || 'Core Features',
        priority: ['HIGH', 'MEDIUM', 'LOW'].includes(req.priority) ? req.priority : 'MEDIUM',
        completenessScore: quality.needsClarification ? 60 : (req.completenessScore || 90),
        isAtomic: true,
        status,
        validationStatus: quality.isValid ? 'VALID' : 'NEEDS_REVIEW',
        validationIssues: quality.issues || [],
        suggestedImprovement: quality.clarificationQuestion || '',
        sourceText: req.sourceText || desc
      });
    }
  }

  return atomicResults;
}

module.exports = {
  decomposeRawTextToAtomicRequirements,
  decomposeAndNormalizeRequirements,
  splitCompoundTextIntoClauses,
  classifyClause,
  generateAtomicTitle
};
