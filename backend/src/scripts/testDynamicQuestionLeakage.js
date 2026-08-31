const agent = require('../ai/agents/InterviewAgent');
const { SECTIONS_CONFIG } = require('../constants/interviewSections');

// Mock AI Provider that returns specific responses to test the retry and validation loop
class MockAIProvider {
  constructor(responses) {
    this.responses = responses; // Array of responses to return sequentially
    this.callCount = 0;
  }
  async isHealthy() { return true; }
  async generateCompletion(prompt, options) {
    const res = this.responses[this.callCount] || this.responses[this.responses.length - 1];
    this.callCount++;
    return res;
  }
}

async function runTests() {
  console.log('--- Running Dynamic Question Intent Leakage Tests ---\n');

  // Test 1: Successful JSON Generation for PROJECT_INFORMATION without leakage
  console.log('Test 1: PROJECT_INFORMATION - Valid JSON, no leakage');
  // Override internal require for getAIProvider to use our mock
  const mockAI1 = new MockAIProvider([
    JSON.stringify({
      question: 'What is the main goal of the smart waste system?',
      intendedStage: 'PROJECT_INFORMATION',
      informationTarget: 'primary objective',
      missingInformation: [],
      basedOnPreviousAnswer: false,
      sourceEntitiesUsed: []
    })
  ]);
  
  // Create a proxy to mock the AI provider inside the agent
  agent._originalGenerateDynamicQuestion = agent.generateDynamicQuestion;
  const requireProxy1 = function(path) {
    if (path === '../index') return { getAIProvider: () => mockAI1 };
    return require(path);
  }
  
  const originalRequire = global.require;
  
  // We'll just patch the generatedData retrieval part for the test since we can't easily mock local requires inside a class method via monkey patching without modifying the method or using proxyquire.
  // Actually, since require is used dynamically inside the method: `const { getAIProvider } = require('../index');`
  // We can hook it by overriding Module.prototype.require briefly.
  const Module = require('module');
  const originalRequireFn = Module.prototype.require;
  Module.prototype.require = function(path) {
    if (path === '../index') return { getAIProvider: () => mockAI1 };
    if (path === '../pipeline/questionValidator') return originalRequireFn.call(this, path);
    return originalRequireFn.call(this, path);
  };
  
  const res1 = await agent.generateDynamicQuestion({
    projectContext: { projectName: 'Smart Waste' },
    currentSectionConfig: SECTIONS_CONFIG[0], // PROJECT_INFORMATION
  });
  console.log('Result 1:', res1.question);
  if (res1.question === 'What is the main goal of the smart waste system?' && res1.source === 'OLLAMA_DYNAMIC') {
    console.log('✅ Test 1 Passed\n');
  } else {
    console.error('❌ Test 1 Failed', res1);
  }

  // Test 2: STAKEHOLDERS_AND_USERS intent leakage (LLM tries to ask about metrics)
  console.log('Test 2: STAKEHOLDERS_AND_USERS - Validation rejection and retry');

  const mockAI2 = new MockAIProvider([
    // Attempt 1: Leaks 'metrics' (forbidden in STAKEHOLDERS_AND_USERS)
    JSON.stringify({
      question: 'What metrics will the administrators use to track performance?',
      intendedStage: 'STAKEHOLDERS_AND_USERS',
      informationTarget: 'admin metrics',
      missingInformation: [],
      basedOnPreviousAnswer: false,
      sourceEntitiesUsed: []
    }),
    // Attempt 2: Corrects the issue
    JSON.stringify({
      question: 'Which specific types of administrators will manage the dashboard?',
      intendedStage: 'STAKEHOLDERS_AND_USERS',
      informationTarget: 'admin types',
      missingInformation: [],
      basedOnPreviousAnswer: false,
      sourceEntitiesUsed: []
    })
  ]);
  Module.prototype.require = function(path) {
    if (path === '../index') return { getAIProvider: () => mockAI2 };
    if (path === '../pipeline/questionValidator') return originalRequireFn.call(this, path);
    return originalRequireFn.call(this, path);
  };

  const res2 = await agent.generateDynamicQuestion({
    projectContext: { projectName: 'Smart Waste' },
    currentSectionConfig: SECTIONS_CONFIG[1], // STAKEHOLDERS_AND_USERS
  });
  console.log('Result 2:', res2.question);
  if (res2.question === 'Which specific types of administrators will manage the dashboard?' && res2.source === 'OLLAMA_DYNAMIC') {
    console.log('✅ Test 2 Passed\n');
  } else {
    console.error('❌ Test 2 Failed', res2);
  }

  // Restore original require
  Module.prototype.require = originalRequireFn;
}

runTests().catch(console.error);
