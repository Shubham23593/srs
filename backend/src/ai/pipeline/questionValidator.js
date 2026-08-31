/**
 * ============================================================================
 * QUESTION VALIDATOR (ISO/IEC/IEEE 29148 Stage-Policy Engine)
 * ============================================================================
 *
 * Deterministically validates an LLM-generated question against the strict
 * 9-stage elicitation policy to prevent stage intent, topic leakage, and
 * completed-stage repetition.
 *
 * Layered Validation Architecture:
 * - Layer 1: Structural Integrity & LLM Intended Stage Authority
 * - Layer 2: Completed Stage Guard (Strict Prevention of Regressive Elicitation)
 * - Layer 3: Semantic Intent Classification & Disallowed Intent Enforcement
 * - Layer 4: Forbidden Concept & Intent Leakage Detection
 * - Layer 5: Context Compatibility & Information Target Alignment
 *
 * Deterministic contract:
 * Returns { valid: boolean, detectedIntent: string, violations: string[], reason: string }
 */

const { SECTIONS_CONFIG } = require('../../constants/interviewSections');

// Stage Allowed and Forbidden Semantic Intent Mapping
const STAGE_INTENT_POLICY = {
  PROJECT_INFORMATION: {
    allowedIntents: ['PROJECT_FOUNDATION'],
    forbiddenIntents: [
      'STAKEHOLDER_IDENTIFICATION', 'ROLE_AND_PERMISSION', 'FUNCTIONAL_CAPABILITY',
      'QUALITY_ATTRIBUTE', 'EXTERNAL_INTEGRATION', 'PROJECT_CONSTRAINT', 'ASSUMPTION_DEPENDENCY'
    ],
    forbiddenPatterns: [
      { regex: /\b(who are the users|which stakeholders|target users|user roles)\b/i, category: 'STAKEHOLDER_IDENTIFICATION', reason: 'Asking for stakeholders or users in Project Information stage.' },
      { regex: /\b(permissions?|access control|access rights|role matrix)\b/i, category: 'ROLE_AND_PERMISSION', reason: 'Asking for access control/permissions in Project Information stage.' },
      { regex: /\b(response time|latency|throughput|sla|uptime|99\.\d+%|scalability target)\b/i, category: 'QUALITY_ATTRIBUTE', reason: 'Asking for NFR metrics/response times in Project Information stage.' },
      { regex: /\b(api endpoint|rest api|webhook|payment gateway|sensor hardware)\b/i, category: 'EXTERNAL_INTEGRATION', reason: 'Asking for API/hardware interfaces in Project Information stage.' },
      { regex: /\b(step-by-step workflow|exact user steps|ui wireframe)\b/i, category: 'FUNCTIONAL_CAPABILITY', reason: 'Asking for detailed functional workflows in Project Information stage.' },
      { regex: /\b(tech stack|budget limit|timeline deadline|compliance)\b/i, category: 'PROJECT_CONSTRAINT', reason: 'Asking for constraints in Project Information stage.' }
    ]
  },
  STAKEHOLDERS_AND_USERS: {
    allowedIntents: ['STAKEHOLDER_IDENTIFICATION'],
    forbiddenIntents: [
      'PROJECT_FOUNDATION', 'ROLE_AND_PERMISSION', 'FUNCTIONAL_CAPABILITY',
      'QUALITY_ATTRIBUTE', 'EXTERNAL_INTEGRATION', 'PROJECT_CONSTRAINT', 'ASSUMPTION_DEPENDENCY'
    ],
    forbiddenPatterns: [
      { regex: /\b(permissions?|access rights?|privileges?|role privileges|authorization matrix|access rules?)\b/i, category: 'ROLE_AND_PERMISSION', reason: 'Asking for permissions/access rules in Stakeholders stage.' },
      { regex: /\b(metric|metrics|kpi|kpis|response time|latency|turnaround time|speed|throughput|efficiency rate)\b/i, category: 'QUALITY_ATTRIBUTE', reason: 'Asking for metrics/performance in Stakeholders stage.' },
      { regex: /\b(workflow|step 1|user action|system behavior|workflow steps)\b/i, category: 'FUNCTIONAL_CAPABILITY', reason: 'Asking for functional workflows in Stakeholders stage.' },
      { regex: /\b(api|apis|sdk|gateway|database integration|third party)\b/i, category: 'EXTERNAL_INTEGRATION', reason: 'Asking for technical integrations in Stakeholders stage.' },
      { regex: /\b(budget limit|timeline deadline|regulatory penalty|tech stack)\b/i, category: 'PROJECT_CONSTRAINT', reason: 'Asking for constraints in Stakeholders stage.' }
    ]
  },
  USER_ROLES_AND_PERMISSIONS: {
    allowedIntents: ['ROLE_AND_PERMISSION'],
    forbiddenIntents: [
      'PROJECT_FOUNDATION', 'FUNCTIONAL_CAPABILITY', 'QUALITY_ATTRIBUTE',
      'EXTERNAL_INTEGRATION', 'PROJECT_CONSTRAINT', 'ASSUMPTION_DEPENDENCY'
    ],
    forbiddenPatterns: [
      { regex: /\b(response time|latency|throughput|uptime|99\.\d+%|concurrency limit)\b/i, category: 'QUALITY_ATTRIBUTE', reason: 'Asking for NFR performance in User Roles stage.' },
      { regex: /\b(api integration|rest api|third-party endpoint|hardware protocol|payment gateway)\b/i, category: 'EXTERNAL_INTEGRATION', reason: 'Asking for external APIs in User Roles stage.' },
      { regex: /\b(cloud hosting platform|tech stack choice|docker container|budget limit|timeline)\b/i, category: 'PROJECT_CONSTRAINT', reason: 'Asking for technical constraints in User Roles stage.' }
    ]
  },
  FUNCTIONAL_REQUIREMENTS: {
    allowedIntents: ['FUNCTIONAL_CAPABILITY'],
    forbiddenIntents: [
      'PROJECT_FOUNDATION', 'STAKEHOLDER_IDENTIFICATION', 'ROLE_AND_PERMISSION',
      'QUALITY_ATTRIBUTE', 'EXTERNAL_INTEGRATION', 'PROJECT_CONSTRAINT', 'ASSUMPTION_DEPENDENCY'
    ],
    forbiddenPatterns: [
      { regex: /\b(permissions?|access rules?|access rights?|role privileges?|who is allowed to access|authorization rules?|roles and permissions?)\b/i, category: 'ROLE_AND_PERMISSION', reason: 'Asking for permissions or access rules in Functional Requirements stage.' },
      { regex: /\b(who are the stakeholders|which organizations will use|list all user types|who will use the system|which users exist)\b/i, category: 'STAKEHOLDER_IDENTIFICATION', reason: 'Asking for stakeholder or user lists in Functional Requirements stage.' },
      { regex: /\b(milliseconds?|latency limit|response time sla|99\.\d+% uptime|requests per second|uptime percentage)\b/i, category: 'QUALITY_ATTRIBUTE', reason: 'Asking for pure NFR performance metrics in Functional Requirements stage.' },
      { regex: /\b(?:which|what)\s+(?:payment|sms|email|maps?|iot|hardware|third-party|external)\s*(?:gateway|api|interface|service|integration)s?\s+(?:should|will|do|to)\s+(?:the system\s+)?(?:integrate|connect|use|support)\b/i, category: 'EXTERNAL_INTEGRATION', reason: 'Asking for external interface choices in Functional Requirements stage.' },
      { regex: /\b(budget constraint|budget limit|timeline deadline|mandated language|mandatory technology)\b/i, category: 'PROJECT_CONSTRAINT', reason: 'Asking for project constraints in Functional Requirements stage.' }
    ]
  },
  NON_FUNCTIONAL_REQUIREMENTS: {
    allowedIntents: ['QUALITY_ATTRIBUTE'],
    forbiddenIntents: [
      'PROJECT_FOUNDATION', 'STAKEHOLDER_IDENTIFICATION', 'ROLE_AND_PERMISSION',
      'FUNCTIONAL_CAPABILITY', 'EXTERNAL_INTEGRATION', 'PROJECT_CONSTRAINT', 'ASSUMPTION_DEPENDENCY'
    ],
    forbiddenPatterns: [
      { regex: /\b(who are the stakeholders|which organizations will use|list all user types)\b/i, category: 'STAKEHOLDER_IDENTIFICATION', reason: 'Asking for stakeholder lists in Non-Functional Requirements stage.' },
      { regex: /\b(what user roles exist|create new role|permissions?|access rights?)\b/i, category: 'ROLE_AND_PERMISSION', reason: 'Asking for user roles/permissions in Non-Functional Requirements stage.' },
      { regex: /\b(what functional workflows|describe step-by-step feature|new features?)\b/i, category: 'FUNCTIONAL_CAPABILITY', reason: 'Asking for functional feature workflows in Non-Functional Requirements stage.' },
      { regex: /\b(tech stack|programming language|budget constraint)\b/i, category: 'PROJECT_CONSTRAINT', reason: 'Asking for constraints in Non-Functional Requirements stage.' }
    ]
  },
  EXTERNAL_INTERFACES: {
    allowedIntents: ['EXTERNAL_INTEGRATION'],
    forbiddenIntents: [
      'PROJECT_FOUNDATION', 'STAKEHOLDER_IDENTIFICATION', 'ROLE_AND_PERMISSION',
      'FUNCTIONAL_CAPABILITY', 'QUALITY_ATTRIBUTE', 'PROJECT_CONSTRAINT', 'ASSUMPTION_DEPENDENCY'
    ],
    forbiddenPatterns: [
      { regex: /\b(role permissions|who will manage roles|access matrix|permissions?)\b/i, category: 'ROLE_AND_PERMISSION', reason: 'Asking for user roles or permissions in External Interfaces stage.' },
      { regex: /\b(overall project goal|high-level business objective|problem statement)\b/i, category: 'PROJECT_FOUNDATION', reason: 'Asking for high-level project purpose in External Interfaces stage.' },
      { regex: /\b(response time sla|latency target|99\.\d+% uptime)\b/i, category: 'QUALITY_ATTRIBUTE', reason: 'Asking for NFR metrics in External Interfaces stage.' }
    ]
  },
  CONSTRAINTS: {
    allowedIntents: ['PROJECT_CONSTRAINT'],
    forbiddenIntents: [
      'PROJECT_FOUNDATION', 'STAKEHOLDER_IDENTIFICATION', 'ROLE_AND_PERMISSION',
      'FUNCTIONAL_CAPABILITY', 'QUALITY_ATTRIBUTE', 'EXTERNAL_INTEGRATION', 'ASSUMPTION_DEPENDENCY'
    ],
    forbiddenPatterns: [
      { regex: /\b(response time|latency|throughput|sla|uptime|metrics?|performance)\b/i, category: 'QUALITY_ATTRIBUTE', reason: 'Asking for performance metrics in Constraints stage.' },
      { regex: /\b(what workflows|describe step-by-step|how will users|features?|capabilities)\b/i, category: 'FUNCTIONAL_CAPABILITY', reason: 'Asking for functional workflows in Constraints stage.' },
      { regex: /\b(who will be the primary end users|list stakeholders|user types)\b/i, category: 'STAKEHOLDER_IDENTIFICATION', reason: 'Asking for end users in Constraints stage.' },
      { regex: /\b(permissions?|access rules?|role privileges)\b/i, category: 'ROLE_AND_PERMISSION', reason: 'Asking for permissions in Constraints stage.' }
    ]
  },
  ASSUMPTIONS_AND_DEPENDENCIES: {
    allowedIntents: ['ASSUMPTION_DEPENDENCY'],
    forbiddenIntents: [
      'PROJECT_FOUNDATION', 'STAKEHOLDER_IDENTIFICATION', 'ROLE_AND_PERMISSION',
      'FUNCTIONAL_CAPABILITY', 'QUALITY_ATTRIBUTE', 'EXTERNAL_INTEGRATION', 'PROJECT_CONSTRAINT'
    ],
    forbiddenPatterns: [
      { regex: /\b(what are the functional capabilities|describe core feature workflows|features?)\b/i, category: 'FUNCTIONAL_CAPABILITY', reason: 'Asking for functional capabilities in Assumptions stage.' },
      { regex: /\b(what roles and permissions|user roles|permissions?)\b/i, category: 'ROLE_AND_PERMISSION', reason: 'Asking for roles and permissions in Assumptions stage.' },
      { regex: /\b(response time|latency|throughput|uptime|metrics?)\b/i, category: 'QUALITY_ATTRIBUTE', reason: 'Asking for performance metrics in Assumptions stage.' },
      { regex: /\b(?:which|what)\s+(?:payment|sms|email|maps?|iot|hardware|third-party|external)\s*(?:gateway|api|interface|service|integration)s?\s+(?:should|will|do|to)\s+(?:the system\s+)?(?:integrate|connect|use|support)\b/i, category: 'EXTERNAL_INTEGRATION', reason: 'Asking for new external interface integrations in Assumptions & Dependencies stage.' },
      { regex: /\b(?:which|what)\s+(?:apis?|gateways?|interfaces?)\s+(?:should|will|do|to)\s+(?:integrate|connect|use|support)\b/i, category: 'EXTERNAL_INTEGRATION', reason: 'Asking for interface connections in Assumptions stage.' },
      { regex: /\b(which payment gateway|which sms gateway|which external interfaces)\b/i, category: 'EXTERNAL_INTEGRATION', reason: 'Asking for external interface choices in Assumptions stage.' }
    ]
  },
  REVIEW_AND_CONFIRMATION: {
    allowedIntents: ['CONFIRMATION_REVIEW'],
    forbiddenIntents: [
      'PROJECT_FOUNDATION', 'STAKEHOLDER_IDENTIFICATION', 'ROLE_AND_PERMISSION',
      'FUNCTIONAL_CAPABILITY', 'QUALITY_ATTRIBUTE', 'EXTERNAL_INTEGRATION', 'PROJECT_CONSTRAINT', 'ASSUMPTION_DEPENDENCY'
    ],
    forbiddenPatterns: []
  }
};

