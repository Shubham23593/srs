module.exports = {
  getSRSReviewPrompt: (srsDoc, requirementsList) => `
You are a Quality Audit Agent reviewing a generated Software Requirements Specification against ISO/IEC/IEEE 29148.

SRS Document Snapshot:
Title: ${srsDoc.metadata?.title}
Section 1 Purpose: ${srsDoc.section1_introduction?.purpose}
Features in Section 3: ${(srsDoc.section3_systemFeatures || []).map(f => f.featureName).join(', ')}

Requirements to cross-check:
${requirementsList.map(r => `[${r.requirementId}] ${r.title}`).join('\n')}

Review Criteria:
1. Missing requirements from Section 3
2. Incorrect classification or section placement
3. Unsupported assertions or hallucinations
4. Inconsistent terminology

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
