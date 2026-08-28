const mongoose = require('mongoose');
const env = require('../config/env');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const TraceabilityLink = require('../models/TraceabilityLink');
const SRS = require('../models/SRS');
const interviewAgent = require('../ai/agents/InterviewAgent');
const requirementExtractionAgent = require('../ai/agents/RequirementExtractionAgent');
const srsGenerationAgent = require('../ai/agents/SRSGenerationAgent');
const srsSyncService = require('../services/srsSyncService');
const { decomposeRawTextToAtomicRequirements, decomposeAndNormalizeRequirements } = require('../services/atomicRequirementDecomposer');

async function runAtomicExtractionTest() {
  console.log('======================================================================');
  console.log('--- STARTING ATOMIC REQUIREMENT EXTRACTION & DECOMPOSITION TEST ---');
  console.log('======================================================================\n');

  await mongoose.connect(env.mongodbUri || 'mongodb://127.0.0.1:27017/intellisdlc');

  try {
    // -------------------------------------------------------------------------
    // Setup clean test project
    // -------------------------------------------------------------------------
    console.log('[Setup] Initializing fresh test project...');
    let existingProject = await Project.findOne({ projectName: 'Atomic Extraction Test Project' });
    if (existingProject) {
      await Project.deleteOne({ _id: existingProject._id });
      await Requirement.deleteMany({ projectId: existingProject._id });
      await RequirementIssue.deleteMany({ projectId: existingProject._id });
      await TraceabilityLink.deleteMany({ projectId: existingProject._id });
      await SRS.deleteMany({ projectId: existingProject._id });
    }

    const project = await Project.create({
      projectName: 'Atomic Extraction Test Project',
      description: 'Testbed for verifying semantic decomposition of user responses into atomic requirements.',
      scope: 'Collaborative Requirements Engineering & Management Platform',
      targetUsers: ['Engineers', 'Product Managers', 'Security Officers'],
      status: 'DRAFT'
    });
    const projectId = project._id.toString();
    console.log(`✓ Created test project [${projectId}]`);

    // -------------------------------------------------------------------------
    // Test Case 1: Pure Semantic Decomposer Unit Test
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Testing Semantic Decomposer on user multi-requirement paragraph...');
    const rawUserInput = "We need a platform where users can search and manage projects, create and update requirements, collaborate with team members, receive notifications about changes, maintain version history, and ensure that the system is secure and scalable.";
    console.log(`Input Paragraph (${rawUserInput.length} chars):\n"${rawUserInput}"\n`);

    const decomposedItems = decomposeRawTextToAtomicRequirements(rawUserInput, { name: 'Core Features' }, project);
    console.log(`✓ Decomposed into ${decomposedItems.length} distinct atomic requirements:`);
    decomposedItems.forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.type}${item.nfrSubcategory !== 'N/A' ? ` / ${item.nfrSubcategory}` : ''}] ${item.title}: "${item.description}"`);
    });

    if (decomposedItems.length < 6) {
      throw new Error(`Expected at least 6 atomic requirements from the paragraph, but got ${decomposedItems.length}`);
    }

    // Verify none of the descriptions copied the entire paragraph
    for (const item of decomposedItems) {
      if (item.description.includes('collaborate with team members, receive notifications about changes, maintain version history')) {
        throw new Error(`Requirement statement contains un-decomposed raw paragraph: "${item.description}"`);
      }
    }
    console.log('✓ All decomposed items are strictly atomic (single-action statements).');

    // -------------------------------------------------------------------------
    // Test Case 2: RequirementExtractionAgent Integration
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Testing RequirementExtractionAgent.extractRequirements...');
    const extractedList = await requirementExtractionAgent.extractRequirements(rawUserInput, project, 1);
    console.log(`✓ Extraction Agent generated ${extractedList.length} structured requirements:`);
    extractedList.forEach(r => {
      console.log(`  - [${r.requirementId}] ${r.title} (${r.type}): "${r.description}"`);
    });

    if (extractedList.length < 6) {
      throw new Error(`Extraction agent failed to decompose paragraph into at least 6 atomic requirements! Got: ${extractedList.length}`);
    }

    // Save to database
    for (const r of extractedList) {
      await Requirement.create({
        ...r,
        projectId
      });
    }

    // -------------------------------------------------------------------------
    // Test Case 3: Requirements Catalog & DB Verification
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Verifying Requirements Catalog stored state...');
    const catalogReqs = await Requirement.find({ projectId, status: { $ne: 'DEPRECATED' } }).sort({ requirementId: 1 });
    console.log(`✓ Total active requirements in Catalog: ${catalogReqs.length}`);

    const frs = catalogReqs.filter(r => r.type === 'FUNCTIONAL');
    const nfrs = catalogReqs.filter(r => r.type === 'NON_FUNCTIONAL');
    console.log(`  • Functional Requirements (${frs.length}): ${frs.map(f => f.requirementId).join(', ')}`);
    console.log(`  • Non-Functional Requirements (${nfrs.length}): ${nfrs.map(n => n.requirementId).join(', ')}`);

    if (frs.length < 4) {
      throw new Error(`Expected at least 4 Functional Requirements, found ${frs.length}`);
    }
    if (nfrs.length < 2) {
      throw new Error(`Expected at least 2 Non-Functional Requirements (Security & Scalability), found ${nfrs.length}`);
    }

    // -------------------------------------------------------------------------
    // Test Case 4: SRS Generation from Atomic Requirements
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Generating SRS and verifying Section 3 / Section 5 atomic mapping...');
    const srsData = await srsGenerationAgent.generateSRS(project, catalogReqs, '', []);
    
    // Check Section 3 (System Features)
    const sec3Features = srsData.section3_systemFeatures || [];
    const sec3FRs = sec3Features.flatMap(f => f.functionalRequirements);
    console.log(`✓ SRS Section 3 contains ${sec3Features.length} feature groups and ${sec3FRs.length} atomic functional requirements:`);
    sec3FRs.forEach(fr => {
      console.log(`  • [${fr.requirementId}] ${fr.title} — ${fr.statement}`);
    });

    if (sec3FRs.length !== frs.length) {
      throw new Error(`SRS Section 3 has ${sec3FRs.length} functional requirements, expected ${frs.length}`);
    }

    // Verify Section 3 does NOT contain the raw un-split user paragraph
    for (const fr of sec3FRs) {
      if (fr.statement.includes('maintain version history, and ensure that the system is secure and scalable')) {
        throw new Error(`SRS Section 3 statement contains un-decomposed raw paragraph! Got: "${fr.statement}"`);
      }
    }

    // Check Section 5 (Non-Functional Requirements)
    const sec5 = srsData.section5_otherNonfunctionalRequirements;
    console.log(`✓ SRS Section 5 Non-Functional mappings:`);
    console.log(`  • 5.1 Performance/Scalability: ${sec5.performanceRequirements?.substring(0, 100)}...`);
    console.log(`  • 5.3 Security: ${sec5.securityRequirements?.substring(0, 100)}...`);

    // -------------------------------------------------------------------------
    // Test Case 5: AI Interview Agent Integration with Compound Response
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Testing InterviewAgent.processInterviewTurn with compound answer...');
    const compoundInterviewAnswer = "Users should be able to create new tickets, assign tickets to developers, attach screenshot logs, filter tickets by status, export reports to CSV, and the system must encrypt ticket attachments at rest.";
    
    const turnResult = await interviewAgent.processInterviewTurn({
      projectContext: project,
      conversationHistory: [],
      currentSectionConfig: { id: 'FUNCTIONAL_REQUIREMENTS', name: 'Functional Requirements', stepIndex: 4 },
      existingRequirements: catalogReqs,
      currentStats: { coverage: 40 },
      lastUserMessage: compoundInterviewAnswer,
      sectionRequirementsCount: 0
    });

    console.log(`✓ Interview Agent decomposed answer into ${turnResult.extractedRequirements?.length} atomic requirements:`);
    (turnResult.extractedRequirements || []).forEach(r => {
      console.log(`  • [${r.type}] ${r.title}: "${r.description}"`);
    });

    if (!turnResult.extractedRequirements || turnResult.extractedRequirements.length < 5) {
      throw new Error(`Expected at least 5 extracted atomic requirements from compound interview answer, got ${turnResult.extractedRequirements?.length}`);
    }

    console.log('\n======================================================================');
    console.log(' >>> ALL ATOMIC EXTRACTION & DECOMPOSITION TESTS PASSED! <<<');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('❌ Atomic extraction verification failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runAtomicExtractionTest();
