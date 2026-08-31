const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const projectRoutes = require('./project.routes');
const interviewRoutes = require('./interview.routes');
const requirementRoutes = require('./requirement.routes');
const analysisRoutes = require('./analysis.routes');
const srsRoutes = require('./srs.routes');
const versionRoutes = require('./version.routes');
const traceabilityRoutes = require('./traceability.routes');
const exportRoutes = require('./export.routes');

const requirementController = require('../controllers/requirement.controller');
const srsController = require('../controllers/srs.controller');
const analysisController = require('../controllers/analysis.controller');
const { protect } = require('../middleware/auth.middleware');

// Root API mappings
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);

// Nested sub-routes for projects
router.use('/projects/:id/interview', interviewRoutes);
router.use('/projects/:id/requirements', requirementRoutes);
router.use('/projects/:id/requirements', analysisRoutes);
router.use('/projects/:id/srs', srsRoutes);
router.use('/projects/:id/srs', versionRoutes);
router.use('/projects/:id/srs/export', exportRoutes);
router.use('/projects/:id/traceability', traceabilityRoutes);

// Direct entity mutation routes
router.put('/requirements/:id', protect, requirementController.updateRequirement);
router.delete('/requirements/:id', protect, requirementController.deleteRequirement);
router.post('/requirements/:id/revalidate', protect, requirementController.revalidateRequirement);
router.post('/requirements/:id/archive', protect, requirementController.archiveRequirement);
router.post('/requirements/:id/alternative-suggestion', protect, analysisController.generateAlternativeSuggestion);

router.put('/srs/:id', protect, srsController.updateSRS);
router.post('/srs/:id/review', protect, srsController.reviewSRS);
router.post('/srs/:id/approve', protect, srsController.approveSRS);

router.put('/issues/:id/resolve', protect, analysisController.resolveIssue);

// System health and AI provider status endpoint (Priority 11)
router.get('/health', async (req, res) => {
  const { getAIProvider } = require('../ai');
  const embeddingService = require('../ai/EmbeddingService');
  const ai = getAIProvider();
  let aiHealth = { provider: 'ollama', status: 'OFFLINE', connected: false, configuredModel: '', modelRunning: false };

  try {
    if (ai && typeof ai.checkLiveHealth === 'function') {
      aiHealth = await ai.checkLiveHealth();
    } else if (ai && typeof ai.getHealthDetails === 'function') {
      aiHealth = ai.getHealthDetails();
    } else if (ai) {
      const connected = await ai.isHealthy();
      aiHealth = { provider: ai.providerName || 'ollama', status: connected ? 'ONLINE' : 'OFFLINE', connected };
    }
  } catch (e) {
    aiHealth = { provider: 'ollama', status: 'OFFLINE', connected: false, error: e.message };
  }

  const embInfo = embeddingService.getInfo();
  const embeddingData = {
    modelName: embInfo.modelId || 'Xenova/multilingual-e5-small',
    status: embInfo.realModel ? 'LOADED' : 'FALLBACK',
    dimensions: embInfo.dimensions || 384,
    engine: embInfo.engine,
    realModel: embInfo.realModel,
    isRealModel: embInfo.realModel,
    lastError: embInfo.lastError || null
  };

  res.json({
    status: 'OK',
    service: 'IntelliSDLC AI Requirements Engineering Platform',
    timestamp: new Date().toISOString(),
    ai: aiHealth,
    ollama: aiHealth,
    embedding: embeddingData
  });
});

router.get('/health/ai', async (req, res) => {
  const { getAIProvider } = require('../ai');
  const embeddingService = require('../ai/EmbeddingService');
  const ai = getAIProvider();
  let aiHealth = { provider: 'ollama', status: 'OFFLINE', connected: false, configuredModel: '', modelRunning: false };

  try {
    if (ai && typeof ai.checkLiveHealth === 'function') {
      aiHealth = await ai.checkLiveHealth();
    } else if (ai && typeof ai.getHealthDetails === 'function') {
      aiHealth = ai.getHealthDetails();
    } else if (ai) {
      const connected = await ai.isHealthy();
      aiHealth = { provider: ai.providerName || 'ollama', status: connected ? 'ONLINE' : 'OFFLINE', connected };
    }
  } catch (e) {
    aiHealth = { provider: 'ollama', status: 'OFFLINE', connected: false, error: e.message };
  }

  const embInfo = embeddingService.getInfo();
  const embeddingData = {
    modelName: embInfo.modelId || 'Xenova/multilingual-e5-small',
    status: embInfo.realModel ? 'LOADED' : 'FALLBACK',
    dimensions: embInfo.dimensions || 384,
    engine: embInfo.engine,
    realModel: embInfo.realModel,
    isRealModel: embInfo.realModel,
    lastError: embInfo.lastError || null
  };

  res.json({
    success: true,
    data: {
      ollama: aiHealth,
      ai: aiHealth,
      embedding: embeddingData
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
