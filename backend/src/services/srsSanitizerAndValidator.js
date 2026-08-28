const { normalizeRequirementStatement } = require('./requirementGrammarValidator');

// Hinglish & Conversational Marker detection regex
const CONVERSATIONAL_REGEX = /\b(mujhe|chahiye|karna|karega|hoga|banana|hona|kaise|jisme|apne|bhi|kare|sakta|sakti|wala|wali|karo|hota|rahega|nahi|kuch|aur|users?\s+ko|hello\s+bro|hey\s+there|user\s+said|as\s+mentioned\s+in\s+interview|during\s+interview|the\s+user\s+wants|the\s+user\s+stated)\b|[\u0900-\u097F]/i;

/**
 * Remove conversational filler and ensure professional ISO 29148 English prose
 */
function cleanProse(text, fallback = '') {
  if (!text || typeof text !== 'string') return fallback;

  let cleaned = text
    .replace(/[\u0900-\u097F]+/g, '') // Remove Devanagari characters
    .replace(/\b(mujhe|chahiye|karna\s+hai|karna|karega|hoga|banana|hona\s+chahiye|hona|kaise|jisme|apne|bhi|kare|sakta|sakti|wala|wali|karo|hota|rahega|nahi|kuch|aur|users?\s+ko)\b/gi, '')
    .replace(/^(hello\s+bro|hey|hi|as\s+discussed|as\s+mentioned|in\s+the\s+interview|the\s+user\s+said|user\s+wants\s+to|user\s+needs\s+to)[,:\s]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If text became empty or was predominantly conversational garbage, return fallback
  if (cleaned.length < 3 || CONVERSATIONAL_REGEX.test(cleaned)) {
    return fallback;
  }

  // Ensure trailing period if sentence
  if (cleaned.length > 15 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
}

/**
 * Format a functional requirement entry strictly as ISO/IEC/IEEE 29148
 */
function formatFunctionalRequirement(req) {
  const reqId = req.requirementId || 'FR-001';
  let title = req.title ? req.title.trim() : 'System Capability';
  let description = req.description ? req.description.trim() : '';

  // Clean conversational text
  title = cleanProse(title, 'System Capability').replace(/[.]+$/, '');
  
  // Format description as "The system shall ..."
  const statement = normalizeRequirementStatement(description || title);

  return {
    requirementId: reqId,
    title,
    statement
  };
}

/**
 * Group active functional requirements into logical Section 3 System Features
 */
function groupIntoSystemFeatures(functionalReqs, project) {
  if (!functionalReqs || functionalReqs.length === 0) {
    return [
      {
        featureId: '3.1',
        featureName: 'Core System Feature',
        descriptionAndPriority: '3.1.1 Core business capabilities. Priority: High.',
        stimulusResponseSequences: [
          'User initiates workflow -> System validates inputs and processes transaction.'
        ],
        functionalRequirements: [
          {
            requirementId: 'FR-001',
            title: 'Core System Processing',
            statement: 'The system shall execute baseline system transactions.'
          }
        ]
      }
    ];
  }

  // Deduplicate and group by category
  const seenReqIds = new Set();
  const categoryMap = {};

  functionalReqs.forEach(req => {
    if (seenReqIds.has(req.requirementId)) return;
    seenReqIds.add(req.requirementId);

    const cat = req.category && req.category.trim().length > 0 ? req.category.trim() : 'Core Features';
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(req);
  });

  let index = 1;
  return Object.keys(categoryMap).map(catName => {
    const reqsInCat = categoryMap[catName];
    const featureId = `3.${index}`;
    index++;

    const cleanCatName = cleanProse(catName, 'System Capabilities').replace(/[.]+$/, '');

    return {
      featureId,
      featureName: cleanCatName,
      descriptionAndPriority: `${featureId}.1 Provides ${cleanCatName.toLowerCase()} workflows. Priority: High.`,
      stimulusResponseSequences: [
        `User triggers an action within ${cleanCatName.toLowerCase()}.`,
        `System verifies user authorization and validates request parameters.`,
        `System processes request and returns formatted result or confirmation.`
      ],
      functionalRequirements: reqsInCat.map(formatFunctionalRequirement)
    };
  });
}

/**
 * Programmatically sanitize, normalize, and validate the complete SRS against ISO 29148 rules
 */
function sanitizeAndValidateSRS(srsInput, project, requirements = [], issues = []) {
  const activeReqs = (requirements || []).filter(r => r.status !== 'DEPRECATED');

  const functionalReqs = activeReqs.filter(r => r.type === 'FUNCTIONAL');
  const nfrReqs = activeReqs.filter(r => r.type === 'NON_FUNCTIONAL');
  const constraintReqs = activeReqs.filter(r => r.type === 'CONSTRAINT');
  const assumptionReqs = activeReqs.filter(r => r.type === 'ASSUMPTION');
  const interfaceReqs = activeReqs.filter(r => r.type === 'INTERFACE');
  const stakeholderReqs = activeReqs.filter(r => r.type === 'STAKEHOLDER');

  const srsInputObj = (srsInput && typeof srsInput === 'object') ? srsInput : {};
  const srs = {};

  // 1. Metadata
  srs.metadata = {
    title: cleanProse(srsInputObj.metadata?.title, `Software Requirements Specification for ${project.projectName || 'Software System'}`).replace(/[.]+$/, ''),
    preparedBy: cleanProse(srsInputObj.metadata?.preparedBy, 'Requirements Engineering Team').replace(/[.]+$/, ''),
    organization: cleanProse(srsInputObj.metadata?.organization, 'IntelliSDLC AI Platform').replace(/[.]+$/, ''),
    date: srsInputObj.metadata?.date || new Date().toISOString().split('T')[0]
  };

  // 2. Revision History
  srs.revisionHistory = (srs.revisionHistory && srs.revisionHistory.length > 0)
    ? srs.revisionHistory.map(rev => ({
        version: rev.version || '1.0',
        date: rev.date || new Date().toISOString().split('T')[0],
        author: cleanProse(rev.author, 'Requirements Engineering Team').replace(/[.]+$/, ''),
        reasonForChanges: cleanProse(rev.reasonForChanges, 'Initial Baseline SRS Release.')
      }))
    : [
        {
          version: '1.0',
          date: new Date().toISOString().split('T')[0],
          author: 'Requirements Engineering Team',
          reasonForChanges: 'Initial Baseline SRS Release.'
        }
      ];

  // 3. Section 1: Introduction (Concise, no conversational text)
  const defaultPurpose = `This document specifies the software requirements for ${project.projectName}. It describes functional capabilities, non-functional quality attributes, external interfaces, and architectural constraints conforming to ISO/IEC/IEEE 29148:2018 and IEEE 830-1998 standards.`;
  const defaultAudience = `This specification is intended for software developers, solution architects, quality assurance testers, project managers, and executive stakeholders.`;
  const defaultScope = cleanProse(project.scope || project.description, `The software platform delivers automated requirements engineering and system workflows for ${project.projectName}.`);

  srs.section1_introduction = {
    purpose: cleanProse(srsInputObj.section1_introduction?.purpose, defaultPurpose),
    documentConventions: cleanProse(
      srsInputObj.section1_introduction?.documentConventions,
      'Requirements are uniquely identified using alphanumeric tags: FR-XXX for functional requirements and NFR-XXX for non-functional requirements. Priority levels are categorized as High, Medium, or Low.'
    ),
    intendedAudience: cleanProse(srsInputObj.section1_introduction?.intendedAudience, defaultAudience),
    projectScope: defaultScope,
    references: [
      'ISO/IEC/IEEE 29148:2018 Systems and software engineering — Requirements engineering',
      'IEEE 830-1998 Recommended Practice for Software Requirements Specifications'
    ]
  };

  // 4. Section 2: Overall Description
  const targetUsersList = [
    ...(project.targetUsers || []),
    ...stakeholderReqs.map(s => `${s.title}: ${s.description}`)
  ];
  const userClassesText = targetUsersList.length > 0
    ? targetUsersList.map(u => cleanProse(u, 'Authorized Users')).join('; ')
    : 'Authenticated Users, Operators, and System Administrators.';

  const constraintsList = [
    ...(project.constraints || []),
    ...constraintReqs.map(c => `[${c.requirementId}] ${normalizeRequirementStatement(c.description)}`)
  ];
  const constraintsText = constraintsList.length > 0
    ? constraintsList.map(c => cleanProse(c, '')).filter(Boolean).join(' ')
    : 'Conform to standard REST architecture, JWT-based session security, and relational data integrity.';

  const assumptionsList = [
    ...(project.assumptions || []),
    ...assumptionReqs.map(a => `[${a.requirementId}] ${normalizeRequirementStatement(a.description)}`)
  ];
  const assumptionsText = assumptionsList.length > 0
    ? assumptionsList.map(a => cleanProse(a, '')).filter(Boolean).join(' ')
    : 'Reliable network connectivity, modern web browser compatibility, and standard server uptime.';

  const productFeaturesSummary = functionalReqs.length > 0
    ? functionalReqs.map(r => r.title).join(', ')
    : 'Core system functionality and operational workflows.';

  srs.section2_overallDescription = {
    productPerspective: cleanProse(
      srsInputObj.section2_overallDescription?.productPerspective,
      `${project.projectName} functions as an autonomous, web-based software application interfacing with secure APIs and relational datastores.`
    ),
    productFeatures: cleanProse(productFeaturesSummary, 'Core system functionality.'),
    userClassesAndCharacteristics: cleanProse(userClassesText, 'Standard Users and System Administrators.'),
    operatingEnvironment: cleanProse(
      srsInputObj.section2_overallDescription?.operatingEnvironment,
      'Modern web browsers (Chrome, Firefox, Safari, Edge), Node.js server runtime, and MongoDB database.'
    ),
    designAndImplementationConstraints: constraintsText,
    userDocumentation: cleanProse(
      srsInputObj.section2_overallDescription?.userDocumentation,
      'Integrated user guides, contextual tooltips, API reference documentation, and administrator operation manuals.'
    ),
    assumptionsAndDependencies: assumptionsText
  };

  // 5. Section 3: System Features (Strict 1-to-1 Mapping with Functional Requirements)
  srs.section3_systemFeatures = groupIntoSystemFeatures(functionalReqs, project);

  // 6. Section 4: External Interface Requirements (Strict, Zero Hallucinations)
  const interfaceSoftwareList = interfaceReqs.length > 0
    ? interfaceReqs.map(i => `[${i.requirementId}] ${normalizeRequirementStatement(i.description)}`).join(' ')
    : 'Node.js Express REST APIs, JSON payload protocols, and database connectivity.';

  srs.section4_externalInterfaceRequirements = {
    userInterfaces: cleanProse(
      srsInputObj.section4_externalInterfaceRequirements?.userInterfaces,
      'Responsive graphical web user interface compliant with accessibility (WCAG 2.1) and responsive design standards.'
    ),
    hardwareInterfaces: cleanProse(
      srsInputObj.section4_externalInterfaceRequirements?.hardwareInterfaces,
      'Standard server hosting architecture, memory, and workstation peripherals for client access.'
    ),
    softwareInterfaces: cleanProse(interfaceSoftwareList, 'Standard RESTful web service endpoints and database drivers.'),
    communicationsInterfaces: cleanProse(
      srsInputObj.section4_externalInterfaceRequirements?.communicationsInterfaces,
      'Secure HTTPS (TLS 1.3), JSON-formatted API communication over standard TCP/IP network layers.'
    )
  };

  // 7. Section 5: Non-Functional Requirements (Performance, Safety, Security, Quality)
  const perfList = nfrReqs.filter(r => r.nfrSubcategory === 'PERFORMANCE' || r.category?.toLowerCase().includes('perf'));
  const secList = nfrReqs.filter(r => r.nfrSubcategory === 'SECURITY' || r.category?.toLowerCase().includes('sec'));
  const safetyList = nfrReqs.filter(r => r.nfrSubcategory === 'SAFETY' || r.category?.toLowerCase().includes('safe'));
  const qualList = nfrReqs.filter(r => !['PERFORMANCE', 'SECURITY', 'SAFETY'].includes(r.nfrSubcategory) && !r.category?.toLowerCase().includes('perf') && !r.category?.toLowerCase().includes('sec'));

  const secPerf = perfList.length > 0
    ? perfList.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
    : 'The system shall respond to user requests within 2.0 seconds under normal operating load.';

  const secSec = secList.length > 0
    ? secList.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
    : 'The system shall require authentication and enforce role-based access control (RBAC) on all protected resources.';

  const secSafety = safetyList.length > 0
    ? safetyList.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
    : 'The system shall maintain transaction rollbacks to prevent data corruption during unexpected system outages.';

  const secQual = qualList.length > 0
    ? qualList.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
    : 'The software shall exhibit modular architecture, automated testability, and 99.9% service availability.';

  srs.section5_otherNonfunctionalRequirements = {
    performanceRequirements: cleanProse(secPerf, 'The system shall respond within 2.0 seconds under standard operating load.'),
    safetyRequirements: cleanProse(secSafety, 'The system state shall be preserved transactionally in case of interruptions.'),
    securityRequirements: cleanProse(secSec, 'The system shall require authentication before granting access to protected endpoints.'),
    softwareQualityAttributes: cleanProse(secQual, 'The system shall maintain 99.9% operational availability.')
  };

  // 8. Section 6: Other Requirements
  srs.section6_otherRequirements = {
    content: cleanProse(srsInputObj.section6_otherRequirements?.content, 'No additional legal or regulatory constraints identified at initial baseline.')
  };

  // 9. Appendix A: Glossary
  srs.appendixA_glossary = [
    { term: 'SRS', definition: 'Software Requirements Specification' },
    { term: 'FR', definition: 'Functional Requirement' },
    { term: 'NFR', definition: 'Non-Functional Requirement' },
    { term: 'RBAC', definition: 'Role-Based Access Control' },
    { term: 'REST', definition: 'Representational State Transfer' },
    { term: 'TLS', definition: 'Transport Layer Security' }
  ];

  // 10. Appendix B: Analysis Models
  srs.appendixB_analysisModels = {
    diagramTypes: ['Data Flow Diagram (Level 0/1)', 'Entity Relationship Model'],
    description: 'System boundary, behavioral transitions, and entity relational definitions.'
  };

  // 11. Appendix C: Issues List (Open items from database only)
  const openIssues = (issues || []).filter(iss => iss.status === 'OPEN');
  srs.appendixC_issuesList = openIssues.map((iss, i) => ({
    issueId: iss.issueId || `ISSUE-00${i + 1}`,
    description: cleanProse(iss.description, 'Clarification pending on domain requirement.'),
    relatedRequirement: (iss.relatedRequirementIds || []).join(', ') || 'General',
    priority: iss.severity || 'MEDIUM',
    status: iss.status || 'OPEN'
  }));

  // Validation Result Checks
  const validationErrors = [];
  
  // Check for any residual Hinglish or raw dialogue in all sections
  const fullDocumentString = JSON.stringify(srs);
  if (CONVERSATIONAL_REGEX.test(fullDocumentString)) {
    validationErrors.push('Residual conversational or non-English phrases detected.');
  }

  // Ensure every functional requirement in the catalog is present in Section 3
  const srsReqIds = new Set();
  (srs.section3_systemFeatures || []).forEach(feat => {
    (feat.functionalRequirements || []).forEach(fr => {
      srsReqIds.add(fr.requirementId);
    });
  });

  functionalReqs.forEach(fr => {
    if (!srsReqIds.has(fr.requirementId)) {
      validationErrors.push(`Functional requirement ${fr.requirementId} is missing from Section 3.`);
    }
  });

  return {
    isValid: validationErrors.length === 0,
    sanitizedSRS: srs,
    validationErrors
  };
}

module.exports = {
  cleanProse,
  formatFunctionalRequirement,
  groupIntoSystemFeatures,
  sanitizeAndValidateSRS
};
