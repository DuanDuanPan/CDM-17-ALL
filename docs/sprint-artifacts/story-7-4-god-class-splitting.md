# Story 7.4: Core God Class Splitting

Status: done

## Story

As a **开发者**,
I want **将 `GraphComponent.tsx` 和 `MindNode.tsx` 拆分为职责单一的小型模块**,
So that **代码可读性提升，Git 冲突减少，单元测试更易编写。**

## Acceptance Criteria

1.  **Metric Success**:
    - `GraphComponent.tsx` extracted into sub-modules, main file < 300 lines.
    - `MindNode.tsx` extracted into sub-components, main file < 300 lines.
    - `useClipboard.ts` broken down into granular hooks, main file < 300 lines.
2.  **Module Independence**:
    - Extracted modules (e.g., `GraphEvents`, `GraphHotkeys`) must act as pure functional logical units or focused UI components.
    - No circular dependencies between extracted modules.
    - **Circular Dependency Prevention**: Extracted hooks MUST NOT import from `GraphComponent` or `MindNode` directly. Use props-based dependency injection.
3.  **Regression Safety**:
    - All E2E tests for Canvas interaction (Panning, Zooming), Node Operations (Add, Delete, Edit), and Shortcuts MUST pass.
    - Verify "Copy/Paste/Cut" functionality specifically after `useClipboard` refactor.
    - **Existing Tests**: `apps/web/e2e/clipboard-data-sanitization.spec.ts`, `apps/web/e2e/collaboration.spec.ts`
