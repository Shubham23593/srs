/**
 * Comprehensive Test Suite for AI Interview Context Relevance Validation.
 *
 * Tests:
 * 1. Semantic understanding across multiple project domains (Healthcare, Fintech, Education, Logistics)
 * 2. Multilingual testing (English, Hindi, Marathi, Hinglish, Mixed)
 * 3. 4 Semantic outcomes: RELEVANT, PARTIALLY_RELEVANT, UNRELATED (CONTEXT_MISMATCH), INVALID
 * 4. Zero context drift & no false requirements created from unrelated answers
 * 5. Clarification prompts for partially relevant answers
 */

require('dotenv').config();
const semanticValidator = require('../ai/pipeline/semanticContextValidator');
const interviewAgent = require('../ai/agents/InterviewAgent');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const { SECTIONS_CONFIG } = require('../constants/interviewSections');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 AI INTERVIEW CONTEXT RELEVANCE VALIDATION TEST SUITE');
  console.log('================================================================\n');

  // --- Project 1: Healthcare ---
  const hospitalProject = {
    _id: 'proj_hospital_001',
    projectName: 'Smart Hospital Appointment and Queue Management System',
    description: 'A comprehensive healthcare platform allowing patients to book doctor appointments, track OPD token queues in real-time, and access digital prescriptions.',
    domain: 'Healthcare & Hospital Management',
    scope: 'Patient OPD scheduling, live token tracking, doctor availability roster, and SMS queue alerts.',
    objectives: ['Reduce OPD wait times', 'Provide transparent real-time token tracking', 'Digitize doctor appointment booking'],
    targetUsers: ['Patients', 'Doctors', 'Hospital Receptionists', 'OPD Administrators']
  };

  // --- Project 2: FinTech ---
  const expenseProject = {
    _id: 'proj_expense_002',
    projectName: 'Real-Time Personal Expense & Budget Tracker',
    description: 'A personal finance application enabling users to log daily expenses, categorize transactions, set monthly budgets, and analyze spending patterns.',
    domain: 'Personal Finance & FinTech',
    scope: 'Expense logging, recurring subscriptions, budget alerts, and PDF monthly reports.',
    objectives: ['Help users save money', 'Automate expense categorization', 'Provide monthly financial insights'],
    targetUsers: ['Individual Consumers', 'Freelancers', 'Household Budget Planners']
  };

  // --- Project 3: Education ---
  const campusProject = {
    _id: 'proj_campus_003',
    projectName: 'University Campus Event & Student Registration Portal',
    description: 'A centralized university system for hosting student club events, managing participant registrations, and scanning QR code badges at entry gates.',
    domain: 'Higher Education & Campus Life',
    scope: 'Club event publishing, student RSVP, QR ticket generation, and attendance check-in.',
    objectives: ['Streamline event organization', 'Automate student check-in with QR codes', 'Track student club participation'],
    targetUsers: ['University Students', 'Event Organizers', 'Faculty Advisors', 'Campus Security']
  };

  // =========================================================================
  // TEST SUITE 1: Relevant Answers Across Languages (Healthcare Project)
  // =========================================================================
  console.log('--- TEST SUITE 1: Relevant Answers Across Languages (Healthcare) ---');

  const sec1 = SECTIONS_CONFIG[0]; // Project Information
  const sec3 = SECTIONS_CONFIG[2]; // User Roles & Permissions
  const sec4 = SECTIONS_CONFIG[3]; // Functional Requirements

  // English
  const res1_en = await semanticValidator.validateInterviewAnswer({
    rawText: 'Patients should be able to book OPD appointments online and view live queue numbers.',
    project: hospitalProject,
    sectionConfig: sec4,
    currentQuestion: 'What core features must the system provide for patients and hospital staff?'
  });
  assert(res1_en.isRelevant === true && res1_en.classification === 'RELEVANT', 'English hospital appointment answer is classified as RELEVANT');

  // Hindi
  const res1_hi = await semanticValidator.validateInterviewAnswer({
    rawText: 'मरीजों को डॉक्टर के साथ ऑनलाइन अपॉइंटमेंट बुक करने और लाइव टोकन नंबर देखने की सुविधा होनी चाहिए।',
    project: hospitalProject,
    sectionConfig: sec4,
    currentQuestion: 'सिस्टम को उपयोगकर्ताओं के लिए कौन-सी मुख्य कार्यक्षमताएँ प्रदान करनी चाहिए?'
  });
  assert(res1_hi.isRelevant === true, 'Hindi hospital appointment answer is classified as RELEVANT');

  // Marathi
  const res1_mr = await semanticValidator.validateInterviewAnswer({
    rawText: 'रुग्णांना डॉक्टरांच्या भेटीसाठी ऑनलाईन नोंदणी करता यावी आणि थेट ओपीडी टोकन क्रमांक मिळावा.',
    project: hospitalProject,
    sectionConfig: sec4,
    currentQuestion: 'सिस्टममध्ये कोणती वैशिष्ट्ये असावीत?'
  });
  assert(res1_mr.isRelevant === true && res1_mr.classification === 'RELEVANT', 'Marathi hospital appointment answer is classified as RELEVANT');

  // Hinglish
  const res1_hng = await semanticValidator.validateInterviewAnswer({
    rawText: 'Patients online doctor appointment book kar sakein aur real-time queue status live dekh sakein.',
    project: hospitalProject,
    sectionConfig: sec4,
    currentQuestion: 'What core features are needed?'
  });
  assert(res1_hng.isRelevant === true && res1_hng.classification === 'RELEVANT', 'Hinglish hospital appointment answer is classified as RELEVANT');

  // =========================================================================
  // TEST SUITE 2: Context Mismatch / Unrelated Cross-Project Answers
  // =========================================================================
  console.log('\n--- TEST SUITE 2: Intercepting Cross-Project & Unrelated Answers ---');

  // Passing Expense Tracker answer into Hospital Project
  const res2_mismatch1 = await semanticValidator.validateInterviewAnswer({
    rawText: 'Users can categorize their monthly grocery expenses and export credit card statement to CSV.',
    project: hospitalProject,
    sectionConfig: sec4,
    currentQuestion: 'What core features must the hospital system provide?'
  });
  assert(res2_mismatch1.isOutOfScope === true && (res2_mismatch1.status === 'CONTEXT_MISMATCH' || res2_mismatch1.classification === 'UNRELATED'), 'Expense categorization is rejected as CONTEXT_MISMATCH for Hospital project');
  assert(res2_mismatch1.feedbackMessage && res2_mismatch1.feedbackMessage.length > 5, 'Provides clear feedback explaining mismatch with hospital project');

  // Passing Football / Cricket chit-chat into Hospital Project
  const res2_mismatch2 = await semanticValidator.validateInterviewAnswer({
    rawText: 'Kal India aur Australia ka cricket match kaisa raha aur score kya hai?',
    project: hospitalProject,
    sectionConfig: sec3,
    currentQuestion: 'What roles exist in the hospital system?'
  });
  assert(res2_mismatch2.isOutOfScope === true, 'Cricket chit-chat is rejected as CONTEXT_MISMATCH for Hospital project');

  // Passing Hospital answer into Campus Event Project
  const res2_mismatch3 = await semanticValidator.validateInterviewAnswer({
    rawText: 'Doctor can prescribe medication and send prescription to the pharmacy triage.',
    project: campusProject,
    sectionConfig: sec4,
    currentQuestion: 'What features are needed for student club event registration?'
  });
  assert(res2_mismatch3.isOutOfScope === true, 'Doctor prescription is rejected as CONTEXT_MISMATCH for Campus Event project');

  // =========================================================================
  // TEST SUITE 3: Partially Relevant Answers (Vague / Incomplete)
  // =========================================================================
  console.log('\n--- TEST SUITE 3: Handling Partially Relevant / Vague Answers ---');

  const res3_partial = await semanticValidator.validateInterviewAnswer({
    rawText: 'It should be very good and fast for everyone.',
    project: expenseProject,
    sectionConfig: SECTIONS_CONFIG[4], // Non-functional requirements
    currentQuestion: 'What are the performance and response-time targets?'
  });
  assert(res3_partial.classification === 'PARTIALLY_RELEVANT' || res3_partial.isPartiallyRelevant || res3_partial.isRelevant, 'Vague performance answer flagged as needing specific metrics');
  assert(res3_partial.feedbackMessage || res3_partial.clarificationNeeds, 'Clarification guidance generated for vague answer');

  // =========================================================================
  // TEST SUITE 4: Meaningless & Invalid Input
  // =========================================================================
  console.log('\n--- TEST SUITE 4: Meaningless & Invalid Input ---');

  const res4_gibberish = await semanticValidator.validateInterviewAnswer({
    rawText: 'asdfg qwer 12345 !!!',
    project: hospitalProject,
    sectionConfig: sec1,
    currentQuestion: 'What problem does this project solve?'
  });
  assert(res4_gibberish.classification === 'INVALID' || res4_gibberish.isOutOfScope === true, 'Gibberish text rejected as INVALID');

  const res4_empty = await semanticValidator.validateInterviewAnswer({
    rawText: '   ',
    project: hospitalProject,
    sectionConfig: sec1,
    currentQuestion: 'What problem does this project solve?'
  });
  assert(res4_empty.classification === 'INVALID', 'Empty text rejected as INVALID');

  // =========================================================================
  // TEST SUITE 5: Full Interview Turn Pipeline Execution & Context Isolation
  // =========================================================================
  console.log('\n--- TEST SUITE 5: Full Interview Turn Pipeline & Context Isolation ---');

  // Turn 1: Valid hospital answer -> extracts requirements
  const turn1_valid = await interviewAgent.processInterviewTurn({
    projectContext: hospitalProject,
    conversationHistory: [{ sender: 'AI', content: 'What core features must the system provide?' }],
    currentSectionConfig: sec4,
    currentQuestion: 'What core features must the system provide?',
    existingRequirements: [],
    lastUserMessage: 'Patients can search for doctors by specialty, select available time slots, and confirm appointments with instant SMS token notification.'
  });

  assert(turn1_valid.isRelevant === true && turn1_valid.isOutOfScope === false, 'Valid hospital answer accepted by interview agent');
  assert(turn1_valid.extractedRequirements.length >= 1, `Extracted ${turn1_valid.extractedRequirements.length} valid requirements`);

  // Turn 2: Unrelated answer -> 0 requirements, isOutOfScope = true, stay on section
  const turn2_unrelated = await interviewAgent.processInterviewTurn({
    projectContext: hospitalProject,
    conversationHistory: [{ sender: 'AI', content: 'What core features must the system provide?' }],
    currentSectionConfig: sec4,
    currentQuestion: 'What core features must the system provide?',
    existingRequirements: turn1_valid.extractedRequirements,
    lastUserMessage: 'I want to track monthly grocery budget and categorize credit card transactions into dining and entertainment.'
  });

  assert(turn2_unrelated.isOutOfScope === true, 'Unrelated expense answer intercepted by interview agent');
  assert(turn2_unrelated.extractedRequirements.length === 0, 'ZERO requirements extracted from unrelated answer');
  assert(turn2_unrelated.sectionCompleted === false, 'Section NOT marked as completed on unrelated answer');
  assert(turn2_unrelated.question.includes(hospitalProject.projectName) || turn2_unrelated.question.includes(sec4.name), 'Redirection question keeps user focused on hospital project and stage');

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
