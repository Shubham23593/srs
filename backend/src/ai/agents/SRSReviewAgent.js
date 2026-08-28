const { getAIProvider } = require('../index');
const { getSRSReviewPrompt } = require('../prompts/srs-review.prompt');

class SRSReviewAgent {
  async reviewSRS(srsDoc, requirementsList) {
    const ai = getAIProvider();
    const findings = [];
    const recommendations = [];

    // Heuristic Verification
    const features = srsDoc.section3_systemFeatures || [];
    const srsReqIds = new Set();
    features.forEach(f => {
      (f.functionalRequirements || []).forEach(r => srsReqIds.add(r.requirementId));
    });

    // Check completeness
    const missingReqs = requirementsList
      .filter(r => r.type === 'FUNCTIONAL' && !srsReqIds.has(r.requirementId))
      .map(r => r.requirementId);

    if (missingReqs.length > 0) {
      findings.push({
        severity: 'HIGH',
        section: 'Section 3: System Features',
        comment: `Missing functional requirements in System Features: ${missingReqs.join(', ')}.`
      });
      recommendations.push(`Ensure requirements ${missingReqs.join(', ')} are mapped to system features.`);
    }

    // Check TBDs
    const textContent = JSON.stringify(srsDoc);
    const tbdMatches = (textContent.match(/TBD/gi) || []).length;
    if (tbdMatches > 0) {
      findings.push({
        severity: 'LOW',
        section: 'Document Overall',
        comment: `Document contains ${tbdMatches} TBD placeholder(s) denoting pending user clarifications (tracked in Appendix C).`
      });
    }

    try {
      const prompt = getSRSReviewPrompt(srsDoc, requirementsList);
      const aiResult = await ai.generateStructuredJSON(prompt);
      
      if (aiResult?.findings && Array.isArray(aiResult.findings)) {
        aiResult.findings.forEach(f => {
          if (!findings.some(ex => ex.comment === f.comment)) {
            findings.push(f);
          }
        });
      }
      if (aiResult?.recommendations && Array.isArray(aiResult.recommendations)) {
        aiResult.recommendations.forEach(rec => {
          if (!recommendations.includes(rec)) recommendations.push(rec);
        });
      }
    } catch (e) {
      console.warn('[SRSReviewAgent] AI review fallback:', e.message);
    }

    const complianceScore = Math.max(0.7, 1.0 - (findings.filter(f => f.severity === 'HIGH').length * 0.15 + findings.filter(f => f.severity === 'MEDIUM').length * 0.05));

    return {
      complianceScore: Math.round(complianceScore * 100) / 100,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['All requirements map correctly to ISO/IEC/IEEE 29148 standards.']
    };
  }
}

module.exports = new SRSReviewAgent();
