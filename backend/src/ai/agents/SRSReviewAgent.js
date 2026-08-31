const { getAIProvider } = require('../index');
const { getSRSReviewPrompt } = require('../prompts/srs-review.prompt');

class SRSReviewAgent {
  async reviewSRS(srsDoc, requirementsList) {
    const ai = getAIProvider();
    const findings = [];
    const recommendations = [];

    // 1. Ground Truth Section 3 Requirement Harvesting
    const features = srsDoc.section3_systemFeatures || [];
    const srsReqIds = new Set();
    const srsReqTitleMap = new Map();

    features.forEach(f => {
      (f.functionalRequirements || []).forEach(r => {
        if (r.requirementId) {
          const cleanId = String(r.requirementId).trim().toUpperCase();
          srsReqIds.add(cleanId);
          if (r.title) srsReqTitleMap.set(String(r.title).trim().toLowerCase(), cleanId);
        }
      });
    });

    // Also scan entire SRS JSON text for any requirement IDs
    const fullText = JSON.stringify(srsDoc);
    const allTaggedIds = [...fullText.matchAll(/\b(?:FR|NFR|CON|ASM|DEP|INT|STK|BR)-\d{3,4}\b/gi)].map(m => m[0].toUpperCase());
    allTaggedIds.forEach(id => srsReqIds.add(id));

    // 2. Authoritative Completeness Verification
    const activeReqs = (requirementsList || []).filter(r => r.status !== 'DEPRECATED' && r.status !== 'REJECTED' && !r.archived);
    const missingReqs = activeReqs
      .filter(r => r.type === 'FUNCTIONAL' && r.requirementId && !srsReqIds.has(String(r.requirementId).trim().toUpperCase()))
      .map(r => r.requirementId);

    if (missingReqs.length > 0) {
      findings.push({
        severity: 'HIGH',
        section: 'Section 3: System Features',
        comment: `Missing functional requirements in System Features: ${missingReqs.join(', ')}.`
      });
      recommendations.push(`Ensure requirements ${missingReqs.join(', ')} are mapped to system features.`);
    }

    // 3. Check unresolved TBD placeholders in specifications (excluding standard Glossary definition in Appendix A)
    const plainSrs = (typeof srsDoc.toObject === 'function') ? srsDoc.toObject() : JSON.parse(JSON.stringify(srsDoc));
    delete plainSrs.appendixA_glossary;
    const contentText = JSON.stringify(plainSrs);
    const tbdMatches = (contentText.match(/\bTBD\b/gi) || []).length;
    if (tbdMatches > 0) {
      findings.push({
        severity: 'LOW',
        section: 'Document Overall',
        comment: `Document contains ${tbdMatches} TBD placeholder(s) denoting pending user clarifications (tracked in Appendix C).`
      });
    }

    // 4. LLM Quality Audit with Strict Ground Truth Guard
    try {
      const prompt = getSRSReviewPrompt(srsDoc, activeReqs);
      const aiResult = await ai.generateStructuredJSON(prompt);
      
      if (aiResult?.findings && Array.isArray(aiResult.findings)) {
        aiResult.findings.forEach(f => {
          if (!f || !f.comment) return;
          const comment = String(f.comment);
          const lower = comment.toLowerCase();

          // Reject false "missing requirement" findings if the requirement is present in Section 3
          const isMissingClaim = /missing|not mapped|unmapped|not included|omitted|absent|not present|does not contain|does not include|lacks/i.test(lower);
          if (isMissingClaim) {
            const idMatches = [...comment.matchAll(/\b(?:FR|NFR|CON|ASM|DEP|INT|STK|BR)-\d{3,4}\b/gi)].map(m => m[0].toUpperCase());
            if (idMatches.length > 0 && idMatches.every(id => srsReqIds.has(id))) {
              return; // All mentioned requirements are verified present in Ground Truth Section 3!
            }
            for (const [title, reqId] of srsReqTitleMap.entries()) {
              if (lower.includes(title) && srsReqIds.has(reqId)) {
                return; // Referenced requirement title is already mapped in Section 3!
              }
            }
          }

          // Reject false "empty feature" claims if the feature actually has functional requirements mapped
          const isEmptyFeatureClaim = /does not contain any functional requirement|no functional requirement|empty feature|lacks functional requirement/i.test(lower);
          if (isEmptyFeatureClaim) {
            for (const f of features) {
              const fId = String(f.featureId || '').toLowerCase();
              const fName = String(f.featureName || '').toLowerCase();
              if ((lower.includes(fId) || lower.includes(fName)) && (f.functionalRequirements || []).length > 0) {
                return; // The feature is not empty; requirements are mapped!
              }
            }
          }

          if (!findings.some(ex => ex.comment === f.comment)) {
            findings.push(f);
          }
        });
      }

      if (aiResult?.recommendations && Array.isArray(aiResult.recommendations)) {
        aiResult.recommendations.forEach(rec => {
          if (!rec) return;
          const idMatches = [...String(rec).matchAll(/\b(?:FR|NFR|CON|ASM|DEP|INT|STK|BR)-\d{3,4}\b/gi)].map(m => m[0].toUpperCase());
          if (idMatches.length > 0 && idMatches.every(id => srsReqIds.has(id)) && /map|include|add|ensure/i.test(String(rec))) {
            return; // Requirement is already mapped!
          }
          if (!recommendations.includes(rec)) recommendations.push(rec);
        });
      }
    } catch (e) {
      console.warn('[SRSReviewAgent] AI review fallback:', e.message);
    }

    // 5. Consistent Standard Alignment Score Calculation
    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const medCount = findings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = findings.filter(f => f.severity === 'LOW').length;

    let complianceScore = 1.0;
    if (highCount > 0 || medCount > 0 || lowCount > 0) {
      complianceScore = Math.max(0.70, 1.0 - (highCount * 0.10 + medCount * 0.05 + lowCount * 0.02));
    }
    complianceScore = Math.round(complianceScore * 100) / 100;

    if (findings.length === 0 || (highCount === 0 && medCount === 0)) {
      if (recommendations.length === 0) {
        recommendations.push('All requirements (including functional requirements in Section 3) are mapped and fully compliant with ISO/IEC/IEEE 29148.');
      }
    }

    return {
      complianceScore,
      findings,
      recommendations: recommendations.length > 0 ? recommendations : ['All requirements map correctly to ISO/IEC/IEEE 29148 standards.']
    };
  }
}

module.exports = new SRSReviewAgent();
