# Tech-Spec: Story 8.3 缩放快捷键系统 (Zoom Shortcuts System)

**Created:** 2026-01-07
**Status:** Ready for Development
**Story:** [story-8-3-zoom-shortcuts-system.md](./story-8-3-zoom-shortcuts-system.md)

---

## Overview

### Problem Statement

在大规模图谱场景（500-5000+ 节点）中，用户需要频繁在全局概览和细节编辑之间切换。目前仅支持滚轮缩放，缺乏快捷键快速控制缩放级别的能力，导致导航效率低下。

### Solution

实现一套完整的缩放快捷键系统：
1. **Cmd/Ctrl+0**（备用 **Alt/Option+0**）: 适应屏幕（显示全部节点，空画布时不操作，缩放不超过 100%）
2. **Cmd/Ctrl+1**（备用 **Alt/Option+1**）: 恢复 100% 缩放
3. **双击节点**: 居中显示该节点（**仅平移，不改变缩放**）
4. 所有缩放操作带平滑动画（遵守 reduced-motion）
5. **缩放级别指示器**: 右下角显示当前缩放百分比，点击重置为 100%

### Scope

**In Scope:**
- ✅ Cmd/Ctrl+0 适应屏幕快捷键（备用 Alt/Option+0；空画布时不操作）
- ✅ Cmd/Ctrl+1 恢复 100% 快捷键（备用 Alt/Option+1）
- ✅ 双击节点居中（仅平移，不改变缩放）
- ✅ 平滑缩放动画
- ✅ prefers-reduced-motion 支持
- ✅ 缩放级别指示器 UI

**Out of Scope:**
- ❌ 浏览器页面缩放快捷键（Cmd/Ctrl + +/-/0 等），本 Story 只处理“图内缩放”
- ❌ 触摸板手势增强（X6 内置）
- ❌ 语义缩放 LOD（Story 8.8）
- ❌ 视图书签（Story 8.11）

---

## Context for Development

### Codebase Patterns

#### 1. Hook-First 架构
所有逻辑封装在自定义 hook 中，参考现有模式：
```typescript
// apps/web/components/graph/hooks/useMinimap.ts (Story 8.2)
export function useMinimap({
  graph,
  isReady,
  containerRef,
  enabled = true,
}: UseMinimapOptions): UseMinimapReturn

// 导出模式：
// apps/web/components/graph/hooks/index.ts
export * from './useMinimap';
```

#### 2. 快捷键处理模式
参考 `useGraphHotkeys.ts` L134-166 (Story 8.1 折叠快捷键)：
```typescript
// Cmd/Ctrl + Alt + [ : Recursive collapse
if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === '[') {
    e.preventDefault();
    e.stopPropagation();
    const selectedNodes = graph.getSelectedCells().filter((cell) => cell.isNode());
    if (selectedNodes.length === 1 && onCollapseDescendants) {
        onCollapseDescendants(selectedNodes[0].id);
    }
    return;
}
```

#### 3. Reduced Motion 检测
复用 `useMediaQuery.ts` (Story 8.2)：
```typescript
import { useMediaQuery } from '@/hooks/useMediaQuery';
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
```

#### 4. X6 缩放 API
现有配置位于 `useGraph.ts` L53-60：
```typescript
mousewheel: {
  enabled: true,
  zoomAtMousePosition: true,
  modifiers: [],
  minScale: 0.2,
  maxScale: 4,
}
```

### Files to Reference

| 文件 | 用途 |
|------|------|
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | 快捷键集成点（需修改） |
| `apps/web/components/graph/hooks/index.ts` | Hook 导出（需修改） |
| `apps/web/components/graph/GraphComponent.tsx` | 双击事件集成点（需修改） |
| `apps/web/hooks/useGraph.ts` | 缩放配置参考（只读） |
| `apps/web/hooks/useMediaQuery.ts` | Reduced motion 检测（复用） |
| `apps/web/components/graph/hooks/useGraphTransform.ts` | Transform 状态模式参考 |

### Technical Decisions

