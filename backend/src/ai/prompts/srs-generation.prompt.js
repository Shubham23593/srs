module.exports = {
  getSRSGenerationPrompt: (project, validatedRequirements, ragContext) => `
You are an expert Requirements Engineer generating a complete Software Requirements Specification (SRS) adhering strictly to the provided SRS Template (srs_template (1)(1).doc) and IEEE 830 / ISO/IEC/IEEE 29148 standards.

Project Information:
- Name: ${project.projectName}
- Description: ${project.description}
- Scope: ${project.scope}
- Target Users: ${(project.targetUsers || []).join(', ')}
- Constraints: ${(project.constraints || []).join(', ')}
- Assumptions: ${(project.assumptions || []).join(', ')}

Validated Requirements:
${validatedRequirements.map(r => `[${r.requirementId}] (${r.type} / ${r.category}) ${r.title}: ${r.description}`).join('\n')}

RAG Context:
${ragContext}

CRITICAL RULES:
1. Standards Style: Write formal ISO/IEC/IEEE 29148 statements ("The system shall [perform action] [under condition]."). Never duplicate prefixes (avoid "The system shall the platform shall...").
2. Map all functional requirements (FR-XXX) uniquely under Section 3 (System Features).
3. Map non-functional requirements (NFR-XXX) under Section 5 (Performance, Safety, Security, Quality Attributes).
4. Map constraints (CON-XXX) to Section 2.5 and assumptions (ASM-XXX) to Section 2.7.
5. Map interfaces (INT-XXX) to Section 4.
6. Preserve all stable Requirement IDs exactly.
7. Anti-Hallucination: Do NOT invent unstated numbers or APIs. If technical details are missing, provide clear baseline engineering specifications and track genuine open items in Appendix C.

Return complete JSON matching the exact template structure:
{
  "metadata": {
    "title": "Software Requirements Specification for ${project.projectName}",
    "preparedBy": "Requirements Engineering Team",
    "organization": "IntelliSDLC AI Platform",
    "date": "${new Date().toISOString().split('T')[0]}"
  },
  "section1_introduction": {
    "purpose": "1.1 Purpose text...",
    "documentConventions": "1.2 Document conventions text...",
    "intendedAudience": "1.3 Intended audience text...",
    "projectScope": "1.4 Project scope text...",
    "references": ["ISO/IEC/IEEE 29148:2018", "IEEE 830-1998"]
  },
  "section2_overallDescription": {
    "productPerspective": "2.1 text...",
    "productFeatures": "2.2 text summary...",
    "userClassesAndCharacteristics": "2.3 text...",
    "operatingEnvironment": "2.4 text...",
    "designAndImplementationConstraints": "2.5 text...",
    "userDocumentation": "2.6 text...",
    "assumptionsAndDependencies": "2.7 text..."
  },
  "section3_systemFeatures": [
    {
      "featureId": "3.1",
      "featureName": "Feature Name",
      "descriptionAndPriority": "3.1.1 Description & Priority",
      "stimulusResponseSequences": ["User clicks X -> System displays Y"],
      "functionalRequirements": [
        {
          "requirementId": "FR-001",
          "title": "Requirement Title",
          "statement": "The system shall..."
        }
      ]
    }
  ],
  "section4_externalInterfaceRequirements": {
    "userInterfaces": "4.1 text...",
    "hardwareInterfaces": "4.2 text...",
    "softwareInterfaces": "4.3 text...",
    "communicationsInterfaces": "4.4 text..."
  },
  "section5_otherNonfunctionalRequirements": {
    "performanceRequirements": "5.1 text...",
    "safetyRequirements": "5.2 text...",
    "securityRequirements": "5.3 text...",
    "softwareQualityAttributes": "5.4 text..."
  },
  "section6_otherRequirements": {
    "content": "6. text..."
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
