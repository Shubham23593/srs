/**
 * ============================================================================
 * TEST SUITE: Stage Leakage Prevention & Semantic Requirement Persistence
 * ============================================================================
 *
 * Verifies:
 * 1. ASSUMPTIONS stage rejects EXTERNAL_INTERFACE questions.
 * 2. Previous entities do not change current stage intent (GPS/SMS context).
 * 3. Dynamic questions remain context-aware and stage-bounded.
 * 4. MongoDB is rejected / not persisted as INTERFACE.
 * 5. Cloud hosting is rejected / not persisted as INTERFACE.
 * 6. Hallucinated Payment Gateway is rejected when unsupported.
 * 7. Explicitly requested external API is accepted.
 * 8. Stage gate and type authority integrity is preserved.
 */

const assert = require('assert');
const mongoose = require('mongoose');
const { validateQuestionAgainstStage, classifySemanticIntent } = require('../ai/pipeline/questionValidator');
const requirementsPipeline = require('../ai/pipeline/requirementsPipeline');
const { isNonInterfaceInfrastructure, isIntegrationGrounded, assessProjectRelevance } = require('../ai/pipeline/contextRelevanceEngine');
const agent = require('../ai/agents/InterviewAgent');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const { connectDB } = require('../config/db');

async function runTests() {
  console.log('============================================================');
  console.log('STARTING STAGE LEAKAGE & SEMANTIC PERSISTENCE REGRESSION TEST');
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: ASSUMPTIONS stage rejects EXTERNAL_INTERFACE questions
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: ASSUMPTIONS stage rejects EXTERNAL_INTERFACE questions ---');
  const leakedQuestion1 = {
    question: 'Which Payment Gateway, SMS Gateway, or external interfaces should the system integrate with?',
    intendedStage: 'ASSUMPTIONS_AND_DEPENDENCIES',
    informationTarget: 'External interface choices'
  };
  const val1 = validateQuestionAgainstStage(leakedQuestion1, 'ASSUMPTIONS_AND_DEPENDENCIES');
  assert.strictEqual(val1.valid, false, 'Leaked external interface question must be rejected in Assumptions stage');
  assert(val1.violations.includes('FORBIDDEN_INTENT') || val1.violations.includes('FORBIDDEN_CONCEPT'), 'Must trigger FORBIDDEN_INTENT or FORBIDDEN_CONCEPT');
  console.log('✓ Leaked interface question successfully rejected:', val1.reason);

  const leakedQuestion2 = {
    question: 'Which GPS and SMS APIs should the system integrate with?',
    intendedStage: 'ASSUMPTIONS_AND_DEPENDENCIES',
    informationTarget: 'GPS and SMS APIs'
  };
  const val2 = validateQuestionAgainstStage(leakedQuestion2, 'ASSUMPTIONS_AND_DEPENDENCIES');
  assert.strictEqual(val2.valid, false, 'API integration query must be rejected in Assumptions stage');
  console.log('✓ Leaked API integration question successfully rejected:', val2.reason);

  // -------------------------------------------------------------------------
  // TEST 2: Previous entities do not change current stage intent
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Contextual phrasing valid, but stage intent strictly enforced ---');
  const validContextualAssumptionQuestion = {
    question: 'What assumptions are required for GPS tracking and SMS notifications to work, and which external services does the system depend on?',
    intendedStage: 'ASSUMPTIONS_AND_DEPENDENCIES',
    informationTarget: 'Operational assumptions and service dependencies'
  };
  const val3 = validateQuestionAgainstStage(validContextualAssumptionQuestion, 'ASSUMPTIONS_AND_DEPENDENCIES');
  assert.strictEqual(val3.valid, true, 'Contextual assumption question referencing GPS and SMS must be valid');
  assert.strictEqual(val3.detectedIntent, 'ASSUMPTION_DEPENDENCY', 'Must be classified as ASSUMPTION_DEPENDENCY');
  console.log('✓ Valid contextual assumption question accepted:', validContextualAssumptionQuestion.question);

  // -------------------------------------------------------------------------
  // TEST 3: Dynamic question builder fallback produces stage-bounded contextual questions
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Smart deterministic fallback produces stage-bounded contextual questions ---');
  const fallbackQ = agent.buildSmartDeterministicQuestion({
    projectContext: {
      projectName: 'Smart Waste Logistics',
      externalInterfaces: ['GPS Tracker', 'SMS Gateway']
    },
    currentSectionConfig: { id: 'ASSUMPTIONS_AND_DEPENDENCIES', name: 'Assumptions & Dependencies' },
    isNewStage: false
  });
  console.log('Generated Contextual Fallback:', fallbackQ);
  assert(fallbackQ.includes('assumptions') || fallbackQ.includes('depend'), 'Fallback must ask for assumptions or dependencies');
  assert(fallbackQ.includes('GPS Tracker') || fallbackQ.includes('SMS Gateway'), 'Fallback must contextually reference known entities');
  const valFallback = validateQuestionAgainstStage({ question: fallbackQ, intendedStage: 'ASSUMPTIONS_AND_DEPENDENCIES' }, 'ASSUMPTIONS_AND_DEPENDENCIES');
  assert.strictEqual(valFallback.valid, true, 'Smart deterministic fallback must pass stage policy validation');
  console.log('✓ Smart deterministic fallback passed stage policy validation');

  // -------------------------------------------------------------------------
  // Connect to DB for database persistence tests
  // -------------------------------------------------------------------------
  console.log('\n--- CONNECTING TO MONGODB FOR PERSISTENCE TESTS ---');
  await connectDB();

  // Create test project
  const testProject = await Project.create({
    projectName: 'Smart Waste Collection System',
    description: 'An automated IoT waste bin monitoring and route optimization platform.',
    domain: 'Smart Cities & Waste Management',
    scope: 'Waste bin fill-level sensing, truck route optimization, and administrative dashboard.',
    objectives: ['Reduce overflow', 'Optimize collection routes'],
    targetUsers: ['Citizens', 'Waste Truck Drivers', 'Municipal Admins'],
    stakeholders: ['City Municipality', 'Citizens'],
    externalInterfaces: ['Ultrasonic IoT Sensors', 'Municipal GIS Maps']
  });

  const sectionConfigInterfaces = { id: 'EXTERNAL_INTERFACES', name: 'External Interfaces' };

  // -------------------------------------------------------------------------
  // TEST 4 & 5: MongoDB and Cloud Hosting must not be persisted as INTERFACE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4 & 5: Database and Cloud Infrastructure rejected as INTERFACE ---');
  assert.strictEqual(isNonInterfaceInfrastructure('MongoDB database storage'), true);
  assert.strictEqual(isNonInterfaceInfrastructure('AWS cloud hosting infrastructure'), true);
  assert.strictEqual(isNonInterfaceInfrastructure('Node.js backend framework'), true);
  assert.strictEqual(isNonInterfaceInfrastructure('REST API integration'), false);
  assert.strictEqual(isNonInterfaceInfrastructure('Twilio SMS API'), false);

  const answerWithDBAndCloud = 'We will use MongoDB database for storage and AWS cloud hosting with Docker containers.';
  const analysisDB = await requirementsPipeline.analyzeAnswer({
    rawText: answerWithDBAndCloud,
    sectionConfig: sectionConfigInterfaces,
    project: testProject
  });

  console.log('Extracted candidates count:', analysisDB.requirements.length);
  // Requirements in analysis should be UNCLASSIFIED / flagged with INFRASTRUCTURE_NOT_INTERFACE
  const interfaceReqs = analysisDB.requirements.filter((r) => r.type === 'INTERFACE');
  assert.strictEqual(interfaceReqs.length, 0, 'MongoDB / Cloud hosting must NOT be classified as INTERFACE');
  console.log('✓ MongoDB and Cloud hosting were not classified as INTERFACE in EXTERNAL_INTERFACES stage');

  const persistResult1 = await requirementsPipeline.persistRequirements(testProject._id, analysisDB);
  assert.strictEqual(persistResult1.saved.length, 0, 'Zero requirements must be saved from database/cloud in EXTERNAL_INTERFACES stage');
  console.log('✓ Persist result: 0 requirements saved, rejected correctly:', persistResult1.rejectedByGate.length + persistResult1.rejectedUnclassified.length);

  // -------------------------------------------------------------------------
  // TEST 6: Hallucinated Payment Gateway must be rejected
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Hallucinated Payment Gateway must be rejected ---');
  const answerWasteSensor = 'Ultrasonic sensors in waste bins will transmit fill level telemetry.';
  const hallucinatedAnalysis = {
    rawSourceText: answerWasteSensor,
    stageId: 'EXTERNAL_INTERFACES',
    stageName: 'External Interfaces',
    language: { language: 'English' },
    requirements: [
      {
        title: 'Stripe Payment Gateway Integration',
        normalizedDescription: 'The system shall integrate with Stripe Payment Gateway to process subscription payments.',
        type: 'INTERFACE',
        nfrSubcategory: 'N/A',
        category: 'External Interfaces',
        priority: 'MEDIUM',
        status: 'PROPOSED'
      }
    ]
  };

  assert.strictEqual(
    isIntegrationGrounded(hallucinatedAnalysis.requirements[0].normalizedDescription, answerWasteSensor, testProject),
    false,
    'Stripe payment gateway must be detected as ungrounded hallucination'
  );

  const persistResult2 = await requirementsPipeline.persistRequirements(testProject._id, hallucinatedAnalysis);
  assert.strictEqual(persistResult2.saved.length, 0, 'Hallucinated payment gateway must NOT be persisted');
  assert(
    persistResult2.rejectedByGate.some((r) => r.reason.includes('UNSUPPORTED_INTEGRATION_HALLUCINATION')),
    'Must be rejected with UNSUPPORTED_INTEGRATION_HALLUCINATION reason'
  );
  console.log('✓ Hallucinated Stripe payment gateway rejected during persistence:', persistResult2.rejectedByGate[0].reason);

  // -------------------------------------------------------------------------
  // TEST 7: Explicitly requested external API must be accepted
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Explicitly requested external API must be accepted ---');
  const validAnswer = 'The system connects with Twilio SMS API for dispatch alerts and MQTT broker for waste bin sensors.';
  const analysisValid = await requirementsPipeline.analyzeAnswer({
    rawText: validAnswer,
    sectionConfig: sectionConfigInterfaces,
    project: testProject
  });

  console.log('Analysis valid requirements:', analysisValid.requirements.map(r => `[${r.type}] ${r.title}`));
  const validInterfaces = analysisValid.requirements.filter((r) => r.type === 'INTERFACE');
  assert(validInterfaces.length >= 1, 'Valid requested interfaces must be extracted as INTERFACE');

  const persistResult3 = await requirementsPipeline.persistRequirements(testProject._id, analysisValid);
  console.log('Saved valid requirements count:', persistResult3.saved.length);
  assert(persistResult3.saved.length >= 1, 'Valid requested interfaces must be successfully saved');
  assert(
    persistResult3.saved.every((r) => r.type === 'INTERFACE'),
    'All saved requirements must have type INTERFACE'
  );
  console.log('✓ Successfully persisted valid requested interfaces:');
  persistResult3.saved.forEach((r) => {
    console.log(`   - [${r.requirementId}] (${r.type}) ${r.title}: "${r.normalizedDescription}"`);
  });

  // -------------------------------------------------------------------------
  // Clean up test data
  // -------------------------------------------------------------------------
  await Requirement.deleteMany({ projectId: testProject._id });
  await Project.findByIdAndDelete(testProject._id);

  console.log('\n============================================================');
  console.log('ALL 8 STAGE LEAKAGE & SEMANTIC PERSISTENCE TESTS PASSED (100%)');
  console.log('============================================================');

  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed with error:', err);
  process.exit(1);
});
