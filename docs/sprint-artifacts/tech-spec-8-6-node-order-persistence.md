# Tech-Spec: Story 8.6 兄弟节点顺序持久化

**Created:** 2026-01-08
**Status:** Ready for Development
**Story:** [story-8-6-node-order-persistence.md](./story-8-6-node-order-persistence.md)

---

## Overview

### Problem Statement

当前系统中兄弟节点顺序依赖 **Y 坐标计算**，而非独立的 `order` 字段。这导致：

1. **顺序不稳定** - 自动布局后节点顺序可能变化
2. **无法精准控制** - 无法指定"插入到第二个位置"
3. **模板顺序丢失** - `TemplateNode.children` 没有 order 属性
4. **新建节点无序** - `AddChildCommand` / `AddSiblingCommand` 不设置 order

### Solution

在节点创建、模板实例化、键盘导航等关键环节统一使用 `data.order` 字段排序兄弟节点。

### Scope

**In Scope:**
- Prisma Node 添加 `order` 字段（不强制数据重置；提供兼容/回填策略）
- 后端补齐 `order` 的同步/恢复（Yjs → Node 表 + relational init fallback）
- `AddChildCommand` / `AddSiblingCommand` 赋值 order
- `NavigationCommand` 改为按 order 排序
- `TemplateNode` 添加 order 属性 + 种子数据更新
- 模板保存（子树提取）写入 order + children 按 order 排序
- 模板实例化时写入 order

**Out of Scope:**
- 画布拖拽后自动更新 order（Phase 2）
- 批量重排 UI（右键菜单上移/下移）

---

## Context for Development

### Codebase Patterns

| Pattern | Location | Description |
|---------|----------|-------------|
| Node Data 结构 | `packages/types/src/index.ts:2-14` | `NodeData` 已有 `order?: number` |
| 模板节点类型 | `packages/types/src/template-types.ts:24-32` | `TemplateNode` 需添加 order |
| 模板保存（子树提取） | `apps/web/lib/subtree-extractor.ts:110-157` | children 收集未排序，且未写入 TemplateNode.order |
| 模板实例化 | `packages/plugins/plugin-template/src/server/templates/templates.service.ts:155-223` | `tx.node.create` 未写入 `order` |
| 模板结构展开 | `packages/plugins/plugin-template/src/server/templates/templates.service.ts:263-309` | `generateNodesFromStructure` 有 siblingIndex，但未写入 order |
| 子节点创建 | `packages/plugins/plugin-mindmap-core/src/commands/AddChildCommand.ts:16-47` | 创建 node.data 但缺少 order |
| 兄弟节点创建 | `packages/plugins/plugin-mindmap-core/src/commands/AddSiblingCommand.ts:17-77` | 创建 node.data 但缺少 order（且需忽略 dependency edges） |
| 键盘导航 | `packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts:34-42` | `getChildren()` 按 `data.order` 排序（无 order 时 fallback X；垂直布局兄弟横向） |
| 层级边过滤 | `packages/plugins/plugin-mindmap-core/src/utils/edgeFilters.ts` | 提供 getHierarchicalParent/getHierarchicalChildren |
| 大纲视图 | `apps/web/components/graph/hooks/useOutlineData.ts:86-92,239-278` | ✅ 已按 `data.order` 排序 + normalizeOrder |
| 布局排序 | `packages/plugins/plugin-layout/src/utils/sortNodes.ts:20-31` | ✅ 已优先使用 `data.order`（无需改布局） |
| 后端：relational init | `apps/api/src/modules/collab/collab.service.ts:140-160` | 构造 yNode 时未写入 `order` |
| 后端：Yjs→Node 同步 | `apps/api/src/modules/collab/collab.service.ts:327-343` | NodeUpsertBatchData 未包含 `order` |
| 后端：Node upsert | `apps/api/src/modules/graphs/graph.repository.ts:15-29,117-147` | upsert 未写入 `order` |
| 种子数据 | `packages/database/prisma/seed.ts` | 模板 children 无 order 值（可依赖 index 兜底，但推荐补齐） |

### Files to Reference

```
packages/database/prisma/schema.prisma          # Node model - 添加 order 字段
packages/types/src/index.ts                      # NodeData - 已有 order
packages/types/src/template-types.ts             # TemplateNode - 添加 order
packages/database/prisma/seed.ts                 # 种子模板 - 添加 order 值
apps/web/lib/subtree-extractor.ts                # 保存模板时写入 order + children 排序

packages/plugins/plugin-mindmap-core/src/commands/AddChildCommand.ts
packages/plugins/plugin-mindmap-core/src/commands/AddSiblingCommand.ts
packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts
packages/plugins/plugin-mindmap-core/src/utils/edgeFilters.ts

packages/plugins/plugin-template/src/server/templates/templates.service.ts

apps/web/components/graph/hooks/useOutlineData.ts  # 参考 - 已支持 order
packages/plugins/plugin-layout/src/utils/sortNodes.ts # 参考 - layout 已支持 order

apps/api/src/modules/collab/collab.service.ts      # order 同步/恢复（fallback）补齐
apps/api/src/modules/graphs/graph.repository.ts    # Node upsert 写入 order
```

