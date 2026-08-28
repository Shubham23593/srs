const { z } = require('zod');
const { getAIProvider } = require('../index');
const { getSRSGenerationPrompt } = require('../prompts/srs-generation.prompt');
const { sanitizeAndValidateSRS, groupIntoSystemFeatures } = require('../../services/srsSanitizerAndValidator');
const { normalizeRequirementStatement } = require('../../services/requirementGrammarValidator');

// Zod Schema to validate generated SRS structure strictly
const SRSSchemaValidator = z.object({
  metadata: z.object({
    title: z.string(),
    preparedBy: z.string(),
    organization: z.string(),
    date: z.string()
  }),
  section1_introduction: z.object({
    purpose: z.string(),
    documentConventions: z.string(),
    intendedAudience: z.string(),
    projectScope: z.string(),
    references: z.array(z.string())
  }),
  section2_overallDescription: z.object({
    productPerspective: z.string(),
    productFeatures: z.string(),
    userClassesAndCharacteristics: z.string(),
    operatingEnvironment: z.string(),
    designAndImplementationConstraints: z.string(),
    userDocumentation: z.string(),
    assumptionsAndDependencies: z.string()
  }),
  section3_systemFeatures: z.array(z.object({
    featureId: z.string(),
    featureName: z.string(),
    descriptionAndPriority: z.string(),
    stimulusResponseSequences: z.array(z.string()),
    functionalRequirements: z.array(z.object({
      requirementId: z.string(),
      title: z.string(),
      statement: z.string()
    }))
  })),
  section4_externalInterfaceRequirements: z.object({
    userInterfaces: z.string(),
    hardwareInterfaces: z.string(),
    softwareInterfaces: z.string(),
    communicationsInterfaces: z.string()
  }),
  section5_otherNonfunctionalRequirements: z.object({
    performanceRequirements: z.string(),
    safetyRequirements: z.string(),
    securityRequirements: z.string(),
    softwareQualityAttributes: z.string()
  }),
  section6_otherRequirements: z.object({
    content: z.string()
  }),
  appendixA_glossary: z.array(z.object({
    term: z.string(),
    definition: z.string()
  })),
  appendixB_analysisModels: z.object({
    diagramTypes: z.array(z.string()).optional(),
    description: z.string().optional()
  }).optional(),
  appendixC_issuesList: z.array(z.object({
    issueId: z.string(),
    description: z.string(),
    relatedRequirement: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional()
  })).optional()
});

class SRSGenerationAgent {
  /**
   * Generate complete ISO/IEC/IEEE 29148 & IEEE 830 compliant SRS from structured requirements
   */
  async generateSRS(project, validatedRequirements, ragContext = '', issues = []) {
    const ai = getAIProvider();
    // Filter only active requirements (strictly exclude deprecated)
    const activeReqs = validatedRequirements.filter(r => r.status !== 'DEPRECATED');
    
    const prompt = getSRSGenerationPrompt(project, activeReqs, ragContext);
    
    let generated = null;
    try {
      generated = await ai.generateStructuredJSON(prompt, SRSSchemaValidator);
    } catch (e) {
      console.warn('[SRSGenerationAgent] AI structure generation fallback:', e.message);
    }

    // Programmatically enforce sanitization, zero-hallucination, and ISO 29148 normalization
    const { sanitizedSRS } = sanitizeAndValidateSRS(generated, project, activeReqs, issues);
    return sanitizedSRS;
  }

  /**
   * Helper to group requirements into features (exported for synchronization services)
   */
  _groupRequirementsIntoFeatures(functionalReqs, project = { projectName: 'System' }) {
    return groupIntoSystemFeatures(functionalReqs, project);
  }
}

module.exports = new SRSGenerationAgent();
