# Real Multilingual Neural Embedding Model — Production Verification Report

**Date:** 2026-08-30 · **Branch:** `arena/01a0514c-srs`
**Status:** ✅ REAL neural model is **active** in production (not the deterministic fallback).

---

## 1. Which model

| Item | Value |
|---|---|
| Model | **`Xenova/multilingual-e5-small`** (ONNX int8 build of `intfloat/multilingual-e5-small`) |
| Architecture | XLM-RoBERTa transformer, 12 layers, hidden size **384** |
| Tokenizer | Unigram SentencePiece, vocab **250,037** — covers English, Hindi, Marathi (Devanagari) and many other languages |
| Runtime | **Transformers.js v3 (`@huggingface/transformers@3.0.2`) + ONNX Runtime (`onnxruntime-node@1.19.2`)**, running **in-process on CPU** |
| Weight file | `onnx/model_quantized.onnx` — **118,308,185 bytes** (int8 quantized) |
| Tokenizer file | `tokenizer.json` — **17,082,730 bytes** |
| Model input | `input_ids` / `attention_mask` / `token_type_ids` → `last_hidden_state`; mean-pooled, L2-normalized |
| Embedding dimension | **384** |
| Licence | MIT |
| Network at runtime | **None.** `allowRemoteModels=false`; weights are read from a local cache (`backend/models/hf-cache/`). |

Vectors are genuine neural embeddings produced by a forward pass through the
model weights — **not** word hashing or hand-defined concept vectors. Each
text is embedded with the e5 `passage:` prefix and mean-pooled with
`normalize:true`.

Startup log line confirming the load:

```
[EmbeddingModel] Loaded REAL multilingual embedding model: Xenova/multilingual-e5-small (384-dim, ONNX/int8).
[Startup] Embedding engine ready: multilingual-e5-small (Transformers.js / ONNX, neural) (dimensions=384, realModel=true)
```

---

## 2. Where it is integrated (every semantic operation)

| File | Semantic operation | How the model is used |
|---|---|---|
| `backend/src/ai/transformersEmbeddingProvider.js` | **Model wrapper (new)** | Lazy singleton Transformers.js pipeline; `embedOne` / `embedTexts` (batched) / `warmup` / `isAvailable` / `getInfo`; prefixes + pooling + normalisation. |
| `backend/src/ai/EmbeddingService.js` | **Embedding service (rewritten)** | Calls the real model for every embedding; text cache (5,000 entries); **batched `generateEmbeddings()`**; cosine similarity; deterministic 384-dim fallback with a one-time logged warning; `isRealModelActive()` / `getInfo()`. |
| `backend/src/ai/pipeline/qualityEngine.js` | **Semantic duplicate detection** + conflict relatedness | Batch-embeds the whole requirement set once; cosine between requirement embeddings. |
| `backend/src/ai/pipeline/contextGuard.js` | **Context / project-relevance guard** | Cosine of the answer embedding vs project-context embedding (single batched call). |
| `backend/src/ai/pipeline/topicClusterer.js` | **Semantic topic clustering (K-Means)** | Reuses per-requirement embeddings for K-Means; canonical-topic embeddings cached; cluster centroids from member embeddings. |
| `backend/src/ai/pipeline/sectionMapper.js` | **SRS section similarity / mapping** | Cosine of requirement embeddings vs cached SRS-section embeddings for the confidence/KNN score (type-based mapping remains authoritative). |
| `backend/src/ai/pipeline/requirementsPipeline.js` | **Orchestration** | Embeddings generated **once per requirement** (batched) and reused for duplicate detection, conflict detection and persistence; persisted docs tagged with `embeddingModel`. |
| `backend/src/controllers/requirement.controller.js` | **Manual requirement create/update** | Generates a real embedding and stores `embeddingModel`. |
| `backend/server.js` | **Startup** | Calls `embeddingService.warmup()` after boot (background; never blocks/crashes startup). |
| `backend/src/models/Requirement.js` | **Persistence** | Stores `embedding` (`[Number]`) and `embeddingModel` (`multilingual-e5-small` / `deterministic-v1`). |

