/**
 * Phases 4–10 — Semantic Understanding, Information Classification,
 * Stage-Aware Extraction, Atomic Decomposition, and Formal IEEE 830 / ISO 29148 Normalization.
 *
 * Requirements Eligibility Gate:
 *   Raw interview answers are UNSTRUCTURED SOURCE EVIDENCE.
 *   Entities (Stakeholders, Roles, Project Background, Constraints, Dependencies)
 *   are extracted into structured metadata.
 *   Requirements are extracted ONLY when explicit capability, quality, or interface
 *   evidence exists in the appropriate interview stage.
 */

const {
  CAPABILITIES, NFR_PATTERNS, CONSTRAINT_PATTERNS,
  DEPENDENCY_PATTERNS, INTERFACE_PATTERNS, VAGUE_WORDS
} = require('./lexicon');

// ---------------------------------------------------------------------------
// 1. Information Type Classification
// ---------------------------------------------------------------------------
const INFORMATION_TYPES = {
  PROJECT_INFORMATION: 'PROJECT_INFORMATION',
  STAKEHOLDER_INFORMATION: 'STAKEHOLDER_INFORMATION',
  USER_INFORMATION: 'USER_INFORMATION',
  ROLE_INFORMATION: 'ROLE_INFORMATION',
  PERMISSION_INFORMATION: 'PERMISSION_INFORMATION',
  FUNCTIONAL_REQUIREMENT: 'FUNCTIONAL_REQUIREMENT',
  NON_FUNCTIONAL_REQUIREMENT: 'NON_FUNCTIONAL_REQUIREMENT',
  CONSTRAINT: 'CONSTRAINT',
  ASSUMPTION: 'ASSUMPTION',
  DEPENDENCY: 'DEPENDENCY',
  INTERFACE_INFORMATION: 'INTERFACE_INFORMATION',
  REQUIREMENT_EVIDENCE: 'REQUIREMENT_EVIDENCE',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  UNCLEAR: 'UNCLEAR'
};

function classifyInformationType(text, stageConfig = {}) {
  const s = String(text || '').trim();
  const lower = s.toLowerCase();
  const stageId = stageConfig?.id || '';

  // Out of scope check
  if (['football', 'cricket', 'weather', 'movie', 'cinema', 'dinner', 'recipe'].some(k => lower.includes(k))) {
    return INFORMATION_TYPES.OUT_OF_SCOPE;
  }

  // Explicit requirement statement markers (modal verbs + capability/quality)
  const isExplicitReq = /(?:shall|must|should|will)\s+(?:allow|provide|enable|let|maintain|support|authenticate|process|calculate|generate|send|store|display|handle)/i.test(s) ||
    /(?:can|able to)\s+(?:log|sign|add|create|view|edit|delete|update|manage|track|export|download|upload|submit|receive|generate)/i.test(s) ||
    /(?:kar sake|kar sakte|kar sakto|pahije|hona chahiye|honi chahiye|karta aala pahije)/i.test(s);

  if (isExplicitReq && (stageId === 'FUNCTIONAL_REQUIREMENTS' || /system (?:shall|must|should)/i.test(s))) {
    return INFORMATION_TYPES.FUNCTIONAL_REQUIREMENT;
  }

  if (isExplicitReq && stageId === 'NON_FUNCTIONAL_REQUIREMENTS') {
    return INFORMATION_TYPES.NON_FUNCTIONAL_REQUIREMENT;
  }

  // Constraint
  if (stageId === 'CONSTRAINTS' || /(?:must use|written in|built with|deployed on|database must be|compliance with|postgresql|mongodb|mysql|aws|docker|kubernetes)/i.test(lower)) {
    return INFORMATION_TYPES.CONSTRAINT;
  }

  // Dependency / Assumption
  if (stageId === 'ASSUMPTIONS_AND_DEPENDENCIES' || /(?:depends on|relies on|third-party|external service|assume that|assuming|depend karta hai|avalambun ahe)/i.test(lower)) {
    return /assume/i.test(lower) ? INFORMATION_TYPES.ASSUMPTION : INFORMATION_TYPES.DEPENDENCY;
  }

  // External Interface
  if (stageId === 'EXTERNAL_INTERFACES' || /(?:integrate with|api|payment gateway|sms gateway|webhook|rest api|kafka|stripe|paypal)/i.test(lower)) {
    return INFORMATION_TYPES.INTERFACE_INFORMATION;
  }

  // Roles & Permissions
  if (stageId === 'USER_ROLES_AND_PERMISSIONS' || /(?:role|permission|read-only|admin access|access rights|privilege|adhikar)/i.test(lower)) {
    return /(?:permission|access|read-only|read only|rights|restricted)/i.test(lower)
      ? INFORMATION_TYPES.PERMISSION_INFORMATION
      : INFORMATION_TYPES.ROLE_INFORMATION;
  }

  // Stakeholders & Users
  if (stageId === 'STAKEHOLDERS_AND_USERS' || /(?:users|stakeholders|citizens|officers|beneficiaries|volunteers|patients|doctors|clients|customers|managers|staff|employees|vyapari|sahayak|karyakarta)/i.test(lower)) {
    return /(?:stakeholder|beneficiar|sponsor|partner|government)/i.test(lower)
      ? INFORMATION_TYPES.STAKEHOLDER_INFORMATION
      : INFORMATION_TYPES.USER_INFORMATION;
  }

  // Project Info / Problem context
  if (stageId === 'PROJECT_INFORMATION' || /(?:problem|objective|goal|purpose|background|delay|issue|challenge|samadhaan|uddesh)/i.test(lower)) {
    return INFORMATION_TYPES.PROJECT_INFORMATION;
  }

  if (s.length < 5) return INFORMATION_TYPES.UNCLEAR;
  return INFORMATION_TYPES.PROJECT_INFORMATION;
}

