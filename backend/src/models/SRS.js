const mongoose = require('mongoose');

const RevisionHistoryEntrySchema = new mongoose.Schema({
  version: { type: String, required: true },
  date: { type: String, required: true },
  author: { type: String, default: 'IntelliSDLC AI & Reviewer' },
  reasonForChanges: { type: String, required: true }
}, { _id: false });

const SystemFeatureSchema = new mongoose.Schema({
  featureId: { type: String, required: true },
  featureName: { type: String, required: true },
  descriptionAndPriority: { type: String, required: true },
  stimulusResponseSequences: { type: [String], default: [] },
  functionalRequirements: [{
    requirementId: { type: String, required: true },
    title: { type: String, required: true },
    statement: { type: String, required: true }
  }]
}, { _id: false });

const GlossaryEntrySchema = new mongoose.Schema({
  term: { type: String, required: true },
  definition: { type: String, required: true }
}, { _id: false });

const SRSSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  currentVersion: {
    type: String,
    default: '1.0'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'UPDATING'],
    default: 'DRAFT'
  },
  metadata: {
    title: { type: String, required: true },
    preparedBy: { type: String, default: 'Requirements Engineering Team' },
    organization: { type: String, default: 'IntelliSDLC AI Platform' },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] }
  },
  revisionHistory: [RevisionHistoryEntrySchema],
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
  section3_systemFeatures: [SystemFeatureSchema],
  section4_externalInterfaceRequirements: {
    userInterfaces: { type: String, default: '' },
    hardwareInterfaces: { type: String, default: '' },
    softwareInterfaces: { type: String, default: '' },
    communicationsInterfaces: { type: String, default: '' }
  },
  section5_otherNonfunctionalRequirements: {
    performanceRequirements: { type: String, default: '' },
    safetyRequirements: { type: String, default: '' },
    securityRequirements: { type: String, default: '' },
    softwareQualityAttributes: { type: String, default: '' }
  },
  section6_otherRequirements: {
    content: { type: String, default: 'No additional external requirements identified.' }
  },
  appendixA_glossary: [GlossaryEntrySchema],
  appendixB_analysisModels: {
    diagramTypes: { type: [String], default: [] },
    description: { type: String, default: 'See structured entity interaction and workflow models.' },
    dataModels: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  appendixC_issuesList: [{
    issueId: { type: String, required: true },
    description: { type: String, required: true },
    relatedRequirement: { type: String, default: '' },
    priority: { type: String, default: 'MEDIUM' },
    status: { type: String, default: 'OPEN' }
  }],
  reviewNotes: {
    type: [String],
    default: []
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

SRSSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.SRS || mongoose.model('SRS', SRSSchema);
