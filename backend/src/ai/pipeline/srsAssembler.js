/**
 * Phase 17 — Section-wise SRS Generation.
 *
 * The SRS is NEVER generated from interview transcripts, chat history, raw
 * answers or rawSourceText. A deterministic ISO/IEC/IEEE 29148 skeleton is
 * assembled first and each section is populated ONLY from validated,
 * normalized, structured requirements (grouped by semantic topic cluster and
 * mapped to sections by sectionMapper).
 *
 * Every functional requirement retains its Requirement ID, Title, formal
 * Statement, Priority, and a Stimulus/Response sequence where applicable.
 */

const { containsNonEnglishContent } = require('./languageDetector');

function joinStatements(reqs) {
  return reqs.map((r) => `[${r.requirementId}] ${r.normalizedDescription || r.description}`).join(' ');
}

function stimulusResponse(req) {
  const action = (req.title || 'the requested operation').toLowerCase();
  return [
    `Stimulus: An authorized user initiates "${req.title}".`,
    'Processing: The system validates the request, permissions and input data.',
    `Response: The system executes ${action} and returns a confirmed result to the user.`
  ];
}

/**
 * Assemble the complete SRS document object from normalized requirements.
 *
 * @param project           project document
 * @param requirements      array of normalized requirement docs
 * @param issues            open requirement issues (duplicates/conflicts/ambiguities)
 * @param clusters          topic clustering result
 */
