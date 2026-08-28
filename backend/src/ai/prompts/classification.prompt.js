module.exports = {
  getClassificationPrompt: (requirement) => `
You are a Requirement Classification Agent.
Classify the following requirement into Functional vs Non-Functional, and assign the appropriate subcategory.

Requirement:
Title: ${requirement.title}
Description: ${requirement.description}

Categories for NFR:
- Performance
- Security
- Usability
- Availability
- Scalability
- Maintainability
- Portability
- Reliability
- Fault Tolerance
- Legal
- Operational
- Look and Feel

For FR:
- Core
- User Interface
- Administration
- Data Management
- Communication

Return JSON:
{
  "type": "FUNCTIONAL" | "NON_FUNCTIONAL",
  "category": "Selected Category",
  "rationale": "Brief justification"
}
`
};
