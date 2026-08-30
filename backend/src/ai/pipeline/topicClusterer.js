/**
 * Phase 15 — Semantic Topic Clustering.
 * Groups normalized requirements into semantically related topics using
 * sentence embeddings + K-Means clustering, then labels each cluster with the
 * nearest canonical topic name via cosine similarity.
 */

const embeddingService = require('../EmbeddingService');

const CANONICAL_TOPICS = [
  'Authentication and Login',
  'User Management and Roles',
  'Expense Management',
  'Budget Management',
  'Reporting and Analytics',
  'Notifications',
  'Security',
  'Performance',
  'External Interfaces and Integrations',
  'Constraints and Standards',
  'Project Context and Objectives',
  'General System Features'
];

function kmeans(vectors, k, { maxIter = 20 } = {}) {
  if (vectors.length === 0) return [];
  const effectiveK = Math.max(1, Math.min(k, vectors.length));

  // Initialize centroids: evenly spread across vectors
  let centroids = [];
  for (let i = 0; i < effectiveK; i++) {
    const idx = Math.floor((i * vectors.length) / effectiveK);
    centroids.push([...vectors[idx]]);
  }

  let assignments = new Array(vectors.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assignment step
    let changed = false;
    for (let i = 0; i < vectors.length; i++) {
      let best = 0;
      let bestSim = -Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const sim = embeddingService.cosineSimilarity(vectors[i], centroids[c]);
        if (sim > bestSim) { bestSim = sim; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }

    // Update step
    const dim = vectors[0].length;
    const sums = Array.from({ length: effectiveK }, () => new Array(dim).fill(0));
    const counts = new Array(effectiveK).fill(0);
    for (let i = 0; i < vectors.length; i++) {
      counts[assignments[i]]++;
      for (let d = 0; d < dim; d++) sums[assignments[i]][d] += vectors[i][d];
    }
    centroids = centroids.map((centroid, c) => {
      if (counts[c] === 0) return centroid;
      return sums[c].map((v) => v / counts[c]);
    });

    if (!changed && iter > 0) break;
  }

  return assignments;
}

// Canonical topic embeddings are static — compute once and reuse.
let _topicEmbeddings = null;
async function getTopicEmbeddings() {
  if (_topicEmbeddings) return _topicEmbeddings;
  const vecs = await embeddingService.generateEmbeddings(CANONICAL_TOPICS);
  _topicEmbeddings = CANONICAL_TOPICS.map((topic, i) => ({ topic, emb: vecs[i] }));
  return _topicEmbeddings;
}

async function labelCluster(memberEmbeddings, memberTexts) {
  // Centroid = mean of the (already-computed, reused) member embeddings.
  const dim = memberEmbeddings[0].length;
  const centroid = new Array(dim).fill(0);
  for (const emb of memberEmbeddings) {
    for (let d = 0; d < dim; d++) centroid[d] += emb[d];
  }
  for (let d = 0; d < dim; d++) centroid[d] /= memberEmbeddings.length;

  const topics = await getTopicEmbeddings();
  let best = CANONICAL_TOPICS[CANONICAL_TOPICS.length - 1];
  let bestSim = -Infinity;
  for (const { topic, emb } of topics) {
    const sim = embeddingService.cosineSimilarity(centroid, emb);
    if (sim > bestSim) { bestSim = sim; best = topic; }
  }
  return { label: best, confidence: Math.round(bestSim * 100) / 100 };
}

/** Ensure every requirement carries a reused embedding (single batched call). */
async function ensureEmbeddings(requirements) {
  const missing = requirements.filter((r) => !r.embedding || r.embedding.length === 0);
  if (missing.length) {
    const vecs = await embeddingService.generateEmbeddings(
      missing.map((m) => `${m.normalizedDescription || m.description || ''}`)
    );
    missing.forEach((m, i) => { m.embedding = vecs[i]; });
  }
}

/**
 * Cluster requirements into semantic topics.
 * Mutates each requirement's `topicCluster` (falls back to existing category).
 * Returns cluster summary.
 */
async function clusterRequirements(requirements) {
  if (!requirements || requirements.length === 0) return { clusters: [] };

  // Use a strong prior: NON_FUNCTIONAL requirements cluster by their quality
  // subcategory (Performance/Security/...); functional requirements by any
  // existing topic cluster/category. Semantic label assignment then names the
  // group canonically.
  const qualityTopic = {
    PERFORMANCE: 'Performance', SCALABILITY: 'Performance',
    SECURITY: 'Security', SAFETY: 'Reliability', RELIABILITY: 'Reliability',
    AVAILABILITY: 'Reliability', USABILITY: 'Usability', MAINTAINABILITY: 'Software Quality'
  };
  const priorGroups = new Map();
  for (const r of requirements) {
    let prior;
    if (r.type === 'NON_FUNCTIONAL') {
      prior = qualityTopic[r.nfrSubcategory] || 'Software Quality';
    } else if (r.type === 'CONSTRAINT') {
      prior = 'Constraints and Standards';
    } else if (r.type === 'DEPENDENCY' || r.type === 'ASSUMPTION') {
      prior = 'External Dependencies';
    } else if (r.type === 'INTERFACE') {
      prior = 'External Interfaces and Integrations';
    } else {
      prior = (r.topicCluster || r.category || 'General System Features').trim();
    }
    if (!priorGroups.has(prior)) priorGroups.set(prior, []);
    priorGroups.get(prior).push(r);
  }

  const clusters = [];
  await ensureEmbeddings(requirements);

  // For small catalogs or strong priors, label each prior group semantically,
  // then MERGE groups that resolve to the same canonical label (keeps Section 3
  // idempotent — each requirement appears in exactly one feature cluster).
  if (requirements.length <= 60) {
    const byLabel = new Map();
    for (const [priorLabel, members] of priorGroups) {
      const isQualityGroup = members.some((m) => m.type === 'NON_FUNCTIONAL' || m.type === 'CONSTRAINT' || m.type === 'DEPENDENCY' || m.type === 'ASSUMPTION' || m.type === 'INTERFACE');
      const priorIsSemantic = priorLabel &&
        !/general|core features|functional requirements|core$/i.test(priorLabel);
      let label;
      if (isQualityGroup || priorIsSemantic) {
        label = priorLabel;
      } else {
        label = (await labelCluster(members.map((m) => m.embedding))).label;
      }
      if (!byLabel.has(label)) byLabel.set(label, []);
      byLabel.get(label).push(...members);
    }
    let idx = 0;
    for (const [label, members] of byLabel) {
      const clusterId = `C${String(++idx).padStart(2, '0')}`;
      for (const m of members) m.topicCluster = label;
      clusters.push({
        clusterId,
        topic: label,
        requirementIds: members.map((m) => m.requirementId),
        count: members.length
      });
    }
    return { clusters };
  }

  // Larger catalogs: full embedding K-means (reuses per-requirement embeddings)
  const vectors = requirements.map((r) => r.embedding);
  const k = Math.min(CANONICAL_TOPICS.length, Math.max(3, Math.ceil(Math.sqrt(requirements.length / 2))));
  const assignments = kmeans(vectors, k);

  const groups = new Map();
  requirements.forEach((r, i) => {
    if (!groups.has(assignments[i])) groups.set(assignments[i], []);
    groups.get(assignments[i]).push(r);
  });

  let idx = 0;
  for (const [, members] of groups) {
    const { label } = await labelCluster(members.map((m) => m.embedding));
    const clusterId = `C${String(++idx).padStart(2, '0')}`;
    for (const m of members) m.topicCluster = label;
    clusters.push({
      clusterId,
      topic: label,
      requirementIds: members.map((m) => m.requirementId),
      count: members.length
    });
  }

  return { clusters };
}

module.exports = { clusterRequirements, CANONICAL_TOPICS, kmeans };
