const { getAIProvider } = require('../index');
const { getAnalysisPrompt } = require('../prompts/analysis.prompt');
const embeddingService = require('../EmbeddingService');

class RequirementAnalysisAgent {
  async analyzeRequirements(requirementsList) {
    const ai = getAIProvider();
    const issues = [];

    // 1. Semantic Duplicate Detection via Vector Cosine Similarity
    const reqEmbeddings = [];
    for (const req of requirementsList) {
      const emb = req.embedding?.length === 384
        ? req.embedding
        : await embeddingService.generateEmbedding(`${req.title}: ${req.description}`);
      reqEmbeddings.push({ req, emb });
    }

    for (let i = 0; i < reqEmbeddings.length; i++) {
      for (let j = i + 1; j < reqEmbeddings.length; j++) {
        const itemA = reqEmbeddings[i];
        const itemB = reqEmbeddings[j];
        const sim = embeddingService.cosineSimilarity(itemA.emb, itemB.emb);

        if (sim >= 0.75) {
          issues.push({
            issueType: 'DUPLICATE',
            severity: sim >= 0.9 ? 'HIGH' : 'MEDIUM',
            description: `Potential semantic duplicate between ${itemA.req.requirementId} ("${itemA.req.title}") and ${itemB.req.requirementId} ("${itemB.req.title}") with ${(sim * 100).toFixed(1)}% similarity.`,
            relatedRequirementIds: [itemA.req.requirementId, itemB.req.requirementId],
            similarityScore: Math.round(sim * 100) / 100,
            suggestedResolution: `Merge into a unified specification or differentiate functionality.`
          });
        }
      }
    }

    // 2. Ambiguity & Quality Heuristic Analysis
    const vagueWords = ['fast', 'user-friendly', 'flexible', 'robust', 'seamless', 'efficient', 'optimal', 'scalable'];
    for (const req of requirementsList) {
      const textLower = req.description.toLowerCase();
      const detectedVague = vagueWords.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(textLower));

      if (detectedVague.length > 0) {
        issues.push({
          issueType: 'AMBIGUITY',
          severity: 'MEDIUM',
          description: `Requirement contains non-measurable qualitative terms: "${detectedVague.join(', ')}". According to ISO/IEC/IEEE 29148, requirements must be testable and verifiable.`,
          relatedRequirementIds: [req.requirementId],
          suggestedResolution: `Replace "${detectedVague[0]}" with measurable criteria (e.g., "respond within 500ms at 95th percentile").`
        });
      }
    }

    // 3. AI-Driven Semantic Analysis (Conflict & Incompleteness)
    if (requirementsList.length > 0) {
      try {
        const prompt = getAnalysisPrompt(requirementsList);
        const aiResult = await ai.generateStructuredJSON(prompt);
        if (aiResult?.issues && Array.isArray(aiResult.issues)) {
          for (const aiIssue of aiResult.issues) {
            // Avoid exact duplicate issue descriptions
            if (!issues.some(ex => ex.description === aiIssue.description)) {
              issues.push({
                issueType: aiIssue.issueType || 'CONFLICT',
                severity: aiIssue.severity || 'MEDIUM',
                description: aiIssue.description,
                relatedRequirementIds: aiIssue.relatedRequirementIds || [],
                suggestedResolution: aiIssue.suggestedResolution || ''
              });
            }
          }
        }
      } catch (err) {
        console.warn('[RequirementAnalysisAgent] AI analysis heuristic fallback:', err.message);
      }
    }

    return issues;
  }
}

module.exports = new RequirementAnalysisAgent();
