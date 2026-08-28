const mongoose = require('mongoose');

const SECTIONS_CONFIG = [
  { id: 'PROJECT_INFORMATION', name: 'Project Information', description: 'Project name, problem solved, primary objective, and high-level scope.' },
  { id: 'STAKEHOLDERS_AND_USERS', name: 'Stakeholders & Users', description: 'Primary and secondary stakeholders, user categories, admins, managers, and clients.' },
  { id: 'USER_ROLES_AND_PERMISSIONS', name: 'User Roles & Permissions', description: 'Role hierarchy, access control rules, permission boundaries, and restrictions.' },
  { id: 'FUNCTIONAL_REQUIREMENTS', name: 'Functional Requirements', description: 'Core capabilities, workflows, actions, and atomic system behaviors (FR-XXX).' },
  { id: 'NON_FUNCTIONAL_REQUIREMENTS', name: 'Non-Functional Requirements', description: 'Performance targets, security standards, scalability, and availability (NFR-XXX).' },
  { id: 'EXTERNAL_INTERFACES', name: 'External Interfaces', description: 'APIs, payment gateways, database integrations, email/SMS services, and third-party systems.' },
  { id: 'CONSTRAINTS', name: 'Constraints', description: 'Technology stack, budget, timeline, regulatory compliance, and legal limitations.' },
  { id: 'ASSUMPTIONS_AND_DEPENDENCIES', name: 'Assumptions & Dependencies', description: 'Operational assumptions, external software dependencies, and network requirements.' },
  { id: 'REVIEW_AND_CONFIRMATION', name: 'Review & Confirmation', description: 'Final requirements summary review, coverage validation, and lock confirmation before SRS generation.' }
];

const InterviewSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    required: true,
    default: () => 'INT-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED', 'LOCKED'],
    default: 'IN_PROGRESS'
  },
  currentSection: {
    type: String,
    default: 'PROJECT_INFORMATION'
  },
  currentTopic: {
    type: String,
    default: 'Project Information'
  },
  sectionIndex: {
    type: Number,
    default: 0
  },
  sectionsState: {
    type: [{
      id: String,
      name: String,
      status: {
        type: String,
        enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
        default: 'NOT_STARTED'
      },
      questionsAsked: { type: Number, default: 0 },
      requirementsExtracted: { type: Number, default: 0 }
    }],
    default: () => SECTIONS_CONFIG.map((sec, idx) => ({
      id: sec.id,
      name: sec.name,
      status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      questionsAsked: 0,
      requirementsExtracted: 0
    }))
  },
  coverage: {
    type: Number,
    min: 0,
    max: 100,
    default: 10
  },
  missingInformation: {
    type: [String],
    default: []
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  completedTopics: {
    type: [String],
    default: []
  },
  summary: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

InterviewSessionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.InterviewSession || mongoose.model('InterviewSession', InterviewSessionSchema);

