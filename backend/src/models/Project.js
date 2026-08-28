const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    unique: true,
    required: true,
    default: () => 'PRJ-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  scope: {
    type: String,
    default: ''
  },
  domain: {
    type: String,
    default: 'General Software'
  },
  targetUsers: {
    type: [String],
    default: []
  },
  stakeholders: {
    type: [String],
    default: []
  },
  objectives: {
    type: [String],
    default: []
  },
  constraints: {
    type: [String],
    default: []
  },
  assumptions: {
    type: [String],
    default: []
  },
  dependencies: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['DRAFT', 'INTERVIEWING', 'ANALYZED', 'SRS_GENERATED', 'SRS_APPROVED', 'UPDATING'],
    default: 'DRAFT'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

ProjectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
