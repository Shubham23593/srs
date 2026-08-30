/**
 * ============================================================================
 * AUTHORITATIVE REQUIREMENTS ENGINEERING PIPELINE (single production path)
 * ============================================================================
 *
 *   RAW INPUT
 *     -> Input Validation
 *     -> Context / Project-Scope Guard
 *     -> Language Detection
 *     -> Semantic Understanding & Intent Extraction (LLM if available, else
 *        the deterministic multilingual semantic engine)
 *     -> Atomic Requirement Decomposition
 *     -> Classification
 *     -> Formal Language Normalization
 *     -> Quality Analysis (atomicity, clarity, completeness, testability...)
 *     -> Semantic Duplicate Detection
 *     -> Rule-Conflict Detection
 *     -> Ambiguity Detection + Clarification Management
 *     -> Validated Requirement Catalog (normalized requirements only)
 *     -> Semantic Topic Clustering (embeddings + K-Means)
 *     -> SRS Section Mapping (deterministic + cosine)
 *     -> Section-wise SRS Generation (normalized requirements only)
 *     -> Final Language Guard
 *     -> Quality Audit
 *
 * There is NO path from raw interview text directly to a requirement or the
 * SRS. The raw text is retained only as `rawSourceText` evidence.
 */

const Requirement = require('../../models/Requirement');
const RequirementIssue = require('../../models/RequirementIssue');
const SRS = require('../../models/SRS');

const { detectLanguage } = require('./languageDetector');
const { assessRelevance } = require('./contextGuard');
const { extractAtomicRequirements, formalNormalize } = require('./semanticEngine');
const { analyzeRequirementSet } = require('./qualityEngine');
const { clusterRequirements } = require('./topicClusterer');
const { mapRequirementsToSections, SRS_SECTIONS } = require('./sectionMapper');
const { assembleSRS, auditSrsLanguage } = require('./srsAssembler');
const { auditSRS } = require('./qualityAudit');
const embeddingService = require('../EmbeddingService');
const { getAIProvider } = require('../index');

const TYPE_PREFIX = {
  FUNCTIONAL: 'FR',
  NON_FUNCTIONAL: 'NFR',
  CONSTRAINT: 'CON',
  ASSUMPTION: 'ASM',
  DEPENDENCY: 'DEP',
  INTERFACE: 'INT',
  STAKEHOLDER: 'STK',
  BUSINESS_RULE: 'BR'
};

