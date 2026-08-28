const mongoose = require('mongoose');

const InterviewMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    unique: true,
    required: true,
    default: () => 'MSG-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  sender: {
    type: String,
    enum: ['AI', 'USER', 'SYSTEM'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  section: {
    type: String,
    default: 'PROJECT_INFORMATION'
  },
  topic: {
    type: String,
    default: 'Project Information'
  },
  stepIndex: {
    type: Number,
    default: 1
  },
  languageDetected: {
    type: String,
    enum: ['English', 'Hindi', 'Hinglish', 'Unknown'],
    default: 'English'
  },
  isOutOfScope: {
    type: Boolean,
    default: false
  },
  extractedRequirementIds: {
    type: [String],
    default: []
  },
  suggestedAction: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.InterviewMessage || mongoose.model('InterviewMessage', InterviewMessageSchema);

