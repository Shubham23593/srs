You are a senior full-stack software architect, AI engineer, and
Software Requirements Engineering expert.

Build a production-quality AI-powered Software Requirements Engineering
platform called:

"IntelliSDLC AI"

============================================================
IMPORTANT PROJECT SCOPE
============================================================

The project scope MUST END at a complete, validated, traceable,
version-controlled and continuously updateable Software Requirements
Specification (SRS).

The complete flow is:

PROJECT IDEA
→ AI REQUIREMENT INTERVIEW
→ REQUIREMENT COLLECTION
→ REQUIREMENT EXTRACTION
→ REQUIREMENT ANALYSIS
→ AMBIGUITY / DUPLICATE / CONFLICT DETECTION
→ FR/NFR CLASSIFICATION
→ REQUIREMENT VALIDATION
→ RAG CONTEXT RETRIEVAL
→ SRS SECTION MAPPING
→ SRS GENERATION
→ SRS REVIEW
→ USER APPROVAL
→ TRACEABILITY
→ SRS VERSION 1.0
→ REQUIREMENT CHANGE
→ CHANGE DETECTION
→ RAG RETRIEVAL
→ AFFECTED REQUIREMENT DETECTION
→ AFFECTED SRS SECTION DETECTION
→ INCREMENTAL SRS UPDATE
→ USER APPROVAL
→ SRS VERSION 1.1
→ PDF/DOCX EXPORT

STOP THE CURRENT PROJECT AFTER SRS GENERATION, REVIEW,
TRACEABILITY, VERSIONING AND SRS UPDATE.

DO NOT implement:

- Developer Agent
- Code Generation
- Project Planning
- Task Planning
- Development Assistance
- Autonomous QA
- Code Review
- CI/CD
- Deployment
- Jira integration
- Slack integration
- GitHub automation
- Complete SDLC automation
- Production deployment automation


============================================================
1. TECHNOLOGY STACK
============================================================

FRONTEND:

- Latest stable Next.js
- App Router
- React
- JavaScript
- JSX ONLY
- Tailwind CSS
- Responsive design

IMPORTANT:

Use .jsx files for React components.

DO NOT create .tsx files.

DO NOT use TypeScript unless absolutely required by a dependency.

All frontend components should preferably be:

.jsx

Examples:

app/page.jsx
app/dashboard/page.jsx
components/Sidebar.jsx
components/SRSViewer.jsx


BACKEND:

- Node.js
- Express.js
- JavaScript
- REST API architecture

Use .js files for backend code.


DATABASE:

- MongoDB
- Mongoose


============================================================
2. AI MODEL
============================================================

Use Ollama as the PRIMARY AI provider.

Environment variables:

AI_PROVIDER=ollama

OLLAMA_BASE_URL=http://localhost:11434

OLLAMA_MODEL=codellama:7b-instruct

EMBEDDING_MODEL=BAAI/bge-small-en-v1.5


IMPORTANT:

The application must NOT depend on Hugging Face as the primary
LLM provider.

Use the local Ollama model:

codellama:7b-instruct

The AI provider architecture must still be abstract so that another
LLM can be added later.

Create:

AIProvider
 ├── OllamaProvider
 └── Optional future providers


The application should read:

process.env.AI_PROVIDER
process.env.OLLAMA_BASE_URL
process.env.OLLAMA_MODEL

Do not hard-code these values.


============================================================
3. EMBEDDING MODEL
============================================================

Use:

BAAI/bge-small-en-v1.5

for embeddings.

Create a separate embedding service:

EmbeddingService

Do not directly call the embedding model from controllers.

Pipeline:

Text
 ↓
EmbeddingService
 ↓
Vector
 ↓
MongoDB


============================================================
4. RAG
============================================================

RAG IS A CORE FEATURE.

Use RAG for:

1. SRS generation
2. SRS update
3. Requirement context retrieval
4. Previous SRS context retrieval
5. Project knowledge retrieval

Use MongoDB Vector Search when available.

Keep vector storage behind an abstraction:

VectorStore
 └── MongoDBVectorStore


