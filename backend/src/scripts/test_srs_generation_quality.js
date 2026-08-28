const mongoose = require('mongoose');
const srsGenerationAgent = require('../ai/agents/SRSGenerationAgent');
const atomicDecomposer = require('../services/atomicRequirementDecomposer');
const { sanitizeAndValidateSRS } = require('../services/srsSanitizerAndValidator');
const env = require('../config/env');

async function runSRSGenerationQualityTest() {
  console.log('======================================================================');
  console.log('--- STARTING SRS GENERATION QUALITY & ATOMIC SEPARATION TESTS ---');
  console.log('======================================================================\n');

  await mongoose.connect(env.mongodbUri);

  const mockProject = {
    _id: new mongoose.Types.ObjectId(),
    projectName: 'Smart Task Management Platform',
    description: 'A collaborative project planning and execution system.',
    scope: 'User authentication, task assignment, progress tracking, and notifications.',
    targetUsers: ['Project Managers', 'Software Developers', 'QA Engineers'],
    constraints: ['Node.js backend runtime', 'MongoDB database layer'],
    assumptions: ['Stable cloud network connectivity']
  };

  // -------------------------------------------------------------
  // Test 1: Hinglish / Hindi user interview input transformation
  // -------------------------------------------------------------
  console.log('[Test 1] User interview input in Hinglish: "users ko project search karna hai aur project manage karna hai"');
  const rawHinglishAnswer = "users ko project search karna hai aur project manage karna hai";
  
  const extractedFromHinglish = atomicDecomposer.decomposeRawTextToAtomicRequirements(rawHinglishAnswer, mockProject.projectName);
  console.log(`✓ Extracted ${extractedFromHinglish.length} atomic requirement(s):`);
  extractedFromHinglish.forEach((r, idx) => {
    console.log(`  ${idx + 1}. [${r.type}] ${r.title}: "${r.description}"`);
  });

  if (extractedFromHinglish.length !== 2) {
    throw new Error(`Expected 2 atomic requirements from Hinglish input, got ${extractedFromHinglish.length}`);
  }

  // Format with stable IDs
  const requirements = [
    {
      requirementId: 'FR-001',
      title: extractedFromHinglish[0].title,
      description: extractedFromHinglish[0].description,
      type: 'FUNCTIONAL',
      category: 'Project Operations',
      priority: 'HIGH',
      status: 'PROPOSED'
    },
    {
      requirementId: 'FR-002',
      title: extractedFromHinglish[1].title,
      description: extractedFromHinglish[1].description,
      type: 'FUNCTIONAL',
      category: 'Project Operations',
      priority: 'HIGH',
      status: 'PROPOSED'
    },
    {
      requirementId: 'FR-003',
      title: 'Requirement Creation',
      description: 'The system shall allow authorized users to create requirements.',
      type: 'FUNCTIONAL',
      category: 'Requirements Engineering',
      priority: 'HIGH',
      status: 'APPROVED'
    },
    {
      requirementId: 'FR-004',
      title: 'Collaboration',
      description: 'The system shall allow authorized users to collaborate with other users.',
      type: 'FUNCTIONAL',
      category: 'Collaboration',
      priority: 'MEDIUM',
      status: 'APPROVED'
    },
    {
      requirementId: 'FR-005',
      title: 'Notifications',
      description: 'The system shall notify relevant users when configured project changes occur.',
      type: 'FUNCTIONAL',
      category: 'Notifications',
      priority: 'MEDIUM',
      status: 'PROPOSED'
    },
    {
      requirementId: 'NFR-001',
      title: 'API Latency',
      description: 'The system shall respond to user requests within 2 seconds under normal operating conditions.',
      type: 'NON_FUNCTIONAL',
      nfrSubcategory: 'PERFORMANCE',
      category: 'Performance',
      priority: 'HIGH',
      status: 'APPROVED'
    },
    {
      requirementId: 'NFR-002',
      title: 'Resource Protection',
      description: 'The system shall require authentication before granting access to protected resources.',
      type: 'NON_FUNCTIONAL',
      nfrSubcategory: 'SECURITY',
      category: 'Security',
      priority: 'HIGH',
      status: 'APPROVED'
    }
  ];

  // -------------------------------------------------------------
  // Test 2: Generate Complete SRS from Structured Requirements
  // -------------------------------------------------------------
  console.log('\n[Test 2] Generating SRS from 7 Structured Atomic Requirements...');
  const generatedSRS = await srsGenerationAgent.generateSRS(mockProject, requirements, '', []);

  console.log('✓ SRS Generated successfully.');
  console.log(`  - Title: "${generatedSRS.metadata?.title}"`);
  console.log(`  - Section 1.1 Purpose: "${generatedSRS.section1_introduction?.purpose.substring(0, 80)}..."`);
  console.log(`  - Section 3 System Features Count: ${generatedSRS.section3_systemFeatures?.length}`);

  // Verify all 5 functional requirements are in Section 3
  const section3Reqs = [];
  (generatedSRS.section3_systemFeatures || []).forEach(feat => {
    (feat.functionalRequirements || []).forEach(fr => {
      section3Reqs.push(fr);
    });
  });

  console.log('\n✓ Section 3 Functional Requirements:');
  section3Reqs.forEach(fr => {
    console.log(`  • [${fr.requirementId}] ${fr.title}: "${fr.statement}"`);
  });

  if (section3Reqs.length !== 5) {
    throw new Error(`Expected 5 functional requirements in Section 3, found ${section3Reqs.length}`);
  }

  // -------------------------------------------------------------
  // Test 3: Validate No Conversational / Hinglish Text Leaks
  // -------------------------------------------------------------
  console.log('\n[Test 3] Verifying ZERO conversational or Hinglish phrases in generated SRS...');
  const srsJsonString = JSON.stringify(generatedSRS);
  const forbiddenPhrases = [
    'users ko',
    'karna hai',
    'chahiye',
    'hello bro',
    'interview',
    'the user said',
    'as discussed'
  ];

  for (const phrase of forbiddenPhrases) {
    if (srsJsonString.toLowerCase().includes(phrase)) {
      throw new Error(`CRITICAL QUALITY FAILURE: Forbidden phrase "${phrase}" detected in SRS!`);
    }
  }
  console.log('✓ Verified: Zero conversational or non-English text in entire SRS document.');

  // -------------------------------------------------------------
  // Test 4: Verify Non-Functional Requirements in Section 5
  // -------------------------------------------------------------
  console.log('\n[Test 4] Verifying Section 5 NFR Mappings...');
  const sec5 = generatedSRS.section5_otherNonfunctionalRequirements;
  console.log(`  • 5.1 Performance: "${sec5.performanceRequirements}"`);
  console.log(`  • 5.3 Security: "${sec5.securityRequirements}"`);

  if (!sec5.performanceRequirements.includes('NFR-001') && !sec5.performanceRequirements.includes('2')) {
    throw new Error('NFR-001 Performance requirement missing from Section 5.1');
  }
  if (!sec5.securityRequirements.includes('NFR-002') && !sec5.securityRequirements.includes('authentication')) {
    throw new Error('NFR-002 Security requirement missing from Section 5.3');
  }
  console.log('✓ Section 5 Non-Functional Requirements properly mapped.');

  // -------------------------------------------------------------
  // Test 5: Verify Appendices Structure
  // -------------------------------------------------------------
  console.log('\n[Test 5] Verifying Appendices...');
  if (!generatedSRS.appendixA_glossary || generatedSRS.appendixA_glossary.length === 0) {
    throw new Error('Appendix A Glossary is missing or empty');
  }
  if (!generatedSRS.appendixB_analysisModels || !generatedSRS.appendixB_analysisModels.diagramTypes) {
    throw new Error('Appendix B Analysis Models is missing');
  }
  console.log(`  • Appendix A Glossary Terms: ${generatedSRS.appendixA_glossary.map(g => g.term).join(', ')}`);
  console.log(`  • Appendix B Analysis Models: ${generatedSRS.appendixB_analysisModels.diagramTypes.join(', ')}`);
  console.log(`  • Appendix C Issues Count: ${generatedSRS.appendixC_issuesList?.length || 0}`);

  console.log('\n======================================================================');
  console.log(' >>> ALL SRS GENERATION QUALITY & SEPARATION TESTS PASSED! <<<');
  console.log('======================================================================\n');

  await mongoose.disconnect();
}

runSRSGenerationQualityTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
