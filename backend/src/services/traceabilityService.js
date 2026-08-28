const TraceabilityLink = require('../models/TraceabilityLink');
const Requirement = require('../models/Requirement');
const SRS = require('../models/SRS');

class TraceabilityService {
  async generateLinksForProject(projectId, srsDoc = null) {
    const requirements = await Requirement.find({ projectId });
    const srs = srsDoc || await SRS.findOne({ projectId });
    const links = [];

    for (const req of requirements) {
      // Find matching section in SRS
      let srsSec = req.type === 'NON_FUNCTIONAL' ? '5.0' : '3.1.3';
      let featId = '3.1';

      if (srs && srs.section3_systemFeatures) {
        for (const feat of srs.section3_systemFeatures) {
          const found = (feat.functionalRequirements || []).find(fr => fr.requirementId === req.requirementId);
          if (found) {
            featId = feat.featureId;
            srsSec = `${feat.featureId}.3`;
            break;
          }
        }
      }

      const link = await TraceabilityLink.findOneAndUpdate(
        { projectId, requirementId: req.requirementId },
        {
          projectId,
          requirementId: req.requirementId,
          requirementTitle: req.title,
          sourceType: req.sourceMessageId ? 'INTERVIEW_MESSAGE' : 'USER_INPUT',
          sourceReference: req.sourceMessageId || 'User Specification',
          sourceTextSnippet: (req.sourceText || req.description).substring(0, 150),
          systemFeatureId: featId,
          srsSection: srsSec,
          srsVersion: srs?.currentVersion || '1.0',
          verificationMethod: req.type === 'NON_FUNCTIONAL' ? 'ANALYSIS' : 'TEST'
        },
        { upsert: true, new: true }
      );
      links.push(link);
    }

    return links;
  }

  async getMatrix(projectId) {
    const links = await TraceabilityLink.find({ projectId }).lean();
    return links.map(l => ({
      linkId: l.linkId,
      requirementId: l.requirementId,
      requirementTitle: l.requirementTitle,
      source: l.sourceReference,
      systemFeature: l.systemFeatureId,
      srsSection: l.srsSection,
      version: l.srsVersion,
      verificationMethod: l.verificationMethod
    }));
  }
}

module.exports = new TraceabilityService();
