const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);

// OAuth Routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.get('/github', authController.githubAuth);
router.get('/github/callback', authController.githubCallback);

module.exports = router;
