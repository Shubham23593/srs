const User = require('../models/User');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const SRS = require('../models/SRS');
const SRSVersion = require('../models/SRSVersion');
const TraceabilityLink = require('../models/TraceabilityLink');
const InterviewSession = require('../models/InterviewSession');
const InterviewMessage = require('../models/InterviewMessage');
const pipeline = require('../ai/pipeline/requirementsPipeline');
const { formalNormalize } = require('../ai/pipeline/semanticEngine');
const traceabilityService = require('./traceabilityService');
const ragService = require('./ragService');

class DemoSeedService {
  async seedDemoProject(user = null) {
    // 1. Ensure Demo User exists
    let demoUser = user;
    if (!demoUser) {
      demoUser = await User.findOne({ email: 'demo@intellisdlc.ai' });
      if (!demoUser) {
        demoUser = new User({
          name: 'Shubham Dalvi',
          email: 'demo@intellisdlc.ai',
          password: 'password123',
          organization: 'Software Engineering Laboratory'
        });
        await demoUser.save();
      }
    }

    // 2. Create or Reset Demo Project
    let project = await Project.findOne({ projectName: 'College Event Management System', owner: demoUser._id });
    if (project) {
      await Project.deleteOne({ _id: project._id });
      await Requirement.deleteMany({ projectId: project._id });
      await SRS.deleteMany({ projectId: project._id });
      await SRSVersion.deleteMany({ projectId: project._id });
      await TraceabilityLink.deleteMany({ projectId: project._id });
      await InterviewSession.deleteMany({ projectId: project._id });
      await InterviewMessage.deleteMany({ projectId: project._id });
    }

    project = new Project({
      projectName: 'College Event Management System',
      description: 'A comprehensive campus web portal enabling student event registration, department scheduling, and administrator approval workflows.',
      scope: 'The system encompasses student registration, administrator event publishing, attendee tracking, feedback collection, and access control for university activities.',
      domain: 'Education & Campus Management',
      targetUsers: ['Students', 'Faculty Coordinators', 'Event Administrators'],
      stakeholders: ['Dean of Student Affairs', 'Campus IT Department', 'Student Council'],
      objectives: ['Streamline event publishing', 'Automate registration quotas', 'Enforce secure authenticated access'],
      constraints: ['Must run in standard modern web browsers', 'Responses must not exceed 2 seconds'],
      assumptions: ['Campus single-sign-on will be integrated for student identification'],
      dependencies: ['University centralized database API'],
      status: 'SRS_APPROVED',
      owner: demoUser._id
    });
    await project.save();

    // 3. Seed Initial Interview Transcripts
    const session = new InterviewSession({
      projectId: project._id,
      status: 'COMPLETED',
      currentTopic: 'Event Registration Workflow'
    });
    await session.save();

    const m1 = new InterviewMessage({
      sessionId: session._id,
      projectId: project._id,
      sender: 'AI',
      content: 'Welcome to the requirements engineering interview for the College Event Management System. What are the key student capabilities needed?',
      topic: 'Core Features'
    });
    await m1.save();

    const m2 = new InterviewMessage({
      sessionId: session._id,
      projectId: project._id,
      sender: 'USER',
      content: 'Students need to view upcoming events and register for them directly online.',
      topic: 'Core Features',
      extractedRequirementIds: ['FR-001', 'FR-002']
    });
    await m2.save();

    const m3 = new InterviewMessage({
      sessionId: session._id,
      projectId: project._id,
      sender: 'AI',
      content: 'What administrative management functions and security rules must be enforced?',
      topic: 'Administration & Security'
    });
    await m3.save();

    const m4 = new InterviewMessage({
      sessionId: session._id,
      projectId: project._id,
      sender: 'USER',
      content: 'Administrators must be able to create new events, and only authenticated users can access protected functions.',
      topic: 'Administration & Security',
      extractedRequirementIds: ['FR-003', 'NFR-001']
    });
    await m4.save();

    // 4. Seed 4 Initial Requirements
    const seedRequirements = [
      {
        requirementId: 'FR-001', title: 'Event Viewing', type: 'FUNCTIONAL',
        category: 'Event Management', nfrSubcategory: 'N/A', priority: 'HIGH',
        normalized: 'The system shall allow students to view upcoming college events with detailed schedules and venue locations.',
        raw: 'Students need to view upcoming events and register for them directly online.', msg: m2.messageId
      },
      {
        requirementId: 'FR-002', title: 'Event Registration', type: 'FUNCTIONAL',
        category: 'Event Management', nfrSubcategory: 'N/A', priority: 'HIGH',
        normalized: 'The system shall allow students to register for available college events.',
        raw: 'Students need to view upcoming events and register for them directly online.', msg: m2.messageId
      },
      {
        requirementId: 'FR-003', title: 'Event Creation', type: 'FUNCTIONAL',
        category: 'Event Management', nfrSubcategory: 'N/A', priority: 'HIGH',
        normalized: 'The system shall allow administrators to create and publish new college events.',
        raw: 'Administrators must be able to create new events, and only authenticated users can access protected functions.', msg: m4.messageId
      },
      {
        requirementId: 'NFR-001', title: 'Access Control Security', type: 'NON_FUNCTIONAL',
        category: 'Security', nfrSubcategory: 'SECURITY', priority: 'HIGH',
        normalized: 'The system shall restrict protected functions to authenticated users only.',
        raw: 'Administrators must be able to create new events, and only authenticated users can access protected functions.', msg: m4.messageId
      }
    ];

    const reqDocs = [];
    for (const r of seedRequirements) {
      const doc = new Requirement({
        projectId: project._id,
        requirementId: r.requirementId,
        title: r.title,
        normalizedDescription: formalNormalize(r.normalized),
        description: formalNormalize(r.normalized),
        rawSourceText: r.raw,
        sourceLanguage: 'English',
        sourceMessageId: r.msg,
        sourceInterviewStage: 'Elicitation Interview',
        type: r.type,
        nfrSubcategory: r.nfrSubcategory,
        category: r.category,
        topicCluster: r.type === 'NON_FUNCTIONAL' ? 'Security' : 'Event Management',
        priority: r.priority,
        status: 'APPROVED',
        validationStatus: 'VALID',
        version: '1.0',
        isAtomic: true
      });
      await doc.save();
      reqDocs.push(doc);
    }

    // 5. Generate SRS v1.0 through the authoritative pipeline
    const { srs: srsDoc } = await pipeline.generateSRS(project);
    const srsData = srsDoc;
    srsData.currentVersion = '1.0';
    srsData.status = 'APPROVED';
    srsData.approvedBy = demoUser._id;
    srsData.approvedAt = new Date();
    await srsData.save();
    const srs = srsData;

    // 6. Save Snapshot for Version 1.0
    const version1 = new SRSVersion({
      projectId: project._id,
      srsId: srs._id,
      version: '1.0',
      reasonForChanges: 'Initial Baseline SRS Release for College Event Management System.',
      changedRequirementIds: ['FR-001', 'FR-002', 'FR-003', 'NFR-001'],
      affectedSections: ['1.0', '2.0', '3.1', '3.2', '4.0', '5.0'],
      summaryOfChanges: 'Established baseline software requirements specification with event discovery, registration, admin publishing, and access security.',
      diffData: {
        added: ['FR-001', 'FR-002', 'FR-003', 'NFR-001'],
        modified: [],
        removed: []
      },
      srsSnapshot: srs.toObject(),
      approvedBy: demoUser._id
    });
    await version1.save();

    // 7. Generate Traceability Links & RAG Knowledge Store
    await traceabilityService.generateLinksForProject(project._id, srs);
    await ragService.indexProjectKnowledge(project._id);

    return { project, srs, demoUser };
  }
}

module.exports = new DemoSeedService();
