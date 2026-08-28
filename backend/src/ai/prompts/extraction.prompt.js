function getExtractionPrompt(param1, param2) {
  let projectContext = {};
  let userText = '';

  if (typeof param1 === 'string') {
    userText = param1;
    projectContext = param2 || {};
  } else {
    projectContext = param1 || {};
    userText = param2 || '';
  }

  return `
You are an AI Software Requirements Engineer conforming to ISO/IEC/IEEE 29148:2018 and IEEE 830 standards.

PROJECT NAME:
${projectContext?.projectName || 'Software Platform'}

PROJECT SCOPE / DESCRIPTION:
${projectContext?.scope || projectContext?.description || 'Not provided'}

USER INPUT TO EXTRACT REQUIREMENTS FROM:
"""
${userText}
"""

TASK:
Extract atomic, verifiable, testable software requirements from the user's input.
Standardize all requirement descriptions into formal phrasing ("The system shall...").

Return ONLY valid, parseable JSON matching this structure:
{
  "requirements": [
    {
      "title": "Short descriptive requirement title",
      "description": "The system shall allow...",
      "type": "FUNCTIONAL" | "NON_FUNCTIONAL" | "CONSTRAINT" | "ASSUMPTION" | "INTERFACE" | "STAKEHOLDER",
      "nfrSubcategory": "PERFORMANCE" | "SECURITY" | "SCALABILITY" | "AVAILABILITY" | "N/A",
      "category": "Core Features",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "completenessScore": 85,
      "isAtomic": true
    }
  ]
}

RULES:
- Do not invent requirements not implied by the user input.
- Keep each requirement strictly atomic (one testable behavior per requirement).
- Always use formal phrasing ("The system shall...").
`;
}

module.exports = {
  getExtractionPrompt
};
