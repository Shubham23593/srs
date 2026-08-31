require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellisdlc',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key_intellisdlc_ai_req_eng',
  ai: {
    provider: process.env.AI_PROVIDER || 'ollama',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
    ollamaTimeout: parseInt(process.env.OLLAMA_TIMEOUT, 10) || 180000,
    embeddingModel: process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small'
  }
};
