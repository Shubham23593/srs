const { registerModel } = require('../db/dataStore');

const definition = {
  fields: {
    issueId: {
      type: String, unique: true, required: true,
      default: () => 'ISSUE-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    },
    projectId: { type: 'ObjectId', ref: 'Project', required: true, index: true },
    issueType: {
      type: String,
      enum: ['AMBIGUITY', 'DUPLICATE', 'RULE_CONFLICT', 'CONFLICT', 'INCOMPLETE', 'UNTESTABLE', 'OUT_OF_SCOPE', 'LANGUAGE_VIOLATION', 'RAW_TEXT_LEAK', 'TBD'],
      required: true
    },
    severity: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
    description: { type: String, required: true },
    relatedRequirementIds: { type: [String], default: [] },
    similarityScore: { type: Number, default: null },
    suggestedResolution: { type: String, default: '' },
    clarificationQuestion: { type: String, default: '' },
    status: { type: String, enum: ['OPEN', 'RESOLVED', 'IGNORED', 'MERGED'], default: 'OPEN' },
    resolutionNotes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  indexes: [{ fields: { issueId: 1 }, unique: true }],
  preSave: [(doc) => { doc.updatedAt = new Date(); }]
};

module.exports = registerModel('RequirementIssue', definition);