#### TD-1: 使用 X6 变换 API + rAF 动效
**决策**: 使用 `graph.zoomTo()`, `graph.translate()`, `graph.centerPoint()` 作为底层能力；动效通过 `requestAnimationFrame` 自行实现（并遵守 `prefers-reduced-motion`），不要依赖 X6 的 `animation` 选项。

**理由**:
- X6 Graph API typings 不支持 `animation` 参数（会触发 TS “excess property”）
- 代码库已有 rAF + reduced-motion 的动效先例（`useMinimap`）
- 便于统一处理「fit to screen ≤ 100%」与「双击仅平移不缩放」这两类目标状态

#### TD-2: 双击仅居中，不进入编辑
**决策**: 双击节点执行居中（仅平移），Space 键进入编辑

**理由**:
- 保持与现有交互一致
- 避免行为冲突
- 用户心智模型清晰

#### TD-3: 动画时长标准化
**决策**: 缩放动画 300ms，居中动画 400ms

**理由**:
- 与 Story 8.1/8.2 动画时长保持一致
- 符合用户预期的响应速度

#### TD-4: 浏览器快捷键冲突与备用按键
**决策**: 主快捷键为 `Cmd/Ctrl + 0/1`，同时支持备用 `Alt/Option + 0/1`；Playwright E2E 使用备用按键以避免浏览器保留快捷键导致事件无法到达应用。

**理由**:
- `Cmd/Ctrl+0/1` 常被浏览器用于“页面缩放”，在部分环境中无法被应用层拦截
- 备用按键保证功能可用性，并显著降低 E2E flaky 风险

---

## Implementation Plan

### Tasks

#### Phase 1: 创建 useZoomShortcuts Hook

- [ ] **Task 1.1**: 创建 `apps/web/components/graph/hooks/useZoomShortcuts.ts`