// ---------------------------------------------------------------------------
// 2. Strict Requirement Eligibility Gate
// ---------------------------------------------------------------------------
function isExplicitRequirementEvidence(clause, stageConfig = {}) {
  const s = String(clause || '').trim();
  const lower = s.toLowerCase();
  const stageId = stageConfig?.id || '';

  // Never treat pure descriptive stakeholder/user phrases as requirements
  if (/^(?:the\s+)?(?:primary\s+)?(?:users|stakeholders|target audience|actors|beneficiaries)\s+(?:are|include|consist of|will be)\b/i.test(s) ||
      /^(?:main\s+)?(?:users|stakeholders)\s+(?:citizens|officers|workers|volunteers|admins|doctors|patients)\s+(?:honge|ahet|hote)\b/i.test(s)) {
    return false;
  }

  // Problem statement / background context description is NOT requirement evidence
  if (stageId === 'PROJECT_INFORMATION') {
    const hasExplicitSystemAction = /(?:the system shall|the system must|the system will allow|system ko .* karna chahiye|system ne .* kele pahije)/i.test(s);
    return hasExplicitSystemAction;
  }

  if (stageId === 'STAKEHOLDERS_AND_USERS') {
    const hasExplicitSystemAction = /(?:the system shall|the system must|the system will allow|users should be able to|users can log in|users can add)/i.test(s);
    return hasExplicitSystemAction;
  }

  // Modal verb + capability action
  const hasModalCapability = /(?:shall|must|should|will|can|able to)\s+(?:allow|provide|enable|let|maintain|support|authenticate|process|calculate|generate|send|store|display|handle|track|manage|record|create|add|update|delete|view|export)/i.test(s);
  const hasMultilingualAction = /(?:kar sake|kar sakte|kar sakto|baghta yete|karta yete|pahije|hona chahiye|honi chahiye|karta aala pahije)/i.test(s) &&
    /(?:login|register|add|create|view|manage|report|record|update|delete|track|export|send|receive|shuru|jod|kharch|expense|alert)/i.test(lower);

  // Explicit numerical metric for NFR
  const hasMeasurableMetric = /(\d+(?:\.\d+)?)\s*(?:%|ms|millisecond|seconds?|sec|s|hours?|min|minutes?|req\/sec|users?)\b/i.test(s);
  const hasExplicitTechConstraint = /(?:must use|developed using|built with|deployed on|database must be|postgresql|mongodb|mysql|redis|aws|docker)/i.test(lower);
  const hasExplicitDependency = /(?:depends on|dependent upon|requires external|third-party integration with|gps availability|sms gateway)/i.test(lower);

  if (stageId === 'NON_FUNCTIONAL_REQUIREMENTS') {
    return hasMeasurableMetric || /(?:performance|security|availability|uptime|latency|throughput|encryption|backup|recovery)/i.test(lower) || hasMultilingualAction;
  }

  if (stageId === 'CONSTRAINTS') {
    return hasExplicitTechConstraint || /(?:constraint|compliance|gdpr|hipaa|iso|budget limit|deadline)/i.test(lower);
  }

  if (stageId === 'ASSUMPTIONS_AND_DEPENDENCIES') {
    return hasExplicitDependency || /(?:assumption|assume|dependency|relies on)/i.test(lower);
  }

  if (stageId === 'EXTERNAL_INTERFACES') {
    return /(?:api|gateway|webhook|service|protocol|interface|rest|graphql)/i.test(lower);
  }

  return hasModalCapability || hasMultilingualAction;
}

// ---------------------------------------------------------------------------
// 3. Stage-Specific Structured Entity Extractors
// ---------------------------------------------------------------------------
function extractStakeholdersAndUsers(text) {
  const s = String(text || '');

  const userKeywords = [
    { key: 'citizens', pattern: /(?:citizens?|affected citizens?|public|nagrik|नागरिक|loka|lok)/i },
    { key: 'government officials', pattern: /(?:government officials?|disaster management officers?|shasan|adhikari|अधिकारी|sarkari)/i },
    { key: 'NGO workers', pattern: /(?:ngo workers?|ngo staff|ngos?|non-profit|samajik sanstha|सामाजिक संस्था)/i },
    { key: 'volunteers', pattern: /(?:volunteers?|swayamsevak|sevak|स्वयंसेवक)/i },
    { key: 'emergency responders', pattern: /(?:emergency responders?|first responders?|firefighters?|paramedics?|police|rescue team|आपत्ती व्यवस्थापन)/i },
    { key: 'administrators', pattern: /(?:administrators?|admins?|system admins?|prashasak|प्रशासक|ॲडमिन)/i },
    { key: 'doctors', pattern: /(?:doctors?|physicians?|clinicians?|vaidya|doctor|डॉक्टर|वैद्य)/i },
    { key: 'patients', pattern: /(?:patients?|rogi|rujna|मरीज|रोगी|रुग्ण)/i },
    { key: 'managers', pattern: /(?:managers?|supervisors?|prabandhak|व्यवस्थापक)/i },
    { key: 'field workers', pattern: /(?:field workers?|ground staff|karyakarta|कार्यकर्ते)/i },
    { key: 'customers', pattern: /(?:customers?|clients?|grahak|ग्राहक)/i },
    { key: 'students', pattern: /(?:students?|learners?|vidyarthi|विद्यार्थी)/i },
    { key: 'farmers', pattern: /(?:farmers?|kisan|shetkari|शेतकरी|किसान)/i },
    { key: 'owners', pattern: /(?:owners?|proprietors?|malik|मालक|मालिक)/i },
    { key: 'maintenance staff', pattern: /(?:maintenance staff|technicians?|caretakers?|operators?|staff|कर्मचारी|स्टाफ)/i },
    { key: 'drivers', pattern: /(?:drivers?|truck drivers?|chalak|चालक)/i },
    { key: 'inspectors', pattern: /(?:inspectors?|auditors?|officers?|supervisor|nirikshak|निरीक्षक)/i },
    { key: 'workers', pattern: /(?:workers?|waste collectors?|sanitation workers?|labour|कामगार)/i },
    { key: 'enthusiasts', pattern: /(?:enthusiasts?|hobbyists?|specialists?)/i }
  ];

  const primaryUsers = [];
  const stakeholders = [];
  const administrators = [];
  const beneficiaries = [];
  const partnerOrganizations = [];

  for (const item of userKeywords) {
    if (item.pattern.test(s)) {
      if (item.key === 'administrators') {
        administrators.push(item.key);
      } else if (['citizens', 'patients', 'customers', 'students', 'farmers', 'owners', 'enthusiasts'].includes(item.key)) {
        primaryUsers.push(item.key);
        beneficiaries.push(item.key);
      } else if (['NGO workers', 'government officials'].includes(item.key)) {
        stakeholders.push(item.key);
        partnerOrganizations.push(item.key);
      } else {
        primaryUsers.push(item.key);
        stakeholders.push(item.key);
      }
    }
  }

  // Generic fallback if text has words like "users", "owners", "members"
  if (primaryUsers.length === 0 && s.length >= 10) {
    const rawTokens = s.match(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g) || [];
    const candidates = rawTokens.filter(t => !['System', 'Project', 'Smart', 'The', 'And', 'What', 'Will'].includes(t));
    if (candidates.length > 0) {
      primaryUsers.push(...candidates.slice(0, 3).map(c => c.toLowerCase()));
    }
  }

  return {
    primaryUsers: [...new Set(primaryUsers)],
    secondaryUsers: [...new Set(stakeholders.filter(x => !primaryUsers.includes(x)))],
    stakeholders: [...new Set(stakeholders)],
    beneficiaries: [...new Set(beneficiaries)],
    administrators: [...new Set(administrators)],
    partnerOrganizations: [...new Set(partnerOrganizations)]
  };
}

// Known role nouns across all domains + multilingual terms.
const ROLE_NOUNS = /(?:admin|admins|administrator|administrators|manager|managers|field worker|field workers|ground staff|volunteer|volunteers|citizen|citizens|officer|officers|supervisor|supervisors|user|users|doctor|doctors|patient|patients|nurse|nurses|agent|agents|operator|operators|farmer|farmers|waste collector|waste collectors|collector|collectors|responders?|coordinator|coordinators|clerk|clerks|owner|owners|maintenance staff|technician|technicians|staff|caretaker|caretakers|viewer|viewers|moderator|moderators|driver|drivers|customer|customers|client|clients|teacher|teachers|student|students|auditor|auditors|analyst|analysts|मालक|कर्मचारी|स्टाफ|व्यवस्थापक|ॲडमिन|प्रशासक|ग्राहक|शेतकरी|वापरकर्ता|चालक|विद्यार्थी)/gi;

