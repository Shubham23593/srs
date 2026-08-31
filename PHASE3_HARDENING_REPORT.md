# Phase 3 — Production-Hardening of the AI Interview / Requirements Pipeline

**Status: COMPLETE** — all acceptance suites green against the live HTTP stack with the real
neural embedding model active.

## Mandate (ISO/IEC/IEEE 29148)

Every interview answer follows one authoritative path:

> **USER ANSWER → classify information TYPE → validate context/stage → extract only what is
> present → eligibility gate → validate/normalize → dedupe(flag, never delete) /
> conflict(preserve) → persist to the correct store (requirements vs project knowledge) →
> non-repeating follow-up or deterministic stage-advance**

One pipeline owns every write. There is no Interview-Agent→DB bypass and no
raw-interview→SRS bypass.

## What was audited and fixed (Phase 3)

### 1. Strict 9-stage state machine (stage is authoritative)
- `constants/interviewSections.js` — nine stages with id/name/stepIndex/description.
- **NEW `ai/pipeline/stageGate.js`** — `evaluateStageCompletion()` decides completeness per
  stage deterministically (FR/NFR need ≥1 real requirement; roles need roles; stakeholders
  need users/stakeholders; project-info needs description/scope/problem; review = confirm).
  Completeness is **never** message-count based.
- `interview.controller.js` — advancement happens **only** on explicit skip **or**
  `sectionCompleted === true` from the gate. A single message never advances a stage.
- **Stage-gated extraction**: `requirementsPipeline._isRequirementAllowedInStage()` rejects
  requirement candidates in knowledge stages (PROJECT_INFORMATION, STAKEHOLDERS, ROLES,
  REVIEW); rejected candidates are returned as `rejectedByGate`, not silently dropped.
- **Fixed a real bug**: an `ANSWER` action carrying an explicit `sectionId` was previously
  ignored (`sectionId && !action`), forcing every answer into stage 0. The explicit stage is
  now honored for all answer actions, so the UI/API-driven current stage is authoritative.

### 2. Structured result contract (per answer)
Every answer returns the ISO-style contract on `userMessage.analysisResult`:

`accepted, relevanceStatus, informationType, stage{stageId,stageName}, extractedEntities,
requirementCandidates, rejectedCandidates, clarificationNeeded, clarificationQuestion,
missingInformation, stageComplete, shouldAdvance, nextStage, followUpQuestion,
providerStatus, warnings` (plus language / informationQuality / skippedDuplicates).
Verified present in full over HTTP (15/15 fields).

### 3. Context / relevance guard (no keyword-only acceptance; embeddings cannot gate alone)
`semanticContextValidator.js` deterministic fallback now:
- Rejects keyboard-mash/gibberish (conservative — long pure-consonant runs and known
  walks only; never trips on Hinglish/tech words like `hona`, `postgresql`).
- Rejects hard out-of-domain content (sports/weather) and cross-domain features
  (grocery/expense answers in a hospital project).
- Accepts on-topic content via **domain-grounded** signals: explicit system-requirement
  language in a requirement stage, technology constraints, Hinglish/Devanagari capability
  modals (चाहिए / सकें / पाहिजे / शकतो / सुविधा), or domain vocabulary.
- **Embedding cosine is never an auto-accept gate** (it over-scores short/formulaic text);
  it only corroborates explicit requirements at ≥0.82.
- Generic verbs (`track`, `manage`, `system`, `data`, …) are excluded from domain grounding
  so "track grocery budget" no longer matches "token tracking".
- Vague quality language ("fast", "good", "secure") in a quality stage →
  **PARTIALLY_RELEVANT** with a targeted measurable-target follow-up.

### 4. Zero-hallucination extraction & normalization (`semanticEngine.js`)
- Domain-general `buildGenericCapability` produces formal English from the clause's own
  words (modal marker + action verb + actor/object). It returns `null` rather than invent
  ("manage information" / "add ne" are rejected).
- **NEW Devanagari→English glossary + modal/verb inheritance** so Hindi/Marathi FRs
  ("किसान … आवेदन अपलोड कर सकें", "मरीज़ … अपॉइंटमेंट बुक … सकें") normalize faithfully to
  English. Native/Hinglish raw text is preserved separately in `rawSourceText`.
- Normalized statements are formal English (`The system shall allow …`) with **no
  Devanagari leakage**; the SRS English-only guard passes.
- `buildGenericMeasurableNfr` records **only user-stated metrics** (2 seconds, 99.9%) and
  never invents thresholds; vague quality → `NEEDS_CLARIFICATION` + one focused question.
- **Domain guard on the keyword lexicon**: expense/disaster templates only fire when the
  project is that domain or the clause names those objects (a hospital "search …" answer no
  longer emits "search and filter expense records").
- Multi-capability enumerations ("search X, select Y, and confirm Z") split and inherit the
  obligation marker so each capability is captured; subordinate steps ("after picking …")
  are not merged into an object.
- NFR availability signal no longer fires on the adjective "available" ("available time
  slot" stays a functional capability).

### 5. Knowledge stored separately from requirements
- `models/Project.js` gained `roles[], permissions[], problemStatement, primaryObjective,
  externalInterfaces[]`. Stakeholders/roles/permissions/assumptions/dependencies/interfaces
  persist to the **project** as knowledge; only genuine requirements become `Requirement`
  rows. Duplicate and conflict candidates are flagged/preserved, never auto-deleted or
  silently resolved.

### 6. AI-provider safety
- `OllamaProvider.generateCompletion` uses a bounded timeout with ≤1 retry and returns an
  empty string on failure (no fabricated content). `generateStructuredJSON` treats LLM JSON
  as untrusted; parse/schema failure → deterministic engine.
- `requirementsPipeline` marks `aiProviderFailed` / `providerStatus`
  (`AI_PROVIDER | DETERMINISTIC_ENGINE | FAILED_DETERMINISTIC_FALLBACK`).
- Interview `generateDynamicFollowUp` (temp 0.3, short, no retry) falls back to a missing-info
  hint and then the static localized bank — it **never** returns an empty question, so an LLM
  outage can never stall the interview.

## Test evidence (real stack, Ollama down → deterministic path, real e5 embeddings)

| Suite | Result |
|---|---|
| `testContextRelevanceValidation` | **18 / 18** |
| `testStageAwarePipeline` | **15 / 15** |
| `testHttpContractSuite` (NEW — 46 HTTP assertions, contract + state machine) | **46 / 46** |
| `testPipelineE2E` (16 scenarios → catalog → dedupe/conflict → SRS) | **26 / 26** |
| `testMultiProject14Priorities` | **40 / 40** |
| `testMultilingualEmbeddings` (real neural model) | **15 / 15** |

Total: **160 assertions, 0 failures.** The new HTTP suite exceeds the mandated 25+
real-stack HTTP tests and explicitly verifies: knowledge stages produce 0 requirements;
stage-misplaced requirements are rejected; cross-domain/gibberish answers are blocked
without advancing; vague NFRs are held as NEEDS_CLARIFICATION with no invented metric;
user-stated metrics are preserved; requirements are formal English with separate raw
evidence; roles land in project knowledge; duplicates are flagged; skip/advance paths;
SRS generates English-only; and multi-project isolation.

## Preserved (untouched behavior)
Authentication (register/login), project creation, requirement persistence, SRS generation,
RAG/vector functionality (real multilingual-e5-small ONNX embeddings, 384-dim, batched once
per requirement), export, traceability/version APIs, and the existing interview UI all
regress clean.
