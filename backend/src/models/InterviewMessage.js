const { registerModel } = require('../db/dataStore');

const definition = {
  fields: {
    messageId: {
      type: String, unique: true, required: true,
      default: () => 'MSG-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    },
    sessionId: { type: 'ObjectId', ref: 'InterviewSession', required: true, index: true },
    projectId: { type: 'ObjectId', ref: 'Project', required: true, index: true },
    sender: { type: String, enum: ['AI', 'USER', 'SYSTEM'], required: true },
    content: { type: String, required: true },
    section: { type: String, default: 'PROJECT_INFORMATION' },
    topic: { type: String, default: 'Project Information' },
    stepIndex: { type: Number, default: 1 },
    languageDetected: { type: String, enum: ['English', 'Hindi', 'Marathi', 'Hinglish', 'Mixed', 'Unknown'], default: 'English' },
    isOutOfScope: { type: Boolean, default: false },
    // Phase 13 structured analysis result for this answer
    analysisResult: { type: 'Mixed', default: null },
    extractedRequirementIds: { type: [String], default: [] },
    suggestedAction: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
  },
  indexes: [{ fields: { messageId: 1 }, unique: true }]
};

module.exports = registerModel('InterviewMessage', definition);
