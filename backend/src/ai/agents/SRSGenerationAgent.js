/**
 * Compatibility shim.
 *
 * The single authoritative SRS generation path is the RequirementsPipeline
 * (cluster -> section-map -> section-wise assembly -> language guard -> audit),
 * implemented in src/ai/pipeline/*. This agent delegates to it so there is no
 * second, free-form "generate the whole SRS" path.
 */
const pipeline = require('../pipeline/requirementsPipeline');

class SRSGenerationAgent {
  async generateSRS(project /*, validatedRequirements, ragContext, issues */) {
    const { srs } = await pipeline.generateSRS(project);
    return srs;
  }
}

module.exports = new SRSGenerationAgent();