/**
 * Classifies the semantic intent of a question string and informationTarget.
 */
function classifySemanticIntent(questionText = '', informationTarget = '') {
  const combined = `${informationTarget} ${questionText}`.toLowerCase();

  // 1. Role and Permission Intent (check first to catch access rule / permission queries)
  if (
    /\b(permissions?|access rights?|privileges?|authorization|allowed to do|access boundaries|access rules?|restrictions?|roles? and permissions?|role privileges?)\b/i.test(combined)
  ) {
    return 'ROLE_AND_PERMISSION';
  }

  // 2. Stakeholder / User Intent (only if not solely asking for permissions/roles)
  if (
    /\b(stakeholder|stakeholders|target users?|beneficiar(?:y|ies)|partner organizations?|who will use|who uses|who benefits|user types|end users|user categories?)\b/i.test(combined) &&
    !/\b(workflow|capability|feature|action|workflow steps)\b/i.test(combined)
  ) {
    return 'STAKEHOLDER_IDENTIFICATION';
  }

  // 3. Quality / NFR Intent
  if (
    /\b(response time|latency|performance target|throughput|uptime|availability target|scalability target|security standard|encryption standard|backup frequency|recovery time|load capacity|speed|concurrent users|sla|uptime percentage)\b/i.test(combined)
  ) {
    return 'QUALITY_ATTRIBUTE';
  }

  // 4. Assumption / Dependency Intent
  const isExplicitAssumption = /\b(assumptions?|assume|assuming|assumed|depends? on|dependency|dependencies|prerequisites?|infrastructure reliance|network availability|operational reliance|rely upon|relies upon)\b/i.test(combined);
  const isInterfaceIntegrationQuery = /\b(?:which|what)\s+(?:payment|sms|email|maps?|iot|hardware|third-party|external)?\s*(?:gateway|api|interface|service|integration)s?\s+(?:should|will|do|to)\s+(?:the system\s+)?(?:integrate|connect|use|support)\b/i.test(combined) ||
    /\b(?:integrate with|connect with|which payment gateway|which sms gateway|which external interfaces)\b/i.test(combined);

  if (isExplicitAssumption && !isInterfaceIntegrationQuery) {
    return 'ASSUMPTION_DEPENDENCY';
  }

  // 5. External Integration Intent
  if (
    isInterfaceIntegrationQuery ||
    /\b(api|apis|sdk|gateway|gateways|third-party|third party|external system|hardware interface|sensors?|mqtt|webhook|payment integration|database connection|external interfaces?)\b/i.test(combined)
  ) {
    return 'EXTERNAL_INTEGRATION';
  }

  // 6. Constraint Intent
  if (
    /\b(budget constraint|budget limit|timeline constraint|deadline|mandated|mandatory tech|compliance standard|gdpr|hipaa|iso compliance|legal limitation|deployment restriction|tech stack constraint)\b/i.test(combined)
  ) {
    return 'PROJECT_CONSTRAINT';
  }

  // 7. Functional Workflow / Capability Intent
  if (
    /\b(feature|features|capability|capabilities|workflow|action|actions|step|steps|what should the system do|how should the system behave|process report|submit|user action|system function|functional requirements?|core capabilities)\b/i.test(combined)
  ) {
    return 'FUNCTIONAL_CAPABILITY';
  }

  // 8. Project Foundation Intent
  if (
    /\b(problem statement|core problem|pain point|primary objective|core purpose|core goal|project scope|main goal|project overview)\b/i.test(combined)
  ) {
    return 'PROJECT_FOUNDATION';
  }

  // 9. Review / Confirmation Intent
  if (
    /\b(confirm|lock requirements|review summary|finalize|generate srs)\b/i.test(combined)
  ) {
    return 'CONFIRMATION_REVIEW';
  }

  return 'UNKNOWN';
}

