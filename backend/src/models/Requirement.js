/**
 * Requirement catalog model.
 *
 * CRITICAL ARCHITECTURE INVARIANT:
 *   raw user interview text is NEVER stored in `title` / `normalizedDescription`.
 *   Raw input is preserved ONLY in `rawSourceText` as source evidence.
 *   The active requirement representation is the normalized, atomic,
 *   formal-language statement produced by the requirements pipeline.
 */

const { registerModel, ObjectId } = require('../db/dataStore');

const STATUS_ENUM = ['PROPOSED', 'NEEDS_CLARIFICATION', 'NEEDS_REVIEW', 'APPROVED', 'ACTIVE', 'DEPRECATED', 'REJECTED', 'MODIFIED', 'LOCKED'];
const TYPE_ENUM = ['FUNCTIONAL', 'NON_FUNCTIONAL', 'CONSTRAINT', 'ASSUMPTION', 'DEPENDENCY', 'INTERFACE', 'STAKEHOLDER', 'BUSINESS_RULE'];

const definition = {
  fields: {
    requirementId: { type: String, required: true, index: true },
    projectId: { type: ObjectId, ref: 'Project', required: true, index: true },

    title: { type: String, required: true, trim: true },

    // Raw, unstructured source evidence (interview answer). NOT shown as the requirement.
    rawSourceText: { type: String, default: '' },
    sourceLanguage: { type: String, default: 'English' },
    sourceMessageId: { type: String, default: null },
    sourceInterviewStage: { type: String, default: '' },

    // The authoritative normalized, formal SRS statement ("The system shall ...").
    normalizedDescription: { type: String, required: true, default: '' },

    type: { type: String, enum: TYPE_ENUM, default: 'FUNCTIONAL' },
    nfrSubcategory: {
      type: String,
      enum: ['PERFORMANCE', 'SECURITY', 'SCALABILITY', 'AVAILABILITY', 'RELIABILITY', 'USABILITY', 'MAINTAINABILITY', 'SAFETY', 'OTHER', 'N/A'],
      default: 'N/A'
    },
    category: { type: String, default: 'Core Features' },

    // Semantic topic cluster (Phase 15)
    topicCluster: { type: String, default: '' },

    // Deterministic SRS section mapping (Phase 16)
    targetSrsSection: { type: String, default: '3.1' },
    targetSrsSectionName: { type: String, default: 'System Features' },

    priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },

    // Quality analysis (Phase 9)
    status: { type: String, enum: STATUS_ENUM, default: 'PROPOSED' },
    validationStatus: { type: String, enum: ['VALID', 'NEEDS_REVIEW', 'NEEDS_CLARIFICATION', 'INVALID'], default: 'VALID' },
    qualityFlags: { type: [String], default: [] },
    ambiguityFlags: { type: [String], default: [] },
    clarificationQuestion: { type: String, default: '' },
    duplicateCandidates: { type: [String], default: [] },
    duplicateScores: { type: Object, default: {} },
    conflictReferences: { type: [String], default: [] },
    validationIssues: { type: [String], default: [] },
    suggestedImprovement: { type: String, default: '' },

    qualityScores: {
      type: 'Mixed',
      default: {
        atomicity: 0, clarity: 0, completeness: 0, consistency: 0,
        testability: 0, unambiguity: 0, feasibility: 0, traceability: 0
      }
    },
    completenessScore: { type: Number, min: 0, max: 100, default: 85 },
    confidence: { type: Number, min: 0, max: 1, default: 0.9 },
    isAtomic: { type: Boolean, default: true },

    // Mapped into SRS (Phase 19 audit / Phase 20 sync)
    mappedToSrs: { type: Boolean, default: false },

    // Backwards-compatible alias: some legacy views/exports read `description`.
    // It ALWAYS equals normalizedDescription (never the raw source text).
    version: { type: String, default: '1.0' },
    embedding: { type: [Number], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  indexes: [
    { fields: { projectId: 1, requirementId: 1 }, unique: true }
  ],
  preSave: [
    (doc) => {
      doc.updatedAt = new Date();
      // Keep legacy `description` alias synchronized with normalizedDescription.
      doc.description = doc.normalizedDescription;
    }
  ]
};

const Requirement = registerModel('Requirement', definition);

/**
 * Ensure every persisted/fetched requirement exposes `description` as an alias
 * for `normalizedDescription`, so ALL legacy readers (catalog, SRS, export)
 * always see the normalized statement and NEVER the raw source text.
 */
function normalizeRequirementView(req) {
  if (!req) return req;
  const list = Array.isArray(req) ? req : [req];
  for (const r of list) {
    if (r && typeof r === 'object') {
      const normalized = r.normalizedDescription || r.description || '';
      r.normalizedDescription = normalized;
      r.description = normalized;
    }
  }
  return Array.isArray(req) ? list : list[0];
}

module.exports = Requirement;
module.exports.STATUS_ENUM = STATUS_ENUM;
module.exports.TYPE_ENUM = TYPE_ENUM;
module.exports.normalizeRequirementView = normalizeRequirementView;
