const express = require('express');
const router = express.Router({ mergeParams: true });
const interviewController = require('../controllers/interview.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/start', protect, interviewController.startInterview);
router.post('/message', protect, interviewController.sendMessage);
router.get('/', protect, interviewController.getInterview);

module.exports = router;