### Technical Decisions

**TD-0: “顺序持久化”的数据契约（Source of Truth）**
- 源数据：`node.data.order`（进入 Yjs 的 `nodes` Map，随 `Graph.yjsState` 持久化）
- 派生存储：`Node.order`（relational DB，用于 yjsState 为空时的初始化兜底 + 可能的查询/统计需求）

**TD-1: Prisma order 字段类型**
- 使用 `Int @default(0)` 整数类型，与 TemplateCategory.sortOrder 一致
- 默认值 0，新节点需手动赋值

**TD-2: 向后兼容策略**
- 默认策略：兼容历史图谱（缺失 order 时使用 fallback + 在关键路径做 normalize/append，避免新节点插入到最前）
- 可选策略：如业务决定强制“删数据重置”，需在发布说明中明确，并跳过回填脚本

**TD-3: 兄弟重排算法**
- 新建兄弟节点时，插入位置 = `selectedNode.order + 1`
- 后续兄弟节点 order 递增（+1）
- 使用 `graph.batchUpdate()` 保证原子性

**TD-4: 模板兼容性**
- `TemplateNode.order` 可选，未指定时使用数组索引
- 种子数据显式添加 order 属性

---

## Implementation Plan

### Phase 1: 数据模型 (P0)

- [ ] **Task 1.1**: `schema.prisma` 添加 `order` 字段

```prisma
model Node {
  // ... existing fields
  order Int @default(0)  // 兄弟节点排序
}
```

- [ ] **Task 1.2**: `template-types.ts` 添加 `order` 属性

```typescript
export interface TemplateNode {
  label: string;
  type?: NodeType;
  order?: number;  // NEW: 兄弟顺序
  children?: TemplateNode[];
  // ... existing fields
}
```

- [ ] **Task 1.3**: 运行数据库迁移

```bash
pnpm --filter @cdm/database db:migrate
```

- [ ] **Task 1.4**: 后端 order 同步/恢复打通（AC7）
  - [ ] `apps/api/src/modules/graphs/graph.repository.ts`：`NodeUpsertBatchData` 增加 `order`，upsert create/update 写入 `order`
  - [ ] `apps/api/src/modules/collab/collab.service.ts`：
    - onStoreDocument：从 yNode 读取 `order` 并同步到 Node 表
    - relational init：从 `Node.order` 初始化到 yNode.order（yjsState 为空的兜底路径）

- [ ] **Task 1.5**: 更新 `seed.ts` 种子模板补齐 order（可选但推荐）

### Phase 2: 节点创建命令 (P0)

- [ ] **Task 2.1**: 修改 `AddChildCommand.ts`

```typescript
// 在 execute() 中获取现有子节点的最大 order
private getMaxChildOrder(graph: Graph, parentNode: Node): number {
  // 仅层级子节点（忽略 dependency edges）
  const children = getHierarchicalChildren(graph, parentNode);
  if (children.length === 0) return -1;
  return Math.max(
    ...children.map((c) => (typeof c.getData()?.order === 'number' ? (c.getData()?.order as number) : -1))
  );
}

// 创建节点时设置 order
data: {
  ...existingData,
  order: this.getMaxChildOrder(graph, selectedNode) + 1,
}
```

- [ ] **Task 2.2**: 修改 `AddSiblingCommand.ts`

```typescript
// 1. 获取 siblings（仅层级边）并在必要时 normalize
const siblings = getHierarchicalChildren(graph, parentNode);
const hasMissingOrder = siblings.some((s) => typeof s.getData()?.order !== 'number');
if (hasMissingOrder) {
  const stable = [...siblings].sort((a, b) => {
    const oa = a.getData()?.order ?? Infinity;
    const ob = b.getData()?.order ?? Infinity;
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
  graph.batchUpdate(() => {
    stable.forEach((s, i) => s.setData({ ...(s.getData() || {}), order: i }));
  });
}

const selectedOrder = (typeof selectedData.order === 'number' ? selectedData.order : 0);

// 2. 重排后续兄弟 (order >= selectedOrder+1 的节点 +1)
graph.batchUpdate(() => {
  siblings.forEach(s => {
    const sOrder = s.getData()?.order ?? 0;
    if (sOrder >= selectedOrder + 1) {
      s.setData({ ...s.getData(), order: sOrder + 1 });
    }
  });
});

// 3. 新节点 order = selectedOrder + 1
data: {
  ...existingData,
  order: selectedOrder + 1,
}
```

### Phase 3: 键盘导航 (P1)

- [ ] **Task 3.1**: 修改 `NavigationCommand.ts`

```typescript
getChildren(graph: Graph, node: Node): Node[] {
  const children = getHierarchicalChildren(graph, node);
  
  // 改为按 order 排序；无 order 时按 X 坐标（垂直布局兄弟横向）
  return children.sort((a, b) => {
    const orderA = a.getData()?.order ?? Infinity;
    const orderB = b.getData()?.order ?? Infinity;
    if (orderA !== orderB) return orderA - orderB;
    // Fallback: X 坐标
    return a.getPosition().x - b.getPosition().x;
  });
}
```