RAG must retrieve existing project information.

RAG MUST NOT invent requirements.


Index the following:

- project description
- project scope
- stakeholders
- project objectives
- interview messages
- extracted requirements
- validated requirements
- requirement issues
- assumptions
- constraints
- SRS sections
- previous SRS versions
- glossary
- project references


RAG PIPELINE:

Text
 ↓
Chunking
 ↓
Embedding
 ↓
Vector Storage
 ↓
Semantic Search
 ↓
Relevant Context
 ↓
LLM
 ↓
Validated Output


============================================================
5. RESEARCH FOUNDATION
============================================================

The architecture should be research-informed by the three
provided research papers.

PAPER 1:

"Using LLMs in Software Requirements Specifications:
An Empirical Evaluation"

Use relevant concepts such as:

- LLM-based SRS generation
- requirement validation
- requirement correction
- prompt engineering
- context tuning
- human review


PAPER 2:

"REQINONE: A Large Language Model-Based Agent for
Software Requirements Specification Generation"

Use relevant concepts such as:

- requirement extraction
- functional requirement classification
- non-functional requirement classification
- NFR categorization
- structured SRS generation
- trace-to-source


PAPER 3:

"A Framework for Structurally Deterministic Pipeline Based
Drafting and Quality Improvement of SRS Using Language Models
and Reinforcement Learning"

Use relevant concepts such as:

- sentence embeddings
- requirement grouping
- similarity
- section mapping
- structured SRS generation
- incremental SRS update
- continuous quality improvement


IMPORTANT:

Do not claim that IntelliSDLC AI exactly reproduces any paper.

Use the papers as research inspiration.

Clearly distinguish:

Research Paper Concept
vs
Our Implementation
vs
Our Contribution


============================================================
6. IEEE / REQUIREMENTS ENGINEERING FOUNDATION
============================================================

Use verified IEEE / ISO/IEC/IEEE requirements engineering
standards and research references to guide:

- SRS organization
- requirement quality
- requirement validation
- requirement verification
- requirement traceability
- functional requirements
- non-functional requirements
- ambiguity
- completeness
- consistency
- testability

IMPORTANT:

Do NOT claim:

"IEEE Certified"

or

"IEEE Certified SRS Generator"

Instead use:

"IEEE/ISO/IEC/IEEE-aligned requirements engineering practices"

Only use verified references.

Never invent:
- authors
- paper names
- DOI
- publication year
- IEEE details


============================================================
7. SRS TEMPLATE — VERY IMPORTANT
============================================================

THE UPLOADED SRS TEMPLATE IS THE SOURCE OF TRUTH.

The uploaded file:

"srs_template (1)(1).doc"

MUST be used as the exact SRS template.

DO NOT replace it with a generic SRS template.

DO NOT create your own section structure.

DO NOT remove sections.

DO NOT change the section order.

DO NOT change numbering unnecessarily.

Preserve the structure and terminology of the uploaded template.

The template contains:

Software Requirements Specification for <Project>

Version
Prepared by
Organization
Date

Table of Contents

Revision History


1. Introduction

1.1 Purpose

1.2 Document Conventions

1.3 Intended Audience and Reading Suggestions

1.4 Project Scope

1.5 References


2. Overall Description

2.1 Product Perspective

2.2 Product Features

2.3 User Classes and Characteristics

2.4 Operating Environment

2.5 Design and Implementation Constraints

2.6 User Documentation

2.7 Assumptions and Dependencies


3. System Features

3.1 System Feature 1

3.1.1 Description and Priority

3.1.2 Stimulus/Response Sequences

3.1.3 Functional Requirements

3.2 System Feature 2

3.2.1 Description and Priority

3.2.2 Stimulus/Response Sequences

3.2.3 Functional Requirements


4. External Interface Requirements

4.1 User Interfaces

4.2 Hardware Interfaces

4.3 Software Interfaces

4.4 Communications Interfaces


5. Other Nonfunctional Requirements

5.1 Performance Requirements

5.2 Safety Requirements

5.3 Security Requirements

