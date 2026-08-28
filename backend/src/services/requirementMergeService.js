const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const TraceabilityLink = require('../models/TraceabilityLink');
const SRS = require('../models/SRS');
const { getAIProvider } = require('../ai');
const { getMergePrompt } = require('../ai/prompts/merge.prompt');
const embeddingService = require('../ai/EmbeddingService');
const traceabilityService = require('./traceabilityService');
const ragService = require('./ragService');

const { normalizeRequirementStatement } = require('./requirementGrammarValidator');

class RequirementMergeService {
  /**
   * Determine the highest priority between two priorities
   */
  _resolvePriority(p1, p2) {
    if (p1 === 'HIGH' || p2 === 'HIGH') return 'HIGH';
    if (p1 === 'MEDIUM' || p2 === 'MEDIUM') return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Deterministic fallback when AI is offline or parsing fails
   */
  _mergeFallback(primaryReq, secondaryReq) {
    // Generate unified title
    let title = primaryReq.title;
    if (primaryReq.title.toLowerCase() !== secondaryReq.title.toLowerCase()) {
      if (secondaryReq.title.toLowerCase().includes(primaryReq.title.toLowerCase())) {
        title = secondaryReq.title;
      } else if (!primaryReq.title.toLowerCase().includes(secondaryReq.title.toLowerCase())) {
        title = `${primaryReq.title} & ${secondaryReq.title}`;
      }
    }

    // Cleanly combine requirement statements into "The system shall..."
    let desc1 = (primaryReq.description || '').trim();
    let desc2 = (secondaryReq.description || '').trim();

    let rawCombined = desc1;
    if (desc1.toLowerCase() !== desc2.toLowerCase()) {
      rawCombined = `${desc1} Additionally, ${desc2}`;
    }

    const combinedStatement = normalizeRequirementStatement(rawCombined);

    return {
      title,
      description: combinedStatement,
      category: primaryReq.category || secondaryReq.category || 'Core Features',
      priority: this._resolvePriority(primaryReq.priority, secondaryReq.priority),
      nfrSubcategory: primaryReq.nfrSubcategory !== 'N/A' ? primaryReq.nfrSubcategory : (secondaryReq.nfrSubcategory || 'N/A'),
      summaryOfChanges: `Unified specifications from ${primaryReq.requirementId} and ${secondaryReq.requirementId}.`
    };
  }

  /**
   * Intelligently unify requirements using AI or fallback
   */
  async unifyRequirementContent(primaryReq, secondaryReq) {
    const ai = getAIProvider();
    try {
      const prompt = getMergePrompt(primaryReq, secondaryReq);
      const aiResult = await ai.generateStructuredJSON(prompt);

      if (aiResult && aiResult.title && aiResult.description) {
        const desc = normalizeRequirementStatement(aiResult.description);

        return {
          title: aiResult.title.trim(),
          description: desc,
          category: aiResult.category || primaryReq.category || secondaryReq.category || 'Core Features',
          priority: this._resolvePriority(aiResult.priority, this._resolvePriority(primaryReq.priority, secondaryReq.priority)),
          nfrSubcategory: aiResult.nfrSubcategory || (primaryReq.nfrSubcategory !== 'N/A' ? primaryReq.nfrSubcategory : secondaryReq.nfrSubcategory),
          summaryOfChanges: aiResult.summaryOfChanges || `Merged duplicate specifications ${primaryReq.requirementId} and ${secondaryReq.requirementId}.`
        };
      }
    } catch (err) {
      console.warn('[RequirementMergeService] AI unification fallback triggered:', err.message);
    }

    return this._mergeFallback(primaryReq, secondaryReq);
  }

  /**
   * Complete end-to-end merge of two duplicate requirements
   */
  async mergeRequirements({
    projectId,
    primaryRequirementId,
    secondaryRequirementId,
    issueId = null,
    resolutionNotes = ''
  }) {
    if (!projectId) {
      throw new Error('Project ID is required for requirement merge.');
    }
    if (!primaryRequirementId || !secondaryRequirementId) {
      throw new Error('Both primary and secondary requirement IDs must be provided.');
    }
    if (primaryRequirementId === secondaryRequirementId) {
      throw new Error('Cannot merge a requirement into itself.');
    }

    // 1. Retrieve full content and metadata of both requirements
    const primaryReq = await Requirement.findOne({
      projectId,
      $or: [{ requirementId: primaryRequirementId }, { _id: primaryRequirementId.match(/^[0-9a-fA-F]{24}$/) ? primaryRequirementId : null }]
    });

    const secondaryReq = await Requirement.findOne({
      projectId,
      $or: [{ requirementId: secondaryRequirementId }, { _id: secondaryRequirementId.match(/^[0-9a-fA-F]{24}$/) ? secondaryRequirementId : null }]
    });

    if (!primaryReq) {
      throw new Error(`Primary requirement "${primaryRequirementId}" was not found.`);
    }
    if (!secondaryReq) {
      throw new Error(`Secondary requirement "${secondaryRequirementId}" was not found.`);
    }

    const pId = primaryReq.requirementId;
    const sId = secondaryReq.requirementId;

    // 2. Create single unified requirement content
    const unified = await this.unifyRequirementContent(primaryReq, secondaryReq);

    // 3. Generate new vector embedding for the unified specification
    let newEmbedding = [];
    try {
      newEmbedding = await embeddingService.generateEmbedding(`${unified.title}: ${unified.description}`);
    } catch (embErr) {
      console.warn('[RequirementMergeService] Vector embedding generation warning:', embErr.message);
      newEmbedding = primaryReq.embedding || [];
    }

    // 4. Update primary requirement with unified content
    primaryReq.title = unified.title;
    primaryReq.description = unified.description;
    primaryReq.priority = unified.priority;
    primaryReq.category = unified.category;
    primaryReq.nfrSubcategory = unified.nfrSubcategory;
    primaryReq.status = primaryReq.status === 'APPROVED' ? 'APPROVED' : 'MODIFIED';
    primaryReq.completenessScore = Math.max(primaryReq.completenessScore || 85, secondaryReq.completenessScore || 85, 90);
    primaryReq.validationStatus = 'VALID';
    primaryReq.validationIssues = [];
    primaryReq.embedding = newEmbedding;
    primaryReq.updatedAt = new Date();
    await primaryReq.save();

    // 5. Mark secondary requirement as DEPRECATED / Merged with detailed metadata
    const defaultResolutionMsg = `Merged ${pId} and ${sId} into ${pId}.`;
    const finalResolutionNotes = resolutionNotes || defaultResolutionMsg;

    secondaryReq.status = 'DEPRECATED';
    secondaryReq.mergedInto = pId;
    secondaryReq.deprecatedReason = finalResolutionNotes;
    secondaryReq.deprecatedAt = new Date();
    secondaryReq.title = `[MERGED INTO ${pId}] ${secondaryReq.title}`;
    secondaryReq.suggestedImprovement = `Merged into ${pId}`;
    secondaryReq.updatedAt = new Date();
    await secondaryReq.save();

    // 6. Update all related RequirementIssues in this project
    // A) If a specific issueId is provided, update it to MERGED
    let targetIssue = null;
    if (issueId) {
      targetIssue = await RequirementIssue.findById(issueId);
      if (targetIssue) {
        targetIssue.status = 'MERGED';
        targetIssue.resolutionNotes = finalResolutionNotes;
        targetIssue.updatedAt = new Date();
        await targetIssue.save();
      }
    }

    // B) Update all other issues in the project that reference sId
    const otherIssues = await RequirementIssue.find({
      projectId,
      _id: { $ne: issueId ? targetIssue?._id : null },
      relatedRequirementIds: sId
    });

    for (const iss of otherIssues) {
      const updatedIds = iss.relatedRequirementIds.map(id => (id === sId ? pId : id));
      const deduplicated = [...new Set(updatedIds)];
      iss.relatedRequirementIds = deduplicated;

      // If the issue was specifically a duplicate/conflict between pId and sId
      if (iss.issueType === 'DUPLICATE' && iss.status === 'OPEN') {
        iss.status = 'MERGED';
        iss.resolutionNotes = `Automatically resolved via merge of ${pId} and ${sId}.`;
      }
      iss.updatedAt = new Date();
      await iss.save();
    }

    // 7. Update Traceability Links
    try {
      await TraceabilityLink.deleteMany({ projectId, requirementId: sId });
      await traceabilityService.generateLinksForProject(projectId);
    } catch (trcErr) {
      console.warn('[RequirementMergeService] Traceability links update warning:', trcErr.message);
    }

    // 8. Update SRS Document Section 3 features if SRS exists
    try {
      const srs = await SRS.findOne({ projectId });
      if (srs && srs.section3_systemFeatures) {
        let modifiedSrs = false;
        srs.section3_systemFeatures.forEach(feat => {
          if (feat.functionalRequirements) {
            // Update primary requirement
            feat.functionalRequirements.forEach(fr => {
              if (fr.requirementId === pId) {
                fr.title = primaryReq.title;
                fr.statement = primaryReq.description;
                modifiedSrs = true;
              }
            });
            // Remove secondary requirement
            const initialLen = feat.functionalRequirements.length;
            feat.functionalRequirements = feat.functionalRequirements.filter(fr => fr.requirementId !== sId);
            if (feat.functionalRequirements.length !== initialLen) {
              modifiedSrs = true;
            }
          }
        });

        if (modifiedSrs) {
          srs.revisionHistory.push({
            version: srs.currentVersion || '1.0',
            date: new Date().toISOString().split('T')[0],
            author: 'IntelliSDLC Merge Agent',
            reasonForChanges: `Merged duplicate requirements ${pId} and ${sId} into ${pId}.`
          });
          await srs.save();
        }
      }
    } catch (srsErr) {
      console.warn('[RequirementMergeService] SRS synchronization warning:', srsErr.message);
    }

    // 9. Re-index RAG Knowledge Base
    try {
      await ragService.indexProjectKnowledge(projectId);
    } catch (ragErr) {
      console.warn('[RequirementMergeService] RAG re-indexing warning:', ragErr.message);
    }

    const successMessage = `${pId} and ${sId} were successfully merged into ${pId}.`;

    return {
      success: true,
      message: successMessage,
      primaryRequirement: primaryReq,
      deprecatedRequirement: secondaryReq,
      unifiedContent: unified,
      issue: targetIssue
    };
  }
}

module.exports = new RequirementMergeService();
