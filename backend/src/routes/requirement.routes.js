const express = require('express');
const router = express.Router({ mergeParams: true });
const requirementController = require('../controllers/requirement.controller');
const analysisController = require('../controllers/analysis.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, requirementController.getRequirements);
router.post('/', protect, requirementController.createRequirement);
router.post('/extract', protect, requirementController.extractFromText);
router.post('/batch', protect, requirementController.batchCreate);
router.post('/:reqId/revalidate', protect, requirementController.revalidateRequirement);
router.post('/:reqId/archive', protect, requirementController.archiveRequirement);
router.post('/:reqId/alternative-suggestion', protect, analysisController.generateAlternativeSuggestion);

module.exports = router;