class RequirementsPipeline {
  /**
   * Process ONE raw interview answer through the full analysis pipeline.
   * Does NOT persist anything itself — returns a structured analysis result.
   * Persistence is done by the caller (interview/requirement controllers) via
   * persistRequirements() so there is one write path.
   */
  async analyzeAnswer({ rawText, project, sectionConfig, existingRequirements = [] }) {
    const rawSourceText = String(rawText || '').trim();

    // ---- PHASE 1: Input validation ----
    if (!rawSourceText) {
      return {
        valid: false,
        category: 'INVALID',
        rawSourceText: '',
        language: { language: 'Unknown' },
        relevance: { relevant: false, reason: 'EMPTY' },
        requirements: [],
        ignoredClauses: [],
        informationQuality: emptyQuality(),
        clarificationQuestion: null,
        message: 'Please provide an answer so I can extract requirements.'
      };
    }

    // ---- PHASE 3: Language detection ----
    const language = detectLanguage(rawSourceText);

    // ---- PHASE 2: Context / project-scope guard ----
    const relevance = await assessRelevance({ rawText: rawSourceText, project, sectionConfig });
    if (!relevance.relevant) {
      return {
        valid: false,
        category: relevance.category || 'OUT_OF_SCOPE',
        rawSourceText,
        language,
        relevance,
        requirements: [],
        ignoredClauses: [{ clause: rawSourceText, reason: relevance.reason }],
        informationQuality: { ...emptyQuality(), outOfScopeInputs: [rawSourceText], invalidDefective: relevance.reason === 'EMPTY' ? 1 : 0 },
        clarificationQuestion: null,
        isOutOfScope: true,
        message: relevance.message
      };
    }

    // ---- PHASES 4-8: Semantic understanding -> atomic decomposition ->
    //                 classification -> normalization (LLM first, engine fallback)
    let extracted = await this._llmExtract(rawSourceText, project, sectionConfig);
    let engineUsed = false;
    if (!extracted || extracted.requirements.length === 0) {
      const engineResult = extractAtomicRequirements(rawSourceText, sectionConfig);
      extracted = engineResult;
      engineUsed = true;
    }

    // ---- PHASE 7: Formal normalization (never let raw text through) ----
    const requirements = extracted.requirements.map((r) => {
      const normalizedDescription = formalNormalize(r.normalizedDescription || r.description || '');
      return {
        title: r.title,
        rawSourceText,
        sourceLanguage: language.language,
        sourceInterviewStage: sectionConfig?.name || '',
        normalizedDescription,
        // Legacy alias always points to normalized statement
        description: normalizedDescription,
        type: r.type || 'FUNCTIONAL',
        nfrSubcategory: r.nfrSubcategory || (r.type === 'NON_FUNCTIONAL' ? r.nfrSubcategory || 'PERFORMANCE' : 'N/A'),
        category: r.category || r.topicCluster || sectionConfig?.name || 'Core Features',
        topicCluster: r.topicCluster || r.category || '',
        priority: ['HIGH', 'MEDIUM', 'LOW'].includes(r.priority) ? r.priority : 'MEDIUM',
        status: r.status || 'PROPOSED',
        ambiguityFlags: r.ambiguityFlags || [],
        clarificationQuestion: r.clarificationQuestion || '',
        qualityFlags: r.qualityFlags || [],
        duplicateCandidates: [],
        conflictReferences: [],
        isAtomic: r.isAtomic !== false,
        confidence: r.confidence || (engineUsed ? 0.78 : 0.9),
        validationStatus: r.status === 'NEEDS_CLARIFICATION' ? 'NEEDS_CLARIFICATION' : 'VALID'
      };
    }).filter((r) => r.normalizedDescription && r.title);

    // ---- PHASE 9: per-requirement quality (ambiguity, testability, grammar)
    // Quality scoring runs on the new requirements only.
    const { scoreQuality } = require('./qualityEngine');
    for (const req of requirements) {
      const { scores, flags, vagueTerms } = scoreQuality({
        normalizedDescription: req.normalizedDescription,
        isAtomic: req.isAtomic,
        status: req.status,
        requirementId: 'NEW'
      });
      req.qualityScores = scores;
      req.qualityFlags = Array.from(new Set([...(req.qualityFlags || []), ...flags]));
      if (vagueTerms.length) {
        req.ambiguityFlags = Array.from(new Set([...(req.ambiguityFlags || []), ...vagueTerms.map((v) => `VAGUE_TERM:${v}`)]));
      }
    }

    // Generate embeddings ONCE for each new requirement (batch) and reuse them
    // for duplicate detection, conflict detection and later persistence.
    if (requirements.length) {
      const vecs = await embeddingService.generateEmbeddings(
        requirements.map((r) => r.normalizedDescription)
      );
      requirements.forEach((r, i) => { r.embedding = vecs[i]; });
    }

    // ---- PHASES 11-12: duplicate & conflict detection -------------------
    // Only NEW-vs-CATALOG comparisons count (new requirements extracted from
    // the SAME answer must not be flagged as duplicates of one another).
    const catalog = existingRequirements.map((r) => {
      const o = r.toObject ? r.toObject() : r;
      return { ...o, normalizedDescription: o.normalizedDescription || o.description };
    });
    const newSet = requirements.map((r) => ({ ...r, requirementId: 'NEW', rawSourceText }));
    const workingSet = [...catalog, ...newSet];
    const { issues } = await analyzeRequirementSet(workingSet);

    // Map catalog-duplicate/conflict results back onto the NEW requirements.
    for (let i = 0; i < requirements.length; i++) {
      const req = requirements[i];
      const analyzed = workingSet[catalog.length + i];
      const dupOfCatalog = (analyzed.duplicateCandidates || []).filter((id) => id !== 'NEW');
      const conflictWithCatalog = (analyzed.conflictReferences || []).filter((id) => id !== 'NEW');
      req.duplicateCandidates = dupOfCatalog;
      req.conflictReferences = conflictWithCatalog;
      if (dupOfCatalog.length && req.status === 'PROPOSED') req.status = 'NEEDS_REVIEW';
      if (conflictWithCatalog.length && req.status === 'PROPOSED') req.status = 'NEEDS_REVIEW';
    }

    // Only surface issues that reference a NEW requirement (i.e. matter here)
    const relevantIssues = issues.filter((iss) => {
      const ids = iss.relatedRequirementIds || [];
      // catalog-only issues (both ids real) are reported during catalog analysis
      return ids.includes('NEW') || ids.some((id) => id === 'NEW');
    });

    // ---- PHASE 13: Information quality result ----
    const informationQuality = buildQualityReport(requirements, relevantIssues, extracted.ignoredClauses || [], rawSourceText);

    // One focused clarification question (Phase 10)
    const clarificationQuestion = requirements
      .map((r) => r.clarificationQuestion)
      .find((q) => q && q.trim()) || null;

    return {
      valid: requirements.length > 0,
      category: 'RELEVANT',
      rawSourceText,
      language,
      relevance,
      requirements,
      ignoredClauses: extracted.ignoredClauses || [],
      issues: relevantIssues,
      allCatalogIssues: issues,
      informationQuality,
      clarificationQuestion,
      isOutOfScope: false,
      engineUsed,
      message: requirements.length
        ? `Extracted ${requirements.length} atomic requirement(s).`
        : 'The answer is relevant but no clear atomic requirement could be extracted. Could you describe a specific capability the system should provide?'
    };
  }

