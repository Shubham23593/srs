const mongoose = require('mongoose');

const DocumentChunkSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  sourceType: {
    type: String,
    enum: ['PROJECT_INFO', 'INTERVIEW_MESSAGE', 'REQUIREMENT', 'SRS_SECTION', 'GLOSSARY', 'REFERENCE'],
    required: true
  },
  sourceId: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  embedding: {
    type: [Number],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.DocumentChunk || mongoose.model('DocumentChunk', DocumentChunkSchema);
