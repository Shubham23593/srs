const express = require('express');
const router = express.Router({ mergeParams: true });
const exportController = require('../controllers/export.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/pdf', protect, exportController.exportPDF);
router.get('/docx', protect, exportController.exportDOCX);

module.exports = router;
