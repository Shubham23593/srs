const Requirement = require('../models/Requirement');
const RequirementIssue = require('../models/RequirementIssue');
const Project = require('../models/Project');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const embeddingService = require('../ai/EmbeddingService');
const validationAgent = require('../ai/agents/ValidationAgent');
const { assessProjectRelevance } = require('../ai/pipeline/contextRelevanceEngine');
const ragService = require('../services/ragService');
const { SECTIONS_CONFIG } = require('../constants/interviewSections');
const { formalNormalize } = require('../ai/pipeline/semanticEngine');

const TYPE_PREFIX = {
  FUNCTIONAL: 'FR', NON_FUNCTIONAL: 'NFR', CONSTRAINT: 'CON',
  ASSUMPTION: 'ASM', DEPENDENCY: 'DEP', INTERFACE: 'INT',
  STAKEHOLDER: 'STK', BUSINESS_RULE: 'BR'
};

exports.getRequirements = async (req, res, next) => {
  try {
    const { type, status, category, includeArchived } = req.query;
    const filter = { projectId: req.params.id };

    if (includeArchived !== 'true') {
      filter.archived = { $ne: true };
    }

    if (type && type !== 'ALL') filter.type = type;
    if (status && status !== 'ALL') filter.status = status;
    if (category && category !== 'ALL') filter.category = category;

    const requirements = await Requirement.find(filter).sort({ requirementId: 1 });
    res.json({ success: true, count: requirements.length, data: requirements });
  } catch (error) {
    next(error);
  }
};

exports.createRequirement = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    const { title, description, type, nfrSubcategory, category, priority, sourceText, source } = req.body;

    const rawSourceText = sourceText || description || '';
    const normalizedDescription = formalNormalize(description || title || '');

    const reqType = type || 'FUNCTIONAL';
    const prefix = TYPE_PREFIX[reqType] || 'FR';
    const count = await Requirement.countDocuments({ projectId, type: reqType });
    const reqId = req.body.requirementId || `${prefix}-${String(count + 1).padStart(3, '0')}`;

    const embedding = await embeddingService.generateEmbedding(normalizedDescription);
    const embeddingModel = embeddingService.isRealModelActive() ? 'multilingual-e5-small' : 'deterministic-v1';

    // Assess Project Context Relevance (Priority 4)
    const contextRelevance = await assessProjectRelevance({
      title, normalizedDescription, type: reqType, category
    }, project);

    const requirement = await Requirement.create({
      projectId,
      requirementId: reqId,
      title,
      source: source || 'MANUAL',
      originalText: rawSourceText,
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
      status: 'PROPOSED',
      validationStatus: contextRelevance.status === 'CONTEXT_MISMATCH' ? 'NEEDS_REVIEW' : 'VALID',
      contextRelevance,
      embedding,
      embeddingModel
    });

    try { await ragService.indexProjectKnowledge(projectId); } catch (e) {}

    res.status(201).json({ success: true, data: requirement });
  } catch (error) {
    next(error);
  }
};

exports.updateRequirement = async (req, res, next) => {
  try {
    const requirementId = req.params.id;
    let requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      requirement = await Requirement.findOne({ requirementId });
    }

    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    const project = await Project.findById(requirement.projectId);
    const updates = { ...req.body };

    if (updates.description || updates.title) {
      const desc = formalNormalize(updates.description || requirement.description || '');
      updates.normalizedDescription = desc;
      updates.description = desc;
      updates.embedding = await embeddingService.generateEmbedding(desc);
      updates.embeddingModel = embeddingService.isRealModelActive() ? 'multilingual-e5-small' : 'deterministic-v1';

      // Revalidate requirement (Priority 3)
      const valResult = await validationAgent.validateRequirement({
        ...requirement.toObject(),
        ...updates
      }, project);

      updates.validationStatus = valResult.validationStatus;
      updates.validationIssues = valResult.issues;
      updates.contextRelevance = valResult.contextRelevance;
      updates.validationDimensions = valResult.validationDimensions;
      updates.suggestedImprovement = valResult.suggestedImprovement;
    }

    const updated = await Requirement.findByIdAndUpdate(requirement._id, updates, { new: true });
    try { await ragService.indexProjectKnowledge(requirement.projectId); } catch (e) {}

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

    // Clean up related issues
    await RequirementIssue.deleteMany({
      projectId: requirement.projectId,
      relatedRequirementIds: requirement.requirementId
    });

    try { await ragService.indexProjectKnowledge(requirement.projectId); } catch (error) {}
    res.json({ success: true, message: 'Requirement removed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.archiveRequirement = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    requirement.archived = !requirement.archived;
    await requirement.save();

    res.json({ success: true, data: requirement, message: requirement.archived ? 'Requirement archived' : 'Requirement restored' });
  } catch (error) {
    next(error);
  }
};

exports.revalidateRequirement = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    const project = await Project.findById(requirement.projectId);
    const valResult = await validationAgent.validateRequirement(requirement, project);

    requirement.validationStatus = valResult.validationStatus;
    requirement.validationIssues = valResult.issues;
    requirement.contextRelevance = valResult.contextRelevance;
    requirement.validationDimensions = valResult.validationDimensions;
    requirement.suggestedImprovement = valResult.suggestedImprovement;
    await requirement.save();

    res.json({ success: true, data: requirement });
  } catch (error) {
    next(error);
  }
};

