/**
 * Compatibility shim.
 *
 * The single authoritative extraction path is the RequirementsPipeline
 * (src/ai/pipeline/requirementsPipeline.js). This agent delegates to it so no
 * duplicate extraction logic remains.
 */
const pipeline = require('../pipeline/requirementsPipeline');
const { SECTIONS_CONFIG } = require('../../constants/interviewSections');

class RequirementExtractionAgent {
  /**
   * Extract normalized, atomic requirements from free text. Raw text is never
   * copied — the pipeline normalizes it to formal English statements.
   */
  async extractRequirements(text, project) {
    const functionalSection = SECTIONS_CONFIG.find((s) => s.id === 'FUNCTIONAL_REQUIREMENTS');
    const analysis = await pipeline.analyzeAnswer({
      rawText: text,
      project,
      sectionConfig: functionalSection,
      existingRequirements: []
    });
    if (analysis.isOutOfScope) return [];
    return analysis.requirements.map((r) => ({
      title: r.title,
      normalizedDescription: r.normalizedDescription,
      description: r.normalizedDescription,
      type: r.type,
      nfrSubcategory: r.nfrSubcategory || 'N/A',
      category: r.category,
      priority: r.priority,
      status: r.status,
      ambiguityFlags: r.ambiguityFlags || [],
      clarificationQuestion: r.clarificationQuestion || '',
      rawSourceText: analysis.rawSourceText,
      sourceLanguage: analysis.language?.language || 'English',
      confidence: r.confidence || 0.85
    }));
  }
}

module.exports = new RequirementExtractionAgent();
