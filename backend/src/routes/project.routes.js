const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, projectController.createProject);
router.get('/', protect, projectController.getProjects);
router.get('/:id', protect, projectController.getProjectById);
router.put('/:id', protect, projectController.updateProject);
router.delete('/:id', protect, projectController.deleteProject);

module.exports = router;
