const OllamaProvider = require('./OllamaProvider');

let activeProvider = new OllamaProvider();

module.exports = {
  getAIProvider: () => activeProvider,
  setAIProvider: (provider) => {
    activeProvider = provider;
  }
};
