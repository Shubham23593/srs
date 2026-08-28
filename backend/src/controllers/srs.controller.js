const SRS = require('../models/SRS');
const SRSVersion = require('../models/SRSVersion');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const srsGenerationAgent = require('../ai/agents/SRSGenerationAgent');
const srsReviewAgent = require('../ai/agents/SRSReviewAgent');
const srsUpdateAgent = require('../ai/agents/SRSUpdateAgent');
const ragService = require('../services/ragService');
const traceabilityService = require('../services/traceabilityService');

exports.generateSRS = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const requirements = await Requirement.find({ projectId });
    if (requirements.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot generate SRS without requirements' });
    }

    const issues = await RequirementIssue.find({ projectId, status: 'OPEN' });
    const ragContext = await ragService.retrieveContext(projectId, project.projectName + ' ' + project.scope, 5);

    const generatedData = await srsGenerationAgent.generateSRS(project, requirements, ragContext, issues);

    let srs = await SRS.findOne({ projectId });
    if (srs) {
      Object.assign(srs, generatedData);
      srs.status = 'DRAFT';
      await srs.save();
    } else {
      srs = await SRS.create({
        ...generatedData,
        projectId,
        currentVersion: '1.0',
        status: 'DRAFT'
      });
    }

    // Generate traceability links
    await traceabilityService.generateLinksForProject(projectId, srs);
    await ragService.indexProjectKnowledge(projectId);

    res.status(201).json({ success: true, data: srs });
  } catch (error) {
    next(error);
  }
};

exports.getSRS = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const srs = await SRS.findOne({ projectId });
    if (!srs) {
      return res.status(404).json({ success: false, message: 'SRS document has not been generated yet' });
    }
    res.json({ success: true, data: srs });
  } catch (error) {
    next(error);
  }
};

exports.updateSRS = async (req, res, next) => {
  try {
    const srs = await SRS.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!srs) return res.status(404).json({ success: false, message: 'SRS not found' });
    await ragService.indexProjectKnowledge(srs.projectId);
    res.json({ success: true, data: srs });
  } catch (error) {
    next(error);
  }
};

exports.reviewSRS = async (req, res, next) => {
  try {
    const srs = await SRS.findById(req.params.id);
    if (!srs) return res.status(404).json({ success: false, message: 'SRS not found' });

    const requirements = await Requirement.find({ projectId: srs.projectId });
    const reviewResult = await srsReviewAgent.reviewSRS(srs, requirements);

    srs.reviewNotes = reviewResult.recommendations;
    await srs.save();

    res.json({ success: true, data: reviewResult });
  } catch (error) {
    next(error);
  }
};

exports.approveSRS = async (req, res, next) => {
  try {
    const srs = await SRS.findById(req.params.id);
    if (!srs) return res.status(404).json({ success: false, message: 'SRS not found' });

    srs.status = 'APPROVED';
    srs.approvedBy = req.user?._id;
    srs.approvedAt = new Date();
    await srs.save();

    // Check if version snapshot exists
    let versionDoc = await SRSVersion.findOne({ projectId: srs.projectId, version: srs.currentVersion });
    if (!versionDoc) {
      versionDoc = await SRSVersion.create({
        projectId: srs.projectId,
        srsId: srs._id,
        version: srs.currentVersion,
        reasonForChanges: `Approved release for version ${srs.currentVersion}`,
        summaryOfChanges: `Baseline approved software requirements specification version ${srs.currentVersion}.`,
        srsSnapshot: srs.toObject(),
        approvedBy: req.user?._id
      });
    }

    await Project.findByIdAndUpdate(srs.projectId, { status: 'SRS_APPROVED' });

    res.json({ success: true, message: `SRS v${srs.currentVersion} approved successfully`, data: { srs, version: versionDoc } });
  } catch (error) {
    next(error);
  }
};

