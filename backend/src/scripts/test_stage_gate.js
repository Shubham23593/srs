const mongoose = require('mongoose');
const env = require('../config/env');
const Project = require('../models/Project');
const InterviewSession = require('../models/InterviewSession');
const InterviewMessage = require('../models/InterviewMessage');
const Requirement = require('../models/Requirement');
const interviewController = require('../controllers/interview.controller');

async function testStageGate() {
  console.log('====================================================');
  console.log(' Testing Strict Stage Gate & Context Guard Isolation');
  console.log('====================================================');

  await mongoose.connect(env.mongodbUri || 'mongodb://127.0.0.1:27017/intellisdlc');

  try {
    // 1. Create or Find Project
    let project = await Project.findOne({ projectName: 'MediFly Emergency Drone Logistics' });
    if (!project) {
      project = await Project.create({
        projectName: 'MediFly Emergency Drone Logistics',
        description: 'Autonomous drone delivery platform for emergency medical supplies to rural clinics.',
        scope: 'Drone fleet dispatch, clinic requests, inventory tracking',
        targetUsers: ['Clinicians', 'Drone Dispatchers', 'Hospital Admins'],
        status: 'DRAFT'
      });
    }

    // Clean session
    await InterviewSession.deleteMany({ projectId: project._id });
    await InterviewMessage.deleteMany({ projectId: project._id });
    await Requirement.deleteMany({ projectId: project._id });

    // 2. Start Interview
    console.log('\n[Step 1] Starting Interview Session...');
    const reqMock = { params: { id: project._id.toString() } };
    let resData = null;
    const resMock = {
      json: (d) => { resData = d; },
      status: () => resMock
    };

    await interviewController.startInterview(reqMock, resMock, (err) => { if (err) throw err; });
    console.log('Initial Section:', resData.data.session.currentSection, '(Index:', resData.data.session.sectionIndex, ')');

    // Answer Step 1 with valid problem info to move to Step 2
    console.log('\n[Step 2] Answering Section 1 (Project Information) with comprehensive info...');
    reqMock.body = {
      content: 'MediFly solves critical delivery delays of blood and anti-venom to remote health centers using autonomous drones.',
      action: 'ANSWER'
    };
    await interviewController.sendMessage(reqMock, resMock, (err) => { if (err) throw err; });
    console.log('After Section 1 Answer -> Current Section:', resData.data.session.currentSection, '(Index:', resData.data.session.sectionIndex, ')');
    console.log('AI Question for Stage 2:', resData.data.aiMessage.content);

    if (resData.data.session.currentSection !== 'STAKEHOLDERS_AND_USERS') {
      throw new Error(`Expected section to be STAKEHOLDERS_AND_USERS but got ${resData.data.session.currentSection}`);
    }

    // TEST A: Out-of-scope query "what is the weather"
    console.log('\n[TEST A] User says: "what is the weather"');
    reqMock.body = { content: 'what is the weather', action: 'ANSWER' };
    await interviewController.sendMessage(reqMock, resMock, (err) => { if (err) throw err; });
    console.log('Context Guard Flagged:', resData.data.isOutOfScope);
    console.log('Current Section:', resData.data.session.currentSection, '(Index:', resData.data.session.sectionIndex, ')');
    console.log('AI Redirection Response:', resData.data.aiMessage.content);

    if (!resData.data.isOutOfScope || resData.data.session.currentSection !== 'STAKEHOLDERS_AND_USERS') {
      throw new Error(`TEST A FAILED: Expected to stay in STAKEHOLDERS_AND_USERS on 'what is the weather'!`);
    }

    // TEST B: Out-of-scope query "what is your name"
    console.log('\n[TEST B] User says: "what is your name"');
    reqMock.body = { content: 'what is your name', action: 'ANSWER' };
    await interviewController.sendMessage(reqMock, resMock, (err) => { if (err) throw err; });
    console.log('Context Guard Flagged:', resData.data.isOutOfScope);
    console.log('Current Section:', resData.data.session.currentSection, '(Index:', resData.data.session.sectionIndex, ')');
    console.log('AI Redirection Response:', resData.data.aiMessage.content);

    if (!resData.data.isOutOfScope || resData.data.session.currentSection !== 'STAKEHOLDERS_AND_USERS') {
      throw new Error(`TEST B FAILED: Expected to stay in STAKEHOLDERS_AND_USERS on 'what is your name'!`);
    }

    // TEST C: Greeting "hello"
    console.log('\n[TEST C] User says: "hello"');
    reqMock.body = { content: 'hello', action: 'ANSWER' };
    await interviewController.sendMessage(reqMock, resMock, (err) => { if (err) throw err; });
    console.log('Context Guard Flagged:', resData.data.isOutOfScope);
    console.log('Current Section:', resData.data.session.currentSection, '(Index:', resData.data.session.sectionIndex, ')');
    console.log('AI Response:', resData.data.aiMessage.content);

    if (!resData.data.isOutOfScope || resData.data.session.currentSection !== 'STAKEHOLDERS_AND_USERS') {
      throw new Error(`TEST C FAILED: Expected to stay in STAKEHOLDERS_AND_USERS on 'hello'!`);
    }

    // TEST D: Partial valid answer "Patients are the main users."
    console.log('\n[TEST D] User says: "Patients are the main users." (Partial answer)');
    reqMock.body = { content: 'Patients are the main users.', action: 'ANSWER' };
    await interviewController.sendMessage(reqMock, resMock, (err) => { if (err) throw err; });
    console.log('Extracted Reqs:', resData.data.newRequirementsExtracted);
    console.log('Current Section:', resData.data.session.currentSection, '(Index:', resData.data.session.sectionIndex, ')');
    console.log('AI Follow-up Question:', resData.data.aiMessage.content);

    if (resData.data.session.currentSection !== 'STAKEHOLDERS_AND_USERS') {
      throw new Error(`TEST D FAILED: Partial answer should stay in STAKEHOLDERS_AND_USERS and ask follow-up!`);
    }

    // TEST E: Full answer completing Stage 2
    console.log('\n[TEST E] User completes Stage 2: "Hospitals, pharmacies, drone operators, and emergency responders are also key stakeholders."');
    reqMock.body = {
      content: 'Hospitals, pharmacies, drone operators, and emergency responders are also key stakeholders.',
      action: 'ANSWER'
    };
    await interviewController.sendMessage(reqMock, resMock, (err) => { if (err) throw err; });
    console.log('Extracted Reqs:', resData.data.newRequirementsExtracted);
    console.log('Current Section:', resData.data.session.currentSection, '(Index:', resData.data.session.sectionIndex, ')');
    console.log('AI Question for Stage 3:', resData.data.aiMessage.content);

    if (resData.data.session.currentSection !== 'USER_ROLES_AND_PERMISSIONS') {
      throw new Error(`TEST E FAILED: Expected to advance to USER_ROLES_AND_PERMISSIONS!`);
    }

    // Verify that the question asked in Stage 3 is ABOUT roles/permissions, NOT about stakeholders!
    if (resData.data.aiMessage.content.toLowerCase().includes('who will be the primary end users')) {
      throw new Error(`STAGE SYNCHRONIZATION BUG: Question in USER_ROLES_AND_PERMISSIONS is asking about stakeholders!`);
    }

    console.log('\n====================================================');
    console.log(' ✅ ALL 6 CRITICAL STAGE & CONTEXT GUARD TESTS PASSED!');
    console.log('====================================================');
  } catch (e) {
    console.error('❌ Test failed with error:', e);
  } finally {
    await mongoose.disconnect();
  }
}

testStageGate();
