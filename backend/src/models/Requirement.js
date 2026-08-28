const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
  requirementId: {
    type: String,
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['FUNCTIONAL', 'NON_FUNCTIONAL', 'CONSTRAINT', 'ASSUMPTION', 'INTERFACE', 'STAKEHOLDER'],
    default: 'FUNCTIONAL'
  },
  nfrSubcategory: {
    type: String,
    enum: ['PERFORMANCE', 'SECURITY', 'SCALABILITY', 'AVAILABILITY', 'RELIABILITY', 'USABILITY', 'MAINTAINABILITY', 'OTHER', 'N/A'],
    default: 'N/A'
  },
  category: {
    type: String,
    default: 'Core Features'
  },
  priority: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM'
  },
  sourceMessageId: {
    type: String,
    default: null
  },
  sourceText: {
    type: String,
    default: ''
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.95
  },
  completenessScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 85
  },
  isAtomic: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PROPOSED', 'NEEDS_CLARIFICATION', 'ACTIVE', 'APPROVED', 'REJECTED', 'MODIFIED', 'DEPRECATED', 'LOCKED'],
    default: 'PROPOSED'
  },
  mergedInto: {
    type: String,
    default: null
  },
  deprecatedReason: {
    type: String,
    default: ''
  },
  deprecatedAt: {
    type: Date,
    default: null
  },
  validationStatus: {
    type: String,
    enum: ['VALID', 'NEEDS_REVIEW', 'INVALID'],
    default: 'VALID'
  },
  validationIssues: {
    type: [String],
    default: []
  },
  suggestedImprovement: {
    type: String,
    default: ''
  },
  version: {
    type: String,
    default: '1.0'
  },
  targetSrsSection: {
    type: String,
    default: '3.1'
  },
  embedding: {
    type: [Number],
    default: []
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

RequirementSchema.index({ projectId: 1, requirementId: 1 }, { unique: true });

RequirementSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.Requirement || mongoose.model('Requirement', RequirementSchema);

