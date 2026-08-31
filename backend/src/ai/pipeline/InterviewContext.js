/**
 * Single Source of Truth: InterviewContext
 *
 * Encapsulates the complete, live project context, conversation history,
 * merged knowledge store, and interview stage status for requirements elicitation.
 *
 * Every AI question, validation decision, extraction operation, follow-up question,
 * and stage completion decision in the system uses this context.
 *
 * Fully project-context-driven across ANY domain (e.g., healthcare, agriculture,
 * finance, education, IoT, logistics, etc.) without hardcoded domain assumptions.
 */

const { SECTIONS_CONFIG } = require('../../constants/interviewSections');

class InterviewContext {
  constructor(data = {}) {
    this.projectId = String(data.projectId || data._id || '');
    this.projectName = String(data.projectName || 'Software System').trim();
    this.description = String(data.description || '').trim();
    this.domain = String(data.domain || 'General Software / Information Systems').trim();
    this.scope = String(data.scope || '').trim();
    this.problemStatement = String(data.problemStatement || data.description || '').trim();

    // Arrays & Knowledge Stores
    this.objectives = Array.isArray(data.objectives) ? [...data.objectives] : [];
    this.targetUsers = Array.isArray(data.targetUsers) ? [...data.targetUsers] : [];
    this.stakeholders = Array.isArray(data.stakeholders) ? [...data.stakeholders] : [];
    this.roles = Array.isArray(data.roles) ? [...data.roles] : [];
    this.permissions = Array.isArray(data.permissions) ? [...data.permissions] : [];
    this.externalInterfaces = Array.isArray(data.externalInterfaces) ? [...data.externalInterfaces] : [];
    this.constraints = Array.isArray(data.constraints) ? [...data.constraints] : [];
    this.assumptions = Array.isArray(data.assumptions) ? [...data.assumptions] : [];

    // Stage & Session Information
    this.stageIndex = typeof data.stageIndex === 'number' ? data.stageIndex : (typeof data.sectionIndex === 'number' ? data.sectionIndex : 0);
    this.currentStage = data.currentStage || SECTIONS_CONFIG[this.stageIndex] || SECTIONS_CONFIG[0];
    this.sectionsState = Array.isArray(data.sectionsState) ? data.sectionsState : [];
    this.coverage = typeof data.coverage === 'number' ? data.coverage : 0;
    this.status = String(data.status || 'IN_PROGRESS');

    // Conversational state
    this.conversationHistory = Array.isArray(data.conversationHistory) ? data.conversationHistory : [];
    this.previousAnswers = Array.isArray(data.previousAnswers) ? data.previousAnswers : [];
    this.previousQuestions = Array.isArray(data.previousQuestions) ? data.previousQuestions : [];
    this.existingRequirements = Array.isArray(data.existingRequirements) ? data.existingRequirements : [];
    this.missingInformation = Array.isArray(data.missingInformation) ? data.missingInformation : [];
    this.userLanguage = String(data.userLanguage || 'English');
  }

  /**
   * Factory: Build InterviewContext from Mongoose Project & InterviewSession models.
   */
  static async fromProjectAndSession(project, session, options = {}) {
    const projObj = project?.toObject ? project.toObject() : (project || {});
    const sessObj = session?.toObject ? session.toObject() : (session || {});

    const stageIdx = typeof sessObj.sectionIndex === 'number' ? sessObj.sectionIndex : 0;
    const currentSectionConfig = SECTIONS_CONFIG[stageIdx] || SECTIONS_CONFIG[0];

    // Extract recent user answers and AI questions from messages
    const messages = Array.isArray(sessObj.messages) ? sessObj.messages : [];
    const previousAnswers = messages
      .filter((m) => m.sender === 'USER' && m.content)
      .map((m) => m.content);
    const previousQuestions = messages
      .filter((m) => m.sender === 'AI' && m.content)
      .map((m) => m.content);

    // Fetch existing requirements if not passed in options
    let existingRequirements = options.existingRequirements || [];
    if (!existingRequirements.length && project?._id) {
      try {
        const Requirement = require('../../models/Requirement');
        existingRequirements = await Requirement.find({ projectId: project._id });
      } catch (e) {
        existingRequirements = [];
      }
    }

    return new InterviewContext({
      projectId: projObj._id || projObj.id,
      projectName: projObj.projectName,
      description: projObj.description,
      domain: projObj.domain,
      scope: projObj.scope,
      problemStatement: projObj.problemStatement || projObj.description,
      objectives: projObj.objectives || [],
      targetUsers: projObj.targetUsers || [],
      stakeholders: projObj.stakeholders || [],
      roles: projObj.roles || [],
      permissions: projObj.permissions || [],
      externalInterfaces: projObj.externalInterfaces || [],
      constraints: projObj.constraints || [],
      assumptions: projObj.assumptions || [],
      stageIndex: stageIdx,
      currentStage: currentSectionConfig,
      sectionsState: sessObj.sectionsState || [],
      coverage: sessObj.coverage || 0,
      status: sessObj.status || 'IN_PROGRESS',
      conversationHistory: messages.slice(-10),
      previousAnswers,
      previousQuestions,
      existingRequirements,
      missingInformation: options.missingInformation || [],
      userLanguage: options.userLanguage || sessObj.userLanguage || 'English'
    });
  }

