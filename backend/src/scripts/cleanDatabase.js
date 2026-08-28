const { connectDB } = require('../config/db');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const SRS = require('../models/SRS');
const SRSVersion = require('../models/SRSVersion');
const TraceabilityLink = require('../models/TraceabilityLink');
const InterviewSession = require('../models/InterviewSession');
const InterviewMessage = require('../models/InterviewMessage');
const DocumentChunk = require('../models/DocumentChunk');
const EmbeddingMetadata = require('../models/EmbeddingMetadata');

async function clean() {
  await connectDB();
  console.log('Cleaning all existing seed data...');
  await Promise.all([
    Project.deleteMany({}),
    Requirement.deleteMany({}),
    RequirementIssue.deleteMany({}),
    SRS.deleteMany({}),
    SRSVersion.deleteMany({}),
    TraceabilityLink.deleteMany({}),
    InterviewSession.deleteMany({}),
    InterviewMessage.deleteMany({}),
    DocumentChunk.deleteMany({}),
    EmbeddingMetadata.deleteMany({})
  ]);
  console.log('✓ Database cleaned completely. Zero pre-seeded projects.');
  process.exit(0);
}

clean();
