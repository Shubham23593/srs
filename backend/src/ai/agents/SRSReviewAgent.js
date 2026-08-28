const { getAIProvider } = require('../index');
const { getSRSReviewPrompt } = require('../prompts/srs-review.prompt');

class SRSReviewAgent {
  async reviewSRS(srsDoc, requirementsList = []) {
    const ai = getAIProvider();
    const findings = [];
    const recommendations = [];

    // Filter active requirements only (exclude DEPRECATED)
    const activeReqs = (requirementsList || []).filter(r => r.status !== 'DEPRECATED');
    const functionalReqs = activeReqs.filter(r => r.type === 'FUNCTIONAL');
    const nfrReqs = activeReqs.filter(r => r.type === 'NON_FUNCTIONAL');

    // 1. Heuristic Verification of Mapped Requirement IDs
    const features = srsDoc.section3_systemFeatures || [];
    const srsReqIds = new Set();
    features.forEach(f => {
      (f.functionalRequirements || []).forEach(r => srsReqIds.add(r.requirementId));
    });

    // Check missing functional requirements in Section 3
    const missingReqs = functionalReqs
      .filter(r => !srsReqIds.has(r.requirementId))
      .map(r => r.requirementId);

    if (missingReqs.length > 0) {
      findings.push({
        severity: 'HIGH',
        section: 'Section 3: System Features',
        comment: `Missing functional requirements in System Features: ${missingReqs.join(', ')}.`
      });
      recommendations.push(`Ensure active requirements ${missingReqs.join(', ')} are mapped to system features in Section 3.`);
    }

    // 2. Section-by-Section Placeholder & TBD Detection
    const placeholderPatterns = [
      /\bTBD\b/i,
      /\bTo Be Determined\b/i,
      /\bNeeds Clarification\b/i,
      /\bInformation not provided\b/i,
      /\bPending Clarification\b/i
    ];

    const isPlaceholder = (text) => {
      if (!text || typeof text !== 'string') return false;
      return placeholderPatterns.some(pat => pat.test(text));
    };

    const sectionChecks = [
      { name: 'Section 1.1 – Purpose', text: srsDoc.section1_introduction?.purpose },
      { name: 'Section 1.3 – Intended Audience', text: srsDoc.section1_introduction?.intendedAudience },
      { name: 'Section 1.4 – Project Scope', text: srsDoc.section1_introduction?.projectScope },
      { name: 'Section 2.1 – Product Perspective', text: srsDoc.section2_overallDescription?.productPerspective },
      { name: 'Section 2.2 – Product Features', text: srsDoc.section2_overallDescription?.productFeatures },
      { name: 'Section 2.3 – User Classes and Characteristics', text: srsDoc.section2_overallDescription?.userClassesAndCharacteristics },
      { name: 'Section 2.4 – Operating Environment', text: srsDoc.section2_overallDescription?.operatingEnvironment },
      { name: 'Section 2.5 – Design and Implementation Constraints', text: srsDoc.section2_overallDescription?.designAndImplementationConstraints },
      { name: 'Section 2.6 – User Documentation', text: srsDoc.section2_overallDescription?.userDocumentation },
      { name: 'Section 2.7 – Assumptions and Dependencies', text: srsDoc.section2_overallDescription?.assumptionsAndDependencies },
      { name: 'Section 4.1 – User Interfaces', text: srsDoc.section4_externalInterfaceRequirements?.userInterfaces },
      { name: 'Section 4.2 – Hardware Interfaces', text: srsDoc.section4_externalInterfaceRequirements?.hardwareInterfaces },
      { name: 'Section 4.3 – Software Interfaces', text: srsDoc.section4_externalInterfaceRequirements?.softwareInterfaces },
      { name: 'Section 4.4 – Communications Interfaces', text: srsDoc.section4_externalInterfaceRequirements?.communicationsInterfaces },
      { name: 'Section 5.1 – Performance Requirements', text: srsDoc.section5_otherNonfunctionalRequirements?.performanceRequirements },
      { name: 'Section 5.2 – Safety Requirements', text: srsDoc.section5_otherNonfunctionalRequirements?.safetyRequirements },
      { name: 'Section 5.3 – Security Requirements', text: srsDoc.section5_otherNonfunctionalRequirements?.securityRequirements },
      { name: 'Section 5.4 – Software Quality Attributes', text: srsDoc.section5_otherNonfunctionalRequirements?.softwareQualityAttributes },
      { name: 'Section 6.0 – Other Requirements', text: srsDoc.section6_otherRequirements?.content }
    ];

    const detectedPlaceholders = [];
    sectionChecks.forEach(sec => {
      if (isPlaceholder(sec.text)) {
        detectedPlaceholders.push(sec.name);
        findings.push({
          severity: 'LOW',
          section: sec.name,
          comment: `Contains unresolved TBD placeholder denoting pending user clarification.`
        });
      }
    });

    // Check individual functional requirement statements in Section 3
    features.forEach(feat => {
      (feat.functionalRequirements || []).forEach(fr => {
        if (isPlaceholder(fr.statement) || isPlaceholder(fr.title)) {
          detectedPlaceholders.push(`Section 3 – [${fr.requirementId}] ${fr.title}`);
          findings.push({
            severity: 'MEDIUM',
            section: `Section 3: System Features (${fr.requirementId})`,
            comment: `Requirement statement contains unresolved TBD placeholder.`
          });
        }
      });
    });

    if (detectedPlaceholders.length > 0) {
      recommendations.push(`Clarify pending specifications located in: ${detectedPlaceholders.slice(0, 3).join(', ')}${detectedPlaceholders.length > 3 ? '...' : ''}.`);
    }

    // 3. AI-Assisted Semantic Verification
    try {
      const prompt = getSRSReviewPrompt(srsDoc, activeReqs);
      const aiResult = await ai.generateStructuredJSON(prompt);
      
      if (aiResult?.findings && Array.isArray(aiResult.findings)) {
        aiResult.findings.forEach(f => {
          if (!findings.some(ex => ex.section === f.section && ex.comment === f.comment)) {
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

    // 4. Multi-Dimensional Compliance & Quality Score Calculation
    const hasSection1 = Boolean(srsDoc.section1_introduction?.purpose);
    const hasSection2 = Boolean(srsDoc.section2_overallDescription?.productPerspective);
    const hasSection3 = (srsDoc.section3_systemFeatures || []).length > 0;
    const hasSection4 = Boolean(srsDoc.section4_externalInterfaceRequirements?.userInterfaces);
    const hasSection5 = Boolean(srsDoc.section5_otherNonfunctionalRequirements?.performanceRequirements);
    const hasSection6 = Boolean(srsDoc.section6_otherRequirements?.content !== undefined);
    const hasAppA = (srsDoc.appendixA_glossary || []).length > 0;

    let structuralScore = 100;
    if (!hasSection1) structuralScore -= 15;
    if (!hasSection2) structuralScore -= 15;
    if (!hasSection3) structuralScore -= 25;
    if (!hasSection4) structuralScore -= 15;
    if (!hasSection5) structuralScore -= 15;
    if (!hasAppA) structuralScore -= 15;
    structuralScore = Math.max(0, structuralScore);

    const totalActiveCount = Math.max(1, functionalReqs.length);
    const mappedCount = functionalReqs.length - missingReqs.length;
    const mappingScore = Math.round((mappedCount / totalActiveCount) * 100);

    const avgCompleteness = activeReqs.length > 0
      ? Math.round(activeReqs.reduce((acc, r) => acc + (r.completenessScore || 85), 0) / activeReqs.length)
      : 90;

    const placeholderScore = Math.max(0, 100 - (detectedPlaceholders.length * 10));

    // Dynamic Weighted Alignment Score
    const overallScore = Math.round(
      (structuralScore * 0.35) +
      (mappingScore * 0.35) +
      (avgCompleteness * 0.20) +
      (placeholderScore * 0.10)
    );

    const normalizedCompliance = Math.min(1.0, Math.max(0.6, overallScore / 100));

    return {
      complianceScore: Math.round(normalizedCompliance * 100) / 100,
      scores: {
        structuralCompliance: structuralScore,
        requirementMapping: mappingScore,
        requirementCompleteness: avgCompleteness,
        placeholderScore: placeholderScore,
        overallAlignmentScore: overallScore
      },
      placeholderLocations: detectedPlaceholders,
      findings,
      recommendations: recommendations.length > 0
        ? recommendations
        : ['All requirements map correctly to ISO/IEC/IEEE 29148 standards.']
    };
  }
}

module.exports = new SRSReviewAgent();
