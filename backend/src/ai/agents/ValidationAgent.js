const { getAIProvider } = require('../index');
const { getValidationPrompt } = require('../prompts/validation.prompt');
const { assessProjectRelevance } = require('../pipeline/contextRelevanceEngine');

class ValidationAgent {
  /**
   * Validate requirement against ISO/IEC/IEEE 29148 criteria and project context.
   */
  async validateRequirement(requirement, project = null) {
    const ai = getAIProvider();
    const desc = requirement.normalizedDescription || requirement.description || '';
    
    // 1. Evaluate Project Context Relevance (Priority 4)
    let relevance = { status: 'RELEVANT', score: 1.0, reason: 'Relevant to project context.' };
    if (project) {
      try {
        relevance = await assessProjectRelevance(requirement, project);
      } catch (e) {
        console.warn('[ValidationAgent] Relevance check warning:', e.message);
      }
    }

    // 2. Heuristic ISO 29148 Dimension Analysis
    const vagueWords = ['fast', 'user-friendly', 'flexible', 'robust', 'seamless', 'quick', 'easy', 'efficient', 'good'];
    const hasVague = vagueWords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(desc));
    const isVeryShort = desc.trim().split(/\s+/).length < 4;
    const isFormal = /the system shall|shall allow|shall provide|shall maintain|shall support|shall enforce/i.test(desc);

    const issues = [];
    if (hasVague) issues.push('Contains ambiguous/non-quantified language (e.g. fast, user-friendly).');
    if (isVeryShort) issues.push('Description is underspecified or incomplete.');
    if (!isFormal) issues.push('Does not adhere to formal ISO 29148 "The system shall..." grammar structure.');
    if (relevance.status === 'CONTEXT_MISMATCH') {
      issues.push(`Project Context Mismatch: ${relevance.reason}`);
    }

    const validationDimensions = {
      specific: !hasVague,
      complete: !isVeryShort && desc.length >= 20,
      unambiguous: !hasVague,
      consistent: true,
      feasible: true,
      verifiable: !hasVague,
      necessary: true,
      traceable: Boolean(requirement.requirementId),
      measurable: requirement.type === 'NON_FUNCTIONAL' ? !hasVague : true,
      projectContextRelevance: relevance.status !== 'CONTEXT_MISMATCH'
    };

    let validationStatus = 'VALID';
    if (relevance.status === 'CONTEXT_MISMATCH') {
      validationStatus = 'NEEDS_REVIEW';
    } else if (hasVague || isVeryShort || !isFormal) {
      validationStatus = 'NEEDS_REVIEW';
    }

    let suggestedImprovement = `The system shall ensure that ${requirement.title.toLowerCase()} executes with verified compliance metrics.`;

    // Attempt AI-assisted refinement if requirement has issues and AI is live
    if (validationStatus !== 'VALID') {
      try {
        if (ai && (await ai.isHealthy())) {
          const prompt = getValidationPrompt(requirement);
          const result = await ai.generateStructuredJSON(prompt);
          if (result) {
            if (['VALID', 'NEEDS_REVIEW', 'INVALID'].includes(result.validationStatus)) {
              if (relevance.status !== 'CONTEXT_MISMATCH') {
                validationStatus = result.validationStatus;
              }
            }
            if (Array.isArray(result.issues) && result.issues.length) {
              issues.push(...result.issues);
            }
            if (result.suggestedImprovement) {
              suggestedImprovement = result.suggestedImprovement;
            }
          }
        }
      } catch (err) {
        // Fall back to deterministic validation
      }
    }

    return {
      validationStatus,
      contextRelevance: relevance,
      validationDimensions,
      issues: Array.from(new Set(issues)),
      suggestedImprovement
    };
  }

  /**
   * Generate an alternative refined formulation for a requirement (Priority 8).
   */
  async generateAlternativeSuggestion(requirement, project = null) {
    const ai = getAIProvider();
    const currentDesc = requirement.normalizedDescription || requirement.description || '';
    const projName = project?.projectName || 'the system';

    if (ai && (await ai.isHealthy())) {
      try {
        const prompt = `As a Senior Requirements Engineer (ISO/IEC/IEEE 29148), generate a high-quality, unambiguous, formal alternative statement for this requirement in ${projName}:
Requirement ID: ${requirement.requirementId}
Title: ${requirement.title}
Current Statement: "${currentDesc}"
Type: ${requirement.type}

Respond ONLY with a JSON object:
{
  "alternativeSuggestion": "The system shall ...",
  "rationale": "Why this alternative improves specificity and testability."
}`;
        const result = await ai.generateStructuredJSON(prompt);
        if (result?.alternativeSuggestion) {
          return result;
        }
      } catch (e) {
        console.warn('[ValidationAgent] AI alternative suggestion failed:', e.message);
      }
    }

    // Deterministic fallback
    return {
      alternativeSuggestion: `The system shall provide authorized users with the capability to ${requirement.title.toLowerCase()} within 2.0 seconds with full audit logging.`,
      rationale: 'Formal ISO-standard phrasing with measurable execution and logging constraints.'
    };
  }
}

module.exports = new ValidationAgent();
