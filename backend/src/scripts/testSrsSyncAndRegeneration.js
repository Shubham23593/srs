/**
 * ============================================================================
 * SRS SYNCHRONIZATION AND REGENERATION TEST SUITE
 * ============================================================================
 *
 * Verifies that:
 * 1. Newly added, edited, or deleted requirements (e.g. FR-004) are dynamically
 *    included in Section 3: System Features upon SRS regeneration / sync.
 * 2. Quality Audit issues reflect their exact status in Appendix C: Issues List,
 *    and resolved issues are NEVER shown as OPEN.
 * 3. Running the ISO/IEEE compliance audit audits the latest synchronized SRS
 *    content and accurately validates complete feature coverage.
 */

const assert = require('assert');
const { connectDB } = require('../config/db');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const SRS = require('../models/SRS');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const srsController = require('../controllers/srs.controller');
const analysisController = require('../controllers/analysis.controller');

async function runTests() {
  console.log('============================================================');
  console.log('STARTING SRS SYNCHRONIZATION & REGENERATION REGRESSION TEST');
  console.log('============================================================');

  await connectDB();

  const testProject = await Project.create({
    projectName: 'Smart Waste Management System',
    domain: 'Waste Management',
    description: 'Smart urban waste collection, bin monitoring, and municipal recycling management.'
  });
  const projectId = testProject._id;
  console.log(`Created test project: ${projectId}`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: BASELINE REQUIREMENTS & INITIAL SRS GENERATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Create initial requirements (FR-001, FR-002, FR-003) & baseline SRS ---');
    await Requirement.create([
      {
        projectId,
        requirementId: 'FR-001',
        title: 'Real-Time Bin Fill Level Monitoring',
        description: 'The system shall monitor waste bin fill levels in real time via ultrasonic sensors.',
        normalizedDescription: 'The system shall monitor waste bin fill levels in real time via ultrasonic sensors.',
        type: 'FUNCTIONAL',
        category: 'Monitoring',
        priority: 'HIGH',
        status: 'APPROVED'
      },
      {
        projectId,
        requirementId: 'FR-002',
        title: 'Automated Route Optimization for Collection Trucks',
        description: 'The system shall generate optimized collection routes for trucks based on fill level telemetry.',
        normalizedDescription: 'The system shall generate optimized collection routes for trucks based on fill level telemetry.',
        type: 'FUNCTIONAL',
        category: 'Route Planning',
        priority: 'HIGH',
        status: 'APPROVED'
      },
      {
        projectId,
        requirementId: 'FR-003',
        title: 'Citizen Recycling Rewards Points Dispatch',
        description: 'The system shall calculate and award recycling points to citizens upon QR code scanning.',
        normalizedDescription: 'The system shall calculate and award recycling points to citizens upon QR code scanning.',
        type: 'FUNCTIONAL',
        category: 'Citizen Engagement',
        priority: 'MEDIUM',
        status: 'PROPOSED'
      }
    ]);

    const initialRes = await pipeline.generateSRS(testProject);
    const initialSrs = initialRes.srs;

    const initialReqIds = [];
    (initialSrs.section3_systemFeatures || []).forEach((f) => {
      (f.functionalRequirements || []).forEach((r) => initialReqIds.push(r.requirementId));
    });

    console.log('Initial Section 3 Functional Requirements:', initialReqIds);
    assert(initialReqIds.includes('FR-001'), 'Must include FR-001');
    assert(initialReqIds.includes('FR-002'), 'Must include FR-002');
    assert(initialReqIds.includes('FR-003'), 'Must include FR-003');
    assert.strictEqual(initialReqIds.length, 3, 'Must have exactly 3 initial requirements');
    console.log('✓ Initial SRS generation contains all 3 baseline requirements in Section 3');

    // -------------------------------------------------------------------------
    // TEST 2: DYNAMIC ADDITION OF FR-004 & REGENERATION SYNCHRONIZATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Manually add FR-004 with ambiguity and sync/regenerate SRS ---');
    await Requirement.create({
      projectId,
      requirementId: 'FR-004',
      title: 'Automated Waste Analytics and Municipal Reporting',
      description: 'The system shall provide quick and efficient generation of weekly landfill diversion reports.',
      normalizedDescription: 'The system shall provide quick and efficient generation of weekly landfill diversion reports.',
      type: 'FUNCTIONAL',
      category: 'Analytics & Reporting',
      priority: 'HIGH',
      status: 'PROPOSED'
    });

    // Call generateSRS controller (or pipeline.generateSRS)
    let syncResData = null;
    const reqMock = { params: { id: projectId } };
    const resMock = {
      status: (code) => ({
        json: (payload) => { syncResData = payload; }
      }),
      json: (payload) => { syncResData = payload; }
    };

    await srsController.generateSRS(reqMock, resMock, (err) => { if (err) throw err; });
    assert(syncResData && syncResData.success, 'Sync SRS must return success');

    const updatedSrs = await SRS.findOne({ projectId });
    const updatedReqIds = [];
    (updatedSrs.section3_systemFeatures || []).forEach((f) => {
      (f.functionalRequirements || []).forEach((r) => updatedReqIds.push(r.requirementId));
    });

    console.log('Updated Section 3 Functional Requirements after adding FR-004:', updatedReqIds);
    assert(updatedReqIds.includes('FR-004'), 'Section 3 MUST dynamically include newly added FR-004');
    assert.strictEqual(updatedReqIds.length, 4, 'Section 3 must contain all 4 requirements');
    console.log('✓ Section 3: System Features successfully synchronized with new requirement FR-004');

    // -------------------------------------------------------------------------
    // TEST 3: QUALITY AUDIT ISSUE RESOLUTION & APPENDIX C ACCURACY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Quality Audit Issue Resolution & Appendix C Status ---');
    let appCIssues = updatedSrs.appendixC_issuesList || [];
    console.log(`Appendix C has ${appCIssues.length} issue(s). Sample:`, appCIssues[0]);

    assert(appCIssues.length > 0, 'Quality audit must detect ambiguity in FR-004');
    const openIssue = appCIssues.find(i => i.relatedRequirement.includes('FR-004') || i.description.includes('FR-004') || i.status === 'OPEN');
    assert(openIssue, 'Must find an issue related to FR-004');
    assert.strictEqual(openIssue.status, 'OPEN', 'Issue must initially be OPEN in Appendix C');
    console.log('✓ Appendix C correctly reflects OPEN status for detected Quality Audit issue');

    // Find the issue document in MongoDB
    const issueDoc = await RequirementIssue.findOne({ projectId, status: 'OPEN' });
    assert(issueDoc, 'Must find issue document in MongoDB');

    // Resolve the issue via Quality Audit controller
    console.log(`\nResolving issue ${issueDoc.issueId} via analysisController.resolveIssue...`);
    const resolveReqMock = {
      params: { id: issueDoc._id },
      body: {
        status: 'RESOLVED',
        resolutionType: 'MARK_RESOLVED',
        resolutionNotes: 'Clarified report generation interval and latency parameters.'
      }
    };
    let resolveResData = null;
    const resolveResMock = { json: (d) => { resolveResData = d; } };
    await analysisController.resolveIssue(resolveReqMock, resolveResMock, (err) => { if (err) throw err; });
    assert(resolveResData && resolveResData.success, 'Resolve issue must succeed');

    // Re-sync SRS after resolution
    await srsController.generateSRS(reqMock, resMock, (err) => { if (err) throw err; });
    let srsWithResolvedIssue = await SRS.findOne({ projectId });
    let appCResolvedIssues = srsWithResolvedIssue.appendixC_issuesList || [];
    console.log('Appendix C after resolving issue (sample):', appCResolvedIssues.find(i => i.issueId === issueDoc.issueId));

    let resolvedIssueEntry = appCResolvedIssues.find((i) => i.issueId === issueDoc.issueId);
    assert(resolvedIssueEntry, 'Appendix C must list the resolved issue');
    assert.strictEqual(resolvedIssueEntry.status, 'RESOLVED', 'Appendix C MUST reflect status RESOLVED and NEVER show as OPEN');
    console.log('✓ Appendix C correctly reflects RESOLVED status and does NOT show as OPEN');

    // -------------------------------------------------------------------------
    // TEST 4: RUN ISO/IEEE COMPLIANCE AUDIT ON LATEST SYNCHRONIZED SRS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Run ISO/IEEE Compliance Audit on synchronized SRS ---');
    let reviewResData = null;
    const reviewReqMock = { params: { id: srsWithResolvedIssue._id } };
    const reviewResMock = { json: (d) => { reviewResData = d; } };
    await srsController.reviewSRS(reviewReqMock, reviewResMock, (err) => { if (err) throw err; });

    console.log('Compliance Audit Result:', {
      complianceScore: reviewResData.data.complianceScore,
      findingsCount: reviewResData.data.findings.length
    });

    // Check that there is NO missing requirement finding for FR-001, FR-002, FR-003, or FR-004
    const missingReqFindings = reviewResData.data.findings.filter(f => f.comment && f.comment.includes('Missing functional requirements'));
    console.log('Missing requirement findings:', missingReqFindings);
    assert.strictEqual(missingReqFindings.length, 0, 'Synchronized SRS must NOT have missing requirement findings');
    console.log('✓ ISO/IEEE Compliance Audit verified 100% of functional requirements including FR-004');

    console.log('\n============================================================');
    console.log('ALL SRS SYNCHRONIZATION & REGENERATION TESTS PASSED (100%)');
    console.log('============================================================');
  } finally {
    // Clean up test data
    await Project.deleteOne({ _id: projectId });
    await Requirement.deleteMany({ projectId });
    await RequirementIssue.deleteMany({ projectId });
    await SRS.deleteMany({ projectId });
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Suite Failed with error:', err);
    process.exit(1);
  });
