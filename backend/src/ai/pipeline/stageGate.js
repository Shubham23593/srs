/**
 * ============================================================================
 * STAGE GATE — Interview stage completeness & advancement logic
 * ============================================================================
 *
 * Advancement depends on whether the CURRENT stage has gathered sufficient,
 * stage-appropriate information (explicit user SKIP always allowed).
 *
 * This module is deterministic and inspects:
 *   - the current stage
 *   - structured knowledge extracted this turn (entities)
 *   - project knowledge already persisted / merged
 *   - requirements captured for this stage
 *   - whether the turn was out-of-scope / user-skipped
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
 * @param {object} ctx.entities          - entities extracted this turn
 * @param {object} ctx.project           - persisted / merged project knowledge
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
      // Need substantive project description/scope/objective/problemStatement knowledge.
      const hasProblem = Boolean(project.problemStatement || e.projectInfo?.problemStatement);
      const hasDesc = Boolean(project.description || e.projectInfo?.projectContext);
      const hasScope = Boolean(project.scope || e.projectInfo?.projectScope);
      const hasObjective = count(project.objectives) > 0 || Boolean(project.primaryObjective || e.projectInfo?.primaryObjective);

      if (hasProblem || hasDesc || hasScope) collected.push('project_description');
      if (hasObjective) collected.push('objective');

      if (!collected.length) {
        missing.push('What is the core problem and primary objective of this project?');
      }

      // Any substantive statement about problem/objective completes Stage 1.
      const complete = collected.length >= 1 || hasProblem || hasDesc || hasScope;
      return result(complete, collected, missing, complete ? 'PROJECT_INFO_CAPTURED' : 'NEEDS_PROJECT_INFO');
    }

    case 'STAKEHOLDERS_AND_USERS': {
      const usersInTurn = new Set([...(e.stakeholdersInfo?.primaryUsers || []), ...(e.stakeholdersInfo?.beneficiaries || [])]);
      const stkInTurn = new Set([...(e.stakeholdersInfo?.stakeholders || []), ...(e.stakeholdersInfo?.administrators || []), ...(e.stakeholdersInfo?.partnerOrganizations || [])]);

      const storedUsers = new Set((project.targetUsers || []).map(u => String(u).toLowerCase().trim()));
      const storedStakeholders = new Set((project.stakeholders || []).map(s => String(s).toLowerCase().trim()));

      const allUsers = new Set([...usersInTurn, ...storedUsers]);
      const allStakeholders = new Set([...stkInTurn, ...storedStakeholders]);
      const totalDistinct = new Set([...allUsers, ...allStakeholders]).size;

      const hasUsers = allUsers.size > 0;
      const hasStakeholders = allStakeholders.size > 0;

      if (hasUsers) collected.push('primary_users');
      if (hasStakeholders) collected.push('stakeholders');

      if (!hasUsers) {
        missing.push('Who are the primary end users and key beneficiaries for this system?');
      }
      if (!hasStakeholders || totalDistinct < 3) {
        missing.push('Are there also field workers, operators, supervisors, or partner organizations who will interact with or benefit from the system?');
      }

      // Complete when comprehensive stakeholders are captured (at least 3 distinct groups across users, operators, and administrators)
      const complete = (hasUsers && hasStakeholders && totalDistinct >= 3) || totalDistinct >= 4;
      return result(complete, collected, missing, complete ? 'STAKEHOLDERS_CAPTURED' : 'NEEDS_STAKEHOLDERS');
    }

    case 'USER_ROLES_AND_PERMISSIONS': {
      const rolesKnown = count(project.roles) + count(e.rolesInfo?.userRoles);
      const permsKnown = count(project.permissions) + count(e.rolesInfo?.permissions) + count(e.rolesInfo?.accessRules);

      if (rolesKnown > 0) collected.push('roles');
      if (permsKnown > 0) collected.push('permissions');

      if (!rolesKnown) {
        missing.push('What specific user roles will interact with this system?');
      } else if (!permsKnown) {
        missing.push('What specific permissions, access rights, or operational boundaries should each role have?');
      }

      // Complete if roles and permissions are known
      const complete = (rolesKnown >= 1 && permsKnown >= 1);
      return result(complete, collected, missing, complete ? 'ROLES_AND_PERMISSIONS_CAPTURED' : (!rolesKnown ? 'NEEDS_ROLES' : 'NEEDS_PERMISSIONS'));
    }

    case 'FUNCTIONAL_REQUIREMENTS': {
      if (stageRequirements >= 1) collected.push('functional_requirement');
      if (stageRequirements >= 2) collected.push('multiple_features');

      if (!collected.length) {
        missing.push('What core functional features or workflows must the system provide?');
      }

      const complete = stageRequirements >= 1;
      return result(complete, collected, missing, complete ? 'FUNCTIONAL_REQS_CAPTURED' : 'NEEDS_FUNCTIONAL_REQUIREMENT');
    }

    case 'NON_FUNCTIONAL_REQUIREMENTS': {
      if (stageRequirements >= 1) collected.push('quality_attribute');

      if (!collected.length) {
        missing.push('What performance, security, availability, or backup targets apply?');
      }

      // At least 1 valid NFR requirement or quality metric completes the stage.
      const complete = stageRequirements >= 1;
      return result(complete, collected, missing, complete ? 'NFR_CAPTURED' : 'NEEDS_NFR');
    }

    case 'EXTERNAL_INTERFACES': {
      const intfCount = count(project.externalInterfaces) + count(e.interfacesInfo?.interfaces) + stageRequirements;
      if (intfCount > 0) collected.push('external_interface');

      if (!collected.length) {
        missing.push('What third-party APIs, hardware/sensors, gateways, or services must connect with the system?');
      }

      const complete = intfCount >= 1;
      return result(complete, collected, missing, complete ? 'INTERFACES_CAPTURED' : 'NEEDS_INTERFACES');
    }

    case 'CONSTRAINTS': {
      const conCount = count(project.constraints) + count(e.constraintsInfo?.technologyConstraints) + stageRequirements;
      if (conCount > 0) collected.push('constraint');

      if (!collected.length) {
        missing.push('Are there mandated technologies, cloud platforms, timeline, or compliance constraints?');
      }

      const complete = conCount >= 1;
      return result(complete, collected, missing, complete ? 'CONSTRAINTS_CAPTURED' : 'NEEDS_CONSTRAINTS');
    }

    case 'ASSUMPTIONS_AND_DEPENDENCIES': {
      const depCount = count(project.dependencies) + count(e.dependenciesInfo?.dependencies) +
        count(project.assumptions) + stageRequirements;
      if (depCount > 0) collected.push('dependency_or_assumption');

      if (!collected.length) {
        missing.push('What operational assumptions or external dependencies does the project rely upon?');
      }

      const complete = depCount >= 1;
      return result(complete, collected, missing, complete ? 'DEPENDENCIES_CAPTURED' : 'NEEDS_DEPENDENCIES');
    }

    case 'REVIEW_AND_CONFIRMATION':
      return { complete: true, reason: 'REVIEW_STAGE', collectedFields: ['all_sections_reviewed'], missingFields: [] };

    default:
      return { complete: false, reason: 'UNKNOWN_STAGE', collectedFields: [], missingFields: [] };
  }
}

function result(complete, collected, missing, reason) {
  return { complete, reason, collectedFields: collected, missingFields: missing };
}

module.exports = { evaluateStageCompletion, SECTIONS_ENTITY_KNOWLEDGE };
