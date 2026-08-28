const mongoose = require('mongoose');
const env = require('../config/env');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const TraceabilityLink = require('../models/TraceabilityLink');
const SRS = require('../models/SRS');
const analysisController = require('../controllers/analysis.controller');
const requirementController = require('../controllers/requirement.controller');
const embeddingService = require('../ai/EmbeddingService');

async function testMergeRequirementsFlow() {
  console.log('========================================================');
  console.log('--- STARTING MERGE REQUIREMENTS END-TO-END VERIFICATION ---');
  console.log('========================================================');

  await mongoose.connect(env.mongodbUri || 'mongodb://127.0.0.1:27017/intellisdlc');

  try {
    // 1. Create Clean Test Project
    console.log('\n[Step 1] Creating Test Project and Duplicate Requirements (FR-001 & FR-002)...');
    let project = await Project.findOne({ projectName: 'Merge Requirements Test Project' });
    if (project) {
      await Project.deleteOne({ _id: project._id });
      await Requirement.deleteMany({ projectId: project._id });
      await RequirementIssue.deleteMany({ projectId: project._id });
      await TraceabilityLink.deleteMany({ projectId: project._id });
      await SRS.deleteMany({ projectId: project._id });
    }

    project = await Project.create({
      projectName: 'Merge Requirements Test Project',
      description: 'Test platform for verifying requirements duplicate detection and intelligent merging.',
      scope: 'Event discovery and management',
      targetUsers: ['Students', 'Administrators'],
      status: 'DRAFT'
    });

    const projectId = project._id.toString();

    // Generate embeddings so cosine similarity triggers duplicate detection
    const emb1 = await embeddingService.generateEmbedding('Event Viewing: Students shall view upcoming events on the campus portal.');
    const emb2 = await embeddingService.generateEmbedding('Event Viewing and Browsing: Students shall browse and view upcoming events on the campus portal.');

    const req1 = await Requirement.create({
      projectId: project._id,
      requirementId: 'FR-001',
      title: 'Event Viewing',
      description: 'Students shall view upcoming events on the campus portal.',
      type: 'FUNCTIONAL',
      category: 'Core Features',
      priority: 'HIGH',
      status: 'APPROVED',
      validationStatus: 'VALID',
      embedding: emb1
    });

    const req2 = await Requirement.create({
      projectId: project._id,
      requirementId: 'FR-002',
      title: 'Event Viewing and Browsing',
      description: 'Students shall browse and view upcoming events on the campus portal with details.',
      type: 'FUNCTIONAL',
      category: 'Core Features',
      priority: 'MEDIUM',
      status: 'APPROVED',
      validationStatus: 'VALID',
      embedding: emb2
    });

    // Also add a non-duplicate requirement FR-003 to test catalog counts
    const emb3 = await embeddingService.generateEmbedding('User Authentication: Users shall securely log in using student email.');
    const req3 = await Requirement.create({
      projectId: project._id,
      requirementId: 'FR-003',
      title: 'User Authentication',
      description: 'Users shall securely log in using student email and multi-factor authentication.',
      type: 'FUNCTIONAL',
      category: 'Security',
      priority: 'HIGH',
      status: 'APPROVED',
      validationStatus: 'VALID',
      embedding: emb3
    });

    console.log(`✓ Created 3 initial active requirements: FR-001, FR-002, FR-003`);

    // Verify initial active requirements count
    let reqResData = null;
    const reqResMock = { json: (d) => { reqResData = d; }, status: () => reqResMock };
    await requirementController.getRequirements({ params: { id: projectId }, query: {} }, reqResMock, (e) => { if (e) throw e; });
    console.log(`✓ Initial active requirements count in catalog: ${reqResData.count}`);
    if (reqResData.count !== 3) {
      throw new Error(`Expected 3 initial active requirements, got ${reqResData.count}`);
    }

    // 2. Run Quality Audit to detect duplicates
    console.log('\n[Step 2] Running Quality Audit (Cosine Similarity)...');
    let analysisResData = null;
    const analysisResMock = { json: (d) => { analysisResData = d; }, status: () => analysisResMock };
    await analysisController.analyzeProjectRequirements({ params: { id: projectId } }, analysisResMock, (e) => { if (e) throw e; });

    console.log(`✓ Quality Audit finished. Found ${analysisResData.count} issues.`);
    const dupIssue = analysisResData.data.find(iss => iss.issueType === 'DUPLICATE' && iss.relatedRequirementIds?.includes('FR-001') && iss.relatedRequirementIds?.includes('FR-002'));

    if (!dupIssue) {
      console.log('Issues found:', analysisResData.data);
      throw new Error('Duplicate issue between FR-001 and FR-002 was not detected!');
    }
    console.log(`✓ Detected duplicate issue [${dupIssue.issueId}]: "${dupIssue.description}"`);
    console.log(`  Related Reqs: ${dupIssue.relatedRequirementIds.join(', ')}, Similarity: ${(dupIssue.similarityScore * 100).toFixed(0)}%`);

    // 3. Resolve Issue via Merge Requirements
    console.log('\n[Step 3] Calling resolveIssue with status="MERGED"...');
    let resolveResData = null;
    const resolveResMock = { json: (d) => { resolveResData = d; }, status: () => resolveResMock };
    await analysisController.resolveIssue({
      params: { id: dupIssue._id.toString() },
      body: {
        status: 'MERGED',
        resolutionNotes: 'Merged duplicate specifications into primary requirement.',
        primaryRequirementId: 'FR-001',
        secondaryRequirementId: 'FR-002'
      }
    }, resolveResMock, (e) => { if (e) throw e; });

    console.log('✓ Merge response message:', resolveResData.message);
    console.log('✓ Updated Issue status:', resolveResData.data?.status);

    if (resolveResData.data?.status !== 'MERGED') {
      throw new Error(`Expected issue status to be MERGED, got ${resolveResData.data?.status}`);
    }

    // 4. Verify Database Persistence & Requirements State
    console.log('\n[Step 4] Verifying Database State Persistence after Merge...');
    const updatedFR1 = await Requirement.findOne({ projectId: project._id, requirementId: 'FR-001' });
    const deprecatedFR2 = await Requirement.findOne({ projectId: project._id, requirementId: 'FR-002' });

    console.log('  Surviving FR-001 Title:', updatedFR1.title);
    console.log('  Surviving FR-001 Description:', updatedFR1.description);
    console.log('  Surviving FR-001 Priority:', updatedFR1.priority);
    console.log('  Surviving FR-001 Status:', updatedFR1.status);

    console.log('  Deprecated FR-002 Status:', deprecatedFR2.status);
    console.log('  Deprecated FR-002 Title:', deprecatedFR2.title);

    if (!updatedFR1.description.toLowerCase().includes('shall')) {
      throw new Error('FR-001 description does not follow "The system shall..." standard!');
    }
    if (deprecatedFR2.status !== 'DEPRECATED') {
      throw new Error(`Expected FR-002 to have status DEPRECATED, got ${deprecatedFR2.status}`);
    }

    // 5. Verify Requirements Catalog API excludes deprecated requirements
    console.log('\n[Step 5] Re-fetching Requirements Catalog to verify active count & listing...');
    let catalogData = null;
    const catalogMock = { json: (d) => { catalogData = d; }, status: () => catalogMock };
    await requirementController.getRequirements({ params: { id: projectId }, query: {} }, catalogMock, (e) => { if (e) throw e; });

    console.log(`✓ Active Requirements in Catalog: ${catalogData.count} (${catalogData.data.map(r => r.requirementId).join(', ')})`);
    if (catalogData.count !== 2) {
      throw new Error(`Expected active count to be 2 after merge, got ${catalogData.count}`);
    }
    if (catalogData.data.some(r => r.requirementId === 'FR-002')) {
      throw new Error('FR-002 should not be present in active catalog!');
    }
    if (!catalogData.data.some(r => r.requirementId === 'FR-001')) {
      throw new Error('FR-001 should be present in active catalog!');
    }

    // 6. Verify Error Handling: Attempt to merge non-existent requirements
    console.log('\n[Step 6] Testing Error Handling on Invalid Merge Input...');
    let errorCaught = false;
    try {
      await analysisController.resolveIssue({
        params: { id: dupIssue._id.toString() },
        body: {
          status: 'MERGED',
          primaryRequirementId: 'FR-999',
          secondaryRequirementId: 'FR-888'
        }
      }, {
        status: (code) => {
          if (code >= 400) errorCaught = true;
          return { json: (d) => {} };
        },
        json: () => {}
      }, (err) => {
        if (err) errorCaught = true;
      });
    } catch (e) {
      errorCaught = true;
    }
    console.log('✓ Error properly caught on invalid requirement IDs:', errorCaught);
    if (!errorCaught) {
      throw new Error('Expected invalid merge to fail gracefully with error!');
    }

    console.log('\n========================================================');
    console.log(' >>> ALL MERGE REQUIREMENTS TESTS PASSED SUCCESSFULLY! <<<');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

testMergeRequirementsFlow();
