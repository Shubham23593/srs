module.exports = {
  getMergePrompt: (primaryReq, secondaryReq) => `
You are a Lead Requirements Engineer specialized in ISO/IEC/IEEE 29148 and IEEE 830 standards.
Merge the following two duplicate or overlapping software requirements into a SINGLE, unified, comprehensive, and high-quality requirement specification.

Primary Requirement (${primaryReq.requirementId}):
Title: ${primaryReq.title}
Description: ${primaryReq.description}
Type: ${primaryReq.type}
Category: ${primaryReq.category || 'Core Features'}
Priority: ${primaryReq.priority}

Secondary Requirement (${secondaryReq.requirementId}):
Title: ${secondaryReq.title}
Description: ${secondaryReq.description}
Type: ${secondaryReq.type}
Category: ${secondaryReq.category || 'Core Features'}
Priority: ${secondaryReq.priority}

Requirements for the Merged Specification:
1. Retain all distinct functionality, constraints, and operational details from BOTH requirements without unnecessary redundancy.
2. The statement MUST start with "The system shall..." and be atomic, unambiguous, formal, and testable.
3. Priority MUST be the higher of the two (HIGH > MEDIUM > LOW).
4. Title MUST be concise, professional, and encompass both aspects clearly.
5. Provide a brief summaryOfChanges explaining how the two were unified.

Return ONLY valid JSON matching this schema:
{
  "title": "Unified concise title",
  "description": "The system shall [unified comprehensive description covering all details from both requirements].",
  "category": "${primaryReq.category || secondaryReq.category || 'Core Features'}",
  "priority": "${primaryReq.priority === 'HIGH' || secondaryReq.priority === 'HIGH' ? 'HIGH' : (primaryReq.priority === 'MEDIUM' || secondaryReq.priority === 'MEDIUM' ? 'MEDIUM' : 'LOW')}",
  "nfrSubcategory": "${primaryReq.nfrSubcategory !== 'N/A' ? primaryReq.nfrSubcategory : (secondaryReq.nfrSubcategory || 'N/A')}",
  "summaryOfChanges": "Merged duplicate specifications ${primaryReq.requirementId} and ${secondaryReq.requirementId} into a unified requirement."
}
`
};
