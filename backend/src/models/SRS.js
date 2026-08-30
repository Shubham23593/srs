const { registerModel } = require('../db/dataStore');

const systemFeature = {
  featureId: { type: String, required: true },
  featureName: { type: String, required: true },
  cluster: { type: String, default: '' },
  descriptionAndPriority: { type: String, required: true },
  stimulusResponseSequences: { type: [String], default: [] },
  functionalRequirements: {
    type: [{
      requirementId: { type: String, required: true },
      title: { type: String, required: true },
      statement: { type: String, required: true },
      priority: { type: String, default: 'MEDIUM' },
      type: { type: String, default: 'FUNCTIONAL' }
    }],
    default: []
  }
};

const definition = {
  fields: {
    projectId: { type: 'ObjectId', ref: 'Project', required: true, unique: true },
    currentVersion: { type: String, default: '1.0' },
    status: { type: String, enum: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'UPDATING'], default: 'DRAFT' },
    outputLanguage: { type: String, default: 'English' },
    metadata: {
      title: { type: String, required: true, default: 'Software Requirements Specification' },
      preparedBy: { type: String, default: 'Requirements Engineering Team' },
      organization: { type: String, default: 'IntelliSDLC AI Platform' },
      date: { type: String, default: () => new Date().toISOString().split('T')[0] }
    },
    revisionHistory: {
      type: [{
        version: { type: String, required: true },
        date: { type: String, required: true },
        author: { type: String, default: 'IntelliSDLC AI & Reviewer' },
        reasonForChanges: { type: String, required: true }
      }],
      default: []
    },
    section1_introduction: {
      purpose: { type: String, default: '' },
      documentConventions: { type: String, default: '' },
      intendedAudience: { type: String, default: '' },
      projectScope: { type: String, default: '' },
      references: { type: [String], default: [] }
    },
    section2_overallDescription: {
      productPerspective: { type: String, default: '' },
      productFeatures: { type: String, default: '' },
      userClassesAndCharacteristics: { type: String, default: '' },
      operatingEnvironment: { type: String, default: '' },
      designAndImplementationConstraints: { type: String, default: '' },
      userDocumentation: { type: String, default: '' },
      assumptionsAndDependencies: { type: String, default: '' }
    },
    section3_systemFeatures: { type: [systemFeature], default: [] },
    section4_externalInterfaceRequirements: {
      userInterfaces: { type: String, default: '' },
      hardwareInterfaces: { type: String, default: '' },
      softwareInterfaces: { type: String, default: '' },
      communicationsInterfaces: { type: String, default: '' }
    },
    section5_otherNonfunctionalRequirements: {
      performanceRequirements: { type: [String], default: [] },
      safetyRequirements: { type: [String], default: [] },
      securityRequirements: { type: [String], default: [] },
      softwareQualityAttributes: { type: [String], default: [] }
    },
    section6_otherRequirements: { content: { type: String, default: 'No additional external requirements identified.' } },
    appendixA_glossary: {
      type: [{ term: { type: String, required: true }, definition: { type: String, required: true } }],
      default: []
    },
    appendixB_analysisModels: {
      type: 'Mixed',
      default: { diagramTypes: ['Data Flow Diagram (Level 0/1)', 'Entity Relationship Model'], description: 'Structural component boundaries and entity relationship mappings.', dataModels: {} }
    },
    appendixC_issuesList: {
      type: [{
        issueId: { type: String, required: true },
        description: { type: String, required: true },
        relatedRequirement: { type: String, default: '' },
        priority: { type: String, default: 'MEDIUM' },
        status: { type: String, default: 'OPEN' }
      }],
      default: []
    },
    // Phase 19 quality audit report for the generated document
    auditReport: { type: 'Mixed', default: null },
    reviewNotes: { type: [String], default: [] },
    approvedBy: { type: 'ObjectId', ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  indexes: [{ fields: { projectId: 1 }, unique: true }],
  preSave: [(doc) => { doc.updatedAt = new Date(); }]
};

module.exports = registerModel('SRS', definition);
