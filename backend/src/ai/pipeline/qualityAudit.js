/**
 * Phase 19 — Final Quality Audit.
 * Runs against the active requirement catalog and the generated SRS.
 */

const { containsNonEnglishContent } = require('./languageDetector');

function collectSrsTexts(srs) {
  const texts = [];
  const push = (label, text) => { if (typeof text === 'string' && text.trim()) texts.push({ label, text }); };

  push('section1.purpose', srs.section1_introduction?.purpose);
  push('section1.scope', srs.section1_introduction?.projectScope);
  Object.entries(srs.section2_overallDescription || {}).forEach(([k, v]) => push(`section2.${k}`, v));
  (srs.section3_systemFeatures || []).forEach((f) => {
    push(`section3.${f.featureId}.description`, f.descriptionAndPriority);
    (f.functionalRequirements || []).forEach((fr) => push(`section3.${f.featureId}.${fr.requirementId}`, fr.statement));
  });
  ['performanceRequirements', 'safetyRequirements', 'securityRequirements', 'softwareQualityAttributes'].forEach((k) => {
    const v = srs.section5_otherNonfunctionalRequirements?.[k];
    if (Array.isArray(v)) v.forEach((t, i) => push(`section5.${k}[${i}]`, t));
    else push(`section5.${k}`, v);
  });
  push('section4.softwareInterfaces', srs.section4_externalInterfaceRequirements?.softwareInterfaces);
  return texts;
}

