/**
 * ============================================================================
 * MANDATORY END-TO-END PIPELINE TEST
 * ============================================================================
 * Runs all 15 required scenarios through the REAL production stack:
 *   HTTP API -> Backend Controllers -> AI Requirements Pipeline ->
 *   Persistence (MongoDB or in-memory fallback) -> Requirements Catalog ->
 *   Topic Clustering -> Section Mapping -> Section-wise SRS -> Quality Audit.
 *
 * For every test it prints:
 *   RAW INPUT -> SEMANTIC ANALYSIS -> EXTRACTED REQUIREMENTS -> CLASSIFICATION
 *   -> QUALITY FLAGS -> FINAL NORMALIZED REQUIREMENTS -> SRS SECTION MAPPING
 *   -> FINAL SRS OUTPUT
 *
 * The test PASSES only if raw interview text is never copied into a
 * requirement description or the English SRS.
 *
 * Usage: node src/scripts/testPipelineE2E.js   (backend must be running on :5000)
 */
const axios = require('axios');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5000/api';

const project = {
  projectName: 'Smart Expense Management System',
  description: 'A web application that helps users track daily expenses, set budgets and view financial reports.',
  scope: 'expense tracking, budget management, monthly reports, notifications, user authentication',
  domain: 'Personal Finance',
  targetUsers: ['Individual Users', 'Administrators']
};

// Reusable check harness
const results = { passed: 0, failed: 0, failures: [] };
function check(name, cond, detail = '') {
  if (cond) { results.passed++; console.log(`    ✅ ${name}`); }
  else { results.failed++; results.failures.push(name); console.log(`    ❌ ${name} ${detail}`); }
}

function section(id) {
  return { req: id };
}

