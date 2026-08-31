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
const { assessProjectRelevance, isNonInterfaceInfrastructure, isIntegrationGrounded, isGenericInfrastructure } = require('./contextRelevanceEngine');
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

/**
 * Authoritative stage-to-type binding.
 * The current interview stage OWNS the information type for non-entity stages.
 * LLM output is UNTRUSTED; the stage gate is the final authority.
 *
 * Returns the canonical Requirement `type` string that a requirement extracted
 * in this stage MUST have. Returns null for entity stages (Stages 1-3, Review)
 * where no Requirement documents are produced at all.
 */
function stageCanonicalType(stageId) {
  const map = {
    FUNCTIONAL_REQUIREMENTS:    'FUNCTIONAL',
    NON_FUNCTIONAL_REQUIREMENTS:'NON_FUNCTIONAL',
    CONSTRAINTS:                'CONSTRAINT',
    ASSUMPTIONS_AND_DEPENDENCIES: null, // multi-type: ASSUMPTION or DEPENDENCY (decided by content)
    EXTERNAL_INTERFACES:        'INTERFACE',
    // Entity stages: no Requirement documents produced.
    PROJECT_INFORMATION:        null,
    STAKEHOLDERS_AND_USERS:     null,
    USER_ROLES_AND_PERMISSIONS: null,
    REVIEW_AND_CONFIRMATION:    null
  };
  return Object.prototype.hasOwnProperty.call(map, stageId) ? map[stageId] : null;
}

/**
 * Re-bind the type to what is valid for this stage.
 * This is the HARD POST-LLM CLASSIFICATION GUARD.
 *
 * MANDATE (NO EXCEPTIONS):
 *   - NEVER return an arbitrary type as a fallback for unknown information.
 *   - NEVER default to FUNCTIONAL, DEPENDENCY, or any other type.
 *   - Unknown / undeterminable type → return null (UNCLASSIFIED).
 *   - The caller (analyzeAnswer) must handle null by marking the item as
 *     UNCLASSIFIED; persistRequirements must reject UNCLASSIFIED items.
 *
 * Decision matrix:
 *   Stage has fixed canonical type + deterministic type agrees → canonical
 *   Stage has fixed canonical type + LLM type agrees → canonical
 *   Stage has fixed canonical type + type unknown → canonical (stage wins)
 *   ASSUMPTIONS_AND_DEPENDENCIES + ASSUMPTION or DEPENDENCY → that type
 *   ASSUMPTIONS_AND_DEPENDENCIES + type unknown or wrong → null (UNCLASSIFIED)
 *   Entity stage (PROJECT_INFORMATION etc.) → null (no Requirement produced)
 *   Unknown stage + type missing → null (UNCLASSIFIED)
 */
function enforceStageType(llmType, stageId, deterministicType) {
  const VALID_TYPES = new Set(Object.keys(TYPE_PREFIX));

  // Normalise input types — treat empty / invalid strings as absent.
  const rawLlm = String(llmType || '').toUpperCase().trim();
  const trustedLlm = VALID_TYPES.has(rawLlm) ? rawLlm : null;

  const rawDet = String(deterministicType || '').toUpperCase().trim();
  const trustedDet = VALID_TYPES.has(rawDet) ? rawDet : null;

  // Stages with a single fixed canonical type.
  const canonical = stageCanonicalType(stageId);
  if (canonical !== null) {
    // The canonical type is absolute for this stage — LLM and deterministic
    // engine type hints are advisory only.
    return canonical;
  }

  // Multi-type stage: ASSUMPTIONS_AND_DEPENDENCIES.
  // Only ASSUMPTION and DEPENDENCY are valid here. Anything else → UNCLASSIFIED.
  if (stageId === 'ASSUMPTIONS_AND_DEPENDENCIES') {
    const ALLOWED = new Set(['ASSUMPTION', 'DEPENDENCY']);
    // Deterministic engine has higher authority than LLM here.
    if (trustedDet && ALLOWED.has(trustedDet)) return trustedDet;
    if (trustedLlm && ALLOWED.has(trustedLlm)) return trustedLlm;
    // Both are absent or invalid → UNCLASSIFIED. NEVER default to DEPENDENCY.
    return null;
  }

  // Entity stages (PROJECT_INFORMATION, STAKEHOLDERS_AND_USERS,
  // USER_ROLES_AND_PERMISSIONS, REVIEW_AND_CONFIRMATION): canonical returns null,
  // but we reach here when stageId is unknown. Return null in all cases.
  // Unknown / unrecognised stage → UNCLASSIFIED.
  return null;
}