exports.incrementalSRSUpdate = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { changeText, reason } = req.body;

    const srs = await SRS.findOne({ projectId });
    if (!srs) return res.status(400).json({ success: false, message: 'Generate initial SRS baseline first.' });

    const requirements = await Requirement.find({ projectId });
    const ragContext = await ragService.retrieveContext(projectId, changeText, 5);

    // AI Incremental Change Analysis & Update
    const updatePlan = await srsUpdateAgent.processIncrementalChange(srs, changeText, requirements, ragContext);

    // Apply or update requirement
    let targetReq = await Requirement.findOne({ projectId, requirementId: updatePlan.affectedRequirementId });
    let isNew = updatePlan.isNewRequirement;

    if (targetReq) {
      targetReq.title = updatePlan.proposedRequirement.title || targetReq.title;
      targetReq.description = updatePlan.proposedRequirement.description;
      targetReq.status = 'MODIFIED';
      targetReq.version = '1.1';
      await targetReq.save();
    } else {
      targetReq = await Requirement.create({
        projectId,
        requirementId: updatePlan.affectedRequirementId,
        title: updatePlan.proposedRequirement.title || 'New Requirement',
        description: updatePlan.proposedRequirement.description,
        type: updatePlan.proposedRequirement.type || 'FUNCTIONAL',
        category: updatePlan.proposedRequirement.category || 'Core Features',
        priority: updatePlan.proposedRequirement.priority || 'HIGH',
        sourceText: changeText,
        status: 'MODIFIED',
        version: '1.1'
      });
    }

    // Calculate new version string (e.g. 1.0 -> 1.1)
    const oldVersionNum = parseFloat(srs.currentVersion) || 1.0;
    const newVersionStr = (oldVersionNum + 0.1).toFixed(1);

    // Update Revision History in SRS
    srs.currentVersion = newVersionStr;
    srs.revisionHistory.push({
      version: newVersionStr,
      date: new Date().toISOString().split('T')[0],
      author: req.user?.name || 'IntelliSDLC AI Reviewer',
      reasonForChanges: reason || updatePlan.reasonForChanges || `Requirement update: ${changeText}`
    });

    // Update Section 3 features if feature updates provided
    if (updatePlan.sectionUpdates?.section3_systemFeatures) {
      srs.section3_systemFeatures = updatePlan.sectionUpdates.section3_systemFeatures;
    } else {
      // Synchronize affected functional requirement inside Section 3
      (srs.section3_systemFeatures || []).forEach(feat => {
        (feat.functionalRequirements || []).forEach(fr => {
          if (fr.requirementId === targetReq.requirementId) {
            fr.title = targetReq.title;
            fr.statement = targetReq.description;
          }
        });
      });
    }

    srs.status = 'APPROVED';
    await srs.save();

    // Create immutable version snapshot
    const versionRecord = await SRSVersion.create({
      projectId,
      srsId: srs._id,
      version: newVersionStr,
      reasonForChanges: reason || updatePlan.reasonForChanges,
      changedRequirementIds: [targetReq.requirementId],
      affectedSections: updatePlan.affectedSections || ['3.1', '3.1.3'],
      summaryOfChanges: updatePlan.summaryOfChanges || `Incrementally updated ${targetReq.requirementId} with approval workflow.`,
      diffData: {
        added: isNew ? [targetReq.requirementId] : [],
        modified: !isNew ? [targetReq.requirementId] : [],
        removed: [],
        sectionDiffs: {
          'Section 3.1': 'Stimulus/Response sequence updated with Admin Approval gate.'
        }
      },
      srsSnapshot: srs.toObject(),
      approvedBy: req.user?._id
    });

    await traceabilityService.generateLinksForProject(projectId, srs);
    await ragService.indexProjectKnowledge(projectId);

    res.json({
      success: true,
      message: `Incremental update applied. Created SRS v${newVersionStr}`,
      data: {
        srs,
        versionRecord,
        updatePlan
      }
    });
  } catch (error) {
    next(error);
  }
};