function assembleSRS(project, requirements, issues = [], clusters = []) {
  const today = new Date().toISOString().split('T')[0];

  // Partition by the section mapping already computed
  const bySection = new Map();
  for (const r of requirements) {
    const key = r.targetSrsSection || '3';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(r);
  }

  const functional = bySection.get('3') || [];
  const perf = bySection.get('5.1') || [];
  const safety = bySection.get('5.2') || [];
  const security = bySection.get('5.3') || [];
  const quality = bySection.get('5.4') || [];
  const constraints = bySection.get('2.5') || [];
  const assumptionsDeps = [...(bySection.get('2.7') || [])];
  const interfaces = bySection.get('4') || [];
  const stakeholders = bySection.get('2.3') || [];

  // ---- Section 3: group functional requirements by semantic topic cluster ----
  // Idempotency: each requirement is placed in exactly ONE feature group.
  const placedIds = new Set();
  const clusterOrder = clusters.map((c) => c.topic);
  const featureGroups = new Map();
  for (const r of functional) {
    if (placedIds.has(r.requirementId)) continue;
    // Functional features use functional topic names; if the cluster label is a
    // quality-attribute topic, fall back to the requirement's own category.
    let topic = r.topicCluster || r.category || 'General System Features';
    if (/^(Performance|Security|Reliability|Usability|Scalability|Constraints|External Dependencies|Project Context)/i.test(topic) && /feature|management|authentication|reporting|notification/i.test(r.category || '')) {
      topic = r.category;
    }
    if (!featureGroups.has(topic)) featureGroups.set(topic, []);
    featureGroups.get(topic).push(r);
    placedIds.add(r.requirementId);
  }
  const orderedTopics = [
    ...clusterOrder.filter((t) => featureGroups.has(t)),
    ...[...featureGroups.keys()].filter((t) => !clusterOrder.includes(t))
  ];

  const section3 = orderedTopics.map((topic, idx) => {
    const reqs = featureGroups.get(topic);
    const highestPriority = reqs.some((r) => r.priority === 'HIGH') ? 'High' : 'Medium';
    return {
      featureId: `3.${idx + 1}`,
      featureName: topic,
      cluster: topic,
      descriptionAndPriority: `3.${idx + 1}.1 The ${topic} feature provides the following atomic capabilities. Overall Priority: ${highestPriority}.`,
      stimulusResponseSequences: stimulusResponse({ title: topic }),
      functionalRequirements: reqs.map((r) => ({
        requirementId: r.requirementId,
        title: r.title,
        statement: formalStatement(r),
        priority: r.priority || 'MEDIUM',
        type: r.type
      }))
    };
  });

  if (section3.length === 0) {
    section3.push({
      featureId: '3.1',
      featureName: 'System Features',
      cluster: 'General System Features',
      descriptionAndPriority: '3.1.1 No functional requirements have been validated yet. Priority: TBD.',
      stimulusResponseSequences: ['Stimulus: User interacts with the system.', 'Processing: The system processes the request.', 'Response: The system responds.'],
      functionalRequirements: []
    });
  }

  // ---- Section 2 narrative ----
  const stakeholderText = stakeholders.length
    ? `The primary user classes include: ${(project.targetUsers && project.targetUsers.length ? project.targetUsers.join(', ') : 'end users and administrators')}. Related stakeholder requirements: ${joinStatements(stakeholders)}`
    : `The intended users include ${(project.targetUsers && project.targetUsers.length ? project.targetUsers.join(', ') : 'standard end users, operators, and system administrators')}.`;

  const constraintText = constraints.length
    ? joinStatements(constraints)
    : (project.constraints && project.constraints.length
      ? project.constraints.join(' ')
      : 'The system shall adhere to REST architecture, authenticated access, and data integrity constraints.');

  const assumptionText = assumptionsDeps.length
    ? joinStatements(assumptionsDeps)
    : (project.assumptions && project.assumptions.length
      ? project.assumptions.join(' ')
      : 'The system assumes reliable network connectivity and supported client web environments.');

  // ---- Section 4 interfaces ----
  const interfaceText = interfaces.length
    ? joinStatements(interfaces)
    : 'The system shall expose secure REST/JSON interfaces over HTTPS for all client and third-party integrations.';

  // ---- Section 5 NFRs (arrays of strings, each tagged with requirement ID) ----
  const toStatements = (reqs, fallback) =>
    reqs.length ? reqs.map((r) => `[${r.requirementId}] ${formalStatement(r)}`) : fallback;

  const srs = {
    metadata: {
      title: `Software Requirements Specification for ${project.projectName}`,
      preparedBy: 'Requirements Engineering Team',
      organization: 'IntelliSDLC AI Platform',
      date: today
    },
    revisionHistory: [
      { version: '1.0', date: today, author: 'IntelliSDLC AI Requirements Pipeline', reasonForChanges: 'Initial baseline generated from validated, normalized requirements.' }
    ],
    section1_introduction: {
      purpose: `This document specifies the software requirements for ${project.projectName}. It defines functional behavior, quality attributes, interfaces, and constraints in conformance with ISO/IEC/IEEE 29148:2018. Each requirement is atomic, uniquely identified, testable, and traceable to structured elicitation evidence.`,
      documentConventions: 'Requirements carry stable identifiers: FR-xxx (functional), NFR-xxx (non-functional), CON-xxx (constraint), ASM-xxx (assumption), DEP-xxx (dependency), INT-xxx (interface), STK-xxx (stakeholder), BR-xxx (business rule). Priority levels: High, Medium, Low. Status values include PROPOSED, NEEDS_CLARIFICATION, and APPROVED.',
      intendedAudience: 'Software architects, development engineers, quality assurance engineers, project managers, and authorizing stakeholders.',
      projectScope: project.scope || project.description || `The system provides ${project.projectName} capabilities as elicited and validated through structured requirements engineering.`,
      references: [
        'ISO/IEC/IEEE 29148:2018 Systems and software engineering — Requirements engineering',
        'IEEE 830-1998 Recommended Practice for Software Requirements Specifications'
      ]
    },
    section2_overallDescription: {
      productPerspective: `${project.projectName} operates as an integrated software system within modern web and cloud environments, independent of implementation technology.`,
      productFeatures: orderedTopics.length ? orderedTopics.join(', ') : 'Core domain functionality and user workflows.',
      userClassesAndCharacteristics: stakeholderText,
      operatingEnvironment: 'Modern web browsers (Chrome, Firefox, Safari, Edge), a containerized application backend, and a persistent data store.',
      designAndImplementationConstraints: constraintText,
      userDocumentation: 'The system shall provide online user guides, contextual help, and an administrator operational manual.',
      assumptionsAndDependencies: assumptionText
    },
    section3_systemFeatures: section3,
    section4_externalInterfaceRequirements: {
      userInterfaces: 'The system shall provide a responsive, accessible graphical web interface for all user workflows.',
      hardwareInterfaces: 'The system shall operate on standard cloud server infrastructure and client workstations; no specialized hardware is required.',
      softwareInterfaces: interfaceText,
      communicationsInterfaces: 'The system shall communicate over secure HTTPS (TLS 1.3) using JSON/REST payloads.'
    },
    section5_otherNonfunctionalRequirements: {
      performanceRequirements: toStatements(perf, ['Performance targets to be confirmed during clarification.']),
      safetyRequirements: toStatements(safety, ['The system shall preserve data integrity and recover safely from interruptions.']),
      securityRequirements: toStatements(security, ['The system shall enforce authenticated, authorized access and protect stored data.']),
      softwareQualityAttributes: toStatements(quality, ['The system shall be maintainable, available, and usable per agreed acceptance criteria.'])
    },
    section6_otherRequirements: {
      content: 'All legal, regulatory, and licensing requirements shall be confirmed during stakeholder clarification.'
    },
    appendixA_glossary: buildGlossary(),
    appendixB_analysisModels: {
      diagramTypes: ['Use-Case Diagram', 'Data Flow Diagram (Level 0/1)', 'Entity Relationship Model'],
      description: 'Topic clusters and section mapping derived semantically from normalized requirements.',
      dataModels: { topicClusters: clusters }
    },
    appendixC_issuesList: buildIssuesList(issues),
    outputLanguage: 'English'
  };

  return srs;
}