  /**
   * Attempt LLM-based extraction. Returns null on any failure so the
   * deterministic engine can take over. The LLM is constrained by a strict
   * schema and zero-hallucination instructions.
   */
  async _llmExtract(rawText, project, sectionConfig) {
    try {
      const ai = getAIProvider();
      if (!ai || !(await ai.isHealthy())) return null;

      const prompt = buildLlmExtractionPrompt(rawText, project, sectionConfig);
      const result = await ai.generateStructuredJSON(prompt);
      if (!result || !Array.isArray(result.requirements) || result.requirements.length === 0) return null;

      return {
        requirements: result.requirements.map((r) => ({
          title: r.title,
          normalizedDescription: r.normalizedDescription || r.description,
          type: (r.type || 'FUNCTIONAL').toUpperCase(),
          nfrSubcategory: (r.nfrSubcategory || 'N/A').toUpperCase(),
          category: r.category,
          topicCluster: r.topicCluster,
          priority: (r.priority || 'MEDIUM').toUpperCase(),
          status: r.needsClarification ? 'NEEDS_CLARIFICATION' : 'PROPOSED',
          ambiguityFlags: r.ambiguityFlags || (r.needsClarification ? ['LLM_FLAGGED_AMBIGUITY'] : []),
          clarificationQuestion: r.clarificationQuestion || '',
          qualityFlags: r.needsClarification ? ['NEEDS_CLARIFICATION'] : [],
          confidence: r.confidence || 0.9
        })).filter((r) => r.title && r.normalizedDescription),
        ignoredClauses: []
      };
    } catch (e) {
      console.warn('[RequirementsPipeline] LLM extraction unavailable, using semantic engine:', e.message);
      return null;
    }
  }

  /**
   * Persist analyzed requirements to the catalog (the ONLY write path for
   * requirements). Assigns stable IDs and embeddings. Idempotent: skips
   * semantic duplicates of existing catalog entries.
   */
  async persistRequirements(projectId, analysis, { sourceMessageId = null } = {}) {
    const existing = await Requirement.find({ projectId });
    const saved = [];
    const skippedDuplicates = [];

    // Counters per type for ID assignment
    const counters = {};
    for (const t of Object.keys(TYPE_PREFIX)) counters[t] = existing.filter((r) => r.type === t).length;

    for (const req of analysis.requirements) {
      // Hard duplicate guard against the persisted catalog (embedding cosine)
      const dup = await this._findPersistedDuplicate(req, existing, saved);
      if (dup) {
        skippedDuplicates.push({ title: req.title, duplicateOf: dup.requirementId });
        continue;
      }

      const type = TYPE_PREFIX[req.type] ? req.type : 'FUNCTIONAL';
      counters[type] = (counters[type] || 0) + 1;
      const requirementId = `${TYPE_PREFIX[type]}-${String(counters[type]).padStart(3, '0')}`;

      // Reuse the embedding already produced during analysis (never recompute).
      let embedding = req.embedding;
      if (!embedding || embedding.length === 0) {
        embedding = await embeddingService.generateEmbedding(req.normalizedDescription);
      }
      const embeddingModel = embeddingService.isRealModelActive() ? 'multilingual-e5-small' : 'deterministic-v1';

      const doc = await Requirement.create({
        projectId,
        requirementId,
        title: req.title,
        rawSourceText: analysis.rawSourceText,
        sourceLanguage: analysis.language?.language || 'English',
        sourceMessageId,
        sourceInterviewStage: req.sourceInterviewStage || '',
        normalizedDescription: req.normalizedDescription,
        description: req.normalizedDescription,
        type,
        nfrSubcategory: req.nfrSubcategory || 'N/A',
        category: req.category,
        topicCluster: req.topicCluster || '',
        priority: req.priority,
        status: req.status || 'PROPOSED',
        validationStatus: req.status === 'NEEDS_CLARIFICATION' ? 'NEEDS_CLARIFICATION' : 'VALID',
        ambiguityFlags: req.ambiguityFlags || [],
        clarificationQuestion: req.clarificationQuestion || '',
        qualityFlags: req.qualityFlags || [],
        duplicateCandidates: req.duplicateCandidates || [],
        conflictReferences: req.conflictReferences || [],
        qualityScores: req.qualityScores || undefined,
        isAtomic: req.isAtomic !== false,
        confidence: req.confidence || 0.85,
        completenessScore: req.qualityScores ? Math.round(
          (req.qualityScores.atomicity + req.qualityScores.clarity + req.qualityScores.completeness +
            req.qualityScores.testability + req.qualityScores.unambiguity) / 5) : 80,
        embedding,
        embeddingModel
      });
      saved.push(doc);
    }

    return { saved, skippedDuplicates };
  }

