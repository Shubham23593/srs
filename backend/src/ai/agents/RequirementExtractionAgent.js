const { getAIProvider } = require('../index');
const { getExtractionPrompt } = require('../prompts/extraction.prompt');

class RequirementExtractionAgent {
  async extractRequirements(text, projectContext, startingIdNum = 1) {
    const ai = getAIProvider();
    const prompt = getExtractionPrompt(text, projectContext);
    const result = await ai.generateStructuredJSON(prompt);

    const rawReqs = result.requirements || [];
    let frCount = startingIdNum;
    let nfrCount = startingIdNum;

    return rawReqs.map((req) => {
      const isFR = req.type === 'FUNCTIONAL';
      const idStr = isFR
        ? `FR-${String(frCount++).padStart(3, '0')}`
        : `NFR-${String(nfrCount++).padStart(3, '0')}`;

      return {
        requirementId: req.requirementId || idStr,
        title: req.title,
        description: req.description,
        type: req.type || 'FUNCTIONAL',
        category: req.category || 'Core',
        priority: req.priority || 'MEDIUM',
        confidence: req.confidence || 0.95,
        sourceText: text.substring(0, 300),
        status: 'PROPOSED',
        validationStatus: 'VALID'
      };
    });
  }
}

module.exports = new RequirementExtractionAgent();