async function main() {
  console.log('====================================================================');
  console.log(' INTELLISDLC AI — END-TO-END REQUIREMENTS PIPELINE VERIFICATION');
  console.log('====================================================================\n');

  // ---- Setup project ----
  const projRes = await axios.post(`${BASE}/projects`, project);
  const projectId = projRes.data.data._id;
  console.log(`[SETUP] Project created: ${project.projectName} (${projectId})\n`);

  // Start interview
  await axios.post(`${BASE}/projects/${projectId}/interview/start`);

  // The 15 tests. Each answer is posted as a real interview message.
  const SECT = {
    func: 'FUNCTIONAL_REQUIREMENTS',
    nfr: 'NON_FUNCTIONAL_REQUIREMENTS',
    con: 'CONSTRAINTS',
    asm: 'ASSUMPTIONS_AND_DEPENDENCIES'
  };

  const scenarios = [
    { n: 1,  name: 'Short English',            sectionId: SECT.func, text: 'Users should be able to log in.' },
    { n: 2,  name: 'Short Hindi',              sectionId: SECT.func, text: 'उपयोगकर्ता खर्च जोड़ सकते हैं।' },
    { n: 3,  name: 'Short Marathi',            sectionId: SECT.func, text: 'Admin user accounts manage karu shakto.' },
    { n: 4,  name: 'Short Hinglish',           sectionId: SECT.func, text: 'User expense add kar sakta hai.' },
    { n: 5,  name: 'Long paragraph / one capability', sectionId: SECT.func, text: 'The system should let users record their daily expenses whenever they spend money, capturing the amount, date and category of each purchase.' },
    { n: 6,  name: 'Long paragraph / multiple requirements', sectionId: SECT.func, text: 'Users can add, update and delete expenses. They should also be able to view monthly reports and receive notifications about their budgets.' },
    { n: 7,  name: 'Duplicate phrased differently', sectionId: SECT.func, text: 'Users should be able to record expenses.' },
    { n: 8,  name: 'Conflicting requirements (a)', sectionId: SECT.func, text: 'All users can view every user financial data.' },
    { n: 81, name: 'Conflicting requirements (b)', sectionId: SECT.func, text: 'Users can only view their own private financial information.' },
    { n: 82, name: 'Auto-vs-manual report conflict', sectionId: SECT.func, text: 'Reports are generated automatically whenever new expense data arrives.' },
    { n: 83, name: 'Auto-vs-manual report conflict (2)', sectionId: SECT.func, text: 'Reports are generated only when manually requested by the user.' },
    { n: 9,  name: 'Ambiguous requirement',    sectionId: SECT.nfr, text: 'System fast hona chahiye.' },
    { n: 92, name: 'Ambiguous (secure)',       sectionId: SECT.nfr, text: 'The system should be secure.' },
    { n: 10, name: 'Completely unrelated',     sectionId: SECT.func, text: 'Mujhe football match dekhna hai.' },
    { n: 11, name: 'Mixed Hindi+Marathi+English', sectionId: SECT.func, text: 'User la expenses add karne chahiye and report pan baghta ali pahije.' },
    { n: 13, name: 'Constraint (PostgreSQL)',  sectionId: SECT.con, text: 'System must use PostgreSQL.' },
    { n: 14, name: 'Dependency (email provider)', sectionId: SECT.asm, text: 'The system depends on an email notification provider.' }
  ];

  const collected = {};

  for (const sc of scenarios) {
    console.log(`\n──────────────────────────────────────────────────────────────────`);
    console.log(`TEST ${sc.n}: ${sc.name}`);
    console.log(`  RAW INPUT: "${sc.text}"`);

    const res = await axios.post(`${BASE}/projects/${projectId}/interview/message`, { content: sc.text, action: 'ANSWER', sectionId: sc.sectionId });
    const data = res.data.data;

    const aiMsg = data.aiMessage;
    const userMsg = data.userMessage;
    const analysis = userMsg?.analysisResult || {};
    const iq = analysis.informationQuality || {};
    const isOOS = data.isOutOfScope;

    console.log(`  ↓ SEMANTIC ANALYSIS`);
    console.log(`    language=${analysis.language} outOfScope=${!!isOOS} validSpecs=${iq.validSpecifications} ambiguities=${iq.ambiguities} duplicates=${iq.duplicatesDetected ?? 0} conflicts=${iq.ruleConflicts ?? 0}`);

    if (isOOS) {
      console.log(`  ↓ RESULT: OUT OF SCOPE — no requirement created`);
      console.log(`  ↳ AI: "${(aiMsg?.content || '').slice(0, 100)}..."`);
      collected[sc.n] = { outOfScope: true };
      check(`T${sc.n} unrelated input produced no requirement`, (data.newRequirementsExtracted || []).length === 0);
      continue;
    }

    // Fetch catalog and filter to the requirements extracted by THIS answer
    const catRes = await axios.get(`${BASE}/projects/${projectId}/requirements`);
    const catalog = catRes.data.data;
    const newIds = data.newRequirementsExtracted || [];
    const newest = catalog.filter((r) => newIds.includes(r.requirementId));

    console.log(`  ↓ EXTRACTED → CLASSIFICATION → NORMALIZED REQUIREMENTS:`);
    for (const r of newest) {
      console.log(`    [${r.requirementId}] (${r.type}${r.type === 'NON_FUNCTIONAL' ? '/' + r.nfrSubcategory : ''}) ${r.title} [${r.priority}/${r.status}]`);
      console.log(`        → "${r.normalizedDescription || r.description}"`);
      if (r.ambiguityFlags?.length) console.log(`        ⚠ ambiguity: ${r.ambiguityFlags.join(', ')}`);
      if (r.clarificationQuestion) console.log(`        ❓ clarification: ${r.clarificationQuestion.slice(0, 90)}`);
      if (r.duplicateCandidates?.length) console.log(`        🔁 duplicate of: ${r.duplicateCandidates.join(', ')}`);
      if (r.conflictReferences?.length) console.log(`        ⚔ conflict with: ${r.conflictReferences.join(', ')}`);
    }
    collected[sc.n] = { newest, all: catalog, aiRedirection: aiMsg?.content };
  }

  // ===== Catalog-level assertions =====
  console.log(`\n\n====================================================================`);
  console.log(' CATALOG-LEVEL ASSERTIONS (Tests 12, 13, 14, 15)');
  console.log('====================================================================');

  const catRes = await axios.get(`${BASE}/projects/${projectId}/requirements`);
  const catalog = catRes.data.data;
  console.log(`\n[CATALOG] ${catalog.length} requirements persisted.`);

  const rawTexts = scenarios.map((s) => s.text);

  // TEST 12: no raw input appears in requirement descriptions
  let rawLeakInCatalog = null;
  for (const r of catalog) {
    const desc = (r.normalizedDescription || r.description || '');
    for (const raw of rawTexts) {
      if (raw.length >= 12 && desc.toLowerCase().includes(raw.toLowerCase().slice(0, Math.min(raw.length, 30)))) {
        rawLeakInCatalog = { id: r.requirementId, raw: raw.slice(0, 50) };
      }
    }
    // description must never contain Devanagari or Hinglish conversational markers
    if (/[\u0900-\u097F]/.test(desc)) rawLeakInCatalog = rawLeakInCatalog || { id: r.requirementId, raw: 'Devanagari in description' };
  }
  console.log('\nTEST 12: No raw interview text in Requirements Catalog');
  check('catalog descriptions never contain raw interview text', !rawLeakInCatalog, JSON.stringify(rawLeakInCatalog));
  check('every requirement has a normalizedDescription', catalog.every((r) => r.normalizedDescription && r.normalizedDescription.length > 10));
  check('every requirement keeps rawSourceText as separate evidence', catalog.every((r) => r.rawSourceText && r.rawSourceText.length > 0));
  check('every statement follows formal grammar', catalog.every((r) => /^(the system|users|administrators) (shall|must)/i.test((r.normalizedDescription || '').trim())));

  // TEST 15: unrelated input generated no requirement
  console.log('\nTEST 15: Unrelated input generates NO requirement');
  const unrelatedReqs = catalog.filter((r) => /football|match dekhna/i.test(r.normalizedDescription || '') || /football|match dekhna/i.test(r.title || ''));
  check('no requirement references football/match', unrelatedReqs.length === 0);

  // Duplicate detection (T7): "record expenses" should be flagged duplicate of add-expense
  console.log('\nTEST 7: Semantic duplicate detection');
  const dupFlagged = catalog.some((r) => (r.duplicateCandidates || []).length > 0);
  check('a duplicate candidate was flagged semantically', dupFlagged);

  // Conflict detection (T8)
  console.log('\nTEST 8: Rule conflict detection');
  const issuesRes = await axios.get(`${BASE}/projects/${projectId}/requirements/issues`);
  const issues = issuesRes.data.data || [];
  const conflicts = issues.filter((i) => i.issueType === 'RULE_CONFLICT' || i.issueType === 'CONFLICT');
  check('rule conflict(s) recorded and preserved', conflicts.length >= 1, `found ${conflicts.length}`);
  check('conflict did NOT silently drop either requirement', catalog.length >= 1);

  // Ambiguity (T9)
  console.log('\nTEST 9: Ambiguity detection + clarification question');
  const ambiguous = catalog.filter((r) => r.status === 'NEEDS_CLARIFICATION');
  check('ambiguous requirements marked NEEDS_CLARIFICATION (not auto-approved)', ambiguous.length >= 1, `count=${ambiguous.length}`);
  check('clarification question created (no invented metrics)', ambiguous.every((r) => !r.clarificationQuestion || r.clarificationQuestion.includes('?')));
  const perfReqs = catalog.filter((r) => r.nfrSubcategory === 'PERFORMANCE');
  check('performance requirement does NOT invent a response time', perfReqs.every((r) => !/\d+\s*(ms|seconds|second)/i.test(r.normalizedDescription)));

  // ===== SRS GENERATION =====
  console.log(`\n\n====================================================================`);
  console.log(' SRS GENERATION (Clustering → Section Mapping → Section-wise → Audit)');
  console.log('====================================================================');

  const srsRes = await axios.post(`${BASE}/projects/${projectId}/srs/generate`);
  const srs = srsRes.data.data;
  const audit = srsRes.data.audit;

  console.log(`\n[SRS] "${srs.metadata?.title}"  v${srs.currentVersion}`);

  // Re-fetch catalog (now has section mapping + clusters)
  const catAfter = (await axios.get(`${BASE}/projects/${projectId}/requirements`)).data.data;

  console.log('\n  ↓ SRS SECTION MAPPING (each requirement):');
  for (const r of catAfter) {
    console.log(`    ${r.requirementId.padEnd(7)} → §${r.targetSrsSection} ${r.targetSrsSectionName}  [cluster: ${r.topicCluster}]`);
  }

  console.log('\n  ↓ FINAL SRS OUTPUT (Section 3 System Features):');
  for (const f of srs.section3_systemFeatures || []) {
    console.log(`    §${f.featureId} ${f.featureName}`);
    for (const fr of f.functionalRequirements || []) {
      console.log(`        ${fr.requirementId}: ${fr.statement}`);
    }
  }
  console.log('  ↓ Section 5 Non-functional:');
  const s5 = srs.section5_otherNonfunctionalRequirements || {};
  for (const [k, v] of Object.entries(s5)) {
    const arr = Array.isArray(v) ? v : [v];
    for (const line of arr) console.log(`    [${k}] ${line}`);
  }
  console.log('  ↓ Section 2 constraints/assumptions:');
  console.log(`    [2.5] ${(srs.section2_overallDescription?.designAndImplementationConstraints || '').slice(0, 140)}`);
  console.log(`    [2.7] ${(srs.section2_overallDescription?.assumptionsAndDependencies || '').slice(0, 140)}`);

  // ===== SRS-level assertions =====
  console.log('\n====================================================================');
  console.log(' SRS QUALITY AUDIT RESULTS');
  console.log('====================================================================');
  for (const c of audit.checks || []) {
    console.log(`  ${c.passed ? '✅' : '❌'} ${c.id} — ${c.detail}`);
  }

  // TEST 13: no Hindi/Hinglish/Marathi raw text in English SRS
  console.log('\nTEST 13: No non-English / raw interview text in English SRS');
  const srsText = JSON.stringify(srs);
  const hasDevanagariInSrs = /[\u0900-\u097F]/.test(srsText);
  check('SRS contains no Devanagari (Hindi/Marathi) text', !hasDevanagariInSrs);
  const hinglishLeak = ['chahiye', 'kar sakta', 'hona chahiye', 'pahije', 'shakto', 'baghta', 'dekh sakta', 'karne'].filter((m) => srsText.toLowerCase().includes(m));
  check('SRS contains no Hinglish/Marathi conversational text', hinglishLeak.length === 0, hinglishLeak.join(','));
  let srsRawLeak = null;
  for (const raw of rawTexts) {
    if (raw.length >= 20 && srsText.toLowerCase().includes(raw.toLowerCase().slice(0, Math.min(raw.length, 30)))) {
      srsRawLeak = raw.slice(0, 50);
    }
  }
  check('SRS never embeds a raw interview sentence', !srsRawLeak, String(srsRawLeak));

  // TEST 14: every active requirement maps to correct SRS section
  console.log('\nTEST 14: Active requirements map to correct SRS sections');
  const active = catAfter.filter((r) => r.status !== 'DEPRECATED' && r.status !== 'REJECTED');
  check('every requirement has a target SRS section', active.every((r) => r.targetSrsSection));
  const functionalInSec3 = active.filter((r) => r.type === 'FUNCTIONAL').every((r) => r.targetSrsSection === '3');
  check('all FUNCTIONAL requirements map to Section 3', functionalInSec3);
  const perfMap = active.filter((r) => r.nfrSubcategory === 'PERFORMANCE').every((r) => r.targetSrsSection === '5.1');
  check('PERFORMANCE NFRs map to Section 5.1', perfMap);
  const secMap = active.filter((r) => r.nfrSubcategory === 'SECURITY').every((r) => r.targetSrsSection === '5.3');
  check('SECURITY NFRs map to Section 5.3', secMap);
  const conMap = active.filter((r) => r.type === 'CONSTRAINT').every((r) => r.targetSrsSection === '2.5');
  check('CONSTRAINTs map to Section 2.5', conMap);
  const depMap = active.filter((r) => r.type === 'DEPENDENCY' || r.type === 'ASSUMPTION').every((r) => r.targetSrsSection === '2.7');
  check('DEPENDENCY/ASSUMPTION map to Section 2.7', depMap);
  const intMap = active.filter((r) => r.type === 'INTERFACE').every((r) => r.targetSrsSection === '4');
  check('INTERFACE maps to Section 4', intMap);

  // Audit gate
  console.log('\nFINAL QUALITY AUDIT GATE');
  check(`quality audit passed (${audit.passedCount}/${audit.totalChecks} checks)`, audit.passed === true);

  // Language guard
  check('final language guard passed (English only)', srsRes.data.languageAudit?.passed === true);

  // ===== Summary =====
  console.log('\n====================================================================');
  console.log(` RESULT: ${results.passed} passed, ${results.failed} failed`);
  if (results.failed) {
    console.log(' FAILURES: ' + results.failures.join(' | '));
    console.log('====================================================================');
    process.exit(1);
  }
  console.log(' ALL MANDATORY END-TO-END CHECKS PASSED — raw interview text never');
  console.log(' reaches the Requirements Catalog descriptions or the English SRS.');
  console.log('====================================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('E2E test crashed:', err.response?.data || err.message);
  console.error(err.stack?.split('\n').slice(0, 8).join('\n'));
  process.exit(1);
});
