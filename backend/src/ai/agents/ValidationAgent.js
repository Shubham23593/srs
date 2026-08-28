const { getAIProvider } = require('../index');
const { getValidationPrompt } = require('../prompts/validation.prompt');

const { normalizeRequirementStatement, validateRequirementStatementQuality } = require('../../services/requirementGrammarValidator');

class ValidationAgent {
  async validateRequirement(requirement) {
    const ai = getAIProvider();
    
    // Heuristic pre-validation using ISO 29148 Grammar & Quality Validator
    const quality = validateRequirementStatementQuality(requirement.description);
    if (!quality.isValid) {
      return {
        validationStatus: 'NEEDS_REVIEW',
        issues: quality.issues,
        suggestedImprovement: quality.normalizedStatement
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
        suggestedImprovement: normalizeRequirementStatement(result.suggestedImprovement || requirement.description)
      };
    } catch (err) {
      return {
        validationStatus: 'VALID',
        issues: [],
        suggestedImprovement: normalizeRequirementStatement(requirement.description)
      };
    }
  }
}

module.exports = new ValidationAgent();
