const { z } = require('zod');
const { getAIProvider } = require('../index');
const { getSRSGenerationPrompt } = require('../prompts/srs-generation.prompt');
const { normalizeRequirementStatement } = require('../../services/requirementGrammarValidator');

// Zod Schema to validate generated SRS structure strictly
const SRSSchemaValidator = z.object({
  metadata: z.object({
    title: z.string(),
    preparedBy: z.string(),
    organization: z.string(),
    date: z.string()
  }),
  section1_introduction: z.object({
    purpose: z.string(),
    documentConventions: z.string(),
    intendedAudience: z.string(),
    projectScope: z.string(),
    references: z.array(z.string())
  }),
  section2_overallDescription: z.object({
    productPerspective: z.string(),
    productFeatures: z.string(),
    userClassesAndCharacteristics: z.string(),
    operatingEnvironment: z.string(),
    designAndImplementationConstraints: z.string(),
    userDocumentation: z.string(),
    assumptionsAndDependencies: z.string()
  }),
  section3_systemFeatures: z.array(z.object({
    featureId: z.string(),
    featureName: z.string(),
    descriptionAndPriority: z.string(),
    stimulusResponseSequences: z.array(z.string()),
    functionalRequirements: z.array(z.object({
      requirementId: z.string(),
      title: z.string(),
      statement: z.string()
    }))
  })),
  section4_externalInterfaceRequirements: z.object({
    userInterfaces: z.string(),
    hardwareInterfaces: z.string(),
    softwareInterfaces: z.string(),
    communicationsInterfaces: z.string()
  }),
  section5_otherNonfunctionalRequirements: z.object({
    performanceRequirements: z.string(),
    safetyRequirements: z.string(),
    securityRequirements: z.string(),
    softwareQualityAttributes: z.string()
  }),
  section6_otherRequirements: z.object({
    content: z.string()
  }),
  appendixA_glossary: z.array(z.object({
    term: z.string(),
    definition: z.string()
  })),
  appendixB_analysisModels: z.object({
    diagramTypes: z.array(z.string()).optional(),
    description: z.string().optional()
  }).optional(),
  appendixC_issuesList: z.array(z.object({
    issueId: z.string(),
    description: z.string(),
    relatedRequirement: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional()
  })).optional()
});

class SRSGenerationAgent {
  async generateSRS(project, validatedRequirements, ragContext = '', issues = []) {
    const ai = getAIProvider();
    // Filter only active requirements (exclude deprecated)
    const activeReqs = validatedRequirements.filter(r => r.status !== 'DEPRECATED');
    const prompt = getSRSGenerationPrompt(project, activeReqs, ragContext);
    
    let generated = null;
    try {
      generated = await ai.generateStructuredJSON(prompt, SRSSchemaValidator);
    } catch (e) {
      console.warn('[SRSGenerationAgent] AI structure generation fallback:', e.message);
    }

    // Deterministic fallback / assembly builder if AI returned partial fields
    if (!generated || !generated.section1_introduction) {
      generated = this._buildDeterministicTemplateSRS(project, activeReqs, issues);
    } else {
      // Ensure exact template fields exist and normalize statements
      generated = this._sanitizeAndEnforceTemplate(generated, project, activeReqs, issues);
    }

    return generated;
  }

