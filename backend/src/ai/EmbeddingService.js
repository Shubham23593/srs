/**
 * EmbeddingService — semantic sentence embeddings + vector math.
 *
 * PRIMARY engine: a REAL multilingual neural embedding model
 * (multilingual-e5-small, Transformers.js / ONNX, 384-dim) via
 * `transformersEmbeddingProvider`. It produces genuine model embeddings for
 * English, Hindi, Marathi, Hinglish and mixed text.
 *
 * FALLBACK engine: if the real model cannot be loaded or inference fails, the
 * service transparently falls back to a deterministic concept-grounded vector
 * so the pipeline never breaks. The active engine is logged and exposed via
 * getInfo()/isRealModelActive().
 *
 * Embeddings are generated ONCE per unique text and cached (so duplicate
 * detection, section mapping and persistence reuse the same vector).
 */

const realModel = require('./transformersEmbeddingProvider');
const lexicon = require('./pipeline/lexicon');

const DIMENSIONS = 384;
const cache = new Map(); // normalized text -> vector
const CACHE_LIMIT = 5000;

function cacheGet(text) {
  return cache.get(text) || null;
}
function cacheSet(text, vec) {
  if (cache.size >= CACHE_LIMIT) {
    // drop the oldest ~25% entries
    const drop = Math.floor(CACHE_LIMIT * 0.25);
    let i = 0;
    for (const key of cache.keys()) {
      cache.delete(key);
      if (++i >= drop) break;
    }
  }
  cache.set(text, vec);
}

// ---------------------------------------------------------------------------
// Fallback: concept-grounded deterministic embeddings (384-dim, unit norm).
// ---------------------------------------------------------------------------
function buildConceptVocab() {
  const concepts = new Map();
  const conceptKeywords = [];
  const add = (name, keywords) => {
    if (!concepts.has(name)) {
      concepts.set(name, concepts.size);
      conceptKeywords.push({ name, patterns: (keywords || []).map((k) => k.toLowerCase()) });
    }
  };
  for (const cap of lexicon.CAPABILITIES) add(`ACTION_${cap.id}`, cap.keywords);
  for (const nfr of lexicon.NFR_PATTERNS) add(`NFR_${nfr.nfrSubcategory}`, nfr.keywords);
  for (const dep of lexicon.DEPENDENCY_PATTERNS) add('DEPENDENCY', dep.keywords);
  for (const con of lexicon.CONSTRAINT_PATTERNS) add('CONSTRAINT', con.keywords);
  const objects = {
    OBJ_EXPENSE: ['expense', 'expenses', 'kharch', 'kharcha', 'paisa', 'hisab', 'खर्च', 'व्यय', 'purchase', 'spending'],
    OBJ_REPORT: ['report', 'reports', 'monthly', 'ahwal', 'रिपोर्ट', 'अहवाल'],
    OBJ_BUDGET: ['budget', 'andajpatrak', 'बजट', 'अंदाजपत्रक'],
    OBJ_ACCOUNT: ['account', 'accounts', 'khata', 'खाते', 'user account'],
    OBJ_USER: ['user', 'users', 'admin', 'administrator', 'उपयोगकर्ता', 'वापरकर्ता'],
    OBJ_AUTH: ['login', 'logout', 'password', 'sign in', 'register', 'लॉगिन', 'पासवर्ड'],
    OBJ_NOTIFICATION: ['notification', 'notify', 'alert', 'अधिसूचना', 'सूचना'],
    OBJ_DATA: ['data', 'information', 'financial', 'record', 'records', 'माहिती', 'डेटा'],
    ACTION_VIEW: ['view', 'see', 'show', 'dekh', 'bagh', 'pah', 'देख', 'पहा', 'display'],
    STANCE_PERMISSIVE: ['all users', 'every user', 'automatically', 'all data', 'view every', 'sabhi'],
    STANCE_RESTRICTIVE: ['only their own', 'own private', 'cannot', 'only manually', 'private', 'sirf apna']
  };
  for (const [name, kws] of Object.entries(objects)) add(name, kws);
  return { concepts, conceptKeywords };
}

const { concepts, conceptKeywords } = buildConceptVocab();
const CONCEPT_DIM = concepts.size;
const LEX_DIM = DIMENSIONS - CONCEPT_DIM; // pad concept space into 384 dims

