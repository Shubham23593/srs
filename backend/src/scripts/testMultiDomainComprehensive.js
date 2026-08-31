const agent = require('../ai/agents/InterviewAgent');
const { SECTIONS_CONFIG } = require('../constants/interviewSections');
const { validateQuestionAgainstStage } = require('../ai/pipeline/questionValidator');

class MockAIProvider {
  constructor(responses) {
    this.responses = responses; // Array of responses
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
  console.log('=== MULTI-DOMAIN COMPREHENSIVE INTERVIEW TEST ===\n');

  // We must proxy require for getAIProvider to use our mock
  agent._originalGenerateDynamicQuestion = agent.generateDynamicQuestion;
  const originalRequire = global.require;
  const Module = require('module');
  const originalRequireFn = Module.prototype.require;

  const runDomainTest = async (domain, tests) => {
    console.log(`\n--- Domain: ${domain} ---`);
    for (const t of tests) {
      console.log(`\n[Stage: ${t.stage}]`);
      
      const mockAI = new MockAIProvider(t.mockResponses);
      Module.prototype.require = function(path) {
        if (path === '../index') return { getAIProvider: () => mockAI };
        if (path === '../pipeline/questionValidator') return { validateQuestionAgainstStage }; // return our new layered validator
        return originalRequireFn.call(this, path);
      };

      const res = await agent.generateDynamicQuestion({
        projectContext: { projectName: t.projectName, domain: domain },
        currentSectionConfig: SECTIONS_CONFIG.find(s => s.id === t.stage),
        conversationHistory: t.conversationHistory || [],
        missingInformation: t.missingInformation || [],
        lastUserAnswer: t.lastUserAnswer || '',
      });

      console.log(`Expected Result Type: ${t.expectedResultType}`);
      console.log(`Actual Question Generated: "${res.question}"`);
      
      if (t.expectedResultType === 'SUCCESS' && res.source === 'OLLAMA_DYNAMIC') {
        console.log('✅ Passed: Valid dynamic question generated');
      } else if (t.expectedResultType === 'FALLBACK' && res.source === 'DETERMINISTIC_CONTEXTUAL') {
        console.log('✅ Passed: Safe fallback triggered after rejection');
      } else {
        console.error(`❌ Failed: Expected ${t.expectedResultType} but got source ${res.source}`);
      }
    }
  };

  await runDomainTest('Healthcare Management', [
    {
      stage: 'PROJECT_INFORMATION',
      projectName: 'HealthSync',
      missingInformation: ['What is the core problem and primary objective?'],
      expectedResultType: 'SUCCESS',
      mockResponses: [
        JSON.stringify({
          question: 'What primary healthcare problem does HealthSync solve for clinics?',
          intendedStage: 'PROJECT_INFORMATION',
          informationTarget: 'primary objective',
          missingInformation: [],
          basedOnPreviousAnswer: false,
          sourceEntitiesUsed: []
        })
      ]
    },
    {
      stage: 'USER_ROLES_AND_PERMISSIONS',
      projectName: 'HealthSync',
      lastUserAnswer: 'Doctors and Nurses will use it.',
      missingInformation: ['What key permissions or access boundaries should each role have?'],
      expectedResultType: 'SUCCESS',
      mockResponses: [
        JSON.stringify({
          question: 'Since Doctors and Nurses will use the system, what specific access permissions should each role have?',
          intendedStage: 'USER_ROLES_AND_PERMISSIONS',
          informationTarget: 'permissions',
          missingInformation: [],
          basedOnPreviousAnswer: true,
          sourceEntitiesUsed: ['Doctors', 'Nurses']
        })
      ]
    }
  ]);

  await runDomainTest('Agriculture Management', [
    {
      stage: 'CONSTRAINTS',
      projectName: 'AgriTrack',
      missingInformation: ['Are there timeline or budget constraints?'],
      expectedResultType: 'FALLBACK', // We will force a double failure to trigger fallback
      mockResponses: [
        // Attempt 1: Leaks NFR (performance)
        JSON.stringify({
          question: 'What response time metrics are required for the crop sensors?',
          intendedStage: 'CONSTRAINTS',
          informationTarget: 'response time metrics',
          missingInformation: [],
          basedOnPreviousAnswer: false,
          sourceEntitiesUsed: []
        }),
        // Attempt 2: Leaks features
        JSON.stringify({
          question: 'What specific workflow will the farmers use to plant seeds?',
          intendedStage: 'CONSTRAINTS',
          informationTarget: 'workflows',
          missingInformation: [],
          basedOnPreviousAnswer: false,
          sourceEntitiesUsed: []
        })
      ]
    }
  ]);

  // Restore require
  Module.prototype.require = originalRequireFn;
}

runTests().catch(console.error);
