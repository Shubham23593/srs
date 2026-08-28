const mongoose = require('mongoose');

const SRSVersionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  srsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SRS',
    required: true
  },
  version: {
    type: String,
    required: true
  },
  reasonForChanges: {
    type: String,
    required: true
  },
  changedRequirementIds: {
    type: [String],
    default: []
  },
  affectedSections: {
    type: [String],
    default: []
  },
  summaryOfChanges: {
    type: String,
    default: ''
  },
  diffData: {
    added: { type: [String], default: [] },
    modified: { type: [String], default: [] },
    removed: { type: [String], default: [] },
    sectionDiffs: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  srsSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

SRSVersionSchema.index({ projectId: 1, version: 1 }, { unique: true });

module.exports = mongoose.models.SRSVersion || mongoose.model('SRSVersion', SRSVersionSchema);