5.4 Software Quality Attributes


6. Other Requirements


Appendix A: Glossary

Appendix B: Analysis Models

Appendix C: Issues List


The uploaded template explicitly requires functional requirements
to be uniquely identified and states that requirements should be
concise, complete, unambiguous, verifiable and necessary. Use these
principles in the validation and SRS generation workflow. 
The template also supports TBD placeholders when required
information is not available. 


============================================================
8. SRS TEMPLATE RULES
============================================================

When information is missing:

Use:

"TBD — Needs Clarification"

or:

"Information not provided by the user."

DO NOT invent missing information.

Do not create fake:

- performance numbers
- security mechanisms
- APIs
- integrations
- databases
- business rules
- stakeholders
- hardware
- external systems


The uploaded template contains an Issues List specifically for
unresolved requirements, TBDs, pending decisions and conflicts.

Use Appendix C for these issues.


============================================================
9. USER FLOW
============================================================

START
 ↓
Login/Register
 ↓
Dashboard
 ↓
Create Project
 ↓
Project Information
 ↓
AI Requirement Interview
 ↓
Requirement Extraction
 ↓
Requirement Analysis
 ↓
FR/NFR Classification
 ↓
Requirement Validation
 ↓
RAG Context Retrieval
 ↓
SRS Section Mapping
 ↓
SRS Generation
 ↓
SRS Review
 ↓
User Approval
 ↓
Traceability
 ↓
SRS v1.0


If user changes requirements:

SRS v1.0
 ↓
New Requirement / Requirement Change
 ↓
Change Detection
 ↓
RAG Retrieval
 ↓
Affected Requirement Detection
 ↓
Affected SRS Section
 ↓
AI Proposed Update
 ↓
Validation
 ↓
Old vs New
 ↓
User Approval
 ↓
SRS v1.1
 ↓
Version History


============================================================
10. PROJECT CREATION
============================================================

Create project fields:

- projectId
- projectName
- description
- scope
- domain
- targetUsers
- stakeholders
- objectives
- constraints
- assumptions
- dependencies
- status
- createdAt
- updatedAt


============================================================
11. AI REQUIREMENT INTERVIEW
============================================================

The AI must understand the project before generating SRS.

Ask focused questions about:

- system purpose
- users
- stakeholders
- features
- business rules
- inputs
- outputs
- authentication
- authorization
- notifications
- integrations
- data
- performance
- security
- availability
- scalability
- usability
- constraints
- assumptions
- dependencies

Do not repeat questions.

Do not ask unnecessary questions.

Allow:

- Answer
- Edit
- Skip
- Back
- Add Requirement
- Finish Interview


============================================================
12. REQUIREMENT EXTRACTION
============================================================

Extract structured requirements from:

- project information
- interview conversation
- user-entered requirements

Each requirement:

{
  requirementId,
  projectId,
  title,
  description,
  type,
  category,
  priority,
  sourceMessageId,
  sourceText,
  confidence,
  status,
  validationStatus,
  version,
  createdAt,
  updatedAt
}


Types:

FUNCTIONAL
NON_FUNCTIONAL


============================================================
13. REQUIREMENT ANALYSIS
============================================================

Analyze:

- Ambiguity
- Duplicate
- Conflict
- Missing Information
- Completeness
- Consistency
- Correctness
- Testability
- Clarity
- Non-redundancy

Example:

"The system should be fast."

Flag:

AMBIGUOUS

Explain:

"Fast is not measurable."

Suggestion:

"Specify the expected maximum response time."

Never silently modify the requirement.


============================================================
14. DUPLICATE DETECTION
============================================================

Use:

Embeddings
+
Cosine Similarity

Pipeline:

Requirement
 ↓
Embedding
 ↓
Similarity Search
 ↓
Potential Duplicate
 ↓
User Decision


Show:

Requirement A
Requirement B
Similarity %

Actions:

Merge
Keep Both
Edit
Ignore

Never automatically delete.


============================================================
15. CONFLICT DETECTION
============================================================

Example:

REQ-001:
System allows unlimited login attempts.

