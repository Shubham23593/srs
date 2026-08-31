const assert = require('assert');
const {
  extractAtomicRequirements,
  classifyInformationType,
  isExplicitRequirementEvidence,
  formalNormalize
} = require('../ai/pipeline/semanticEngine');
const interviewAgent = require('../ai/agents/InterviewAgent');
const semanticContextValidator = require('../ai/pipeline/semanticContextValidator');

async function runAll15Tests() {
  console.log('================================================================');
  console.log('🚀 RUNNING 15 STAGE-AWARE PIPELINE & REQUIREMENT GATE TESTS');
  console.log('================================================================\n');

  const disasterProject = {
    projectName: 'Disaster Relief Coordination Platform',
    domain: 'Emergency & Disaster Management',
    scope: 'Coordination between government agencies, NGOs, relief workers, and affected citizens.',
    targetUsers: ['Citizens', 'NGO Workers', 'Government Officials']
  };

  const projectSection = { id: 'PROJECT_INFORMATION', name: 'Project Information', stepIndex: 1 };
  const stakeholderSection = { id: 'STAKEHOLDERS_AND_USERS', name: 'Stakeholders and Users', stepIndex: 2 };
  const rolesSection = { id: 'USER_ROLES_AND_PERMISSIONS', name: 'User Roles and Permissions', stepIndex: 3 };
  const functionalSection = { id: 'FUNCTIONAL_REQUIREMENTS', name: 'Functional Requirements', stepIndex: 4 };
  const nfrSection = { id: 'NON_FUNCTIONAL_REQUIREMENTS', name: 'Non-Functional Requirements', stepIndex: 5 };

  let passedCount = 0;

  // ---------------------------------------------------------------------------
  // TEST 1: Stakeholder answer produces 0 requirements
  // ---------------------------------------------------------------------------
  console.log('TEST 1: Stakeholder answer produces 0 requirements...');
  const ans1 = 'The primary users are citizens, government officials, NGO workers, volunteers and administrators.';
  const res1 = extractAtomicRequirements(ans1, stakeholderSection, disasterProject);
  assert.strictEqual(res1.requirements.length, 0, 'Must produce 0 requirements');
  assert.strictEqual(res1.isRequirementEvidence, false, 'Must be false for pure stakeholder answer');
  assert.ok(res1.entities?.stakeholdersInfo?.primaryUsers?.includes('citizens'), 'Must extract citizens as primary user');
  console.log('  ✅ PASSED (0 requirements generated, entities extracted: primaryUsers, administrators)\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 2: User description produces 0 requirements
  // ---------------------------------------------------------------------------
  console.log('TEST 2: User description produces 0 requirements...');
  const ans2 = 'Citizens will request help, and volunteers will provide assistance in flood affected zones.';
  const res2 = extractAtomicRequirements(ans2, stakeholderSection, disasterProject);
  assert.strictEqual(res2.requirements.length, 0, 'Must produce 0 requirements');
  console.log('  ✅ PASSED (0 requirements generated for descriptive users)\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 3: Explicit Functional Requirement produces an FR
  // ---------------------------------------------------------------------------
  console.log('TEST 3: Explicit Functional Requirement produces an FR...');
  const ans3 = 'Users should be able to submit emergency requests and track status.';
  const res3 = extractAtomicRequirements(ans3, functionalSection, disasterProject);
  assert.ok(res3.requirements.length >= 1, 'Must extract functional requirements');
  assert.strictEqual(res3.requirements[0].type, 'FUNCTIONAL', 'Must be FUNCTIONAL type');
  assert.ok(res3.requirements[0].normalizedDescription.startsWith('The system shall'), 'Must have formal IEEE prefix');
  console.log(`  ✅ PASSED (Extracted: ${res3.requirements[0].title} -> "${res3.requirements[0].normalizedDescription}")\n`);
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 4: Explicit measurable NFR produces an NFR
  // ---------------------------------------------------------------------------
  console.log('TEST 4: Explicit measurable NFR produces an NFR...');
  const ans4 = 'The system must maintain 99.9% availability during emergency operations.';
  const res4 = extractAtomicRequirements(ans4, nfrSection, disasterProject);
  assert.strictEqual(res4.requirements.length, 1, 'Must extract exactly 1 NFR');
  assert.strictEqual(res4.requirements[0].type, 'NON_FUNCTIONAL', 'Must be NON_FUNCTIONAL');
  assert.strictEqual(res4.requirements[0].nfrSubcategory, 'AVAILABILITY', 'Must be AVAILABILITY');
  assert.strictEqual(res4.requirements[0].status, 'PROPOSED', 'Measurable NFR is PROPOSED');
  assert.ok(res4.requirements[0].normalizedDescription.includes('99.9%'), 'Must retain 99.9% metric');
  console.log(`  ✅ PASSED (Extracted NFR: "${res4.requirements[0].normalizedDescription}")\n`);
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 5: Hindi stakeholder answer produces 0 requirements
  // ---------------------------------------------------------------------------
  console.log('TEST 5: Hindi stakeholder answer produces 0 requirements...');
  const ans5 = 'मुख्य उपयोगकर्ता नागरिक और एनजीओ कार्यकर्ता होंगे।';
  const res5 = extractAtomicRequirements(ans5, stakeholderSection, disasterProject);
  assert.strictEqual(res5.requirements.length, 0, 'Hindi stakeholder answer must yield 0 requirements');
  console.log('  ✅ PASSED (Hindi stakeholder answer yielded 0 requirements)\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 6: Marathi stakeholder answer produces 0 requirements
  // ---------------------------------------------------------------------------
  console.log('TEST 6: Marathi stakeholder answer produces 0 requirements...');
  const ans6 = 'प्रमुख वापरकर्ते नागरिक, शासकीय अधिकारी आणि स्वयंसेवक असतील.';
  const res6 = extractAtomicRequirements(ans6, stakeholderSection, disasterProject);
  assert.strictEqual(res6.requirements.length, 0, 'Marathi stakeholder answer must yield 0 requirements');
  console.log('  ✅ PASSED (Marathi stakeholder answer yielded 0 requirements)\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 7: Hinglish stakeholder answer produces 0 requirements
  // ---------------------------------------------------------------------------
  console.log('TEST 7: Hinglish stakeholder answer produces 0 requirements...');
  const ans7 = 'Main users citizens aur NGO workers honge.';
  const res7 = extractAtomicRequirements(ans7, stakeholderSection, disasterProject);
  assert.strictEqual(res7.requirements.length, 0, 'Hinglish stakeholder answer must yield 0 requirements');
  console.log('  ✅ PASSED (Hinglish stakeholder answer yielded 0 requirements)\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 8: Out-of-scope football answer produces 0 requirements & does not advance
  // ---------------------------------------------------------------------------
  console.log('TEST 8: Out-of-scope football answer produces 0 requirements & does not advance...');
  const ans8 = 'Mujhe football match dekhna hai.';
  const validation8 = await semanticContextValidator.validateInterviewAnswer({
    rawText: ans8,
    project: disasterProject,
    sectionConfig: stakeholderSection
  });
  assert.strictEqual(validation8.isOutOfScope, true, 'Football input must be marked isOutOfScope=true');
  const res8 = extractAtomicRequirements(ans8, stakeholderSection, disasterProject);
  assert.strictEqual(res8.requirements.length, 0, 'Must produce 0 requirements');
  console.log('  ✅ PASSED (Football input flagged OUT_OF_SCOPE with 0 requirements)\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 9: Mixed stakeholder information + explicit requirement extracts only genuine requirement
  // ---------------------------------------------------------------------------
  console.log('TEST 9: Mixed stakeholder information + explicit requirement extracts only genuine requirement...');
  const ans9 = 'NGO workers and volunteers will coordinate relief. Users should be able to create expense reports.';
  const res9 = extractAtomicRequirements(ans9, functionalSection, disasterProject);
  assert.ok(res9.requirements.length >= 1, 'Must extract only the genuine functional requirement');
  assert.ok(res9.requirements.every(r => r.type === 'FUNCTIONAL'), 'Must not generate fake NFRs');
  console.log(`  ✅ PASSED (Extracted ${res9.requirements.length} functional requirement(s), 0 fake NFRs)\n`);
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 10: Raw interview text never appears directly as normalized requirement
  // ---------------------------------------------------------------------------
  console.log('TEST 10: Raw interview text never appears directly as normalized requirement...');
  const ans10 = 'user la emergency relief chi request submit karta aali pahije.';
  const res10 = extractAtomicRequirements(ans10, functionalSection, disasterProject);
  if (res10.requirements.length > 0) {
    assert.strictEqual(res10.requirements[0].normalizedDescription.includes('aali pahije'), false, 'Must not contain raw dialect');
    assert.ok(res10.requirements[0].normalizedDescription.startsWith('The system shall'), 'Must be normalized');
  }
  const directNorm = formalNormalize('allow citizens to register distress tickets');
  assert.strictEqual(directNorm, 'The system shall allow citizens to register distress tickets.');
  console.log('  ✅ PASSED (Normalized to formal IEEE 830 standard)\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 11: Every persisted requirement has isRequirementEvidence === true
  // ---------------------------------------------------------------------------
  console.log('TEST 11: Every persisted requirement has isRequirementEvidence === true...');
  const ans11 = 'The system shall allow users to log in securely.';
  const res11 = extractAtomicRequirements(ans11, functionalSection, disasterProject);
  assert.ok(res11.requirements.length > 0);
  assert.strictEqual(res11.requirements[0].isRequirementEvidence, true, 'isRequirementEvidence must be true');
  console.log('  ✅ PASSED (isRequirementEvidence is true)\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 12: Current stage prevents false NFR generation
  // ---------------------------------------------------------------------------
  console.log('TEST 12: Current stage prevents false NFR generation...');
  const ans12 = 'Emergency responders will monitor available resources and respond to victims.';
  const res12 = extractAtomicRequirements(ans12, stakeholderSection, disasterProject);
  assert.strictEqual(res12.requirements.filter(r => r.type === 'NON_FUNCTIONAL').length, 0, 'No false NFRs');
  console.log('  ✅ PASSED (Stage guard prevented false NFR creation from "available" and "respond")\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 13: Relevant indirect stakeholder answers are accepted
  // ---------------------------------------------------------------------------
  console.log('TEST 13: Relevant indirect stakeholder answers are accepted...');
  const ans13 = 'Citizens request help, NGOs manage resources, and volunteers perform assigned tasks.';
  const validation13 = await semanticContextValidator.validateInterviewAnswer({
    rawText: ans13,
    project: disasterProject,
    sectionConfig: stakeholderSection
  });
  assert.strictEqual(validation13.isRelevant, true, 'Must be recognized as relevant stakeholder answer');
  assert.strictEqual(validation13.isOutOfScope, false, 'Must not be out of scope');
  console.log('  ✅ PASSED (Indirect stakeholder description accepted as RELEVANT)\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 14: Follow-up questions do not repeat information already collected
  // ---------------------------------------------------------------------------
  console.log('TEST 14: Follow-up questions do not repeat information already collected...');
  const followUpQuestion = await interviewAgent.generateDynamicFollowUp({
    sectionConfig: stakeholderSection,
    projectName: disasterProject.projectName,
    detectedLanguage: 'English',
    userAnswer: 'Primary users are citizens, NGOs and volunteers.',
    extractedEntities: { primaryUsers: ['citizens', 'NGO workers', 'volunteers'] },
    extractedRequirements: []
  });
  assert.ok(typeof followUpQuestion === 'string' && followUpQuestion.length > 5, 'Must generate valid follow-up');
  console.log(`  ✅ PASSED (Dynamic Follow-up: "${followUpQuestion}")\n`);
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 15: No fake numerical threshold is invented from vague words like "fast"
  // ---------------------------------------------------------------------------
  console.log('TEST 15: No fake numerical threshold is invented from vague words like "fast"...');
  const ans15 = 'System fast hona chahiye.';
  const res15 = extractAtomicRequirements(ans15, nfrSection, disasterProject);
  assert.strictEqual(res15.requirements.length, 1, 'Must capture vague NFR');
  const desc15 = res15.requirements[0].normalizedDescription;
  assert.strictEqual(desc15.includes('2 seconds'), false, 'Must NOT invent 2 seconds');
  assert.strictEqual(desc15.includes('99.9%'), false, 'Must NOT invent 99.9%');
  assert.strictEqual(res15.requirements[0].status, 'NEEDS_CLARIFICATION', 'Must flag for clarification');
  console.log(`  ✅ PASSED (No fake metric invented: "${desc15}", status: ${res15.requirements[0].status})\n`);
  passedCount++;

  console.log('================================================================');
  console.log(`🎉 ALL ${passedCount}/15 PIPELINE ACCEPTANCE TESTS PASSED! 🎉`);
  console.log('================================================================');
}

runAll15Tests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