function auditSRS({ srs, requirements, rawSourceTexts = [] }) {
  const checks = [];
  const add = (id, passed, detail) => checks.push({ id, passed, detail });

  const active = requirements.filter((r) => r.status !== 'DEPRECATED' && r.status !== 'REJECTED');

  // Gather all requirement IDs present in SRS
  const srsReqIds = new Set();
  for (const f of srs.section3_systemFeatures || []) {
    for (const fr of f.functionalRequirements || []) srsReqIds.add(fr.requirementId);
  }
  // Section 5 tagged IDs
  const sec5Text = JSON.stringify(srs.section5_otherNonfunctionalRequirements || {});
  const sec2Text = JSON.stringify(srs.section2_overallDescription || {});
  const sec4Text = JSON.stringify(srs.section4_externalInterfaceRequirements || {});
  const allTaggedText = `${sec5Text} ${sec2Text} ${sec4Text}`;
  const taggedIds = [...allTaggedText.matchAll(/\b(?:FR|NFR|CON|ASM|DEP|INT|STK|BR)-\d{3}\b/g)].map((m) => m[0]);
  taggedIds.forEach((id) => srsReqIds.add(id));

  // 1. Every active requirement is mapped to the SRS
  const unmapped = active.filter((r) => !srsReqIds.has(r.requirementId)).map((r) => r.requirementId);
  add('ACTIVE_REQS_MAPPED', unmapped.length === 0,
    unmapped.length ? `Unmapped active requirements: ${unmapped.join(', ')}` : 'All active requirements are mapped to the SRS.');

  // 2. No raw interview text appears in the SRS
  const srsTexts = collectSrsTexts(srs);
  let rawLeak = null;
  for (const raw of rawSourceTexts) {
    if (!raw || raw.trim().length < 12) continue;
    const needle = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    for (const { label, text } of srsTexts) {
      if (text.toLowerCase().replace(/\s+/g, ' ').includes(needle.slice(0, Math.min(needle.length, 40)))) {
        rawLeak = { label, raw: raw.slice(0, 80) };
        break;
      }
    }
    if (rawLeak) break;
  }
  add('NO_RAW_TEXT_IN_SRS', !rawLeak, rawLeak ? `Raw interview text detected in ${rawLeak.label}: "${rawLeak.raw}"` : 'No raw interview text appears in the SRS.');

  // 3. No deprecated requirement appears as active
  const deprecatedActive = requirements.filter((r) => r.status === 'DEPRECATED' && srsReqIds.has(r.requirementId)).map((r) => r.requirementId);
  add('NO_DEPRECATED_ACTIVE', deprecatedActive.length === 0,
    deprecatedActive.length ? `Deprecated requirements mapped: ${deprecatedActive.join(', ')}` : 'No deprecated requirement appears in the SRS.');

  // 4. No duplicate requirement is silently mapped twice
  const mappedList = [];
  for (const f of srs.section3_systemFeatures || []) {
    for (const fr of f.functionalRequirements || []) mappedList.push(fr.requirementId);
  }
  const dupMapped = mappedList.filter((id, i) => mappedList.indexOf(id) !== i);
  add('NO_DUPLICATE_MAPPING', dupMapped.length === 0,
    dupMapped.length ? `Requirements mapped more than once: ${[...new Set(dupMapped)].join(', ')}` : 'No requirement is mapped more than once.');

  // 5. All detected conflicts remain visible
  const conflictIds = new Set();
  requirements.forEach((r) => (r.conflictReferences || []).forEach((c) => { conflictIds.add(r.requirementId); conflictIds.add(c); }));
  const issuesList = srs.appendixC_issuesList || [];
  const issuesText = JSON.stringify(issuesList);
  const conflictVisible = [...conflictIds].every((id) => issuesText.includes(id)) || conflictIds.size === 0;
  add('CONFLICTS_VISIBLE', conflictVisible,
    conflictVisible ? 'All rule conflicts are recorded in the issues list.' : 'Some rule conflicts are not reflected in the issues list.');

  // 6. Ambiguous requirements are flagged
  const ambiguous = active.filter((r) => (r.ambiguityFlags || []).length > 0 || r.status === 'NEEDS_CLARIFICATION');
  const ambiguousFlagged = ambiguous.every((r) => r.status === 'NEEDS_CLARIFICATION' || (r.qualityFlags || []).includes('AMBIGUOUS') || r.clarificationQuestion);
  add('AMBIGUOUS_FLAGGED', ambiguousFlagged || ambiguous.length === 0,
    ambiguous.length ? `${ambiguous.length} ambiguous requirement(s) flagged with clarification questions.` : 'No ambiguous requirements present.');

  // 7. SRS language matches configured output language (English)
  const langViolations = srsTexts.filter(({ text }) => containsNonEnglishContent(text));
  add('LANGUAGE_ENGLISH', langViolations.length === 0,
    langViolations.length ? `Non-English content in ${langViolations.map((v) => v.label).join(', ')}` : 'SRS content is entirely in formal English.');

  // 8. Every requirement has a unique ID
  const allIds = requirements.map((r) => r.requirementId);
  const dupIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  add('UNIQUE_IDS', dupIds.length === 0, dupIds.length ? `Duplicate requirement IDs: ${[...new Set(dupIds)].join(', ')}` : 'All requirement IDs are unique.');

  // 9. Requirement statements follow formal grammar
  const informal = requirements
    .filter((r) => !/^(the system|users|administrators) (shall|must)/i.test((r.normalizedDescription || '').trim()))
    .map((r) => r.requirementId);
  add('FORMAL_GRAMMAR', informal.length === 0,
    informal.length ? `Non-formal statements: ${informal.join(', ')}` : 'All statements follow formal "The system shall ..." grammar.');

  // 10. No large unstructured paragraphs stored as requirements
  const paragraphs = requirements
    .filter((r) => (r.normalizedDescription || '').split(/\s+/).length > 60)
    .map((r) => r.requirementId);
  add('NO_PARAGRAPH_REQS', paragraphs.length === 0,
    paragraphs.length ? `Oversized requirement statements: ${paragraphs.join(', ')}` : 'All requirements are atomic, single-statement items.');

  const passed = checks.every((c) => c.passed);
  return {
    passed,
    passedCount: checks.filter((c) => c.passed).length,
    totalChecks: checks.length,
    checks
  };
}

module.exports = { auditSRS };
