# Tech-Spec: parentId 统一真相源改造 (Story 8.10)

**Created:** 2026-01-19  
**Status:** Ready for Development  
**Story:** [story-8-10-parentid-single-source-of-truth.md](./story-8-10-parentid-single-source-of-truth.md)

---

## Overview

### Problem Statement

当前图谱层级关系存在 **"双真相源"** 问题：

1. **parentId 真相源**：`node.data.parentId` 存储父节点 ID
2. **层级边真相源**：通过 `graph.getOutgoingEdges()` 过滤非依赖边获取子节点

这导致以下问题：
- `useLayoutPlugin.ts:259` 拖拽重挂载只写 `parentId` 不更新边 → 不一致
- 折叠后点击其他节点被误判，`parentId` 被错误改写 → 结构破坏
- 大纲、DrillDown、Collapse 等功能分别读取不同数据源 → 视图不一致

### Solution

将 `node.data.parentId` 提升为 **唯一事实源**：
1. 所有层级遍历/父子计算改为读取 `parentId`
2. 层级边 (hierarchical edges) 降级为 **派生视图**，根据 `parentId` 自动 reconcile
3. 停止在 Yjs 中同步层级边，改为本地根据 `parentId` 重建

### Scope

**In Scope:**
- 创建 `parentIdUtils.ts` 统一工具函数
- 改造 6 个依赖层级边的文件
- 实现 `edgeReconciler.ts` 边重建逻辑
- 修改 `GraphSyncManager.ts` 边同步策略
- 停止在模板导入/剪贴板粘贴链路向 Yjs 写入层级边（`useTemplateInsert.ts`, `clipboardPaste.ts`, `pasteHelpers.ts`）
- 修复 `useLayoutPlugin.ts` 点击误触发问题

**Out of Scope:**
- 历史数据迁移（用户已清空）
- 依赖边 (dependency edges) 处理（保持现状）

---

## Context for Development

### Codebase Patterns

#### 1. 边类型判定

```typescript
// apps/web/lib/edgeValidation.ts:55
export function isDependencyEdge(edge: Edge): boolean {
  const metadata = getEdgeMetadata(edge);
  return metadata.kind === 'dependency';
}
```

#### 2. 层级边 Shape 定义

```typescript
// apps/web/lib/edgeShapes.ts:10
export const HIERARCHICAL_EDGE_SHAPE = 'cdm-hierarchical-edge';
```

#### 3. 当前获取子节点模式（将被替换）

```typescript
// 当前模式 - 基于边
const getDirectChildren = (nodeId: string): Node[] => {
  const node = graph.getCellById(nodeId);
  const outgoingEdges = graph.getOutgoingEdges(node) ?? [];
  return outgoingEdges
    .filter(e => !isDependencyEdge(e))
    .map(e => graph.getCellById(e.getTargetCellId()))
    .filter(Boolean);
};
```

#### 4. 新模式（基于 parentId）

```typescript
// 新模式 - 基于 parentId
const getDirectChildrenByParentId = (parentId: string): Node[] => {
  return graph.getNodes()
    .filter(node => node.getData()?.parentId === parentId)
    .sort((a, b) => (a.getData()?.order ?? 0) - (b.getData()?.order ?? 0));
};
```

### Files to Reference