function extractRolesAndPermissions(text) {
  const s = String(text || '');
  const roles = [];
  const permissions = [];

  // 1. Explicit known role nouns.
  const roleMatches = s.match(ROLE_NOUNS) || [];
  roleMatches.forEach(r => roles.push(r.toLowerCase().replace(/s$/, (m) => m === 's' ? 's' : m)));

  // 2. Generic enumeration: e.g. "System has 3 roles: Owner, Maintenance Staff, and Admin"
  const enumMatches = s.match(/(?:roles?|users?|bhumika|भूमिका)\s*(?:are|will be|honge|honge:|astil|astil:|:)\s*([^.]+)/i);
  if (enumMatches && enumMatches[1]) {
    const parts = enumMatches[1].split(/,|\band\b|\baur\b|\bani\b|\bआणि\b|\bतथा\b/i).map(p => p.trim()).filter(p => p.length > 2 && p.length < 35);
    for (const p of parts) {
      const clean = p.replace(/^(?:the|a|an|only|all)\s+/i, '').trim();
      if (clean && !clean.includes('manage') && !clean.includes('system')) {
        roles.push(clean.toLowerCase());
      }
    }
  }

  // 3. Generic actor pattern: SVO & SOV (English, Hindi, Marathi, Hinglish)
  //    SVO: "<Role> can/should/must <action>"
  //    SOV: "<Role> <action> kar sakega / karega / karel / kar shakto / करू शकेल"
  const subClauses = s.split(/[;\n.!?]+/).map(c => c.trim()).filter(Boolean);
  for (const clause of subClauses) {
    // Check SVO (English / Hinglish)
    const svoMatch = clause.match(/^([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s-]{1,30}?)\s+(?:can|could|should|must|shall|are able to|is able to)\s+(.+)$/i);
    if (svoMatch) {
      const role = svoMatch[1].toLowerCase().replace(/^(the|a|an|all|only|these|those)\s+/i, '').trim();
      const action = svoMatch[2].trim();
      if (role && !['there', 'it', 'this', 'that', 'system', 'here', 'we', 'they'].includes(role)) {
        roles.push(role);
        if (action && !/^be\s+/i.test(action)) {
          permissions.push(action.replace(/[.,;!]+$/, '').trim());
        }
      }
      continue;
    }

    // Check SOV (Hindi / Marathi / Hinglish)
    const sovMatch = clause.match(/^([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s-]{1,30}?)\s+(.+?)\s+(?:kar sakega|kar sakegi|kar sakta hai|kar sakti hai|karega|karegi|kare|kar shakto|kar shakte|karel|करेल|शकेल|करू शकेल|पाहिजे|करेगा|करेगी|कर सकते हैं)$/i);
    if (sovMatch) {
      const role = sovMatch[1].toLowerCase().replace(/^(the|a|an|all|only|these|those)\s+/i, '').trim();
      const action = sovMatch[2].trim();
      if (role && !['there', 'it', 'this', 'that', 'system', 'here', 'we', 'they'].includes(role)) {
        roles.push(role);
        if (action && !/^(honge|astil|hota|hoti)\b/i.test(action)) {
          permissions.push(action.replace(/[.,;!]+$/, '').trim());
        }
      }
      continue;
    }
  }

  const canonicalRoles = [...new Set(roles.map(normalizeRole))].filter(Boolean);
  const canonicalPerms = [...new Set(permissions.map((p) => p.toLowerCase().replace(/\s+/g, ' ').trim()))].filter(p => p.length > 2);

  return {
    userRoles: canonicalRoles,
    permissions: canonicalPerms,
    roleHierarchy: canonicalRoles.length > 1 ? [`${canonicalRoles[0]} > ${canonicalRoles.slice(1).join(', ')}`] : [],
    accessRules: canonicalPerms
  };
}

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (!r) return '';
  if (/admin|प्रशासक|ॲडमिन/.test(r)) return 'administrator';
  if (/owner|malik|मालक|मालिक/.test(r)) return 'owner';
  if (/maintenance|caretaker|technician|staff|कर्मचारी|स्टाफ/.test(r)) return 'maintenance staff';
  if (/field worker|ground staff/.test(r)) return 'field worker';
  if (/officer|अधिकारी/.test(r)) return 'officer';
  if (/manager|व्यवस्थापक|प्रबंधक/.test(r)) return 'manager';
  if (/volunteer|स्वयंसेवक/.test(r)) return 'volunteer';
  if (/citizen|नागरिक/.test(r)) return 'citizen';
  if (/doctor|डॉक्टर/.test(r)) return 'doctor';
  if (/patient|मरीज|रोगी/.test(r)) return 'patient';
  if (/farmer|शेतकरी|किसान/.test(r)) return 'farmer';
  if (/customer|grahak|ग्राहक/.test(r)) return 'customer';
  if (/student|विद्यार्थी/.test(r)) return 'student';
  if (/teacher|शिक्षक/.test(r)) return 'teacher';
  return r.replace(/s$/, '');
}

function extractProjectInfo(text) {
  const s = String(text || '').trim();
  return {
    problemStatement: s,
    projectContext: s,
    primaryObjective: s.slice(0, 150),
    projectScope: s,
    businessGoal: s
  };
}

function extractConstraints(text) {
  const s = String(text || '');
  const tech = [];
  if (/postgresql/i.test(s)) tech.push('PostgreSQL');
  if (/mongodb/i.test(s)) tech.push('MongoDB');
  if (/mysql/i.test(s)) tech.push('MySQL');
  if (/aws|amazon web services/i.test(s)) tech.push('AWS Cloud');
  if (/docker/i.test(s)) tech.push('Docker Containers');
  if (/node|express/i.test(s)) tech.push('Node.js / Express');
  if (/react|next/i.test(s)) tech.push('React / Next.js');
  if (/esp32|arduino|raspberry pi|iot/i.test(s)) tech.push('Embedded IoT Hardware (ESP32/Arduino)');
  if (/budget|timeline|deadline|time limit/i.test(s)) tech.push('Timeline & Budget Constraints');
  return {
    technologyConstraints: tech,
    deploymentConstraints: tech.filter(t => ['AWS Cloud', 'Docker Containers'].includes(t)),
    budgetConstraints: /budget/i.test(s) ? ['Specified budget limit'] : [],
    regulatoryConstraints: /gdpr|hipaa|compliance|iso/i.test(s) ? ['Regulatory Compliance'] : [],
    timelineConstraints: /deadline|timeline|months?|weeks?/i.test(s) ? ['Specified delivery timeline'] : []
  };
}

function extractAssumptionsDependencies(text) {
  const s = String(text || '');
  const deps = [];
  if (/gps/i.test(s)) deps.push('GPS Location Services');
  if (/email/i.test(s)) deps.push('Email Notification Provider');
  if (/sms/i.test(s)) deps.push('SMS Gateway Provider');
  if (/whatsapp/i.test(s)) deps.push('WhatsApp Messaging API');
  if (/google maps|maps api|map service/i.test(s)) deps.push('Maps API');
  if (/payment|stripe|paypal|razorpay/i.test(s)) deps.push('Payment Gateway');
  if (/wi-?fi|internet|cloud|network/i.test(s)) deps.push('Stable Internet & Cloud Connectivity');
  if (/sensor|hardware|probe/i.test(s)) deps.push('Hardware Sensor Reliability');
  return {
    assumptions: /assume|assumption|assuming|man liya|गृहीत/i.test(s) ? [s.trim()] : (deps.length ? ['System operates under standard network and hardware availability'] : []),
    dependencies: deps,
    thirdPartyServices: deps,
    environmentalDependencies: []
  };
}