/**
 * Validates a generated question against the current interview stage policy.
 *
 * @param {object} generatedData
 * @param {string} generatedData.question
 * @param {string} [generatedData.intendedStage]
 * @param {string} [generatedData.informationTarget]
 * @param {string[]} [generatedData.missingInformation]
 * @param {string} currentStageId
 * @param {object} [options]
 * @param {string[]} [options.completedStages] - Array of stage IDs already completed
 * @returns {{ valid: boolean, detectedIntent: string, violations: string[], reason: string }}
 */
function validateQuestionAgainstStage(generatedData, currentStageId, options = {}) {
  const result = {
    valid: false,
    detectedIntent: 'UNKNOWN',
    violations: [],
    reason: ''
  };

  // =========================================================================
  // LAYER 1: Current Stage Policy & Structural Integrity
  // =========================================================================
  const stageConfig = SECTIONS_CONFIG.find((s) => s.id === currentStageId);
  if (!stageConfig) {
    result.violations.push('UNKNOWN_STAGE');
    result.reason = `Unknown stage ID: ${currentStageId}`;
    return result;
  }

  if (!generatedData || typeof generatedData.question !== 'string' || generatedData.question.trim().length < 5) {
    result.violations.push('MALFORMED_OUTPUT');
    result.reason = 'Generated question is missing, malformed, or too short.';
    return result;
  }

  const questionText = generatedData.question.trim();
  const infoTarget = generatedData.informationTarget || '';

  // Explicit stage mismatch check: LLM cannot bypass validation by declaring wrong stage
  if (generatedData.intendedStage && generatedData.intendedStage !== currentStageId) {
    result.violations.push('STAGE_LEAKAGE');
    result.reason = `INTENT LEAKAGE: LLM declared intendedStage '${generatedData.intendedStage}', but authoritative current stage is '${currentStageId}'.`;
    return result;
  }

  // =========================================================================
  // LAYER 2: Completed Stage Guard (Strict No-Repetition Policy)
  // =========================================================================
  const completedStages = new Set(options.completedStages || []);
  const currentStageIndex = stageConfig.stepIndex - 1; // 0-indexed

  // Check if current stage is past earlier stages
  const isPastRolesStage = currentStageIndex > 2 || completedStages.has('USER_ROLES_AND_PERMISSIONS');
  const isPastStakeholdersStage = currentStageIndex > 1 || completedStages.has('STAKEHOLDERS_AND_USERS');
  const isPastProjectInfoStage = currentStageIndex > 0 || completedStages.has('PROJECT_INFORMATION');

  // If USER_ROLES_AND_PERMISSIONS is completed, questions about permissions, access rules, or role assignments are forbidden in later stages
  if (isPastRolesStage && currentStageId !== 'USER_ROLES_AND_PERMISSIONS') {
    if (
      /\b(permissions?|access rules?|access rights?|role privileges?|who is allowed to|authorization rules?|roles and permissions?)\b/i.test(questionText)
    ) {
      result.violations.push('COMPLETED_STAGE_REPETITION');
      result.reason = `COMPLETED STAGE LEAKAGE: Permissions and access rules were already elicited and completed in stage 'USER_ROLES_AND_PERMISSIONS'. Later stages must not repeat permission questions.`;
      return result;
    }
  }

  // If STAKEHOLDERS_AND_USERS is completed, questions about who the users/stakeholders are are forbidden in later stages
  if (isPastStakeholdersStage && currentStageId !== 'STAKEHOLDERS_AND_USERS' && currentStageId !== 'USER_ROLES_AND_PERMISSIONS') {
    if (
      /\b(who will use the system|list all users|who are the stakeholders|which organizations will benefit|identify the user groups)\b/i.test(questionText)
    ) {
      result.violations.push('COMPLETED_STAGE_REPETITION');
      result.reason = `COMPLETED STAGE LEAKAGE: Stakeholders and users were already elicited and completed in stage 'STAKEHOLDERS_AND_USERS'.`;
      return result;
    }
  }

  // If PROJECT_INFORMATION is completed, questions about high-level problem statement or core goal are forbidden in later stages
  if (isPastProjectInfoStage && currentStageId !== 'PROJECT_INFORMATION') {
    if (
      /\b(what is the primary problem statement|what is the core project goal|describe the main business objective)\b/i.test(questionText)
    ) {
      result.violations.push('COMPLETED_STAGE_REPETITION');
      result.reason = `COMPLETED STAGE LEAKAGE: Project overview was already elicited and completed in stage 'PROJECT_INFORMATION'.`;
      return result;
    }
  }

  // =========================================================================
  // LAYER 3: Semantic Intent Classification & Disallowed Intent Enforcement
  // =========================================================================
  const detectedIntent = classifySemanticIntent(questionText, infoTarget);
  result.detectedIntent = detectedIntent;

  const policy = STAGE_INTENT_POLICY[currentStageId] || {
    allowedIntents: [],
    forbiddenIntents: [],
    forbiddenPatterns: []
  };

  // If intent was detected:
  if (detectedIntent !== 'UNKNOWN') {
    // Check explicitly forbidden intents
    if (policy.forbiddenIntents.includes(detectedIntent)) {
      result.violations.push('FORBIDDEN_INTENT');
      result.reason = `INTENT LEAKAGE: Question classified as intent '${detectedIntent}', which is forbidden in stage '${currentStageId}'.`;
      return result;
    }

    // Check allowed intents whitelist
    if (policy.allowedIntents.length > 0 && !policy.allowedIntents.includes(detectedIntent)) {
      result.violations.push('DISALLOWED_INTENT');
      result.reason = `INTENT LEAKAGE: Question classified as intent '${detectedIntent}', but stage '${currentStageId}' only permits: ${policy.allowedIntents.join(', ')}.`;
      return result;
    }
  }

  // =========================================================================
  // LAYER 4: Forbidden Concept & Intent Leakage Detection
  // =========================================================================
  for (const pattern of policy.forbiddenPatterns) {
    if (pattern.regex.test(questionText) || pattern.regex.test(infoTarget)) {
      result.violations.push('FORBIDDEN_CONCEPT');
      result.reason = `INTENT LEAKAGE: ${pattern.reason} (Matched: '${pattern.category}')`;
      return result;
    }
  }

  // =========================================================================
  // LAYER 5: Context Compatibility & Information Target Alignment
  // =========================================================================
  // If stage is USER_ROLES_AND_PERMISSIONS and roles are already collected, ensure we don't ask for generic roles again
  if (currentStageId === 'USER_ROLES_AND_PERMISSIONS') {
    if (
      /\b(what roles exist|which roles are available|who are the roles|list user roles)\b/i.test(questionText) &&
      !/\b(permission|permissions|access|allowed|rights|actions|boundary|restrictions)\b/i.test(questionText)
    ) {
      result.violations.push('REDUNDANT_TARGET');
      result.reason = `Question redundantly asks for user roles when roles have already been identified. Must target permissions and access rules.`;
      return result;
    }
  }

  // Passed all validation layers
  result.valid = true;
  result.reason = 'Valid stage-appropriate question.';
  return result;
}

module.exports = {
  validateQuestionAgainstStage,
  classifySemanticIntent,
  STAGE_INTENT_POLICY
};
