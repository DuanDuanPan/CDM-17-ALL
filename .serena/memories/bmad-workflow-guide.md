# BMAD Workflow Guide

## What is BMAD?
**BMAD (Behavior-Modeled Adaptive Development)** is a structured, AI-agent-powered development methodology that guides projects through phases with specialized workflows and agents.

## Current Workflow Status
Track progress in: `docs/bmm-workflow-status.yaml`

**Current Track**: `bmad-method` (greenfield)  
**Field Type**: `greenfield`

## Project Phases

### Phase 1: Analysis
- ✅ **research**: Market/Domain/Technical research
- ✅ **product-brief**: High-level product vision and goals

### Phase 2: Planning
- ✅ **create-prd**: Product Requirements Document
- ✅ **create-ux-design**: UX design specification

### Phase 3: Solutioning
- ✅ **create-architecture**: Architecture decision document
- 🔄 **create-epics-and-stories**: Epic/story breakdown (required, next step)
- ⏳ **test-design**: Test architecture design (recommended)
- ⏳ **validate-architecture**: Architecture validation (optional)
- ⏳ **implementation-readiness**: Pre-implementation checklist (required)

### Phase 4: Implementation
- ⏳ **sprint-planning**: Sprint planning and tracking
- ⏳ **create-story**: Create individual user stories
- ⏳ **dev-story**: Implement stories with TDD
- ⏳ **code-review**: Adversarial senior dev review
- ⏳ **retrospective**: Epic completion retrospective

## Available Slash Commands

### Analysis Workflows
- `/bmad:bmm:workflows:research` - Conduct market/domain/technical research
- `/bmad:bmm:workflows:create-product-brief` - Create product brief

### Planning Workflows
- `/bmad:bmm:workflows:create-prd` - Create PRD through collaborative PM dialogue
- `/bmad:bmm:workflows:create-ux-design` - Design UX patterns and look-and-feel

### Solutioning Workflows
- `/bmad:bmm:workflows:create-architecture` - Architectural decision facilitation
- `/bmad:bmm:workflows:create-epics-stories` - **[NEXT STEP]** Transform PRD+Architecture into epics/stories
- `/bmad:bmm:workflows:testarch-test-design` - Test architecture planning
- `/bmad:bmm:workflows:check-implementation-readiness` - Validate PRD/Arch/Stories alignment

### Implementation Workflows
- `/bmad:bmm:workflows:sprint-planning` - Generate sprint status tracking
- `/bmad:bmm:workflows:create-story` - Create next user story
- `/bmad:bmm:workflows:dev-story` - Execute story with tasks/tests/validation
- `/bmad:bmm:workflows:code-review` - Adversarial code review
- `/bmad:bmm:workflows:retrospective` - Epic completion review

### Quick Flows (Alternative to Full BMAD)
- `/bmad:bmm:workflows:quick-dev` - Flexible dev with optional planning
- `/bmad:bmm:workflows:create-tech-spec` - Conversational tech spec creation

### Utility Workflows
- `/bmad:bmm:workflows:workflow-status` - Check "what should I do now?"
- `/bmad:bmm:workflows:document-project` - Analyze/document brownfield projects
- `/bmad:bmm:workflows:generate-project-context` - Create concise project_context.md

### Diagram Workflows
- `/bmad:bmm:workflows:create-excalidraw-wireframe` - Create wireframes
- `/bmad:bmm:workflows:create-excalidraw-diagram` - System architecture diagrams
- `/bmad:bmm:workflows:create-excalidraw-flowchart` - Process flowcharts
- `/bmad:bmm:workflows:create-excalidraw-dataflow` - Data flow diagrams

## Key Agents
- `/bmad:bmm:agents:pm` - Product Manager persona
- `/bmad:bmm:agents:architect` - Software architect
- `/bmad:bmm:agents:dev` - Developer agent
- `/bmad:bmm:agents:tea` - Test engineer/QA
- `/bmad:bmm:agents:ux-designer` - UX design specialist

## Documentation Standards
All BMAD deliverables are stored in `docs/`:
- `project-brief.md` - Product vision
- `prd.md` - Full requirements
- `ux-design-specification.md` - UX patterns
- `architecture.md` - Architectural decisions
- `epics.md` - Epic/story breakdown (to be created)
- `sprint-artifacts/` - Sprint-specific files

## Next Recommended Action
Run: `/bmad:bmm:workflows:create-epics-stories`

This will:
1. Validate PRD and Architecture documents
2. Break down requirements into implementation epics
3. Generate detailed user stories with acceptance criteria
4. Prepare the project for sprint planning
