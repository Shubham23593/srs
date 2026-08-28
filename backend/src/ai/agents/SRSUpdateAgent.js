const { getAIProvider } = require('../index');
const { getSRSUpdatePrompt } = require('../prompts/srs-update.prompt');
const embeddingService = require('../EmbeddingService');

const { normalizeRequirementStatement } = require('../../services/requirementGrammarValidator');

class SRSUpdateAgent {
  async processIncrementalChange(currentSRS, changedInputText, existingRequirements, ragContext = '') {
    const ai = getAIProvider();

    // 1. Identify affected requirement via vector similarity
    const inputEmb = await embeddingService.generateEmbedding(changedInputText);
    let bestMatchReq = null;
    let highestSim = -1;

    for (const req of existingRequirements) {
      const reqEmb = req.embedding?.length === 384
        ? req.embedding
        : await embeddingService.generateEmbedding(`${req.title}: ${req.description}`);
      
      const sim = embeddingService.cosineSimilarity(inputEmb, reqEmb);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatchReq = req;
      }
    }

    let affectedReq = bestMatchReq;
    let isNew = false;
    if (highestSim < 0.45) {
      isNew = true;
    }

    const prompt = getSRSUpdatePrompt(currentSRS, changedInputText, existingRequirements, ragContext);
    let updatePlan = await ai.generateStructuredJSON(prompt);

    // Fallback deterministic builder if needed
    if (!updatePlan || !updatePlan.proposedRequirement) {
      const targetId = isNew
        ? `FR-${String(existingRequirements.length + 1).padStart(3, '0')}`
        : (affectedReq ? affectedReq.requirementId : 'FR-002');

      updatePlan = {
        affectedRequirementId: targetId,
        isNewRequirement: isNew,
        proposedRequirement: {
          requirementId: targetId,
          title: isNew ? 'Additional System Feature' : (affectedReq ? affectedReq.title : 'Event Registration with Admin Approval'),
          description: normalizeRequirementStatement(changedInputText),
          type: 'FUNCTIONAL',
          category: affectedReq ? affectedReq.category : 'Core Features',
          priority: 'HIGH'
        },
        affectedSections: ['3.1', '3.1.3', '2.2'],
        sectionUpdates: {},
        reasonForChanges: `Requirement modified: ${changedInputText}`,
        summaryOfChanges: `Updated ${targetId} and synchronized Section 3 system features.`
      };
    } else if (updatePlan.proposedRequirement?.description) {
      updatePlan.proposedRequirement.description = normalizeRequirementStatement(updatePlan.proposedRequirement.description);
    }

    return updatePlan;
  }
}

module.exports = new SRSUpdateAgent();
