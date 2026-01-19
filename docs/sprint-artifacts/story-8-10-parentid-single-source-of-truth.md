# Story 8.10: parentId 统一真相源改造 (parentId Single Source of Truth)

Status: done

## Story

As a **开发者**,
I want **让 `node.data.parentId` 成为层级关系的唯一事实源，而非同时依赖层级边和 parentId**,
So that **消除 parentId 与层级边的不一致状态，彻底解决折叠/展开、大纲视图、布局重算等场景下的结构性 bug。**

## Background & Problem Statement

### 根因分析（来自 RCA 文档 2026-01-19）

当前架构存在 **"双真相源"** 问题：
- `node.data.parentId` —— 存储在节点数据中
- **层级边 (hierarchical edges)** —— 通过 `graph.getOutgoingEdges()` 过滤 `!isDependencyEdge()` 获取

问题场景：
1. `useLayoutPlugin.ts:259` 只写 `parentId` 不更新边 → 边和 parentId 不一致
2. 折叠隐藏节点后，点击可见节点被误判为 "drop 到隐藏节点上"，`parentId` 被错误改写
3. 大纲视图、Collapse、DrillDown 等功能分别读取边或 parentId，导致视图不一致

### 影响范围

| 文件                                    | 当前行为                                      | 问题                           |
| --------------------------------------- | --------------------------------------------- | ------------------------------ |
| `useOutlineData.ts:65`                  | `getDirectChildren()` 读边 + reorder 直接改边 | 边和 parentId 不一致时大纲错乱 |
| `useNodeCollapse.ts:68`                 | `getDirectChildren()` 读边                    | 折叠/展开后结构不正确          |
| `MindNode.tsx:157-177`                  | `childCount` 读边                             | 子节点计数与实际不符           |
| `useDrillDown.ts:331-345`               | `buildHierarchyChildrenMap()` 读边            | 下钻视图结构错误               |
| `focusModeUtils.ts:28-48`               | `getDirectChildren()` 读边                    | 焦点模式显示错误               |
| `useLayoutPlugin.ts:259`                | 只写 parentId 不改边                          | 边和 parentId 分裂             |
| `GraphSyncManager.ts:650`               | 边和节点独立同步                              | 无 reconcile 机制              |
| `useTemplateInsert.ts`                  | 向 Yjs `yEdges` 写入层级边                    | 与“层级边派生/不入 Yjs”冲突    |
| `clipboardPaste.ts` / `pasteHelpers.ts` | 粘贴/移动时确保/创建层级边到 Yjs              | 继续制造“双真相源”             |

## Acceptance Criteria

### AC1: getDirectChildren 统一读取 parentId

**Given** 任意包含层级关系的图谱
**When** 调用 `getDirectChildren(parentNodeId)`（`parentNodeId` 即父节点的 `node.id`）
**Then** 应返回所有满足 `node.data.parentId === parentNodeId` 的子节点列表
**And** 子节点必须按 `node.data.order` 排序（缺省/相同 order 时用 `node.id` 作为稳定兜底）
**And** 实现可用扫描或缓存 `childrenMap`，但结果必须以 `parentId/order` 为准（不依赖层级边作为权威来源）

### AC2: 层级边根据 parentId 自动派生

**Given** 所有节点的 `parentId` 已正确设置
**When** 图谱加载完成后 或 任意节点的 `parentId` 发生变更时
**Then** 系统应自动 reconcile（创建/更新/删除）对应的层级边
**And** 层级边仅作为 **视图层派生物**（用于渲染/路由），不再作为树结构的权威来源
**And** 层级边不得进入 Yjs `yEdges`（每个客户端本地派生）

### AC3: 边同步策略变更

**Given** 使用 Yjs 进行协作同步
**When** 节点的结构字段（`parentId` / `order`）发生变更时
**Then** 这些字段必须通过 `yNodes` 同步（与现有 node 同步机制保持一致）
**And** `yEdges` 只同步依赖边 (dependency edges)；层级边不再同步/存储到 `yEdges`
**And** 每个客户端本地根据 `parentId/order` 重建层级边

### AC4: 无迁移需求（用户已清空历史数据）

**Given** 用户已确认历史数据已清空
**When** 加载新数据时
**Then** 无需兼容/迁移 "有边无 parentId" 的老数据格式
**And** 若发现历史 `yEdges` 中存在层级边数据，客户端应忽略（可选择性清理），以避免引入双真相源

### AC5: 折叠/展开后结构一致性

**Given** 折叠某个父节点后
**When** 点击其他可见节点
**Then** 被点击节点的 `parentId` 不应被误改写
**And** 大纲视图应正确反映实际层级关系

### AC6: useLayoutPlugin 边一致性

**Given** 在 `mindmap` 或 `logic` 布局模式下拖拽节点
**When** 节点被重新挂载到新父节点下
**Then** 应同时更新 `parentId` **和** 对应的层级边（或通过 reconcile 自动处理）

## Tasks / Subtasks

