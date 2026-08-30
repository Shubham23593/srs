const { registerModel } = require('../db/dataStore');
const { SECTIONS_CONFIG } = require('../constants/interviewSections');

const definition = {
  fields: {
    sessionId: {
      type: String, unique: true, required: true,
      default: () => 'INT-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    },
    projectId: { type: 'ObjectId', ref: 'Project', required: true, index: true },
    status: { type: String, enum: ['IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED', 'LOCKED'], default: 'IN_PROGRESS' },
    currentSection: { type: String, default: 'PROJECT_INFORMATION' },
    currentTopic: { type: String, default: 'Project Information' },
    sectionIndex: { type: Number, default: 0 },
    sectionsState: {
      type: 'Mixed',
      default: () => SECTIONS_CONFIG.map((sec, idx) => ({
        id: sec.id,
        name: sec.name,
        status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        questionsAsked: 0,
        requirementsExtracted: 0
      }))
    },
    coverage: { type: Number, min: 0, max: 100, default: 10 },
    missingInformation: { type: [String], default: [] },
    isLocked: { type: Boolean, default: false },
    completedTopics: { type: [String], default: [] },
    summary: { type: 'Mixed', default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  indexes: [{ fields: { sessionId: 1 }, unique: true }],
  preSave: [(doc) => { doc.updatedAt = new Date(); }]
};

module.exports = registerModel('InterviewSession', definition);
