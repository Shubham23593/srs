const express = require('express');
const router = express.Router({ mergeParams: true });
const versionController = require('../controllers/version.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/versions', protect, versionController.getProjectVersions);
router.get('/versions/:version', protect, versionController.getVersionByNumber);
router.get('/compare', protect, versionController.compareVersions);

module.exports = router;
