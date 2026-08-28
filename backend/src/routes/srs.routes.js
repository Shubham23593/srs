const express = require('express');
const router = express.Router({ mergeParams: true });
const srsController = require('../controllers/srs.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/generate', protect, srsController.generateSRS);
router.get('/', protect, srsController.getSRS);
router.post('/update', protect, srsController.incrementalSRSUpdate);

module.exports = router;