```typescript
'use client';

import { useCallback } from 'react';
import type { Graph, Node } from '@antv/x6';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface UseZoomShortcutsOptions {
  graph: Graph | null;
  isReady: boolean;
}

export interface UseZoomShortcutsReturn {
  /** 缩放到适应屏幕 (Cmd/Ctrl+0；备用 Alt/Option+0) */
  zoomToFit: () => void;
  /** 缩放到 100% (Cmd/Ctrl+1；备用 Alt/Option+1) */
  zoomTo100: () => void;
  /** 居中到指定节点 (双击，仅平移不缩放) */
  centerNode: (nodeId: string) => void;
}

// rAF 动画：参考 apps/web/components/graph/hooks/useMinimap.ts 的实现思路（平移 + reduced-motion）
function animateGraphZoomTo(graph: Graph, toScale: number, durationMs: number, reduced: boolean) {
  if (reduced) {
    graph.zoomTo(toScale);
    return;
  }

  const from = graph.zoom();
  const start = performance.now();
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / durationMs));
    const s = from + (toScale - from) * easeOutCubic(t);
    graph.zoomTo(s);
    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function animateGraphTransformTo(
  graph: Graph,
  to: { scale: number; tx: number; ty: number },
  durationMs: number,
  reduced: boolean
) {
  if (reduced) {
    graph.zoomTo(to.scale);
    graph.translate(to.tx, to.ty);
    return;
  }

  const fromScale = graph.zoom();
  const fromT = graph.translate();
  const start = performance.now();
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / durationMs));
    const k = easeOutCubic(t);

    const s = fromScale + (to.scale - fromScale) * k;
    const tx = fromT.tx + (to.tx - fromT.tx) * k;
    const ty = fromT.ty + (to.ty - fromT.ty) * k;

    graph.zoomTo(s);
    graph.translate(tx, ty);

    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function animateTranslateToCenterPoint(
  graph: Graph,
  x: number,
  y: number,
  durationMs: number,
  reduced: boolean
) {
  if (reduced) {
    graph.centerPoint(x, y);
    return;
  }

  const container = (graph as unknown as { container?: HTMLElement }).container;
  const rect = container?.getBoundingClientRect();
  const width = rect?.width ?? 0;
  const height = rect?.height ?? 0;
  if (!width || !height) {
    graph.centerPoint(x, y);
    return;
  }

  const scale = graph.zoom();
  const start = graph.translate();
  const targetTx = width / 2 - x * scale;
  const targetTy = height / 2 - y * scale;

  const startTime = performance.now();
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - startTime) / durationMs));
    const k = easeOutCubic(t);
    const tx = start.tx + (targetTx - start.tx) * k;
    const ty = start.ty + (targetTy - start.ty) * k;
    graph.translate(tx, ty);
    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/**
 * Story 8.3: Zoom Shortcuts System
 * Hook to handle zoom shortcuts and navigation.
 */
export function useZoomShortcuts({
  graph,
  isReady,
}: UseZoomShortcutsOptions): UseZoomShortcutsReturn {
  // Detect reduced motion preference
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  /**
   * AC2: 缩放到适应屏幕 (Cmd/Ctrl+0；备用 Alt/Option+0)
   * 显示全部节点，不超过 100%
   */
  const zoomToFit = useCallback(() => {
    if (!graph || !isReady) return;

    // 空画布检查
    const nodes = graph.getNodes();
    if (nodes.length === 0) return;

    const container = (graph as unknown as { container?: HTMLElement }).container;
    const rect = container?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;

    const padding = 40;
    const bbox = nodes
      .map((n) => n.getBBox())
      .reduce((acc, r) => acc.union(r));

    const availableW = Math.max(1, rect.width - padding * 2);
    const availableH = Math.max(1, rect.height - padding * 2);
    const targetScale = Math.min(availableW / bbox.width, availableH / bbox.height, 1);

    const center = bbox.getCenter();
    const targetTx = rect.width / 2 - center.x * targetScale;
    const targetTy = rect.height / 2 - center.y * targetScale;

    animateGraphTransformTo(
      graph,
      { scale: targetScale, tx: targetTx, ty: targetTy },
      300,
      prefersReducedMotion
    );
  }, [graph, isReady, prefersReducedMotion]);

  /**
   * AC3: 恢复到 100% 缩放 (Cmd/Ctrl+1；备用 Alt/Option+1)
   */
  const zoomTo100 = useCallback(() => {
    if (!graph || !isReady) return;

    animateGraphZoomTo(graph, 1, 300, prefersReducedMotion);
  }, [graph, isReady, prefersReducedMotion]);

  /**
   * AC4: 居中到指定节点 (双击，仅平移不缩放)
   */
  const centerNode = useCallback((nodeId: string) => {
    if (!graph || !isReady) return;

    const cell = graph.getCellById(nodeId);
    if (!cell || !cell.isNode()) return;

    const node = cell as Node;
    const { x, y } = node.getBBox().getCenter();
    animateTranslateToCenterPoint(graph, x, y, 400, prefersReducedMotion);
  }, [graph, isReady, prefersReducedMotion]);

  return {
    zoomToFit,
    zoomTo100,
    centerNode,
  };
}
```

- [ ] **Task 1.2**: 导出 hook
  - 修改 `apps/web/components/graph/hooks/index.ts`
  - 添加 `export * from './useZoomShortcuts';`

#### Phase 2: 集成快捷键

- [ ] **Task 2.1**: 修改 `useGraphHotkeys.ts` 接口

```typescript
// 扩展 UseGraphHotkeysOptions (L12-37)
export interface UseGraphHotkeysOptions {
    // ... existing props
    // Story 8.3: Zoom shortcuts
    onZoomToFit?: () => void;
    onZoomTo100?: () => void;
}
```

- [ ] **Task 2.2**: 添加快捷键处理（在 M 键处理后，约 L193）