  async _findPersistedDuplicate(req, existing, justSaved) {
    // Reuse the analysis embedding for the new requirement.
    let reqEmb = req.embedding;
    if (!reqEmb || reqEmb.length === 0) {
      reqEmb = await embeddingService.generateEmbedding(req.normalizedDescription);
      req.embedding = reqEmb;
    }

    const all = [...existing, ...justSaved];
    // Make sure catalog/saved entries have embeddings (batch, generated once).
    const needEmb = all.filter((e) => !e.embedding || e.embedding.length === 0);
    if (needEmb.length) {
      const vecs = await embeddingService.generateEmbeddings(
        needEmb.map((e) => `${e.normalizedDescription || e.description || ''}`)
      );
      needEmb.forEach((e, i) => { e.embedding = vecs[i]; });
    }

    for (const e of all) {
      const eDesc = (e.normalizedDescription || e.description || '').trim().toLowerCase();
      if (eDesc === req.normalizedDescription.trim().toLowerCase()) {
        return e;
      }
      const sim = embeddingService.cosineSimilarity(reqEmb, e.embedding);
      // Hard SKIP only for near-identical statements (cosine >= 0.96): two
      // answers that normalized to the same English requirement. Anything else
      // — including close paraphrases and cross-lingual duplicates — is
      // preserved and FLAGGED for human review by qualityEngine; the neural
      // model's same-domain crowding (add-expense vs delete-expense ~0.94) must
      // never cause a distinct requirement to be dropped.
      if (sim >= 0.96) return e;
    }
    return null;
  }

  /**
   * Full catalog (re)analysis: cluster + map sections + quality/duplicate/
   * conflict detection. Persists results to requirement docs and issues.
   */
  async analyzeCatalog(projectId) {
    const requirements = await Requirement.find({ projectId });
    for (const r of requirements) {
      r.normalizedDescription = r.normalizedDescription || r.description;
    }

    // Quality / duplicates / conflicts
    const { issues } = await analyzeRequirementSet(requirements);

    // Persist requirement-level analysis
    for (const r of requirements) {
      const update = {
        qualityScores: r.qualityScores,
        qualityFlags: r.qualityFlags,
        ambiguityFlags: r.ambiguityFlags,
        duplicateCandidates: r.duplicateCandidates,
        conflictReferences: r.conflictReferences,
        completenessScore: r.completenessScore
      };
      await Requirement.findByIdAndUpdate(r._id, update);
    }

    // Persist issues
    await RequirementIssue.deleteMany({ projectId, status: 'OPEN' });
    const savedIssues = [];
    for (const iss of issues) {
      savedIssues.push(await RequirementIssue.create({ projectId, ...iss }));
    }

    return { requirements, issues: savedIssues };
  }