function extractInterfaces(text) {
  const s = String(text || '');
  const interfaces = [];
  const known = [
    [/payment gateway|stripe|paypal|razorpay/i, 'Payment Gateway'],
    [/google maps|maps api|map service/i, 'Maps API'],
    [/\bsms\b|sms gateway/i, 'SMS Gateway'],
    [/whatsapp/i, 'WhatsApp Messaging API'],
    [/\bemail\b|smtp/i, 'Email Service API'],
    [/rest api|webhook|third-party api|external api/i, 'External REST API'],
    [/kafka|message queue|rabbitmq/i, 'Message Queue'],
    [/mqtt|iot|sensor|temperature sensor|ph sensor/i, 'MQTT IoT Sensor Interface']
  ];
  for (const [re, label] of known) if (re.test(s)) interfaces.push(label);
  return { interfaces: [...new Set(interfaces)] };
}

// ---------------------------------------------------------------------------
// 4. Clause Splitting & Vague Terms Detection
// ---------------------------------------------------------------------------
function splitIntoClauses(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];

  // Safe decimal splitting: split on dots that are NOT surrounded by digits
  const parts = raw
    .split(/(?:(?<!\d)\.(?!\d)|;|\band\b|\baur\b|\btatha\b|\bतथा\b|\bऔर\b|\bआणि\b|\bअनि\b|\bव\b|\bani\b|,(?=\s*[A-Za-zऀ-ॿ]))/i)
    .map((s) => s.trim())
    .filter((s) => s && s.length > 1);

  return parts.length ? parts : [raw];
}

function detectVagueTerms(text) {
  const lower = String(text || '').toLowerCase();
  return VAGUE_WORDS.filter((w) => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (/[ऀ-ॿ]/.test(w)) return lower.includes(w);
    return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(lower);
  });
}

