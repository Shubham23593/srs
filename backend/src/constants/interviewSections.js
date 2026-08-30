/**
 * Single source of truth for the 9-stage elicitation interview structure.
 */
const SECTIONS_CONFIG = [
  { id: 'PROJECT_INFORMATION', name: 'Project Information', stepIndex: 1, description: 'Project name, problem solved, primary objective, and high-level scope.' },
  { id: 'STAKEHOLDERS_AND_USERS', name: 'Stakeholders & Users', stepIndex: 2, description: 'Primary and secondary stakeholders, user categories, admins, managers, and clients.' },
  { id: 'USER_ROLES_AND_PERMISSIONS', name: 'User Roles & Permissions', stepIndex: 3, description: 'Role hierarchy, access control rules, permission boundaries, and restrictions.' },
  { id: 'FUNCTIONAL_REQUIREMENTS', name: 'Functional Requirements', stepIndex: 4, description: 'Core capabilities, workflows, actions, and atomic system behaviors (FR-XXX).' },
  { id: 'NON_FUNCTIONAL_REQUIREMENTS', name: 'Non-Functional Requirements', stepIndex: 5, description: 'Performance targets, security standards, scalability, and availability (NFR-XXX).' },
  { id: 'EXTERNAL_INTERFACES', name: 'External Interfaces', stepIndex: 6, description: 'APIs, payment gateways, database integrations, email/SMS services, and third-party systems.' },
  { id: 'CONSTRAINTS', name: 'Constraints', stepIndex: 7, description: 'Technology stack, budget, timeline, regulatory compliance, and legal limitations.' },
  { id: 'ASSUMPTIONS_AND_DEPENDENCIES', name: 'Assumptions & Dependencies', stepIndex: 8, description: 'Operational assumptions, external software dependencies, and network requirements.' },
  { id: 'REVIEW_AND_CONFIRMATION', name: 'Review & Confirmation', stepIndex: 9, description: 'Final requirements summary review, coverage validation, and lock confirmation before SRS generation.' }
];

module.exports = { SECTIONS_CONFIG };
