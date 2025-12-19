# Tech Spec: Story 2.3 - Multi-View Synchronization

**Implementation Guide for the Projections Architecture (Mindmap <-> Gantt <-> Kanban)**

## 1. Overview & Architecture

### The "Projections" Pattern
The system manages a **Single Source of Truth** (SSoT) in the Yjs `SharedMap` (the main graph).
- **Mindmap View:** The default spatial projection.
- **Gantt View:** A temporal projection.
- **Kanban View:** A status/state based projection.

**Architecture Diagram:**
```mermaid
graph TD
    YJS[Yjs SharedDoc\n(SSoT)] --> |Syncs| USE_GRAPH[useGraphData Hook]
    USE_GRAPH --> |Nodes & Edges| MM_VIEW[Mindmap View\n(Canvas)]
    USE_GRAPH --> |Nodes & Edges| COMP_GANTT[useGanttData TS]
    USE_GRAPH --> |Nodes & Edges| COMP_KANBAN[useKanbanData TS]
    
    COMP_GANTT --> |Computed Rows| GANTT_VIEW[Gantt Chart]
    COMP_KANBAN --> |Computed Columns| KANBAN_VIEW[Kanban Board]
    
    GANTT_VIEW --> |Action: Resize/Move| UPDATE_NODE[updateNode(id, changes)]
    KANBAN_VIEW --> |Action: Drag Card| UPDATE_NODE
    
    UPDATE_NODE --> |Commit| YJS
```

---

## 2. Core Data Structures

### 2.1 Task Attributes Extension
We must extend the `TaskAttributes` in `packages/types/src/task.ts`:

```typescript
// packages/types/src/task.ts

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  // Custom statuses might be handled via a separate field or extended enum
}

export interface TaskAttributes {
    status: TaskStatus;
    assigneeId?: string;
    dueDate?: string; // ISO DateTime
    startDate?: string; // ISO DateTime [NEW]
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    customStage?: string; // For dynamic Kanban columns
    progress?: number; // 0-100
}
```

### 2.2 View State
The current view mode is **local state** (or URL state), not persisted in Yjs (so two users can look at different views).

```typescript
// components/ViewSwitcher.tsx
type ViewMode = 'GRAPH' | 'GANTT' | 'KANBAN';

// Stored in Zustand or URL Query Param ?mode=gantt
const useViewStore = create<{
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}>((set) => ({ ... }));
```

---

## 3. Component Implementation Specifications

### 3.1 Kanban View Implementation
**Libraries:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**File:** `apps/web/src/features/views/components/KanbanView/KanbanBoard.tsx`

**Key Logic (`useKanbanData`):**
1.  **Filter:** Select nodes where `data.isTask === true`.
2.  **Group:** 
    - Default: Group by `data.task.status` (Enum Keys).
    - Map undefined status to 'TODO'.
3.  **Sort:** Maintain order based on `data.order` or alphabetical if null.

**Interaction:**
- **OnDragEnd:**
    - Detect which "Container" (Column) the item was dropped into.
    - If Column changed: Call `node.update({ task: { ...node.data.task, status: newStatus } })`.
    - **Optimistic UI:** relying on rapid local application of Yjs update usually suffices; otherwise, render optimistic state.

**Styling:**
- Columns: Flex/Grid columns with `bg-transparent`.
- Cards: Reuse `<NodeCard />` component from the Mindmap sidebar if available, or recreate utilizing the same Tailwind tokens (Rounded-lg, shadow-sm, border-border).

### 3.2 Gantt View Implementation
**Libraries:** `dhtmlx-gantt` (React Wrapper approach)

**File:** `apps/web/src/features/views/components/GanttView/GanttChart.tsx`

