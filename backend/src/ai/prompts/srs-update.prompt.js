module.exports = {
  getSRSUpdatePrompt: (currentSRS, changedText, existingRequirements, ragContext) => `
You are an Incremental SRS Update Agent.
A user has provided a requirement change:
"${changedText}"

Existing Requirements:
${existingRequirements.map(r => `[${r.requirementId}] ${r.title}: ${r.description}`).join('\n')}

RAG Context:
${ragContext}

Instructions:
1. Identify which existing requirement is affected (e.g. FR-002) or if this is a completely new requirement.
2. Identify the exact SRS sections affected (e.g. Section 3.1, Section 3.1.3, Section 2.2).
3. Draft the proposed modification maintaining the exact structure.
4. Provide a clear reason for change and revision summary.
5. DO NOT regenerate unchanged sections of the SRS.

Return JSON:
{
  "affectedRequirementId": "FR-002",
  "isNewRequirement": false,
  "proposedRequirement": {
    "requirementId": "FR-002",
    "title": "Event Registration with Admin Approval",
    "description": "Students shall submit event registration requests, which shall require administrator approval before confirmation.",
    "type": "FUNCTIONAL",
    "category": "Core Features",
    "priority": "HIGH"
  },
  "affectedSections": ["3.1", "3.1.3", "2.2"],
  "sectionUpdates": {
    "section3_systemFeatures": [
      {
        "featureId": "3.1",
        "featureName": "Event Registration and Approval",
        "descriptionAndPriority": "3.1.1 Allows students to submit event registrations and enables administrators to review and approve/reject registrations. Priority: High.",
        "stimulusResponseSequences": [
          "Student selects event and submits registration request.",
          "System logs request with status 'PENDING_APPROVAL' and alerts administrator.",
          "Administrator approves request -> System notifies student and confirms seat."
        ],
        "functionalRequirements": [
          {
            "requirementId": "FR-002",
            "title": "Event Registration with Admin Approval",
            "statement": "The system shall allow students to submit event registrations requiring administrator approval prior to confirmation."
          }
        ]
      }
    ]
  },
  "reasonForChanges": "Incorporated administrator approval requirement for event registrations.",
  "summaryOfChanges": "Updated FR-002 and Section 3.1 stimulus/response sequence to include admin approval gate."
}
`
};
