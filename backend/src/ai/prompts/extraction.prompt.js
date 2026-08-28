module.exports = {
  getExtractionPrompt: (text, projectContext) => `
You are an expert Requirements Extraction Agent.
Extract all atomic functional and non-functional requirements from the following text based on IEEE 830 and ISO/IEC/IEEE 29148 standards.

Project: ${projectContext.projectName}
Scope: ${projectContext.scope}

Text to extract from:
"""
${text}
"""

Rules:
1. Each requirement must be unambiguous, atomic, and testable.
2. Functional requirements describe WHAT the system shall do.
3. Non-functional requirements describe HOW WELL (performance, security, usability).
4. Do not fabricate requirements not implied by the text.

Return JSON:
{
  "requirements": [
    {
      "title": "Short title",
      "description": "The system shall...",
      "type": "FUNCTIONAL" | "NON_FUNCTIONAL",
      "category": "Core" | "Security" | "Performance" | "Interface",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "confidence": 0.95
    }
  ]
}
`
};
