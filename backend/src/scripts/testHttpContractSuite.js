/**
 * ============================================================================
 *  Phase-3 REAL-STACK HTTP CONTRACT & STATE-MACHINE TEST SUITE
 * ============================================================================
 *  Verifies the ISO/IEC/IEEE 29148 requirements-elicitation pipeline end to end
 *  over the live HTTP API (no mocks):
 *
 *   1. Strict 9-stage state machine (stage authoritative for extraction /
 *      follow-up / completion / advancement).
 *   2. Structured result contract on every answer (accepted, relevanceStatus,
 *      informationType, stage, extractedEntities, requirementCandidates,
 *      rejectedCandidates, clarificationNeeded, missingInformation,
 *      stageComplete, shouldAdvance, nextStage, followUpQuestion,
 *      providerStatus, warnings).
 *   3. USER ANSWER -> classify TYPE -> validate context/stage -> extract only
 *      what is present -> gate -> validate/normalize -> dedupe/conflict ->
 *      persist to the CORRECT store (requirements vs project knowledge).
 *   4. Zero hallucination: no invented metrics; vague quality ->
 *      NEEDS_CLARIFICATION + one targeted follow-up; LLM-down is graceful.
 *   5. SRS English-only, requirements normalized, raw evidence kept separate.
 *
 *  Usage:  node src/scripts/testHttpContractSuite.js
 *  Requires: backend running on BASE (default http://127.0.0.1:5000/api)
 * ============================================================================
 */

const axios = require('axios');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5000/api';

const results = { passed: 0, failed: 0, failures: [] };
function check(name, cond, detail = '') {
  if (cond) { results.passed++; console.log(`    ✅ ${name}`); }
  else { results.failed++; results.failures.push(name); console.log(`    ❌ ${name} ${detail}`); }
}

async function post(url, body = {}) {
  return (await axios.post(`${BASE}${url}`, body)).data;
}
async function get(url) {
  return (await axios.get(`${BASE}${url}`)).data;
}

async function createProject(overrides = {}) {
  const payload = {
    projectName: overrides.projectName || `Contract Test Project ${Date.now()}`,
    description: overrides.description || 'A hospital appointment and OPD queue management system that lets patients book doctor appointments, view live token numbers, and receive SMS queue alerts.',
    scope: overrides.scope || 'patient appointment booking, live OPD token tracking, doctor availability roster, SMS queue alerts, digital prescriptions',
    domain: overrides.domain || 'Healthcare & Hospital Management',
    targetUsers: overrides.targetUsers || ['Patients', 'Doctors', 'Receptionists']
  };
  const res = await post('/projects', payload);
  return res.data._id;
}

async function startInterview(projectId) {
  await post(`/projects/${projectId}/interview/start`, {});
}

async function answer(projectId, content, sectionId, action = 'ANSWER') {
  const res = await post(`/projects/${projectId}/interview/message`, { content, action, sectionId });
  return res.data;
}

async function catalog(projectId) {
  return (await get(`/projects/${projectId}/requirements`)).data;
}
async function projectDoc(projectId) {
  return (await get(`/projects/${projectId}`)).data;
}

