const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const SRS = require('../models/SRS');
const Project = require('../models/Project');
const traceabilityService = require('./traceabilityService');
const ragService = require('./ragService');
const srsGenerationAgent = require('../ai/agents/SRSGenerationAgent');
const { normalizeRequirementStatement } = require('./requirementGrammarValidator');

class SRSSyncService {
  /**
   * Synchronize active requirements to the current SRS document (if exists), Traceability links, and RAG index.
   * Guaranteed to be idempotent and preserve document integrity.
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

      // Re-structure Section 3 System Features with active functional requirements
      const functionalReqs = activeReqs.filter(r => r.type === 'FUNCTIONAL');
      srs.section3_systemFeatures = srsGenerationAgent._groupRequirementsIntoFeatures(functionalReqs);

      // Re-map Constraints
      const constraintReqs = activeReqs.filter(r => r.type === 'CONSTRAINT');
      const baseConstraints = project.constraints || [];
      const constraintText = [
        ...baseConstraints,
        ...constraintReqs.map(c => `[${c.requirementId}] ${normalizeRequirementStatement(c.description)}`)
      ].join(' ');
      srs.section2_overallDescription.designAndImplementationConstraints = constraintText || 'Strict adherence to REST architecture, token authentication, and data integrity.';

      // Re-map Assumptions
      const assumptionReqs = activeReqs.filter(r => r.type === 'ASSUMPTION');
      const baseAssumptions = project.assumptions || [];
      const assumptionText = [
        ...baseAssumptions,
        ...assumptionReqs.map(a => `[${a.requirementId}] ${normalizeRequirementStatement(a.description)}`)
      ].join(' ');
      srs.section2_overallDescription.assumptionsAndDependencies = assumptionText || 'High-availability network connectivity and supported client web environments.';

      // Re-map Stakeholder User Classes
      const stakeholderReqs = activeReqs.filter(r => r.type === 'STAKEHOLDER');
      const baseUsers = project.targetUsers || [];
      const targetUserText = [
        ...baseUsers,
        ...stakeholderReqs.map(s => `[${s.requirementId}] ${s.title}: ${s.description}`)
      ].join(', ');
      srs.section2_overallDescription.userClassesAndCharacteristics = targetUserText || 'Standard Users, Operators, and System Administrators.';

      // Re-map Interfaces
      const interfaceReqs = activeReqs.filter(r => r.type === 'INTERFACE');
      if (interfaceReqs.length > 0) {
        srs.section4_externalInterfaceRequirements.softwareInterfaces = interfaceReqs.map(i => `[${i.requirementId}] ${normalizeRequirementStatement(i.description)}`).join(' ');
      }

      // Re-map NFRs in Section 5
      const nfrReqs = activeReqs.filter(r => r.type === 'NON_FUNCTIONAL');
      const perfReqs = nfrReqs.filter(r => r.nfrSubcategory === 'PERFORMANCE' || r.category?.toLowerCase().includes('perf'));
      const secReqs = nfrReqs.filter(r => r.nfrSubcategory === 'SECURITY' || r.category?.toLowerCase().includes('sec'));
      const safetyReqs = nfrReqs.filter(r => r.nfrSubcategory === 'SAFETY' || r.category?.toLowerCase().includes('safe'));
      const qualReqs = nfrReqs.filter(r => !['PERFORMANCE', 'SECURITY', 'SAFETY'].includes(r.nfrSubcategory) && !r.category?.toLowerCase().includes('perf') && !r.category?.toLowerCase().includes('sec'));

      srs.section5_otherNonfunctionalRequirements.performanceRequirements = perfReqs.length > 0
        ? perfReqs.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
        : 'The system shall maintain API response times under 2.0 seconds at standard operational load and support concurrent user transactions without degradation.';

      srs.section5_otherNonfunctionalRequirements.securityRequirements = secReqs.length > 0
        ? secReqs.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
        : 'The system shall enforce role-based access control (RBAC) and JWT token-based authentication for all protected endpoints.';

      srs.section5_otherNonfunctionalRequirements.safetyRequirements = safetyReqs.length > 0
        ? safetyReqs.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
        : 'The system state shall be preserved transactionally in case of unhandled server interruptions.';

      srs.section5_otherNonfunctionalRequirements.softwareQualityAttributes = qualReqs.length > 0
        ? qualReqs.map(r => `[${r.requirementId}] ${normalizeRequirementStatement(r.description)}`).join(' ')
        : 'The software shall exhibit high modularity, automated testability, and 99.9% operational availability.';

      // Dynamic Appendix C
      srs.appendixC_issuesList = issues.map(iss => ({
        issueId: iss.issueId || 'ISSUE-001',
        description: iss.description,
        relatedRequirement: (iss.relatedRequirementIds || []).join(', ') || 'General',
        priority: iss.severity || 'MEDIUM',
        status: iss.status || 'OPEN'
      }));

      // Append Revision History Entry if last reason is different
      const today = new Date().toISOString().split('T')[0];
      const lastEntry = srs.revisionHistory[srs.revisionHistory.length - 1];
      if (!lastEntry || lastEntry.reasonForChanges !== reason) {
        srs.revisionHistory.push({
          version: srs.currentVersion || '1.0',
          date: today,
          author: 'IntelliSDLC Sync Agent',
          reasonForChanges: reason
        });
      }

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