```typescript
// Input protection: don't trigger while typing/editing
const target = e.target as HTMLElement | null;
if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) {
  return;
}

// Story 8.3: Fit to screen (AC2)
// Primary: Cmd/Ctrl + 0, Fallback: Alt/Option + 0
if (((e.metaKey || e.ctrlKey) && e.code === 'Digit0') || (e.altKey && e.code === 'Digit0')) {
  e.preventDefault();
  e.stopPropagation();
  onZoomToFit?.();
  return;
}

// Story 8.3: Reset to 100% (AC3)
// Primary: Cmd/Ctrl + 1, Fallback: Alt/Option + 1
if (((e.metaKey || e.ctrlKey) && e.code === 'Digit1') || (e.altKey && e.code === 'Digit1')) {
  e.preventDefault();
  e.stopPropagation();
  onZoomTo100?.();
  return;
}
```

- [ ] **Task 2.3**: 更新依赖数组 (L266)
```typescript
[..., onZoomToFit, onZoomTo100]
```

#### Phase 3: 双击居中事件

- [ ] **Task 3.1**: 修改 `GraphComponent.tsx`

在 L199 后添加 hook 调用：
```typescript
// Story 8.3: Zoom Shortcuts
const { zoomToFit, zoomTo100, centerNode } = useZoomShortcuts({
    graph,
    isReady,
});
```

- [ ] **Task 3.2**: 传递快捷键回调到 useGraphHotkeys (L201-210)
```typescript
const { handleKeyDown } = useGraphHotkeys({
    // ... existing props
    // Story 8.3: Zoom shortcuts
    onZoomToFit: zoomToFit,
    onZoomTo100: zoomTo100,
});
```

- [ ] **Task 3.3**: 添加双击事件监听

在 `useGraphEvents` hook 中添加，或直接在 GraphComponent 中：
```typescript
// Story 8.3: Double-click to center node (AC4)
useEffect(() => {
    if (!graph || !isReady) return;

    const handleNodeDblClick = ({ node }: { node: Node }) => {
        const data = node.getData() || {};
        // 不与编辑模式冲突
        if (!data.isEditing) {
            centerNode(node.id);
        }
    };

    graph.on('node:dblclick', handleNodeDblClick);
    return () => {
        graph.off('node:dblclick', handleNodeDblClick);
    };
}, [graph, isReady, centerNode]);
```

#### Phase 4: 缩放指示器 UI (AC6)

- [ ] **Task 4.1**: 创建 `apps/web/components/graph/parts/ZoomIndicator.tsx`
  - Props: `zoom: number`, `onReset: () => void`
  - 显示 `Math.round(zoom * 100)%`（例如 `100%`）
  - 点击触发 `onReset`（重置到 100%）

- [ ] **Task 4.2**: 在 `GraphComponent.tsx` 集成 `ZoomIndicator`
  - `zoom` 取自 `useGraphTransform().scale`（避免重复维护缩放状态）
  - `onReset` 直接复用 `zoomTo100`

#### Phase 5: 测试

- [ ] **Task 5.1**: 单元测试 `apps/web/__tests__/hooks/useZoomShortcuts.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Rectangle } from '@antv/x6';
import { useZoomShortcuts } from '@/components/graph/hooks/useZoomShortcuts';

// Prefer testing reduced-motion path to avoid rAF timing in unit tests.
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => true, // prefers-reduced-motion: reduce
}));

describe('useZoomShortcuts', () => {
  it('zoomToFit: no-op on empty canvas', () => {
    const graph = { getNodes: vi.fn(() => []) };
    const { result } = renderHook(() => useZoomShortcuts({ graph: graph as any, isReady: true }));

    act(() => result.current.zoomToFit());

    expect(graph.getNodes).toHaveBeenCalled();
  });

  it('zoomToFit: sets scale<=1 and centers bbox (reduced-motion path)', () => {
    const graph: any = {
      container: { getBoundingClientRect: () => ({ width: 1000, height: 800 }) },
      getNodes: vi.fn(() => [{ getBBox: () => Rectangle.create(0, 0, 200, 200) }]),
      zoomTo: vi.fn(),
      translate: vi.fn(),
    };

    const { result } = renderHook(() => useZoomShortcuts({ graph, isReady: true }));

    act(() => result.current.zoomToFit());

    expect(graph.zoomTo).toHaveBeenCalledWith(1);
    expect(graph.translate).toHaveBeenCalledWith(400, 300);
  });

  it('zoomTo100: zoomTo(1) (reduced-motion path)', () => {
    const graph: any = { zoomTo: vi.fn() };
    const { result } = renderHook(() => useZoomShortcuts({ graph, isReady: true }));

    act(() => result.current.zoomTo100());

    expect(graph.zoomTo).toHaveBeenCalledWith(1);
  });

  it('centerNode: centerPoint(nodeCenter) (reduced-motion path)', () => {
    const node: any = { isNode: () => true, getBBox: () => Rectangle.create(10, 20, 100, 50) };
    const graph: any = { getCellById: vi.fn(() => node), centerPoint: vi.fn() };
    const { result } = renderHook(() => useZoomShortcuts({ graph, isReady: true }));

    act(() => result.current.centerNode('test-node'));

    expect(graph.centerPoint).toHaveBeenCalledWith(60, 45);
  });
});
```

