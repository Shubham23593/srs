const { registerModel } = require('../db/dataStore');

const definition = {
  fields: {
    projectId: { type: 'ObjectId', ref: 'Project', required: true, index: true },
    modelName: { type: String, default: 'BAAI/bge-small-en-v1.5' },
    dimensions: { type: Number, default: 384 },
    totalChunks: { type: Number, default: 0 },
    lastIndexedAt: { type: Date, default: Date.now }
  }
};

module.exports = registerModel('EmbeddingMetadata', definition);