  /**
   * Merges newly extracted structured entities into this context.
   */
  mergeExtractedEntities(entities = {}) {
    if (!entities || typeof entities !== 'object') return;

    // Stakeholders and Users
    if (entities.stakeholdersInfo) {
      const { primaryUsers, stakeholders, beneficiaries, administrators } = entities.stakeholdersInfo;
      if (Array.isArray(primaryUsers)) this.targetUsers = [...new Set([...this.targetUsers, ...primaryUsers])];
      if (Array.isArray(beneficiaries)) this.targetUsers = [...new Set([...this.targetUsers, ...beneficiaries])];
      if (Array.isArray(stakeholders)) this.stakeholders = [...new Set([...this.stakeholders, ...stakeholders])];
      if (Array.isArray(administrators)) this.stakeholders = [...new Set([...this.stakeholders, ...administrators])];
    }

    // Roles and Permissions
    if (entities.rolesInfo) {
      const { userRoles, permissions, accessRules } = entities.rolesInfo;
      if (Array.isArray(userRoles)) this.roles = [...new Set([...this.roles, ...userRoles])];
      if (Array.isArray(permissions)) this.permissions = [...new Set([...this.permissions, ...permissions])];
      if (Array.isArray(accessRules)) this.permissions = [...new Set([...this.permissions, ...accessRules])];
    }

    // Project Info
    if (entities.projectInfo) {
      const { problemStatement, primaryObjective, projectScope } = entities.projectInfo;
      if (problemStatement && !this.problemStatement) this.problemStatement = problemStatement;
      if (primaryObjective && !this.objectives.includes(primaryObjective)) this.objectives.push(primaryObjective);
      if (projectScope && !this.scope) this.scope = projectScope;
    }

    // External Interfaces
    if (entities.interfacesInfo?.interfaces && Array.isArray(entities.interfacesInfo.interfaces)) {
      this.externalInterfaces = [...new Set([...this.externalInterfaces, ...entities.interfacesInfo.interfaces])];
    }

    // Constraints
    if (entities.constraintsInfo) {
      const allC = [
        ...(entities.constraintsInfo.technologyConstraints || []),
        ...(entities.constraintsInfo.deploymentConstraints || []),
        ...(entities.constraintsInfo.budgetConstraints || []),
        ...(entities.constraintsInfo.regulatoryConstraints || []),
        ...(entities.constraintsInfo.timelineConstraints || [])
      ];
      this.constraints = [...new Set([...this.constraints, ...allC])];
    }

    // Assumptions & Dependencies
    if (entities.dependenciesInfo) {
      const allD = [
        ...(entities.dependenciesInfo.assumptions || []),
        ...(entities.dependenciesInfo.dependencies || []),
        ...(entities.dependenciesInfo.thirdPartyServices || [])
      ];
      this.assumptions = [...new Set([...this.assumptions, ...allD])];
    }
  }

  /**
   * Returns merged knowledge store for deterministic stage gating and persistence.
   */
  toMergedKnowledge() {
    return {
      problemStatement: this.problemStatement,
      targetUsers: [...this.targetUsers],
      stakeholders: [...this.stakeholders],
      roles: [...this.roles],
      permissions: [...this.permissions],
      externalInterfaces: [...this.externalInterfaces],
      constraints: [...this.constraints],
      assumptions: [...this.assumptions],
      objectives: [...this.objectives],
      scope: this.scope
    };
  }

  /**
   * Formats the complete project context into a clear markdown representation
   * for injecting into AI system prompts.
   */
  toPromptContext() {
    return `### PROJECT FOUNDATION
- Project Name: ${this.projectName}
- Domain / Industry: ${this.domain}
- Primary Description: ${this.description || 'Not provided'}
- Core Problem Statement: ${this.problemStatement || 'Not provided'}
- Scope: ${this.scope || 'Not provided'}

### CURRENT KNOWLEDGE BASE
- Target Users: ${this.targetUsers.join(', ') || 'None identified yet'}
- Key Stakeholders: ${this.stakeholders.join(', ') || 'None identified yet'}
- User Roles: ${this.roles.join(', ') || 'None identified yet'}
- Role Permissions & Rules: ${this.permissions.join('; ') || 'None identified yet'}
- External Interfaces / APIs: ${this.externalInterfaces.join(', ') || 'None identified yet'}
- Design & Tech Constraints: ${this.constraints.join(', ') || 'None identified yet'}
- Operational Assumptions & Dependencies: ${this.assumptions.join(', ') || 'None identified yet'}

### CURRENT INTERVIEW STAGE
- Stage ID: ${this.currentStage.id}
- Stage Name: ${this.currentStage.name} (Step ${this.stageIndex + 1} of 9)
- Stage Objective: ${this.currentStage.description}
- Overall Interview Progress: ${this.coverage}%
- Formal Requirements Captured So Far: ${this.existingRequirements.length}`;
  }

  /**
   * Returns normalized words / n-grams of all previously asked questions
   * for semantic repetition checking.
   */
  getPreviousQuestionTexts() {
    return [...this.previousQuestions];
  }
}

module.exports = InterviewContext;
