const express = require('express');
const router = express.Router({ mergeParams: true });
const analysisController = require('../controllers/analysis.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/analyze', protect, analysisController.analyzeProjectRequirements);
router.post('/classify', protect, analysisController.classifySingleRequirement);
router.post('/validate', protect, analysisController.validateProjectRequirements);
router.get('/issues', protect, analysisController.getProjectIssues);
router.post('/merge', protect, analysisController.mergeRequirements);

module.exports = router;
