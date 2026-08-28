const mongoose = require('mongoose');

const ResearchReferenceSchema = new mongoose.Schema({
  referenceId: {
    type: String,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  authors: {
    type: [String],
    default: []
  },
  venueOrStandard: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['RESEARCH_PAPER', 'STANDARD', 'GUIDELINE'],
    default: 'RESEARCH_PAPER'
  },
  appliedConcepts: {
    type: [String],
    default: []
  },
  citationString: {
    type: String,
    required: true
  }
});

module.exports = mongoose.models.ResearchReference || mongoose.model('ResearchReference', ResearchReferenceSchema);
