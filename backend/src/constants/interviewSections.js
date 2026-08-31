/**
 * Single source of truth for the 9-stage elicitation interview structure.
 */
const SECTIONS_CONFIG = [
  { 
    id: 'PROJECT_INFORMATION', 
    name: 'Project Information', 
    stepIndex: 1, 
    description: 'Project name, problem solved, primary objective, and high-level scope.',
    allowedSemanticCategories: ['problem being solved', 'current pain points', 'purpose', 'primary objective', 'broad project scope', 'business/operational context'],
    forbiddenSemanticCategories: ['features', 'workflows', 'capabilities', 'user permissions', 'performance metrics', 'response times', 'security targets', 'APIs', 'integrations', 'technologies unless necessary as broad context', 'dependencies']
  },
  { 
    id: 'STAKEHOLDERS_AND_USERS', 
    name: 'Stakeholders & Users', 
    stepIndex: 2, 
    description: 'Primary and secondary stakeholders, user categories, admins, managers, and clients.',
    allowedSemanticCategories: ['who uses the system', 'who benefits', 'who is affected', 'organizations involved', 'external stakeholders', 'USER', 'STAKEHOLDER', 'BENEFICIARY', 'ORGANIZATION', 'AFFECTED_PARTY'],
    forbiddenSemanticCategories: ['workflows', 'features', 'capabilities', 'metrics', 'performance targets', 'permissions', 'technologies', 'APIs', 'integrations', 'FUNCTIONAL_WORKFLOW', 'CAPABILITY', 'METRIC', 'PERFORMANCE_TARGET', 'SECURITY_TARGET', 'CONSTRAINT', 'TECHNOLOGY', 'INTEGRATION', 'DEPENDENCY']
  },
  { 
    id: 'USER_ROLES_AND_PERMISSIONS', 
    name: 'User Roles & Permissions', 
    stepIndex: 3, 
    description: 'Role hierarchy, access control rules, permission boundaries, and restrictions.',
    allowedSemanticCategories: ['user roles', 'responsibilities', 'access rights', 'permissions', 'restrictions'],
    forbiddenSemanticCategories: ['performance metrics', 'response time', 'technology', 'API integration', 'general functional workflows unless needed to explain a permission']
  },
  { 
    id: 'FUNCTIONAL_REQUIREMENTS', 
    name: 'Functional Requirements', 
    stepIndex: 4, 
    description: 'Core capabilities, workflows, actions, and atomic system behaviors (FR-XXX).',
    allowedSemanticCategories: ['features', 'capabilities', 'user actions', 'system actions', 'workflows', 'business operations', 'inputs and outputs', 'use cases'],
    forbiddenSemanticCategories: ['performance metrics', 'response time targets', 'uptime percentages', 'security targets unless describing functional behavior', 'implementation technology constraints']
  },
  { 
    id: 'NON_FUNCTIONAL_REQUIREMENTS', 
    name: 'Non-Functional Requirements', 
    stepIndex: 5, 
    description: 'Performance targets, security standards, scalability, and availability (NFR-XXX).',
    allowedSemanticCategories: ['performance', 'response time', 'scalability', 'availability', 'reliability', 'security', 'usability', 'measurable quality attributes'],
    forbiddenSemanticCategories: ['workflows', 'features', 'user roles']
  },
  { 
    id: 'EXTERNAL_INTERFACES', 
    name: 'External Interfaces', 
    stepIndex: 6, 
    description: 'APIs, payment gateways, database integrations, email/SMS services, and third-party systems.',
    allowedSemanticCategories: ['external systems', 'APIs', 'third-party services', 'hardware interfaces', 'software integrations', 'external data exchange'],
    forbiddenSemanticCategories: ['general user workflows', 'unrelated metrics', 'technology constraints unless directly about integration compatibility']
  },
  { 
    id: 'CONSTRAINTS', 
    name: 'Constraints', 
    stepIndex: 7, 
    description: 'Technology stack, budget, timeline, regulatory compliance, and legal limitations.',
    allowedSemanticCategories: ['mandatory technologies', 'budget', 'timeline', 'regulations', 'compliance', 'deployment restrictions', 'organizational restrictions', 'required platforms'],
    forbiddenSemanticCategories: ['general workflows', 'unrelated features', 'NFR metrics unless explicitly a mandated constraint']
  },
  { 
    id: 'ASSUMPTIONS_AND_DEPENDENCIES', 
    name: 'Assumptions & Dependencies', 
    stepIndex: 8, 
    description: 'Operational assumptions, external software dependencies, and network requirements.',
    allowedSemanticCategories: ['assumptions', 'external dependencies', 'prerequisites', 'third-party availability', 'infrastructure dependencies', 'user environment assumptions'],
    forbiddenSemanticCategories: ['features', 'workflows', 'performance targets', 'user roles']
  },
  { 
    id: 'REVIEW_AND_CONFIRMATION', 
    name: 'Review & Confirmation', 
    stepIndex: 9, 
    description: 'Final requirements summary review, coverage validation, and lock confirmation before SRS generation.',
    allowedSemanticCategories: ['confirmation', 'summarization', 'missing information', 'conflict resolution', 'corrections'],
    forbiddenSemanticCategories: ['opening an entirely new interview topic unless required to resolve missing information']
  }
];

module.exports = { SECTIONS_CONFIG };
