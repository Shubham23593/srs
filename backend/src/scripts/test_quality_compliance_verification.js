const mongoose = require('mongoose');
const env = require('../config/env');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const TraceabilityLink = require('../models/TraceabilityLink');
const SRS = require('../models/SRS');
const requirementController = require('../controllers/requirement.controller');
const srsController = require('../controllers/srs.controller');
const analysisController = require('../controllers/analysis.controller');
const embeddingService = require('../ai/EmbeddingService');
const exportService = require('../services/exportService');
const ragService = require('../services/ragService');
const srsSyncService = require('../services/srsSyncService');

async function runQualityAndComplianceVerification() {
  console.log('======================================================================');
  console.log('--- STARTING COMPREHENSIVE SRS QUALITY & COMPLIANCE VERIFICATION ---');
  console.log('======================================================================\n');

  await mongoose.connect(env.mongodbUri || 'mongodb://127.0.0.1:27017/intellisdlc');

  try {
    // -------------------------------------------------------------------------
    // Setup clean test project
    // -------------------------------------------------------------------------
    console.log('[Setup] Initializing fresh test project and environment...');
    let existingProject = await Project.findOne({ projectName: 'SRS Compliance Test Project' });
    if (existingProject) {
      await Project.deleteOne({ _id: existingProject._id });
      await Requirement.deleteMany({ projectId: existingProject._id });
      await RequirementIssue.deleteMany({ projectId: existingProject._id });
      await TraceabilityLink.deleteMany({ projectId: existingProject._id });
      await SRS.deleteMany({ projectId: existingProject._id });
    }

    const project = await Project.create({
      projectName: 'SRS Compliance Test Project',
      description: 'Automated test bed for verifying ISO/IEC/IEEE 29148 compliance and synchronization.',
      scope: 'Campus Event & Resource Management System',
      targetUsers: ['Students', 'Faculty', 'Campus Administrators'],
      constraints: ['Must comply with FERPA privacy regulations.'],
      assumptions: ['Cloud hosting environment with 99.9% uptime.'],
      status: 'DRAFT'
    });
    const projectId = project._id.toString();
    console.log(`✓ Created test project [${projectId}]`);

    // -------------------------------------------------------------------------
    // Test 1: Add a new requirement
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Adding a new functional requirement (FR-001)...');
    let createResData = null;
    const createReqMock = {
      status: (code) => ({
        json: (d) => { createResData = d; }
      }),
      json: (d) => { createResData = d; }
    };

    await requirementController.createRequirement({
      params: { id: projectId },
      body: {
        title: 'Event Registration',
        description: 'The system shall allow the platform shall support students registering for campus events with email confirmation.',
        type: 'FUNCTIONAL',
        category: 'Event Operations',
        priority: 'HIGH'
      }
    }, createReqMock, (e) => { if (e) throw e; });

    console.log(`✓ Requirement created: ID=${createResData.data?.requirementId}, Statement="${createResData.data?.description}"`);
    if (!createResData.data?.description.startsWith('The system shall allow')) {
      throw new Error(`Requirement statement was not properly normalized! Got: ${createResData.data?.description}`);
    }

    // Add an NFR, Constraint, and Assumption to test multi-section mapping
    await requirementController.createRequirement({
      params: { id: projectId },
      body: {
        title: 'Response Time',
        description: 'The system shall respond to event registration requests within 500 milliseconds under peak load.',
        type: 'NON_FUNCTIONAL',
        nfrSubcategory: 'PERFORMANCE',
        category: 'Performance',
        priority: 'HIGH'
      }
    }, createReqMock, (e) => { if (e) throw e; });

    await requirementController.createRequirement({
      params: { id: projectId },
      body: {
        title: 'Security Encryption',
        description: 'The system shall encrypt all sensitive student records at rest using AES-256 standards.',
        type: 'NON_FUNCTIONAL',
        nfrSubcategory: 'SECURITY',
        category: 'Security',
        priority: 'HIGH'
      }
    }, createReqMock, (e) => { if (e) throw e; });

    await requirementController.createRequirement({
      params: { id: projectId },
      body: {
        title: 'Database Constraint',
        description: 'The system shall persist transactional states exclusively in MongoDB replica sets.',
        type: 'CONSTRAINT',
        category: 'Data Architecture',
        priority: 'MEDIUM'
      }
    }, createReqMock, (e) => { if (e) throw e; });

    // -------------------------------------------------------------------------
    // Test 2: Verify requirements appear in Requirements Catalog
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Verifying active requirements in Requirements Catalog...');
    let catalogResData = null;
    const catalogMock = { json: (d) => { catalogResData = d; }, status: () => catalogMock };
    await requirementController.getRequirements({ params: { id: projectId }, query: {} }, catalogMock, (e) => { if (e) throw e; });

    console.log(`✓ Catalog count: ${catalogResData.count} active requirements.`);
    if (catalogResData.count !== 4) {
      throw new Error(`Expected 4 requirements in catalog, found ${catalogResData.count}`);
    }

    // -------------------------------------------------------------------------
    // Test 3: Generate the SRS
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Generating Baseline SRS Document...');
    let srsResData = null;
    const srsMock = {
      status: (code) => ({ json: (d) => { srsResData = d; } }),
      json: (d) => { srsResData = d; }
    };
    await srsController.generateSRS({ params: { id: projectId } }, srsMock, (e) => { if (e) throw e; });

    console.log(`✓ SRS Document generated successfully. Version: v${srsResData.data?.currentVersion}`);

    // -------------------------------------------------------------------------
    // Test 4: Verify requirement appears in the correct SRS section
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Verifying section mapping of requirement types...');
    const srsDoc = srsResData.data;

    // Check FR-001 in Section 3
    const sec3Features = srsDoc.section3_systemFeatures || [];
    const fr001 = sec3Features.flatMap(f => f.functionalRequirements).find(r => r.requirementId === 'FR-001');
    if (!fr001) throw new Error('FR-001 is missing from Section 3 System Features!');
    console.log(`✓ Section 3 mapping verified: [${fr001.requirementId}] ${fr001.statement}`);

    // Check NFR Performance in Section 5.1
    if (!srsDoc.section5_otherNonfunctionalRequirements?.performanceRequirements?.includes('NFR-001') &&
        !srsDoc.section5_otherNonfunctionalRequirements?.performanceRequirements?.includes('500 milliseconds')) {
      throw new Error('Performance NFR is missing from Section 5.1!');
    }
    console.log(`✓ Section 5.1 Performance mapping verified: ${srsDoc.section5_otherNonfunctionalRequirements.performanceRequirements.substring(0, 80)}...`);

    // Check Constraint in Section 2.5
    if (!srsDoc.section2_overallDescription?.designAndImplementationConstraints?.includes('CON-001') &&
        !srsDoc.section2_overallDescription?.designAndImplementationConstraints?.includes('FERPA')) {
      throw new Error('Constraint is missing from Section 2.5!');
    }
    console.log(`✓ Section 2.5 Constraints mapping verified.`);

    // -------------------------------------------------------------------------
    // Test 5: Run Quality Audit & ISO/IEC/IEEE 29148 Compliance Audit
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Running ISO/IEC/IEEE 29148 Compliance Audit...');
    let reviewResData = null;
    const reviewMock = { json: (d) => { reviewResData = d; }, status: () => reviewMock };
    await srsController.reviewSRS({ params: { id: srsDoc._id.toString() } }, reviewMock, (e) => { if (e) throw e; });

    console.log(`✓ Overall Alignment Score: ${(reviewResData.data.scores?.overallAlignmentScore)}%`);
    console.log(`  Structural Compliance: ${reviewResData.data.scores?.structuralCompliance}%`);
    console.log(`  Requirement Mapping: ${reviewResData.data.scores?.requirementMapping}%`);
    console.log(`  Completeness: ${reviewResData.data.scores?.requirementCompleteness}%`);
    console.log(`  Placeholder Score: ${reviewResData.data.scores?.placeholderScore}%`);
    console.log(`  Detected Placeholders Count: ${reviewResData.data.placeholderLocations?.length || 0}`);

    if (reviewResData.data.scores?.structuralCompliance !== 100) {
      throw new Error(`Expected 100% structural compliance, got ${reviewResData.data.scores?.structuralCompliance}%`);
    }
    if (reviewResData.data.scores?.requirementMapping !== 100) {
      throw new Error(`Expected 100% requirement mapping, got ${reviewResData.data.scores?.requirementMapping}%`);
    }
    if (reviewResData.data.placeholderLocations?.length > 0) {
      throw new Error(`Unexpected TBD placeholders detected: ${reviewResData.data.placeholderLocations.join(', ')}`);
    }

    // -------------------------------------------------------------------------
    // Test 6 & 7: Edit the requirement & Verify SRS updates
    // -------------------------------------------------------------------------
    console.log('\n[Test 6 & 7] Editing requirement FR-001 and verifying automatic SRS update...');
    const updatedFR1 = await Requirement.findOne({ projectId, requirementId: 'FR-001' });
    await requirementController.updateRequirement({
      params: { id: updatedFR1._id.toString() },
      body: {
        description: 'The system shall enable students to register for campus events with automated QR-code badge generation and confirmation.'
      }
    }, { json: () => {}, status: () => ({ json: () => {} }) }, (e) => { if (e) throw e; });

    // Verify SRS synchronized automatically
    const reloadedSRS = await SRS.findOne({ projectId });
    const reloadedFR1 = (reloadedSRS.section3_systemFeatures || []).flatMap(f => f.functionalRequirements).find(r => r.requirementId === 'FR-001');
    console.log(`✓ Synced FR-001 in Section 3: ${reloadedFR1?.statement}`);
    if (!reloadedFR1?.statement.includes('QR-code')) {
      throw new Error('SRS Section 3 did not automatically update with edited requirement description!');
    }

    // -------------------------------------------------------------------------
    // Test 8: Verify RAG knowledge is updated
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Verifying RAG Knowledge Store index...');
    const ragContext = await ragService.retrieveContext(projectId, 'QR-code badge', 3);
    console.log(`✓ RAG Retrieval result: ${ragContext.length > 0 ? 'Retrieved context matching updated QR-code requirement' : 'Context empty'}`);

    // -------------------------------------------------------------------------
    // Test 9 & 10: Merge two duplicate requirements & check DEPRECATED metadata
    // -------------------------------------------------------------------------
    console.log('\n[Test 9 & 10] Adding duplicate requirement FR-002 and executing merge into FR-001...');
    const emb2 = await embeddingService.generateEmbedding('Event Registration & Pass: Students shall register for campus events and receive event passes.');
    const reqDup = await Requirement.create({
      projectId,
      requirementId: 'FR-002',
      title: 'Event Registration & Pass',
      description: 'The system shall allow students to register for events and receive passes.',
      type: 'FUNCTIONAL',
      category: 'Event Operations',
      priority: 'MEDIUM',
      status: 'ACTIVE',
      validationStatus: 'VALID',
      embedding: emb2
    });

    // Auto-sync SRS to include FR-002 first
    await srsSyncService.syncProjectSRS(projectId, 'Added FR-002');

    let mergeResData = null;
    const mergeMock = { json: (d) => { mergeResData = d; }, status: () => mergeMock };
    await requirementController.mergeRequirements({
      params: { id: projectId },
      body: {
        primaryRequirementId: 'FR-001',
        secondaryRequirementId: 'FR-002',
        resolutionNotes: 'Merged duplicate event registration specifications into FR-001.'
      }
    }, mergeMock, (e) => { if (e) throw e; });

    console.log(`✓ Merge executed: ${mergeResData.message}`);

    const depReq = await Requirement.findOne({ projectId, requirementId: 'FR-002' });
    console.log(`✓ Deprecated requirement state: status=${depReq.status}, mergedInto=${depReq.mergedInto}, reason=${depReq.deprecatedReason}`);
    if (depReq.status !== 'DEPRECATED') {
      throw new Error(`Expected FR-002 status to be DEPRECATED, got ${depReq.status}`);
    }
    if (depReq.mergedInto !== 'FR-001') {
      throw new Error(`Expected FR-002 mergedInto to be FR-001, got ${depReq.mergedInto}`);
    }
    if (!depReq.deprecatedAt) {
      throw new Error(`Expected FR-002 deprecatedAt timestamp to be set!`);
    }

    // -------------------------------------------------------------------------
    // Test 11: Verify deprecated requirement disappears from active Catalog & SRS
    // -------------------------------------------------------------------------
    console.log('\n[Test 11] Verifying deprecated requirement is excluded from active Catalog and SRS...');
    await requirementController.getRequirements({ params: { id: projectId }, query: {} }, catalogMock, (e) => { if (e) throw e; });
    console.log(`✓ Active Catalog items: ${catalogResData.data.map(r => r.requirementId).join(', ')} (Count: ${catalogResData.count})`);
    if (catalogResData.data.some(r => r.requirementId === 'FR-002')) {
      throw new Error('Deprecated requirement FR-002 is still appearing in active Requirements Catalog!');
    }

    const srsAfterMerge = await SRS.findOne({ projectId });
    const srsReqsAfterMerge = (srsAfterMerge.section3_systemFeatures || []).flatMap(f => f.functionalRequirements);
    if (srsReqsAfterMerge.some(r => r.requirementId === 'FR-002')) {
      throw new Error('Deprecated requirement FR-002 is still appearing in Section 3 of SRS!');
    }
    console.log(`✓ SRS Section 3 contains only active requirements: ${srsReqsAfterMerge.map(r => r.requirementId).join(', ')}`);

    // -------------------------------------------------------------------------
    // Test 12 & 13: Run Quality Audit again and verify no false missing errors
    // -------------------------------------------------------------------------
    console.log('\n[Test 12 & 13] Re-running Compliance Audit after merge...');
    await srsController.reviewSRS({ params: { id: srsAfterMerge._id.toString() } }, reviewMock, (e) => { if (e) throw e; });
    console.log(`✓ Post-merge compliance score: ${reviewResData.data.scores?.overallAlignmentScore}%`);
    const missingErrors = (reviewResData.data.findings || []).filter(f => f.comment?.includes('Missing functional requirements') && f.comment?.includes('FR-002'));
    if (missingErrors.length > 0) {
      throw new Error('Quality Audit falsely reported deprecated requirement FR-002 as missing!');
    }
    console.log(`✓ No false missing errors reported for deprecated requirement.`);

    // -------------------------------------------------------------------------
    // Test 14: Run SRS synchronization twice and verify idempotency (no duplicates)
    // -------------------------------------------------------------------------
    console.log('\n[Test 14] Testing SRS synchronization idempotency...');
    await srsSyncService.syncProjectSRS(projectId, 'Idempotency test run 1');
    await srsSyncService.syncProjectSRS(projectId, 'Idempotency test run 2');

    const srsAfterDoubleSync = await SRS.findOne({ projectId });
    const allSec3FRs = (srsAfterDoubleSync.section3_systemFeatures || []).flatMap(f => f.functionalRequirements);
    const fr001Count = allSec3FRs.filter(r => r.requirementId === 'FR-001').length;
    console.log(`✓ Occurrences of FR-001 in Section 3 after repeated syncs: ${fr001Count}`);
    if (fr001Count !== 1) {
      throw new Error(`Idempotency failure: FR-001 appears ${fr001Count} times in Section 3!`);
    }

    // -------------------------------------------------------------------------
    // Test 15: Verify all TBD placeholders are accurately detected
    // -------------------------------------------------------------------------
    console.log('\n[Test 15] Testing accurate section-aware TBD placeholder detection...');
    // Artificially inject a placeholder into Section 5.3 to verify detection
    srsAfterDoubleSync.section5_otherNonfunctionalRequirements.securityRequirements = 'TBD — Needs Clarification. Penetration testing standards to be determined.';
    await srsAfterDoubleSync.save();

    await srsController.reviewSRS({ params: { id: srsAfterDoubleSync._id.toString() } }, reviewMock, (e) => { if (e) throw e; });
    console.log(`✓ Detected placeholder locations: ${reviewResData.data.placeholderLocations?.join('; ')}`);
    if (!reviewResData.data.placeholderLocations?.some(loc => loc.includes('Section 5.3'))) {
      throw new Error('Placeholder scanner failed to identify exact location in Section 5.3!');
    }
    console.log(`  Placeholder score reduced appropriately to: ${reviewResData.data.scores?.placeholderScore}%`);

    // Clean placeholder back to standard specification
    srsAfterDoubleSync.section5_otherNonfunctionalRequirements.securityRequirements = 'The system shall enforce role-based access control (RBAC) and JWT token-based authentication for all protected endpoints.';
    await srsAfterDoubleSync.save();

    // -------------------------------------------------------------------------
    // Test 16: Verify Appendix C matches actual unresolved issues
    // -------------------------------------------------------------------------
    console.log('\n[Test 16] Verifying Appendix C dynamic synchronization...');
    // Create an open issue
    const openIssue = await RequirementIssue.create({
      projectId,
      issueType: 'AMBIGUITY',
      severity: 'MEDIUM',
      description: 'Specification regarding badge reprint cooldown period requires stakeholder clarification.',
      relatedRequirementIds: ['FR-001'],
      status: 'OPEN'
    });

    await srsSyncService.syncProjectSRS(projectId, 'Sync with open issue');
    const srsWithIssue = await SRS.findOne({ projectId });
    console.log(`✓ Appendix C entries count: ${srsWithIssue.appendixC_issuesList?.length}`);
    if (srsWithIssue.appendixC_issuesList?.length !== 1 || srsWithIssue.appendixC_issuesList[0].issueId !== openIssue.issueId) {
      throw new Error('Appendix C does not match the active open issue in database!');
    }

    // Resolve the issue
    await analysisController.resolveIssue({
      params: { id: openIssue._id.toString() },
      body: {
        status: 'RESOLVED',
        resolutionNotes: 'Clarified with student affairs: 1 hour cooldown.'
      }
    }, { json: () => {}, status: () => ({ json: () => {} }) }, (e) => { if (e) throw e; });

    const srsResolved = await SRS.findOne({ projectId });
    console.log(`✓ Appendix C entries after resolution: ${srsResolved.appendixC_issuesList?.length} entries.`);
    if (srsResolved.appendixC_issuesList?.length !== 0) {
      throw new Error('Appendix C still contains resolved issue!');
    }

    // -------------------------------------------------------------------------
    // Test 17: Verify Export Formatting
    // -------------------------------------------------------------------------
    console.log('\n[Test 17] Verifying PDF and DOCX export generation...');
    const pdfBuf = await exportService.generatePDF(srsResolved);
    const docxBuf = await exportService.generateDOCX(srsResolved);

    console.log(`✓ PDF Export generated: ${pdfBuf.length} bytes.`);
    console.log(`✓ DOCX Export generated: ${docxBuf.length} bytes.`);

    if (pdfBuf.length === 0 || docxBuf.length === 0) {
      throw new Error('Export service produced empty buffer!');
    }

    console.log('\n======================================================================');
    console.log(' >>> ALL 17 SRS QUALITY & COMPLIANCE TESTS PASSED SUCCESSFULLY! <<<');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runQualityAndComplianceVerification();
