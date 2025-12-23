# Tech-Spec: Approval Driven Workflow (Story 4.1)

**Created:** 2025-12-23
**Updated:** 2025-12-23 (Post-Audit Revision)
**Status:** Ready for Development

## Overview

### Problem Statement
Currently, tasks in the CDM-17 mind map are static. There is no system to enforce quality control or formal sign-off. Users need a mechanism to submit tasks for approval, where the approval action automatically unlocks dependent downstream tasks, replacing manual coordination ("Is this done?", "Can I start yet?") with automated flow.

### Solution
Implement a **JSON Pipeline Approval System** integrated into the Mind Map nodes.
- **Data-Driven**: Store approval steps and status in `Node.approval` (JSONB), deliverables in `NodeTask.deliverables`.
- **Event-Driven**: Use NestJS `EventEmitter2` to trigger dependency unlocking upon approval.
- **Plugin-Based**: Encapsulate logic in `packages/plugins/workflow-approval`.
- **API-Guarded**: Backend validates permissions and writes to Yjs (not frontend-first).

### Scope (In/Out)
*   **IN**:
    *   Linear approval steps (Submit -> Review -> Approve/Reject)
    *   `Node.approval` and `NodeTask.deliverables` schema updates
    *   API for Submit/Approve/Reject with permission validation
    *   Automatic dependency unlocking via edge filters
    *   Real-time notifications via existing NotificationModule
    *   UserSelector component for approver selection
*   **OUT**:
    *   Complex BPMN gateways (Parallel, XOR)
    *   Visual Process Designer (BPMN.io)
    *   History/Audit Log distinct view (covered in Epic 3)
    *   Extending `TaskStatus` enum (approval status is independent)

## Context for Development

### Codebase Patterns
- **Microkernel Plugin**: Implementation must reside in `packages/plugins/workflow-approval`
- **Polymorphic Nodes**: The `Node` entity is the core. Approval is an aspect of a Node
- **Service Layer**: `NodesService` handles CRUD; `ApprovalService` handles approval logic
- **Event Bus**: Use `EventEmitter2` for decoupling approval logic from dependency logic
- **Edge Utils**: Use `packages/plugins/plugin-mindmap-core/src/utils/edgeFilters.ts` for dependency edge filtering

### Files to Reference
- `packages/database/prisma/schema.prisma`: Core data model
- `apps/api/src/modules/nodes/nodes.service.ts`: Node management patterns
- `apps/api/src/modules/notification/notification.service.ts`: Notification patterns
- `packages/plugins/plugin-mindmap-core/src/utils/edgeFilters.ts`: Dependency edge utilities
- `apps/web/components/PropertyPanel/TaskForm.tsx`: UI patterns for node properties

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approval Storage | New `Node.approval: Json?` field | Clean separation from `metadata`; explicit for approval data |
| Deliverables | New `NodeTask.deliverables: Json?` field | `knowledgeRefs` is semantically different (knowledge vs deliverable) |
| Status Independence | `ApprovalStatus` separate from `TaskStatus` | Avoid breaking Kanban/Gantt views; overlay badge on UI instead |
| Write Mode | API -> Backend writes Yjs | Permission validation required; security over pure Yjs-first |
| User Selection | Build UserSelector component | Query from `User` table; proper UX with search |

## Schema Changes

### Node Model Update
```prisma
model Node {
  // ... existing fields
  approval Json? // Stores ApprovalPipeline
}
```

### NodeTask Model Update
```prisma
model NodeTask {
  // ... existing fields
  deliverables Json? // Array: [{ id, fileId, fileName, uploadedAt }]
}
```

### Type Definitions (`packages/types/src/approval.ts`)
```typescript
// Approval Status Enum
export type ApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

// Approval Step (for multi-step pipelines)
export interface ApprovalStep {
  index: number;
  name: string;           // e.g., "Tech Review", "Final Approval"
  assigneeId: string;     // User ID of approver
  status: 'waiting' | 'pending' | 'approved' | 'rejected';
  completedAt?: string;   // ISO 8601
  reason?: string;        // If rejected
}

// Approval Pipeline (stored in Node.approval)
export interface ApprovalPipeline {
  status: ApprovalStatus;
  currentStepIndex: number;
  steps: ApprovalStep[];
  history: ApprovalHistoryEntry[];
}

// History Entry
export interface ApprovalHistoryEntry {
  timestamp: string;
  action: 'submitted' | 'approved' | 'rejected';
  actorId: string;
  stepIndex: number;
  reason?: string;
}

// Deliverable
export interface Deliverable {
  id: string;             // nanoid
  fileId: string;         // Reference to file storage
  fileName: string;
  uploadedAt: string;     // ISO 8601
}
```

### Notification Types Update (`packages/types/src/notification-types.ts`)
```typescript
export type NotificationType = 
  | 'TASK_DISPATCH' 
  | 'TASK_ACCEPTED' 
  | 'TASK_REJECTED'
  | 'APPROVAL_REQUESTED'   // New
  | 'APPROVAL_APPROVED'    // New
  | 'APPROVAL_REJECTED';   // New
```

## Implementation Plan

### Tasks

#### 1. Database & Schema
- [ ] Update `packages/database/prisma/schema.prisma`:
    - Add `approval Json?` to `Node` model
    - Add `deliverables Json?` to `NodeTask` model
- [ ] Create type definitions in `packages/types/src/approval.ts`
- [ ] Run `pnpm db:migrate`

