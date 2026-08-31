module.exports = {
  getSRSReviewPrompt: (srsDoc, requirementsList) => `
You are a Quality Audit Agent reviewing a generated Software Requirements Specification against ISO/IEC/IEEE 29148.

SRS Document Snapshot:
Title: ${srsDoc.metadata?.title || 'Software Requirements Specification'}
Section 1 Purpose: ${srsDoc.section1_introduction?.purpose || 'Not specified'}

Section 3 Features & Mapped Requirements:
${(srsDoc.section3_systemFeatures || []).map((f, i) => {
  const reqs = (f.functionalRequirements || []).map(r => `  - [${r.requirementId}] ${r.title}: "${r.statement || ''}"`).join('\n');
  return `Feature ${f.featureId || `3.${i + 1}`} (${f.featureName}):\n${reqs || '  - No requirements mapped'}`;
}).join('\n\n')}

Active Requirements Catalog to verify:
${requirementsList.map(r => `[${r.requirementId}] (${r.type}) ${r.title}: ${r.normalizedDescription || r.description || ''}`).join('\n')}

Review Criteria:
1. Check that functional requirements are present in Section 3 features.
2. Check classification consistency and section placement.
3. Check for any unsupported assertions or TBD ambiguities.

Return JSON:
{
  "complianceScore": 0.95,
  "findings": [
    {
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "section": "Section 3.1",
      "comment": "Description of finding"
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}
`
};
