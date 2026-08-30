const { registerModel } = require('../db/dataStore');

const definition = {
  fields: {
    projectId: { type: 'ObjectId', ref: 'Project', required: true, index: true },
    sourceType: {
      type: String,
      enum: ['PROJECT_INFO', 'INTERVIEW_MESSAGE', 'REQUIREMENT', 'SRS_SECTION', 'GLOSSARY', 'REFERENCE'],
      required: true
    },
    sourceId: { type: String, default: '' },
    content: { type: String, required: true },
    metadata: { type: 'Mixed', default: {} },
    embedding: { type: [Number], default: [] },
    createdAt: { type: Date, default: Date.now }
  }
};

module.exports = registerModel('DocumentChunk', definition);
