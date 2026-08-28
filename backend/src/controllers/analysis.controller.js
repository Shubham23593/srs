const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const requirementAnalysisAgent = require('../ai/agents/RequirementAnalysisAgent');
const classificationAgent = require('../ai/agents/ClassificationAgent');
const validationAgent = require('../ai/agents/ValidationAgent');
const requirementMergeService = require('../services/requirementMergeService');

exports.analyzeProjectRequirements = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const requirements = await Requirement.find({ projectId, status: { $ne: 'DEPRECATED' } });

    if (requirements.length === 0) {
      return res.json({ success: true, message: 'No requirements to analyze', data: [] });
    }

    const issues = await requirementAnalysisAgent.analyzeRequirements(requirements);

    // Save detected issues
    await RequirementIssue.deleteMany({ projectId, status: 'OPEN' });
    const savedIssues = [];
    for (const iss of issues) {
      const issueDoc = await RequirementIssue.create({
        projectId,
        ...iss
      });
      savedIssues.push(issueDoc);
    }

    res.json({
      success: true,
      count: savedIssues.length,
      data: savedIssues
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
    const requirements = await Requirement.find({ projectId, status: { $ne: 'DEPRECATED' } });

    const validationResults = [];
    for (const reqItem of requirements) {
      const valResult = await validationAgent.validateRequirement(reqItem);
      reqItem.validationStatus = valResult.validationStatus;
      reqItem.validationIssues = valResult.issues;
      reqItem.suggestedImprovement = valResult.suggestedImprovement;
      await reqItem.save();

      validationResults.push({
        requirementId: reqItem.requirementId,
        title: reqItem.title,
        validationStatus: valResult.validationStatus,
        issues: valResult.issues,
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

exports.resolveIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const { status, resolutionNotes, primaryRequirementId, secondaryRequirementId } = req.body;

    const issue = await RequirementIssue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    if (status === 'MERGED') {
      let pId = primaryRequirementId;
      let sId = secondaryRequirementId;

      if (!pId || !sId) {
        if (issue.relatedRequirementIds && issue.relatedRequirementIds.length >= 2) {
          pId = issue.relatedRequirementIds[0];
          sId = issue.relatedRequirementIds[1];
        }
      }

      if (!pId || !sId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot merge requirements: Issue does not have at least two related requirement IDs.'
        });
      }

      const mergeResult = await requirementMergeService.mergeRequirements({
        projectId: issue.projectId,
        primaryRequirementId: pId,
        secondaryRequirementId: sId,
        issueId: issue._id,
        resolutionNotes
      });

      return res.json({
        success: true,
        message: mergeResult.message,
        data: mergeResult.issue,
        mergeDetails: mergeResult
      });
    }

    // Standard resolution
    issue.status = status || 'RESOLVED';
    issue.resolutionNotes = resolutionNotes || '';
    issue.updatedAt = new Date();
    await issue.save();

    // Auto-sync SRS Appendix C
    const srsSyncService = require('../services/srsSyncService');
    await srsSyncService.syncProjectSRS(issue.projectId, `Resolved issue ${issue.issueId}`);

    res.json({ success: true, data: issue });
  } catch (error) {
    next(error);
  }
};

exports.mergeRequirements = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { primaryRequirementId, secondaryRequirementId, issueId, resolutionNotes } = req.body;

    const result = await requirementMergeService.mergeRequirements({
      projectId,
      primaryRequirementId,
      secondaryRequirementId,
      issueId,
      resolutionNotes
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
