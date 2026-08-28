const Requirement = require('../models/Requirement');
const Project = require('../models/Project');
const requirementExtractionAgent = require('../ai/agents/RequirementExtractionAgent');
const embeddingService = require('../ai/EmbeddingService');
const ragService = require('../services/ragService');
const requirementMergeService = require('../services/requirementMergeService');
const srsSyncService = require('../services/srsSyncService');
const { normalizeRequirementStatement } = require('../services/requirementGrammarValidator');

exports.getRequirements = async (req, res, next) => {
  try {
    const { type, status, category, includeDeprecated } = req.query;
    const filter = { projectId: req.params.id };

    if (type) filter.type = type;
    if (status) {
      filter.status = status;
    } else if (includeDeprecated !== 'true') {
      filter.status = { $ne: 'DEPRECATED' };
    }
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

    const reqType = type || 'FUNCTIONAL';
    let prefix = 'FR';
    if (reqType === 'NON_FUNCTIONAL') prefix = 'NFR';
    else if (reqType === 'CONSTRAINT') prefix = 'CON';
    else if (reqType === 'ASSUMPTION') prefix = 'ASM';
    else if (reqType === 'INTERFACE') prefix = 'INT';
    else if (reqType === 'STAKEHOLDER') prefix = 'STK';

    // Find all existing requirement IDs with this prefix to calculate next numeric ID
    const existingReqs = await Requirement.find({ projectId, requirementId: new RegExp(`^${prefix}-\\d+`) }).select('requirementId');
    let maxNum = 0;
    existingReqs.forEach(r => {
      const match = r.requirementId.match(new RegExp(`^${prefix}-(\\d+)`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const reqId = req.body.requirementId || `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
    const normalizedDesc = normalizeRequirementStatement(description);

    let embedding = [];
    try {
      embedding = await embeddingService.generateEmbedding(`${title}: ${normalizedDesc}`);
    } catch (e) {}

    const requirement = await Requirement.create({
      projectId,
      requirementId: reqId,
      title,
      description: normalizedDesc,
      type: reqType,
      nfrSubcategory: nfrSubcategory || (reqType === 'NON_FUNCTIONAL' ? 'PERFORMANCE' : 'N/A'),
      category: category || (reqType === 'FUNCTIONAL' ? 'Core Features' : `${prefix} Specifications`),
      priority: priority || 'MEDIUM',
      sourceText: sourceText || 'Manual user input',
      completenessScore: 90,
      isAtomic: true,
      confidence: 1.0,
      status: 'APPROVED',
      validationStatus: 'VALID',
      embedding
    });

    // Auto-sync SRS, Traceability, and RAG
    await srsSyncService.syncProjectSRS(projectId, `Added requirement ${reqId}: ${title}`);

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

    if (req.body.description) {
      req.body.description = normalizeRequirementStatement(req.body.description);
    }

    if (req.body.title || req.body.description) {
      const title = req.body.title || requirement.title;
      const desc = req.body.description || requirement.description;
      req.body.embedding = await embeddingService.generateEmbedding(`${title}: ${desc}`);
    }

    const updated = await Requirement.findByIdAndUpdate(requirement._id, req.body, { new: true });
    
    // Auto-sync SRS, Traceability, and RAG
    await srsSyncService.syncProjectSRS(requirement.projectId, `Updated requirement ${requirement.requirementId}`);

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
    
    // Auto-sync SRS, Traceability, and RAG
    await srsSyncService.syncProjectSRS(requirement.projectId, `Removed requirement ${requirement.requirementId}`);

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

    const count = await Requirement.countDocuments({ projectId });
    const extractedList = await requirementExtractionAgent.extractRequirements(text, project, count + 1);

    const saved = [];
    for (const item of extractedList) {
      const normalizedDesc = normalizeRequirementStatement(item.description);
      const emb = await embeddingService.generateEmbedding(`${item.title}: ${normalizedDesc}`);
      const r = await Requirement.create({
        ...item,
        description: normalizedDesc,
        projectId,
        embedding: emb
      });
      saved.push(r);
    }

    // Auto-sync SRS, Traceability, and RAG
    await srsSyncService.syncProjectSRS(projectId, `Extracted ${saved.length} requirements via AI`);

    res.status(201).json({ success: true, count: saved.length, data: saved });
  } catch (error) {
    next(error);
  }
};

exports.mergeRequirements = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { primaryRequirementId, secondaryRequirementId, issueId, resolutionNotes } = req.body;

    const result = await requirementMergeService.mergeRequirements({
      projectId,
      primaryRequirementId,
      secondaryRequirementId,
      issueId,
      resolutionNotes
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
