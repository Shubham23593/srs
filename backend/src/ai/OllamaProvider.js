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
      this._lastError = error.message;
    }

    this._lastHealthCheck = now;
    return this._isHealthyCached;
  }

  /**
   * Perform live health check against Ollama API (tags + running models via /api/ps)
   */
  async checkLiveHealth() {
    const startTime = Date.now();
    let online = false;
    let installedModels = [];
    let runningModels = [];
    let errorMsg = null;

    try {
      const [tagsRes, psRes] = await Promise.allSettled([
        axios.get(`${this.baseUrl}/api/tags`, { timeout: 2500 }),
        axios.get(`${this.baseUrl}/api/ps`, { timeout: 2500 })
      ]);

      if (tagsRes.status === 'fulfilled' && tagsRes.value?.status === 200) {
        online = true;
        installedModels = (tagsRes.value.data?.models || []).map((m) => m.name || m.model);
      }

      if (psRes.status === 'fulfilled' && psRes.value?.status === 200) {
        runningModels = (psRes.value.data?.models || []).map((m) => m.name || m.model);
      }

      this._isHealthyCached = online;
      this._lastHealthCheck = Date.now();
      if (!online && tagsRes.status === 'rejected') {
        errorMsg = tagsRes.reason?.message || 'Connection refused';
        this._lastError = errorMsg;
      }
    } catch (err) {
      online = false;
      this._isHealthyCached = false;
      errorMsg = err.message;
      this._lastError = errorMsg;
    }

    const latencyMs = Date.now() - startTime;
    const modelLower = (this.model || '').toLowerCase().trim();
    const cleanModel = modelLower.replace(/:latest$/, '');
    
    const isModelMatch = (mName) => {
      const clean = (mName || '').toLowerCase().trim().replace(/:latest$/, '');
      return clean === cleanModel || clean.split(':')[0] === cleanModel.split(':')[0] && (clean === cleanModel || clean.startsWith(cleanModel));
    };

    const modelInstalled = installedModels.some(isModelMatch);
    const modelRunning = runningModels.some(isModelMatch);

    return {
      provider: 'ollama',
      status: online ? 'ONLINE' : 'OFFLINE',
      connected: online,
      baseUrl: this.baseUrl,
      configuredModel: this.model,
      model: this.model,
      modelInstalled,
      modelRunning,
      installedModels,
      runningModels,
      lastRequestStatus: this._lastRequestStatus || (online ? 'READY' : 'OFFLINE'),
      lastResponseTimeMs: this._lastResponseTimeMs || latencyMs,
      latencyMs,
      lastError: errorMsg || this._lastError || null
    };
  }

  /**
   * Get real-time health and telemetry details (Priority 11)
   */
  getHealthDetails() {
    return {
      provider: 'ollama',
      status: this._isHealthyCached ? 'ONLINE' : 'OFFLINE',
      connected: this._isHealthyCached,
      baseUrl: this.baseUrl,
      configuredModel: this.model,
      model: this.model,
      modelInstalled: this._isHealthyCached,
      modelRunning: false,
      installedModels: [],
      runningModels: [],
      lastRequestStatus: this._lastRequestStatus || 'IDLE',
      lastResponseTimeMs: this._lastResponseTimeMs || 0,
      latencyMs: 0,
      lastError: this._lastError || null
    };
  }

  /**
   * Generate standard text completion.
   * Bounded timeout + at most one safe retry; on failure returns an EMPTY
   * string (never fabricated content) so the caller uses its deterministic
   * question bank. An empty string is the "no AI output" contract.
   */
  async generateCompletion(prompt, options = {}) {
    const startTime = Date.now();
    const timeoutMs = options.timeout || env.ai?.ollamaTimeout || 45000;
    const maxRetries = options.retries ?? 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const isLive = await this.isHealthy();
      if (!isLive) break; // provider down -> no waiting; deterministic fallback
      try {
        if (attempt > 0) console.warn(`[OllamaProvider] completion retry ${attempt}/${maxRetries}`);
        const { temperature, topP, retries, timeout, ...restOptions } = options;
        const response = await axios.post(
          `${this.baseUrl}/api/generate`,
          {
            model: this.model,
            prompt,
            stream: false,
            options: {
              temperature: temperature ?? 0.2,
              top_p: topP ?? 0.9,
              ...restOptions
            }
          },
          { timeout: timeoutMs }
        );

        this._lastRequestStatus = 'SUCCESS';
        this._lastResponseTimeMs = Date.now() - startTime;
        this._lastError = null;
        return response.data?.response || '';
      } catch (error) {
        this._lastRequestStatus = 'FAILED';
        this._lastResponseTimeMs = Date.now() - startTime;
        this._lastError = error.message;
        console.warn(`[OllamaProvider] Live completion failed (attempt ${attempt + 1}): ${error.message}`);
        if (!error.code && !(error.response && error.response.status >= 500)) break;
      }
    }

    // Empty string = "AI unavailable"; callers fall back to deterministic text.
    this._lastRequestStatus = 'FALLBACK';
    this._lastResponseTimeMs = Date.now() - startTime;
    return '';
  }

  /**
   * Generate structured JSON conforming to schema.
   *
   * SAFETY: LLM output is treated as UNTRUSTED. On timeout, connection error,
   * malformed JSON, or schema mismatch the method returns a structured
   * `{ providerFailed: true, requirements: [] }` marker instead of fabricating
   * data. Callers detect `providerFailed` and route to the deterministic engine
   * (an AI failure is NEVER misreported as a valid-but-empty user answer, nor as
   * invalid user input).
   */
  async generateStructuredJSON(prompt, zodSchema = null, options = {}) {
    const startTime = Date.now();
    const timeoutMs = options.timeout || env.ai?.ollamaTimeout || 45000;
    const maxRetries = options.retries ?? 1; // bounded: at most one safe retry
    let rawText = '';
    let lastErr = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const isLive = await this.isHealthy();
      if (!isLive) break; // provider down -> deterministic path, no infinite wait
      try {
        if (attempt > 0) console.warn(`[OllamaProvider] JSON generation retry ${attempt}/${maxRetries}`);
        const systemPrompt = `${prompt}\n\nIMPORTANT RULES:\n1. Return ONLY valid, parseable JSON.\n2. Do not use markdown formatting or explanations.\n3. Do not wrap output in code fences.\n4. Never invent features, metrics, stakeholders, or requirements not present in the user answer.\n5. If the answer contains no requirement, return {"requirements": []}.`;

        const response = await axios.post(
          `${this.baseUrl}/api/generate`,
          {
            model: this.model,
            prompt: systemPrompt,
            format: 'json',
            stream: false,
            options: { temperature: 0.1 }
          },
          { timeout: timeoutMs }
        );

        rawText = response.data?.response || '';
        this._lastRequestStatus = 'SUCCESS';
        this._lastResponseTimeMs = Date.now() - startTime;
        this._lastError = null;
        break;
      } catch (error) {
        lastErr = error;
        this._lastRequestStatus = 'FAILED';
        this._lastResponseTimeMs = Date.now() - startTime;
        this._lastError = error.message;
        console.warn(`[OllamaProvider] Live JSON generation failed (attempt ${attempt + 1}): ${error.message}`);
        rawText = '';
        // Retry only on transient 5xx/timeout; do not retry on a hard config error.
        if (!error.code && !(error.response && error.response.status >= 500)) break;
      }
    }

    // No usable LLM text -> signal failure explicitly (NO fabrication).
    if (!rawText || !rawText.trim()) {
      this._lastRequestStatus = this._lastRequestStatus === 'FAILED' ? 'FAILED' : 'FALLBACK';
      return { providerFailed: true, requirements: [], reason: lastErr ? lastErr.message : 'no-output' };
    }

    let parsed = null;
    try {
      const cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
      }
      if (!parsed) {
        console.warn('[OllamaProvider] JSON parsing failed; returning providerFailed marker (no fabrication).');
        return { providerFailed: true, parseFailed: true, requirements: [] };
      }
    }

    // Zod schema validation when provided.
    if (zodSchema && parsed) {
      const validation = zodSchema.safeParse(parsed);
      if (validation.success) return validation.data;
      console.warn('[OllamaProvider] Schema validation failed; using deterministic engine.');
      return { providerFailed: true, schemaFailed: true, requirements: [] };
    }

    // Normalize: ensure requirements is an array and every entry has the
    // minimum fields; drop any entry lacking a statement so nothing malformed
    // reaches persistence.
    if (parsed && Array.isArray(parsed.requirements)) {
      parsed.requirements = parsed.requirements
        .filter((r) => r && typeof r === 'object')
        .filter((r) => (r.normalizedDescription || r.description || '').trim().length > 0);
      return parsed;
    }

    return parsed;
  }

  /**
   * Deterministic structured fallback.
   *
   * SAFETY CONTRACT: this method MUST NEVER fabricate requirements, metrics,
   * stakeholders, or any domain content. On LLM failure the pipeline treats the
   * result as "no usable AI output" and relies on its DETERMINISTIC semantic
   * engine (which extracts only what the user actually said) — so we return an
   * explicitly-empty, structurally-valid payload here instead of inventing data.
   */
  _generateDeterministicFallback(prompt) {
    const p = (prompt || '').toLowerCase();

    // Interview / follow-up / relevance prompts: empty result signals the
    // caller to use its own deterministic question bank / guards. No content
    // is invented.
    if (
      p.includes('interview') ||
      p.includes('elicitation') ||
      p.includes('follow-up') ||
      p.includes('follow up') ||
      p.includes('relevance') ||
      p.includes('classify')
    ) {
      return JSON.stringify({
        requirements: [],
        classification: null,
        question: '',
        isOutOfScope: false,
        sectionCompleted: false,
        extractedRequirements: [],
        providerFailed: true,
        notes: 'AI provider unavailable; deterministic engine handling this turn.'
      });
    }

    // Extraction prompts: return an EMPTY requirement set. The deterministic
    // semantic engine (not this fallback) is responsible for extracting the
    // requirements the user actually provided. Returning fabricated requirements
    // here would inject hallucinated content into the catalog.
    if (p.includes('extract') || p.includes('extraction')) {
      return JSON.stringify({
        requirements: [],
        providerFailed: true,
        notes: 'AI provider unavailable during extraction; deterministic engine used.'
      });
    }

    // Generic safe fallback — never fabricates.
    return JSON.stringify({
      requirements: [],
      providerFailed: true,
      message: ''
    });
  }

  /**
   * Last-resort fallback when JSON parsing fails.
   * SAFETY CONTRACT: returns a structurally-valid EMPTY object so callers treat
   * the turn as "no AI output" and fall back to deterministic logic — never as
   * a fabricated requirement or answer.
   */
  _extractFallbackFromPrompt(prompt) {
    return {
      requirements: [],
      providerFailed: true,
      parseFailed: true,
      notes: 'AI output unparseable; deterministic engine handling this turn.'
    };
  }
}

module.exports = OllamaProvider;
