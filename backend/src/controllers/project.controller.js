const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const SRS = require('../models/SRS');
const ragService = require('../services/ragService');

exports.createProject = async (req, res, next) => {
  try {
    const { projectName, description, scope, domain, targetUsers, stakeholders, objectives, constraints, assumptions, dependencies } = req.body;

    const project = await Project.create({
      projectName,
      description,
      scope,
      domain,
      targetUsers: Array.isArray(targetUsers) ? targetUsers : (targetUsers ? targetUsers.split(',').map(s => s.trim()) : []),
      stakeholders: Array.isArray(stakeholders) ? stakeholders : (stakeholders ? stakeholders.split(',').map(s => s.trim()) : []),
      objectives: Array.isArray(objectives) ? objectives : (objectives ? objectives.split(',').map(s => s.trim()) : []),
      constraints: Array.isArray(constraints) ? constraints : (constraints ? constraints.split(',').map(s => s.trim()) : []),
      assumptions: Array.isArray(assumptions) ? assumptions : (assumptions ? assumptions.split(',').map(s => s.trim()) : []),
      dependencies: Array.isArray(dependencies) ? dependencies : (dependencies ? dependencies.split(',').map(s => s.trim()) : []),
      owner: req.user?._id
    });

    // Automatically index project metadata in RAG
    await ragService.indexProjectKnowledge(project._id);

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

exports.seedDemo = async (req, res, next) => {
  try {
    const demoSeedService = require('../services/demoSeedService');
    const { project } = await demoSeedService.seedDemoProject(req.user || null);
    res.status(201).json({
      success: true,
      message: 'Demo project seeded with pipeline-generated requirements and SRS.',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

exports.getProjects = async (req, res, next) => {
  try {
    const filter = req.user ? { owner: req.user._id } : {};
    const projects = await Project.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    next(error);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    await ragService.indexProjectKnowledge(project._id);
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, message: 'Project removed successfully' });
  } catch (error) {
    next(error);
  }
};
