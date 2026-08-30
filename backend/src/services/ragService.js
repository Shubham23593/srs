const mongoVectorStore = require('../ai/MongoDBVectorStore');
const embeddingService = require('../ai/EmbeddingService');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const InterviewMessage = require('../models/InterviewMessage');
const SRS = require('../models/SRS');

class RAGService {
  async indexProjectKnowledge(projectId) {
    const project = await Project.findById(projectId);
    if (!project) return;

    const documentsToIndex = [];

    // 1. Index Project Metadata & Scope
    const projectSummary = `Project: ${project.projectName}\nDescription: ${project.description}\nScope: ${project.scope}\nTarget Users: ${(project.targetUsers || []).join(', ')}\nObjectives: ${(project.objectives || []).join(', ')}\nConstraints: ${(project.constraints || []).join(', ')}`;
    documentsToIndex.push({
      sourceType: 'PROJECT_INFO',
      sourceId: project.projectId,
      content: projectSummary,
      metadata: { projectName: project.projectName }
    });

    // 2. Index Requirements
    const reqs = await Requirement.find({ projectId });
    for (const req of reqs) {
      documentsToIndex.push({
        sourceType: 'REQUIREMENT',
        sourceId: req.requirementId,
        content: `Requirement ${req.requirementId} (${req.type} - ${req.category}): ${req.title}. ${req.description}. Status: ${req.status}`,
        metadata: { requirementId: req.requirementId, type: req.type }
      });
    }

    // 3. Index Interview Transcripts
    const messages = await InterviewMessage.find({ projectId });
    for (const msg of messages) {
      documentsToIndex.push({
        sourceType: 'INTERVIEW_MESSAGE',
        sourceId: msg.messageId,
        content: `${msg.sender}: ${msg.content} [Topic: ${msg.topic}]`,
        metadata: { messageId: msg.messageId, sender: msg.sender }
      });
    }

    // 4. Index Current SRS
    const srs = await SRS.findOne({ projectId });
    if (srs) {
      documentsToIndex.push({
        sourceType: 'SRS_SECTION',
        sourceId: 'SEC-1',
        content: `1. Purpose: ${srs.section1_introduction?.purpose}\nScope: ${srs.section1_introduction?.projectScope}`,
        metadata: { section: '1' }
      });
      (srs.section3_systemFeatures || []).forEach(f => {
        documentsToIndex.push({
          sourceType: 'SRS_SECTION',
          sourceId: f.featureId,
          content: `Feature ${f.featureId} ${f.featureName}: ${f.descriptionAndPriority}\nFunctional requirements: ${(f.functionalRequirements || []).map(r => `${r.requirementId}: ${r.statement}`).join('; ')}`,
          metadata: { featureId: f.featureId }
        });
      });
    }

    await mongoVectorStore.deleteProjectVectors(projectId);
    await mongoVectorStore.addDocuments(projectId, documentsToIndex);
  }

  async retrieveContext(projectId, queryText, topK = 5) {
    const queryEmb = await embeddingService.generateEmbedding(queryText);
    const results = await mongoVectorStore.similaritySearch(projectId, queryEmb, topK);
    return results.map(r => `[Source: ${r.sourceType} | Score: ${(r.score * 100).toFixed(1)}%] ${r.content}`).join('\n\n');
  }
}

module.exports = new RAGService();
