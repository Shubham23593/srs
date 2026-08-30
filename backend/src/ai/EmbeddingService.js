/**
 * EmbeddingService — semantic sentence embeddings + vector math.
 *
 * When a real embedding model (e.g. Ollama/bge) is reachable it could be wired
 * in here; in standalone mode we build CONCEPT-GROUNDED embeddings: each
 * dimension corresponds to a semantic concept (capability / object / quality
 * attribute / language-invariant meaning) drawn from the multilingual lexicon.
 * A text is embedded by projecting its matched concepts into the concept
 * space plus a residual lexical term-hash component. This yields semantically
 * meaningful cosine similarity ("add expenses" ~ "record expenses") without a
 * learned model, while remaining deterministic and dependency-free.
 */

const lexicon = require('./pipeline/lexicon');

// Build a stable ordered concept vocabulary from the lexicon.
function buildConceptVocab() {
  const concepts = new Map(); // conceptName -> index
  const conceptKeywords = []; // [{ name, patterns:[] }]

  const add = (name, keywords) => {
    if (!concepts.has(name)) {
      concepts.set(name, concepts.size);
      conceptKeywords.push({ name, patterns: (keywords || []).map((k) => k.toLowerCase()) });
    }
  };

  for (const cap of lexicon.CAPABILITIES) {
    add(`ACTION_${cap.id}`, cap.keywords);
  }
  for (const nfr of lexicon.NFR_PATTERNS) {
    add(`NFR_${nfr.nfrSubcategory}`, nfr.keywords);
  }
  for (const dep of lexicon.DEPENDENCY_PATTERNS) add('DEPENDENCY', dep.keywords);
  for (const con of lexicon.CONSTRAINT_PATTERNS) add('CONSTRAINT', con.keywords);

  // Object/concept dimensions (domain nouns) — language invariant anchors
  const objects = {
    OBJ_EXPENSE: ['expense', 'expenses', 'kharch', 'kharcha', 'paisa', 'hisab', 'खर्च', 'व्यय', 'purchase', 'spending'],
    OBJ_REPORT: ['report', 'reports', 'monthly', 'ahwal', 'रिपोर्ट', 'अहवाल', 'रिपोर्ट'],
    OBJ_BUDGET: ['budget', 'andajpatrak', 'बजट', 'अंदाजपत्रक'],
    OBJ_ACCOUNT: ['account', 'accounts', 'khata', 'खाते', 'खातं', 'user account'],
    OBJ_USER: ['user', 'users', 'admin', 'administrator', 'उपयोगकर्ता', 'वापरकर्ता', 'यूजर'],
    OBJ_AUTH: ['login', 'logout', 'password', 'sign in', 'register', 'लॉगिन', 'पासवर्ड'],
    OBJ_NOTIFICATION: ['notification', 'notify', 'alert', 'अधिसूचना', 'सूचना', 'नोटिफिकेशन'],
    OBJ_DATA: ['data', 'information', 'financial', 'record', 'records', 'माहिती', 'डेटा'],
    ACTION_VIEW: ['view', 'see', 'show', 'dekh', 'bagh', 'pah', 'देख', 'पहा', 'बघा', 'display'],
    ACTION_MANAGE: ['manage', 'manage kar', 'प्रबंधन', 'व्यवस्थापन'],
    STANCE_PERMISSIVE: ['all users', 'every user', 'automatically', 'all data', 'view every', 'sabhi'],
    STANCE_RESTRICTIVE: ['only their own', 'own private', 'cannot', 'only manually', 'only when manually', 'private', 'sirf apna']
  };
  for (const [name, kws] of Object.entries(objects)) add(name, kws);

  return { concepts, conceptKeywords };
}

const { concepts, conceptKeywords } = buildConceptVocab();
const CONCEPT_DIM = concepts.size;
const LEX_DIM = 256;
const DIMENSIONS = CONCEPT_DIM + LEX_DIM;

function matchConcept(textLower, pattern) {
  if (/[ऀ-ॿ]/.test(pattern)) return textLower.includes(pattern);
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}(?![a-z])`).test(textLower);
}

class EmbeddingService {
  constructor() {
    this.modelName = 'concept-grounded-semantic-v1';
    this.dimensions = DIMENSIONS;
  }

  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      return new Array(this.dimensions).fill(0);
    }
    const clean = text.trim().toLowerCase();
    const vector = new Array(this.dimensions).fill(0);

    // 1. Concept component (dense, semantically meaningful)
    for (const ck of conceptKeywords) {
      let weight = 0;
      for (const pat of ck.patterns) {
        if (pat && matchConcept(clean, pat)) weight += 1;
      }
      if (weight > 0) {
        vector[concepts.get(ck.name)] = Math.min(3, weight);
      }
    }

    // 2. Residual lexical component (helps distinguish within-concept items)
    const words = clean.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash << 5) - hash + word.charCodeAt(j);
        hash |= 0;
      }
      const idx = CONCEPT_DIM + (Math.abs(hash) % LEX_DIM);
      vector[idx] += 0.35 / (i + 1);
    }

    // L2 normalize
    let norm = 0;
    for (let k = 0; k < vector.length; k++) norm += vector[k] * vector[k];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let k = 0; k < vector.length; k++) vector[k] = vector[k] / norm;
    }
    return vector;
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) dot += vecA[i] * vecB[i];
    return dot; // vectors are unit-normalized; cosine == dot product
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
