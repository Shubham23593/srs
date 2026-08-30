const { getAIProvider } = require('../index');
const { getValidationPrompt } = require('../prompts/validation.prompt');

class ValidationAgent {
  async validateRequirement(requirement) {
    const ai = getAIProvider();
    
    // Heuristic pre-validation
    const vagueWords = ['fast', 'user-friendly', 'flexible', 'robust', 'seamless'];
    const hasVague = vagueWords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(requirement.description));
    const isVeryShort = requirement.description.trim().split(' ').length < 4;

    if (hasVague || isVeryShort) {
      return {
        validationStatus: 'NEEDS_REVIEW',
        issues: hasVague ? ['Contains ambiguous/non-quantified language.'] : ['Description is underspecified.'],
        suggestedImprovement: `The system shall ensure that ${requirement.title.toLowerCase()} executes with verified compliance metrics.`
      };
    }

    try {
      const prompt = getValidationPrompt(requirement);
      const result = await ai.generateStructuredJSON(prompt);

      return {
        validationStatus: ['VALID', 'NEEDS_REVIEW', 'INVALID'].includes(result.validationStatus)
          ? result.validationStatus
          : 'VALID',
        issues: result.issues || [],
        suggestedImprovement: result.suggestedImprovement || requirement.description
      };
    } catch (err) {
      return {
        validationStatus: 'VALID',
        issues: [],
        suggestedImprovement: requirement.description
      };
    }
  }
}

module.exports = new ValidationAgent();
