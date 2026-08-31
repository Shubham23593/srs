const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const Project = require('../models/Project');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const requirementAnalysisAgent = require('../ai/agents/RequirementAnalysisAgent');
const classificationAgent = require('../ai/agents/ClassificationAgent');
const validationAgent = require('../ai/agents/ValidationAgent');
const embeddingService = require('../ai/EmbeddingService');
const ragService = require('../services/ragService');
const { formalNormalize } = require('../ai/pipeline/semanticEngine');

exports.analyzeProjectRequirements = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    const requirements = await Requirement.find({ projectId, archived: { $ne: true } });

    if (requirements.length === 0) {
      return res.json({ success: true, message: 'No requirements to analyze', data: [] });
    }

    const { issues } = await pipeline.analyzeCatalog(projectId);

    res.json({
      success: true,
      count: issues.length,
      data: issues
    });
  } catch (error) {
    next(error);
  }
};

exports.classifySingleRequirement = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const result = await classificationAgent.classifyRequirement({ title, description });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.validateProjectRequirements = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    const requirements = await Requirement.find({ projectId, archived: { $ne: true } });

    const validationResults = [];
    for (const reqItem of requirements) {
      const valResult = await validationAgent.validateRequirement(reqItem, project);
      reqItem.validationStatus = valResult.validationStatus;
      reqItem.validationIssues = valResult.issues;
      reqItem.contextRelevance = valResult.contextRelevance;
      reqItem.validationDimensions = valResult.validationDimensions;
      reqItem.suggestedImprovement = valResult.suggestedImprovement;
      await reqItem.save();

      validationResults.push({
        requirementId: reqItem.requirementId,
        title: reqItem.title,
        validationStatus: valResult.validationStatus,
        issues: valResult.issues,
        contextRelevance: valResult.contextRelevance,
        validationDimensions: valResult.validationDimensions,
        suggestedImprovement: valResult.suggestedImprovement
      });
    }

    res.json({
      success: true,
      count: validationResults.length,
      data: validationResults
    });
  } catch (error) {
    next(error);
  }
};

exports.getProjectIssues = async (req, res, next) => {
  try {
    const issues = await RequirementIssue.find({ projectId: req.params.id }).sort({ severity: 1, createdAt: -1 });
    res.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    next(error);
  }
};

/**
 * Quality Audit Conflict & Duplicate Resolution (Priority 7 & 10)
 * Supports: KEEP_BOTH, MERGE, EDIT, MARK_RESOLVED
 */
exports.resolveIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const {
      status,
      resolutionType = 'MARK_RESOLVED',
      resolutionNotes = '',
      mergedTitle,
      mergedDescription,
      targetRequirementId,
      updatedTitle,
      updatedDescription
    } = req.body;

    const issue = await RequirementIssue.findById(issueId);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const project = await Project.findById(issue.projectId);

    // 1. MERGE Resolution Flow
    if (resolutionType === 'MERGE' || status === 'MERGED') {
      const relatedIds = issue.relatedRequirementIds || [];
      if (relatedIds.length >= 2) {
        const primaryReqId = relatedIds[0];
        const duplicateReqIds = relatedIds.slice(1);

        let primaryReq = await Requirement.findOne({ projectId: issue.projectId, requirementId: primaryReqId });
        if (!primaryReq) primaryReq = await Requirement.findById(primaryReqId);

        if (primaryReq) {
          const finalTitle = mergedTitle || primaryReq.title;
          const finalDesc = formalNormalize(mergedDescription || primaryReq.normalizedDescription || '');

          primaryReq.title = finalTitle;
          primaryReq.normalizedDescription = finalDesc;
          primaryReq.description = finalDesc;
          primaryReq.source = 'AI_MERGED';
          primaryReq.mergedFrom = relatedIds;
          primaryReq.duplicateCandidates = [];
          primaryReq.embedding = await embeddingService.generateEmbedding(finalDesc);
          primaryReq.embeddingModel = embeddingService.isRealModelActive() ? 'multilingual-e5-small' : 'deterministic-v1';

          const valResult = await validationAgent.validateRequirement(primaryReq, project);
          primaryReq.validationStatus = valResult.validationStatus;
          primaryReq.validationDimensions = valResult.validationDimensions;
          primaryReq.contextRelevance = valResult.contextRelevance;
          await primaryReq.save();

          // Archive the duplicate secondary requirements
          for (const dupId of duplicateReqIds) {
            let dupReq = await Requirement.findOne({ projectId: issue.projectId, requirementId: dupId });
            if (!dupReq) dupReq = await Requirement.findById(dupId);
            if (dupReq) {
              dupReq.archived = true;
              dupReq.status = 'DEPRECATED';
              await dupReq.save();
            }
          }
        }
      }

      issue.status = 'MERGED';
      issue.resolutionType = 'MERGE';
      issue.resolutionNotes = resolutionNotes || 'Merged duplicate requirements into unified specification.';
      issue.resolvedAt = new Date();
      await issue.save();
    }
    // 2. KEEP BOTH Resolution Flow
    else if (resolutionType === 'KEEP_BOTH' || status === 'IGNORED' || status === 'KEPT_BOTH') {
      issue.status = 'KEPT_BOTH';
      issue.resolutionType = 'KEEP_BOTH';
      issue.resolutionNotes = resolutionNotes || 'Kept both requirements independently per stakeholder decision.';
      issue.resolvedAt = new Date();
      await issue.save();
    }
    // 3. EDIT Requirement In-Place
    else if (resolutionType === 'EDIT') {
      if (targetRequirementId && (updatedTitle || updatedDescription)) {
        let reqDoc = await Requirement.findOne({ projectId: issue.projectId, requirementId: targetRequirementId });
        if (!reqDoc) reqDoc = await Requirement.findById(targetRequirementId);

        if (reqDoc) {
          if (updatedTitle) reqDoc.title = updatedTitle;
          if (updatedDescription) {
            const desc = formalNormalize(updatedDescription);
            reqDoc.normalizedDescription = desc;
            reqDoc.description = desc;
            reqDoc.embedding = await embeddingService.generateEmbedding(desc);
          }
          const valResult = await validationAgent.validateRequirement(reqDoc, project);
          reqDoc.validationStatus = valResult.validationStatus;
          reqDoc.validationDimensions = valResult.validationDimensions;
          await reqDoc.save();
        }
      }

      issue.status = 'RESOLVED';
      issue.resolutionType = 'EDIT';
      issue.resolutionNotes = resolutionNotes || 'Requirement modified in-place to resolve conflict/ambiguity.';
      issue.resolvedAt = new Date();
      await issue.save();
    }
    // 4. MARK RESOLVED
    else {
      issue.status = 'RESOLVED';
      issue.resolutionType = 'MARK_RESOLVED';
      issue.resolutionNotes = resolutionNotes || 'Resolved issue.';
      issue.resolvedAt = new Date();
      await issue.save();
    }

    try { await ragService.indexProjectKnowledge(issue.projectId); } catch (e) {}
    res.json({ success: true, data: issue });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate AI Alternative Suggestion (Priority 8)
 */
exports.generateAlternativeSuggestion = async (req, res, next) => {
  try {
    const { id: reqId } = req.params;
    let requirement = await Requirement.findById(reqId);
    if (!requirement) requirement = await Requirement.findOne({ requirementId: reqId });
    if (!requirement) return res.status(404).json({ success: false, message: 'Requirement not found' });

    const project = await Project.findById(requirement.projectId);
    const suggestion = await validationAgent.generateAlternativeSuggestion(requirement, project);

    res.json({ success: true, data: suggestion });
  } catch (error) {
    next(error);
  }
};
