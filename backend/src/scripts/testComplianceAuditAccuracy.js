/**
 * ============================================================================
 * ISO/IEC/IEEE COMPLIANCE AUDIT ACCURACY TEST SUITE
 * ============================================================================
 *
 * Verifies that:
 * 1. Requirements present in Section 3 (such as FR-004) NEVER generate false
 *    "missing requirement" findings during compliance audits.
 * 2. Any hallucinated "missing requirement" finding from an LLM is safely
 *    filtered out when the requirement ID exists in Section 3 Ground Truth.
 * 3. Truly missing requirements (not present in Section 3) ARE accurately detected.
 * 4. The Standard Alignment Score correctly reflects true findings without false penalties.
 */

const assert = require('assert');
const { connectDB } = require('../config/db');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const SRS = require('../models/SRS');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const srsController = require('../controllers/srs.controller');
const srsReviewAgent = require('../ai/agents/SRSReviewAgent');

async function runTests() {
  console.log('============================================================');
  console.log('STARTING ISO/IEEE COMPLIANCE AUDIT ACCURACY REGRESSION TEST');
  console.log('============================================================');

  await connectDB();

  const testProject = await Project.create({
    projectName: 'Smart University Campus Management System',
    domain: 'Campus Management',
    description: 'Campus facility management, security alerts, and emergency assistance services.'
  });
  const projectId = testProject._id;
  console.log(`Created test project: ${projectId}`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: SYNCED SRS WITH FR-004 (EMERGENCY ASSISTANCE REQUEST)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Setup project with FR-001 through FR-004 (Emergency Assistance) ---');
    const requirements = await Requirement.create([
      {
        projectId,
        requirementId: 'FR-001',
        title: 'Student Class Registration',
        description: 'The system shall allow students to register for academic courses.',
        normalizedDescription: 'The system shall allow students to register for academic courses.',
        type: 'FUNCTIONAL',
        category: 'Academics',
        priority: 'HIGH',
        status: 'APPROVED'
      },
      {
        projectId,
        requirementId: 'FR-002',
        title: 'Faculty Grade Submission',
        description: 'The system shall allow faculty members to submit student grades securely.',
        normalizedDescription: 'The system shall allow faculty members to submit student grades securely.',
        type: 'FUNCTIONAL',
        category: 'Academics',
        priority: 'HIGH',
        status: 'APPROVED'
      },
      {
        projectId,
        requirementId: 'FR-003',
        title: 'Campus Facility Maintenance Requests',
        description: 'The system shall allow campus occupants to submit facility repair tickets.',
        normalizedDescription: 'The system shall allow campus occupants to submit facility repair tickets.',
        type: 'FUNCTIONAL',
        category: 'Facilities',
        priority: 'MEDIUM',
        status: 'APPROVED'
      },
      {
        projectId,
        requirementId: 'FR-004',
        title: 'Emergency Assistance Request',
        description: 'The system shall allow students and staff to dispatch emergency assistance requests with geolocation telemetry.',
        normalizedDescription: 'The system shall allow students and staff to dispatch emergency assistance requests with geolocation telemetry.',
        type: 'FUNCTIONAL',
        category: 'Campus Safety',
        priority: 'HIGH',
        status: 'APPROVED'
      }
    ]);

    const { srs } = await pipeline.generateSRS(testProject);

    // Verify FR-004 is present in Section 3
    const section3ReqIds = [];
    (srs.section3_systemFeatures || []).forEach(f => {
      (f.functionalRequirements || []).forEach(r => section3ReqIds.push(r.requirementId));
    });

    console.log('Section 3 Mapped Requirement IDs:', section3ReqIds);
    assert(section3ReqIds.includes('FR-004'), 'FR-004 must be present in Section 3');

    // -------------------------------------------------------------------------
    // TEST 2: COMPLIANCE AUDIT ON SYNCED SRS WITH NO FALSE FINDINGS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Run ISO/IEEE Compliance Audit via reviewSRS ---');
    let reviewResData = null;
    const reqMock = { params: { id: srs._id } };
    const resMock = { json: (d) => { reviewResData = d; } };
    await srsController.reviewSRS(reqMock, resMock, (err) => { if (err) throw err; });

    console.log('Review Result Compliance Score:', reviewResData.data.complianceScore);
    console.log('Review Result Findings:', reviewResData.data.findings);
    console.log('Review Result Recommendations:', reviewResData.data.recommendations);

    // Assert NO false missing requirement findings
    const missingFindings = (reviewResData.data.findings || []).filter(f =>
      f.comment && /missing.*FR-004|FR-004.*missing|missing functional requirement/i.test(f.comment)
    );
    assert.strictEqual(missingFindings.length, 0, 'Must NOT generate false missing requirement finding for FR-004');
    assert.strictEqual(reviewResData.data.complianceScore, 1, 'Standard Alignment Score must be 1.0 (100%) when all requirements are mapped');
    console.log('✓ Compliance audit accurately verified FR-004 without false missing requirement finding');

    // -------------------------------------------------------------------------
    // TEST 3: STRICT GUARD AGAINST HALLUCINATED LLM MISSING FINDINGS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Ground Truth Filter blocks hallucinated AI findings ---');
    // Test direct invocation where AI hallucinated finding for FR-004
    const fakeSrsDoc = {
      ...srs.toObject(),
      section3_systemFeatures: [
        {
          featureId: '3.1',
          featureName: 'Campus Safety & Emergency Services',
          functionalRequirements: [
            { requirementId: 'FR-004', title: 'Emergency Assistance Request', statement: 'The system shall dispatch emergency assistance.' }
          ]
        }
      ]
    };

    const directResult = await srsReviewAgent.reviewSRS(fakeSrsDoc, [
      { requirementId: 'FR-004', type: 'FUNCTIONAL', title: 'Emergency Assistance Request', status: 'APPROVED' }
    ]);

    console.log('Direct Test 3 Findings:', directResult.findings);
    console.log('Direct Test 3 Score:', directResult.complianceScore);

    const fakeMissingFindings = directResult.findings.filter(f =>
      f.comment && /missing.*FR-004|FR-004.*missing/i.test(f.comment)
    );
    assert.strictEqual(fakeMissingFindings.length, 0, 'Must reject hallucinated missing finding for FR-004');
    assert.strictEqual(directResult.complianceScore, 1, 'Score must remain 1.0 (100%)');
    console.log('✓ Ground Truth filter successfully blocked hallucinated missing requirement finding');

    // -------------------------------------------------------------------------
    // TEST 4: TRUE MISSING REQUIREMENT IS ACCURATELY DETECTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: True missing requirement (FR-005) is accurately detected ---');
    const catalogWithMissing = [
      { requirementId: 'FR-004', type: 'FUNCTIONAL', title: 'Emergency Assistance Request', status: 'APPROVED' },
      { requirementId: 'FR-005', type: 'FUNCTIONAL', title: 'Visitor Parking Permit Management', status: 'APPROVED' }
    ];

    const trueMissingResult = await srsReviewAgent.reviewSRS(fakeSrsDoc, catalogWithMissing);
    console.log('True missing requirement result:', trueMissingResult);

    const trueMissingFinding = trueMissingResult.findings.find(f => f.comment && f.comment.includes('FR-005'));
    assert(trueMissingFinding, 'Must detect truly missing requirement FR-005');
    assert.strictEqual(trueMissingFinding.severity, 'HIGH');
    assert(trueMissingResult.complianceScore < 1.0, 'Score must be penalized for truly missing requirement');
    console.log('✓ True missing requirement FR-005 correctly detected with HIGH severity finding');

    console.log('\n============================================================');
    console.log('ALL COMPLIANCE AUDIT ACCURACY TESTS PASSED (100%)');
    console.log('============================================================');
  } finally {
    // Clean up
    await Project.deleteOne({ _id: projectId });
    await Requirement.deleteMany({ projectId });
    await SRS.deleteMany({ projectId });
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Suite Failed with error:', err);
    process.exit(1);
  });
