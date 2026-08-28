const { getAIProvider } = require('../index');
const { getClassificationPrompt } = require('../prompts/classification.prompt');

class ClassificationAgent {
  async classifyRequirement(requirement) {
    const ai = getAIProvider();
    const prompt = getClassificationPrompt(requirement);
    const result = await ai.generateStructuredJSON(prompt);

    return {
      type: result.type === 'NON_FUNCTIONAL' ? 'NON_FUNCTIONAL' : 'FUNCTIONAL',
      category: result.category || (result.type === 'NON_FUNCTIONAL' ? 'General NFR' : 'Core Features'),
      rationale: result.rationale || ''
    };
  }
}

module.exports = new ClassificationAgent();