  _sanitizeAndEnforceTemplate(srs, project, requirements, issues) {
    const functionalReqs = requirements.filter(r => r.type === 'FUNCTIONAL');
    const nfrReqs = requirements.filter(r => r.type === 'NON_FUNCTIONAL');
    const constraintReqs = requirements.filter(r => r.type === 'CONSTRAINT');
    const assumptionReqs = requirements.filter(r => r.type === 'ASSUMPTION');
    const interfaceReqs = requirements.filter(r => r.type === 'INTERFACE');
    const stakeholderReqs = requirements.filter(r => r.type === 'STAKEHOLDER');

    // Build features if missing or synchronize existing features with active requirements
    srs.section3_systemFeatures = this._groupRequirementsIntoFeatures(functionalReqs);

    // Ensure metadata
    srs.metadata = {
      title: srs.metadata?.title || `Software Requirements Specification for ${project.projectName}`,
      preparedBy: srs.metadata?.preparedBy || 'Requirements Engineering Team',
      organization: srs.metadata?.organization || 'IntelliSDLC AI Platform',
      date: srs.metadata?.date || new Date().toISOString().split('T')[0]
    };

    // Revision History
    srs.revisionHistory = [
      {
        version: '1.0',
        date: new Date().toISOString().split('T')[0],
        author: 'Requirements Engineering Team',
        reasonForChanges: 'Initial Baseline SRS Release.'
      }
    ];

    // Ensure section 2 mappings
    if (constraintReqs.length > 0) {
      const constraintText = constraintReqs.map(c => `[${c.requirementId}] ${normalizeRequirementStatement(c.description)}`).join(' ');
      srs.section2_overallDescription.designAndImplementationConstraints = srs.section2_overallDescription.designAndImplementationConstraints
        ? `${srs.section2_overallDescription.designAndImplementationConstraints} ${constraintText}`
        : constraintText;
    }

    if (assumptionReqs.length > 0) {
      const assumptionText = assumptionReqs.map(a => `[${a.requirementId}] ${normalizeRequirementStatement(a.description)}`).join(' ');
      srs.section2_overallDescription.assumptionsAndDependencies = srs.section2_overallDescription.assumptionsAndDependencies
        ? `${srs.section2_overallDescription.assumptionsAndDependencies} ${assumptionText}`
        : assumptionText;
    }

    if (stakeholderReqs.length > 0) {
      const stText = stakeholderReqs.map(s => `[${s.requirementId}] ${s.title}: ${s.description}`).join(' ');
      srs.section2_overallDescription.userClassesAndCharacteristics = srs.section2_overallDescription.userClassesAndCharacteristics
        ? `${srs.section2_overallDescription.userClassesAndCharacteristics} ${stText}`
        : stText;
    }

    // Ensure section 4 interface mappings
    if (interfaceReqs.length > 0) {
      const intText = interfaceReqs.map(i => `[${i.requirementId}] ${normalizeRequirementStatement(i.description)}`).join(' ');
      srs.section4_externalInterfaceRequirements.softwareInterfaces = srs.section4_externalInterfaceRequirements.softwareInterfaces
        ? `${srs.section4_externalInterfaceRequirements.softwareInterfaces} ${intText}`
        : intText;
    }

    // Ensure section 5 NFR mappings
    const perfList = nfrReqs.filter(r => r.nfrSubcategory === 'PERFORMANCE' || r.category?.toLowerCase().includes('perf'));
    const secList = nfrReqs.filter(r => r.nfrSubcategory === 'SECURITY' || r.category?.toLowerCase().includes('sec'));
    const safetyList = nfrReqs.filter(r => r.nfrSubcategory === 'SAFETY' || r.category?.toLowerCase().includes('safe'));
    const qualList = nfrReqs.filter(r => !['PERFORMANCE', 'SECURITY', 'SAFETY'].includes(r.nfrSubcategory) && !r.category?.toLowerCase().includes('perf') && !r.category?.toLowerCase().includes('sec'));

    if (perfList.length > 0) {
      srs.section5_otherNonfunctionalRequirements.performanceRequirements = perfList.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ');
    } else if (!srs.section5_otherNonfunctionalRequirements?.performanceRequirements || /tbd/i.test(srs.section5_otherNonfunctionalRequirements.performanceRequirements)) {
      srs.section5_otherNonfunctionalRequirements.performanceRequirements = 'The system shall maintain API response times under 2.0 seconds at standard operational load and support concurrent user transactions without degradation.';
    }

    if (secList.length > 0) {
      srs.section5_otherNonfunctionalRequirements.securityRequirements = secList.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ');
    } else if (!srs.section5_otherNonfunctionalRequirements?.securityRequirements || /tbd/i.test(srs.section5_otherNonfunctionalRequirements.securityRequirements)) {
      srs.section5_otherNonfunctionalRequirements.securityRequirements = 'The system shall enforce role-based access control (RBAC) and JWT token-based authentication for all protected endpoints.';
    }

    if (safetyList.length > 0) {
      srs.section5_otherNonfunctionalRequirements.safetyRequirements = safetyList.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ');
    } else if (!srs.section5_otherNonfunctionalRequirements?.safetyRequirements || /tbd/i.test(srs.section5_otherNonfunctionalRequirements.safetyRequirements)) {
      srs.section5_otherNonfunctionalRequirements.safetyRequirements = 'The system state shall be preserved transactionally in case of unhandled server interruptions.';
    }

    if (qualList.length > 0) {
      srs.section5_otherNonfunctionalRequirements.softwareQualityAttributes = qualList.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ');
    } else if (!srs.section5_otherNonfunctionalRequirements?.softwareQualityAttributes || /tbd/i.test(srs.section5_otherNonfunctionalRequirements.softwareQualityAttributes)) {
      srs.section5_otherNonfunctionalRequirements.softwareQualityAttributes = 'The software shall exhibit high modularity, automated testability, and 99.9% operational availability.';
    }

    // Glossary
    srs.appendixA_glossary = [
      { term: 'SRS', definition: 'Software Requirements Specification' },
      { term: 'FR', definition: 'Functional Requirement' },
      { term: 'NFR', definition: 'Non-Functional Requirement' },
      { term: 'RAG', definition: 'Retrieval-Augmented Generation' },
      { term: 'RBAC', definition: 'Role-Based Access Control' }
    ];

    // Appendix C Issues List (Dynamic from unresolved open issues)
    const openIssues = (issues || []).filter(iss => iss.status === 'OPEN');
    srs.appendixC_issuesList = openIssues.map(iss => ({
      issueId: iss.issueId || 'ISSUE-001',
      description: iss.description,
      relatedRequirement: (iss.relatedRequirementIds || []).join(', ') || 'General',
      priority: iss.severity || 'MEDIUM',
      status: iss.status || 'OPEN'
    }));

    return srs;
  }