  /**
   * PHASES 15-19: Generate the SRS from the validated catalog.
   * cluster -> map sections -> assemble section-wise -> language guard -> audit
   */
  async generateSRS(project) {
    const projectId = project._id;

    // Only catalog requirements feed the SRS — never raw text.
    let requirements = await Requirement.find({ projectId });
    for (const r of requirements) {
      r.normalizedDescription = r.normalizedDescription || r.description;
    }

    // Run catalog analysis first (clusters/mapping need up-to-date data)
    const { issues } = await this.analyzeCatalog(projectId);
    requirements = await Requirement.find({ projectId });
    for (const r of requirements) {
      r.normalizedDescription = r.normalizedDescription || r.description;
    }

    // Phase 15: semantic topic clustering
    const { clusters } = await clusterRequirements(requirements);

    // Phase 16: deterministic section mapping
    await mapRequirementsToSections(requirements);

    // Persist cluster + section mapping
    for (const r of requirements) {
      await Requirement.findByIdAndUpdate(r._id, {
        topicCluster: r.topicCluster,
        targetSrsSection: r.targetSrsSection,
        targetSrsSectionName: r.targetSrsSectionName,
        mappedToSrs: true
      });
    }

    // Phase 17: section-wise assembly (normalized requirements only)
    const srsData = assembleSRS(project, requirements, issues, clusters);

    // Phase 18: final language guard
    const languageAudit = auditSrsLanguage(srsData);
    if (!languageAudit.passed) {
      throw new Error('Final language guard failed: non-English content detected in SRS: ' +
        languageAudit.violations.map((v) => v.path).join(', '));
    }

    // Phase 19: quality audit
    const rawSourceTexts = requirements.map((r) => r.rawSourceText).filter(Boolean);
    const audit = auditSRS({ srs: srsData, requirements, rawSourceTexts });
    srsData.auditReport = audit;

    // Persist SRS (upsert)
    let srs = await SRS.findOne({ projectId });
    if (srs) {
      Object.assign(srs, srsData);
      srs.status = 'DRAFT';
      await srs.save();
    } else {
      srs = await SRS.create({ ...srsData, projectId, currentVersion: '1.0', status: 'DRAFT' });
    }

    return { srs, audit, clusters, issues, languageAudit };
  }
}

function buildLlmExtractionPrompt(rawText, project, sectionConfig) {
  return `You are a requirements engineering assistant following ISO/IEC/IEEE 29148.
The user's interview answer may be in English, Hindi, Marathi, Hinglish, or mixed languages.
Understand the SEMANTIC MEANING. Do NOT copy the raw sentence. Do NOT invent features the user did not mention (no Google login, OTP, 2FA, biometrics, password reset unless explicitly stated).

Project: ${project.projectName}
Scope: ${project.scope || project.description || ''}
Current interview section: ${sectionConfig?.name} — ${sectionConfig?.description || ''}
User answer (raw, possibly non-English):
"""
${rawText}
"""

Return ONLY JSON:
{
  "requirements": [
    {
      "title": "short atomic capability title in English",
      "normalizedDescription": "formal English statement starting with 'The system shall ...'",
      "type": "FUNCTIONAL|NON_FUNCTIONAL|CONSTRAINT|ASSUMPTION|DEPENDENCY|INTERFACE|STAKEHOLDER|BUSINESS_RULE",
      "nfrSubcategory": "PERFORMANCE|SECURITY|USABILITY|AVAILABILITY|SCALABILITY|RELIABILITY|N/A",
      "category": "short topic",
      "priority": "HIGH|MEDIUM|LOW",
      "needsClarification": boolean,
      "ambiguityFlags": [],
      "clarificationQuestion": "exactly one focused question if needsClarification is true, else empty string",
      "confidence": 0.0
    }
  ]
}
Rules:
- Split multiple distinct capabilities into separate atomic requirements.
- Normalize ALL output to professional English regardless of input language.
- Vague statements like "fast" or "secure" must be normalized to a generic formal requirement, flagged needsClarification=true, and MUST NOT invent metrics.
- If the answer is unrelated to the project/section, return {"requirements": []}.`;
}

function emptyQuality() {
  return {
    validSpecifications: 0,
    ambiguities: 0,
    duplicatesDetected: 0,
    ruleConflicts: 0,
    openIssues: 0,
    invalidDefective: 0,
    needsReview: 0,
    outOfScopeInputs: []
  };
}

function buildQualityReport(requirements, issues, ignoredClauses, rawText) {
  const q = emptyQuality();
  q.validSpecifications = requirements.length;
  q.ambiguities = requirements.filter((r) => r.status === 'NEEDS_CLARIFICATION' || (r.ambiguityFlags || []).length).length;
  q.duplicatesDetected = issues.filter((i) => i.issueType === 'DUPLICATE').length;
  q.ruleConflicts = issues.filter((i) => i.issueType === 'RULE_CONFLICT' || i.issueType === 'CONFLICT').length;
  q.needsReview = requirements.filter((r) => (r.duplicateCandidates || []).length || r.status === 'NEEDS_REVIEW').length;
  q.openIssues = issues.length;
  q.invalidDefective = ignoredClauses.filter((c) => c.reason === 'NO_CAPABILITY_RECOGNIZED').length;
  q.outOfScopeInputs = [];
  return q;
}

module.exports = new RequirementsPipeline();
module.exports.SRS_SECTIONS = SRS_SECTIONS;
