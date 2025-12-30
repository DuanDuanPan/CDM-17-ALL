# Tech-Spec: Core God Class Splitting (Story 7.4)

**Created:** 2025-12-30
**Status:** Ready for Development

## Overview

### Problem Statement
`GraphComponent.tsx` (>1300 lines), `MindNode.tsx` (>900 lines), and `useClipboard.ts` (>900 lines) have become "God Classes," leading to poor maintainability, frequent git conflicts, and difficulty in testing.

### Solution
Refactor these large files by extracting logic into smaller, single-responsibility hooks and components, reducing main file sizes to <300 lines while maintaining 100% regression safety via E2E and new Unit Tests.

### Scope (In/Out)
**In Scope:**
- `GraphComponent.tsx` -> `useGraphEvents`, `useGraphHotkeys`, `GraphCanvas`.
- `MindNode.tsx` -> `NodeRenderer`, `NodeEditor`, `NodeConnectors`.
- `useClipboard.ts` -> `useCopyHandler`, `usePasteHandler`.
- Unit Tests for extracted hooks.

**Out of Scope:**
- Changing business logic of Graph or Clipboard operations.
- UI redesign.

## Context for Development

### Codebase Patterns
- **Hook-First**: Logic resides in `hooks/`, UI in `components/`.
- **Yjs-First**: State mutations go through Yjs/Hocuspocus, not local state.
- **X6 Integration**: `GraphComponent` manages the X6 instance lifecycle.

### Files to Reference
- `apps/web/components/graph/GraphComponent.tsx`
- `apps/web/components/nodes/MindNode.tsx`
- `apps/web/hooks/useClipboard.ts`
- `apps/web/__tests__/GraphComponent.test.tsx` (Update needed)

### Technical Decisions
- **Extraction Strategy**:
  - **GraphComponent**: Split by functionality (Layout, Events, Hotkeys).
  - **MindNode**: Split by visual layer (Renderer) vs interaction layer (Editor).
  - **useClipboard**: Split into `useCopyHandler` (Read) and `usePasteHandler` (Write).
- **State Management**: Use `jotai` or React Context if props drilling becomes excessive during splitting.

## Implementation Plan

### Tasks

- [ ] **Phase 1: GraphComponent Refactor**
  - Extract `useGraphInitial(graph)` -> Init logic.
  - Extract `useGraphEvents(graph)` -> Event listeners.
  - Extract `useGraphHotkeys(graph)` -> Keyboard shortcuts.
  - Move sub-components to `components/graph/parts/`.

- [ ] **Phase 2: MindNode Refactor**
  - Extract `NodeRenderer.tsx` -> Pure UI.
  - Extract `NodeEditor.tsx` -> Input handling.
  - Extract `NodeConnectors.tsx` -> Port logic.

- [ ] **Phase 3: useClipboard Refactor**
  - Create `hooks/clipboard/useCopyHandler.ts`.
  - Create `hooks/clipboard/usePasteHandler.ts`.
  - Create `hooks/clipboard/useCutHandler.ts`.
  - Create `hooks/clipboard/clipboard.utils.ts` (serialization/deserialization).
  - Create `hooks/clipboard/types.ts`.
  - **CRITICAL**: Implement Unit Tests for handlers FIRST (TDD).
  - **CRITICAL**: All handlers MUST use Yjs mutations, NOT React setState.

### Acceptance Criteria
- [ ] **AC1**: Main files (`GraphComponent`, `MindNode`, `useClipboard`) < 300 lines.
- [ ] **AC2**: All existing E2E tests pass (`pnpm test:e2e`).
- [ ] **AC3**: New Unit Tests for `useCopyHandler` and `usePasteHandler` pass.

## Verification Plan

### Automated Tests
- **Unit Tests**:
  - `apps/web/hooks/__tests__/useCopyHandler.spec.ts`
  - `apps/web/hooks/__tests__/usePasteHandler.spec.ts`
  - `apps/web/hooks/__tests__/useCutHandler.spec.ts`
- **E2E Tests**:
  - `apps/web/e2e/clipboard-data-sanitization.spec.ts` (Run full suite)
  - `apps/web/e2e/collaboration.spec.ts`

### Manual Verification
- **Drag & Drop**: Verify node movement feels identical.
- **Copy/Paste**: Verify cross-graph paste works.
- **Shortcuts**: Verify Tab/Enter/Space keys work.