| 文件                                                                                                                                            | 当前行为                                 | 改造要点                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------ |
| [useOutlineData.ts](../../apps/web/components/graph/hooks/useOutlineData.ts)   | `getDirectChildren` (L65) 读边           | 改用 parentId + 移除 reorder 直接改边 |
| [useNodeCollapse.ts](../../apps/web/components/graph/hooks/useNodeCollapse.ts) | `getDirectChildren` (L68) 读边           | 改用 parentId            |
| [MindNode.tsx](../../apps/web/components/nodes/MindNode.tsx)                   | `childCount` (L157) 读边                 | 改用 parentId            |
| [useDrillDown.ts](../../apps/web/components/graph/hooks/useDrillDown.ts)       | `buildHierarchyChildrenMap` (L331) 读边  | 改用 parentId            |
| [focusModeUtils.ts](../../apps/web/components/graph/hooks/focusModeUtils.ts)   | `getDirectChildren` (L28) 读边           | 改用 parentId            |
| [useLayoutPlugin.ts](../../apps/web/hooks/useLayoutPlugin.ts)                  | `handleNodeMouseUp` (L242) 只写 parentId | 添加拖拽阈值 + reconcile |
| [GraphSyncManager.ts](../../apps/web/features/collab/GraphSyncManager.ts)      | 边独立同步 (L650)                        | 停止同步层级边           |
| [useTemplateInsert.ts](../../apps/web/hooks/useTemplateInsert.ts)              | 向 `yEdges` 写入层级边                   | 停止写入层级边（仅依赖边保留） |
| [clipboardPaste.ts](../../apps/web/hooks/clipboard/clipboardPaste.ts)          | 粘贴/移动时确保/创建层级边到 `yEdges`     | 停止写入层级边（仅依赖边保留） |
| [pasteHelpers.ts](../../apps/web/hooks/clipboard/pasteHelpers.ts)              | `ensureHierarchicalEdges` 写层级边到 `yEdges` | 停止写入层级边（仅依赖边保留） |

### Technical Decisions

| 决策               | 选择                            | 理由                            |
| ------------------ | ------------------------------- | ------------------------------- |
| 工具函数位置       | `apps/web/lib/parentIdUtils.ts` | 与现有 `edgeValidation.ts` 同级 |
| Reconcile 触发时机 | `parentId` 变更后 + 图加载后    | 确保一致性                      |
| 拖拽阈值           | 5px 最小移动距离                | 避免点击误触发重挂载            |
| 层级边同步         | 停止同步到 Yjs                  | 本地派生，减少 Yjs 负担         |

---

## Implementation Plan

### Task 1: 创建 parentIdUtils.ts

**文件**: `apps/web/lib/parentIdUtils.ts`

```typescript
import { Graph, Node } from '@antv/x6';

/**
 * Get all direct children of a parent node by scanning parentId
 */
export function getDirectChildrenByParentId(graph: Graph, parentId: string): Node[] {
  return graph.getNodes()
    .filter(node => {
      const data = node.getData() || {};
      return data.parentId === parentId;
    })
    .sort((a, b) => {
      const orderA = a.getData()?.order ?? Infinity;
      const orderB = b.getData()?.order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return a.id.localeCompare(b.id); // Stable sort fallback
    });
}

/**
 * Get all root nodes (nodes with no parentId or empty parentId)
 */
export function getRootNodes(graph: Graph): Node[] {
  return graph.getNodes().filter(node => {
    const data = node.getData() || {};
    const parentId = data.parentId;
    return !parentId || parentId === '';
  });
}

/**
 * Get ancestors by traversing parentId chain
 */
export function getAncestorsByParentId(graph: Graph, nodeId: string): Node[] {
  const ancestors: Node[] = [];
  const visited = new Set<string>();
  let currentId: string | null = nodeId;

  while (currentId) {
    const node = graph.getCellById(currentId);
    if (!node?.isNode()) break;

    const parentId = (node as Node).getData()?.parentId;
    if (!parentId || visited.has(parentId)) break;
    visited.add(parentId);

    const parentNode = graph.getCellById(parentId);
    if (!parentNode?.isNode()) break;

    ancestors.push(parentNode as Node);
    currentId = parentId;
  }

  return ancestors;
}

/**
 * Get all descendants recursively
 */
export function getAllDescendants(graph: Graph, nodeId: string): Node[] {
  const descendants: Node[] = [];
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const children = getDirectChildrenByParentId(graph, currentId);
    for (const child of children) {
      descendants.push(child);
      queue.push(child.id);
    }
  }

  return descendants;
}

/**
 * Build a Map of parentId -> children for efficient lookups
 */
export function buildChildrenMap(graph: Graph): Map<string, Node[]> {
  const childrenMap = new Map<string, Node[]>();
  
  for (const node of graph.getNodes()) {
    const parentId = node.getData()?.parentId || '__ROOT__';
    const children = childrenMap.get(parentId) || [];
    children.push(node);
    childrenMap.set(parentId, children);
  }

  // Sort each children array by order
  for (const [, children] of childrenMap) {
    children.sort((a, b) => {
      const orderA = a.getData()?.order ?? Infinity;
      const orderB = b.getData()?.order ?? Infinity;
      return orderA - orderB;
    });
  }

  return childrenMap;
}
```