/**
 * AI Atomic Extraction Preview (Priority 6)
 */
exports.extractFromText = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { text, previewOnly = true } = req.body;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

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

    // If previewOnly is requested (default), return candidate list with temporary IDs without saving
    if (previewOnly) {
      const candidates = analysis.requirements.map((r, idx) => ({
        tempId: `PREVIEW-${idx + 1}`,
        title: r.title,
        description: r.normalizedDescription,
        normalizedDescription: r.normalizedDescription,
        type: r.type,
        nfrSubcategory: r.nfrSubcategory,
        category: r.category,
        priority: r.priority,
        contextRelevance: r.contextRelevance,
        validationDimensions: r.validationDimensions,
        source: 'AI_ATOMIC_EXTRACTION',
        rawSourceText: text,
        selected: true
      }));

      return res.status(200).json({
        success: true,
        preview: true,
        count: candidates.length,
        data: candidates,
        informationQuality: analysis.informationQuality,
        clarificationQuestion: analysis.clarificationQuestion
      });
    }

    // Auto-save path if explicitly requested
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

/**
 * Batch Create Confirmed Requirements from Preview (Priority 6)
 */
exports.batchCreate = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const { requirements: candidateList } = req.body;
    if (!Array.isArray(candidateList) || candidateList.length === 0) {
      return res.status(400).json({ success: false, message: 'No requirements provided to save' });
    }

    const savedDocs = [];
    for (const item of candidateList) {
      const reqType = item.type || 'FUNCTIONAL';
      const prefix = TYPE_PREFIX[reqType] || 'FR';
      const count = await Requirement.countDocuments({ projectId, type: reqType });
      const reqId = `${prefix}-${String(count + 1).padStart(3, '0')}`;

      const normalizedDescription = formalNormalize(item.description || item.title || '');
      const embedding = await embeddingService.generateEmbedding(normalizedDescription);
      const embeddingModel = embeddingService.isRealModelActive() ? 'multilingual-e5-small' : 'deterministic-v1';

      const contextRelevance = await assessProjectRelevance({
        title: item.title, normalizedDescription, type: reqType, category: item.category
      }, project);

      const doc = await Requirement.create({
        projectId,
        requirementId: reqId,
        title: item.title,
        source: item.source || 'AI_ATOMIC_EXTRACTION',
        originalText: item.rawSourceText || '',
        rawSourceText: item.rawSourceText || '',
        sourceLanguage: 'English',
        sourceInterviewStage: 'AI Batch Extraction',
        normalizedDescription,
        description: normalizedDescription,
        type: reqType,
        nfrSubcategory: item.nfrSubcategory || (reqType === 'NON_FUNCTIONAL' ? 'PERFORMANCE' : 'N/A'),
        category: item.category || (reqType === 'FUNCTIONAL' ? 'Core Features' : `${prefix} Specifications`),
        priority: item.priority || 'MEDIUM',
        completenessScore: 88,
        isAtomic: true,
        confidence: 0.9,
        status: 'PROPOSED',
        validationStatus: contextRelevance.status === 'CONTEXT_MISMATCH' ? 'NEEDS_REVIEW' : 'VALID',
        contextRelevance,
        embedding,
        embeddingModel
      });

      savedDocs.push(doc);
    }

    try { await ragService.indexProjectKnowledge(projectId); } catch (e) {}
    try { await pipeline.analyzeCatalog(projectId); } catch (e) {}

    res.status(201).json({
      success: true,
      count: savedDocs.length,
      data: savedDocs,
      message: `Successfully created ${savedDocs.length} requirements.`
    });
  } catch (error) {
    next(error);
  }
};