  _buildDeterministicTemplateSRS(project, requirements, issues) {
    const functionalReqs = requirements.filter(r => r.type === 'FUNCTIONAL');
    const nfrReqs = requirements.filter(r => r.type === 'NON_FUNCTIONAL');
    const constraintReqs = requirements.filter(r => r.type === 'CONSTRAINT');
    const assumptionReqs = requirements.filter(r => r.type === 'ASSUMPTION');
    const interfaceReqs = requirements.filter(r => r.type === 'INTERFACE');
    const stakeholderReqs = requirements.filter(r => r.type === 'STAKEHOLDER');

    const perfReqs = nfrReqs.filter(r => r.nfrSubcategory === 'PERFORMANCE' || r.category?.toLowerCase().includes('perf'));
    const secReqs = nfrReqs.filter(r => r.nfrSubcategory === 'SECURITY' || r.category?.toLowerCase().includes('sec'));
    const safetyReqs = nfrReqs.filter(r => r.nfrSubcategory === 'SAFETY' || r.category?.toLowerCase().includes('safe'));
    const qualReqs = nfrReqs.filter(r => !['PERFORMANCE', 'SECURITY', 'SAFETY'].includes(r.nfrSubcategory) && !r.category?.toLowerCase().includes('perf') && !r.category?.toLowerCase().includes('sec'));

    const secPerf = perfReqs.length > 0
      ? perfReqs.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
      : 'The system shall maintain API response times under 2.0 seconds at standard operational load and support concurrent user transactions without degradation.';

    const secSec = secReqs.length > 0
      ? secReqs.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
      : 'The system shall enforce role-based access control (RBAC) and JWT token-based authentication for all protected endpoints.';

    const secSafety = safetyReqs.length > 0
      ? safetyReqs.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
      : 'The system state shall be preserved transactionally in case of unhandled server interruptions.';

    const secQual = qualReqs.length > 0
      ? qualReqs.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
      : 'The software shall exhibit high modularity, automated testability, and 99.9% operational availability.';

    const constraintsCombined = [
      ...(project.constraints || []),
      ...constraintReqs.map(c => `[${c.requirementId}] ${normalizeRequirementStatement(c.description)}`)
    ];

    const assumptionsCombined = [
      ...(project.assumptions || []),
      ...assumptionReqs.map(a => `[${a.requirementId}] ${normalizeRequirementStatement(a.description)}`)
    ];

    const targetUsersCombined = [
      ...(project.targetUsers || []),
      ...stakeholderReqs.map(s => `[${s.requirementId}] ${s.title}: ${s.description}`)
    ];

    const interfaceText = interfaceReqs.length > 0
      ? interfaceReqs.map(i => `[${i.requirementId}] ${normalizeRequirementStatement(i.description)}`).join(' ')
      : 'Node.js Express REST APIs, MongoDB data layer, and Ollama AI provider interface.';

    const openIssues = (issues || []).filter(iss => iss.status === 'OPEN');

    return {
      metadata: {
        title: `Software Requirements Specification for ${project.projectName}`,
        preparedBy: 'Requirements Engineering Team',
        organization: 'IntelliSDLC AI Platform',
        date: new Date().toISOString().split('T')[0]
      },
      revisionHistory: [
        {
          version: '1.0',
          date: new Date().toISOString().split('T')[0],
          author: 'Requirements Engineering Team',
          reasonForChanges: 'Initial Baseline SRS Release.'
        }
      ],
      section1_introduction: {
        purpose: `This document specifies the software requirements for ${project.projectName}. It describes functional behaviors, quality attributes, interfaces, and constraints conforming to ISO/IEC/IEEE 29148:2018 and IEEE 830-1998 standards.`,
        documentConventions: `Requirements are uniquely identified by stable alphanumeric tags (FR-XXX for functional requirements and NFR-XXX for non-functional requirements). Priority levels are categorized into High, Medium, and Low.`,
        intendedAudience: `Intended for software architects, development engineers, project stakeholders, quality assurance testers, and project managers.`,
        projectScope: project.scope || project.description || `The platform provides end-to-end automated workflows for ${project.projectName}.`,
        references: [
          'ISO/IEC/IEEE 29148:2018 Systems and software engineering — Requirements engineering',
          'IEEE 830-1998 Recommended Practice for Software Requirements Specifications'
        ]
      },
      section2_overallDescription: {
        productPerspective: `${project.projectName} operates as an integrated software system within modern cloud and web environments.`,
        productFeatures: functionalReqs.map(r => r.title).join(', ') || 'Core domain functionality and user workflows.',
        userClassesAndCharacteristics: targetUsersCombined.length > 0
          ? targetUsersCombined.join(', ')
          : 'Standard Users, Operators, and System Administrators.',
        operatingEnvironment: 'Modern Web Browsers (Chrome, Firefox, Safari, Edge), Containerized Node.js backend runtime, and MongoDB database.',
        designAndImplementationConstraints: constraintsCombined.length > 0
          ? constraintsCombined.join(' ')
          : 'Strict adherence to REST architecture, token authentication, and data integrity.',
        userDocumentation: 'Online user guides, contextual help tooltips, and administrator operational manuals.',
        assumptionsAndDependencies: assumptionsCombined.length > 0
          ? assumptionsCombined.join(' ')
          : 'High-availability network connectivity and supported client web environments.'
      },
      section3_systemFeatures: this._groupRequirementsIntoFeatures(functionalReqs),
      section4_externalInterfaceRequirements: {
        userInterfaces: 'Responsive graphical web user interface compliant with modern accessibility and usability guidelines.',
        hardwareInterfaces: 'Standard cloud server infrastructure, storage volumes, and client workstation input/output peripherals.',
        softwareInterfaces: interfaceText,
        communicationsInterfaces: 'Secure HTTPS, TLS 1.3 encryption, and JSON-based REST payloads.'
      },
      section5_otherNonfunctionalRequirements: {
        performanceRequirements: secPerf,
        safetyRequirements: secSafety,
        securityRequirements: secSec,
        softwareQualityAttributes: secQual
      },
      section6_otherRequirements: {
        content: 'No additional external requirements identified at baseline.'
      },
      appendixA_glossary: [
        { term: 'SRS', definition: 'Software Requirements Specification' },
        { term: 'FR', definition: 'Functional Requirement' },
        { term: 'NFR', definition: 'Non-Functional Requirement' },
        { term: 'RAG', definition: 'Retrieval-Augmented Generation' },
        { term: 'RBAC', definition: 'Role-Based Access Control' }
      ],
      appendixB_analysisModels: {
        diagramTypes: ['Data Flow Diagram (Level 0/1)', 'Entity Relationship Model'],
        description: 'Structural component boundaries and entity relationship mappings.'
      },
      appendixC_issuesList: openIssues.map(iss => ({
        issueId: iss.issueId || 'ISSUE-001',
        description: iss.description,
        relatedRequirement: (iss.relatedRequirementIds || []).join(', ') || 'General',
        priority: iss.severity || 'MEDIUM',
        status: iss.status || 'OPEN'
      }))
    };
  }