function deterministicEmbedding(text) {
  if (!text || typeof text !== 'string') return new Array(DIMENSIONS).fill(0);
  const clean = text.trim().toLowerCase();
  const vector = new Array(DIMENSIONS).fill(0);

  for (const ck of conceptKeywords) {
    let weight = 0;
    for (const pat of ck.patterns) {
      if (pat && matchConcept(clean, pat)) weight += 1;
    }
    if (weight > 0) vector[concepts.get(ck.name)] = Math.min(3, weight);
  }

  const words = clean.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = CONCEPT_DIM + (Math.abs(hash) % Math.max(1, LEX_DIM));
    vector[idx] += 0.35 / (i + 1);
  }
  return l2Normalize(vector);
}

function matchConcept(textLower, pattern) {
  if (/[ऀ-ॿ]/.test(pattern)) return textLower.includes(pattern);
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}(?![a-z])`).test(textLower);
}

function l2Normalize(vec) {
  let norm = 0;
  for (let k = 0; k < vec.length; k++) norm += vec[k] * vec[k];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let k = 0; k < vec.length; k++) vec[k] = vec[k] / norm;
  return vec;
}

let fallbackLogged = false;

class EmbeddingService {
  constructor() {
    this.modelName = realModel.MODEL_ID;
    this.dimensions = DIMENSIONS;
  }

  async isReady() {
    return realModel.isAvailable();
  }

  async warmup() {
    return realModel.warmup();
  }

  isRealModelActive() {
    return realModel.isAvailable();
  }

  getInfo() {
    return {
      dimensions: DIMENSIONS,
      realModel: realModel.isAvailable(),
      ...realModel.getInfo()
    };
  }

  /**
   * Generate a real neural embedding (single text). Falls back to the
   * deterministic engine if the model is unavailable. Cached per text.
   */
  async generateEmbedding(text) {
    const key = String(text || '').trim();
    if (!key) return new Array(DIMENSIONS).fill(0);
    const cached = cacheGet(key);
    if (cached) return cached;

    let vec = null;
    try {
      vec = await realModel.embedOne(key);
    } catch (e) {
      vec = null;
    }

    if (!vec) {
      if (!fallbackLogged) {
        fallbackLogged = true;
        console.warn('[EmbeddingService] Real model unavailable for inference — using DETERMINISTIC fallback embeddings.');
      }
      vec = deterministicEmbedding(key);
    }

    cacheSet(key, vec);
    return vec;
  }

  /**
   * Batch embedding: single model call for many texts (efficient), with
   * per-item caching and fallback for anything the model does not return.
   */
  async generateEmbeddings(texts) {
    const list = Array.isArray(texts) ? texts : [texts];
    const keys = list.map((t) => String(t || '').trim());
    const results = new Array(keys.length);
    const needIdx = [];

    keys.forEach((key, i) => {
      if (!key) { results[i] = new Array(DIMENSIONS).fill(0); return; }
      const cached = cacheGet(key);
      if (cached) results[i] = cached;
      else needIdx.push(i);
    });

    if (needIdx.length) {
      let modelVecs = null;
      try {
        modelVecs = await realModel.embedTexts(needIdx.map((i) => keys[i]));
      } catch (e) {
        modelVecs = null;
      }

      for (let n = 0; n < needIdx.length; n++) {
        const i = needIdx[n];
        let vec = modelVecs && modelVecs[n] && modelVecs[n].length === DIMENSIONS ? modelVecs[n] : null;
        if (!vec) {
          if (!fallbackLogged) {
            fallbackLogged = true;
            console.warn('[EmbeddingService] Real model unavailable — using DETERMINISTIC fallback embeddings.');
          }
          vec = deterministicEmbedding(keys[i]);
        }
        results[i] = vec;
        cacheSet(keys[i], vec);
      }
    }

    return Array.isArray(texts) ? results : results[0];
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) dot += vecA[i] * vecB[i];
    return dot; // unit-normalized vectors => cosine == dot product
  }

  chunkText(text, chunkSize = 300, overlap = 50) {
    if (!text) return [];
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    for (const para of paragraphs) {
      const clean = para.trim();
      if (!clean) continue;
      if (clean.length <= chunkSize) chunks.push(clean);
      else {
        let start = 0;
        while (start < clean.length) {
          const end = Math.min(start + chunkSize, clean.length);
          chunks.push(clean.substring(start, end));
          start += (chunkSize - overlap);
        }
      }
    }
    return chunks;
  }
}

module.exports = new EmbeddingService();