- [x] Task 1: 创建统一的 `getDirectChildren` 工具函数 (AC: #1)
  - [x] 1.1 在 `apps/web/lib/parentIdUtils.ts` 创建基于 `parentId` 的层级工具函数
  - [x] 1.2 实现 `buildChildrenMap(graph): Map<string, Node[]>`（按 `order` 排序，`id` 稳定兜底）
  - [x] 1.3 实现 `getDirectChildrenByParentId(graph, parentId, childrenMap?)`（优先使用 `childrenMap`）
  - [x] 1.4 实现 `getRootNodes(graph): Node[]`（`parentId` 为空/未定义的节点）
  - [x] 1.5 实现 `getAncestorsByParentId(graph, nodeId): Node[]`
  - [x] 1.6 添加单元测试

- [x] Task 2: 改造 useOutlineData (AC: #1)
  - [x] 2.1 重写 `getDirectChildren` / `getRootNodes` 使用 `parentIdUtils.ts`（优先 `childrenMap`）
  - [x] 2.2 重写 `reorderNode`：只更新 `node.data.parentId` + `order`（不直接 add/remove 层级边），并触发 reconcile
  - [x] 2.3 更新相关单元测试（包含“仅有 parentId，无层级边”场景）

- [x] Task 3: 改造 useNodeCollapse (AC: #1)
  - [x] 3.1 重写 `getDirectChildren` 使用 `parentIdUtils.ts`（优先 `childrenMap`）
  - [x] 3.2 确认 `getAncestors` 已使用 parentId（当前已是）
  - [x] 3.3 更新相关单元测试

- [x] Task 4: 改造 MindNode 的 childCount 计算 (AC: #1)
  - [x] 4.1 重写 `childCount` 计算逻辑使用 `getDirectChildrenByParentId`
  - [x] 4.2 重写 `hiddenDescendantCount` 计算逻辑
  - [x] 4.3 确保 childCount 对 `parentId` 变更具备响应性（避免仅靠 edge 事件导致计数滞后）
  - [ ] 4.4 添加组件测试（现由 `apps/web/e2e/node-collapse.spec.ts` 覆盖徽章回归）

- [x] Task 5: 改造 useDrillDown (AC: #1)
  - [x] 5.1 重写 `buildHierarchyChildrenMap` 基于 `parentIdUtils.ts`（优先 `childrenMap`）
  - [x] 5.2 更新 `canDrillInto` 使用新逻辑
  - [x] 5.3 更新相关单元测试

- [x] Task 6: 改造 focusModeUtils (AC: #1)
  - [x] 6.1 重写 `getDirectChildren` 使用 `parentIdUtils.ts`（优先 `childrenMap`）
  - [x] 6.2 更新相关单元测试

- [x] Task 7: 实现层级边 Reconcile 机制 (AC: #2)
  - [x] 7.1 在 `apps/web/lib/edgeReconciler.ts` 创建 reconcile 函数
    > ⚠️ 确保 `GraphSyncManager` 的 `edge:added` 事件处理中先检查 `isDependencyEdge(edge)`，若为层级边则跳过同步，避免 reconcile 产生的边被回写 Yjs。
  - [x] 7.2 实现 `reconcileHierarchicalEdges(graph)` —— 根据所有节点 parentId 重建边（包裹 try-catch + warning log）
  - [x] 7.3 实现 `reconcileSingleNodeEdge(graph, nodeId, prevParentId, nextParentId)`（用于增量更新）
  - [x] 7.4 在 `GraphSyncManager` 加载完成后调用 reconcile
  - [x] 7.5 在 `node:change:data` (parentId 变更) 后调用 reconcile
  - [x] 7.6 添加单元测试

- [x] Task 8: 修改 GraphSyncManager 边同步策略 (AC: #3)
  - [x] 8.1 停止同步层级边到 Yjs (`yEdges`)
  - [x] 8.2 保留依赖边 (dependency edges) 的同步逻辑
  - [x] 8.3 忽略（可选：清理）来自 Yjs 的层级边数据（防止历史数据引入双真相源）
  - [x] 8.4 确保 `parentId` 和 `order` 通过 `yNodes` 正确同步（不改变既有 node 同步范围）
  - [x] 8.5 在 `loadInitialState` 后调用 `reconcileHierarchicalEdges`
  - [x] 8.6 `node:change:data` 中 parentId/order 变更后触发 reconcile（优先单节点 reconcile）
  - [x] 8.7 修改 `useTemplateInsert.ts`：停止向 `yEdges` 写入层级边（仅依赖边仍写入）
  - [x] 8.8 修改 `clipboardPaste.ts` / `pasteHelpers.ts`：停止创建/确保层级边到 `yEdges`（仅依赖边仍写入）
  - [x] 8.9 更新/新增单元测试：`GraphSyncManager` + clipboard/template insert 的协作一致性

- [x] Task 9: 修复 useLayoutPlugin 边一致性问题 (AC: #6)
  - [x] 9.1 在 `handleNodeMouseUp` 中添加拖拽阈值判断（防止点击误触发）
  - [x] 9.2 在 `findTargetNode` 中过滤隐藏节点
  - [x] 9.3 在 `parentId` 更新后触发 reconcile（或依赖 GraphSyncManager 的结构变更监听）
  - [ ] 9.4 添加单元测试（现由 `apps/web/e2e/node-collapse.spec.ts` 覆盖核心回归）

- [x] Task 10: E2E 回归测试 (AC: #5)
  - [x] 10.1 添加测试用例：折叠分支 → 点击可见节点 → 断言 parentId 不变（`apps/web/e2e/node-collapse.spec.ts`）
  - [x] 10.2 添加测试用例：大纲拖拽重排 → 断言层级正确（已有 `apps/web/e2e/outline-view.spec.ts` 覆盖）
  - [ ] 10.3 添加测试用例：协作场景下 parentId 变更同步（可选：补充）

### Review Follow-ups (AI)

- [x] [AI-Review][MEDIUM] `useOutlineData.ts:203` 的 `reconcileSingleNodeEdge` 缺少 `layoutMode` 参数。`apps/web/components/graph/hooks/useOutlineData.ts`
- [ ] [AI-Review][LOW] 补充 `getSiblings()` 单元测试。`apps/web/lib/__tests__/parentIdUtils.test.ts`
- [ ] [AI-Review][LOW] 为 `useLayoutPlugin` 增补单元测试（拖拽阈值/隐藏节点过滤）。`apps/web/hooks/useLayoutPlugin.ts`
- [ ] [AI-Review][LOW] 补充协作 E2E：parentId 变更在双端一致，且层级边仅本地派生。`apps/web/e2e/collaboration.spec.ts`
- [ ] [AI-Review][LOW] 若需要，补充 MindNode 组件测试专门覆盖 childCount（现由 `apps/web/e2e/node-collapse.spec.ts` 覆盖徽章）。

## Dev Notes

### 版本约束

| 依赖                 | 版本    |
| -------------------- | ------- |
| @antv/x6             | 3.1.2   |
| yjs                  | 13.6.27 |
| @hocuspocus/provider | 3.4.3   |

### 核心设计决策

1. **parentId 是唯一真相**：所有树遍历/父子关系计算必须读取 `node.data.parentId`
2. **层级边是派生视图**：仅用于渲染，根据 parentId 自动生成
3. **依赖边不变**：依赖边 (dependency edges) 仍然独立存储和同步

### Yjs-First 单向数据流约束

> [!IMPORTANT]
> 按照项目规范 (`project-context.md:75-82`)，数据流必须是单向的：**Yjs Store → React State → Graph**。
> reconcile 生成的层级边 **仅作用于本地 X6 Graph**，不得回写 Yjs。

### 实施清单（必须完成）

- **Yjs 数据约束**：`yEdges` 只允许 dependency edges；层级关系只来自 `yNodes` 的 `parentId/order`
- **高性能树查询**：通过 `buildChildrenMap(graph)` 构建 `parentId -> children[]` 缓存，避免在多个功能中反复全量扫描（大图场景 100+ 节点时尤其重要）
- **本地派生边**：仅在本地 X6 Graph 中 reconcile 层级边（用于渲染/路由），并确保 `metadata.kind === 'hierarchical'`
- **触发点**：图加载完成后 + `parentId/order` 变更后（单节点优先，全量兜底）统一触发 reconcile
- **结构变更入口一致性**：大纲拖拽、布局拖拽重挂载等写 `parentId/order` 的入口不得再直接写层级边

### 关键代码模式

```typescript
// ✅ 正确：基于 parentId/order 构建 childrenMap（建议在一次 refresh/reconcile 周期内复用）
function buildChildrenMap(graph: Graph): Map<string, Node[]> {
  const map = new Map<string, Node[]>();
  const sortByOrderThenId = (a: Node, b: Node) => {
    const orderA = a.getData()?.order ?? Infinity;
    const orderB = b.getData()?.order ?? Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return a.id.localeCompare(b.id);
  };

  graph.getNodes().forEach((node) => {
    const parentId = node.getData()?.parentId;
    if (!parentId) return;
    const list = map.get(parentId);
    if (list) list.push(node);
    else map.set(parentId, [node]);
  });

  map.forEach((list) => list.sort(sortByOrderThenId));
  return map;
}

function getDirectChildrenByParentId(
  graph: Graph,
  parentId: string,
  childrenMap?: Map<string, Node[]>
): Node[] {
  const map = childrenMap ?? buildChildrenMap(graph);
  return map.get(parentId) ?? [];
}

// ❌ 错误：在“树结构语义”中基于边获取子节点（废弃）
function getDirectChildrenByEdge(graph: Graph, nodeId: string): Node[] {
  const outEdges = graph.getOutgoingEdges(nodeId) ?? [];
  return outEdges.filter(e => !isDependencyEdge(e)).map(...);
}
```

### 边 Reconcile 算法

```typescript
function reconcileHierarchicalEdges(graph: Graph): void {
  const childrenMap = buildChildrenMap(graph);

  // key: `${sourceId}→${targetId}`
  const expectedKeys = new Set<string>();
  childrenMap.forEach((children, parentId) => {
    children.forEach((child) => expectedKeys.add(`${parentId}→${child.id}`));
  });

  const existingEdges = graph.getEdges().filter((e) => !isDependencyEdge(e));
  const existingByKey = new Map<string, Edge>();
  existingEdges.forEach((edge) => {
    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();
    if (!sourceId || !targetId) return;
    existingByKey.set(`${sourceId}→${targetId}`, edge);
  });

  graph.batchUpdate(() => {
    // 1) 删除多余的层级边
    existingByKey.forEach((edge, key) => {
      if (!expectedKeys.has(key)) graph.removeEdge(edge.id);
    });

    // 2) 创建缺失的层级边（注意：shape/attrs/data 必须显式设置为 hierarchical）
    expectedKeys.forEach((key) => {
      if (existingByKey.has(key)) return;
      const [source, target] = key.split('→');
      graph.addEdge({
        shape: HIERARCHICAL_EDGE_SHAPE,
        source: { cell: source },
        target: { cell: target },
        connector: { name: 'smooth' },
        attrs: HIERARCHICAL_EDGE_ATTRS,
        data: { type: 'hierarchical', metadata: { kind: 'hierarchical' } },
      });
    });
  });
}
```

### 批量操作模式

```typescript
// 批量操作时，使用 graph.batchUpdate 包裹 parentId 变更
graph.batchUpdate(() => {
  nodes.forEach(n => n.setData({ ...n.getData(), parentId }));
});
reconcileHierarchicalEdges(graph); // 单次全量 reconcile
```

### Project Structure Notes

- 新增文件：`apps/web/lib/parentIdUtils.ts` —— 统一的 parentId 工具函数
- 新增文件：`apps/web/lib/edgeReconciler.ts` —— 层级边 reconcile 逻辑
- 修改文件：`apps/web/components/graph/hooks/useOutlineData.ts`
- 修改文件：`apps/web/components/graph/hooks/useNodeCollapse.ts`
- 修改文件：`apps/web/components/nodes/MindNode.tsx`
- 修改文件：`apps/web/components/graph/hooks/useDrillDown.ts`
- 修改文件：`apps/web/components/graph/hooks/focusModeUtils.ts`
- 修改文件：`apps/web/hooks/useLayoutPlugin.ts`
- 修改文件：`apps/web/features/collab/GraphSyncManager.ts`
- 修改文件：`apps/web/hooks/useTemplateInsert.ts`（停止写入层级边到 Yjs）
- 修改文件：`apps/web/hooks/clipboard/clipboardPaste.ts`（停止确保/创建层级边到 Yjs）
- 修改文件：`apps/web/hooks/clipboard/pasteHelpers.ts`（停止确保/创建层级边到 Yjs）
- 修改测试：`apps/web/__tests__/features/GraphSyncManager.test.ts`
- 修改测试：`apps/web/hooks/__tests__/useTemplateInsert.spec.ts`
- 修改测试：`apps/web/hooks/__tests__/clipboardPaste.spec.ts`

### References

- [Source: docs/analysis/node-disappears-on-click-after-collapse-rca-2026-01-19.md]
- [Source: docs/project-context.md#Yjs-First 单向数据流]
- [Source: apps/web/lib/edgeValidation.ts] —— `isDependencyEdge()` 函数
- [Source: apps/web/lib/edgeShapes.ts] —— `HIERARCHICAL_EDGE_SHAPE` 常量

### Testing Strategy

1. **单元测试**：使用 Vitest 测试各工具函数和 hooks
2. **E2E 测试**：使用 Playwright 测试折叠/大纲/协作场景
3. **手动测试**：折叠分系统设计 → 点击轨道设计 → 验证 parentId 不变

---

## 📋 Test Design (测试设计)

### 测试文件清单

| 类型     | 文件路径                                                | 状态       |
| -------- | ------------------------------------------------------- | ---------- |
| 单元测试 | `apps/web/lib/__tests__/parentIdUtils.test.ts`          | 🆕 新增     |
| 单元测试 | `apps/web/lib/__tests__/edgeReconciler.test.ts`         | 🆕 新增     |
| 单元测试 | `apps/web/__tests__/features/GraphSyncManager.test.ts`  | 🔄 修改     |
| 单元测试 | `apps/web/__tests__/hooks/useOutlineData.test.ts`       | 🔄 修改     |
| 单元测试 | `apps/web/__tests__/hooks/useNodeCollapse.test.ts`      | 🔄 修改     |
| 单元测试 | `apps/web/__tests__/components/nodes/MindNode.test.tsx` | 🆕 新增     |
| 单元测试 | `apps/web/hooks/__tests__/useLayoutPlugin.spec.ts`      | 🆕 新增     |
| 单元测试 | `apps/web/hooks/__tests__/useTemplateInsert.spec.ts`    | 🔄 修改     |
| 单元测试 | `apps/web/hooks/__tests__/clipboardPaste.spec.ts`       | 🔄 修改     |
| 单元测试 | `apps/web/hooks/__tests__/clipboardSerializer.spec.ts`  | 🔄 回归验证 |
| E2E 测试 | `apps/web/e2e/parentid-consistency.spec.ts`             | 🆕 新增     |
| E2E 测试 | `apps/web/e2e/node-collapse.spec.ts`                    | 🔄 回归验证 |
| E2E 测试 | `apps/web/e2e/outline-view.spec.ts`                     | 🔄 回归验证 |
| E2E 测试 | `apps/web/e2e/drill-down.spec.ts`                       | 🔄 回归验证 |
| E2E 测试 | `apps/web/e2e/collaboration.spec.ts`                    | 🔄 回归验证 |

---

### AC1: getDirectChildren 统一读取 parentId

#### 单元测试: `parentIdUtils.test.ts`

```typescript
describe('getDirectChildrenByParentId', () => {
  it('should return children matching parentId', () => {
    // 创建 parent 和 3 个 children (parentId = parent.id)
    // 断言返回的 children 数量和 id 正确
  });

  it('should return empty array when no children exist', () => {
    // 创建单个 node 无 children
    // 断言返回 []
  });

  it('should sort children by order field', () => {
    // 创建 children 顺序为 [order=2, order=0, order=1]
    // 断言返回顺序为 [order=0, order=1, order=2]
  });

  it('should use id as stable sort fallback when order is equal', () => {
    // 创建 children 都 order=0，id 为 ['c', 'a', 'b']
    // 断言返回顺序为 ['a', 'b', 'c']
  });

  it('should not include nodes with different parentId', () => {
    // 创建 parent1, parent2 各有 2 个 children
    // 调用 getDirectChildrenByParentId(graph, parent1.id)
    // 断言只返回 parent1 的 children
  });
});

describe('getRootNodes', () => {
  it('should return nodes with empty/undefined parentId', () => {
    // 创建 2 个根节点 (parentId=undefined) + 2 个子节点
    // 断言返回 2 个根节点
  });
});

describe('getAncestorsByParentId', () => {
  it('should return ancestor chain from leaf to root', () => {
    // 创建 root -> child -> grandchild
    // 调用 getAncestorsByParentId(graph, grandchild.id)
    // 断言返回 [child, root]
  });

  it('should handle circular reference gracefully', () => {
    // 创建 A.parentId = B, B.parentId = A
    // 断言不会无限循环，返回有限结果
  });
});

describe('buildChildrenMap', () => {
  it('should build correct parentId -> children mapping', () => {
    // 创建多层级树
    // 断言 map.get(parentId) 返回正确的 children 列表
  });
});
```

#### 回归验证: `useOutlineData.test.ts`

```typescript
describe('useOutlineData with parentId-based children', () => {
  it('should build tree using parentId instead of edges', () => {
    // 创建 parentId 关系但没有对应边
    // 断言 outlineData 仍然正确构建树
  });

  it('should ignore hierarchical edges when building tree', () => {
    // 创建 parentId 指向 A，但有层级边指向 B
    // 断言 outlineData 使用 parentId 而非边
  });
});
```

#### 组件测试: `MindNode.test.tsx`

```typescript
describe('MindNode childCount (parentId-based)', () => {
  it('should render correct childCount based on parentId', () => {
    // 构造 graph: parent + children，仅设置 child.data.parentId（不创建层级边）
    // 断言 parent 节点的 childCount/徽章显示正确
  });

  it('should update childCount when a child is re-parented', () => {
    // 模拟某个 child.parentId 从 parentA 改为 parentB（结构变更）
    // 断言 parentA 的 childCount 减少，parentB 的 childCount 增加
  });
});
```

---

### AC2: 层级边根据 parentId 自动派生

#### 单元测试: `edgeReconciler.test.ts`

```typescript
describe('reconcileHierarchicalEdges', () => {
  it('should create missing edges from parentId relationships', () => {
    // 创建 3 个 nodes 有 parentId 但无边
    // 调用 reconcileHierarchicalEdges
    // 断言创建了 2 条层级边
  });

  it('should remove stale edges not matching any parentId', () => {
    // 创建层级边 A -> B，但 B.parentId = C
    // 调用 reconcileHierarchicalEdges
    // 断言删除了 A -> B 边
  });

  it('should preserve dependency edges', () => {
    // 创建依赖边 A -> B
    // 调用 reconcileHierarchicalEdges
    // 断言依赖边仍存在
  });

  it('should skip edge creation when parent node not found', () => {
    // 创建 node 的 parentId 指向不存在的 id
    // 调用 reconcileHierarchicalEdges
    // 断言不抛错，打印 warning
  });
});

describe('reconcileSingleNodeEdge', () => {
  it('should remove old edge and create new edge', () => {
    // 创建 node 从 parent1 移动到 parent2
    // 调用 reconcileSingleNodeEdge(graph, nodeId, parent1, parent2)
    // 断言删除了 parent1 -> node，创建了 parent2 -> node
  });

  it('should only remove edge when newParentId is undefined (promote to root)', () => {
    // 调用 reconcileSingleNodeEdge(graph, nodeId, parent1, undefined)
    // 断言只删除边，不创建新边
  });
});
```

#### E2E 测试: `parentid-consistency.spec.ts`

```typescript
test('reconcile creates edges after graph load', async ({ page }) => {
  // 1. 通过 Yjs 加载图谱（只有 parentId，无边）
  // 2. 检查 DOM 中层级边元素是否存在
  // 3. 断言边的 source/target 与 parentId 一致
});
```

---

### AC3: 边同步策略变更

#### 单元测试: `GraphSyncManager.test.ts`

```typescript
describe('GraphSyncManager edge sync', () => {
  it('should NOT sync hierarchical edges to Yjs', () => {
    // 创建层级边
    // 调用 syncEdgeToYjs
    // 断言 yEdges.set 未被调用
  });

  it('should sync dependency edges to Yjs', () => {
    // 创建依赖边
    // 调用 syncEdgeToYjs
    // 断言 yEdges.set 被调用
  });

  it('should NOT apply hierarchical edges from Yjs', () => {
    // Mock Yjs 返回层级边数据（历史数据）
    // 调用 load/apply
    // 断言不会应用到 graph（可选：同时清理 yEdges 中对应记录）
  });

  it('should call reconcileHierarchicalEdges after loadInitialState', () => {
    // Mock reconcileHierarchicalEdges
    // 调用 loadInitialState
    // 断言 reconcile 被调用
  });
});
```

#### 单元测试: `useTemplateInsert.spec.ts`

```typescript
describe('useTemplateInsert (no hierarchical edges in yEdges)', () => {
  it('should derive hierarchy from parentId and NOT write hierarchical edges into yEdges', () => {
    // 插入包含 parent-child 结构的模板
    // 断言 yNodes 写入了 parentId/order
    // 断言 yEdges 只包含 dependency edges（不存在 kind === "hierarchical"）
  });
});
```

#### 单元测试: `clipboardPaste.spec.ts`

```typescript
describe('clipboardPaste (no hierarchical edges in yEdges)', () => {
  it('should update parentId/order via yNodes and NOT create/ensure hierarchical edges in yEdges', () => {
    // 执行粘贴/移动（cut-paste）包含层级关系的节点
    // 断言 yNodes.parentId/order 正确更新
    // 断言 yEdges 不包含新增的 hierarchical 记录（dependency edges 仍按现状处理）
  });
});
```

#### E2E 测试: `parentid-consistency.spec.ts`

```typescript
test('parentId sync across clients', async ({ browser }) => {
  // 1. 打开两个 browser contexts (模拟两个用户)
  // 2. 用户A 拖拽节点改变 parentId
  // 3. 等待同步
  // 4. 验证用户B 看到正确的层级边
});
```

---

### AC4: 无迁移需求

> 用户已确认历史数据已清空，无需做“从边迁移到 parentId”的兼容测试；但需覆盖“忽略/可选清理 yEdges 中层级边”的防御性用例（见 `GraphSyncManager.test.ts`）。

---

### AC5: 折叠/展开后结构一致性

#### E2E 测试: `parentid-consistency.spec.ts`

```typescript
test('click after collapse should not change parentId', async ({ page }) => {
  // 1. 创建测试树: root -> parent1 -> child1
  //                   -> parent2 -> child2
  // 2. 折叠 parent1 (child1 隐藏)
  // 3. 点击 child2 (在 parent2 下)
  // 4. 断言 child2.parentId === parent2.id (未改变)
  // 5. 验证大纲视图 child2 仍在 parent2 下
});

test('click inside collapsed area should not trigger reparent', async ({ page }) => {
  // 复现 RCA 中描述的 bug:
  // 1. 折叠「分系统设计」
  // 2. 点击「轨道设计」(在总体方案设计下)
  // 3. 断言「轨道设计」parentId 未变成「分系统设计」
});
```

#### 回归验证: `node-collapse.spec.ts`

```typescript
// 确保现有折叠/展开测试通过
test('collapse and expand should work correctly', async ({ page }) => {
  // 现有测试不变，验证折叠功能正常
});
```

---

### AC6: useLayoutPlugin 边一致性

#### 单元测试: `useLayoutPlugin.spec.ts`

```typescript
describe('drag threshold', () => {
  it('should not trigger reparent on click (< 5px movement)', () => {
    // 模拟 mousedown/mouseup 位移 < 5px
    // 断言 parentId 未改变
  });

  it('should trigger reparent on drag (>= 5px movement)', () => {
    // 模拟 mousedown/mouseup 位移 >= 5px
    // 断言 parentId 和边都更新
  });
});

describe('hidden node filtering', () => {
  it('should not select hidden node as drop target', () => {
    // 创建隐藏节点在拖拽位置
    // 模拟拖拽
    // 断言隐藏节点不被选为 target
  });
});
```

#### E2E 测试: `parentid-consistency.spec.ts`

```typescript
test('drag reparent updates both parentId and edge', async ({ page }) => {
  // 1. 创建 parent1 -> child, parent2
  // 2. 拖拽 child 到 parent2 范围内
  // 3. 断言 child.parentId === parent2.id
  // 4. 断言存在 parent2 -> child 层级边
  // 5. 断言 parent1 -> child 边已删除
});
```

---

### 回归影响分析

| 现有功能        | 影响评估                           | 回归测试                                              |
| --------------- | ---------------------------------- | ----------------------------------------------------- |
| 折叠/展开       | 🟡 中等 - 子节点获取逻辑变化        | `node-collapse.spec.ts`                               |
| 大纲视图        | 🟢 低 - 仅改底层实现                | `outline-view.spec.ts`                                |
| 下钻导航        | 🟡 中等 - hierarchyChildrenMap 变化 | `drill-down.spec.ts`                                  |
| 焦点模式        | 🟢 低 - getDirectChildren 替换      | 手动测试                                              |
| 模板导入/剪贴板 | 🟡 中等 - Yjs 层级边写入策略变化    | `useTemplateInsert.spec.ts`, `clipboardPaste.spec.ts` |
| 布局切换        | 🟢 低 - 不依赖子节点获取            | `layout-switching.spec.ts`                            |
| 协作同步        | 🔴 高 - 边同步策略变化              | `collaboration.spec.ts`                               |
| 依赖边创建      | 🟢 无影响 - 独立于层级边            | `dependency-mode.spec.ts`                             |

---

### 执行命令

```bash
# 运行新增单元测试
cd apps/web && pnpm test __tests__/lib/parentIdUtils.test.ts
cd apps/web && pnpm test __tests__/lib/edgeReconciler.test.ts

# 运行协作/边策略相关单元测试
cd apps/web && pnpm test __tests__/features/GraphSyncManager.test.ts
cd apps/web && pnpm test hooks/__tests__/useTemplateInsert.spec.ts
cd apps/web && pnpm test hooks/__tests__/clipboardPaste.spec.ts

# 运行 hooks/components 单元测试 (回归)
cd apps/web && pnpm test __tests__/hooks/useOutlineData.test.ts
cd apps/web && pnpm test __tests__/hooks/useNodeCollapse.test.ts
# （可选）后续若补齐单测：
# cd apps/web && pnpm test hooks/__tests__/useLayoutPlugin.spec.ts
# cd apps/web && pnpm test __tests__/components/nodes/MindNode.test.tsx

# 运行关键 E2E 回归（覆盖：折叠后点击不应改写 parentId）
cd apps/web && pnpm test:e2e e2e/node-collapse.spec.ts

# 运行回归 E2E 测试（可选）
cd apps/web && pnpm test:e2e e2e/outline-view.spec.ts
cd apps/web && pnpm test:e2e e2e/drill-down.spec.ts
cd apps/web && pnpm test:e2e e2e/collaboration.spec.ts
```

---

## Engineering Guardrails

### 🟢 MUST DO（必须遵守）

| 规则                                                 | 说明                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| **使用 `parentIdUtils.ts`（含 `buildChildrenMap`）** | 所有“树结构语义”（子节点/祖先/根节点/层级遍历）必须走统一工具函数  |
| **通过 reconcile 同步派生边**                        | 修改 `parentId/order` 后必须触发 reconcile（单节点优先，全量兜底） |
| **保持 `order` 字段排序**                            | 子节点列表必须按 `node.data.order` 排序，确保顺序一致性            |
| **Yjs `yEdges` 仅允许依赖边**                        | `yEdges` 只同步/存储 dependency edges；层级边由客户端本地派生      |
| **忽略/可选清理历史层级边**                          | 若 `yEdges` 出现层级边（历史数据），必须忽略（可选择性删除）       |
| **过滤隐藏节点**                                     | `findTargetNode` 必须排除 `!isVisible()` 的节点                    |
| **添加拖拽阈值**                                     | `handleNodeMouseUp` 必须检查移动距离 >= 5px 才触发重挂载           |

### 🔴 MUST NOT DO（禁止行为）

| 规则                                   | 说明                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **❌ 禁止在树结构语义中通过边取子节点** | 不得用 `graph.getOutgoingEdges()`（过滤非依赖边）作为“子节点/层级”的权威来源                                              |
| **❌ 禁止在业务逻辑里直接改层级边**     | 不得在业务逻辑中直接 `graph.addEdge()` / `graph.removeEdge()` 层级边；仅允许在 `edgeReconciler.ts` 中处理                 |
| **❌ 禁止向 Yjs 写入层级边**            | 任何写入 `yEdges` 的地方都必须保证只写 dependency edges（包括 `GraphSyncManager` / `useTemplateInsert` / clipboard 相关） |
| **❌ 禁止误解 AC3 为“只同步两个字段”**  | `yNodes` 仍按现状同步 node 数据；AC3 的变化仅是“层级边不进 yEdges，客户端本地派生”                                        |
| **❌ 禁止只改 parentId 不 reconcile**   | 任何修改 `node.data.parentId` 的地方必须同时触发边 reconcile                                                              |
| **❌ 禁止在点击时触发重挂载**           | 必须区分点击和拖拽，仅在拖拽时触发 parentId 变更                                                                          |

### ⚠️ 边界情况处理

| 场景                        | 处理方式                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `parentId` 指向不存在的节点 | reconcile 时跳过该边创建，打印 warning 日志                                            |
| 循环引用 (A → B → A)        | `getAncestorsByParentId` 使用 visited Set 防止无限循环                                 |
| 根节点 (无 parentId)        | `getRootNodes` 返回 `parentId` 为空或未定义的节点                                      |
| 批量操作                    | 多节点 parentId 变更后，调用一次 `reconcileHierarchicalEdges` 而非多次单节点 reconcile |

---

## Tech-Spec Reference

**详细实现代码请参考**: [tech-spec-8-10-parentid-single-source-of-truth.md](./tech-spec-8-10-parentid-single-source-of-truth.md)

Tech-Spec 包含:
- `parentIdUtils.ts` 完整代码
- `edgeReconciler.ts` 完整代码  
- 各文件改造的 diff 示例
- useLayoutPlugin 拖拽阈值实现

## Senior Developer Review (AI)

### ✅ 结论

- AC1~AC6 均已实现：层级关系以 `node.data.parentId` 为唯一真相源；层级边改为本地派生；协作仅同步 dependency edges。
- 已补齐关键回归：新增 parentId/edge reconcile 单测，并在 `apps/web/e2e/node-collapse.spec.ts` 增补“折叠后点击不改写 parentId”用例。

### 🔴 High（已修复）

- **仍在写入/同步层级边到 Yjs**：`useTemplateInsert`、clipboard 粘贴、`GraphSyncManager` 的 yEdges 监听/回放链路会持续制造“双真相源”。
- **多处仍以 hierarchical edges 作为树语义**：大纲/折叠/下钻/焦点模式/MindNode/Gantt 等出现“结构不一致”视图错乱风险。
- **useLayoutPlugin 点击误触发重挂载**：缺少拖拽阈值 + 未过滤隐藏节点，导致 RCA 场景下 parentId 被误改写并触发布局重算。

### 🟡 Medium（已修复）

- **缺少新规则的测试护栏**：补充 `parentIdUtils` / `edgeReconciler` 单测，更新受影响的 hook/协作/剪贴板测试，并跑通关键 E2E。

### 🟢 Low（遗留/可选）

- 可选补强：协作 E2E 覆盖“parentId 变更在双端一致 + 层级边仅本地派生”（当前单测已覆盖核心约束）。
- 可选补强：`useLayoutPlugin` 更细粒度单元测试（当前由 E2E 覆盖核心回归）。

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

- `pnpm --filter @cdm/web test` (pass)
- `pnpm --filter @cdm/web lint` (pass)
- `pnpm --filter @cdm/web test:e2e e2e/node-collapse.spec.ts` (pass)

### Completion Notes List

- parentId 作为树结构真相源：新增 `apps/web/lib/parentIdUtils.ts`，并将树遍历统一切换为 parentId/order。
- 层级边本地派生：新增 `apps/web/lib/edgeReconciler.ts`，在图加载与 parentId 变更时 reconcile（增量优先，全量兜底）。
- 协作同步收敛：`yEdges` 仅同步 dependency edges；忽略历史层级边；避免 reconcile 产生的层级边被回写。
- 入口清理：模板插入/剪贴板粘贴不再写入层级边到 Yjs。
- 回归补齐：新增/更新单元测试与 E2E（折叠后点击不应改写 parentId）。

### File List

- `apps/web/lib/parentIdUtils.ts` (new)
- `apps/web/lib/edgeReconciler.ts` (new)
- `apps/web/features/collab/GraphSyncManager.ts`
- `apps/web/hooks/useTemplateInsert.ts`
- `apps/web/hooks/clipboard/clipboardPaste.ts`
- `apps/web/hooks/clipboard/pasteHelpers.ts`
- `apps/web/hooks/useLayoutPlugin.ts`
- `apps/web/components/graph/hooks/useOutlineData.ts`
- `apps/web/components/graph/hooks/useNodeCollapse.ts`
- `apps/web/components/graph/hooks/useDrillDown.ts`
- `apps/web/components/graph/hooks/focusModeUtils.ts`
- `apps/web/components/nodes/MindNode.tsx`
- `apps/web/features/views/components/GanttView/useGanttData.ts`
- `apps/web/__tests__/lib/parentIdUtils.test.ts` (new)
- `apps/web/__tests__/lib/edgeReconciler.test.ts` (new)
- `apps/web/__tests__/features/GraphSyncManager.test.ts`
- `apps/web/__tests__/hooks/useOutlineData.test.ts`
- `apps/web/__tests__/hooks/useDrillDown.test.ts`
- `apps/web/__tests__/features/views/useGanttData.test.ts`
- `apps/web/hooks/__tests__/clipboardPaste.spec.ts`
- `apps/web/e2e/node-collapse.spec.ts`
- `docs/sprint-artifacts/story-8-10-parentid-single-source-of-truth.md`
- `docs/sprint-artifacts/tech-spec-8-10-parentid-single-source-of-truth.md`
- `docs/sprint-artifacts/validation-report-2026-01-19T20-07-08+0800.md`
- `docs/sprint-artifacts/sprint-status.yaml`

### Change Log

- 2026-01-20: [Code Review] Adversarial review complete. Fixed MEDIUM: `useOutlineData.ts:203` 现已传递 `layoutMode` 给 `reconcileSingleNodeEdge`。新增 2 条 LOW 优先级 action items。所有 18 个 useOutlineData 单测通过。
- 2026-01-19: parentId 单一真相源落地；层级边本地派生；协作仅同步 dependency edges；补齐单测与关键 E2E 回归。
