const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler.middleware');
const embeddingService = require('./src/ai/EmbeddingService');

const app = express();

// Security and middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

const PORT = env.port || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Preload the real multilingual neural embedding model so the active engine
    // is resolved before printing the startup banner. Failure falls back to the
    // deterministic engine with a clearly logged warning (never crashes boot).
    try {
      await embeddingService.warmup();
    } catch (e) {
      console.warn('[Startup] Embedding model warmup failed; deterministic fallback active:', e.message);
    }

    const embInfo = embeddingService.getInfo();
    const activeEmbeddingModel = embInfo.realModel ? embInfo.modelId : 'deterministic-fallback';

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` IntelliSDLC AI Requirements Engineering Platform `);
      console.log(` Backend Server running on port: ${PORT}`);
      console.log(` Environment: ${env.nodeEnv}`);
      console.log(` AI Provider: ${env.ai.provider} (${env.ai.ollamaModel})`);
      console.log(` Embedding Model: ${activeEmbeddingModel}`);
      console.log(`====================================================`);
      console.log(`[Startup] Embedding engine ready: ${embInfo.engine} (dimensions=${embInfo.dimensions}, realModel=${embInfo.realModel})`);
    });
  } catch (error) {
    console.error('Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