REQ-002:
System locks account after five failed attempts.

Show:

POTENTIAL CONFLICT

Display both requirements.

Allow user to resolve.

Never automatically delete.


============================================================
16. FR / NFR CLASSIFICATION
============================================================

FUNCTIONAL REQUIREMENT:

Describes WHAT the system should do.

NON-FUNCTIONAL REQUIREMENT:

Describes HOW WELL the system should operate.

NFR categories:

- Performance
- Security
- Usability
- Availability
- Scalability
- Maintainability
- Portability
- Reliability
- Fault Tolerance
- Legal
- Operational
- Look and Feel

Allow manual correction.


============================================================
17. REQUIREMENT VALIDATION
============================================================

Validate:

- clarity
- correctness
- completeness
- consistency
- testability
- non-ambiguity
- non-redundancy
- traceability

Return:

VALID
NEEDS_REVIEW
INVALID

Also provide:

- issue
- explanation
- suggested improvement

User approval required for important changes.


============================================================
18. REQUIREMENT IDs
============================================================

Use stable IDs:

FR-001
FR-002
FR-003

NFR-001
NFR-002

Maintain IDs across versions.

If an existing requirement changes:

Keep its existing ID.

Only create a new ID when it is a genuinely new requirement.


============================================================
19. SRS SECTION MAPPING
============================================================

Map validated information to the uploaded SRS template.

Project Purpose
 ↓
1.1 Purpose

Project Conventions
 ↓
1.2 Document Conventions

Audience
 ↓
1.3 Intended Audience and Reading Suggestions

Project Scope
 ↓
1.4 Project Scope

Research / standards / source references
 ↓
1.5 References


Project Context
 ↓
2.1 Product Perspective

Major Features
 ↓
2.2 Product Features

Users
 ↓
2.3 User Classes and Characteristics

Environment
 ↓
2.4 Operating Environment

Technology / constraints
 ↓
2.5 Design and Implementation Constraints

Documentation
 ↓
2.6 User Documentation

Assumptions
 ↓
2.7 Assumptions and Dependencies


Functional Features
 ↓
3. System Features

External interfaces
 ↓
4. External Interface Requirements

NFRs
 ↓
5. Other Nonfunctional Requirements

Other requirements
 ↓
6. Other Requirements

Terms
 ↓
Appendix A

Models
 ↓
Appendix B

Unresolved issues
 ↓
Appendix C


============================================================
20. SRS GENERATION
============================================================

The SRS Generator must:

1. Use only validated requirements.
2. Use project context.
3. Use RAG retrieved context.
4. Use stable requirement IDs.
5. Follow the uploaded SRS template.
6. Preserve section numbering.
7. Preserve requirement meaning.
8. Maintain traceability.
9. Never invent information.
10. Mark missing information as TBD.
11. Generate section by section.
12. Validate generated output.

Generate structured JSON first.

Validate using Zod.

Then render:

- SRS Preview
- DOCX
- PDF


============================================================
21. SRS REVIEW
============================================================

Review generated SRS for:

- missing requirements
- duplicate requirements
- conflicts
- incorrect classification
- wrong section placement
- missing information
- unsupported information
- broken traceability
- inconsistent terminology
- incomplete sections

Show issues.

Do not silently fix important requirements.


============================================================
22. TRACEABILITY
============================================================

Maintain:

User Input
 ↓
Interview Message
 ↓
Requirement ID
 ↓
System Feature
 ↓
SRS Section
 ↓
SRS Version


Example:

USER-MSG-042
 ↓
FR-007
 ↓
3.1 Event Registration
 ↓
3.1.3 Functional Requirements
 ↓
SRS v1.0


Create a traceability UI.


============================================================
23. SRS VERSIONING
============================================================

First approved SRS:

v1.0

After requirement change:

v1.1

Never overwrite old versions.

Store:

- version
- date
- changed requirements
- affected sections
- reason
- summary
- createdBy


============================================================
24. SRS UPDATE
============================================================

CORE FEATURE:

Example:

OLD:

