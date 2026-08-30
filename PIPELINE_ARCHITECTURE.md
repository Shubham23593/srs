# AI Requirements Engineering Pipeline — Architecture

This document describes the end-to-end pipeline that turns **raw, multilingual
interview answers** into a **validated requirements catalog** and a
**section-wise, ISO/IEC/IEEE-29148-compliant SRS**.

## Core invariant

> **RAW USER INPUT ≠ REQUIREMENT ≠ SRS CONTENT**

- Raw interview text is **unstructured source evidence**. It is stored only in
  `Requirement.rawSourceText` (and `InterviewMessage.content`).
- A **requirement** is a structured, normalized, atomic interpretation:
  `Requirement.normalizedDescription`, always a formal English
  *"The system shall …"* statement.
- The **SRS** is assembled only from validated, normalized requirements — never
  from transcripts, chat history, or `rawSourceText`.

Raw text is never copied into a requirement description or the SRS. This is
enforced both in code and by a final quality audit (`qualityAudit.js`).

## The single authoritative path

```
Raw Input (any language)
  → Phase 1  Input Validation
  → Phase 2  Context / Project-Scope Guard      (contextGuard.js)
  → Phase 3  Language Detection                 (languageDetector.js)
  → Phase 4  Semantic Understanding / Extraction (semanticEngine.js + LLM if live)
  → Phase 5  Atomic Requirement Decomposition
  → Phase 6  Classification (FUNCTIONAL/NFR/CONSTRAINT/ASSUMPTION/DEPENDENCY/
              INTERFACE/STAKEHOLDER/BUSINESS_RULE)
  → Phase 7  Formal Normalization ("The system shall …", English)
  → Phase 8  Zero-Hallucination (no invented features/metrics)
  → Phase 9  Quality Analysis (8 ISO 29148 characteristics) (qualityEngine.js)
  → Phase 10 Ambiguity Detection + one focused clarification question
  → Phase 11 Semantic Duplicate Detection (embeddings + cosine) (qualityEngine.js)
  → Phase 12 Rule-Conflict Detection (both sides preserved)
  → Phase 13 Information Quality Result
  → Validated Requirement Catalog               (Requirement model)
  → Phase 15 Semantic Topic Clustering (K-Means) (topicClusterer.js)
  → Phase 16 Deterministic SRS Section Mapping  (sectionMapper.js)
  → Phase 17 Section-wise SRS Generation         (srsAssembler.js)
  → Phase 18 Final Language Guard (English only)  (languageDetector/srsAssembler)
  → Phase 19 Quality Audit (10 checks)            (qualityAudit.js)
  → Phase 20 Incremental, idempotent sync         (srs.controller)
```

There is **one** production pipeline: `backend/src/ai/pipeline/requirementsPipeline.js`.
Every input path goes through it:

| Entry point | Route | Pipeline method |
|---|---|---|
| Interview answer | `POST /projects/:id/interview/message` | `analyzeAnswer` + `persistRequirements` |
| Free-text extraction | `POST /projects/:id/requirements/extract` | `analyzeAnswer` + `persistRequirements` |
| Manual requirement | `POST /projects/:id/requirements` | normalized via `formalNormalize` |
| SRS generation | `POST /projects/:id/srs/generate` | `generateSRS` |
| Incremental change | `POST /projects/:id/srs/update` | `analyzeAnswer` → persist → regenerate |
| Demo seed | `POST /projects/seed-demo` | normalized requirements → `generateSRS` |

The previous "Interview Agent → database" and "raw answer → SRS" bypasses were
removed. `InterviewAgent` is now a thin orchestration shell around the pipeline.

## Key components (`backend/src/ai/pipeline/`)

| File | Responsibility |
|---|---|
| `lexicon.js` | Multilingual (English/Hindi/Marathi/Hinglish/mixed) concept dictionary: capabilities, NFR patterns, constraints/dependencies, out-of-scope topics, vague words. |
| `languageDetector.js` | Script + function-word detection (English/Hindi/Marathi/Hinglish/Mixed) and the Phase-18 non-English content guard. |
| `contextGuard.js` | Project/topic relevance guard: hard out-of-scope patterns + capability-vocabulary overlap + embedding similarity. |
| `semanticEngine.js` | Semantic interpretation, verb/object atomic decomposition, semantic classification, formal normalization. |
| `qualityEngine.js` | Quality scoring, embedding-based duplicate detection, stance-based rule-conflict detection. |
| `topicClusterer.js` | Embedding K-Means clustering + canonical topic labelling. |
| `sectionMapper.js` | Deterministic requirement → SRS section mapping with cosine validation. |
| `srsAssembler.js` | Builds the deterministic 29148 skeleton and fills each section only from normalized requirements. |
| `qualityAudit.js` | The 10 final audit checks. |
| `requirementsPipeline.js` | Orchestrator / single write path. |

### LLM strategy
If an Ollama LLM is reachable (`AIProvider.isHealthy()`), extraction is
attempted with a strict, zero-hallucination, JSON-only prompt. On any failure
(or when no LLM is present) the **deterministic multilingual semantic engine**
produces the same structured result — so the pipeline is fully functional and
testable with no external AI service.

### Embeddings
`EmbeddingService` builds concept-grounded semantic vectors from the lexicon
(capability/object/quality dimensions) plus a residual lexical component, so
cosine similarity reflects meaning ("add expenses" ≈ "record expenses";
"create" ≠ "update") without a trained model.

## Persistence

- **MongoDB** is used when reachable (Mongoose models defined once as plain
  schema descriptors in `src/models/*`).
- When MongoDB is unavailable the app automatically falls back to an
  in-process persistence layer (`src/db/inMemoryDB.js`) implementing the
  Mongoose query API the app uses — the full stack (API → pipeline → "database"
  → catalog → SRS → export) runs and is testable standalone.

## Requirement catalog fields

`id, title, rawSourceText, sourceLanguage, normalizedDescription, type,
nfrSubcategory, category, topicCluster, targetSrsSection, priority, status
(PROPOSED / NEEDS_CLARIFICATION / NEEDS_REVIEW / APPROVED / ACTIVE /
DEPRECATED), ambiguityFlags, clarificationQuestion, duplicateCandidates,
conflictReferences, qualityScores, sourceInterviewStage, createdAt`

The UI catalog shows **title / normalizedDescription / type / priority /
status** — never the raw source text.

## End-to-end test

```bash
# 1. start the backend (falls back to in-process DB if MongoDB is absent)
cd backend && npm start
# 2. in another shell, run the mandatory 15-scenario test
cd backend && npm run test:e2e
```

`src/scripts/testPipelineE2E.js` drives all 15 required scenarios through the
real HTTP API (input → API → pipeline → persistence → catalog → SRS → audit)
and asserts, among other things:

- no raw text in catalog descriptions (T12) and no non-English/raw text in the
  English SRS (T13);
- unrelated input creates zero requirements (T10/T15);
- every active requirement maps to the correct SRS section (T14);
- duplicates and conflicts are flagged and preserved (T7/T8);
- ambiguous statements are `NEEDS_CLARIFICATION` with a clarification question
  and no invented metrics (T9/T92);
- the 10-point quality audit passes.
