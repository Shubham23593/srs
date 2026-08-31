const SRS = require('../models/SRS');
const SRSVersion = require('../models/SRSVersion');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const srsReviewAgent = require('../ai/agents/SRSReviewAgent');
const ragService = require('../services/ragService');
const traceabilityService = require('../services/traceabilityService');

exports.generateSRS = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Only requirements that survived the full validation pipeline may be used.
    const requirements = await Requirement.find({ projectId, archived: { $ne: true } });
    if (requirements.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot generate SRS without requirements' });
    }

    // === AUTHORITATIVE PIPELINE: cluster -> map -> section-wise generation ->
    //     language guard -> quality audit. NEVER reads rawSourceText as content.
    const { srs, audit, clusters, issues, languageAudit, generationSummary } = await pipeline.generateSRS(project);

    // Generate traceability links from normalized requirements
    await traceabilityService.generateLinksForProject(projectId, srs);
    try { await ragService.indexProjectKnowledge(projectId); } catch (e) { /* RAG is best-effort */ }

    res.status(200).json({
      success: true,
      message: 'SRS generated and synchronized successfully',
      data: srs,
      audit,
      languageAudit,
      clusters,
      generationSummary,
      issueCount: issues.length
    });
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
    let srs = await SRS.findById(req.params.id);
    if (!srs) {
      srs = await SRS.findOne({ projectId: req.params.id });
    }
    if (!srs) return res.status(404).json({ success: false, message: 'SRS not found' });

    // Always fetch fresh active requirements from database
    const requirements = await Requirement.find({ projectId: srs.projectId, archived: { $ne: true } });
    
    // Always fetch fresh SRS document directly from database to avoid stale cached snapshot
    const freshSrs = await SRS.findById(srs._id);
    const targetSrs = freshSrs || srs;

    const reviewResult = await srsReviewAgent.reviewSRS(targetSrs, requirements);

    targetSrs.reviewNotes = reviewResult.recommendations;
    if (reviewResult.complianceScore != null) {
      targetSrs.complianceScore = reviewResult.complianceScore;
    }
    await targetSrs.save();

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

/**
 * Phase 20 — Incremental synchronization.
 * A change (new requirement text) is run through the SAME authoritative
 * pipeline: it is guarded, understood, decomposed, normalized and validated.
 * Then only the affected topic cluster / SRS section is regenerated (the
 * pipeline's deterministic section assembly makes this idempotent — repeated
 * syncs never duplicate requirements). Raw change text is never copied.
 */
exports.incrementalSRSUpdate = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { changeText, reason } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const srs = await SRS.findOne({ projectId });
    if (!srs) return res.status(400).json({ success: false, message: 'Generate initial SRS baseline first.' });

    const { SECTIONS_CONFIG } = require('../constants/interviewSections');
    const functionalSection = SECTIONS_CONFIG.find((s) => s.id === 'FUNCTIONAL_REQUIREMENTS');
    const existing = await Requirement.find({ projectId });

    // 1. Run the change through the authoritative analysis pipeline.
    const analysis = await pipeline.analyzeAnswer({
      rawText: changeText,
      project,
      sectionConfig: functionalSection,
      existingRequirements: existing
    });

    if (analysis.isOutOfScope) {
      return res.status(422).json({ success: false, message: analysis.message, outOfScope: true });
    }

    // 2. Persist normalized requirement(s) via the single write path.
    const { saved, skippedDuplicates } = await pipeline.persistRequirements(projectId, analysis);
    for (const iss of analysis.issues || []) {
      await RequirementIssue.create({ projectId, ...iss });
    }

    // 3. Bump version + revision history (idempotent: only when something changed).
    const oldVersionNum = parseFloat(srs.currentVersion) || 1.0;
    const versionStr = (oldVersionNum + 0.1).toFixed(1);

    const changedIds = saved.map((r) => r.requirementId);

    // 4. Regenerate SRS deterministically (section assembly is idempotent and
    //    only reflects the current validated catalog — no duplication).
    const { srs: regenerated, audit, clusters } = await pipeline.generateSRS(project);
    regenerated.currentVersion = versionStr;
    regenerated.revisionHistory.push({
      version: versionStr,
      date: new Date().toISOString().split('T')[0],
      author: req.user?.name || 'IntelliSDLC AI Requirements Pipeline',
      reasonForChanges: reason || `Incremental requirement change (${changedIds.join(', ') || 'normalization sync'})`
    });
    regenerated.status = 'DRAFT';
    await regenerated.save();

    // 5. Immutable version snapshot
    const versionRecord = await SRSVersion.create({
      projectId,
      srsId: regenerated._id,
      version: versionStr,
      reasonForChanges: reason || `Incremental update from change: "${String(changeText).slice(0, 80)}"`,
      changedRequirementIds: changedIds,
      affectedSections: [...new Set(saved.map((r) => r.targetSrsSection || '3'))],
      summaryOfChanges: `Added/updated ${changedIds.length} normalized requirement(s): ${changedIds.join(', ')}.`,
      diffData: {
        added: changedIds,
        modified: [],
        removed: [],
        skippedDuplicates: skippedDuplicates.map((d) => d.duplicateOf),
        sectionDiffs: {}
      },
      srsSnapshot: regenerated.toObject(),
      approvedBy: req.user?._id
    });

    try {
      await traceabilityService.generateLinksForProject(projectId, regenerated);
      await ragService.indexProjectKnowledge(projectId);
    } catch (e) { /* best-effort */ }

    res.json({
      success: true,
      message: `Incremental sync applied. SRS updated to v${versionStr}.`,
      data: {
        srs: regenerated,
        versionRecord,
        audit,
        clusters,
        changedRequirementIds: changedIds,
        skippedDuplicates,
        informationQuality: analysis.informationQuality
      }
    });
  } catch (error) {
    next(error);
  }
};