#### 2. Event System Setup
- [ ] Install: `pnpm add @nestjs/event-emitter -F api`
- [ ] Update `apps/api/src/app.module.ts`:
```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // ... other imports
  ],
})
```
- [ ] Define event payloads in `packages/types/src/approval-events.ts`:
```typescript
export interface ApprovalRequestedEvent {
  nodeId: string;
  requesterId: string;
  approverId: string;
  stepIndex: number;
}

export interface ApprovalResolvedEvent {
  nodeId: string;
  status: 'APPROVED' | 'REJECTED';
  approverId: string;
  stepIndex: number;
  reason?: string;
}
```

#### 3. Backend Plugin (NestJS)
- [ ] Create directory: `packages/plugins/workflow-approval/server/`
- [ ] `approval.module.ts`: Register service, controller, listener
- [ ] `approval.service.ts`:
    - `submit(nodeId, userId)`: Validate deliverables exist, update approval, emit event
    - `approve(nodeId, approverId)`: Advance step, emit event, write Yjs
    - `reject(nodeId, approverId, reason)`: Require reason, emit event, write Yjs
- [ ] `approval.controller.ts`: REST endpoints
- [ ] `approval.listener.ts`: Listen for `approval.resolved`, trigger dependency unlock

#### 4. Dependency Unlocking Logic
```typescript
// In approval.listener.ts
import { getDependencyOutgoingEdges } from '@cdm/mindmap-core';

@OnEvent('approval.resolved')
async handleApprovalResolved(event: ApprovalResolvedEvent) {
  if (event.status !== 'APPROVED') return;

  // Find successor tasks via dependency edges
  const successorEdges = await this.edgeRepo.findBySourceId(event.nodeId, 'dependency');
  
  for (const edge of successorEdges) {
    const successorNode = await this.nodeRepo.findById(edge.targetId);
    if (successorNode?.type !== 'TASK') continue;
    
    // Check if ALL dependencies are satisfied
    const allDependenciesMet = await this.checkAllDependenciesMet(successorNode.id);
    if (allDependenciesMet) {
      await this.nodeRepo.updateTaskProps(successorNode.id, { status: 'todo' });
      // Write to Yjs
      await this.hocuspocus.handleNode(successorNode.graphId, successorNode.id, { status: 'todo' });
    }
  }
}
```

#### 5. User Module (for UserSelector)
- [ ] Create `apps/api/src/modules/users/`:
    - `users.module.ts`
    - `users.service.ts`
    - `users.controller.ts`
- [ ] Endpoints:
    - `GET /users` - List all users
    - `GET /users/search?q=xxx` - Search by name/email

#### 6. Frontend Plugin (React/X6)
- [ ] **ApprovalStatusPanel** (`packages/plugins/workflow-approval/client/ApprovalStatusPanel.tsx`)
    - **Header**: "审批流程" + `ShieldCheck` icon + Status Badge
    - **Stepper**: Vertical visual progress tracker (Shadcn/Magic UI style)
        - *Completed*: Green checkmark icon, muted text, completed timestamp
        - *Active*: Blue pulsing dot, highlighted user avatar with name
        - *Pending*: Gray outlined circle
    - **Deliverables Section**: File list with upload button
    - **Action Area**: Context-aware buttons
        - Assignee sees: "Submit for Approval" (disabled if no deliverables)
        - Approver sees: "Approve" (green) / "Reject" (red outline)
- [ ] **Node Visuals**: Add approval status decorations
    - `PENDING`: Yellow/Blue border halo + lock icon
    - `APPROVED`: Green border halo + checkmark
    - `REJECTED`: Red border halo + X icon
- [ ] **UserSelector** (`apps/web/components/UserSelector/UserSelector.tsx`)
    - Async search with debounce
    - Avatar + name display
    - Keyboard navigation (arrow keys, enter)
- [ ] **Integration**: Register in PropertyPanel when node has approval config

### Acceptance Criteria Validation

- [ ] **AC 1: Submit Flow**
    - Given a Task node with 1+ deliverable and approval steps configured
    - When assignee clicks "Submit for Approval"
    - Then `Node.approval.status` = `PENDING`
    - And approver receives `APPROVAL_REQUESTED` notification
    - And node shows yellow border
- [ ] **AC 2: Approve Flow**
    - Given Task A is PENDING, Task B depends on A (FS edge)
    - When approver clicks "Approve"
    - Then `Node.approval.status` = `APPROVED`
    - And Task B's `TaskProps.status` changes to `todo`
    - And node shows green border
- [ ] **AC 3: Reject Flow**
    - When approver clicks "Reject"
    - Then rejection reason input is required
    - Then `Node.approval.status` = `REJECTED`
    - And assignee receives `APPROVAL_REJECTED` notification with reason
    - And node shows red border

## Additional Context

### UI Mockup
![Approval Panel Mockup](../images/approval-panel-ui.png)

### Dependencies
- **Notifications**: Extend `apps/api/src/modules/notification` with new types
- **Auth**: Ensure `currentUser` is passed to all API calls to validate identity
- **Edge Filters**: MUST use `@cdm/mindmap-core` edge utilities

### Testing Strategy
- **Unit**: 
    - `ApprovalService.submit()` - validates deliverables
    - `ApprovalService.approve()` - advances step correctly
    - `ApprovalListener` - unlocks dependencies
- **Integration**: 
    - Full flow: Configure approval -> Upload deliverable -> Submit -> Approve -> Check successor unlocked
- **E2E**: 
    - UI updates without refresh (Yjs sync)
    - Notifications appear in NotificationBell

### Notes
- **Future Proofing**: The JSON structure allows adding "Parallel" or "Or-Sign" logic later without schema migration
- **Status Independence**: `ApprovalStatus` does NOT affect `TaskStatus`. Kanban/Gantt views continue to use `todo/in-progress/done`. UI overlays approval badge only.