class RequirementsPipeline {
  /**
   * Process ONE raw interview answer through the full analysis pipeline.
   * Does NOT persist anything itself — returns a structured analysis result.
   * Persistence is done by the caller (interview/requirement controllers) via
   * persistRequirements() so there is one write path.
   */
  async analyzeAnswer({ rawText, project, sectionConfig, currentQuestion = '', conversationHistory = [], existingRequirements = [] }) {
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

    // ---- PHASE 2: Context / project-scope guard (AI/LLM-based Semantic Validation) ----
    const relevance = await assessRelevance({
      rawText: rawSourceText,
      project,
      sectionConfig,
      currentQuestion,
      conversationHistory
    });

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
    //                 classification -> normalization
    let extracted = null;
    let engineUsed = false;
    let aiProviderFailed = false;

    // For entity stages (1: PROJECT_INFORMATION, 2: STAKEHOLDERS_AND_USERS, 3: USER_ROLES_AND_PERMISSIONS),
    // ISO 29148 dictates that we extract structured entity KNOWLEDGE, NOT requirement candidates.
    const isEntityStage = ['PROJECT_INFORMATION', 'STAKEHOLDERS_AND_USERS', 'USER_ROLES_AND_PERMISSIONS'].includes(sectionConfig?.id);

    if (isEntityStage) {
      extracted = extractAtomicRequirements(rawSourceText, sectionConfig, project);
      engineUsed = true;
    } else {
      // For requirement stages (4-8), try LLM extraction first if AI is healthy
      const ai = getAIProvider();
      if (ai && (await ai.isHealthy())) {
        const llmResult = await this._llmExtract(rawSourceText, project, sectionConfig);
        if (llmResult && llmResult.providerFailed) {
          aiProviderFailed = true;
        } else if (llmResult && llmResult.requirements.length > 0) {
          extracted = llmResult;
          const engineResult = extractAtomicRequirements(rawSourceText, sectionConfig, project);
          extracted.entities = { ...(engineResult.entities || {}), ...(llmResult.entities || {}) };
          engineUsed = false;
        }
      }

      if (!extracted || extracted.requirements.length === 0) {
        const engineResult = extractAtomicRequirements(rawSourceText, sectionConfig, project);
        extracted = engineResult;
        engineUsed = true;
      }
    }

    // ---- PHASE 7: Formal normalization (never let raw text through) ----
    const { assessProjectRelevance, isNonInterfaceInfrastructure, isIntegrationGrounded, isGenericInfrastructure } = require('./contextRelevanceEngine');
    const stageId = sectionConfig?.id || 'UNKNOWN';
    const crossStageCandidates = []; // Items that belong to a different stage — not persisted as Requirements.

    const requirements = await Promise.all((extracted.requirements || []).map(async (r) => {
      const normalizedDescription = formalNormalize(r.normalizedDescription || r.description || '');

      // ---- HARD POST-LLM CLASSIFICATION GUARD ----
      // enforceStageType() returns null when the type cannot be determined
      // without guessing. A null type = UNCLASSIFIED. UNCLASSIFIED items are
      // NEVER persisted as Requirement documents. They are either returned as
      // cross-stage candidates (if they belong to another known stage) or
      // flagged for clarification.
      const resolvedType = enforceStageType(r.type, stageId, r.type);

      // ---- CROSS-STAGE POLICY (OPTION C): ----
      // If we are in FUNCTIONAL_REQUIREMENTS and the deterministic engine found
      // a DEPENDENCY item (e.g. user mentions an external service while describing
      // features), capture it as a cross-stage candidate — project knowledge only.
      // It is NOT persisted as a Requirement document in this stage.
      if (stageId === 'FUNCTIONAL_REQUIREMENTS' && r.type === 'DEPENDENCY') {
        crossStageCandidates.push({
          type: 'DEPENDENCY',
          title: r.title,
          normalizedDescription,
          rawSourceText,
          sourceInterviewStage: 'FUNCTIONAL_REQUIREMENTS',
          crossStagePolicy: 'DEFERRED_TO_ASSUMPTIONS_STAGE',
          note: 'Dependency information found during FR stage. Stored as project knowledge; not persisted as a Requirement document. Will surface in ASSUMPTIONS_AND_DEPENDENCIES stage.'
        });
        // Return a sentinel that will be filtered out of validReqs.
        return null;
      }

      const item = {
        title: r.title,
        source: 'AI_INTERVIEW',
        originalText: rawSourceText,
        rawSourceText,
        sourceLanguage: language.language,
        sourceInterviewStage: sectionConfig?.name || '',
        normalizedDescription,
        description: normalizedDescription,
        // type is null when UNCLASSIFIED — caller must filter these out.
        type: resolvedType,
        classification: resolvedType === null ? 'UNCLASSIFIED' : 'CLASSIFIED',
        nfrSubcategory: resolvedType === 'NON_FUNCTIONAL'
          ? (['PERFORMANCE', 'SECURITY', 'SCALABILITY', 'AVAILABILITY', 'RELIABILITY', 'USABILITY', 'MAINTAINABILITY', 'SAFETY', 'OTHER'].includes(String(r.nfrSubcategory || '').toUpperCase()) ? String(r.nfrSubcategory).toUpperCase() : 'PERFORMANCE')
          : 'N/A',
        category: r.category || r.topicCluster || sectionConfig?.name || 'Core Features',
        topicCluster: r.topicCluster || r.category || '',
        priority: ['HIGH', 'MEDIUM', 'LOW'].includes(r.priority) ? r.priority : 'MEDIUM',
        status: resolvedType === null ? 'NEEDS_CLARIFICATION' : (r.status || 'PROPOSED'),
        ambiguityFlags: resolvedType === null
          ? [...(r.ambiguityFlags || []), 'UNCLASSIFIED_TYPE']
          : (r.ambiguityFlags || []),
        clarificationQuestion: resolvedType === null
          ? (r.clarificationQuestion || 'Could you clarify what type of requirement or constraint this describes?')
          : (r.clarificationQuestion || ''),
        qualityFlags: r.qualityFlags || [],
        duplicateCandidates: [],
        conflictReferences: [],
        isAtomic: r.isAtomic !== false,
        confidence: r.confidence || (engineUsed ? 0.78 : 0.9),
        validationStatus: resolvedType === null ? 'UNCLASSIFIED' : (r.status === 'NEEDS_CLARIFICATION' ? 'NEEDS_CLARIFICATION' : 'VALID')
      };

      // Sync nfrSubcategory after type is locked.
      if (item.type !== 'NON_FUNCTIONAL') {
        item.nfrSubcategory = 'N/A';
      } else if (!['PERFORMANCE', 'SECURITY', 'SCALABILITY', 'AVAILABILITY', 'RELIABILITY', 'USABILITY', 'MAINTAINABILITY', 'SAFETY', 'OTHER'].includes(item.nfrSubcategory)) {
        item.nfrSubcategory = 'PERFORMANCE';
      }

      // Check if requirement is database / framework / cloud infrastructure trying to be an INTERFACE
      const fullReqText = `${item.title} ${normalizedDescription}`;
      if (item.type === 'INTERFACE' || stageId === 'EXTERNAL_INTERFACES') {
        if (isNonInterfaceInfrastructure(fullReqText)) {
          item.type = null;
          item.classification = 'UNCLASSIFIED';
          item.status = 'NEEDS_CLARIFICATION';
          item.ambiguityFlags = [...(item.ambiguityFlags || []), 'INFRASTRUCTURE_NOT_INTERFACE'];
          item.clarificationQuestion = 'Databases, frameworks, and cloud hosting infrastructure represent technical constraints or dependencies, not external API interfaces. Could you clarify which external systems or APIs need to be integrated?';
        } else if (!isIntegrationGrounded(fullReqText, rawSourceText, project)) {
          item.type = null;
          item.classification = 'UNCLASSIFIED';
          item.status = 'NEEDS_CLARIFICATION';
          item.ambiguityFlags = [...(item.ambiguityFlags || []), 'UNSUPPORTED_INTEGRATION_HALLUCINATION'];
          item.clarificationQuestion = 'This external integration was not requested or supported by user context. Could you clarify if this integration is required?';
        }
      }

      if (project) {
        const relevanceResult = await assessProjectRelevance(item, project, rawSourceText);
        item.contextRelevance = relevanceResult;
        if (relevanceResult.status === 'CONTEXT_MISMATCH' && !isGenericInfrastructure(fullReqText)) {
          item.type = null;
          item.classification = 'UNCLASSIFIED';
          item.status = 'OUT_OF_SCOPE';
          item.ambiguityFlags = [...(item.ambiguityFlags || []), 'OUT_OF_SCOPE'];
          item.clarificationQuestion = relevanceResult.reason || 'This requirement appears unrelated to the active project scope.';
        }
      }

      return item;
    }));

    // Remove cross-stage deferred sentinels (null) from the requirements array.
    const classifiedReqs = requirements.filter(Boolean);

    // UNCLASSIFIED items: separate them from valid requirements. They are
    // returned in the analysis for transparency but MUST NOT be persisted.
    const unclassifiedReqs = classifiedReqs.filter((r) => r.classification === 'UNCLASSIFIED');
    const validReqs = classifiedReqs.filter((r) => r.classification === 'CLASSIFIED' && r.normalizedDescription && r.title);


    // ---- PHASE 9: per-requirement quality (ambiguity, testability, grammar)
    const { scoreQuality } = require('./qualityEngine');
    for (const req of validReqs) {
      const { scores, flags, vagueTerms, validationDimensions } = scoreQuality({
        normalizedDescription: req.normalizedDescription,
        isAtomic: req.isAtomic,
        status: req.status,
        requirementId: 'NEW',
        contextRelevance: req.contextRelevance
      });
      req.qualityScores = scores;
      req.validationDimensions = validationDimensions;
      req.qualityFlags = Array.from(new Set([...(req.qualityFlags || []), ...flags]));
      if (vagueTerms.length) {
        req.ambiguityFlags = Array.from(new Set([...(req.ambiguityFlags || []), ...vagueTerms.map((v) => `VAGUE_TERM:${v}`)]));
      }
    }

    // Generate embeddings ONCE for each new requirement (batch) and reuse them
    if (validReqs.length) {
      const vecs = await embeddingService.generateEmbeddings(
        validReqs.map((r) => r.normalizedDescription)
      );
      validReqs.forEach((r, i) => { r.embedding = vecs[i]; });
    }

    // ---- PHASES 11-12: duplicate & conflict detection -------------------
    const catalog = existingRequirements.map((r) => {
      const o = r.toObject ? r.toObject() : r;
      return { ...o, normalizedDescription: o.normalizedDescription || o.description };
    });
    const newSet = validReqs.map((r) => ({ ...r, requirementId: 'NEW', rawSourceText }));
    const workingSet = [...catalog, ...newSet];
    const { issues } = await analyzeRequirementSet(workingSet, project);

    // Map catalog-duplicate/conflict results back onto the NEW requirements.
    for (let i = 0; i < validReqs.length; i++) {
      const req = validReqs[i];
      const analyzed = workingSet[catalog.length + i];
      if (analyzed) {
        const dupOfCatalog = (analyzed.duplicateCandidates || []).filter((id) => id !== 'NEW');
        const conflictWithCatalog = (analyzed.conflictReferences || []).filter((id) => id !== 'NEW');
        req.duplicateCandidates = dupOfCatalog;
        req.conflictReferences = conflictWithCatalog;
        if (dupOfCatalog.length && req.status === 'PROPOSED') req.status = 'NEEDS_REVIEW';
        if (conflictWithCatalog.length && req.status === 'PROPOSED') req.status = 'NEEDS_REVIEW';
      }
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
      valid: true,
      category: 'RELEVANT',
      rawSourceText,
      language,
      relevance,
      requirements: validReqs,
      unclassifiedRequirements: unclassifiedReqs,
      crossStageCandidates,
      entities: extracted.entities || {},
      informationType: extracted.informationType || 'REQUIREMENT_EVIDENCE',
      isRequirementEvidence: extracted.isRequirementEvidence || validReqs.length > 0,
      ignoredClauses: extracted.ignoredClauses || [],
      issues: relevantIssues,
      allCatalogIssues: issues,
      informationQuality,
      clarificationQuestion,
      isOutOfScope: false,
      engineUsed,
      stageId: sectionConfig?.id || '',
      stageName: sectionConfig?.name || '',
      providerStatus: aiProviderFailed ? 'FAILED_DETERMINISTIC_FALLBACK' : (engineUsed ? 'DETERMINISTIC_ENGINE' : 'AI_PROVIDER'),
      message: validReqs.length
        ? `Extracted ${validReqs.length} atomic requirement(s).`
        : (unclassifiedReqs.length
          ? `${unclassifiedReqs.length} item(s) could not be classified — clarification needed.`
          : 'The answer is relevant. Captured project metadata.')
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

      // providerFailed / parseFailed: AI could not produce trustworthy output.
      // Return a special marker so callers know this is an AI FAILURE (fall back
      // to the deterministic engine) — NOT evidence that the user said nothing.
      if (!result || result.providerFailed || result.parseFailed || result.schemaFailed) {
        return { providerFailed: true, requirements: [] };
      }
      if (!Array.isArray(result.requirements) || result.requirements.length === 0) return null;

      return {
        requirements: result.requirements.map((r) => ({
          title: r.title,
          normalizedDescription: r.normalizedDescription || r.description,
          // LLM type is a suggestion; it is UNCLASSIFIED if absent, not FUNCTIONAL.
          // enforceStageType() will make the final determination in analyzeAnswer().
          type: (r.type || 'UNCLASSIFIED').toUpperCase(),
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
  /**
   * Stage-eligibility guard. Requirements may only be created in stages that
   * are permitted to produce them (this prevents stage leakage — e.g. a fake FR
   * during the stakeholder stage). LLM/extraction output is treated as
   * untrusted; the gate is deterministic.
   */
  _isRequirementAllowedInStage(req, analysis) {
    const stage = (req.sourceInterviewStage || analysis.stageName || '').trim().toLowerCase();
    const mapStage = (s) => {
      s = (s || '').toLowerCase();
      if (s.includes('project information')) return 'PROJECT_INFORMATION';
      if (s.includes('stakeholder')) return 'STAKEHOLDERS_AND_USERS';
      if (s.includes('role')) return 'USER_ROLES_AND_PERMISSIONS';
      if (s.includes('functional')) return 'FUNCTIONAL_REQUIREMENTS';
      if (s.includes('non-functional') || s.includes('nonfunctional')) return 'NON_FUNCTIONAL_REQUIREMENTS';
      if (s.includes('interface')) return 'EXTERNAL_INTERFACES';
      if (s.includes('constraint')) return 'CONSTRAINTS';
      if (s.includes('assumption') || s.includes('depend')) return 'ASSUMPTIONS_AND_DEPENDENCIES';
      if (s.includes('review')) return 'REVIEW_AND_CONFIRMATION';
      return 'UNKNOWN';
    };
    const stageId = analysis.stageId || mapStage(stage);

    // Stages that never produce requirements.
    const noRequirementStages = ['PROJECT_INFORMATION', 'STAKEHOLDERS_AND_USERS', 'USER_ROLES_AND_PERMISSIONS', 'REVIEW_AND_CONFIRMATION'];
    if (noRequirementStages.includes(stageId)) return false;

    // Review stage: never create new requirements silently.
    if (stageId === 'REVIEW_AND_CONFIRMATION') return false;

    return true; // requirement-elicitation stages (FR/NFR/Interfaces/Constraints/Assumptions)
  }

  async persistRequirements(projectId, analysis, { sourceMessageId = null } = {}) {
    const Project = require('../../models/Project');
    const project = projectId ? await Project.findById(projectId).lean() : null;
    const existing = await Requirement.find({ projectId });
    const saved = [];
    const skippedDuplicates = [];
    const rejectedByGate = [];
    const rejectedUnclassified = []; // UNCLASSIFIED items never reach the DB.

    // Counters per type for ID assignment
    const counters = {};
    for (const t of Object.keys(TYPE_PREFIX)) counters[t] = existing.filter((r) => r.type === t).length;

    for (const req of analysis.requirements) {
      // ---- HARD GUARD #1: UNCLASSIFIED items are NEVER persisted. ----
      // An UNCLASSIFIED item means enforceStageType() could not determine the
      // type without guessing. Persisting it would be information-type leakage.
      if (!req.type || req.type === 'UNCLASSIFIED' || req.classification === 'UNCLASSIFIED') {
        rejectedUnclassified.push({
          title: req.title || '(untitled)',
          reason: 'UNCLASSIFIED_TYPE — cannot persist without a deterministically verified type',
          ambiguityFlags: req.ambiguityFlags || [],
          clarificationQuestion: req.clarificationQuestion || 'Could you clarify what type of requirement this describes?'
        });
        continue;
      }

      // ---- HARD GUARD #2: Type must be a known valid catalog type. ----
      if (!TYPE_PREFIX[req.type]) {
        rejectedUnclassified.push({
          title: req.title || '(untitled)',
          reason: `INVALID_TYPE '${req.type}' is not a known Requirement type`,
          ambiguityFlags: req.ambiguityFlags || []
        });
        continue;
      }

      // Eligibility gate: never persist a requirement from a non-requirement
      // stage (project info / stakeholders / roles / review).
      if (!this._isRequirementAllowedInStage(req, analysis)) {
        rejectedByGate.push({ title: req.title, reason: `Not a requirement for stage ${analysis.stageId || req.sourceInterviewStage}` });
        continue;
      }

      // Hard check: Databases, frameworks, and cloud hosting infrastructure cannot be saved as INTERFACE
      const fullDocText = `${req.title} ${req.normalizedDescription || req.description}`;
      if (req.type === 'INTERFACE' || analysis.stageId === 'EXTERNAL_INTERFACES') {
        if (isNonInterfaceInfrastructure(fullDocText)) {
          rejectedByGate.push({ title: req.title, reason: 'INFRASTRUCTURE_OR_DATABASE_NOT_AN_INTERFACE — MongoDB, Node.js, and cloud hosting cannot be saved as INTERFACE' });
          continue;
        }
        if (!isIntegrationGrounded(fullDocText, analysis.rawSourceText, project)) {
          rejectedByGate.push({ title: req.title, reason: 'UNSUPPORTED_INTEGRATION_HALLUCINATION — Integration was not requested or supported by user or project context' });
          continue;
        }
      }

      if (req.contextRelevance?.status === 'CONTEXT_MISMATCH') {
        rejectedByGate.push({ title: req.title, reason: 'OUT_OF_SCOPE — Requirement appears unrelated to active project scope' });
        continue;
      }

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
        nfrSubcategory: type === 'NON_FUNCTIONAL'
          ? (['PERFORMANCE', 'SECURITY', 'SCALABILITY', 'AVAILABILITY', 'RELIABILITY', 'USABILITY', 'MAINTAINABILITY', 'SAFETY', 'OTHER'].includes(String(req.nfrSubcategory || '').toUpperCase()) ? String(req.nfrSubcategory).toUpperCase() : 'PERFORMANCE')
          : 'N/A',
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

    return { saved, skippedDuplicates, rejectedByGate, rejectedUnclassified };
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
    const Project = require('../../models/Project');
    const project = await Project.findById(projectId);
    const requirements = await Requirement.find({ projectId, archived: { $ne: true } });
    for (const r of requirements) {
      r.normalizedDescription = r.normalizedDescription || r.description;
    }

    // Quality / duplicates / conflicts with project context relevance
    const { issues } = await analyzeRequirementSet(requirements, project);

    // Persist requirement-level analysis
    for (const r of requirements) {
      const update = {
        contextRelevance: r.contextRelevance,
        validationDimensions: r.validationDimensions,
        qualityScores: r.qualityScores,
        qualityFlags: r.qualityFlags,
        ambiguityFlags: r.ambiguityFlags,
        duplicateCandidates: r.duplicateCandidates,
        conflictReferences: r.conflictReferences,
        completenessScore: r.completenessScore
      };
      await Requirement.findByIdAndUpdate(r._id, update);
    }

    // Load existing resolved / handled issues to preserve user decisions
    const existingIssues = await RequirementIssue.find({ projectId });
    const resolvedSignatures = new Set();
    for (const ex of existingIssues) {
      if (['RESOLVED', 'MERGED', 'KEPT_BOTH', 'IGNORED', 'CLOSED'].includes(ex.status)) {
        const key = `${ex.issueType || ''}_${(ex.relatedRequirementIds || []).slice().sort().join(',')}`;
        resolvedSignatures.add(key);
        if (ex.description) {
          resolvedSignatures.add(ex.description.trim().toLowerCase());
        }
      }
    }

    // Persist issues: delete existing OPEN issues before syncing newly detected ones
    await RequirementIssue.deleteMany({ projectId, status: 'OPEN' });
    for (const iss of issues) {
      const sig1 = `${iss.issueType || ''}_${(iss.relatedRequirementIds || []).slice().sort().join(',')}`;
      const sig2 = (iss.description || '').trim().toLowerCase();
      // If user already resolved this issue, preserve their decision and do not re-open
      if (!resolvedSignatures.has(sig1) && !resolvedSignatures.has(sig2)) {
        await RequirementIssue.create({ projectId, ...iss, status: 'OPEN' });
      }
    }

    // Return complete authoritative issue set from DB (both OPEN and RESOLVED)
    const allIssues = await RequirementIssue.find({ projectId }).sort({ severity: 1, createdAt: -1 });

    return { requirements, issues: allIssues };
  }

  /**
   * PHASES 15-19: Generate the SRS from the validated catalog.
   * cluster -> map sections -> assemble section-wise -> language guard -> audit
   */
  async generateSRS(project, options = {}) {
    const projectId = project._id;

    // Load only catalog requirements for this specific project
    const allCatalogReqs = await Requirement.find({ projectId });
    const includedRequirements = allCatalogReqs.filter((r) => {
      if (!options.includeArchived && r.archived) return false;
      if (!options.includeRejected && r.status === 'REJECTED') return false;
      return true;
    });

    for (const r of includedRequirements) {
      r.normalizedDescription = r.normalizedDescription || r.description;
    }

    // Run catalog analysis first (clusters/mapping need up-to-date data)
    const { issues } = await this.analyzeCatalog(projectId);

    // Phase 15: semantic topic clustering
    const { clusters } = await clusterRequirements(includedRequirements);

    // Phase 16: deterministic section mapping
    await mapRequirementsToSections(includedRequirements);

    // Persist cluster + section mapping
    for (const r of includedRequirements) {
      await Requirement.findByIdAndUpdate(r._id, {
        topicCluster: r.topicCluster,
        targetSrsSection: r.targetSrsSection,
        targetSrsSectionName: r.targetSrsSectionName,
        mappedToSrs: true
      });
    }

    // Phase 17: section-wise assembly (normalized requirements only)
    const srsData = assembleSRS(project, includedRequirements, issues, clusters);

    // Generation summary (Priority 12)
    const generationSummary = {
      project: project.projectName,
      totalRequirementsInCatalog: allCatalogReqs.length,
      requirementsIncluded: includedRequirements.length,
      breakdown: {
        functional: includedRequirements.filter(r => r.type === 'FUNCTIONAL').length,
        nonFunctional: includedRequirements.filter(r => r.type === 'NON_FUNCTIONAL').length,
        constraints: includedRequirements.filter(r => r.type === 'CONSTRAINT').length,
        dependencies: includedRequirements.filter(r => ['DEPENDENCY', 'INTERFACE', 'ASSUMPTION'].includes(r.type)).length
      },
      requirementsExcluded: {
        archived: allCatalogReqs.filter(r => r.archived).length,
        rejected: allCatalogReqs.filter(r => r.status === 'REJECTED').length
      }
    };
    srsData.generationSummary = generationSummary;

    // Phase 18: final language guard
    const languageAudit = auditSrsLanguage(srsData);
    if (!languageAudit.passed) {
      throw new Error('Final language guard failed: non-English content detected in SRS: ' +
        languageAudit.violations.map((v) => v.path).join(', '));
    }

    // Phase 19: quality audit
    const rawSourceTexts = includedRequirements.map((r) => r.rawSourceText).filter(Boolean);
    const audit = auditSRS({ srs: srsData, requirements: includedRequirements, rawSourceTexts });
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

    return { srs, audit, clusters, issues, languageAudit, generationSummary };
  }
}

function buildLlmExtractionPrompt(rawText, project, sectionConfig) {
  const stageId = sectionConfig?.id || '';

  // Per-stage type mandate sent verbatim to the LLM (defense in depth, before the
  // post-LLM enforceStageType() guard fires on the way back).
  const stageTypeRules = {
    FUNCTIONAL_REQUIREMENTS:
      'MANDATORY: Every extracted item MUST have type="FUNCTIONAL". ' +
      'Technology choices (React, Node.js, PostgreSQL), deployment decisions (cloud/on-premise), ' +
      'and integration mentions are NOT Functional Requirements \u2014 do not extract them here.',
    NON_FUNCTIONAL_REQUIREMENTS:
      'MANDATORY: Every extracted item MUST have type="NON_FUNCTIONAL". ' +
      'Only extract measurable quality attributes. Do NOT invent metrics the user did not state.',
    CONSTRAINTS:
      'MANDATORY: Every extracted item MUST have type="CONSTRAINT". ' +
      'Extract only mandated technologies, platforms, compliance rules, or budget/timeline limits. ' +
      'nfrSubcategory must be "N/A".',
    ASSUMPTIONS_AND_DEPENDENCIES:
      'MANDATORY: Every extracted item MUST have type="ASSUMPTION" or type="DEPENDENCY" ONLY. ' +
      'NEVER output type FUNCTIONAL, NON_FUNCTIONAL, CONSTRAINT, or INTERFACE here. ' +
      'nfrSubcategory must be "N/A".',
    EXTERNAL_INTERFACES:
      'MANDATORY: Every extracted item MUST have type="INTERFACE". ' +
      'Extract only external API / hardware / protocol integration specifications. ' +
      'nfrSubcategory must be "N/A".',
    PROJECT_INFORMATION:
      'Entity stage. MANDATORY: Return {"requirements":[]} unless user writes an explicit modal-verb system statement.',
    STAKEHOLDERS_AND_USERS:
      'Entity stage. MANDATORY: Return {"requirements":[]}. User descriptions do NOT become requirements.',
    USER_ROLES_AND_PERMISSIONS:
      'Entity stage. MANDATORY: Return {"requirements":[]}. Role/permission descriptions do NOT become requirements.',
    REVIEW_AND_CONFIRMATION:
      'MANDATORY: Return {"requirements":[]}.'
  };

  const typeRule = stageTypeRules[stageId] || 'Classify type accurately for the current stage.';

  return `You are a Senior Requirements Engineer following ISO/IEC/IEEE 29148.
The user's interview answer may be in English, Hindi, Marathi, Hinglish, or mixed languages.
Understand the SEMANTIC INTENT without copying raw text or inventing features.

Project: ${project.projectName}
Scope: ${project.scope || project.description || ''}
Current interview stage: ${sectionConfig?.name} (${stageId}) \u2014 ${sectionConfig?.description || ''}
User answer:
"""
${rawText}
"""

STAGE TYPE RULE (CRITICAL \u2014 DO NOT VIOLATE):
${typeRule}

UNIVERSAL RULES (ALL stages):
- NEVER label an Assumption as FUNCTIONAL.
- NEVER label a Dependency as FUNCTIONAL.
- NEVER label a technology choice (React, Node.js, PostgreSQL, Docker) as FUNCTIONAL.
- NEVER label a deployment decision (cloud, AWS, Docker) as FUNCTIONAL.
- NEVER invent features, behaviors, or metrics the user did not explicitly state.

Return ONLY valid JSON:
{
  "requirements": [
    {
      "title": "short atomic title in English (max 60 chars)",
      "normalizedDescription": "formal English statement starting with 'The system shall ...'",
      "type": "FUNCTIONAL|NON_FUNCTIONAL|CONSTRAINT|ASSUMPTION|DEPENDENCY|INTERFACE",
      "nfrSubcategory": "PERFORMANCE|SECURITY|USABILITY|AVAILABILITY|SCALABILITY|RELIABILITY|N/A",
      "category": "short topic label",
      "priority": "HIGH|MEDIUM|LOW",
      "needsClarification": false,
      "ambiguityFlags": [],
      "clarificationQuestion": "exactly one focused question if needsClarification is true, else empty string",
      "confidence": 0.9
    }
  ]
}`;
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