async function main() {
  console.log('====================================================================');
  console.log(' PHASE-3 HTTP CONTRACT & STAGE STATE-MACHINE SUITE (real stack)');
  console.log('====================================================================\n');

  // ---------------------------------------------------------------- health
  const health = await get('/health');
  check('T01 backend health endpoint responds', !!health);

  const projectId = await createProject();
  check('T02 project created over HTTP', !!projectId);

  await startInterview(projectId);
  const session = (await get(`/projects/${projectId}/interview`)).data;
  check('T03 interview session started with 9 stages',
    Array.isArray(session?.sectionsConfig) && session.sectionsConfig.length === 9,
    `stages=${session?.sectionsConfig?.length}`);

  // =========================================================== STAGE 0/1/2
  // PROJECT_INFORMATION: knowledge, NOT requirements
  console.log('\n── STAGE: PROJECT_INFORMATION (knowledge only) ──');
  const r0 = await answer(projectId,
    'The problem we solve is long OPD waiting lines. Our primary objective is to cut average wait time by giving patients live token status.',
    'PROJECT_INFORMATION');
  const c0 = r0?.userMessage?.analysisResult || {};
  check('T04 project-info answer accepted (not OOS)', r0?.isOutOfScope !== true);
  check('T05 contract has relevanceStatus', typeof c0.relevanceStatus === 'string');
  check('T06 contract has stage.stageId', c0.stage?.stageId === 'PROJECT_INFORMATION');
  check('T07 contract has informationType field', typeof c0.informationType === 'string');
  check('T08 contract has providerStatus (AI/fallback)', typeof c0.providerStatus === 'string');
  check('T09 contract has followUpQuestion string', typeof c0.followUpQuestion === 'string');
  check('T10 project-info creates NO requirements', (r0?.newRequirementsExtracted || []).length === 0,
    `new=${JSON.stringify(r0?.newRequirementsExtracted)}`);

  // STAKEHOLDERS: stakeholders stored as KNOWLEDGE, not requirements
  console.log('\n── STAGE: STAKEHOLDERS_AND_USERS (knowledge only) ──');
  const r1 = await answer(projectId,
    'Primary users are patients and their attendants. Secondary stakeholders are doctors, reception desk staff, and the hospital IT administrator.',
    'STAKEHOLDERS_AND_USERS');
  const c1 = r1?.userMessage?.analysisResult || {};
  check('T11 stakeholder answer accepted', r1?.isOutOfScope !== true);
  check('T12 stakeholder answer creates NO requirements', (r1?.newRequirementsExtracted || []).length === 0);
  check('T13 stakeholder entities extracted into knowledge',
    Object.keys(c1.extractedEntities || {}).length > 0,
    `entities=${JSON.stringify(c1.extractedEntities)}`);

  // ROLES: roles/permissions knowledge
  console.log('\n── STAGE: USER_ROLES_AND_PERMISSIONS (knowledge only) ──');
  const r2 = await answer(projectId,
    'Doctors can view their own appointment roster and mark consultation complete. Receptionists can create and reschedule appointments but cannot access clinical notes.',
    'USER_ROLES_AND_PERMISSIONS');
  const c2 = r2?.userMessage?.analysisResult || {};
  check('T14 roles answer accepted', r2?.isOutOfScope !== true);
  check('T15 role/permission answer creates NO requirements', (r2?.newRequirementsExtracted || []).length === 0);

  // =========================================================== STAGE 3: FR
  console.log('\n── STAGE: FUNCTIONAL_REQUIREMENTS ──');
  const r3 = await answer(projectId,
    'Patients should be able to search for doctors by specialty, select an available time slot, and confirm an appointment. They should also receive an SMS with their live token number.',
    'FUNCTIONAL_REQUIREMENTS');
  const c3 = r3?.userMessage?.analysisResult || {};
  const reqs3 = c3.requirementCandidates || [];
  check('T16 FR answer accepted', r3?.isOutOfScope !== true);
  check('T17 FR answer extracts >=1 requirement candidate', reqs3.length >= 1, `cands=${reqs3.length}`);
  check('T18 requirement candidates are classified FUNCTIONAL',
    reqs3.every((r) => r.type === 'FUNCTIONAL'),
    `types=${[...new Set(reqs3.map((r) => r.type))].join(',')}`);
  check('T19 normalized statements are formal English (The system shall...)',
    reqs3.every((r) => /^the system shall/i.test((r.normalizedDescription || '').trim())),
    reqs3.map((r) => r.normalizedDescription).join(' | '));
  check('T20 normalized statements contain NO Devanagari',
    reqs3.every((r) => !/[ऀ-ॿ]/.test(r.normalizedDescription || '') && !/[ऀ-ॿ]/.test(r.title || '')));
  check('T21 contract requirementCandidates persisted (newRequirementsExtracted non-empty)',
    (r3?.newRequirementsExtracted || []).length >= 1);

  // Knowledge store separate from requirements: roles persisted to Project, not Requirement
  const pdoc = await projectDoc(projectId);
  check('T22 roles/permissions stored as PROJECT knowledge (separate from requirements)',
    Array.isArray(pdoc.roles) && pdoc.roles.length >= 1,
    `roles=${JSON.stringify(pdoc.roles)}`);

  // =========================================================== CONTEXT GUARD
  console.log('\�\n── CONTEXT / OUT-OF-SCOPE GUARD ──');
  const rOOS = await answer(projectId,
    'Users can categorize their monthly grocery expenses and export a credit card statement to CSV.',
    'FUNCTIONAL_REQUIREMENTS');
  const cOOS = rOOS?.userMessage?.analysisResult || {};
  check('T23 cross-domain expense answer blocked as out-of-scope', rOOS?.isOutOfScope === true);
  check('T24 OOS answer creates zero requirements', (rOOS?.newRequirementsExtracted || []).length === 0);
  check('T25 OOS does NOT advance the stage', rOOS?.stageChanged === false);
  check('T26 OOS answer carries a redirection follow-up question',
    typeof cOOS.followUpQuestion === 'string' && /\?/.test(cOOS.followUpQuestion || rOOS?.aiMessage?.content || ''));

  const rGib = await answer(projectId, 'asdfgh qwerty zxcvbn 12345', 'FUNCTIONAL_REQUIREMENTS');
  check('T27 gibberish answer blocked', rGib?.isOutOfScope === true);
  check('T28 gibberish creates zero requirements', (rGib?.newRequirementsExtracted || []).length === 0);

  // =========================================================== STAGE 4: NFR
  console.log('\n── STAGE: NON_FUNCTIONAL_REQUIREMENTS (no fabricated metrics) ──');
  const rVague = await answer(projectId, 'System fast hona chahiye.', 'NON_FUNCTIONAL_REQUIREMENTS');
  const cV = rVague?.userMessage?.analysisResult || {};
  check('T29 vague quality answer accepted as on-topic (not OOS)', rVague?.isOutOfScope !== true);
  const vagueNfr = (cV.requirementCandidates || []).find((r) => r.type === 'NON_FUNCTIONAL');
  check('T30 vague NFR captured and held as NEEDS_CLARIFICATION (never auto-approved)',
    vagueNfr?.status === 'NEEDS_CLARIFICATION', `status=${vagueNfr?.status}`);
  check('T31 no fabricated response-time/availability metric invented',
    !/\b(\d+\s*(ms|milliseconds?|seconds?)|99\.\d+%|\d+%)/.test(vagueNfr?.normalizedDescription || ''),
    vagueNfr?.normalizedDescription);
  check('T32 clarificationNeeded flag set for vague NFR', cV.clarificationNeeded === true);

  const rMeas = await answer(projectId,
    'The system shall load the appointment page within 2 seconds and maintain 99.9% availability during OPD hours.',
    'NON_FUNCTIONAL_REQUIREMENTS');
  const cM = rMeas?.userMessage?.analysisResult || {};
  const measNfrs = (cM.requirementCandidates || []).filter((r) => r.type === 'NON_FUNCTIONAL');
  check('T33 user-stated measurable NFRs are preserved with real metrics',
    measNfrs.some((r) => /2\s*seconds/.test(r.normalizedDescription)) &&
    measNfrs.some((r) => /99\.9%/.test(r.normalizedDescription)),
    measNfrs.map((r) => r.normalizedDescription).join(' | '));

  // =========================================================== STAGE GUARD
  console.log('\n── STAGE-AUTHORITATIVE EXTRACTION GUARD ──');
  // An FR-looking answer sent during a KNOWLEDGE stage must NOT create a requirement
  const rWrongStage = await answer(projectId,
    'Patients can cancel appointments and doctors can update the queue.',
    'STAKEHOLDERS_AND_USERS');
  check('T34 requirement candidate rejected when sent in a knowledge stage',
    (rWrongStage?.newRequirementsExtracted || []).length === 0,
    `new=${JSON.stringify(rWrongStage?.newRequirementsExtracted)}`);
  const cat = await catalog(projectId);
  const frCount = cat.filter((r) => r.type === 'FUNCTIONAL').length;
  const nfrCount = cat.filter((r) => r.type === 'NON_FUNCTIONAL').length;
  check('T35 catalog reflects only stage-appropriate persisted requirements',
    frCount >= 2 && nfrCount >= 1, `FR=${frCount} NFR=${nfrCount}`);
  check('T36 every persisted requirement keeps rawSourceText separate from normalized text',
    cat.every((r) => r.rawSourceText && r.rawSourceText.length > 0 &&
      r.normalizedDescription && r.normalizedDescription !== r.rawSourceText));
  check('T37 every persisted requirement records sourceInterviewStage',
    cat.every((r) => !!r.sourceInterviewStage));

  // Duplicate flagged not deleted
  const rDup = await answer(projectId,
    'Patients should be able to confirm an appointment after choosing a time slot.',
    'FUNCTIONAL_REQUIREMENTS');
  const cDup = rDup?.userMessage?.analysisResult || {};
  const dupWarned = (cDup.warnings || []).some((w) => /duplicate/i.test(w)) ||
    (cDup.skippedDuplicates || []).length > 0 ||
    /duplicate/i.test(cDup.followUpQuestion || '');
  check('T38 semantic duplicate is flagged (not silently re-created)', dupWarned);

  // =========================================================== SKIP / ADVANCE
  console.log('\n── SKIP & STAGE-ADVANCE PATHS ──');
  const beforeAdvance = (await get(`/projects/${projectId}/interview`)).data;
  const rSkip = await answer(projectId, '', 'EXTERNAL_INTERFACES', 'SKIP_SECTION');
  check('T39 explicit skip is honored', rSkip?.isOutOfScope !== true);
  check('T40 skip advances the stage (stageChanged true)', rSkip?.stageChanged === true,
    `stageChanged=${rSkip?.stageChanged}`);

  // A single FR answer alone should NOT auto-advance mid-stage (completeness gate)
  const rNoSpamAdvance = await answer(projectId,
    'Receptionists can reschedule an appointment to another doctor.',
    'FUNCTIONAL_REQUIREMENTS');
  // FR stage already had requirements; gate may complete it — but advancement must
  // be a GATE decision, not message-count. Verify the contract reports shouldAdvance
  // consistently with stageChanged.
  const cAdv = rNoSpamAdvance?.userMessage?.analysisResult || {};
  check('T41 contract shouldAdvance matches stageChanged',
    cAdv.shouldAdvance === rNoSpamAdvance?.stageChanged,
    `shouldAdvance=${cAdv.shouldAdvance} stageChanged=${rNoSpamAdvance?.stageChanged}`);

  // =========================================================== SRS ENGLISH
  console.log('\n── SRS GENERATION (English-only, normalized) ──');
  // advance through review: lock then generate
  try {
    await post(`/projects/${projectId}/interview/message`, { action: 'CONFIRM_AND_LOCK', content: '' });
  } catch (e) { /* lock may require coverage; ignore if 400 */ }
  let srsOk = false; let srs = null;
  try {
    const srsRes = await post(`/projects/${projectId}/srs/generate`, {});
    srs = srsRes.data?.data || srsRes.data;
    srsOk = true;
  } catch (e) {
    srsOk = false;
  }
  check('T42 SRS generates successfully over HTTP', srsOk);
  if (srs) {
    const srsJson = JSON.stringify(srs);
    check('T43 SRS content is English-only (no Devanagari leaked)', !/[ऀ-ॿ]/.test(srsJson));
  }

  // =========================================================== SECOND PROJECT ISOLATION
  console.log('\n── MULTI-PROJECT ISOLATION ──');
  const pid2 = await createProject({
    projectName: 'Agri Crop Subsidy Portal',
    description: 'A portal letting farmers apply for crop subsidies and track application status.',
    scope: 'farmer subsidy applications, document upload, application status tracking, officer review',
    domain: 'Agriculture & Government',
    targetUsers: ['Farmers', 'Agriculture Officers']
  });
  await startInterview(pid2);
  const rFarmer = await answer(pid2,
    'किसान फसल सब्सिडी के लिए आवेदन अपलोड कर सकें और अपने आवेदन की स्थिति देख सकें।',
    'FUNCTIONAL_REQUIREMENTS');
  check('T44 Hindi FR in a DIFFERENT project accepted', rFarmer?.isOutOfScope !== true);
  check('T45 second-project FR persisted to THAT project only',
    (rFarmer?.newRequirementsExtracted || []).length >= 1);
  const cat2 = await catalog(pid2);
  const cat1 = await catalog(projectId);
  check('T46 requirement stores are isolated per project',
    cat2.every((r) => r.projectId === pid2 || !r.projectId) &&
    cat1.length !== cat2.length || cat1.every((r) => (r.projectId || projectId) === projectId),
    `cat1=${cat1.length} cat2=${cat2.length}`);

  console.log('\n====================================================================');
  console.log(` RESULT: ${results.passed} passed, ${results.failed} failed`);
  if (results.failed) {
    console.log(' FAILURES:');
    results.failures.forEach((f) => console.log('   - ' + f));
    process.exit(1);
  }
  console.log(' ALL HTTP CONTRACT & STATE-MACHINE CHECKS PASSED');
  console.log('====================================================================');
}

main().catch((e) => {
  console.error('HTTP contract suite crashed:', e?.response?.data || e.message);
  process.exit(1);
});
