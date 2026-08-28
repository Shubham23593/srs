const express = require('express');
const router = express.Router({ mergeParams: true });
const requirementController = require('../controllers/requirement.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, requirementController.getRequirements);
router.post('/', protect, requirementController.createRequirement);
router.post('/extract', protect, requirementController.extractFromText);

module.exports = router;
