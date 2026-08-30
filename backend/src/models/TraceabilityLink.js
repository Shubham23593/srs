const { registerModel } = require('../db/dataStore');

const definition = {
  fields: {
    linkId: {
      type: String, unique: true, required: true,
      default: () => 'TRC-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    },
    projectId: { type: 'ObjectId', ref: 'Project', required: true, index: true },
    requirementId: { type: String, required: true, index: true },
    requirementTitle: { type: String, default: '' },
    sourceType: { type: String, enum: ['INTERVIEW_MESSAGE', 'USER_INPUT', 'STAKEHOLDER_DOC', 'SYSTEM_DERIVED'], default: 'INTERVIEW_MESSAGE' },
    sourceReference: { type: String, default: '' },
    sourceTextSnippet: { type: String, default: '' },
    systemFeatureId: { type: String, default: '' },
    srsSection: { type: String, default: '3.1' },
    srsVersion: { type: String, default: '1.0' },
    verificationMethod: { type: String, enum: ['TEST', 'DEMONSTRATION', 'INSPECTION', 'ANALYSIS'], default: 'TEST' },
    createdAt: { type: Date, default: Date.now }
  },
  indexes: [{ fields: { linkId: 1 }, unique: true }]
};

module.exports = registerModel('TraceabilityLink', definition);
