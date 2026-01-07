# Story 3.5: Performance Optimization

Status: ready-for-dev

## Story

**As a** 用户,
**I want** 即使在有超过 1000 个节点时也能流畅交互,
**So that** 工具在处理复杂、大规模项目时依然可用。

## Acceptance Criteria

1.  **Given** 预加载了 1000 个节点的脑图 (包含混合类型的文本和任务节点)
2.  **When** 执行缩放 (Zoom)、平移 (Pan) 或拖拽 (Drag) 操作持续 10 秒时
3.  **Then** 渲染帧率 (FPS) 应保持在 **60fps** 以上 (P95 帧生成时间 < 16.6ms)
4.  **And** 视口外 (Off-screen) 的节点 DOM 元素应被移除或虚拟化 (Virtualization)
5.  **And** 1000 节点图的首次加载交互时间 (TTI) 应低于 **2 秒** (从请求开始到画布可响应)
6.  **And** 批量操作 (如粘贴成树) 响应时间 P95 < 400ms

## Tasks / Subtasks

- [ ] **Task 1: Canvas Virtualization & Rendering Tuning**
    - [ ] **Config:** Enable X6 `virtual` rendering mode in `GraphComponent` (via `scroller: { enabled: true, ... }` options).
    - [ ] **Culling:** Verify functionality where off-screen nodes are detached from DOM.
    - [ ] **Async Rendering:** Implement `async: true` in graph options to unblock main thread during massive render ops if needed.
    - [ ] **React Optimization:** Wrap `NodeComponent` with `React.memo` and custom comparison function (`arePropsEqual`) to prevent re-renders on unrelated state changes (e.g. selection of other nodes).

- [ ] **Task 2: Critical Path State Optimization**
    - [ ] **Yjs Batching:** Audit `GraphSyncManager.ts`. Ensure all bulk operations (Initial Load, Layout Apply, Paste) run inside `ydoc.transact(() => { ... })`.
    - [ ] **Event Throttling:** Ensure `node:moving` events sync to Yjs is throttled (50ms) as per Story 1.4 follow-ups (verify implementation and tighten if needed).
    - [ ] **Selectivity:** Verify `useCollaboration` hook selectors do not cause full-page re-renders. Use `useMemo` for derived awareness states.

- [ ] **Task 3: Load Time Optimization (TTI < 2s)**
    - [ ] **Backend:** Ensure `CollabService` (Hocuspocus) loads binary blob efficiently.
    - [ ] **Frontend Initialization:** Profile `GraphComponent` mount. Move heavy non-critical initializations (e.g., Minimap, Grid plugins) to `useEffect` or lazy load.
    - [ ] **Minimization:** Review Yjs update size. Ensure we are not syncing redundant UI state (like `selected: boolean`) in the persistent `nodes` map if it belongs in `awareness` or local state.

- [ ] **Task 4: Performance Monitoring Tooling**
    - [ ] **FPS Meter:** Add a dev-only `<PerformanceHUD />` component showing real-time FPS and Node Count.
    - [ ] **Telemetry:** Implement `reportPerformanceMetric(name, value)` utility. Log `TTI` and `AvgFPS` to console (or analytics stub) when session ends.
    - [ ] **Benchmark:** Create a `load-test` script or feature flag that generates 1000 random nodes for testing.

## Technical Design Specification (Added 2025-12-17)

#### 1. Canvas Virtualization (X6 Scroller)

To handle 1000+ nodes while maintaining 60fps, we will transition from a basic Graph container to using the **X6 Scroller Plugin** with Virtual Rendering enabled.

*   **Rationale:** The default graph renders all nodes into the DOM. With React Portals (`@antv/x6-react-shape`), this means 1000+ React Hierarchies + Portals, causing massive Style Recalculation overhead.
    *   **Implementation:**
    ```typescript
    import { Scroller } from '@antv/x6'
    import '@antv/x6-plugin-scroller/es/index.css'

    // In useGraph.ts
    graph.use(
      new Scroller({
        enabled: true,
        pageVisible: true, // Only render visible pages
        pageBreak: false,
        pannable: true, // Replace native panning
        className: 'app-scroller',
      })
    )
    ```
*   **Architecture Change:**
    *   The `useGraph` hook will now need to return the `scroller` instance or manage its lifecycle.
    *   CSS: Highlighting/Selection boxes usually render on the graph overlay. Virtualization requires checking if overlays are correctly culled or positioned relative to the viewport.

#### 2. React Component Optimization (MindNode)