- [ ] **Task 5.2**: 组件测试 `apps/web/__tests__/components/ZoomIndicator.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomIndicator } from '@/components/graph/parts/ZoomIndicator';

describe('ZoomIndicator (AC6)', () => {
  it('renders percent and calls onReset when clicked', () => {
    const onReset = vi.fn();
    render(<ZoomIndicator zoom={0.75} onReset={onReset} />);

    fireEvent.click(screen.getByText('75%'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Task 5.3**: E2E 测试 `apps/web/e2e/zoom-shortcuts.spec.ts`

```typescript
import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraph = {
  zoom: () => number;
  translate: () => { tx: number; ty: number };
  addNode: (config: unknown) => void;
  getCellById: (id: string) => unknown | null;
};

async function waitForGraph(page: Page) {
  await expect
    .poll(async () => page.evaluate(() => Boolean((window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph)))
    .toBe(true);
}

async function getZoom(page: Page) {
  return page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    return graph?.zoom?.() ?? 1;
  });
}

async function getTranslate(page: Page) {
  return page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    return graph?.translate?.() ?? { tx: 0, ty: 0 };
  });
}

async function seedNodes(page: Page) {
  await waitForGraph(page);
  await page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    if (!graph) return;
    const now = new Date().toISOString();

    const ensureNode = (id: string, x: number, y: number) => {
      if (graph.getCellById(id)) return;
      graph.addNode({
        shape: 'mind-node',
        id,
        x,
        y,
        width: 160,
        height: 50,
        data: {
          id,
          label: id,
          type: 'topic',
          isEditing: false,
          createdAt: now,
          updatedAt: now,
        },
      });
    };

    ensureNode('zoom-n1', 0, 0);
    ensureNode('zoom-n2', 1600, 900);
  });
}

