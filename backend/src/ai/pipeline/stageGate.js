/**
 * ============================================================================
 * STAGE GATE — Interview stage completeness & advancement logic
 * ============================================================================
 *
 * A user answer must NEVER advance the stage merely because text arrived.
 * Advancement depends on whether the CURRENT stage has gathered sufficient,
 * stage-appropriate information (explicit user SKIP always allowed).
 *
 * This module is deterministic and does not depend on the LLM. It inspects:
 *   - the current stage
 *   - structured knowledge extracted this turn (entities)
 *   - project knowledge already persisted
 *   - requirements captured for this stage
 *   - whether the turn was out-of-scope / a clarification
 *
 * Returns: { complete, reason, collectedFields, missingFields }.
 */

const SECTIONS_ENTITY_KNOWLEDGE = {
  PROJECT_INFORMATION: 'project',
  STAKEHOLDERS_AND_USERS: 'stakeholders',
  USER_ROLES_AND_PERMISSIONS: 'roles'
};

function count(arr) {
  return Array.isArray(arr) ? arr.filter(Boolean).length : 0;
}

/**
 * @param {object} ctx
 * @param {string} ctx.stageId
 * @param {object} ctx.entities        - entities extracted this turn
 * @param {object} ctx.project         - persisted project (knowledge store)
 * @param {number} ctx.stageRequirements - number of requirements extracted this stage
 * @param {boolean} ctx.outOfScope
 * @param {boolean} ctx.userSkipped
 * @returns {{complete:boolean, reason:string, collectedFields:string[], missingFields:string[]}}
 */
function evaluateStageCompletion(ctx) {
  const {
    stageId,
    entities = {},
    project = {},
    stageRequirements = 0,
    outOfScope = false,
    userSkipped = false
  } = ctx;

  if (userSkipped) {
    return { complete: true, reason: 'USER_SKIPPED', collectedFields: [], missingFields: [] };
  }
  if (outOfScope) {
    return { complete: false, reason: 'OUT_OF_SCOPE', collectedFields: [], missingFields: [] };
  }

  const e = entities || {};
  const collected = [];
  const missing = [];

  switch (stageId) {
    case 'PROJECT_INFORMATION': {
      // Need SOME project description/scope/objective knowledge.
      if (project.description || project.scope || project.problemStatement ||
          e.projectInfo?.problemStatement) collected.push('project_description');
      if (count(project.objectives) || project.primaryObjective) collected.push('objective');
      if (!collected.includes('project_description') && count(project.targetUsers) === 0) {
        missing.push('What problem does the system solve and for whom?');
      }
      // A single substantive answer about the project is sufficient.
      const complete = collected.length >= 1 || Boolean(e.projectInfo?.problemStatement) ||
        Boolean(project.description) || Boolean(project.scope);
      return result(complete, collected, missing, complete ? 'PROJECT_INFO_CAPTURED' : 'NEEDS_PROJECT_INFO');
    }

    case 'STAKEHOLDERS_AND_USERS': {
      const usersThisTurn = count(e.stakeholdersInfo?.primaryUsers) + count(e.stakeholdersInfo?.beneficiaries);
      const usersKnown = count(project.targetUsers);
      const stkKnown = count(project.stakeholders) + count(e.stakeholdersInfo?.stakeholders);
      if (usersKnown || usersThisTurn) collected.push('primary_users');
      if (stkKnown) collected.push('stakeholders');
      if (!collected.length) missing.push('Who are the primary users and key stakeholders?');
      const complete = collected.length >= 1;
      return result(complete, collected, missing, complete ? 'STAKEHOLDERS_CAPTURED' : 'NEEDS_STAKEHOLDERS');
    }

    case 'USER_ROLES_AND_PERMISSIONS': {
      const rolesKnown = count(project.roles) + count(e.rolesInfo?.userRoles);
      const permsKnown = count(project.permissions) + count(e.rolesInfo?.permissions) + count(e.rolesInfo?.accessRules);
      if (rolesKnown) collected.push('roles');
      if (permsKnown) collected.push('permissions');
      if (!rolesKnown) missing.push('What user roles exist?');
      // Roles alone are enough; permissions are a bonus captured via follow-up.
      const complete = rolesKnown >= 1;
      return result(complete, collected, missing, complete ? 'ROLES_CAPTURED' : 'NEEDS_ROLES');
    }

    case 'FUNCTIONAL_REQUIREMENTS': {
      if (stageRequirements >= 1) collected.push('functional_requirement');
      if (stageRequirements >= 2) collected.push('multiple_features');
      if (!collected.length) missing.push('Describe one or more core features the system must provide.');
      // At least one explicit functional capability completes the stage;
      // additional features are gathered through follow-ups / later answers.
      return result(stageRequirements >= 1, collected, missing,
        stageRequirements >= 1 ? 'FUNCTIONAL_REQS_CAPTURED' : 'NEEDS_FUNCTIONAL_REQUIREMENT');
    }

    case 'NON_FUNCTIONAL_REQUIREMENTS': {
      if (stageRequirements >= 1) collected.push('quality_attribute');
      if (!collected.length) missing.push('What performance, security, availability, or usability targets apply?');
      // NFR stage is optional-light: complete if the user gave any NFR OR
      // explicitly chose to provide none (handled by SKIP). We do NOT force a
      // fabricated NFR; one valid quality requirement completes it.
      return result(stageRequirements >= 1, collected, missing,
        stageRequirements >= 1 ? 'NFR_CAPTURED' : 'NEEDS_NFR');
    }

    case 'EXTERNAL_INTERFACES': {
      const intf = count(project.externalInterfaces) + count(e.interfacesInfo?.interfaces) +
        stageRequirements;
      if (intf) collected.push('external_interface');
      if (!collected.length) missing.push('Which third-party APIs, gateways, or services integrate with the system? (Skip if none.)');
      return result(intf >= 1, collected, missing, intf >= 1 ? 'INTERFACES_CAPTURED' : 'NEEDS_INTERFACES');
    }

    case 'CONSTRAINTS': {
      const con = count(project.constraints) + count(e.constraintsInfo?.technologyConstraints) +
        stageRequirements;
      if (con) collected.push('constraint');
      if (!con) missing.push('Are there mandated technologies, compliance rules, budget or timeline constraints? (Skip if none.)');
      return result(con >= 1, collected, missing, con >= 1 ? 'CONSTRAINTS_CAPTURED' : 'NEEDS_CONSTRAINTS');
    }

    case 'ASSUMPTIONS_AND_DEPENDENCIES': {
      const dep = count(project.dependencies) + count(e.dependenciesInfo?.dependencies) +
        count(project.assumptions) + stageRequirements;
      if (dep) collected.push('dependency_or_assumption');
      if (!dep) missing.push('What external services or assumptions does the project rely on? (Skip if none.)');
      return result(dep >= 1, collected, missing, dep >= 1 ? 'DEPENDENCIES_CAPTURED' : 'NEEDS_DEPENDENCIES');
    }

    case 'REVIEW_AND_CONFIRMATION':
      return { complete: true, reason: 'REVIEW_STAGE', collectedFields: [], missingFields: [] };

    default:
      return { complete: false, reason: 'UNKNOWN_STAGE', collectedFields: [], missingFields: [] };
  }
}

function result(complete, collected, missing, reason) {
  return { complete, reason, collectedFields: collected, missingFields: missing };
}

module.exports = { evaluateStageCompletion, SECTIONS_ENTITY_KNOWLEDGE };
