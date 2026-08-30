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
  const lower = s.toLowerCase();

  const userKeywords = [
    { key: 'citizens', pattern: /\b(?:citizens?|affected citizens?|public|nagrik|loka|lok)\b/i },
    { key: 'government officials', pattern: /\b(?:government officials?|disaster management officers?|shasan|adhikari|sarkari)\b/i },
    { key: 'NGO workers', pattern: /\b(?:ngo workers?|ngo staff|ngos?|non-profit|samajik sanstha)\b/i },
    { key: 'volunteers', pattern: /\b(?:volunteers?|swayamsevak|sevak)\b/i },
    { key: 'emergency responders', pattern: /\b(?:emergency responders?|first responders?|firefighters?|paramedics?|police|rescue team)\b/i },
    { key: 'administrators', pattern: /\b(?:administrators?|admins?|system admins?|prashasak)\b/i },
    { key: 'doctors', pattern: /\b(?:doctors?|physicians?|clinicians?|vaidya|doctor)\b/i },
    { key: 'patients', pattern: /\b(?:patients?|rogi|rujna)\b/i },
    { key: 'managers', pattern: /\b(?:managers?|supervisors?|prabandhak)\b/i },
    { key: 'field workers', pattern: /\b(?:field workers?|ground staff|karyakarta)\b/i },
    { key: 'customers', pattern: /\b(?:customers?|clients?|grahak)\b/i },
    { key: 'students', pattern: /\b(?:students?|learners?|vidyarthi)\b/i }
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
      } else if (['citizens', 'patients', 'customers', 'students'].includes(item.key)) {
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

  return {
    primaryUsers: [...new Set(primaryUsers)],
    secondaryUsers: [...new Set(stakeholders.filter(x => !primaryUsers.includes(x)))],
    stakeholders: [...new Set(stakeholders)],
    beneficiaries: [...new Set(beneficiaries)],
    administrators: [...new Set(administrators)],
    partnerOrganizations: [...new Set(partnerOrganizations)]
  };
}

function extractRolesAndPermissions(text) {
  const s = String(text || '');
  const roles = [];
  const permissions = [];

  const roleMatches = s.match(/\b(?:admin|administrator|manager|field worker|volunteer|citizen|officer|supervisor|user|doctor|patient)\b/gi) || [];
  roleMatches.forEach(r => roles.push(r.toLowerCase()));

  const permMatches = s.match(/\b(?:view assigned tasks|update repair status|read-only|read and write|full access|approve requests|create records|delete records|manage users)\b/gi) || [];
  permMatches.forEach(p => permissions.push(p.toLowerCase()));

  return {
    userRoles: [...new Set(roles)],
    permissions: [...new Set(permissions)],
    roleHierarchy: roles.length > 1 ? [`${roles[0]} > ${roles.slice(1).join(', ')}`] : [],
    accessRules: permissions
  };
}

function extractProjectInfo(text) {
  const s = String(text || '').trim();
  return {
    problemStatement: s,
    projectContext: s,
    primaryObjective: s.slice(0, 120),
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
  return {
    technologyConstraints: tech,
    deploymentConstraints: tech.filter(t => ['AWS Cloud', 'Docker Containers'].includes(t)),
    budgetConstraints: [],
    regulatoryConstraints: [],
    timelineConstraints: []
  };
}

function extractAssumptionsDependencies(text) {
  const s = String(text || '');
  const deps = [];
  if (/gps/i.test(s)) deps.push('GPS Location Services');
  if (/email/i.test(s)) deps.push('Email Notification Provider');
  if (/sms/i.test(s)) deps.push('SMS Gateway Provider');
  if (/payment|stripe|paypal/i.test(s)) deps.push('Payment Gateway');
  return {
    assumptions: s.includes('assume') ? [s] : ['Reliable network connectivity is available.'],
    dependencies: deps,
    thirdPartyServices: deps,
    environmentalDependencies: []
  };
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
      /(\d+(?:\.\d+)?)\s*(?:%|ms|seconds?|sec|s)\b/i.test(clause);

    // Block fake NFRs in stakeholder / project / roles stage
    const isDescriptiveStage = ['PROJECT_INFORMATION', 'STAKEHOLDERS_AND_USERS', 'USER_ROLES_AND_PERMISSIONS'].includes(stageId);

    if (allowNfrInThisStage && !isDescriptiveStage) {
      for (const nfr of NFR_PATTERNS) {
        const hit = nfr.keywords.find((kw) => hasKeyword(clauseLower, clause, kw));
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
    if (stageId === 'ASSUMPTIONS_AND_DEPENDENCIES' || !isDescriptiveStage) {
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
    if (stageId === 'CONSTRAINTS' || !isDescriptiveStage) {
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
    if (stageId === 'EXTERNAL_INTERFACES' || !isDescriptiveStage) {
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
      for (const cap of CAPABILITIES) {
        if (enumCapIds.has(cap.id)) continue;

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
            isAtomic: true, atomic: true,
            confidence: 0.9,
            qualityFlags: [],
            isRequirementEvidence: true,
            sourceInterviewStage: stageName
          });
        }
        matchedInClause = true;
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
      dependenciesInfo: extractAssumptionsDependencies(rawText)
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
  INFORMATION_TYPES
};