---

### Task 2: 创建 edgeReconciler.ts

**文件**: `apps/web/lib/edgeReconciler.ts`

```typescript
import { Graph, Edge } from '@antv/x6';
import { isDependencyEdge } from './edgeValidation';
import { HIERARCHICAL_EDGE_SHAPE } from './edgeShapes';

/**
 * Reconcile hierarchical edges to match parentId relationships.
 * This ensures X6 graph edges are consistent with node.data.parentId.
 */
export function reconcileHierarchicalEdges(graph: Graph): void {
  const nodes = graph.getNodes();
  const existingEdges = graph.getEdges().filter(e => !isDependencyEdge(e));

  // 1. Collect expected edges from parentId
  const expectedEdges = new Map<string, { source: string; target: string }>();
  
  for (const node of nodes) {
    const parentId = node.getData()?.parentId;
    if (parentId) {
      const parentNode = graph.getCellById(parentId);
      if (parentNode?.isNode()) {
        const key = `${parentId}→${node.id}`;
        expectedEdges.set(key, { source: parentId, target: node.id });
      }
    }
  }

  // 2. Remove stale edges (exist in graph but not in expected)
  const existingEdgeKeys = new Set<string>();
  for (const edge of existingEdges) {
    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();
    if (!sourceId || !targetId) continue;

    const key = `${sourceId}→${targetId}`;
    existingEdgeKeys.add(key);

    if (!expectedEdges.has(key)) {
      graph.removeEdge(edge.id);
    }
  }

  // 3. Create missing edges
  for (const [key, { source, target }] of expectedEdges) {
    if (!existingEdgeKeys.has(key)) {
      graph.addEdge({
        shape: HIERARCHICAL_EDGE_SHAPE,
        source,
        target,
        data: {
          metadata: { kind: 'hierarchical' },
        },
      });
    }
  }
}

/**
 * Reconcile a single node's parent edge after parentId change
 */
export function reconcileSingleNodeEdge(
  graph: Graph,
  nodeId: string,
  oldParentId: string | undefined,
  newParentId: string | undefined
): void {
  // Remove old edge if exists
  if (oldParentId) {
    const oldEdge = graph.getEdges().find(e => {
      if (isDependencyEdge(e)) return false;
      return e.getSourceCellId() === oldParentId && e.getTargetCellId() === nodeId;
    });
    if (oldEdge) {
      graph.removeEdge(oldEdge.id);
    }
  }

  // Create new edge if needed
  if (newParentId) {
    const parentNode = graph.getCellById(newParentId);
    if (parentNode?.isNode()) {
      graph.addEdge({
        shape: HIERARCHICAL_EDGE_SHAPE,
        source: newParentId,
        target: nodeId,
        data: {
          metadata: { kind: 'hierarchical' },
        },
      });
    }
  }
}
```

---

### Task 3: 改造 useOutlineData.ts

**改动点**: 替换 `getDirectChildren` 和 `getRootNodes` 实现

