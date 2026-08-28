const express = require('express');
const router = express.Router({ mergeParams: true });
const traceabilityController = require('../controllers/traceability.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, traceabilityController.getTraceabilityMatrix);

module.exports = router;
