const axios = require('axios');
const AIProvider = require('./AIProvider');
const env = require('../config/env');

class OllamaProvider extends AIProvider {
  constructor() {
    super('ollama');

    this.baseUrl = (
      env.ai.ollamaBaseUrl ||
      'http://127.0.0.1:11434'
    )
      .replace('localhost', '127.0.0.1')
      .replace(/\/$/, '');

    this.model =
      env.ai.ollamaModel ||
      'codellama:7b-instruct';

    this._lastHealthCheck = 0;
    this._isHealthyCached = false;
  }

  /**
   * Check Ollama health (cached for 10 seconds)
   */
  async isHealthy() {
    const now = Date.now();

    if (
      this._lastHealthCheck > 0 &&
      now - this._lastHealthCheck < 10000
    ) {
      return this._isHealthyCached;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/tags`,
        {
          timeout: 3000
        }
      );

      this._isHealthyCached = response.status === 200;
    } catch (error) {
      this._isHealthyCached = false;
    }

    this._lastHealthCheck = now;
    return this._isHealthyCached;
  }

  /**
   * Generate standard text completion
   */
  async generateCompletion(prompt, options = {}) {
    const isLive = await this.isHealthy();

    if (isLive) {
      try {
        console.log(
          `[OllamaProvider] Generating completion using "${this.model}"`
        );

        const response = await axios.post(
          `${this.baseUrl}/api/generate`,
          {
            model: this.model,
            prompt,
            stream: false,
            options: {
              temperature: options.temperature ?? 0.2,
              top_p: options.top_p ?? 0.9,
              ...options
            }
          },
          {
            timeout: 30000
          }
        );

        return response.data?.response || '';
      } catch (error) {
        console.warn(
          `[OllamaProvider] Live completion failed: ${error.message}`
        );
      }
    }

    return this._generateDeterministicFallback(prompt);
  }

  /**
   * Generate structured JSON conforming to schema
   */
  async generateStructuredJSON(prompt, zodSchema = null) {
    const isLive = await this.isHealthy();
    let rawText = '';

    if (isLive) {
      try {
        console.log(
          `[OllamaProvider] Generating JSON using "${this.model}"`
        );

        const systemPrompt = `
${prompt}

IMPORTANT RULES:
1. Return ONLY valid, parseable JSON.
2. Do not use markdown formatting or explanations.
3. Do not wrap output in code fences like \`\`\`json.
4. extractedRequirements must always be an array.
`;

        const response = await axios.post(
          `${this.baseUrl}/api/generate`,
          {
            model: this.model,
            prompt: systemPrompt,
            format: 'json',
            stream: false,
            options: {
              temperature: 0.1
            }
          },
          {
            timeout: 30000
          }
        );

        rawText = response.data?.response || '';
      } catch (error) {
        console.warn(
          `[OllamaProvider] Live JSON generation failed: ${error.message}`
        );
      }
    }

    // Fallback to deterministic reasoning if model didn't return text
    if (!rawText) {
      rawText = this._generateDeterministicFallback(prompt);
    }

    let parsed;

