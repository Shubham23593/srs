const { z } = require('zod');
const { getAIProvider } = require('../index');
const { getSRSGenerationPrompt } = require('../prompts/srs-generation.prompt');

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
    const prompt = getSRSGenerationPrompt(project, validatedRequirements, ragContext);
    
    let generated = await ai.generateStructuredJSON(prompt, SRSSchemaValidator);

    // Deterministic fallback / assembly builder if AI returned partial fields
    if (!generated || !generated.section1_introduction) {
      generated = this._buildDeterministicTemplateSRS(project, validatedRequirements, issues);
    } else {
      // Ensure exact template fields exist
      generated = this._sanitizeAndEnforceTemplate(generated, project, validatedRequirements, issues);
    }

    return generated;
  }

  _sanitizeAndEnforceTemplate(srs, project, requirements, issues) {
    const functionalReqs = requirements.filter(r => r.type === 'FUNCTIONAL');
    const nfrReqs = requirements.filter(r => r.type === 'NON_FUNCTIONAL');

    // Build features if missing
    if (!srs.section3_systemFeatures || srs.section3_systemFeatures.length === 0) {
      srs.section3_systemFeatures = this._groupRequirementsIntoFeatures(functionalReqs);
    }

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
        author: 'IntelliSDLC AI & Reviewer',
        reasonForChanges: 'Initial Baseline SRS Release.'
      }
    ];

    // Appendix C Issues List
    srs.appendixC_issuesList = issues.map(iss => ({
      issueId: iss.issueId || 'ISSUE-001',
      description: iss.description,
      relatedRequirement: (iss.relatedRequirementIds || []).join(', ') || 'TBD',
      priority: iss.severity || 'MEDIUM',
      status: iss.status || 'OPEN'
    }));

    return srs;
  }

  _buildDeterministicTemplateSRS(project, requirements, issues) {
    const functionalReqs = requirements.filter(r => r.type === 'FUNCTIONAL');
    const nfrReqs = requirements.filter(r => r.type === 'NON_FUNCTIONAL');

    const secPerf = nfrReqs.filter(r => r.category?.toLowerCase().includes('perf')).map(r => `[${r.requirementId}] ${r.description}`).join(' ') || 'TBD — Needs Clarification. Standard response time must not exceed 2.0s under standard load.';
    const secSec = nfrReqs.filter(r => r.category?.toLowerCase().includes('sec')).map(r => `[${r.requirementId}] ${r.description}`).join(' ') || 'TBD — Needs Clarification. Role-based access control and token-based authentication shall be enforced.';
    const secQual = nfrReqs.filter(r => !r.category?.toLowerCase().includes('perf') && !r.category?.toLowerCase().includes('sec')).map(r => `[${r.requirementId}] ${r.description}`).join(' ') || 'The software shall exhibit modularity, testability, and 99.9% operational availability.';

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
          author: 'IntelliSDLC AI & Reviewer',
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
        userClassesAndCharacteristics: (project.targetUsers && project.targetUsers.length > 0)
          ? project.targetUsers.join(', ')
          : 'Standard Users, Operators, and System Administrators.',
        operatingEnvironment: 'Modern Web Browsers (Chrome, Firefox, Safari, Edge), Containerized Node.js backend runtime, and MongoDB database.',
        designAndImplementationConstraints: (project.constraints && project.constraints.length > 0)
          ? project.constraints.join(' ')
          : 'Strict adherence to REST architecture, token authentication, and data integrity.',
        userDocumentation: 'Online user guides, contextual help tooltips, and administrator operational manuals.',
        assumptionsAndDependencies: (project.assumptions && project.assumptions.length > 0)
          ? project.assumptions.join(' ')
          : 'High-availability network connectivity and supported client web environments.'
      },
      section3_systemFeatures: this._groupRequirementsIntoFeatures(functionalReqs),
      section4_externalInterfaceRequirements: {
        userInterfaces: 'Responsive graphical web user interface compliant with modern accessibility and usability guidelines.',
        hardwareInterfaces: 'Standard cloud server infrastructure, storage volumes, and client workstation input/output peripherals.',
        softwareInterfaces: 'Node.js Express REST APIs, MongoDB data layer, and Ollama AI provider interface.',
        communicationsInterfaces: 'Secure HTTPS, TLS 1.3 encryption, and JSON-based REST payloads.'
      },
      section5_otherNonfunctionalRequirements: {
        performanceRequirements: secPerf,
        safetyRequirements: 'System state shall be preserved transactionally in case of unhandled server interruptions.',
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
        { term: 'TBD', definition: 'To Be Determined' }
      ],
      appendixB_analysisModels: {
        diagramTypes: ['Data Flow Diagram (Level 0/1)', 'Entity Relationship Model'],
        description: 'Structural component boundaries and entity relationship mappings.'
      },
      appendixC_issuesList: issues.map(iss => ({
        issueId: iss.issueId || 'ISSUE-001',
        description: iss.description,
        relatedRequirement: (iss.relatedRequirementIds || []).join(', ') || 'TBD',
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

    // Group by category
    const categoryMap = {};
    functionalReqs.forEach(req => {
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
          statement: r.description.startsWith('The system shall') ? r.description : `The system shall ${r.description.charAt(0).toLowerCase() + r.description.slice(1)}`
        }))
      };
    });
  }
}

module.exports = new SRSGenerationAgent();