FR-002:
Students can register for an event.


NEW USER INPUT:

Event registration requires administrator approval.


System:

1. Detect change.
2. Identify FR-002.
3. Retrieve related context using RAG.
4. Identify affected SRS section.
5. Generate proposed modification.
6. Show OLD vs NEW.
7. Validate.
8. Ask user approval.
9. Update affected SRS content.
10. Create SRS v1.1.
11. Preserve v1.0.
12. Update traceability.
13. Update Revision History.


============================================================
25. INCREMENTAL UPDATE
============================================================

DO NOT regenerate the entire SRS when only one requirement changes.

Use:

Existing SRS
 ↓
Requirement Change
 ↓
Change Detection
 ↓
Affected Requirement
 ↓
RAG Retrieval
 ↓
Affected SRS Section
 ↓
Proposed Update
 ↓
Validation
 ↓
User Approval
 ↓
New SRS Version


============================================================
26. VERSION COMPARISON
============================================================

Provide:

v1.0 VS v1.1

Show:

- Added requirements
- Modified requirements
- Removed requirements
- Affected sections
- Old content
- New content
- Reason for change


============================================================
27. REVISION HISTORY
============================================================

Follow the uploaded template's Revision History.

Store:

Name
Date
Reason For Changes
Version


============================================================
28. APPENDIX A — GLOSSARY
============================================================

Automatically collect relevant:

- technical terms
- domain terms
- acronyms
- abbreviations

Examples:

SRS
FR
NFR
LLM
RAG


============================================================
29. APPENDIX B — ANALYSIS MODELS
============================================================

Optionally support:

- Data Flow Diagram
- Class Diagram
- State Transition Diagram
- ER Diagram

Only generate when enough validated information exists.

Never invent relationships.


============================================================
30. APPENDIX C — ISSUES LIST
============================================================

Track:

- TBDs
- pending decisions
- missing information
- conflicts
- unresolved requirements
- clarification requests

Fields:

Issue ID
Description
Related Requirement
Priority
Status
Resolution


============================================================
31. AI ANTI-HALLUCINATION
============================================================

The AI must NEVER invent:

- requirements
- stakeholders
- features
- APIs
- integrations
- performance values
- security mechanisms
- business rules
- legal requirements
- technical architecture
- references

If information is missing:

"TBD — Needs Clarification"


============================================================
32. USER APPROVAL
============================================================

AI can:

- suggest
- classify
- detect
- analyze
- draft
- recommend

AI cannot silently:

- delete
- merge
- modify approved requirements
- overwrite approved SRS
- change requirement meaning

Important changes require user approval.


============================================================
33. DATABASE
============================================================

Create Mongoose models:

User
Project
InterviewSession
InterviewMessage
Requirement
RequirementIssue
SRS
SRSVersion
TraceabilityLink
DocumentChunk
EmbeddingMetadata
ResearchReference


============================================================
34. AI SERVICE ARCHITECTURE
============================================================

Create:

AIProvider
 └── OllamaProvider

Agents:

InterviewAgent
RequirementExtractionAgent
RequirementAnalysisAgent
ClassificationAgent
ValidationAgent
SRSGenerationAgent
SRSReviewAgent
SRSUpdateAgent


Controllers must NOT directly call Ollama.

Use service layer.


============================================================
35. PROMPT MANAGEMENT
============================================================

Create:

/prompts

interview.prompt.js
extraction.prompt.js
analysis.prompt.js
classification.prompt.js
validation.prompt.js
srs-generation.prompt.js
srs-review.prompt.js
srs-update.prompt.js


============================================================
36. API
============================================================

Authentication:

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me


Projects:

POST /api/projects
GET /api/projects
GET /api/projects/:id
PUT /api/projects/:id
DELETE /api/projects/:id


Interview:

POST /api/projects/:id/interview/start
POST /api/projects/:id/interview/message
GET /api/projects/:id/interview


Requirements:

GET /api/projects/:id/requirements
POST /api/projects/:id/requirements
PUT /api/requirements/:id
DELETE /api/requirements/:id