### Phase 4: 模板系统 (P1)

- [ ] **Task 4.1**: 模板保存（子树提取）写入 order（AC4）
  - [ ] 修改 `apps/web/lib/subtree-extractor.ts`：`TemplateNode.order = node.getData()?.order`
  - [ ] 修改 `apps/web/lib/subtree-extractor.ts`：children 按 `order ?? Infinity` 排序（fallback id），再递归构建
  - [ ] 更新 `apps/web/lib/__tests__/subtree-extractor.spec.ts`：新增用例验证 order 写入 + children 顺序稳定

- [ ] **Task 4.2**: 修改 `templates.service.ts` - `GeneratedNode` 添加 order

```typescript
interface GeneratedNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  parentId: string | null;
  order: number;  // NEW
  metadata: Prisma.InputJsonValue;
  _tempId?: string;
}
```

- [ ] **Task 4.3**: 修改 `generateNodesFromStructure()` 写入 order + children 按 order 创建

```typescript
// 使用 templateNode.order 或 siblingIndex
const nodeOrder = rootNode.order ?? siblingIndex;

nodes.push({
  ...existingProps,
  order: nodeOrder,
});

// children: sort by (child.order ?? originalIndex)
```

- [ ] **Task 4.4**: 修改 `generateGraphFromTemplate()` 创建节点时写入 order（Node.order column）

```typescript
await tx.node.create({
  data: {
    ...existingData,
    order: node.order,  // NEW: 写入 order
  },
});
```

- [ ] **Task 4.5**: 更新 `seed.ts` 种子模板添加 order 值（可选但推荐）

```typescript
// 示例: tpl-agile
children: [
  { label: 'Epic 1', type: 'REQUIREMENT', order: 0, children: [...] },
  { label: 'Sprint Backlog', order: 1, children: [...] },
  { label: '回顾记录', order: 2 },
],
```

### Phase 5: 验证 (All)

- [ ] **Task 5.1**: 重置数据库

```bash
pnpm --filter @cdm/database db:reset
pnpm --filter @cdm/database db:seed
```

- [ ] **Task 5.2**: 运行现有测试确认不 break

- [ ] **Task 5.3**: 新增测试用例

---

## Acceptance Criteria

### Functional

- [ ] **AC1**: 新建子节点 order = max(siblings.order) + 1
- [ ] **AC2**: 新建兄弟节点正确插入并重排后续兄弟
- [ ] **AC3**: 键盘导航 ←/→（兄弟）按 order 执行（↑ parent、↓ first child）
- [ ] **AC4**: 模板保存时 TemplateNode 包含 order，且 children 按 order 稳定排序
- [ ] **AC5**: 模板实例化后节点 order 与模板定义一致
- [ ] **AC6**: 大纲拖拽重排后 order 同步更新并影响导航
- [ ] **AC7**: 持久化后重新打开顺序保持（Primary: yjsState；Fallback: yjsState 为空时按 Node.order init）

### Non-Functional

- [ ] 不破坏现有测试（601 tests passing）
- [ ] 兄弟重排使用 batchUpdate 保证原子性

---

## Additional Context

### Dependencies

| Package | Usage |
|---------|-------|
| `@cdm/database` | Prisma migration, seed |
| `@cdm/types` | NodeData, TemplateNode types |
| `@cdm/plugin-mindmap-core` | AddChild/Sibling/Navigation commands |
| `@cdm/plugin-template` | Template instantiation |

### Testing Strategy

#### Existing Tests to Update

| Test File | Changes |
|-----------|---------|
| `plugin-mindmap-core/.../commands.test.ts` | AddChild/Sibling 验证 order 赋值 |
| `plugin-mindmap-core/.../NavigationCommand.test.ts` | 验证按 order 排序 |

#### New Tests to Add

| Test File | Coverage |
|-----------|----------|
| `commands.test.ts` | `AddChildCommand sets order = max(siblings.order) + 1` |
| `commands.test.ts` | `AddSiblingCommand inserts at correct order and reorders siblings` |
| `NavigationCommand.test.ts` | `getChildren sorts by order, then X position` |

#### Test Commands

```bash
# 单元测试 (Vitest)
pnpm --filter @cdm/plugin-mindmap-core test

# 全量测试
pnpm test

# E2E (如需验证 UI)
pnpm --filter @cdm/web test:e2e
```

#### Manual Verification

1. **新建子节点**：创建多个子节点 → 大纲视图顺序与创建顺序一致
2. **新建兄弟节点**：在中间节点按 Enter → 新节点插入在正确位置
3. **键盘导航**：←/→ 键按 order 而非 X 坐标跳转
4. **模板导入**：导入模板 → 大纲视图顺序与模板定义一致

### Notes

- ⚠️ 数据策略不强制“删数据重置”；如业务决定强制重置，需在发布说明中明确
- 画布拖拽更新 order 排除在本次范围外（Phase 2）
- `useOutlineData` 已就绪，无需修改

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
