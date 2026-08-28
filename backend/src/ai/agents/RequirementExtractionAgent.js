const { getAIProvider } = require('../index');
const { getExtractionPrompt } = require('../prompts/extraction.prompt');
const { normalizeRequirementStatement } = require('../../services/requirementGrammarValidator');
const { decomposeAndNormalizeRequirements, decomposeRawTextToAtomicRequirements } = require('../../services/atomicRequirementDecomposer');

class RequirementExtractionAgent {
  async extractRequirements(text, projectContext, startingIdNum = 1) {
    const ai = getAIProvider();
    const prompt = getExtractionPrompt(text, projectContext);

    let rawReqs = [];
    try {
      const result = await ai.generateStructuredJSON(prompt);
      if (result?.requirements && Array.isArray(result.requirements)) {
        rawReqs = result.requirements;
      }
    } catch (err) {
      console.warn('[RequirementExtractionAgent] AI extraction call failed or timed out:', err.message);
    }

    // Decompose any compound requirements from LLM output
    let atomicReqs = [];
    if (rawReqs.length > 0) {
      atomicReqs = decomposeAndNormalizeRequirements(rawReqs, projectContext);
    }

    // If LLM returned empty or failed, use semantic rule-based atomic decomposer
    if (atomicReqs.length === 0 && text && text.trim().length >= 8) {
      atomicReqs = decomposeRawTextToAtomicRequirements(text, {}, projectContext);
    }

    let frCount = startingIdNum;
    let nfrCount = startingIdNum;
    let conCount = startingIdNum;
    let asmCount = startingIdNum;
    let intCount = startingIdNum;
    let stkCount = startingIdNum;

    return atomicReqs.map((req) => {
      const type = req.type || 'FUNCTIONAL';
      let idStr;

      if (type === 'NON_FUNCTIONAL') {
        idStr = `NFR-${String(nfrCount++).padStart(3, '0')}`;
      } else if (type === 'CONSTRAINT') {
        idStr = `CON-${String(conCount++).padStart(3, '0')}`;
      } else if (type === 'ASSUMPTION') {
        idStr = `ASM-${String(asmCount++).padStart(3, '0')}`;
      } else if (type === 'INTERFACE') {
        idStr = `INT-${String(intCount++).padStart(3, '0')}`;
      } else if (type === 'STAKEHOLDER') {
        idStr = `STK-${String(stkCount++).padStart(3, '0')}`;
      } else {
        idStr = `FR-${String(frCount++).padStart(3, '0')}`;
      }

      return {
        requirementId: req.requirementId || idStr,
        title: req.title,
        description: normalizeRequirementStatement(req.description),
        type,
        nfrSubcategory: req.nfrSubcategory || (type === 'NON_FUNCTIONAL' ? 'PERFORMANCE' : 'N/A'),
        category: req.category || (type === 'FUNCTIONAL' ? 'Core Features' : `${type} Specifications`),
        priority: req.priority || (type === 'NON_FUNCTIONAL' || type === 'CONSTRAINT' ? 'HIGH' : 'MEDIUM'),
        confidence: req.confidence || 0.95,
        sourceText: text.substring(0, 300),
        status: 'ACTIVE',
        validationStatus: 'VALID',
        isAtomic: true,
        completenessScore: req.completenessScore || 90
      };
    });
  }
}

module.exports = new RequirementExtractionAgent();
