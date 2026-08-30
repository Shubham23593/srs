const { registerModel } = require('../db/dataStore');

const definition = {
  fields: {
    projectId: { type: 'ObjectId', ref: 'Project', required: true, index: true },
    srsId: { type: 'ObjectId', ref: 'SRS', required: true },
    version: { type: String, required: true },
    reasonForChanges: { type: String, required: true },
    changedRequirementIds: { type: [String], default: [] },
    affectedSections: { type: [String], default: [] },
    summaryOfChanges: { type: String, default: '' },
    diffData: {
      type: 'Mixed',
      default: { added: [], modified: [], removed: [], sectionDiffs: {} }
    },
    srsSnapshot: { type: 'Mixed', required: true },
    approvedBy: { type: 'ObjectId', ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now }
  },
  indexes: [{ fields: { projectId: 1, version: 1 }, unique: true }]
};

module.exports = registerModel('SRSVersion', definition);
