module.exports = {
  getValidationPrompt: (requirement) => `
You are a Requirements Validation Agent based on ISO/IEC/IEEE 29148.
Validate the requirement against: Clarity, Correctness, Completeness, Consistency, Testability, and Traceability.

Requirement ID: ${requirement.requirementId}
Title: ${requirement.title}
Description: ${requirement.description}
Type: ${requirement.type}

Return JSON:
{
  "validationStatus": "VALID" | "NEEDS_REVIEW" | "INVALID",
  "issues": ["list of issues if any"],
  "suggestedImprovement": "Improved statement preserving intent without inventing details"
}
`
};