**Embedding generated once and reused (criterion 4):** in `analyzeAnswer()` the
new requirements are embedded in a single batched call; the same vectors are
used for duplicate detection, conflict detection, clustering/section mapping,
and then persisted to the catalog — no requirement is embedded twice. Section
and canonical-topic embeddings (static text) are computed once and cached
module-level.

---

## 3. Sample vector / dimension

Every persisted requirement carries a **384-component** L2-normalised vector,
tagged with the engine that produced it. Verified live over the HTTP API:

```
FR-001  dim=384 model=multilingual-e5-small User Login
FR-002  dim=384 model=multilingual-e5-small Expense Creation
FR-003  dim=384 model=multilingual-e5-small User Account Management
...
NFR-001 dim=384 model=multilingual-e5-small Response Performance
CON-001 dim=384 model=multilingual-e5-small Technology Constraint: Postgresql
DEP-001 dim=384 model=multilingual-e5-small Dependency: Email Notification Provider
```

Sample first components of a real vector (norm = 1.0000):
`0.0403, -0.0139, …` (384 values).

---

## 4. Multilingual semantic similarity results

Anchor: **"The system shall allow users to record expenses."**
Cosine similarity against the user's acceptance examples (mean-pooled,
`passage:`-prefixed, L2-normalised real model output):

| # | Language | Text | Cosine vs anchor | Verdict |
|---|---|---|---:|---|
| 1 | English | "The system should record expenses." | **0.9600** | duplicate |
| 2 | **Hindi** | "सिस्टम खर्च रिकॉर्ड करे।" | **0.8615** | duplicate |
| 3 | **Marathi** | "सिस्टमने खर्च नोंदवावा." | **0.8640** | duplicate |
| 4 | **Hinglish** | "User expense add kar sakta hai." | **0.8773** | duplicate |
| 5 | **Mixed (Hindi+English)** | "User la expenses add karne chahiye." | **0.8477** | duplicate |
| 6 | English — unrelated | "I want to watch a football match tonight." | **0.7395** | rejected ✅ |
| 7 | English — same domain, NOT a duplicate | "The system shall allow users to log in with their credentials." | 0.9156 | guarded (see §6) |

All five language forms of "record expenses" score ≥ 0.84 and are recognised as
semantically equivalent; the unrelated football text scores 0.74 and is
rejected; determinism check (same text → cosine 1.0000) passes.

Script: `node src/scripts/testMultilingualEmbeddings.js` → **15 passed / 0 failed**.

---

## 5. Duplicate detection results (through the real pipeline)

The deterministic semantic engine normalises every language input into formal
English before embedding, so genuine cross-lingual duplicates converge to the
same English statement. Observed end-to-end:

* **Hindi** "उपयोगकर्ता खर्च जोड़ सकते हैं।" → normalises to *"The system shall
  allow users to create and record expense entries."* → the Hinglish and the
  mixed-language expense answers normalise to the **identical** statement →
  detected as duplicates (exact-normalised-text path) and **preserved for
  review, never auto-deleted**.
* **English paraphrase** "Users should be able to record expenses." → 0.965
  neural cosine to the catalog expense requirement → flagged **duplicate**
  (`NEEDS_REVIEW`).
* **Conflicts preserved**: "all users can view every user's financial data" vs
  "users can only view their own private financial information" → both kept, a
  `RULE_CONFLICT` issue is recorded and visible in the SRS audit.
* **Unrelated** "Mujhe football match dekhna hai." → context guard rejects it;
  **no requirement created**.
* **Distinct features are NOT false-flagged**: User Login vs User Account
  Management (0.941), Create-expense vs Delete-expense (0.937), Create-expense
  vs View-reports (0.924) stay **below** the 0.96 near-identical band and have
  no strong content-word overlap, so they are not flagged.