  _groupRequirementsIntoFeatures(functionalReqs) {
    if (!functionalReqs || functionalReqs.length === 0) {
      return [
        {
          featureId: '3.1',
          featureName: 'Core System Feature',
          descriptionAndPriority: '3.1.1 Primary feature set. Priority: High.',
          stimulusResponseSequences: ['User initiates action -> System validates and executes workflow.'],
          functionalRequirements: [
            {
              requirementId: 'FR-001',
              title: 'Default Core Operation',
              statement: 'The system shall execute baseline system transactions.'
            }
          ]
        }
      ];
    }

    // Group by category, deduplicating requirements by requirementId
    const seenReqIds = new Set();
    const categoryMap = {};

    functionalReqs.forEach(req => {
      if (seenReqIds.has(req.requirementId)) return;
      seenReqIds.add(req.requirementId);

      const cat = req.category || 'General Operations';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(req);
    });

    let index = 1;
    return Object.keys(categoryMap).map(catName => {
      const reqsInCat = categoryMap[catName];
      const featureId = `3.${index}`;
      index++;

      return {
        featureId,
        featureName: catName,
        descriptionAndPriority: `${featureId}.1 Manages ${catName.toLowerCase()} capabilities. Priority: High.`,
        stimulusResponseSequences: [
          `User triggers a ${catName.toLowerCase()} action.`,
          `System verifies permissions and parameters.`,
          `System responds with updated state or confirmation.`
        ],
        functionalRequirements: reqsInCat.map(r => ({
          requirementId: r.requirementId,
          title: r.title,
          statement: normalizeRequirementStatement(r.description)
        }))
      };
    });
  }
}

module.exports = new SRSGenerationAgent();
