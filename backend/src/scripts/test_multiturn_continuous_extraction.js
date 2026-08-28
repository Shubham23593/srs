const mongoose = require('mongoose');
const env = require('../config/env');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const interviewAgent = require('../ai/agents/InterviewAgent');
const srsGenerationAgent = require('../ai/agents/SRSGenerationAgent');

async function runMultiTurnContinuousExtractionTest() {
  console.log('======================================================================');
  console.log('--- STARTING MULTI-TURN CONTINUOUS EXTRACTION VERIFICATION TEST ---');
  console.log('======================================================================\n');

  await mongoose.connect(env.mongodbUri || 'mongodb://127.0.0.1:27017/intellisdlc');

  try {
    // -------------------------------------------------------------------------
    // Setup clean test project
    // -------------------------------------------------------------------------
    console.log('[Setup] Initializing fresh test project...');
    let existing = await Project.findOne({ projectName: 'Multi-Turn Continuous Test' });
    if (existing) {
      await Project.deleteOne({ _id: existing._id });
      await Requirement.deleteMany({ projectId: existing._id });
    }

    const project = await Project.create({
      projectName: 'Multi-Turn Continuous Test',
      description: 'Testbed for verifying continuous multi-turn requirement accumulation throughout the AI interview.',
      scope: 'Multi-turn Requirements Platform',
      targetUsers: ['Users', 'Administrators']
    });
    const projectId = project._id.toString();
    console.log(`✓ Created test project [${projectId}]`);

    const sectionConfig = {
      id: 'FUNCTIONAL_REQUIREMENTS',
      name: 'Functional Requirements',
      stepIndex: 4,
      description: 'Specify core user workflows and system functions.'
    };

    // -------------------------------------------------------------------------
    // Turn 1: User provides only first requirement: "Users should be able to log in."
    // -------------------------------------------------------------------------
    console.log('\n[Turn 1] User Answer 1: "Users should be able to log in."');
    let existingReqs = await Requirement.find({ projectId, status: { $ne: 'DEPRECATED' } });
    
    const turn1Result = await interviewAgent.processInterviewTurn({
      projectContext: project,
      conversationHistory: [],
      currentSectionConfig: sectionConfig,
      existingRequirements: existingReqs,
      currentStats: { coverage: 15 },
      lastUserMessage: "Users should be able to log in.",
      sectionRequirementsCount: existingReqs.length
    });

    console.log(`✓ Turn 1 Extracted ${turn1Result.extractedRequirements?.length} requirement(s):`);
    for (const r of turn1Result.extractedRequirements) {
      const frCount = (await Requirement.countDocuments({ projectId, type: 'FUNCTIONAL' })) + 1;
      const reqId = `FR-${String(frCount).padStart(3, '0')}`;
      const saved = await Requirement.create({
        projectId,
        requirementId: reqId,
        title: r.title,
        description: r.description,
        type: r.type || 'FUNCTIONAL',
        status: r.status || 'PROPOSED',
        validationStatus: r.validationStatus || 'VALID',
        sourceText: "Users should be able to log in."
      });
      console.log(`  + Saved [${saved.requirementId}] ${saved.title}: "${saved.description}" (Status: ${saved.status})`);
    }

    let catalogAfterTurn1 = await Requirement.find({ projectId }).sort({ requirementId: 1 });
    if (catalogAfterTurn1.length !== 1 || catalogAfterTurn1[0].requirementId !== 'FR-001') {
      throw new Error(`Expected exactly 1 requirement (FR-001) after Turn 1, got ${catalogAfterTurn1.length}`);
    }
    console.log(`✓ Turn 1 Follow-up Question asked: "${turn1Result.question}"`);

    // -------------------------------------------------------------------------
    // Turn 2: User provides second requirement: "Users should be able to manage their profile."
    // -------------------------------------------------------------------------
    console.log('\n[Turn 2] User Answer 2: "Users should be able to manage their profile."');
    existingReqs = await Requirement.find({ projectId, status: { $ne: 'DEPRECATED' } });

    const turn2Result = await interviewAgent.processInterviewTurn({
      projectContext: project,
      conversationHistory: [
        { sender: 'USER', content: 'Users should be able to log in.' },
        { sender: 'AI', content: turn1Result.question }
      ],
      currentSectionConfig: sectionConfig,
      existingRequirements: existingReqs,
      currentStats: { coverage: 30 },
      lastUserMessage: "Users should be able to manage their profile.",
      sectionRequirementsCount: existingReqs.length
    });

    console.log(`✓ Turn 2 Extracted ${turn2Result.extractedRequirements?.length} requirement(s):`);
    for (const r of turn2Result.extractedRequirements) {
      const frCount = (await Requirement.countDocuments({ projectId, type: 'FUNCTIONAL' })) + 1;
      const reqId = `FR-${String(frCount).padStart(3, '0')}`;
      const saved = await Requirement.create({
        projectId,
        requirementId: reqId,
        title: r.title,
        description: r.description,
        type: r.type || 'FUNCTIONAL',
        status: r.status || 'PROPOSED',
        validationStatus: r.validationStatus || 'VALID',
        sourceText: "Users should be able to manage their profile."
      });
      console.log(`  + Saved [${saved.requirementId}] ${saved.title}: "${saved.description}" (Status: ${saved.status})`);
    }

    let catalogAfterTurn2 = await Requirement.find({ projectId }).sort({ requirementId: 1 });
    if (catalogAfterTurn2.length !== 2) {
      throw new Error(`Expected 2 requirements (FR-001, FR-002) after Turn 2, got ${catalogAfterTurn2.length}`);
    }
    console.log(`✓ Catalog now contains 2 requirements: ${catalogAfterTurn2.map(r => r.requirementId + ' (' + r.title + ')').join(', ')}`);

    // -------------------------------------------------------------------------
    // Turn 3: User provides third requirement: "The system should send notifications."
    // -------------------------------------------------------------------------
    console.log('\n[Turn 3] User Answer 3: "The system should send notifications."');
    existingReqs = await Requirement.find({ projectId, status: { $ne: 'DEPRECATED' } });

    const turn3Result = await interviewAgent.processInterviewTurn({
      projectContext: project,
      conversationHistory: [
        { sender: 'USER', content: 'Users should be able to log in.' },
        { sender: 'AI', content: turn1Result.question },
        { sender: 'USER', content: 'Users should be able to manage their profile.' },
        { sender: 'AI', content: turn2Result.question }
      ],
      currentSectionConfig: sectionConfig,
      existingRequirements: existingReqs,
      currentStats: { coverage: 45 },
      lastUserMessage: "The system should send notifications.",
      sectionRequirementsCount: existingReqs.length
    });

    console.log(`✓ Turn 3 Extracted ${turn3Result.extractedRequirements?.length} requirement(s):`);
    for (const r of turn3Result.extractedRequirements) {
      const frCount = (await Requirement.countDocuments({ projectId, type: 'FUNCTIONAL' })) + 1;
      const reqId = `FR-${String(frCount).padStart(3, '0')}`;
      const saved = await Requirement.create({
        projectId,
        requirementId: reqId,
        title: r.title,
        description: r.description,
        type: r.type || 'FUNCTIONAL',
        status: r.status || 'PROPOSED',
        validationStatus: r.validationStatus || 'VALID',
        sourceText: "The system should send notifications."
      });
      console.log(`  + Saved [${saved.requirementId}] ${saved.title}: "${saved.description}" (Status: ${saved.status})`);
    }

    let catalogAfterTurn3 = await Requirement.find({ projectId }).sort({ requirementId: 1 });
    console.log(`\n✓ Final Requirements Catalog contains ${catalogAfterTurn3.length} requirements:`);
    catalogAfterTurn3.forEach(r => {
      console.log(`  • [${r.requirementId}] ${r.title} — "${r.description}" (Status: ${r.status})`);
    });

    if (catalogAfterTurn3.length !== 3) {
      throw new Error(`Expected 3 accumulated requirements in catalog, got ${catalogAfterTurn3.length}`);
    }

    const reqIds = catalogAfterTurn3.map(r => r.requirementId);
    if (!reqIds.includes('FR-001') || !reqIds.includes('FR-002') || !reqIds.includes('FR-003')) {
      throw new Error(`Catalog missing expected sequential IDs: ${reqIds.join(', ')}`);
    }

    // -------------------------------------------------------------------------
    // Verify SRS Section 3 generation includes all accumulated requirements
    // -------------------------------------------------------------------------
    console.log('\n[Verification] Generating SRS from accumulated requirements...');
    const srsData = await srsGenerationAgent.generateSRS(project, catalogAfterTurn3, '', []);
    const sec3FRs = (srsData.section3_systemFeatures || []).flatMap(f => f.functionalRequirements);
    console.log(`✓ SRS Section 3 contains ${sec3FRs.length} functional requirements:`);
    sec3FRs.forEach(fr => {
      console.log(`  • [${fr.requirementId}] ${fr.title}: ${fr.statement}`);
    });

    if (sec3FRs.length !== 3) {
      throw new Error(`Expected 3 functional requirements in SRS Section 3, got ${sec3FRs.length}`);
    }

    console.log('\n======================================================================');
    console.log(' >>> MULTI-TURN CONTINUOUS EXTRACTION TEST PASSED SUCCESSFULLY! <<<');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('❌ Multi-turn continuous extraction test failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runMultiTurnContinuousExtractionTest();
