module.exports = {
  getAnalysisPrompt: (requirementsList) => `
You are a Software Requirements Quality and Analysis Agent.
Analyze the following list of requirements for Ambiguities, Redundancies/Duplicates, Conflicts, Incompleteness, and Untestability according to ISO/IEC/IEEE 29148 standards.

Requirements:
${requirementsList.map(r => `[${r.requirementId}] (${r.type}) ${r.title}: ${r.description}`).join('\n')}

Rules:
1. Detect vague words (e.g. fast, user-friendly, robust, flexible) and flag them as AMBIGUOUS with quantifiable suggestions.
2. Detect conflicting statements between requirements and flag as CONFLICT.
3. Detect potential semantic duplicates and flag as DUPLICATE.
4. Never silently alter any requirement.

Return JSON:
{
  "issues": [
    {
      "issueType": "AMBIGUITY" | "DUPLICATE" | "CONFLICT" | "INCOMPLETE" | "UNTESTABLE",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "description": "Clear explanation of why this is an issue",
      "relatedRequirementIds": ["FR-001"],
      "suggestedResolution": "Concrete measurable phrasing"
    }
  ]
}
`
};
