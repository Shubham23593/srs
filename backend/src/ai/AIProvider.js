/**
 * Abstract Base Class for AI Providers
 */
class AIProvider {
  constructor(name) {
    if (new.target === AIProvider) {
      throw new TypeError("Cannot construct AIProvider abstract instances directly");
    }
    this.name = name;
  }

  /**
   * Generates a completion based on prompt and options
   * @param {string} prompt 
   * @param {object} options 
   * @returns {Promise<string>}
   */
  async generateCompletion(prompt, options = {}) {
    throw new Error("Method 'generateCompletion()' must be implemented.");
  }

  /**
   * Generates structured JSON output from prompt
   * @param {string} prompt 
   * @param {object} schema 
   * @returns {Promise<object>}
   */
  async generateStructuredJSON(prompt, schema = null) {
    throw new Error("Method 'generateStructuredJSON()' must be implemented.");
  }

  /**
   * Health check for provider availability
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    throw new Error("Method 'isHealthy()' must be implemented.");
  }
}

module.exports = AIProvider;