function hasKeyword(textLower, rawText, kw) {
  if (/[ऀ-ॿ]/.test(kw)) return rawText.includes(kw);
  const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}(?![a-z])`).test(textLower);
}

function ctxHas(text, words) {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}

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

// ---------------------------------------------------------------------------
// 4b. Domain-general functional capability extraction
// ---------------------------------------------------------------------------
// The CAPABILITIES lexicon covers known domains (expense, disaster relief).
// To support ANY project domain (agriculture, water, health, ...) without
// hallucinating, this generic extractor recognizes EXPLICIT system-behavior
// clauses via <modal/auxiliary> + <action verb> + (<actor>) + (<object>)
// patterns and builds a faithful formal statement from the clause's own words.
// It is intentionally conservative: it only fires on a clear capability marker
// (modal verb / "able to" / multilingual equivalents) and it NEVER adds objects,
// metrics, or features that are not present in the source clause.

// Action verbs that indicate the system DOES something (open set, domain-neutral).
const GENERIC_ACTION_VERBS = [
  'upload', 'download', 'submit', 'create', 'add', 'record', 'capture', 'enter',
  'view', 'see', 'read', 'display', 'show', 'list', 'browse', 'monitor', 'track',
  'edit', 'update', 'modify', 'change', 'delete', 'remove', 'manage', 'maintain',
  'search', 'filter', 'find', 'generate', 'produce', 'send', 'receive', 'notify',
  'alert', 'remind', 'approve', 'reject', 'assign', 'review', 'verify', 'validate',
  'register', 'log in', 'login', 'sign in', 'sign up', 'register', 'export',
  'import', 'share', 'download', 'print', 'schedule', 'book', 'reserve', 'order',
  'pay', 'purchase', 'request', 'apply', 'report', 'analyze', 'process', 'calculate',
  'confirm', 'select', 'choose', 'pick', 'cancel', 'complete', 'check in', 'check-in',
  'access', 'login', 'reschedule', 'join', 'attend', 'track', 'locate', 'navigate',
  'store', 'save', 'backup', 'restore', 'integrate', 'connect', 'sync',
  // Hinglish / romanized
  'upload kar', 'add kar', 'bhar', 'jama', 'dekh', 'bagh', 'pah', 'bhej',
  // Devanagari (Hindi/Marathi) common action stems
  'अपलोड', 'दर्ज', 'जोड़', 'नोंदव', 'देख', 'पहा', 'बघा', 'भेज', 'सबमिट', 'हटा',
  'आवेदन', 'स्थिति'
];

// Devanagari (Hindi/Marathi) -> English glossary for action verbs and common
// object nouns. Used ONLY to normalize a native-script requirement into formal
// English; it never invents behavior — it maps words the user actually wrote.
const DEVA_GLOSSARY = {
  // action verbs
  'अपलोड': 'upload', 'डाउनलोड': 'download', 'सबमिट': 'submit', 'जमा': 'submit',
  'दर्ज': 'record', 'जोड़': 'add', 'जोड़ें': 'add', 'बना': 'create', 'नोंदव': 'register',
  'देख': 'view', 'देखें': 'view', 'पहा': 'view', 'बघा': 'view', 'दृश्य': 'view',
  'भेज': 'send', 'प्राप्त': 'receive', 'स्वीकार': 'approve', 'अस्वीकार': 'reject',
  'हटा': 'delete', 'हटाएं': 'delete', 'संपादित': 'edit', 'अपडेट': 'update',
  'खोज': 'search', 'खोजें': 'search', 'प्रबंधित': 'manage', 'सूचित': 'notify',
  'सत्यापित': 'verify', 'समीक्षा': 'review', 'पुस्तक': 'book', 'बुक': 'book',
  'लॉगिन': 'log in', 'लॉग इन': 'log in', 'पंजीकरण': 'register', 'पुष्टि': 'confirm',
  'आवेदन': 'apply', 'आवेदन कर': 'apply',
  // object / domain nouns
  'आवेदन की स्थिति': 'application status', 'आवेदन': 'application', 'स्थिति': 'status',
  'सब्सिडी': 'subsidy', 'फसल': 'crop', 'किसान': 'farmers', 'दस्तावेज़': 'documents',
  'नियुक्ति': 'appointment', 'अपॉइंटमेंट': 'appointment', 'डॉक्टर': 'doctor',
  'मरीज': 'patients', 'मरीजों': 'patients', 'रोगी': 'patients',
  'ऑनलाइन': 'online',
  'टोकन': 'token', 'प्रणाली': 'system', 'सिस्टम': 'system', 'सूचना': 'notification',
  'सुविधा': 'feature', 'लाइव': 'live', 'नंबर': 'number',
  'खर्च': 'expenses', 'रिपोर्ट': 'reports', 'खाता': 'accounts', 'उपयोगकर्ता': 'users'
};

function glossDevanagariToEnglish(text) {
  let out = String(text || '');
  // Replace longer phrases first so "आवेदन की स्थिति" wins over "आवेदन".
  const entries = Object.entries(DEVA_GLOSSARY).sort((a, b) => b[0].length - a[0].length);
  for (const [deva, en] of entries) {
    out = out.split(deva).join(' ' + en + ' ');
  }
  // Drop residual Devanagari function words that carry no English meaning.
  out = out.replace(DEVA_STOPWORD, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

// Modal / auxiliary markers that signal an explicit requirement/obligation.
const MODAL_MARKERS = [
  'should be able to', 'shall be able to', 'must be able to', 'will be able to',
  'can ', 'could ', 'should ', 'shall ', 'must ', 'will ', 'need to', 'needs to',
  'able to',
  'kar sake', 'kar sakte', 'kar sakta', 'kar sako', 'karu shakto', 'karu shake',
  'pahije', 'hona chahiye', 'honi chahiye', 'chahiye',
  'चाहिए', 'सकते', 'सकता', 'सकें', 'सके', 'सकू', 'पाहिजे', 'शकतो', 'शकतात'
];

// Residual Devanagari function words stripped after glossing (they carry no
// English meaning once verbs/nouns have been mapped).
const DEVA_STOPWORD = /(के|लिए|कर|करें|और|अपने|अपनी|को|से|में|का|की|है|हों|हो|यह|वे|वह|पर|नहीं|ला|यांना|ना)\s?/g;

// Words that indicate a non-functional quality statement (handled by NFR path).
// Quality-attribute signal. Note: the bare adjective "available" is NOT enough
// ("available time slot" is a functional capability, not an availability NFR);
// require the noun "availability"/"uptime" or a measurable quality predicate.
const NFR_SIGNAL = /\b(fast|quick|slow|secure|security|availability|uptime|reliable|reliability|scalab|scalability|performance|latency|response time|usab|encryption|backup|throughput|concurrent users|be available|remain available|highly available)\b|तेज़?|सुरक्षित|जलद/i;

function normalizeObjectPhrase(phrase) {
  // Clean up an extracted object phrase into readable English-ish wording.
  let p = String(phrase || '').trim().replace(/\s+/g, ' ');
  p = p.replace(/^(the|a|an|their|his|her|its|apna|apne)\s+/i, '');
  p = p.replace(/[.,;!?]+$/, '');
  return p.trim();
}

/**
 * Build a faithful generic FR statement from a clause that contains an
 * explicit capability marker. Returns null when the clause is descriptive only.
 */
function buildGenericCapability(clause) {
  // Normalize native-script verbs/nouns to English FIRST so action/object
  // extraction works for Hindi/Marathi requirements. The English gloss is only
  // used to build the normalized statement; the raw text stays as evidence.
  const rawOriginal = String(clause || '').trim();
  const raw = glossDevanagariToEnglish(rawOriginal);
  // If the source contained a Devanagari capability modal (सकें/सके/चाहिए/पाहिजे/
  // शकतो), treat it as an English "can" obligation after glossing.
  const hadNativeModal = /सकें|सके|सकते|सकता|चाहिए|पाहिजे|शकतो|शकतात/.test(rawOriginal);
  const modalRaw = hadNativeModal ? raw + ' can ' : raw;
  const lower = ' ' + modalRaw.toLowerCase() + ' ';

  // Ignore clauses that are purely quality attributes (NFR handles those).
  // But still allow clauses that ALSO contain a capability (mixed) — those are
  // split by the caller clause splitter.
  // Find the action verb: prefer a WHOLE-WORD match (so "booking" doesn't hit
  // "book" mid-word and so the verb is the capability, not a later step), then
  // fall back to substring matching for romanized/Devanagari verbs. Choose the
  // longest whole-word match nearest to the obligation marker.
  let action = null;
  const sortedVerbs = [...GENERIC_ACTION_VERBS].sort((a, b) => b.length - a.length);
  for (const v of sortedVerbs) {
    const stem = v.trim();
    const ascii = /^[a-z][a-z\s]*$/i.test(stem);
    const re = ascii
      ? new RegExp(`\\b${stem.replace(/\s+/g, '\\s+')}(?:ing|ed|s)?\\b`, 'i')
      : null;
    if ((re && re.test(raw)) || (!ascii && raw.toLowerCase().includes(stem.toLowerCase()))) { action = stem; break; }
  }
  if (!action) return null;

  // Must contain an obligation/capability marker (avoid plain narration).
  const hasModal = MODAL_MARKERS.some((m) => lower.includes(m));
  if (!hasModal) return null;

  // Extract actor if present (e.g., "farmers can upload", "admin manages").
  let actor = 'users';
  const actorMatch = raw.match(/^\s*([A-Za-zऀ-ॿ][A-Za-zऀ-ॿ\s-]{1,40}?)\s+(?:can|could|should|shall|must|will|is able to|are able to)\b/i);
  if (actorMatch) {
    const cand = actorMatch[1].trim().toLowerCase();
    // Reject generic pronouns / non-actors.
    if (cand && !/^(the system|system|it|they|we|i|you|this|that)$/.test(cand)) {
      actor = cand.replace(/^(the|a|an)\s+/i, '');
    }
  }

  // Extract the object: text after the action verb (what is acted upon).
  // Locate the action in the ORIGINAL string (case-insensitive) to avoid the
  // Devanagari-range regex corrupting Latin text.
  let objectPhrase = '';
  const actionEscaped = action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const actionIdx = raw.toLowerCase().search(new RegExp(actionEscaped.replace(/\s+/g, '\\s+'), 'i'));
  if (actionIdx >= 0) {
    // Cut the object at a subordinate step/condition ("after picking ...",
    // "before submitting ...") — that is a separate capability, not the object.
    // Cut at a subordinate step/condition ("after picking ...", "before
    // submitting ...") — that describes a separate step, not the object.
    let afterRaw = raw.slice(actionIdx + action.length);
    const stepCut = afterRaw.search(/\s+(?:after|before|when|while|once|following)\s/i);
    if (stepCut >= 0) afterRaw = afterRaw.slice(0, stepCut);
    const after = afterRaw.trim();
    objectPhrase = normalizeObjectPhrase(after);
  }

  // Compose a faithful statement using ONLY English clause content.
  // Normalized requirements must be formal English (the raw native/Hinglish
  // text is preserved separately as source evidence). Strip any Devanagari and
  // romanized-Hindi helper words so no non-English tokens leak through.
  const toEnglish = (phrase) => String(phrase || '')
    .replace(/[ऀ-ॿ।॰ऽ]/g, ' ')                 // drop Devanagari script
    .replace(/\b(?:la|li|mi|majh|mala|amhi|aamhi|tumhi|pan|ali|pahije|chahiye|chahida|karne|karne ki suvidha|sake|sakta|sakte|sakti|shakto|shakte|karu|kar|hona|honi|chahiye|hai|hain|ho|ye|dekh|baghta|bhar|jod)\b/gi, ' ')
    .replace(/[.,;:!?]+(?!\s*$)/g, ' ')
    .replace(/[^A-Za-z0-9\s%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize a trailing gerund/participle on the matched verb ("booking" ->
  // "book", "choosing" -> "choose", "logging in" -> "log in").
  const baseVerb = action.replace(/\s+kar$/, '')
    .replace(/\b(\w+?)ing\b/g, (m, b) => (b.length >= 2 ? b + 'e' : m))
    .trim();
  const actionLabel = toEnglish(baseVerb).trim() || 'manage';
  let englishObject = toEnglish(objectPhrase);
  // Truncate the object at the NEXT action verb so two capabilities in one
  // clause ("upload application AND view status") don't merge into one object
  // ("upload application status view"). The clause splitter usually separates
  // these; this is a safety net for fused glossed phrasing.
  const trailingVerbs = new Set(GENERIC_ACTION_VERBS
    .map((v) => toEnglish(v).trim())
    .filter((v) => v && v !== actionLabel && v.length >= 3));
  englishObject = englishObject.split(/\s+/)
    .filter((w) => w.length > 0)
    .reduce((acc, w) => {
      if (acc.stop) return acc;
      if (trailingVerbs.has(w.toLowerCase()) && acc.words.length > 0) { acc.stop = true; return acc; }
      acc.words.push(w);
      return acc;
    }, { words: [], stop: false }).words.join(' ');
  const englishActor = toEnglish(actor) || 'users';

  let statement;
  if (englishObject && englishObject.length >= 2) {
    statement = `The system shall allow ${englishActor} to ${actionLabel} ${englishObject}.`.replace(/\s+\./, '.').replace(/\s{2,}/g, ' ');
  } else {
    statement = `The system shall allow ${englishActor} to ${actionLabel} information.`.replace(/\s{2,}/g, ' ');
  }

  // Reject thin/uninformative generic output: a generic verb with no real
  // object ("manage information") or an object that reduces to nothing after
  // native-word stripping ("add ne"). These carry no elicitation value and must
  // not fabricate content; the lexicon/pattern paths handle real capabilities.
  const STOP_OBJECTS = new Set(['information', 'data', 'it', 'this', 'that', 'ne', 'ka', 'ki', 'ko', 'se', 'feature']);
  const objectWords = englishObject.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const meaningfulObject = objectWords.some((w) => !STOP_OBJECTS.has(w.toLowerCase()) && w.length >= 2);
  if (!meaningfulObject) return null;

  // Title: Action + object (title-case-ish), English only.
  const titleObj = englishObject ? englishObject.split(/\s+/).slice(0, 4).join(' ') : actionLabel;
  const title = `${capTitle(actionLabel)} ${capTitle(titleObj)}`.trim().slice(0, 60);

  return { title, statement, actor: englishActor, action: actionLabel, object: englishObject };
}

function capTitle(s) {
  return String(s || '').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));
}

/**
 * Domain-general MEASURABLE non-functional requirement recognizer.
 * Captures explicit numeric quality targets the user actually stated (never
 * invents a number). Returns a normalized NFR candidate or null.
 */
function buildGenericMeasurableNfr(clause) {
  const raw = String(clause || '');
  const lower = raw.toLowerCase();

  // Response time / latency with an explicit time value.
  const timeMatch = lower.match(/(?:respond|response|load|load time|latency|reply|process)[^.]*?(\d+(?:\.\d+)?)\s*(ms|milliseconds?|seconds?|sec|s|min|minutes?)\b/);
  if (timeMatch) {
    const value = timeMatch[1];
    const unit = /ms|millisecond/i.test(timeMatch[2]) ? 'milliseconds' : /min|minute/.test(timeMatch[2]) ? 'minutes' : 'seconds';
    return {
      title: 'Response Performance',
      normalizedDescription: `The system shall respond to user actions within ${value} ${unit} under normal load.`,
      type: 'NON_FUNCTIONAL', nfrSubcategory: 'PERFORMANCE', topic: 'Performance',
      status: 'PROPOSED', confidence: 0.9, measurable: true
    };
  }

  // Availability percentage (accept "%" or the word "percent").
  const availMatch = lower.match(/(?:available|availability|uptime|up time)[^.]*?(\d{2,3}(?:\.\d+)?)\s*(?:%|percent)/);
  if (availMatch) {
    return {
      title: 'System Availability',
      normalizedDescription: `The system shall maintain ${availMatch[1]}% availability during agreed operating hours.`,
      type: 'NON_FUNCTIONAL', nfrSubcategory: 'AVAILABILITY', topic: 'Reliability',
      status: 'PROPOSED', confidence: 0.9, measurable: true
    };
  }

  // Concurrent users / load.
  const loadMatch = lower.match(/(\d[\d,]*)\s*(concurrent|simultaneous)?\s*(users|requests per second|transactions per second|req\/sec)/);
  if (loadMatch) {
    const n = loadMatch[1];
    const what = /request|transaction/.test(loadMatch[3]) ? 'requests per second' : 'concurrent users';
    return {
      title: 'Scalability',
      normalizedDescription: `The system shall support ${n} ${what}.`,
      type: 'NON_FUNCTIONAL', nfrSubcategory: 'SCALABILITY', topic: 'Performance',
      status: 'PROPOSED', confidence: 0.9, measurable: true
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// 5. Stage-Aware Atomic Requirements Extraction
// ---------------------------------------------------------------------------
function extractAtomicRequirements(rawText, sectionConfig = {}, project = {}) {
  const stageId = sectionConfig?.id || 'FUNCTIONAL_REQUIREMENTS';
  const stageName = sectionConfig?.name || 'Requirements Elicitation';

  // 1. Stage 1: PROJECT_INFORMATION -> Extract entity info, 0 requirements unless explicit modal
  if (stageId === 'PROJECT_INFORMATION') {
    const projectInfo = extractProjectInfo(rawText);
    const hasExplicitReq = isExplicitRequirementEvidence(rawText, sectionConfig);
    if (!hasExplicitReq) {
      return {
        requirements: [],
        entities: { projectInfo },
        informationType: INFORMATION_TYPES.PROJECT_INFORMATION,
        isRequirementEvidence: false,
        ignoredClauses: [{ clause: rawText, reason: 'PROJECT_INFORMATION_ENTITY' }]
      };
    }
  }

  // 2. Stage 2: STAKEHOLDERS_AND_USERS -> Extract entity info, 0 requirements unless explicit capability modal
  if (stageId === 'STAKEHOLDERS_AND_USERS') {
    const stakeholdersInfo = extractStakeholdersAndUsers(rawText);
    const hasExplicitReq = isExplicitRequirementEvidence(rawText, sectionConfig);
    if (!hasExplicitReq) {
      return {
        requirements: [],
        entities: { stakeholdersInfo },
        informationType: INFORMATION_TYPES.STAKEHOLDER_INFORMATION,
        isRequirementEvidence: false,
        ignoredClauses: [{ clause: rawText, reason: 'STAKEHOLDER_USER_ENTITY' }]
      };
    }
  }

  // 3. Stage 3: USER_ROLES_AND_PERMISSIONS -> Extract roles & permissions
  if (stageId === 'USER_ROLES_AND_PERMISSIONS') {
    const rolesInfo = extractRolesAndPermissions(rawText);
    const hasExplicitReq = isExplicitRequirementEvidence(rawText, sectionConfig);
    if (!hasExplicitReq) {
      return {
        requirements: [],
        entities: { rolesInfo },
        informationType: INFORMATION_TYPES.ROLE_INFORMATION,
        isRequirementEvidence: false,
        ignoredClauses: [{ clause: rawText, reason: 'ROLE_PERMISSION_ENTITY' }]
      };
    }
  }

  // 4. Stage 9: REVIEW_AND_CONFIRMATION -> 0 new requirements
  if (stageId === 'REVIEW_AND_CONFIRMATION') {
    return {
      requirements: [],
      entities: {},
      informationType: INFORMATION_TYPES.PROJECT_INFORMATION,
      isRequirementEvidence: false,
      ignoredClauses: [{ clause: rawText, reason: 'REVIEW_STAGE' }]
    };
  }

  const clauses = splitIntoClauses(rawText);
  const found = [];
  const seenCapIds = new Set();
  const seenStatements = new Set();
  const ignoredClauses = [];

  // Pre-pass: verb+object enumeration for functional requirements
  const enumCapIds = new Set();
  const sentences = String(rawText || '').split(/(?<=[.!?])\s+/).filter(Boolean);
  for (const s of sentences) {
    for (const id of detectVerbObjectEnumerations(s)) enumCapIds.add(id);
  }

  if (stageId === 'FUNCTIONAL_REQUIREMENTS' || stageId === 'STAKEHOLDERS_AND_USERS') {
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
            type: 'FUNCTIONAL',
            nfrSubcategory: 'N/A',
            category: cap.topic,
            topicCluster: cap.topic,
            priority: defaultPriority(cap),
            status: 'PROPOSED',
            ambiguityFlags: [],
            clarificationQuestion: '',
            isAtomic: true, atomic: true,
            confidence: 0.92,
            qualityFlags: [],
            isRequirementEvidence: true,
            sourceInterviewStage: stageName
          });
        }
      }
    }
  }

  for (const clause of clauses) {
    const clauseLower = clause.toLowerCase();
    let matchedInClause = false;

    // ---------- NON-FUNCTIONAL (quality attributes) ----------
    // Only extract NFRs when in NFR stage OR when explicit NFR keywords & metrics exist
    const allowNfrInThisStage = stageId === 'NON_FUNCTIONAL_REQUIREMENTS' ||
      stageId === 'FUNCTIONAL_REQUIREMENTS' ||
      /(\d+(?:\.\d+)?)\s*(?:%|percent|ms|milliseconds?|seconds?|sec|min|minutes?)\b/i.test(clause);

    // Block fake NFRs in stakeholder / project / roles stage
    const isDescriptiveStage = ['PROJECT_INFORMATION', 'STAKEHOLDERS_AND_USERS', 'USER_ROLES_AND_PERMISSIONS'].includes(stageId);

    // Domain-general MEASURABLE NFR (explicit number the user actually stated).
    // Never invents a metric; if no NFR_PATTERN matches, use this faithful one.
    let genericNfrMatched = false;
    if (allowNfrInThisStage && !isDescriptiveStage) {
      const genericNfr = buildGenericMeasurableNfr(clause);
      if (genericNfr) {
        const key = 'GNFR|' + genericNfr.normalizedDescription;
        if (!seenCapIds.has(key)) {
          seenCapIds.add(key);
          found.push({
            title: genericNfr.title,
            normalizedDescription: genericNfr.normalizedDescription,
            type: 'NON_FUNCTIONAL',
            nfrSubcategory: genericNfr.nfrSubcategory,
            category: genericNfr.topic,
            topicCluster: genericNfr.topic,
            priority: genericNfr.nfrSubcategory === 'PERFORMANCE' || genericNfr.nfrSubcategory === 'SECURITY' ? 'HIGH' : 'MEDIUM',
            status: 'PROPOSED',
            ambiguityFlags: [],
            clarificationQuestion: '',
            isAtomic: true, atomic: true,
            confidence: genericNfr.confidence,
            qualityFlags: [],
            isRequirementEvidence: true,
            sourceInterviewStage: stageName,
            extractionMethod: 'GENERIC_MEASURABLE_NFR'
          });
          genericNfrMatched = true;
          matchedInClause = true;
        }
      }
    }

    if (allowNfrInThisStage && !isDescriptiveStage) {
      for (const nfr of NFR_PATTERNS) {
        const hit = nfr.keywords.find((kw) => hasKeyword(clauseLower, clause, kw));
        if (!hit) continue;

        const measurable = nfr.measurable ? clause.match(nfr.measurable) : null;

        // If the domain-general measurable recognizer already produced a
        // concrete statement for this same clause+metric, don't duplicate it.
        if (genericNfrMatched && measurable) continue;

        // Some quality attributes (e.g. availability) must only become a
        // requirement when an explicit metric/uptime is stated — otherwise the
        // bare keyword ("available resources") would hallucinate an NFR.
        if (nfr.requireMeasurableForMatch && !measurable) continue;

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
            isAtomic: true, atomic: true,
            confidence: measurable ? 0.92 : 0.7,
            qualityFlags: isAmbiguous ? ['AMBIGUOUS', 'NEEDS_CLARIFICATION'] : [],
            isRequirementEvidence: true,
            sourceInterviewStage: stageName
          });
        }
        matchedInClause = true;
      }
    }

    // ---------- DEPENDENCY ----------
    // Only extract DEPENDENCY items in the ASSUMPTIONS_AND_DEPENDENCIES stage,
    // or in FUNCTIONAL_REQUIREMENTS where a dependency keyword cross-signals.
    // NEVER extract dependencies in CONSTRAINTS, EXTERNAL_INTERFACES, NFR, or
    // other stages — that is cross-stage information-type leakage.
    const depStageAllowed = stageId === 'ASSUMPTIONS_AND_DEPENDENCIES' ||
      stageId === 'FUNCTIONAL_REQUIREMENTS';
    if (depStageAllowed) {
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
              isRequirementEvidence: true,
              sourceInterviewStage: stageName
            });
          }
          matchedInClause = true;
        }
      }
    }

    // ---------- CONSTRAINT ----------
    // Only extract CONSTRAINT items in the CONSTRAINTS stage.
    // Technology mentions (React, Node.js, PostgreSQL) in FUNCTIONAL_REQUIREMENTS
    // or ASSUMPTIONS_AND_DEPENDENCIES are NOT constraints — they are implementation
    // preferences or dependencies. Extracting them as CONSTRAINTs in those stages
    // is information-type leakage.
    const conStageAllowed = stageId === 'CONSTRAINTS';
    if (conStageAllowed) {
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
              isRequirementEvidence: true,
              sourceInterviewStage: stageName
            });
          }
          matchedInClause = true;
        }
      }
    }

    // ---------- INTERFACE ----------
    // Only extract INTERFACE items in the EXTERNAL_INTERFACES stage.
    // Interface keywords (API, gateway, SMS) appearing in FUNCTIONAL_REQUIREMENTS
    // or other stages describe capabilities, NOT external interface specifications.
    // Extracting them as INTERFACE in those stages is information-type leakage.
    // Also, databases, languages, and cloud infrastructure are NOT external interfaces.
    const intfStageAllowed = stageId === 'EXTERNAL_INTERFACES';
    const isDatabaseOrInfra = /(?:mongodb|postgres|postgresql|mysql|sqlite|redis|oracle|cassandra|dynamodb|mariadb|cloud hosting|aws|azure|gcp|docker|kubernetes|node\.?js|react|vue|angular)/i.test(clauseLower);
    if (intfStageAllowed && !isDatabaseOrInfra) {
      for (const intf of INTERFACE_PATTERNS) {
        const hit = intf.keywords.find((kw) => hasKeyword(clauseLower, clause, kw));
        if (hit && !/depend/i.test(clauseLower)) {
          const intfName = intf.extract ? intf.extract(clauseLower) : null;
          const statement = typeof intf.statement === 'function' ? intf.statement({ intf: intfName }) : (intf.statement || 'The system shall integrate with external interfaces.');
          const key = intf.id + '|' + (intfName || '');
          if (!seenCapIds.has(key)) {
            seenCapIds.add(key);
            found.push({
              title: intfName ? `External Interface: ${intfName.split(',')[0]}` : 'External Interface Integration',
              normalizedDescription: statement,
              type: 'INTERFACE',
              nfrSubcategory: 'N/A',
              category: 'External Interfaces',
              topicCluster: 'External Interfaces',
              priority: 'MEDIUM',
              status: 'PROPOSED',
              ambiguityFlags: intfName ? [] : ['INTERFACE_UNSPECIFIED'],
              clarificationQuestion: intfName ? '' : 'Which specific external interface, API, or hardware protocol should be integrated?',
              isAtomic: true, atomic: true,
              confidence: intfName ? 0.9 : 0.75,
              qualityFlags: intfName ? [] : ['NEEDS_CLARIFICATION'],
              isRequirementEvidence: true,
              sourceInterviewStage: stageName
            });
            matchedInClause = true;
          }
        }
      }
    }

    // ---------- FUNCTIONAL capabilities ----------
    const clauseIsDependency = DEPENDENCY_PATTERNS.some((d) => d.keywords.some((k) => hasKeyword(clauseLower, clause, k)));
    const clauseIsConstraint = CONSTRAINT_PATTERNS.some((c) => c.keywords.some((k) => hasKeyword(clauseLower, clause, k)));

    // Extract functional requirements when in functional stage OR when an explicit capability action exists
    if (!clauseIsDependency && !clauseIsConstraint) {
      // Domain guard for the keyword lexicon: a capability template belongs to
      // a known domain (expense, disaster relief, ...). It must only fire when
      // the PROJECT is that domain OR the clause itself names the template's
      // domain objects. Otherwise a generic verb like "search" in a hospital
      // answer would wrongly emit "search and filter expense records".
      const projectContextText = [project?.projectName, project?.domain, project?.description, project?.scope]
        .filter(Boolean).join(' ').toLowerCase();

      for (const cap of CAPABILITIES) {
        if (enumCapIds.has(cap.id)) continue;

        const hit = cap.keywords.find((kw) => hasKeyword(clauseLower, clause, kw));
        if (!hit) continue;

        const domainTokens = (cap.objects || cap.keywords || [])
          .filter((k) => /^[a-z]/i.test(k) && k.length >= 4)
          .map((k) => k.toLowerCase());
        const isFinanceCap = domainTokens.some((o) => /expense|budget|financ/.test(o));
        const isReliefCap = domainTokens.some((o) => /disaster|relief|emergency|rescue/.test(o));
        const projectMatchesCapDomain =
          (isFinanceCap && /expense|budget|financ/.test(projectContextText)) ||
          (isReliefCap && /disaster|relief|emergency|rescue/.test(projectContextText));
        const clauseNamesDomainObject = (cap.objects || [])
          .some((o) => /^[a-z]/i.test(o) && clauseLower.includes(String(o).toLowerCase()));
        if (!(projectMatchesCapDomain || clauseNamesDomainObject)) continue;

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
            isAtomic: true, atomic: true,
            confidence: 0.9,
            qualityFlags: [],
            isRequirementEvidence: true,
            sourceInterviewStage: stageName
          });
        }
        matchedInClause = true;
      }

      // Domain-GENERAL capability fallback: recognize explicit system behavior
      // for ANY project domain (not only known lexicon domains). Only runs in
      // requirement-elicitation stages and only when the clause has a clear
      // obligation marker + action verb. Never invents unsupported content.
      const functionalStage = stageId === 'FUNCTIONAL_REQUIREMENTS' ||
        stageId === 'EXTERNAL_INTERFACES' || stageId === 'NON_FUNCTIONAL_REQUIREMENTS';
      if (!matchedInClause && functionalStage && !(NFR_SIGNAL.test(clause) || genericNfrMatched)) {
        // A clause produced by splitting an enumeration ("... search X, select Y,
        // and confirm Z") may carry no modal of its own. If it starts with an
        // action verb and the wider answer carries an obligation marker, treat
        // it as an inherited capability (prefix "users can") so it is recognized
        // faithfully rather than dropped.
        const clauseHasModal = MODAL_MARKERS.some((m) => (' ' + clauseLower).includes(m));
        const answerHasModal = /\b(should|shall|must|will|can|able to)\b/.test(rawText.toLowerCase()) ||
          /सकें|सके|सकते|चाहिए|पाहिजे|शकतो/.test(rawText);
        const startsWithVerb = new RegExp(`^\\s*(?:${[...GENERIC_ACTION_VERBS].filter(v => /^[a-z]/i.test(v)).sort((a,b)=>b.length-a.length).join('|')})(?:ing|ed|s)?\\b`, 'i').test(clause);
        const effectiveClause = (!clauseHasModal && answerHasModal && startsWithVerb)
          ? `Users can ${clause.replace(/^\s+/, '')}`
          : clause;
        const generic = buildGenericCapability(effectiveClause);
        if (generic && !seenStatements.has(generic.statement)) {
          seenStatements.add(generic.statement);
          found.push({
            title: generic.title,
            normalizedDescription: generic.statement,
            type: 'FUNCTIONAL',
            nfrSubcategory: 'N/A',
            category: sectionConfig?.name || 'Core Features',
            topicCluster: 'General System Features',
            priority: 'MEDIUM',
            status: 'PROPOSED',
            ambiguityFlags: [],
            clarificationQuestion: '',
            isAtomic: true, atomic: true,
            confidence: 0.78,
            qualityFlags: [],
            isRequirementEvidence: true,
            sourceInterviewStage: stageName,
            extractionMethod: 'GENERIC_CAPABILITY'
          });
          matchedInClause = true;
        }
      }
    }

    if (!matchedInClause) {
      ignoredClauses.push({ clause, reason: 'NO_CAPABILITY_RECOGNIZED' });
    }
  }

  return {
    requirements: found,
    entities: {
      stakeholdersInfo: extractStakeholdersAndUsers(rawText),
      rolesInfo: extractRolesAndPermissions(rawText),
      projectInfo: extractProjectInfo(rawText),
      constraintsInfo: extractConstraints(rawText),
      dependenciesInfo: extractAssumptionsDependencies(rawText),
      interfacesInfo: extractInterfaces(rawText)
    },
    informationType: classifyInformationType(rawText, sectionConfig),
    isRequirementEvidence: found.length > 0,
    ignoredClauses
  };
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

// ---------------------------------------------------------------------------
// 6. Formal Normalization: Transform to "The system shall ..." English
// ---------------------------------------------------------------------------
function formalNormalize(statement) {
  let s = String(statement || '').trim();
  if (!s) return s;

  s = s.replace(/\s+/g, ' ');

  const validPrefixes = ['the system shall', 'users shall', 'administrators shall', 'the system must'];
  const lower = s.toLowerCase();
  const hasPrefix = validPrefixes.some((p) => lower.startsWith(p));
  if (!hasPrefix) {
    s = `The system shall ${s.charAt(0).toLowerCase() + s.slice(1)}`;
  } else {
    s = s.charAt(0).toUpperCase() + s.slice(1);
    s = s.replace(/^The system must/i, 'The system shall');
  }

  if (!s.endsWith('.')) s += '.';
  return s;
}

module.exports = {
  extractAtomicRequirements,
  classifyInformationType,
  isExplicitRequirementEvidence,
  extractStakeholdersAndUsers,
  extractRolesAndPermissions,
  extractProjectInfo,
  extractConstraints,
  extractAssumptionsDependencies,
  formalNormalize,
  detectVagueTerms,
  splitIntoClauses,
  buildGenericCapability,
  glossDevanagariToEnglish,
  INFORMATION_TYPES
};
