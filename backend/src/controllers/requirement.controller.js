const Requirement = require('../models/Requirement');
const Project = require('../models/Project');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const embeddingService = require('../ai/EmbeddingService');
const ragService = require('../services/ragService');
const { SECTIONS_CONFIG } = require('../constants/interviewSections');

exports.getRequirements = async (req, res, next) => {
  try {
    const { type, status, category } = req.query;
    const filter = { projectId: req.params.id };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const requirements = await Requirement.find(filter).sort({ requirementId: 1 });
    res.json({ success: true, count: requirements.length, data: requirements });
  } catch (error) {
    next(error);
  }
};

exports.createRequirement = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { title, description, type, nfrSubcategory, category, priority, sourceText } = req.body;

    // Even manually-created requirements are normalized to formal SRS language;
    // whatever the user typed is kept as rawSourceText evidence, never as the
    // requirement statement.
    const { formalNormalize } = require('../ai/pipeline/semanticEngine');
    const rawSourceText = sourceText || description || '';
    const normalizedDescription = formalNormalize(description || title || '');

    const reqType = type || 'FUNCTIONAL';
    const prefixMap = {
      FUNCTIONAL: 'FR', NON_FUNCTIONAL: 'NFR', CONSTRAINT: 'CON',
      ASSUMPTION: 'ASM', DEPENDENCY: 'DEP', INTERFACE: 'INT',
      STAKEHOLDER: 'STK', BUSINESS_RULE: 'BR'
    };
    const prefix = prefixMap[reqType] || 'FR';
    const count = await Requirement.countDocuments({ projectId, type: reqType });
    const reqId = req.body.requirementId || `${prefix}-${String(count + 1).padStart(3, '0')}`;

    const embedding = await embeddingService.generateEmbedding(`${title}: ${normalizedDescription}`);

    const requirement = await Requirement.create({
      projectId,
      requirementId: reqId,
      title,
      rawSourceText,
      sourceLanguage: 'English',
      sourceInterviewStage: 'Manual Entry',
      normalizedDescription,
      description: normalizedDescription,
      type: reqType,
      nfrSubcategory: nfrSubcategory || (reqType === 'NON_FUNCTIONAL' ? 'PERFORMANCE' : 'N/A'),
      category: category || (reqType === 'FUNCTIONAL' ? 'Core Features' : `${prefix} Specifications`),
      priority: priority || 'MEDIUM',
      completenessScore: 90,
      isAtomic: true,
      confidence: 1.0,
      status: 'APPROVED',
      validationStatus: 'VALID',
      embedding
    });

    try { await ragService.indexProjectKnowledge(projectId); } catch (e) {}

    res.status(201).json({ success: true, data: requirement });
  } catch (error) {
    next(error);
  }
};


exports.updateRequirement = async (req, res, next) => {
  try {
    const requirementId = req.params.id; // Can be MongoDB _id or custom requirementId
    let requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      requirement = await Requirement.findOne({ requirementId });
    }

    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    if (req.body.title || req.body.description) {
      const title = req.body.title || requirement.title;
      const desc = req.body.description || requirement.description;
      req.body.embedding = await embeddingService.generateEmbedding(`${title}: ${desc}`);
    }

    const updated = await Requirement.findByIdAndUpdate(requirement._id, req.body, { new: true });
    await ragService.indexProjectKnowledge(requirement.projectId);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteRequirement = async (req, res, next) => {
  try {
    const requirement = await Requirement.findByIdAndDelete(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }
    await ragService.indexProjectKnowledge(requirement.projectId);
    res.json({ success: true, message: 'Requirement removed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.extractFromText = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { text } = req.body;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Route free-text extraction through the SAME authoritative pipeline used
    // by the interview (guard -> understand -> decompose -> normalize -> QC).
    const functionalSection = SECTIONS_CONFIG.find((s) => s.id === 'FUNCTIONAL_REQUIREMENTS');
    const existing = await Requirement.find({ projectId });

    const analysis = await pipeline.analyzeAnswer({
      rawText: text,
      project,
      sectionConfig: functionalSection,
      existingRequirements: existing
    });

    if (analysis.isOutOfScope) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        outOfScope: true,
        message: analysis.message
      });
    }

    const { saved, skippedDuplicates } = await pipeline.persistRequirements(projectId, analysis);
    try { await ragService.indexProjectKnowledge(projectId); } catch (e) {}

    res.status(201).json({
      success: true,
      count: saved.length,
      data: saved,
      informationQuality: analysis.informationQuality,
      skippedDuplicates,
      clarificationQuestion: analysis.clarificationQuestion
    });
  } catch (error) {
    next(error);
  }
};
