const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const SRS = require('../models/SRS');
const Project = require('../models/Project');
const traceabilityService = require('./traceabilityService');
const ragService = require('./ragService');
const { sanitizeAndValidateSRS } = require('./srsSanitizerAndValidator');

class SRSSyncService {
  /**
   * Synchronize active requirements to the current SRS document (if exists), Traceability links, and RAG index.
   * Guaranteed to be idempotent, strictly free of conversational text, and preserve ISO 29148 integrity.
   */
  async syncProjectSRS(projectId, reason = 'Synchronized requirements catalog with SRS specification.') {
    try {
      const project = await Project.findById(projectId);
      if (!project) return null;

      const activeReqs = await Requirement.find({ projectId, status: { $ne: 'DEPRECATED' } });
      const issues = await RequirementIssue.find({ projectId, status: 'OPEN' });
      const srs = await SRS.findOne({ projectId });

      if (!srs) {
        // No SRS generated yet, but we still sync RAG and traceability
        await traceabilityService.generateLinksForProject(projectId);
        await ragService.indexProjectKnowledge(projectId);
        return null;
      }

      // Sanitize and synchronize complete SRS structure
      const { sanitizedSRS } = sanitizeAndValidateSRS(srs.toObject(), project, activeReqs, issues);

      // Append Revision History Entry if last reason is different
      const today = new Date().toISOString().split('T')[0];
      const revHistory = sanitizedSRS.revisionHistory || [];
      const lastEntry = revHistory[revHistory.length - 1];
      if (!lastEntry || lastEntry.reasonForChanges !== reason) {
        revHistory.push({
          version: srs.currentVersion || '1.0',
          date: today,
          author: 'IntelliSDLC Sync Agent',
          reasonForChanges: reason
        });
      }
      sanitizedSRS.revisionHistory = revHistory;

      // Update in-place
      Object.assign(srs, sanitizedSRS);
      await srs.save();

      // Sync Traceability & RAG
      await traceabilityService.generateLinksForProject(projectId, srs);
      await ragService.indexProjectKnowledge(projectId);

      return srs;
    } catch (err) {
      console.warn('[SRSSyncService] Synchronization warning:', err.message);
      return null;
    }
  }
}

module.exports = new SRSSyncService();
