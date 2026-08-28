module.exports = {
  getSRSGenerationPrompt: (project, validatedRequirements, ragContext) => `
You are a Principal Software Requirements Engineer generating an IEEE 830-1998 and ISO/IEC/IEEE 29148:2018 compliant Software Requirements Specification (SRS).

Project Information:
- Name: ${project.projectName}
- Description: ${project.description}
- Scope: ${project.scope}
- Target Users: ${(project.targetUsers || []).join(', ')}
- Constraints: ${(project.constraints || []).join(', ')}
- Assumptions: ${(project.assumptions || []).join(', ')}

Structured Validated Requirements (USE ONLY THESE STRUCTURED OBJECTS AS REQUIREMENT CONTENT):
${validatedRequirements.map(r => `[${r.requirementId}] (${r.type} / ${r.category || 'General'}) ${r.title}: ${r.description}`).join('\n')}

RAG System Context:
${ragContext}

MANDATORY RULES:
1. STRICT SEPARATION OF SOURCE INPUT & SRS OUTPUT:
   - Do NOT copy raw interview text, chat transcripts, conversational dialogue, Hindi/Hinglish phrasing, or AI conversational explanations into the SRS.
   - All requirement statements must be formal, professional English.

2. ATOMIC REQUIREMENTS:
   - Each requirement entry must specify exactly ONE independently testable capability.
   - Do not combine multiple features into a single requirement statement.

3. FORMAL REQUIREMENT GRAMMAR (ISO 29148):
   - Every requirement statement MUST use the standard normative syntax: "The system shall [action/capability] [condition/context]."
   - Use correct verb phrases: "allow users to log in" (verb with space), "allow users to sign in", "set up".

4. ZERO HALLUCINATIONS:
   - Do NOT invent unstated features, external APIs, biometric logins, 2FA, OTPs, or third-party platforms unless explicitly listed in the Validated Requirements.

5. EXACT 6-SECTION TEMPLATE MAPPING:
   - Map all functional requirements (FR-XXX) to Section 3 (System Features).
   - Map non-functional requirements (NFR-XXX) to Section 5 (Performance, Safety, Security, Quality).
   - Map constraints (CON-XXX) to Section 2.5 and assumptions (ASM-XXX) to Section 2.7.
   - Map interfaces (INT-XXX) to Section 4.
   - Preserve all stable Requirement IDs (FR-001, FR-002, NFR-001) exactly.

6. CONCISE PARAGRAPH LENGTH:
   - Keep introductory descriptions concise, clear, and professional. Avoid fluffy repetitive text.

Return complete, valid JSON matching the exact schema:
{
  "metadata": {
    "title": "Software Requirements Specification for ${project.projectName}",
    "preparedBy": "Requirements Engineering Team",
    "organization": "IntelliSDLC AI Platform",
    "date": "${new Date().toISOString().split('T')[0]}"
  },
  "section1_introduction": {
    "purpose": "Concise purpose of the software system...",
    "documentConventions": "Requirements are tagged using FR-XXX and NFR-XXX conventions...",
    "intendedAudience": "Intended for developers, QA testers, architects, and stakeholders...",
    "projectScope": "Clear boundary and operational scope...",
    "references": [
      "ISO/IEC/IEEE 29148:2018 Systems and software engineering — Requirements engineering",
      "IEEE 830-1998 Recommended Practice for Software Requirements Specifications"
    ]
  },
  "section2_overallDescription": {
    "productPerspective": "Autonomous web application architecture...",
    "productFeatures": "Summary list of key system features...",
    "userClassesAndCharacteristics": "User roles, permissions, and characteristics...",
    "operatingEnvironment": "Server, browser, and database operating environment...",
    "designAndImplementationConstraints": "System implementation constraints...",
    "userDocumentation": "User guides, contextual help, and API manuals...",
    "assumptionsAndDependencies": "Operating dependencies and assumptions..."
  },
  "section3_systemFeatures": [
    {
      "featureId": "3.1",
      "featureName": "Feature Category Name",
      "descriptionAndPriority": "3.1.1 Brief description. Priority: High.",
      "stimulusResponseSequences": ["User initiates action -> System processes request."],
      "functionalRequirements": [
        {
          "requirementId": "FR-001",
          "title": "Feature Title",
          "statement": "The system shall allow users to ..."
        }
      ]
    }
  ],
  "section4_externalInterfaceRequirements": {
    "userInterfaces": "Web interface specifications...",
    "hardwareInterfaces": "Server and workstation hardware parameters...",
    "softwareInterfaces": "Software APIs and data endpoints...",
    "communicationsInterfaces": "HTTPS/TLS communication protocols..."
  },
  "section5_otherNonfunctionalRequirements": {
    "performanceRequirements": "Response time and load metrics...",
    "safetyRequirements": "Transaction rollback and error handling...",
    "securityRequirements": "Authentication and authorization controls...",
    "softwareQualityAttributes": "Availability, modularity, and reliability..."
  },
  "section6_otherRequirements": {
    "content": "No additional regulatory requirements identified at baseline."
  },
  "appendixA_glossary": [
    { "term": "SRS", "definition": "Software Requirements Specification" },
    { "term": "FR", "definition": "Functional Requirement" },
    { "term": "NFR", "definition": "Non-Functional Requirement" }
  ],
  "appendixB_analysisModels": {
    "diagramTypes": ["Data Flow Diagram", "Entity Relationship Diagram"],
    "description": "Architectural and behavioral interaction models."
  },
  "appendixC_issuesList": []
}
`
};