function formalStatement(r) {
  let s = (r.normalizedDescription || r.description || '').trim();
  if (!/^the system (shall|must)/i.test(s)) {
    s = `The system shall ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
  }
  s = s.replace(/^The system must/i, 'The system shall');
  if (!s.endsWith('.')) s += '.';
  return s;
}

function buildGlossary() {
  return [
    { term: 'SRS', definition: 'Software Requirements Specification' },
    { term: 'FR', definition: 'Functional Requirement' },
    { term: 'NFR', definition: 'Non-Functional Requirement' },
    { term: 'CON', definition: 'Constraint' },
    { term: 'ASM', definition: 'Assumption' },
    { term: 'DEP', definition: 'Dependency' },
    { term: 'INT', definition: 'Interface Requirement' },
    { term: 'TBD', definition: 'To Be Determined (pending clarification)' }
  ];
}

function buildIssuesList(issues) {
  if (!issues || !issues.length) {
    return [{ issueId: 'ISSUE-000', description: 'No open issues at time of generation.', relatedRequirement: 'N/A', priority: 'LOW', status: 'CLOSED' }];
  }
  return issues
    .filter((i) => i.status !== 'RESOLVED' && i.status !== 'IGNORED')
    .map((i, idx) => ({
      issueId: i.issueId || `ISSUE-${String(idx + 1).padStart(3, '0')}`,
      description: i.description,
      relatedRequirement: (i.relatedRequirementIds || []).join(', ') || 'TBD',
      priority: i.severity || 'MEDIUM',
      status: i.status || 'OPEN'
    }));
}

/**
 * Phase 18 — Final Language Guard.
 * Scans all SRS text and rejects any Indic-script or romanized-Indic
 * conversational content. Returns { passed, violations }.
 */
function auditSrsLanguage(srs) {
  const violations = [];
  const walk = (node, path) => {
    if (node == null) return;
    if (typeof node === 'string') {
      if (containsNonEnglishContent(node)) {
        violations.push({ path, text: node.slice(0, 120) });
      }
    } else if (Array.isArray(node)) {
      node.forEach((n, i) => walk(n, `${path}[${i}]`));
    } else if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(srs, '');
  return { passed: violations.length === 0, violations };
}

module.exports = { assembleSRS, auditSrsLanguage, formalStatement, stimulusResponse };
