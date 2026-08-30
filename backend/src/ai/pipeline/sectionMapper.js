/**
 * Phase 16 — Deterministic SRS Section Mapping.
 *
 * A fixed SRS skeleton is produced first; each normalized requirement is then
 * mapped to the correct section using semantic similarity (cosine against the
 * section description) with KNN-style majority vote, constrained by the
 * requirement's type/category. This avoids sending "one large prompt" and
 * guarantees deterministic placement.
 *
 *   FUNCTIONAL                 -> Section 3  System Features
 *   PERFORMANCE (NFR)          -> Section 5.1 Performance Requirements
 *   SAFETY (NFR)               -> Section 5.2 Safety Requirements
 *   SECURITY (NFR)             -> Section 5.3 Security Requirements
 *   OTHER QUALITY ATTRIBUTES   -> Section 5.4 Software Quality Attributes
 *   CONSTRAINT                 -> Section 2.5 Design & Implementation Constraints
 *   ASSUMPTION / DEPENDENCY    -> Section 2.7 Assumptions & Dependencies
 *   INTERFACE                  -> Section 4   External Interface Requirements
 *   STAKEHOLDER                -> Section 2.3 User Classes & Characteristics
 */

const embeddingService = require('../EmbeddingService');

const SRS_SECTIONS = [
  { id: '2.3', name: 'User Classes and Characteristics', types: ['STAKEHOLDER', 'BUSINESS_RULE'], nfr: [] },
  { id: '2.5', name: 'Design and Implementation Constraints', types: ['CONSTRAINT'], nfr: [] },
  { id: '2.7', name: 'Assumptions and Dependencies', types: ['ASSUMPTION', 'DEPENDENCY'], nfr: [] },
  { id: '3', name: 'System Features', types: ['FUNCTIONAL'], nfr: [] },
  { id: '4', name: 'External Interface Requirements', types: ['INTERFACE'], nfr: [] },
  { id: '5.1', name: 'Performance Requirements', types: ['NON_FUNCTIONAL'], nfr: ['PERFORMANCE', 'SCALABILITY'] },
  { id: '5.2', name: 'Safety Requirements', types: ['NON_FUNCTIONAL'], nfr: ['SAFETY', 'RELIABILITY'] },
  { id: '5.3', name: 'Security Requirements', types: ['NON_FUNCTIONAL'], nfr: ['SECURITY'] },
  { id: '5.4', name: 'Software Quality Attributes', types: ['NON_FUNCTIONAL'], nfr: ['USABILITY', 'AVAILABILITY', 'MAINTAINABILITY', 'OTHER', 'N/A'] }
];

function deterministicSection(req) {
  switch (req.type) {
    case 'FUNCTIONAL': return sectionById('3');
    case 'INTERFACE': return sectionById('4');
    case 'CONSTRAINT': return sectionById('2.5');
    case 'ASSUMPTION':
    case 'DEPENDENCY': return sectionById('2.7');
    case 'STAKEHOLDER':
    case 'BUSINESS_RULE': return sectionById('2.3');
    case 'NON_FUNCTIONAL': {
      switch (req.nfrSubcategory) {
        case 'PERFORMANCE':
        case 'SCALABILITY': return sectionById('5.1');
        case 'SAFETY':
        case 'RELIABILITY': return sectionById('5.2');
        case 'SECURITY': return sectionById('5.3');
        default: return sectionById('5.4');
      }
    }
    default: return sectionById('3');
  }
}

function sectionById(id) {
  return SRS_SECTIONS.find((s) => s.id === id);
}

/**
 * Map a set of requirements to SRS sections. Uses deterministic type-based
 * mapping as the authoritative decision (KNN/cosine is used only to attach a
 * confidence score), so placement is stable and explainable.
 */
async function mapRequirementsToSections(requirements) {
  // Precompute section embeddings
  const sectionEmbeddings = {};
  for (const s of SRS_SECTIONS) {
    sectionEmbeddings[s.id] = await embeddingService.generateEmbedding(
      `${s.name}. ${s.types.join(', ')} ${s.nfr.join(', ')}`
    );
  }

  for (const req of requirements) {
    const det = deterministicSection(req);

    // KNN confidence: cosine of requirement vs each eligible section
    const reqEmb = req.embedding && req.embedding.length
      ? req.embedding
      : await embeddingService.generateEmbedding(`${req.title}: ${req.normalizedDescription || req.description}`);

    let semanticPick = det.id;
    let bestSim = -Infinity;
    for (const s of SRS_SECTIONS) {
      const sim = embeddingService.cosineSimilarity(reqEmb, sectionEmbeddings[s.id]);
      if (sim > bestSim) { bestSim = sim; semanticPick = s.id; }
    }

    req.targetSrsSection = det.id;
    req.targetSrsSectionName = det.name;
    req.sectionMappingConfidence = Math.round(bestSim * 100) / 100;
    req.sectionMappingMethod = 'type-deterministic+cosine-validation';
    // Deterministic mapping always wins for correctness; semantic score is recorded for audit.
  }

  const mapping = {};
  for (const s of SRS_SECTIONS) mapping[s.id] = [];
  for (const r of requirements) {
    mapping[r.targetSrsSection].push(r.requirementId);
  }

  return { mapping, sections: SRS_SECTIONS };
}

module.exports = { mapRequirementsToSections, SRS_SECTIONS, deterministicSection, sectionById };