Analysis:

POST /api/projects/:id/requirements/analyze
POST /api/projects/:id/requirements/classify
POST /api/projects/:id/requirements/validate


SRS:

POST /api/projects/:id/srs/generate
GET /api/projects/:id/srs
PUT /api/srs/:id
POST /api/srs/:id/review


Versions:

GET /api/projects/:id/srs/versions
GET /api/projects/:id/srs/versions/:version
POST /api/projects/:id/srs/update
GET /api/projects/:id/srs/compare


Traceability:

GET /api/projects/:id/traceability


Export:

GET /api/projects/:id/srs/export/pdf
GET /api/projects/:id/srs/export/docx


============================================================
37. SIDEBAR
============================================================

Keep sidebar SIMPLE.

Use:

Dashboard

Projects

---------------------

CURRENT PROJECT

Project Overview
Requirements
Requirement Analysis
Validation
SRS

---------------------

Settings
Profile
Logout


Inside SRS page use tabs:

SRS Document
Traceability
Versions
Update SRS


============================================================
38. SRS UI
============================================================

SRS page:

LEFT:

Section navigation

CENTER:

SRS document

RIGHT:

Requirement traceability
AI suggestions
Validation information


Actions:

Generate SRS
Save
Validate
Approve
Compare
Export PDF
Export DOCX


============================================================
39. SECURITY
============================================================

Implement:

- JWT
- bcrypt/bcryptjs
- authorization
- input validation
- rate limiting
- CORS
- Helmet
- environment variables

Never expose:

HF_TOKEN
MongoDB credentials
JWT_SECRET

No API keys in frontend.


============================================================
40. ENVIRONMENT VARIABLES
============================================================

Use:

AI_PROVIDER=ollama

OLLAMA_BASE_URL=http://localhost:11434

OLLAMA_MODEL=codellama:7b-instruct

EMBEDDING_MODEL=BAAI/bge-small-en-v1.5

MONGODB_URI=

JWT_SECRET=

PORT=5000

NODE_ENV=development


IMPORTANT:

Do not require OPENAI_API_KEY.

Do not require HF_TOKEN for the primary setup.

The primary LLM must run through local Ollama.


============================================================
41. ERROR HANDLING
============================================================

Handle:

- Ollama unavailable
- model not installed
- AI timeout
- invalid AI response
- MongoDB error
- vector search failure
- authentication failure
- invalid project ID
- document generation error

Show user-friendly errors.

Never expose stack traces in production.


============================================================
42. AI OUTPUT VALIDATION
============================================================

Validate every AI response using Zod.

If invalid:

1. Retry safely.
2. Attempt structured repair.
3. Validate again.
4. Return controlled error if still invalid.

Never store malformed AI output.


============================================================
43. DOCUMENT EXPORT
============================================================

Generate:

PDF
DOCX

Use the uploaded SRS template structure.

The generated document must contain:

- Project name
- Version
- Author
- Organization
- Date
- Table of Contents
- Revision History
- Sections 1–6
- Appendix A
- Appendix B
- Appendix C

Preserve numbering and structure.


============================================================
44. UI PAGES
============================================================

Create:

/dashboard
/projects
/projects/new
/projects/[id]
/projects/[id]/requirements
/projects/[id]/analysis
/projects/[id]/validation
/projects/[id]/srs
/projects/[id]/versions
/projects/[id]/traceability
/projects/[id]/settings


Use JSX for all Next.js React pages and components.


============================================================
45. UI/UX
============================================================

Create a modern professional SaaS UI.

Use:

- clean sidebar
- cards
- tables
- status badges
- progress indicators
- requirement filters
- SRS section navigation
- AI suggestions
- traceability panel
- version comparison
- confirmation dialogs
- loading states
- empty states
- error states
- responsive design

Avoid:

- excessive animations
- unnecessary gradients
- clutter
- huge decorative elements


============================================================
46. DEMO PROJECT
============================================================

Use:

"College Event Management System"

Initial requirements:

FR-001:
Students shall view events.

FR-002:
Students shall register for events.