```diff
+ import { getDirectChildrenByParentId, getRootNodes as getRootNodesByParentId } from '@/lib/parentIdUtils';

- const getDirectChildren = useCallback((nodeId: string): Node[] => {
-   // ... 基于 outgoingEdges 的实现
- }, [graph]);
+ const getDirectChildren = useCallback((nodeId: string): Node[] => {
+   if (!graph) return [];
+   return getDirectChildrenByParentId(graph, nodeId);
+ }, [graph]);

- const getRootNodes = useCallback((): Node[] => {
-   // ... 基于 incomingEdges 的实现
- }, [graph]);
+ const getRootNodes = useCallback((): Node[] => {
+   if (!graph) return [];
+   return getRootNodesByParentId(graph);
+ }, [graph]);
```

---

### Task 4: 改造 useNodeCollapse.ts, MindNode.tsx, useDrillDown.ts, focusModeUtils.ts

类似 Task 3，将所有 `getDirectChildren` 替换为 `getDirectChildrenByParentId`。

---

### Task 5: 修复 useLayoutPlugin.ts

**改动点**:
1. 添加拖拽阈值判断（防止点击误触发）
2. 过滤隐藏节点
3. 在 parentId 更新后调用 reconcile

```typescript
// 记录 mousedown 位置
let mouseDownPos: { x: number; y: number } | null = null;
const DRAG_THRESHOLD = 5; // 最小拖拽距离

const handleNodeMouseDown = ({ e }: { e: MouseEvent }) => {
  mouseDownPos = { x: e.clientX, y: e.clientY };
};

const handleNodeMouseUp = ({ node, e }: { node: Node; e: MouseEvent }) => {
  // 检查是否真的发生了拖拽
  if (mouseDownPos) {
    const dx = Math.abs(e.clientX - mouseDownPos.x);
    const dy = Math.abs(e.clientY - mouseDownPos.y);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      mouseDownPos = null;
      return; // 这是点击，不是拖拽，跳过重挂载
    }
  }
  mouseDownPos = null;

  // ... 现有重挂载逻辑 ...
  
  // 在 parentId 更新后调用 reconcile
  const oldParentId = currentData.parentId;
  node.setData({ ...currentData, parentId, order: newOrder });
  reconcileSingleNodeEdge(graph, node.id, oldParentId, parentId);
};

// 修改 findTargetNode 过滤隐藏节点
function findTargetNode(graph: Graph, draggedId: string, x: number, y: number) {
  const nodes = graph.getNodes().filter(n => {
    if (n.id === draggedId) return false;
    if (!n.isVisible()) return false; // 过滤隐藏节点
    return true;
  });
  return nodes.find(n => {
    const bbox = n.getBBox();
    return x >= bbox.x && x <= bbox.x + bbox.width && 
           y >= bbox.y && y <= bbox.y + bbox.height;
  });
}
```

---

### Task 6: 修改 GraphSyncManager.ts

**改动点**: 停止同步层级边到 Yjs

```typescript
// 在 syncEdgeToYjs 中过滤层级边
private syncEdgeToYjs(edge: Edge): void {
  if (!isDependencyEdge(edge)) {
    return; // 不同步层级边
  }
  // ... 依赖边同步逻辑 ...
}

// 在 applyEdgeToGraph 中过滤层级边
private applyEdgeToGraph(data: YjsEdgeData): void {
  const edgeKind = data.metadata?.kind || 'hierarchical';
  if (edgeKind === 'hierarchical') {
    return; // 不从 Yjs 加载层级边，由 reconcile 生成
  }
  // ... 依赖边应用逻辑 ...
}

// 在图加载完成后调用 reconcile
public async loadInitialState(): Promise<void> {
  // ... 现有加载逻辑 ...
  
  // 根据 parentId 重建层级边
  reconcileHierarchicalEdges(this.graph);
}
```

---

## Acceptance Criteria

