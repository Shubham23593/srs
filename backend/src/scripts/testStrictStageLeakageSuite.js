/**
 * ============================================================================
 * STRICT STAGE LEAKAGE COMPREHENSIVE REGRESSION TEST SUITE
 * ============================================================================
 *
 * Verifies that the AI Interview Question Pipeline has absolute stage authority
 * and zero tolerance for stage leakage, completed-stage repetition, or topic bleed.
 */

const assert = require('assert');
const { validateQuestionAgainstStage, classifySemanticIntent } = require('../ai/pipeline/questionValidator');
const agent = require('../ai/agents/InterviewAgent');

async function runTests() {
  console.log('============================================================');
  console.log('STARTING STRICT STAGE LEAKAGE COMPREHENSIVE REGRESSION SUITE');
  console.log('============================================================');

  const completedStagesFull = [
    'PROJECT_INFORMATION',
    'STAKEHOLDERS_AND_USERS',
    'USER_ROLES_AND_PERMISSIONS'
  ];

  // -------------------------------------------------------------------------
  // TEST 1: THE EXACT USER SCENARIO BUG IN FUNCTIONAL_REQUIREMENTS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: User scenario bug in FUNCTIONAL_REQUIREMENTS ---');
  const userScreenshotQuestion = {
    question: 'Could you provide a short description of the permissions and access rules for each role in the Smart University Campus Management System, such as students, faculty members, department staff, university administrators, and maintenance staff?',
    intendedStage: 'FUNCTIONAL_REQUIREMENTS',
    informationTarget: 'Permissions and access rules for each role'
  };

  const v1 = validateQuestionAgainstStage(userScreenshotQuestion, 'FUNCTIONAL_REQUIREMENTS', {
    completedStages: completedStagesFull
  });
  console.log('Validation result for screenshot question in FR:', v1);
  assert.strictEqual(v1.valid, false, 'Permissions question in FUNCTIONAL_REQUIREMENTS must be REJECTED');
  assert(
    v1.violations.includes('COMPLETED_STAGE_REPETITION') || v1.violations.includes('FORBIDDEN_INTENT') || v1.violations.includes('FORBIDDEN_CONCEPT') || v1.violations.includes('DISALLOWED_INTENT'),
    'Must fail with stage leakage or completed stage violation'
  );
  console.log('✓ User scenario screenshot question successfully rejected with reason:', v1.reason);

  // -------------------------------------------------------------------------
  // TEST 2: PREVIOUS-STAGE LEAKAGE INTO FUNCTIONAL_REQUIREMENTS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Previous-stage leakage into FUNCTIONAL_REQUIREMENTS ---');
  const prevLeakedStakeholders = {
    question: 'Who are the primary stakeholders and user categories that will use the university system?',
    intendedStage: 'FUNCTIONAL_REQUIREMENTS'
  };
  const v2a = validateQuestionAgainstStage(prevLeakedStakeholders, 'FUNCTIONAL_REQUIREMENTS', {
    completedStages: completedStagesFull
  });
  assert.strictEqual(v2a.valid, false, 'Stakeholders question in FR must be REJECTED');
  console.log('✓ Stakeholder question in FR rejected:', v2a.reason);

  const prevLeakedProblem = {
    question: 'What is the primary problem statement and core business objective of Smart University?',
    intendedStage: 'FUNCTIONAL_REQUIREMENTS'
  };
  const v2b = validateQuestionAgainstStage(prevLeakedProblem, 'FUNCTIONAL_REQUIREMENTS', {
    completedStages: completedStagesFull
  });
  assert.strictEqual(v2b.valid, false, 'Problem statement in FR must be REJECTED');
  console.log('✓ Problem statement in FR rejected:', v2b.reason);

  // -------------------------------------------------------------------------
  // TEST 3: FUTURE-STAGE LEAKAGE INTO EARLY STAGES
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Future-stage leakage into early stages ---');
  
  // Future NFR leaked into Stakeholders
  const nfrInStakeholders = {
    question: 'What is the expected response time latency and 99.9% uptime requirement for the system?',
    intendedStage: 'STAKEHOLDERS_AND_USERS'
  };
  const v3a = validateQuestionAgainstStage(nfrInStakeholders, 'STAKEHOLDERS_AND_USERS');
  assert.strictEqual(v3a.valid, false, 'NFR in Stakeholders must be REJECTED');
  console.log('✓ NFR in Stakeholders rejected:', v3a.reason);

  // Future External Interface leaked into User Roles
  const apiInRoles = {
    question: 'Which third-party REST APIs and payment gateways should the system connect with?',
    intendedStage: 'USER_ROLES_AND_PERMISSIONS'
  };
  const v3b = validateQuestionAgainstStage(apiInRoles, 'USER_ROLES_AND_PERMISSIONS');
  assert.strictEqual(v3b.valid, false, 'External API in User Roles must be REJECTED');
  console.log('✓ External API in User Roles rejected:', v3b.reason);

  // Future Constraints leaked into Functional Reqs
  const constraintInFR = {
    question: 'What is the fixed budget limit, delivery deadline, and mandated cloud hosting platform?',
    intendedStage: 'FUNCTIONAL_REQUIREMENTS'
  };
  const v3c = validateQuestionAgainstStage(constraintInFR, 'FUNCTIONAL_REQUIREMENTS', {
    completedStages: completedStagesFull
  });
  assert.strictEqual(v3c.valid, false, 'Constraint in FR must be REJECTED');
  console.log('✓ Constraint in FR rejected:', v3c.reason);

  // -------------------------------------------------------------------------
  // TEST 4: UNRELATED-STAGE LEAKAGE INTO LATER STAGES
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Unrelated-stage leakage into later stages ---');
  
  // Roles leaked into Constraints
  const rolesInConstraints = {
    question: 'What permissions and privileges do administrators and students have in the system?',
    intendedStage: 'CONSTRAINTS'
  };
  const v4a = validateQuestionAgainstStage(rolesInConstraints, 'CONSTRAINTS');
  assert.strictEqual(v4a.valid, false, 'Roles in Constraints must be REJECTED');
  console.log('✓ Roles in Constraints rejected:', v4a.reason);

  // Interface integration leaked into Assumptions
  const interfaceInAssumptions = {
    question: 'Which Payment Gateway, SMS Gateway, or external interfaces should the system integrate with?',
    intendedStage: 'ASSUMPTIONS_AND_DEPENDENCIES'
  };
  const v4b = validateQuestionAgainstStage(interfaceInAssumptions, 'ASSUMPTIONS_AND_DEPENDENCIES');
  assert.strictEqual(v4b.valid, false, 'Interface integration in Assumptions must be REJECTED');
  console.log('✓ Interface integration in Assumptions rejected:', v4b.reason);

  // -------------------------------------------------------------------------
  // TEST 5: VALID DYNAMIC CONTEXTUAL PHRASING IN FUNCTIONAL_REQUIREMENTS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Valid dynamic contextual phrasing in FUNCTIONAL_REQUIREMENTS ---');
  const validContextualFR = {
    question: 'For students, faculty members, and administrators, what core capabilities, actions, and workflows should they be able to perform in Smart University Campus Management System?',
    intendedStage: 'FUNCTIONAL_REQUIREMENTS',
    informationTarget: 'Core functional capabilities and workflows for identified roles'
  };
  const v5 = validateQuestionAgainstStage(validContextualFR, 'FUNCTIONAL_REQUIREMENTS', {
    completedStages: completedStagesFull
  });
  console.log('Validation result for valid contextual FR:', v5);
  assert.strictEqual(v5.valid, true, 'Valid contextual capability question must be ACCEPTED');
  assert.strictEqual(v5.detectedIntent, 'FUNCTIONAL_CAPABILITY', 'Detected intent must be FUNCTIONAL_CAPABILITY');
  console.log('✓ Valid dynamic contextual functional question accepted successfully');

  // -------------------------------------------------------------------------
  // TEST 6: SMART DETERMINISTIC FALLBACK FOR FUNCTIONAL_REQUIREMENTS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Smart deterministic fallback for FUNCTIONAL_REQUIREMENTS ---');
  const fallbackFR = agent.buildSmartDeterministicQuestion({
    projectContext: {
      projectName: 'Smart University Campus Management System',
      roles: ['students', 'faculty members', 'department staff', 'administrators']
    },
    currentSectionConfig: {
      id: 'FUNCTIONAL_REQUIREMENTS',
      name: 'Functional Requirements',
      stepIndex: 4
    },
    isNewStage: true
  });
  console.log('Generated Contextual FR Fallback:', fallbackFR);
  assert(fallbackFR.includes('students') && fallbackFR.includes('capabilities') || fallbackFR.includes('workflows') || fallbackFR.includes('actions'));

  const v6 = validateQuestionAgainstStage({ question: fallbackFR, intendedStage: 'FUNCTIONAL_REQUIREMENTS' }, 'FUNCTIONAL_REQUIREMENTS', {
    completedStages: completedStagesFull
  });
  assert.strictEqual(v6.valid, true, 'Fallback question must pass validation 100%');
  console.log('✓ Smart deterministic FR fallback passed stage policy validation');

  console.log('\n============================================================');
  console.log('ALL STRICT STAGE LEAKAGE REGRESSION TESTS PASSED (100%)');
  console.log('============================================================');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Suite Failed with error:', err);
    process.exit(1);
  });