**Key Logic (`useGanttData`):**
1.  **Hierarchy Construction (The tricky part):**
    - The Gantt expects a tree: `{ id, text, start_date, duration, parent }`.
    - **Problem:** In Mindmap, `Task B` might be 3 levels deep under non-task nodes.
    - **Solution:** `findGanttParent(node)` algorithm:
        ```typescript
        function findGanttParent(node: Node, allNodes: Node[]): string {
            let parentId = node.parentId;
            while(parentId) {
                const parent = allNodes.find(n => n.id === parentId);
                if (!parent) return 'root'; // Orphan?
                if (parent.data?.isTask) return parent.id;
                if (parent.id === 'root') return 'root';
                parentId = parent.parentId; // Traverse up
            }
            return 'root';
        }
        ```
2.  **Date Handling:**
    - Gantt requires precise Start/End.
    - **Inference Rule:** 
      - If `!startDate` && `dueDate`: `start = dueDate - 1 day` (Render visually distinct).
      - If `!startDate` && `!dueDate`: Place in separate "Unscheduled" bucket (or default to Today + 1).

**Interaction:**
- **OnTaskDrag:** Event `onAfterTaskDrag` -> `node.update({ task: { startDate, dueDate } })`.
- **OnLinkAdd:** Event `onAfterLinkAdd` -> Create `dependency` Edge in X6 Graph.

**Performance:**
- `dhtmlx-gantt` is highly optimized (virtual DOM internal), but we must debounce the React wrapper updates if Yjs fires extremely rapidly.

---

## 4. Integration & Entry Points

### 4.1 ViewContainer
A wrapper component that swaps children based on `ViewMode`.

```tsx
// apps/web/src/features/views/ViewContainer.tsx

export const ViewContainer = () => {
  const mode = useViewStore(s => s.mode);
  const { nodes, edges } = useGraphData(); // The single data source
  
  // Important: Mount/Unmount vs Hidden.
  // For heavy views like Gantt, unmounting might lose scroll state. 
  // CSS display:none might be better for quick toggling, but heavier on DOM.
  // Decision: Use simple Unmount (conditional render) initially for simplicity.
  
  switch(mode) {
    case 'KANBAN': return <KanbanBoard nodes={nodes} />;
    case 'GANTT': return <GanttChart nodes={nodes} edges={edges} />;
    default: return <MindmapCanvas />; // Existing X6 Canvas
  }
}
```

### 4.2 Toolbar Integration
Mount `<ViewSwitcher />` in the Top Toolbar (`apps/web/src/components/Toolbar/MainToolbar.tsx`).
- Style: Segmented Control (Toggle Group).
- Icons: `ListTree` (Graph), `KanbanSquare` (Kanban), `GanttChart` (Gantt).

---

## 5. Performance Targets & constraints

1.  **Render Cycle:**
    - `useGraphData` updates on *every* Yjs change.
    - **Constraint:** `<KanbanBoard>` and `<GanttChart>` must use `React.memo` and deep-compare props to avoid re-rendering the entire board when a single node changes position.
2.  **Batching:**
    - If dragging multiple items in Gantt, perform a bulk Yjs transaction: `doc.transact(() => { ...updates... })`.

## 6. Testing Strategy

### 6.1 Unit Tests (Vitest)
- `useGanttData.spec.ts`: 
    - Mock a graph with `Root -> Detail -> Task A`.
    - Assert `findGanttParent` returns `Root` (skipping Detail).
    - Mock a graph with `Root -> Task A -> Detail -> Task B`.
    - Assert `findGanttParent(Task B)` returns `Task A`.

- `useKanbanData.spec.ts`:
    - Mock nodes with mixed statuses.
    - Assert correct grouping into columns.

### 6.2 Integration (Playwright)
- **Status Sync Test:**
    1. Open Mindmap view. change Node A status to "DONE".
    2. Switch to Kanban.
    3. Verify Node A is in "Done" column.
- **Date Sync Test:**
    1. Open Gantt.
    2. Drag Task B to new date.
    3. Switch to Mindmap.
    4. Inspect Task B properties. Verify ISO Date string matches.

---

## 7. Migration Steps
1.  **DB Migration:** `npx prisma migrate dev --name add_start_date`
2.  **Package Build:** `pnpm build --filter @cdm/types`
3.  **Feature Dev:** Implement Kanban -> Gantt -> Switcher.

