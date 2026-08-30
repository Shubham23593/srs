/**
 * Real multilingual embedding model provider (Transformers.js + ONNX).
 *
 * Loads a genuine multilingual sentence-embedding transformer
 * (Xenova/multilingual-e5-small — XLM-RoBERTa based, 384-dim) entirely
 * in-process via ONNX Runtime. It produces REAL neural embeddings from the
 * model weights for English, Hindi, Marathi, Hinglish and mixed-language text
 * — no word hashing or hand-defined concept vectors.
 *
 * The model is read from a local cache (models/hf-cache) so no network access
 * is required at runtime. If loading fails, EmbeddingService falls back to the
 * deterministic engine (that fallback decision lives in EmbeddingService).
 *
 * e5 note: inputs should be prefixed ("query:" or "passage:"). For symmetric
 * semantic similarity / clustering / section mapping we use "passage:" for all
 * texts (standard symmetric setup).
 */

const path = require('path');

const MODEL_ID = 'Xenova/multilingual-e5-small';
const EXPECTED_DIM = 384;

let transformer = null;
let extractorPromise = null;
let loadAttempted = false;
let available = false;
let lastError = null;

function configureEnv(env) {
  env.allowLocalModels = true;
  env.allowRemoteModels = false; // never attempt network at runtime
  env.localModelPath = path.resolve(__dirname, '..', '..', 'models', 'hf-cache');
  // CPU-friendly defaults
  if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1;
  return env;
}

/**
 * Lazily load the feature-extraction pipeline. Returns the extractor or null.
 * Memoised so concurrent callers share one load.
 */
async function getExtractor() {
  if (available && extractorPromise) return extractorPromise;
  // Collapse concurrent callers onto the single in-flight load.
  if (extractorPromise) return extractorPromise;
  loadAttempted = true;

  try {
    // eslint-disable-next-line global-require
    transformer = require('@huggingface/transformers');
    configureEnv(transformer.env);

    extractorPromise = transformer.pipeline('feature-extraction', MODEL_ID, {
      quantized: true,
      dtype: 'q8' // int8 quantised weights (as reconstructed from the local cache)
    });

    const extractor = await extractorPromise;
    available = true;
    console.log(`[EmbeddingModel] Loaded REAL multilingual embedding model: ${MODEL_ID} (${EXPECTED_DIM}-dim, ONNX/int8).`);
    return extractor;
  } catch (err) {
    available = false;
    lastError = err?.message || String(err);
    // Clear the failed promise so a later call can retry (e.g. weights mounted
    // after boot), while EmbeddingService keeps serving deterministic vectors.
    extractorPromise = null;
    console.warn(`[EmbeddingModel] Real embedding model unavailable (${lastError}). Will use deterministic fallback and retry on next request.`);
    return null;
  }
}

/**
 * Generate L2-normalised embeddings for one or more texts using the real model.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} array of 384-dim vectors (all-zeros vector for empty text)
 */
async function embedTexts(texts) {
  const extractor = await getExtractor();
  if (!extractor) return null; // signal caller to use fallback

  const inputs = (Array.isArray(texts) ? texts : [texts]).map((t) => {
    const clean = String(t || '').trim();
    if (!clean) return 'passage: ';
    return clean.toLowerCase().startsWith('query:') || clean.toLowerCase().startsWith('passage:')
      ? clean
      : `passage: ${clean}`;
  });

  try {
    const output = await extractor(inputs, { pooling: 'mean', normalize: true });
    // output is a Tensor [batch, dim]
    const dim = output.dims ? output.dims[output.dims.length - 1] : EXPECTED_DIM;
    const data = output.data;
    const vectors = [];
    for (let b = 0; b < inputs.length; b++) {
      const start = b * dim;
      const vec = Array.from(data.slice(start, start + dim)).map(Number);
      vectors.push(vec);
    }
    return vectors;
  } catch (err) {
    console.warn('[EmbeddingModel] Inference failed:', err?.message || err);
    return null;
  }
}

async function embedOne(text) {
  const v = await embedTexts([text]);
  return v && v[0] ? v[0] : null; // explicit null signals EmbeddingService to fall back
}

/** Warm up the model at server startup (non-blocking-safe; awaited explicitly). */
async function warmup() {
  const ex = await getExtractor();
  if (ex) {
    try {
      await ex(['passage: warmup'], { pooling: 'mean', normalize: true });
    } catch (e) { /* ignore warmup inference error */ }
  }
  return isAvailable();
}

function isAvailable() {
  return available;
}

function getInfo() {
  return {
    engine: available ? 'multilingual-e5-small (Transformers.js / ONNX, neural)' : 'deterministic-fallback',
    modelId: MODEL_ID,
    dimensions: EXPECTED_DIM,
    realModel: available,
    loadAttempted,
    lastError
  };
}

module.exports = {
  embedOne,
  embedTexts,
  warmup,
  isAvailable,
  getInfo,
  MODEL_ID,
  EXPECTED_DIM
};