test.describe('Zoom Shortcuts (Story 8.3)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
    await waitForGraph(page);
    await seedNodes(page);
    await page.getByTestId('graph-canvas').click();
  });

  test('AC2: fit to screen (use fallback Alt+0 for stability)', async ({ page }) => {
    const before = await getZoom(page);

    await page.keyboard.press('Alt+Digit0');
    await page.waitForTimeout(450);

    const after = await getZoom(page);
    expect(after).toBeLessThanOrEqual(1);
    expect(after).toBeLessThanOrEqual(before);
  });

  test('AC3: reset to 100% (use fallback Alt+1 for stability)', async ({ page }) => {
    await page.keyboard.press('Alt+Digit0');
    await page.waitForTimeout(450);

    await page.keyboard.press('Alt+Digit1');
    await page.waitForTimeout(450);

    const zoom = await getZoom(page);
    expect(zoom).toBeCloseTo(1, 2);
  });

  test('AC4: double-click centers node without changing zoom', async ({ page }) => {
    const zoomBefore = await getZoom(page);
    const tBefore = await getTranslate(page);

    await page.locator('.x6-node[data-cell-id="zoom-n2"]').dblclick();
    await page.waitForTimeout(450);

    const zoomAfter = await getZoom(page);
    const tAfter = await getTranslate(page);

    expect(zoomAfter).toBeCloseTo(zoomBefore, 3);
    expect(tAfter.tx !== tBefore.tx || tAfter.ty !== tBefore.ty).toBe(true);
  });

  test('input protection: no zoom while typing', async ({ page }) => {
    const zoomBefore = await getZoom(page);

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('mindmap:open-search')));
    await page.getByTestId('global-search-input').click();
    await page.keyboard.press('Alt+Digit0');
    await page.waitForTimeout(200);

    const zoomAfter = await getZoom(page);
    expect(zoomAfter).toBeCloseTo(zoomBefore, 3);
  });
});
```

### Acceptance Criteria

- [x] **AC1**: 滚轮缩放（已实现）- `useGraph.ts` mousewheel 配置
- [ ] **AC2**: `Cmd/Ctrl+0`（备用 `Alt/Option+0`）适应屏幕 - `useZoomShortcuts.zoomToFit()`
- [ ] **AC3**: `Cmd/Ctrl+1`（备用 `Alt/Option+1`）恢复 100% - `useZoomShortcuts.zoomTo100()`
- [ ] **AC4**: 双击节点居中 - `node:dblclick` + `centerNode()`（仅平移不缩放）
- [ ] **AC5**: 平滑动画 + reduced-motion - rAF 动效（`requestAnimationFrame`），reduced 时直接调用 `zoomTo/translate/centerPoint`
- [ ] **AC6**: 缩放级别指示器 - `ZoomIndicator`（显示百分比，点击重置到 100%）

---

## Additional Context

### Dependencies

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@antv/x6` | 3.1.2 | Graph 变换 API（`zoomTo`, `translate`, `centerPoint`）+ `Rectangle` bbox 计算 |
| `useMediaQuery` | - | 检测 `prefers-reduced-motion` |

### Testing Strategy

1. **单元测试** (Vitest):
   - Mock Graph 实例和方法
   - 验证 API 调用正确性
   - 覆盖 null graph 边界情况

2. **E2E 测试** (Playwright):
   - 验证快捷键触发
   - 验证缩放级别变化
   - 验证节点居中效果

### Notes

- **浏览器保留快捷键**: `Cmd/Ctrl+0/1` 常被浏览器用于“页面缩放”，部分环境下事件可能无法到达应用；仍需 `e.preventDefault()`，并提供备用 `Alt/Option+0/1`（E2E 使用备用按键更稳定）
- **双击与编辑冲突**: 当前设计双击仅居中，Space 键进入编辑。如需双击编辑，可在 `centerNode` 后延迟触发编辑状态
- **大规模图谱性能**: `zoomToFit` 需要遍历节点并计算 bbox（1000+ 节点可能有延迟），建议观察性能（必要时 debounce/idle 调度）

---

## File Changes Summary

| 文件 | 操作 | 描述 |
|------|------|------|
| `apps/web/components/graph/hooks/useZoomShortcuts.ts` | [NEW] | 缩放快捷键核心 hook |
| `apps/web/components/graph/hooks/index.ts` | [MODIFY] | 导出 useZoomShortcuts |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | [MODIFY] | 添加 Cmd/Ctrl+0/1（备用 Alt/Option+0/1）快捷键 |
| `apps/web/components/graph/GraphComponent.tsx` | [MODIFY] | 集成 hook + 双击事件 |
| `apps/web/components/graph/parts/ZoomIndicator.tsx` | [NEW] | 缩放指示器 UI |
| `apps/web/components/graph/parts/index.ts` | [MODIFY] | 导出 ZoomIndicator |
| `apps/web/__tests__/hooks/useZoomShortcuts.test.ts` | [NEW] | 单元测试 |
| `apps/web/__tests__/components/ZoomIndicator.test.tsx` | [NEW] | 组件测试 |
| `apps/web/e2e/zoom-shortcuts.spec.ts` | [NEW] | E2E 测试 |