- [ ] AC 1: **Given** 任意图谱 **When** 调用 `getDirectChildrenByParentId(parentId)` **Then** 返回所有 `parentId` 匹配的子节点
- [ ] AC 2: **Given** 节点的 `parentId` 变更 **When** reconcile 被调用 **Then** 层级边自动更新
- [ ] AC 3: **Given** Yjs 同步场景 **When** `parentId` 变更 **Then** 仅同步 `parentId`，不同步层级边
- [ ] AC 4: **Given** 折叠某父节点后 **When** 点击其他可见节点 **Then** `parentId` 不被误改写
- [ ] AC 5: **Given** 拖拽节点到新父节点下 **When** 释放鼠标 **Then** `parentId` 和层级边同时更新

---

## Additional Context

### Dependencies

- `@antv/x6` 3.1.2 - Graph 操作 API
- `yjs` 13.6.27 - CRDT 同步
- 现有工具函数：`isDependencyEdge()`, `HIERARCHICAL_EDGE_SHAPE`

### Testing Strategy

#### 1. 单元测试 (Vitest)

```bash
cd apps/web && pnpm test apps/web/lib/parentIdUtils.test.ts
cd apps/web && pnpm test apps/web/lib/edgeReconciler.test.ts
```

#### 2. E2E 测试 (Playwright)

```bash
cd apps/web && pnpm test:e2e e2e/parentid-consistency.spec.ts
```

**测试用例**:
1. 折叠分支 → 点击可见节点 → 断言 `parentId` 不变
2. 大纲拖拽重排 → 断言层级关系正确
3. 协作场景：用户A 改 `parentId` → 用户B 看到层级边更新

### Notes

- 用户已确认历史数据已清空，无需迁移兜底逻辑
- 依赖边 (dependency edges) 处理保持现状，不受影响
- 后续可考虑完全移除层级边概念，仅用 `parentId` + 布局算法渲染连线

---

## Engineering Guardrails

### 🟢 MUST DO（必须遵守）

```typescript
// ✅ 使用 parentIdUtils 获取子节点
import { getDirectChildrenByParentId } from '@/lib/parentIdUtils';
const children = getDirectChildrenByParentId(graph, parentId);

// ✅ 修改 parentId 后必须 reconcile
import { reconcileSingleNodeEdge } from '@/lib/edgeReconciler';
const oldParentId = node.getData()?.parentId;
node.setData({ ...data, parentId: newParentId });
reconcileSingleNodeEdge(graph, node.id, oldParentId, newParentId);

// ✅ 过滤隐藏节点
const visibleNodes = graph.getNodes().filter(n => n.isVisible());

// ✅ 拖拽阈值判断
const DRAG_THRESHOLD = 5;
if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
  return; // 忽略点击
}
```

### 🔴 MUST NOT DO（禁止行为）

```typescript
// ❌ 禁止通过边获取子节点
const outEdges = graph.getOutgoingEdges(node);
const children = outEdges.filter(e => !isDependencyEdge(e)).map(...);

// ❌ 禁止直接操作层级边
graph.addEdge({ source: parentId, target: nodeId }); // 应通过 reconcile

// ❌ 禁止在 syncEdgeToYjs 中同步层级边
if (!isDependencyEdge(edge)) {
  return; // 必须过滤层级边
}

// ❌ 禁止只改 parentId 不 reconcile
node.setData({ parentId: newParentId }); // 缺少 reconcile 调用
```

### ⚠️ 边界情况

| 场景                      | 处理                            |
| ------------------------- | ------------------------------- |
| `parentId` 指向不存在节点 | 跳过边创建 + warning 日志       |
| 循环引用                  | visited Set 防无限循环          |
| 根节点                    | `parentId` 为空/未定义          |
| 批量操作                  | 用 `reconcileHierarchicalEdges` |

---

## Story Reference

**用户故事和验收标准请参考**: [story-8-10-parentid-single-source-of-truth.md](./story-8-10-parentid-single-source-of-truth.md)

Story 包含:
- 6 个验收标准 (AC1-AC6)
- 10 个任务分解
- 背景和问题陈述
- RCA 文档引用