Final test catalog: 12 distinct requirements persisted; the only duplicate flag
is the genuine same-statement data-access pair (which is also a conflict).

---

## 6. Same-domain crowding handling (important calibration note)

After formal normalization, every requirement begins with "The system shall
allow users to …". With that formulaic prefix, e5 crowds even distinct features
to ~0.91–0.94 cosine (e.g. login vs record-expenses = 0.92, add- vs
delete-expense = 0.94). Flagging on cosine alone would produce false
duplicates. Duplicate detection therefore combines three **conservative**
signals (in `qualityEngine.js`):

1. **Exact identical normalized statement** (definitive; catches cross-lingual
   duplicates that converged to the same English).
2. **Near-identical neural cosine ≥ 0.96** (paraphrase of the same requirement;
   record-expenses paraphrase = 0.965, while distinct features ≤ 0.941).
3. **Strong content-word lexical overlap ≥ 0.50**, computed on content tokens
   only (formulaic boilerplate stripped, light plural stemming).

The hard idempotency skip in `persistRequirements()` only drops statements with
cosine ≥ 0.96 (essentially identical); everything else is preserved and flagged
for human review. Conflicts remain stance/signature-based and keep both
requirements.

---

## 7. Graceful fallback (criterion 5)

If the weights are missing, fail to load, or inference throws:

* `EmbeddingService.generateEmbedding(s)` catches the failure, serves a
  **384-dim deterministic concept embedding**, and logs a one-time clear warning:
  `[EmbeddingService] Real model unavailable for inference — using DETERMINISTIC
  fallback embeddings.`
* The provider retries loading on a subsequent request (no permanent failure),
  and the server **boots regardless** (warmup is backgrounded).
* Fallback vectors are still 384-dim and L2-normalised, so all downstream code,
  clustering and cosine math keep working.
* Requirement docs record which engine produced their embedding
  (`embeddingModel: multilingual-e5-small` vs `deterministic-v1`) for audit.

Fallback was verified by simulating model failure: a 384-dim normalised vector
was returned and the warning was logged.

---

## 8. Full test results

Both suites run against the **real full stack** (HTTP API on :5000, real
pipeline, real persistence):

| Suite | Command | Result |
|---|---|---|
| Multilingual neural embeddings | `npm run test:embeddings` | **15 passed / 0 failed** |
| Mandatory end-to-end pipeline (15 HTTP scenarios) | `npm run test:e2e` | **24 passed / 0 failed** |
| SRS quality audit | (within E2E) | **10 / 10 checks passed** |
| Final language guard | (within E2E) | **passed (English only)** |

The E2E suite confirms: raw interview text never reaches catalog descriptions
or the English SRS; multilingual inputs are extracted and normalized;
ambiguity is flagged with a clarification question (no invented metrics);
duplicates are flagged not deleted; conflicts are preserved; requirements map
to correct SRS sections.

---

## 9. Reproducing

```bash
cd backend
npm install            # installs @huggingface/transformers + onnxruntime-node
npm run fetch:model    # downloads/reconstructs the model weights (git-ignored)
npm start              # boots; log shows "[EmbeddingModel] Loaded REAL ..."
npm run test:embeddings
npm run test:e2e
```

The model weights (~130 MB) are excluded from git; `scripts/fetchEmbeddingModel.js`
fetches them (Hugging Face CDN, then a GitHub codeload mirror for restricted
networks) into `backend/models/hf-cache/Xenova/multilingual-e5-small/`.

---

## 10. Explicit model-status confirmation

> **The REAL multilingual neural model `Xenova/multilingual-e5-small` is active
> and serving every semantic operation** (duplicate detection, context
> relevance, topic clustering, SRS section mapping). This is confirmed by the
> startup log (`realModel=true`), the 384-dim `multilingual-e5-small` tag on
> every persisted requirement, and both test suites passing. The deterministic
> engine exists only as a logged, graceful fallback.