*   **Problem:** Currently, when *any* node is selected, or layout changes, React might re-render unrelated nodes if props aren't stable, or if context updates trigger tree-wide updates.
*   **Solution: `React.memo` & Stable Props**
    *   Wrap `MindNode` with `React.memo`.
    *   **Comparison Strategy (`arePropsEqual`):**
        *   Ignore `graph` instance changes (stable ref).
        *   Compare `node.getData()` for specific fields: `label`, `isSelected`, `isEditing`.
        *   **Crucial:** Do NOT pass `x, y` as direct props to the React component if they are only used for CSS transform (X6 handles this via DOM direct manipulation).
    *   **Event Handling:** Ensure callbacks like `commit` or `enterEditMode` use `useCallback` to prevent breaking memoization.

#### 3. Critical Path Batching (GraphSyncManager)

*   **Scenario:** Dragging a subtree or running Auto-Layout updates N nodes.
*   **Current Risk:** N separate Yjs updates -> N WebSocket messages -> N React re-renders on remote clients.
*   **Optimization:**
    *   **Local Action:** Wrap layout application in `yDoc.transact(() => { ... })`.
    *   **Remote Handling:** X6 `batch(...)` is used, but React updates are async. We need to ensure `GraphSyncManager` applies remote updates in a `graph.batchUpdate(() => { ... })` block to suspend X6 re-painting until the transaction is fully applied.

#### 4. Load Time (TTI) Strategy

*   **Progressive Initialization:**
    *   **Phase 1 (Critical):** Core Graph, Scroller, Yjs Sync. (TTI Target: < 1s).
    *   **Phase 2 (Deferred):** Minimap, Background Grid (if complex), Non-visible Plugins.
*   **Initial Sync Optimization:**
    *   When receiving the initial 1000 nodes from Yjs:
        *   **Batching:** Use `graph.batchUpdate(() => { ... })` when processing `yNodes.forEach` during initial load.
        *   **Silent Add:** `graph.addNodes(..., { silent: true })` might be used if we manually trigger a refresh, but `batchUpdate` is safer for ensuring internal indexes are correct.

#### 5. Performance Monitoring Architecture

*   **Dev Tool:** `<PerformanceHUD />`
    *   Simple overlay in Dev Mode.
    *   Uses `requestAnimationFrame` loop to calculate FPS.
    *   Counts `graph.getNodes().length` vs `document.querySelectorAll('.x6-node').length` to verify virtualization efficiency (Expected: DOM count << Graph Node count).

## Dev Notes

### Architecture & Tech Constraints
-   **Graph Engine:** AntV X6 (`@antv/x6`, `@antv/x6-react-shape`).
    -   *Constraint:* X6 React Shape uses `ReactDOM.createPortal`. 1000 portals can be heavy. Virtualization is mandatory.
-   **State:** Yjs (`yjs`, `@hocuspocus/provider`).
    -   *Constraint:* Yjs operations are synchronous and atomic. Large transactions lock the thread. Keep transactions atomic but batched.
-   **Framework:** Next.js / React 18.
    -   *Constraint:* React Concurrency can help, but X6 manipulation is imperative. Ensure bridge between React State and X6 Model is efficient.

### Implementation Guidance
-   **Virtualization:** Use `graph.use(new Scroller({ ... }))`. Scroller provides the viewport management needed for virtualization.
-   **Memoization:** Check `apps/web/components/graph/NodeComponent.tsx` (or equivalent). It receives x, y, data. Coordinates (x,y) change rapidly during drag.
    -   *Optimization:* Do NOT pass x/y as React props for every frame of animation if possible. Let X6 handle the DOM translation. Only sync "final" state to React props if needed for re-rendering content. Ideally, X6 moves the container, React just renders the static content.

### Validation Strategy (How to verify 60fps)
1.  Enable "Paint Flashing" in Chrome DevTools.
2.  Use the `Benchmark` task generator to spawn 1000 nodes.
3.  Pan the canvas wildly.
4.  Observe FPS meter.
5.  Check DOM node count in Elements tab (should be << 1000 when zoomed in).

## Dev Agent Record

### Context Reference
-   **Epics.md:** Story 1.5 Requirements (FR8, NFR1, NFR2).
-   **Story 1.4:** Building upon the Real-time engine.
-   **Architecture:** Performance mandates (Virtualization).

### Agent Model Used
Antigravity (Google Deepmind)

### Known Risks
-   **React Portal Overhead:** Even with virtualization, mounting/unmounting hundreds of React components during rapid scrolling can cause stutter.
    -   *Fallback:* If React Shape is too slow, consider using X6 native HTML shape for simple nodes.
-   **Layout Thrashing:** Auto-layout on 1000 nodes? Story 1.3 Layout algorithms must be WebWorker-ready or time-boxed. (Note: Story 1.3 Auto-layout was Client-side. For 1.5, ensure it doesn't freeze UI).
