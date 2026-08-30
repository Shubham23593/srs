const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const requirementAnalysisAgent = require('../ai/agents/RequirementAnalysisAgent');
const classificationAgent = require('../ai/agents/ClassificationAgent');
const validationAgent = require('../ai/agents/ValidationAgent');

exports.analyzeProjectRequirements = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const requirements = await Requirement.find({ projectId });

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
    const requirements = await Requirement.find({ projectId });

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
    const { status, resolutionNotes } = req.body; // 'RESOLVED' | 'IGNORED' | 'MERGED'
    const issue = await RequirementIssue.findByIdAndUpdate(
      req.params.id,
      { status: status || 'RESOLVED', resolutionNotes: resolutionNotes || '' },
      { new: true }
    );
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    res.json({ success: true, data: issue });
  } catch (error) {
    next(error);
  }
};