4.  **Architecture**:
    - Adhere to **Hook-First** pattern: Move logic to custom hooks where possible ([architecture.md:650-652](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/docs/architecture.md#L650-L652)).
    - Adhere to **Single Responsibility Principle**.
    - **File Size Limit**: Files >300 lines MUST be candidates for splitting ([architecture.md:647](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/docs/architecture.md#L647)).

## Tasks / Subtasks

- [x] 1. Refactor `GraphComponent.tsx` (1361 lines → 266 lines ✅)
    - [x] 1.1 Analyze `GraphComponent.tsx` responsibilities.
    - [x] 1.2 Extract `useGraphInitialization` hook for init logic (keep `useGraphTransform` for pan/zoom state).
    - [x] 1.3 Extract `useGraphEvents` hook for event listeners.
    - [x] 1.4 Extract `useGraphHotkeys` hook for shortcut handling.
    - [x] 1.5 Extract `useGraphSelection` hook for selection logic.
    - [x] 1.6 Extract `useGraphDependencyMode` hook for dependency mode.
    - [x] 1.7 Extract `useGraphContextMenu` hook for context menu handling.
    - [x] 1.8 Verify `GraphComponent.tsx` is a **composition root**.
- [x] 2. Refactor `MindNode.tsx` (950 lines → 219 lines ✅)
    - [x] 2.1 Analyze `MindNode.tsx`.
    - [x] 2.2 Delegate to `OrdinaryNode.tsx` (Pure UI rendering).
    - [x] 2.3 Delegate to `RichNode.tsx` (Rich node rendering).
    - [x] 2.4 Delegate to `LegacyCardNode.tsx` (Legacy support).
    - [x] 2.5 Use `getNodeRenderer` for dynamic dispatch.
- [x] 3. Refactor `useClipboard.ts` (963 lines → 222 lines ✅)
    - [x] 3.1 Create `hooks/clipboard/clipboardSerializer.ts`.
    - [x] 3.2 Create `hooks/clipboard/clipboardPaste.ts`.
    - [x] 3.3 Create `hooks/clipboard/clipboardCut.ts`.
    - [x] 3.4 Create `hooks/clipboard/clipboardDelete.ts`.
    - [x] 3.5 Create `hooks/clipboard/pasteHelpers.ts`.
    - [x] 3.6 Implement Unit Tests (26/26 passing).
- [x] 4. Verification & Testing
    - [x] 4.1 Run existing E2E tests (`pnpm --filter @cdm/web test:e2e`) (95 passed, 2 skipped ✅).
    - [x] 4.2 Manual Check: Drag & Drop nodes (covered by E2E).
    - [x] 4.3 Manual Check: Copy (Cmd+C) -> Paste (Cmd+V) -> Cut (Cmd+X) (covered by E2E).
    - [x] 4.4 Manual Check: Shortcuts (Tab, Enter, Space) (covered by E2E).

- [x] 5. Review Follow-ups (AI)
    - [x] [AI-Review][HIGH] 修复并重新启用现有 E2E：`apps/web/e2e/collaboration.spec.ts` 多处 `test()` 签名不符合 Playwright 要求，导致整套 E2E 直接失败（违反 AC3 “Existing Tests MUST pass”）。[apps/web/e2e/collaboration.spec.ts:49]
    - [x] [AI-Review][HIGH] 修正 Dev Agent Record → File List：移除仓库中不存在的文件，并补齐实际变更文件（降低“错误声明”风险）。[docs/sprint-artifacts/story-7-4-god-class-splitting.md:175]
    - [x] [AI-Review][CRITICAL] Task 1.2 标记已完成但实现与描述不符：新增 `useGraphInitialization.ts` 并将 init logic 下沉；`useGraphTransform` 保持仅用于跟踪 pan/zoom（协作光标）。[docs/sprint-artifacts/story-7-4-god-class-splitting.md:34]
    - [x] [AI-Review][CRITICAL] Task 1.8 “GraphComponent 是 composition root” 目前不满足你在 Dev Notes 的定义：将初始化/同步 glue 下沉到 hooks（`useGraphInitialization`）。[docs/sprint-artifacts/story-7-4-god-class-splitting.md:40]
    - [x] [AI-Review][HIGH] 修复 `mindmap:node-operation` 事件链路：`bindCustomEvents()` 在插件 initialize 时注册；移除 `useGraphEvents` 中空实现的 handler。[apps/web/components/graph/hooks/useGraphEvents.ts:122]
    - [x] [AI-Review][MEDIUM] 加强 `apps/web/e2e/clipboard-operations.spec.ts` 的断言，并清理未使用 helper/变量，避免“绿色但无效”的测试。[apps/web/e2e/clipboard-operations.spec.ts:90]
    - [x] [AI-Review][MEDIUM] `clipboardPaste.spec.ts` 的 TC-Paste-1 移除 `Math.random` 模拟路径，改为对真实 `pasteFromClipboard` 写入 Yjs 的结果做断言。[apps/web/hooks/__tests__/clipboardPaste.spec.ts:243]
    - [x] [AI-Review][LOW] `TitleRow`/`LegacyCardNode` 增加父容器 `group` class，确保 `group-hover:*` 生效（菜单按钮可见）。[apps/web/components/nodes/rich/TitleRow.tsx:62]
    - [x] [AI-Review][LOW] 清理本次拆分引入的 ESLint warnings（例如 `useGraphContextMenu`/`useGraphHotkeys`/`useGraphEvents` 等 unused imports/args）。[apps/web/components/graph/hooks/useGraphContextMenu.ts:6]

## Dev Notes

### Composition Root Definition

> **CRITICAL**: A **composition root** is a component that ONLY:
> - Renders extracted sub-components
> - Calls hooks and passes their returns as props
> - Contains JSX composition logic
> 
> It should contain **NO business logic** beyond JSX composition and hook invocation.

### Yjs-First Data Flow (CRITICAL)

> **⚠️ WARNING**: All clipboard operations MUST go through Yjs mutations, NOT React's `setState`.
> 
> The current `useClipboard` correctly uses Yjs for data persistence. When extracting `useCopyHandler`, `usePasteHandler`, and `useCutHandler`, you MUST preserve this pattern.
> 
> **Anti-Pattern** (PROHIBITED):
> ```typescript
> // ❌ WRONG: Local state mutation
> setState(newValue);
> api.save(newValue);
> ```
> 
> **Correct Pattern**:
> ```typescript
> // ✅ CORRECT: Yjs-first mutation
> yNodes.set(nodeId, newNodeData);
> // Yjs -> Hocuspocus -> All Clients Update
> ```
> 
> Reference: [architecture.md:546-549](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/docs/architecture.md#L546-L549)

### Architecture Patterns

- **Hook-First**: Logic resides in `hooks/`, UI in `components/` ([architecture.md:650-652](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/docs/architecture.md#L650-L652)).
- **Feature-First**: Keep extracted files close to their consumers.
  - `apps/web/components/graph/hooks/`
  - `apps/web/components/graph/parts/`
  - `apps/web/components/nodes/parts/`
- **Isomorphic Types**: Use `packages/types` for shared data models.
- **300-Line Limit**: Files >300 lines must be split ([architecture.md:647](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/docs/architecture.md#L647)).

### Type Export Convention (from Story 7.3)

> **Learning from Story 7.3**: All extracted hooks MUST explicitly export their Props types:
> ```typescript
> export type { UseGraphEventsOptions } from './useGraphEvents';
> export type { UseCopyHandlerOptions } from './useCopyHandler';
> ```

### Source Tree Focus

| File | Current Lines | Target | Key Extractions |
|:-----|:-------------:|:------:|:----------------|
| `apps/web/components/graph/GraphComponent.tsx` | 1361 | <300 | 6+ hooks |
| `apps/web/components/nodes/MindNode.tsx` | 950 | <300 | 3 components + 1 hook |
| `apps/web/hooks/useClipboard.ts` | 963 | <300 | 3 handlers + utils |

### Risk Mitigation

- **"God Class" Refactoring Risk**: High chance of breaking implicit state dependencies.
- **Mitigation**:
    - Refactor **one component at a time**.
    - Verify after EACH extraction—don't do "Big Bang" refactor.
    - Check for `refs` being passed around. Replace `ref` drilling with Context or Zustand if strictly UI state.
    - Preserve Yjs data bindings in all extracted modules.

## Unit Test Requirements

### `useCopyHandler` Test Cases

| Test ID | Description | Input | Expected Output |
|:--------|:------------|:------|:----------------|
| TC-Copy-1 | Recursive Descendant Collection | Select `ParentNode` with child | JSON `nodes` array contains BOTH |
| TC-Copy-2 | Data Sanitization | Node with `storagePath`, `ownerId` | Output excludes sensitive fields |
| TC-Copy-3 | Structural Integrity | Tree A → B → C | `edges` contains A→B and B→C |

### `usePasteHandler` Test Cases

| Test ID | Description | Input | Expected Output |
|:--------|:------------|:------|:----------------|
| TC-Paste-1 | ID Regeneration | Clipboard with `originalId: "node-1"` | Pasted node has different ID |
| TC-Paste-2 | Hierarchy Restoration | Parent (P') and Child (C') | C'.parentId === P' |
| TC-Paste-3 | Orphan Handling | Node without parent in clipboard | Attaches to current Root/selected |
| TC-Paste-4 | Edge Reconstruction | Edges in clipboard | New edges with new node IDs |

### `useCutHandler` Test Cases

| Test ID | Description | Input | Expected Output |
|:--------|:------------|:------|:----------------|
| TC-Cut-1 | Copy + Delete | Selected nodes | Nodes in clipboard AND removed from graph |
| TC-Cut-2 | Yjs Persistence | Cut operation | Changes persisted via Yjs, not local state |
| TC-Cut-3 | Undo Support | Cut then Cmd+Z | Nodes restored to original positions |

## Tech-Spec Reference

> **详细实现计划见**: [tech-spec-story-7-4.md](file:///Users/enjoyjavapan/Documents/方案雏形/CDM-17-ALL/docs/sprint-artifacts/tech-spec-story-7-4.md)

## Dev Agent Record

### Agent Model Used

Antigravity

### Completion Checklist

| Metric | Target | Actual | Status |
|:-------|:------:|:------:|:------:|
| GraphComponent.tsx lines | <300 | 266 | ✅ |
| MindNode.tsx lines | <300 | 219 | ✅ |
| useClipboard.ts lines | <300 | 222 | ✅ |
| E2E tests pass | ✅ | 95 passed, 2 skipped | ✅ |
| Unit tests for clipboard hooks | ✅ | 26/26 | ✅ |

### File List (Actual Changes)

**New Files:**
- `apps/web/components/graph/hooks/index.ts`
- `apps/web/components/graph/hooks/useGraphContextMenu.ts`
- `apps/web/components/graph/hooks/useGraphCursor.ts`
- `apps/web/components/graph/hooks/useGraphDependencyMode.ts`
- `apps/web/components/graph/hooks/useGraphEvents.ts`
- `apps/web/components/graph/hooks/useGraphHotkeys.ts`
- `apps/web/components/graph/hooks/useGraphInitialization.ts`
- `apps/web/components/graph/hooks/useGraphSelection.ts`
- `apps/web/components/graph/hooks/useGraphTransform.ts`
- `apps/web/components/graph/parts/ConnectionStatus.tsx`
- `apps/web/components/graph/parts/DependencyModeIndicator.tsx`
- `apps/web/components/graph/parts/EdgeContextMenu.tsx`
- `apps/web/components/graph/parts/NodeContextMenu.tsx`
- `apps/web/components/graph/parts/index.ts`
- `apps/web/components/nodes/LegacyCardNode.tsx`
- `apps/web/components/nodes/OrdinaryNode.tsx`
- `apps/web/components/nodes/RichNode.tsx`
- `apps/web/components/nodes/hooks/index.ts`
- `apps/web/components/nodes/hooks/useAppExecution.ts`
- `apps/web/components/nodes/hooks/useNodeDataSync.ts`
- `apps/web/components/nodes/hooks/useNodeEditing.ts`
- `apps/web/components/nodes/nodeConfig.ts`
- `apps/web/e2e/clipboard-operations.spec.ts`
- `apps/web/hooks/__tests__/clipboardCut.spec.ts`
- `apps/web/hooks/__tests__/clipboardDelete.spec.ts`
- `apps/web/hooks/__tests__/clipboardPaste.spec.ts`
- `apps/web/hooks/__tests__/clipboardSerializer.spec.ts`
- `apps/web/hooks/clipboard/clipboardCut.ts`
- `apps/web/hooks/clipboard/clipboardDelete.ts`
- `apps/web/hooks/clipboard/clipboardPaste.ts`
- `apps/web/hooks/clipboard/clipboardSerializer.ts`
- `apps/web/hooks/clipboard/index.ts`
- `apps/web/hooks/clipboard/pasteHelpers.ts`
- `docs/sprint-artifacts/story-7-4-god-class-splitting.md`
- `docs/sprint-artifacts/tech-spec-story-7-4.md`

**Modified Files:**
- `apps/web/components/PropertyPanel/DataForm.tsx`
- `apps/web/components/graph/GraphComponent.tsx`
- `apps/web/components/layout/RightSidebar.tsx`
- `apps/web/components/nodes/MindNode.tsx`
- `apps/web/components/nodes/rich/RichNodeLayout.tsx`
- `apps/web/components/nodes/rich/TitleRow.tsx`
- `apps/web/components/nodes/rich/renderers.tsx`
- `apps/web/hooks/useClipboard.ts`
- `apps/web/e2e/collaboration.spec.ts`
- `apps/web/e2e/multi-view-synchronization.spec.ts`
- `apps/web/e2e/node-type-conversion.spec.ts`
- `apps/web/e2e/permanent-delete.spec.ts`
- `apps/web/e2e/watch_subscription.spec.ts`
- `apps/web/features/collab/GraphSyncManager.ts`
- `docs/sprint-artifacts/sprint-status.yaml`
- `packages/plugins/plugin-mindmap-core/src/index.ts`
