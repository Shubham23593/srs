const mongoose = require('mongoose');

const RequirementIssueSchema = new mongoose.Schema({
  issueId: {
    type: String,
    unique: true,
    required: true,
    default: () => 'ISSUE-' + Math.random().toString(36).substring(2, 7).toUpperCase()
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  issueType: {
    type: String,
    enum: ['AMBIGUITY', 'DUPLICATE', 'CONFLICT', 'INCOMPLETE', 'UNTESTABLE', 'TBD'],
    required: true
  },
  severity: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM'
  },
  description: {
    type: String,
    required: true
  },
  relatedRequirementIds: {
    type: [String],
    default: []
  },
  similarityScore: {
    type: Number,
    default: null
  },
  suggestedResolution: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['OPEN', 'RESOLVED', 'IGNORED', 'MERGED'],
    default: 'OPEN'
  },
  resolutionNotes: {
    type: String,
    default: ''
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

RequirementIssueSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.RequirementIssue || mongoose.model('RequirementIssue', RequirementIssueSchema);