FR-003:
Administrators shall create events.

NFR-001:
Only authenticated users shall access protected functions.


Generate:

SRS v1.0


Then user enters:

"Event registration requires administrator approval."


System:

Change Detection
 ↓
FR-002
 ↓
RAG Retrieval
 ↓
Affected SRS Section
 ↓
Proposed Update
 ↓
Validation
 ↓
User Approval
 ↓
SRS v1.1


Preserve v1.0.


============================================================
47. RESEARCH CONTRIBUTION
============================================================

The project combines useful research concepts:

Paper 1:
LLM-based SRS generation and validation.

Paper 2:
Requirement extraction, FR/NFR classification,
structured generation and traceability.

Paper 3:
Embeddings, similarity, requirement grouping,
section mapping and incremental SRS update.

Our integrated contribution:

1. AI Requirement Interview
2. Requirement Extraction
3. Requirement Quality Analysis
4. FR/NFR Classification
5. Duplicate and Conflict Detection
6. Requirement Validation
7. RAG-based Context Retrieval
8. Template-aware SRS Generation
9. Source Traceability
10. Requirement Change Detection
11. Affected Section Detection
12. Incremental SRS Update
13. Version Control
14. Old vs New Comparison
15. PDF/DOCX Export


============================================================
48. DEVELOPMENT STRATEGY
============================================================

DO NOT build everything at once.

First inspect the existing repository.

Then show:

1. Proposed folder structure
2. Architecture
3. Database models
4. API structure
5. AI architecture
6. RAG architecture
7. SRS generation flow

Then implement incrementally:

STEP 1:
Project setup

STEP 2:
Next.js + Tailwind + JSX

STEP 3:
Express backend

STEP 4:
MongoDB

STEP 5:
Authentication

STEP 6:
Project creation

STEP 7:
AI Interview using Ollama

STEP 8:
Requirement extraction

STEP 9:
Requirement analysis

STEP 10:
Duplicate/conflict detection

STEP 11:
FR/NFR classification

STEP 12:
Requirement validation

STEP 13:
Embedding service

STEP 14:
RAG

STEP 15:
SRS template engine

STEP 16:
SRS generation

STEP 17:
SRS review

STEP 18:
Traceability

STEP 19:
SRS versioning

STEP 20:
Requirement change detection

STEP 21:
Incremental SRS update

STEP 22:
Old vs New comparison

STEP 23:
PDF/DOCX export

STEP 24:
Testing and error handling


After every step:

- run the application
- check errors
- fix errors
- preserve existing functionality
- do not break previous modules


============================================================
49. FINAL PROJECT BOUNDARY
============================================================

The final project MUST STOP at:

Project
 ↓
Requirements
 ↓
Analysis
 ↓
Validation
 ↓
RAG
 ↓
SRS Generation
 ↓
Review
 ↓
Traceability
 ↓
Versioning
 ↓
Requirement Change
 ↓
Incremental SRS Update
 ↓
PDF/DOCX


DO NOT implement the rest of the SDLC.


============================================================
50. FINAL OBJECTIVE
============================================================

Build IntelliSDLC AI as a real Software Requirements Engineering
platform, not a chatbot.

The platform must:

- understand requirements through AI interview
- extract structured requirements
- detect ambiguity
- detect duplicates
- detect conflicts
- classify FR/NFR
- validate requirements
- retrieve project context using RAG
- generate SRS using the uploaded SRS template
- maintain requirement traceability
- maintain SRS versions
- detect requirement changes
- update only affected SRS sections
- preserve previous versions
- export final SRS as PDF/DOCX

Use Ollama locally with:

AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=codellama:7b-instruct

Use:

EMBEDDING_MODEL=BAAI/bge-small-en-v1.5

Use JSX for frontend files.

The uploaded SRS template is the source of truth.

Before coding:

1. Inspect the repository.
2. Inspect the uploaded SRS template.
3. Do not delete working code.
4. Reuse existing components when appropriate.
5. Show folder structure.
6. Show architecture.
7. Start implementation step-by-step.
8. Test each module.