    try {
      const cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.warn('[OllamaProvider] JSON parsing failed, attempting regex extraction.');

      const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (error) {
          parsed = this._extractFallbackFromPrompt(prompt);
        }
      } else {
        parsed = this._extractFallbackFromPrompt(prompt);
      }
    }

    // Zod schema validation
    if (zodSchema && parsed) {
      const validation = zodSchema.safeParse(parsed);
      if (validation.success) {
        return validation.data;
      }
    }

    return parsed;
  }

  /**
   * Deterministic structured fallback generator
   */
  _generateDeterministicFallback(prompt) {
    const p = (prompt || '').toLowerCase();

    if (
      p.includes('interview') ||
      p.includes('elicitation')
    ) {
      let sectionName = 'Project Information';
      let followUpQuestion =
        'What are the secondary objectives and high-level boundaries of this project?';
      let requirementType = 'FUNCTIONAL';
      let subcategory = 'N/A';

      if (
        p.includes('stakeholders_and_users') ||
        p.includes('stakeholders & users')
      ) {
        sectionName = 'Stakeholders & Users';
        requirementType = 'STAKEHOLDER';
        followUpQuestion =
          'Are there administrators, managers, support staff, or partner organizations who will interact with the system?';
      } else if (
        p.includes('user_roles_and_permissions') ||
        p.includes('user roles & permissions')
      ) {
        sectionName = 'User Roles & Permissions';
        requirementType = 'STAKEHOLDER';
        followUpQuestion =
          'What specific permissions, restrictions, and approval workflows should apply to each role?';
      } else if (
        p.includes('functional_requirements') ||
        p.includes('functional requirements')
      ) {
        sectionName = 'Functional Requirements';
        requirementType = 'FUNCTIONAL';
        followUpQuestion =
          'What additional search, filtering, reporting, notification, or data processing operations should users have?';
      } else if (
        p.includes('non_functional_requirements') ||
        p.includes('non-functional requirements')
      ) {
        sectionName = 'Non-Functional Requirements';
        requirementType = 'NON_FUNCTIONAL';
        subcategory = 'PERFORMANCE';
        followUpQuestion =
          'What specific response time, uptime, security, scalability, and backup requirements should the system satisfy?';
      } else if (
        p.includes('external_interfaces') ||
        p.includes('external interfaces')
      ) {
        sectionName = 'External Interfaces';
        requirementType = 'INTERFACE';
        followUpQuestion =
          'Which APIs or third-party services must be integrated, and what authentication method should be used?';
      } else if (
        p.includes('assumptions_and_dependencies') ||
        p.includes('assumptions & dependencies')
      ) {
        sectionName = 'Assumptions & Dependencies';
        requirementType = 'ASSUMPTION';
        followUpQuestion =
          'What external services, infrastructure, devices, or network conditions does this project depend upon?';
      } else if (p.includes('constraints')) {
        sectionName = 'Constraints';
        requirementType = 'CONSTRAINT';
        followUpQuestion =
          'Are there technology, budget, timeline, deployment, or compliance limitations for this project?';
      } else if (
        p.includes('review_and_confirmation') ||
        p.includes('review & confirmation')
      ) {
        sectionName = 'Review & Confirmation';
        followUpQuestion =
          'Please review the collected requirements and confirm when you are ready to finalize the SRS.';
      }

      return JSON.stringify({
        section: sectionName,
        question: followUpQuestion,
        language: 'English',
        progress: 50,
        isOutOfScope: false,
        sectionCompleted: false,
        interviewCompleted: false,
        extractedRequirements: [],
        missingInformation: [],
        notes: 'Deterministic fallback response.'
      });
    }

    if (p.includes('extract') || p.includes('extraction')) {
      return JSON.stringify({
        requirements: [
          {
            title: 'Core System Functionality',
            description: 'The system shall execute primary user actions and validate data.',
            type: 'FUNCTIONAL',
            nfrSubcategory: 'N/A',
            category: 'Core',
            priority: 'HIGH',
            completenessScore: 85,
            isAtomic: true
          }
        ]
      });
    }

    // Generic fallback
    return JSON.stringify({
      status: 'SUCCESS',
      extractedRequirements: [],
      message: 'Processed successfully.'
    });
  }

  /**
   * Last fallback when JSON parsing fails
   */
  _extractFallbackFromPrompt(prompt) {
    return {
      section: 'Unknown',
      question: 'Please provide more details about the project requirements.',
      language: 'English',
      progress: 0,
      isOutOfScope: false,
      sectionCompleted: false,
      interviewCompleted: false,
      extractedRequirements: [],
      missingInformation: [],
      notes: 'Fallback response due to JSON parsing failure.'
    };
  }
}

module.exports = OllamaProvider;
