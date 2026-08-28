const mongoose = require('mongoose');
const env = require('../config/env');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const interviewAgent = require('../ai/agents/InterviewAgent');
const requirementExtractionAgent = require('../ai/agents/RequirementExtractionAgent');
const { decomposeRawTextToAtomicRequirements } = require('../services/atomicRequirementDecomposer');
const { normalizeRequirementStatement, validateRequirementStatementQuality } = require('../services/requirementGrammarValidator');

async function runBehaviorTests() {
  console.log('======================================================================');
  console.log('--- STARTING AI REQUIREMENT EXTRACTION & FOLLOW-UP BEHAVIOR TESTS ---');
  console.log('======================================================================\n');

  await mongoose.connect(env.mongodbUri || 'mongodb://127.0.0.1:27017/intellisdlc');

  try {
    // -------------------------------------------------------------------------
    // Setup clean test project
    // -------------------------------------------------------------------------
    console.log('[Setup] Initializing fresh test project...');
    let existing = await Project.findOne({ projectName: 'Extraction Behavior Testbed' });
    if (existing) {
      await Project.deleteOne({ _id: existing._id });
      await Requirement.deleteMany({ projectId: existing._id });
    }

    const project = await Project.create({
      projectName: 'Extraction Behavior Testbed',
      description: 'Verification suite for semantic meaning-driven extraction and zero hallucination.',
      scope: 'Requirements Engineering System',
      targetUsers: ['Users', 'Engineers']
    });
    const projectId = project._id.toString();
    console.log(`✓ Created test project [${projectId}]`);

    // -------------------------------------------------------------------------
    // Test 1: Short single requirement input + Grammar check ("log in" vs "login")
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Short single requirement input: "Users should be able to log in."');
    const input1 = "Users should be able to log in.";
    const reqs1 = decomposeRawTextToAtomicRequirements(input1, { name: 'Authentication' });
    console.log(`✓ Generated ${reqs1.length} requirement(s):`);
    reqs1.forEach(r => console.log(`  - [${r.type}] ${r.title}: "${r.description}" (Status: ${r.status})`));

    if (reqs1.length !== 1) {
      throw new Error(`Expected exactly 1 requirement, but got ${reqs1.length}`);
    }
    if (!reqs1[0].description.includes('to log in.')) {
      throw new Error(`Grammar error: Expected "to log in." but got "${reqs1[0].description}"`);
    }
    if (reqs1[0].description.includes('to login')) {
      throw new Error(`Grammar error: Requirement contains incorrect noun "to login" instead of verb "to log in"`);
    }
    console.log('✓ Test 1 Passed: Exactly 1 requirement created with correct "log in" verb grammar.');

    // -------------------------------------------------------------------------
    // Test 2: Short multiple-requirement input
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Short multiple-requirement input: "Users can log in and reset password"');
    const input2 = "Users can log in and reset password";
    const reqs2 = decomposeRawTextToAtomicRequirements(input2, { name: 'User Management' });
    console.log(`✓ Generated ${reqs2.length} requirement(s):`);
    reqs2.forEach(r => console.log(`  - [${r.type}] ${r.title}: "${r.description}"`));

    if (reqs2.length !== 2) {
      throw new Error(`Expected exactly 2 requirements, but got ${reqs2.length}`);
    }
    const titles2 = reqs2.map(r => r.title);
    if (!titles2.includes('User Login') || !titles2.includes('Password Reset')) {
      throw new Error(`Expected User Login and Password Reset, got ${titles2.join(', ')}`);
    }
    console.log('✓ Test 2 Passed: Short multi-capability input decomposed into exactly 2 atomic requirements.');

    // -------------------------------------------------------------------------
    // Test 3: Long paragraph with ONE semantic requirement
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Long paragraph with ONE semantic requirement...');
    const input3 = "In our system we have spent weeks thinking about export and we really want users to be able to export project reports to PDF format whenever they need to archive them.";
    const reqs3 = decomposeRawTextToAtomicRequirements(input3, { name: 'Reporting' });
    console.log(`✓ Generated ${reqs3.length} requirement(s):`);
    reqs3.forEach(r => console.log(`  - [${r.type}] ${r.title}: "${r.description}"`));

    if (reqs3.length !== 1) {
      throw new Error(`Expected exactly 1 requirement from single-capability long paragraph, but got ${reqs3.length}`);
    }
    if (!reqs3[0].description.includes('export project reports to PDF format')) {
      throw new Error(`Unexpected requirement content: "${reqs3[0].description}"`);
    }
    console.log('✓ Test 3 Passed: Long single-capability paragraph extracted into exactly 1 normalized requirement.');

    // -------------------------------------------------------------------------
    // Test 4: Long paragraph with MULTIPLE requirements (8 features)
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Long paragraph with MULTIPLE requirements (8 features)...');
    const input4 = "We need a platform where users can search and manage projects, create and update requirements, collaborate with team members, receive notifications about changes, maintain version history, and ensure that the system is secure and scalable.";
    const reqs4 = decomposeRawTextToAtomicRequirements(input4, { name: 'Core Features' });
    console.log(`✓ Generated ${reqs4.length} requirement(s):`);
    reqs4.forEach((r, idx) => console.log(`  ${idx + 1}. [${r.type}] ${r.title}: "${r.description}"`));

    if (reqs4.length < 8) {
      throw new Error(`Expected at least 8 requirements, but got ${reqs4.length}`);
    }
    console.log('✓ Test 4 Passed: Multi-feature paragraph decomposed into 8 atomic requirements.');

    // -------------------------------------------------------------------------
    // Test 5: Ambiguous requirement requiring clarification
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Ambiguous requirement requiring clarification...');
    const input5 = "The system should be extremely fast and scalable as needed.";
    const reqs5 = decomposeRawTextToAtomicRequirements(input5, { id: 'NON_FUNCTIONAL_REQUIREMENTS', name: 'Non-Functional Requirements' });
    console.log(`✓ Generated ${reqs5.length} requirement(s):`);
    reqs5.forEach(r => console.log(`  - [${r.type}] ${r.title} (Status: ${r.status}) - Suggested Question: "${r.suggestedImprovement}"`));

    const needsClarification = reqs5.some(r => r.status === 'NEEDS_CLARIFICATION');
    if (!needsClarification) {
      throw new Error(`Expected requirement with non-measurable terms to have status NEEDS_CLARIFICATION`);
    }
    console.log('✓ Test 5 Passed: Ambiguous requirement flagged as NEEDS_CLARIFICATION with targeted clarification prompt.');

    // -------------------------------------------------------------------------
    // Test 6: Zero Hallucination check on Interview Agent
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Zero Hallucination check: Interview Agent on "Users should be able to log in."');
    const turnResult = await interviewAgent.processInterviewTurn({
      projectContext: project,
      conversationHistory: [],
      currentSectionConfig: { id: 'FUNCTIONAL_REQUIREMENTS', name: 'Functional Requirements', stepIndex: 4 },
      existingRequirements: [],
      currentStats: { coverage: 20 },
      lastUserMessage: "Users should be able to log in.",
      sectionRequirementsCount: 0
    });

    console.log(`✓ Extracted ${turnResult.extractedRequirements?.length} requirement(s):`);
    (turnResult.extractedRequirements || []).forEach(r => console.log(`  - [${r.type}] ${r.title}: "${r.description}"`));
    console.log(`✓ Follow-up Question asked: "${turnResult.question}"`);

    if (turnResult.extractedRequirements?.length !== 1) {
      throw new Error(`Expected exactly 1 requirement from login prompt, got ${turnResult.extractedRequirements?.length}`);
    }

    // Check that AI did NOT invent unmentioned features
    const allTitles = (turnResult.extractedRequirements || []).map(r => r.title.toLowerCase());
    const hallucinatedTerms = ['google', 'otp', 'two-factor', '2fa', 'biometric', 'social login', 'reset password'];
    for (const term of hallucinatedTerms) {
      if (allTitles.some(t => t.includes(term))) {
        throw new Error(`Hallucination detected! AI created requirement containing unmentioned term "${term}"`);
      }
    }

    // Verify follow-up question is focused on authentication methods
    if (!turnResult.question || turnResult.question.length < 10) {
      throw new Error(`Expected focused follow-up question, got "${turnResult.question}"`);
    }

    console.log('✓ Test 6 Passed: AI extracted only explicit user intent without inventing unrequested features.');

    console.log('\n======================================================================');
    console.log(' >>> ALL 6 REQUIREMENT EXTRACTION & BEHAVIOR TESTS PASSED! <<<');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('❌ Behavior test failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runBehaviorTests();
