# Story 8.6: 兄弟节点顺序持久化 (Sibling Node Order Persistence)

Status: in-progress
Tech-Spec: [tech-spec-8-6-node-order-persistence.md](./tech-spec-8-6-node-order-persistence.md)
Impact Analysis: [story-8-6-impact-analysis-and-test-design.md](./story-8-6-impact-analysis-and-test-design.md)

<!-- Note: This story addresses the fundamental issue of sibling node ordering across all system components -->

## Story

As a **脑图用户**,
I want **兄弟节点的顺序能够被正确保存和还原**,
so that **我在任何场景下（新建、模板导入、大纲拖拽、画布操作）都能看到一致且可控的节点顺序。**

## Problem Statement

当前系统中兄弟节点的顺序依赖于**坐标位置（Y轴）**计算，而非独立的顺序字段。这导致以下问题：

1. **顺序不稳定**：自动布局重新计算后，节点顺序可能发生意外变化
2. **无法精准控制**：用户无法指定"插入到第二个位置"等精确操作
3. **模板顺序丢失**：模板结构中缺少 `order` 属性，导入后子节点顺序不可预测（取决于数组迭代顺序）
4. **大纲拖拽局限**：Story 8.4 的大纲重排功能已实现 `data.order` 更新，但其他组件未配合使用
5. **新建节点无序**：`AddChildCommand` 和 `AddSiblingCommand` 创建节点时未赋予 `order` 值

## 影响分析 (Impact Analysis)

### 受影响组件矩阵

| 组件 | 文件 | 当前状态 | 需要改动 | 优先级 |
|------|------|----------|----------|--------|
| Prisma Node 模型 | `packages/database/prisma/schema.prisma` | 无 `order` 字段 | 添加 `order` 字段 + 迁移 | P0 |
| 后端持久化：Yjs → Node 表同步 | `apps/api/src/modules/collab/collab.service.ts` | onStoreDocument upsert Node 不包含 `order` | 同步写入 `order`（用于 DB 查询/relational init） | P0 |
| 后端持久化：Node upsert | `apps/api/src/modules/graphs/graph.repository.ts` | `NodeUpsertBatchData`/upsert 不包含 `order` | create/update 包含 `order` | P0 |
| 后端恢复：Relational → Yjs 初始化 | `apps/api/src/modules/collab/collab.service.ts` | relational init 构造 yNode 未设置 `order` | 从 `Node.order` 读入 yNode.order | P0 |
| 类型定义（NodeData） | `packages/types/src/index.ts` | `NodeData.order?: number` 已存在 | **无需修改（禁止重复定义）** | ✅ |
| 模板类型 | `packages/types/src/template-types.ts` | TemplateNode 无 `order` | 添加 `order?: number` | P1 |
| 模板保存（子树提取） | `apps/web/lib/subtree-extractor.ts` | 子节点收集未排序且不写 `order` | 写入 `TemplateNode.order` 并按 `order` 排序 children | P1 |
| 模板实例化 | `packages/plugins/plugin-template/src/server/templates/templates.service.ts` | 生成/创建节点未写 `order` | 生成节点时设置 order，并在 `tx.node.create` 写入 | P1 |
| 添加子节点 | `packages/plugins/plugin-mindmap-core/src/commands/AddChildCommand.ts` | 不设置 `order` | `order = max(siblings.order)+1` | P0 |
| 添加兄弟节点 | `packages/plugins/plugin-mindmap-core/src/commands/AddSiblingCommand.ts` | 不设置 `order` | 插入 + 重排（`batchUpdate`） | P0 |
| 键盘导航 | `packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts` | ✅ 已按 `data.order` 排序（无 order 时 fallback X） | 同步 AC/Tech-Spec/Hotkeys 文案（垂直布局：↑ parent、↓ first child、←/→ siblings） | P1 |
| 大纲视图 | `apps/web/components/graph/hooks/useOutlineData.ts` | ✅ 已按 `data.order` 排序并 normalize | 无需修改（参考实现） | ✅ |
| 布局算法 | `packages/plugins/plugin-layout/src/utils/sortNodes.ts` | ✅ 已优先使用 `data.order` | 无需修改（仅确认） | ✅ |
| Yjs 同步（前端） | `apps/web/features/collab/GraphSyncManager.ts` | ✅ `YjsNodeData` 已包含 `order` 且不在 UI-only keys | 无需修改 | ✅ |
| 拖拽重排（画布） | — | 无顺序更新 | 本 Story out-of-scope | P3 |

### 关键发现

> [!IMPORTANT]
> `NodeData` 接口**已包含** `order?: number` 字段（`packages/types/src/index.ts:9`），**禁止**再在其它类型文件重复添加（避免“改了没生效/改错文件”）。

1. **useOutlineData.ts 已就绪** ✅：
   ```typescript
   // useOutlineData.ts:86-92 - 已按 data.order 排序
   children.sort((a, b) => {
     const orderA = a.getData()?.order ?? Infinity;
     const orderB = b.getData()?.order ?? Infinity;
     if (orderA !== orderB) return orderA - orderB;
     return a.id.localeCompare(b.id);
   });
   ```

2. **布局已经支持 order** ✅（无需改布局，只要确保写入/持久化 order 即可）：
   ```typescript
   // sortNodes.ts: 若 data.order 存在则优先按 order 排序
   const orderA = typeof dataA.order === 'number' ? dataA.order : null;
   const orderB = typeof dataB.order === 'number' ? dataB.order : null;
   if (orderA !== null || orderB !== null) { /* ... */ }
   ```

3. **NavigationCommand 已按 order 排序** ✅（垂直布局：无 order 时 fallback X；需同步 AC/Tech-Spec/Hotkeys 文案）：
   ```typescript
   // NavigationCommand.ts: getChildren()
   // 1) data.order
   // 2) fallback X (vertical layout: siblings are horizontal)
   ```

4. **AddChildCommand 已设置 order** ✅（并忽略 dependency edges；对 legacy children 缺失 order 做 normalize/append）

5. **模板保存顺序已修复** ✅（写入 TemplateNode.order + children 按 order 排序）

6. **GeneratedNode 接口已包含 order** ✅（templates.service.ts）

7. **generateNodesFromStructure 已使用 siblingIndex/order** ✅（children 按 `(order ?? originalIndex)` 稳定排序）

8. **后端 relational init / Node 表同步缺少 order**（必须补齐，否则 AC7 的“从数据库恢复”不成立）：
   - `apps/api/src/modules/collab/collab.service.ts`: relational init 构造 yNode 时未设置 `order`
   - `apps/api/src/modules/collab/collab.service.ts` + `apps/api/src/modules/graphs/graph.repository.ts`: yNodes → Node 表 upsert 未同步 `order`

---

## Scope

**In Scope:**
- ✅ Prisma Node 模型添加 `order` 字段（Int, 默认 0）
- ✅ 后端持久化/恢复补齐：Yjs → Node 表同步 `order`，以及 relational init 读取 `Node.order` 写入 yNode
- ✅ `AddChildCommand` 创建节点时自动赋值 order
- ✅ `AddSiblingCommand` 创建节点时赋值正确位置的 order，并重排后续兄弟
- ✅ `NavigationCommand` 改为按 order 排序
- ✅ 模板 `TemplateNode` 类型添加 `order` 属性
- ✅ 模板实例化时按 order 创建子节点
- ✅ 模板保存时记录子节点 order
- ✅ 大纲拖拽重排验证（已实现，需确认兼容）

**Out of Scope:**
- ❌ 画布拖拽节点后自动更新 order（Phase 2，需结合布局系统）
- ❌ 批量重排 UI（右键菜单"上移/下移"）
- ❌ 跨父节点移动时的 order 处理（涉及更复杂的场景）

---

## Acceptance Criteria (验收标准)

### AC1: 新建子节点顺序正确
**Given** 父节点已有 2 个子节点（order=0, order=1）
**When** 用户按 Tab 键添加新子节点
**Then** 新子节点的 `data.order` 应为 2
**And** 大纲视图中显示在最后位置

### AC2: 新建兄弟节点顺序正确
**Given** 父节点有 3 个子节点（A:0, B:1, C:2），当前选中 B
**When** 用户按 Enter 键添加兄弟节点
**Then** 新节点应插入到 B 之后，`data.order` 为 2
**And** C 的 order 应更新为 3
**And** 大纲视图显示顺序为 A → B → 新节点 → C

### AC3: 键盘导航按顺序执行
**Given** 父节点有 3 个子节点（order 0,1,2）但 X 坐标不按顺序排列（垂直布局：兄弟节点横向）
**When** 用户在子节点上按 ←/→ 键
**Then** 应按 order 跳转到上/下一个兄弟节点，而非按 X 坐标跳转

### AC4: 模板保存顺序
**Given** 用户选中一个有多层子节点的子树
**When** 保存为模板
**Then** 模板 structure 中每个 TemplateNode 应包含 `order` 属性
**And** order 值反映当前子节点的排列顺序

### AC5: 模板导入顺序
**Given** 模板中 rootNode 有 3 个 children（order 0,1,2）
**When** 实例化模板创建图谱
**Then** 创建的节点 `data.order` 应与模板中的 order 一致
**And** 大纲视图显示顺序与模板定义一致

### AC6: 大纲拖拽顺序同步
**Given** 大纲视图中有 A→B→C 三个兄弟节点
**When** 将 C 拖拽到 A 和 B 之间
**Then** order 应更新为 A:0, C:1, B:2
**And** 键盘导航按新顺序执行
**And** 下次打开图谱时顺序保持

### AC7: 持久化与恢复
**Given** 图谱中节点有明确的 order 值
**When** 保存并重新打开图谱
**Then** 所有节点的 order 值应被正确恢复（Primary: `Graph.yjsState`；Fallback: yjsState 为空时从 `Node.order` 初始化到 Yjs）
**And** 大纲视图、键盘导航顺序与保存前一致

---

## Technical Decisions

### TD-0: “顺序持久化”的数据契约（Source of Truth）
- **源数据**：`node.data.order`（进入 Yjs `nodes` Map，随 `Graph.yjsState` 持久化）
- **派生存储**：`Node.order`（relational DB，用于 yjsState 为空时的初始化兜底 + 可能的查询/统计需求）
- **结论**：本 Story 必须同时打通：
  1) 前端/命令/模板：写入 `node.data.order`  
  2) 后端：Yjs → Node 表同步 `order` + relational init 读取 `Node.order`

### TD-1: Prisma order 字段类型
使用 `Int @default(0)` 整数类型，与 `TemplateCategory.sortOrder` 一致。默认值 0，新节点需手动赋值。

### TD-2: 向后兼容策略
用户选择"**删除所有数据**"策略：无需做“数据迁移/回填脚本”，但仍需要 schema migration。代码中保留 fallback：`order ?? Infinity`（兼容历史 yjsState/模板缺失 order 的情况）。

### TD-3: 兄弟重排算法
新建兄弟节点时，插入位置 = `selectedNode.order + 1`，后续兄弟节点 order 递增（+1），使用 `graph.batchUpdate()` 保证原子性。

### TD-4: 模板兼容性
`TemplateNode.order` 可选，未指定时使用数组索引。种子数据显式添加 order 属性。

---

## Tasks / Subtasks

### Phase 1: 数据模型与类型 (AC: #7)

- [x] Task 1.1: Prisma Node 模型添加 order 字段
  - [x] 1.1.1 修改 `packages/database/prisma/schema.prisma`
  - [x] 1.1.2 在 Node 模型添加：`order Int @default(0)`
  - [x] 1.1.3 运行 `pnpm --filter @cdm/database db:migrate` 创建迁移
  - [x] 1.1.4 更新种子数据（如有）

- [x] Task 1.2: TypeScript 类型更新（模板类型）
  - [x] 1.2.1 确认 `NodeData.order` 已存在（`packages/types/src/index.ts`），**不修改 `node-types.ts`**
  - [x] 1.2.2 修改 `packages/types/src/template-types.ts`：在 `TemplateNode` 添加 `order?: number`

- [x] Task 1.3: 后端 order 同步/恢复打通（AC7）
  - [x] 1.3.1 修改 `apps/api/src/modules/graphs/graph.repository.ts`：`NodeUpsertBatchData` 增加 `order: number`
  - [x] 1.3.2 修改 `apps/api/src/modules/graphs/graph.repository.ts`：`prisma.node.upsert` 的 create/update 写入 `order`
  - [x] 1.3.3 修改 `apps/api/src/modules/collab/collab.service.ts`：onStoreDocument 从 yNode 读取 `order` 并写入 NodeUpsertBatchData
  - [x] 1.3.4 修改 `apps/api/src/modules/collab/collab.service.ts`：relational init（从 Node 表初始化 Yjs）时把 `node.order` 写入 yNode.order

### Phase 2: 节点创建命令 (AC: #1, #2)

- [x] Task 2.1: 修改 AddChildCommand
  - [x] 2.1.1 修改 `packages/plugins/plugin-mindmap-core/src/commands/AddChildCommand.ts`
  - [x] 2.1.2 仅基于**层级边**计算子节点集合（忽略 dependency edges；复用 `getHierarchicalChildren` / edgeFilters）
  - [x] 2.1.3 添加 `calculateChildOrder(graph, parentNode): number` 方法
  - [x] 2.1.4 创建节点时设置 `order: calculateChildOrder() + 1`

- [x] Task 2.2: 修改 AddSiblingCommand
  - [x] 2.2.1 修改 `packages/plugins/plugin-mindmap-core/src/commands/AddSiblingCommand.ts`
  - [x] 2.2.2 仅基于**层级边**定位 parent 和 siblings（忽略 dependency edges；复用 `getHierarchicalParent/getHierarchicalChildren`）
  - [x] 2.2.3 若 `selectedNode.data.order` 缺失：先按当前稳定顺序（`order ?? Infinity` + id）对 siblings 做 normalize（0..n-1）
  - [x] 2.2.4 计算插入位置的 order 值（`selectedOrder + 1`），并把 `order >= insertOrder` 的后续兄弟整体 +1
  - [x] 2.2.5 使用 `graph.batchUpdate()` 确保原子性

### Phase 3: 键盘导航 (AC: #3)

- [x] Task 3.1: 修改 NavigationCommand
  - [x] 3.1.1 修改 `packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts`
  - [x] 3.1.2 `getChildren()` 方法改为按 `data.order` 排序
  - [x] 3.1.3 无 order 时使用 X 坐标作为 fallback（垂直布局：兄弟横向；最后按 id 稳定）

### Phase 4: 模板系统 (AC: #4, #5)

- [x] Task 4.1: 模板保存时记录 order
  - [x] 4.1.1 修改 `apps/web/lib/subtree-extractor.ts`：构建 `TemplateNode` 时写入 `order`（来源：`node.getData()?.order`）
  - [x] 4.1.2 修改 `apps/web/lib/subtree-extractor.ts`：对子节点集合按 `order ?? Infinity` 排序（fallback id），再递归构建 children
  - [x] 4.1.3 更新 `apps/web/lib/__tests__/subtree-extractor.spec.ts`：验证 order 写入 + children 顺序稳定

- [x] Task 4.2: 模板实例化时应用 order
  - [x] 4.2.1 修改 `packages/plugins/plugin-template/src/server/templates/templates.service.ts`
  - [x] 4.2.2 `GeneratedNode` 增加 `order: number`，生成时使用 `templateNode.order ?? siblingIndex`
  - [x] 4.2.3 递归 children 前，按 `(child.order ?? originalIndex)` 排序，确保实例化顺序与模板一致
  - [x] 4.2.4 `tx.node.create` 写入 `order: node.order`
  - [x] 4.2.5 更新测试以验证实例化后 Node.order 与模板一致

### Phase 5: 验证与测试 (All ACs)

- [x] Task 5.1: 单元测试
  - [x] 5.1.1 更新 `packages/plugins/plugin-mindmap-core/src/commands/commands.test.ts`：验证 AddChild/AddSibling 的 order 赋值/插入/重排（FakeGraph 添加 batchUpdate）
  - [x] 5.1.2 更新 `packages/plugins/plugin-mindmap-core/src/commands/__tests__/NavigationCommand.test.ts`：添加 getData mock 支持 order 排序
  - [x] 5.1.3 运行 subtree-extractor 测试确认兼容性
  - [x] 5.1.4 运行 templates.service 测试确认兼容性

- [x] Task 5.2: 集成测试 (covered by E2E tests)

- [x] Task 5.3: E2E 测试 (`apps/web/e2e/node-order.spec.ts` - 5 tests passed)

### Review Follow-ups (AI)

- [x] [AI-Review][MEDIUM] 补全 Dev Agent Record 的 File List/Change Log（与 git reality 对齐，确保可审计） [docs/sprint-artifacts/story-8-6-node-order-persistence.md:448]
- [x] [AI-Review][HIGH] 垂直布局键位统一：同步 AC3/Tech-Spec/注释，并修正 useGraphHotkeys 的函数命名（↑ parent、↓ first child、←/→ siblings） [apps/web/components/graph/hooks/useGraphHotkeys.ts:313]
- [x] [AI-Review][HIGH] AddChildCommand：position 计算需忽略 dependency edges；并对 legacy children 缺失 order 做 normalize/append 规则，避免新节点 order=0 反插到最前 [packages/plugins/plugin-mindmap-core/src/commands/AddChildCommand.ts:114]
- [x] [AI-Review][HIGH] AddSiblingCommand：child-position / nodeType 继承需忽略 dependency edges；并把 normalize+shift 全部纳入 graph.batchUpdate() 保证原子性 [packages/plugins/plugin-mindmap-core/src/commands/AddSiblingCommand.ts:112]
- [x] [AI-Review][MEDIUM] NavigationCommand：确认无 order 的 fallback 维度与“垂直布局”一致（当前为 X）；同步 Story/Tech-Spec，避免 Task 3.1.3 文案误导 [packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts:58]
- [x] [AI-Review][HIGH] 单测：`commands.test.ts` 增加 AddChild/AddSibling 的 order 赋值/插入/重排断言（当前任务声称完成但无 order 覆盖） [packages/plugins/plugin-mindmap-core/src/commands/commands.test.ts:143]
- [x] [AI-Review][HIGH] 单测：`NavigationCommand.test.ts` 增加 “order 优先于坐标” 用例（实际传入 order 并断言排序），当前仅测坐标 fallback [packages/plugins/plugin-mindmap-core/src/commands/__tests__/NavigationCommand.test.ts:84]
- [x] [AI-Review][HIGH] 单测：`subtree-extractor.spec.ts` 增加 TemplateNode.order 写入与 children 按 order 排序/稳定性的断言 [apps/web/lib/__tests__/subtree-extractor.spec.ts:59]
- [x] [AI-Review][MEDIUM] 单测：`templates.service.spec.ts` 增加 instantiate 后 Node.order 与模板 order 一致的断言，并覆盖 children sort 稳定性 [packages/plugins/plugin-template/src/server/templates/__tests__/templates.service.spec.ts:219]
- [x] [AI-Review][HIGH] E2E：`node-order.spec.ts` 增加真实断言（读取 graph data.order 与当前选中节点），并补齐/修正 AC6（outline drag）覆盖声明 [apps/web/e2e/node-order.spec.ts:25]
- [x] [AI-Review][LOW] 数据策略：明确是否强制“删数据重置”；如需兼容历史图谱，补充 backfill/normalize order 的方案 [docs/sprint-artifacts/tech-spec-8-6-node-order-persistence.md:26]

---

## Dev Notes

### 🛡️ 工程规范护栏 (Engineering Guardrails)

#### GR-1: 向后兼容
**规则**: 现有图谱中的节点可能没有 `order` 值，必须优雅降级。

```typescript
// ✅ 正确：使用 Infinity 作为默认值，保持 id 稳定排序
const orderA = a.getData()?.order ?? Infinity;

// ❌ 禁止：假设 order 必然存在
const orderA = a.getData().order; // 可能 undefined
```

#### GR-2: 原子性更新
**规则**: 兄弟 order 重排必须在 `batchUpdate()` 中执行，避免中间状态。

```typescript
// ✅ 正确
graph.batchUpdate(() => {
  siblings.forEach((s, i) => s.setData({ ...s.getData(), order: i }));
});

// ❌ 禁止：逐个更新可能触发多次重绘
siblings.forEach((s, i) => s.setData({ ...s.getData(), order: i }));
```

#### GR-3: Yjs 数据流
**规则**: order 必须写入 `node.data`（进入 Yjs 的 `nodes` Map，随 `Graph.yjsState` 持久化）；`Node.order` 仅作为派生存储由后端同步维护，前端/插件**不允许**绕过 Yjs 直接写数据库。

### 📁 项目结构落点

| 文件 | 类型 | 描述 |
|------|------|------|
| `packages/database/prisma/schema.prisma` | [MODIFY] | Node 添加 order 字段 |
| `apps/api/src/modules/collab/collab.service.ts` | [MODIFY] | Yjs → Node 表同步 order + relational init 读取 Node.order |
| `apps/api/src/modules/graphs/graph.repository.ts` | [MODIFY] | Node upsert create/update 写入 order |
| `packages/types/src/template-types.ts` | [MODIFY] | TemplateNode 添加 order |
| `apps/web/lib/subtree-extractor.ts` | [MODIFY] | 保存模板时写入 order + children 按 order 排序 |
| `packages/plugins/plugin-mindmap-core/src/commands/AddChildCommand.ts` | [MODIFY] | 新建子节点赋 order |
| `packages/plugins/plugin-mindmap-core/src/commands/AddSiblingCommand.ts` | [MODIFY] | 新建兄弟节点插入+重排 order |
| `packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts` | [MODIFY] | 改为按 order 排序（fallback X） |
| `packages/plugins/plugin-template/src/server/templates/templates.service.ts` | [MODIFY] | 实例化模板写入 Node.order |
| `packages/database/prisma/seed.ts` | [MODIFY] | 种子模板补齐 order（推荐） |
| `packages/plugins/plugin-mindmap-core/src/commands/commands.test.ts` | [MODIFY] | AddChild/AddSibling order tests |
| `packages/plugins/plugin-mindmap-core/src/commands/__tests__/NavigationCommand.test.ts` | [MODIFY] | Navigation order tests |
| `apps/web/lib/__tests__/subtree-extractor.spec.ts` | [MODIFY] | Subtree extractor order tests |
| `packages/plugins/plugin-template/src/server/templates/__tests__/templates.service.spec.ts` | [MODIFY] | Template instantiation order tests |
| `apps/web/e2e/node-order.spec.ts` | [NEW] | E2E 测试 |

### 依赖

| 依赖 | 用途 |
|------|------|
| Story 5.1/5.2 | 模板系统基础 |
| Story 8.4 | 大纲视图（已实现 order 支持） |
| `@antv/x6` | graph.batchUpdate() |
| Yjs | node.data 同步 |
| Hocuspocus / CollabService | yjsState 持久化 + relational init fallback |

### 🔗 References

- [Source: apps/web/components/graph/hooks/useOutlineData.ts] order 排序 + normalizeOrder 参考实现
- [Source: apps/web/lib/subtree-extractor.ts] 子树模板保存（需要写入 order + 排序）
- [Source: packages/plugins/plugin-layout/src/utils/sortNodes.ts] 布局已优先使用 data.order
- [Source: packages/plugins/plugin-mindmap-core/src/utils/edgeFilters.ts] getHierarchicalParent/getHierarchicalChildren（忽略 dependency edges）
- [Source: packages/plugins/plugin-mindmap-core/src/commands/AddChildCommand.ts] 新建子节点（需写 order）
- [Source: packages/plugins/plugin-mindmap-core/src/commands/AddSiblingCommand.ts] 新建兄弟节点（需插入/重排 order）
- [Source: packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts] 导航排序（已从 Y 改为 order；fallback X）
- [Source: packages/plugins/plugin-template/src/server/templates/templates.service.ts] 模板实例化（需写入 Node.order）
- [Source: apps/api/src/modules/collab/collab.service.ts] relational init + onStoreDocument 同步 Node 表（需包含 order）
- [Source: apps/api/src/modules/graphs/graph.repository.ts] Node upsert（需包含 order）

### 前序 Story 完成情况

| Story | 状态 | 关联 |
|-------|------|------|
| 5.1 模板库 | done | 模板实例化 |
| 5.2 子树模板保存 | done | 模板保存 |
| 8.4 大纲视图 | done | **已实现 order 支持** |

---

## 🧪 测试策略 (Testing Strategy)

### 单元测试 (Vitest)

**文件与覆盖：**
- `packages/plugins/plugin-mindmap-core/src/commands/commands.test.ts`：AC1、AC2
- `packages/plugins/plugin-mindmap-core/src/commands/__tests__/NavigationCommand.test.ts`：AC3
- `apps/web/lib/__tests__/subtree-extractor.spec.ts`：AC4
- `packages/plugins/plugin-template/src/server/templates/__tests__/templates.service.spec.ts`：AC5

### E2E 测试 (Playwright)

**文件**: `apps/web/e2e/node-order.spec.ts`

**要点断言：**
- 使用 `gotoTestGraph(page, testInfo)` 创建图（参考 `apps/web/e2e/outline-view.spec.ts`）
- AC1/AC2：通过 Tab/Enter 创建节点后，用 `window.__CDM_E2E__.getNodeOrderByLabel(label)` 断言 `data.order` 与插入/重排一致
- AC3：构造 order 与 X 反序的兄弟节点，按 `ArrowLeft/ArrowRight` 应按 order 跳转
- AC6/AC7：在 Outline 中拖拽重排后，reload 页面顺序保持（必要时读取 outline 列表顺序 + graph data.order 双重断言）

### 测试运行命令

```bash
# 单元测试
pnpm --filter @cdm/plugin-mindmap-core test
pnpm --filter @cdm/plugin-template test
pnpm --filter @cdm/web test

# 全量（可选）
pnpm test

# E2E 测试
pnpm --filter @cdm/web test:e2e
```

---

## ⚠️ 注意事项 (Notes)

1. **数据策略**: 建议兼容历史图谱（缺失 order 时在关键路径做 normalize/append；必要时提供 backfill 方案）。若业务决定强制“删数据重置”，需在发布说明中明确。
2. **性能优化**: 大规模节点重排时考虑增量更新而非全量重排
3. **Phase 2 扩展**: 画布拖拽节点后自动更新 order 排除在本次范围外
4. **已就绪组件**: `useOutlineData` 已实现 order 支持，无需修改
5. **AC7 特别说明**: “从数据库恢复”包含 yjsState 主路径 + relational init fallback；必须同步更新 `CollabService`/`GraphRepository` 的 order 映射，否则会出现“首次打开顺序丢失”

### 手动验证步骤

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 创建多个子节点 | 大纲视图顺序与创建顺序一致 |
| 2 | 在中间节点按 Enter | 新节点插入在正确位置 |
| 3 | 按 ←/→ 键导航（兄弟） | 按 order 跳转而非 X 坐标 |
| 4 | 导入模板 | 大纲视图顺序与模板定义一致 |
| 5 | （可选）清空 graph.yjsState 后首次打开 | 仍按 Node.order 初始化顺序 |

---

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

### Completion Notes List

### File List

**Modified**
- `apps/api/src/modules/collab/collab.service.ts`
- `apps/api/src/modules/graphs/graph.repository.ts`
- `apps/web/__tests__/GraphComponent.test.tsx`
- `apps/web/app/graph/[graphId]/page.tsx`
- `apps/web/components/graph/GraphComponent.tsx`
- `apps/web/components/graph/hooks/useGraphHotkeys.ts`
- `apps/web/e2e/arrow_key_navigation.spec.ts`
- `apps/web/e2e/dependency-mode.spec.ts`
- `apps/web/e2e/testUtils.ts`
- `apps/web/lib/__tests__/subtree-extractor.spec.ts`
- `apps/web/lib/subtree-extractor.ts`
- `packages/database/prisma/schema.prisma`
- `packages/plugins/plugin-mindmap-core/src/commands/AddChildCommand.ts`
- `packages/plugins/plugin-mindmap-core/src/commands/AddSiblingCommand.ts`
- `packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts`
- `packages/plugins/plugin-mindmap-core/src/commands/__tests__/NavigationCommand.test.ts`
- `packages/plugins/plugin-mindmap-core/src/commands/commands.test.ts`
- `packages/plugins/plugin-template/src/server/templates/__tests__/templates.service.spec.ts`
- `packages/plugins/plugin-template/src/server/templates/templates.service.ts`
- `packages/types/src/template-types.ts`

**Added**
- `apps/web/e2e/node-order.spec.ts`
- `docs/sprint-artifacts/story-8-6-impact-analysis-and-test-design.md`
- `docs/sprint-artifacts/story-8-6-node-order-persistence.md`
- `docs/sprint-artifacts/tech-spec-8-6-node-order-persistence.md`
- `packages/database/prisma/migrations/20260108064531_add_node_order/`

### Change Log

- Fixed vertical-layout keyboard navigation naming/doc alignment (`useGraphHotkeys`) and clarified AC3 wording (←/→ for siblings, ↑ parent, ↓ first child).
- AddChild/AddSibling commands now ignore dependency edges for structural ops; AddChild normalizes legacy unordered children before appending; AddSibling normalizes + shifts orders atomically via `graph.batchUpdate()`.
- Templates instantiation now sorts children stably by `(order ?? originalIndex)` and persists `Node.order`; subtree template extractor tests now assert TemplateNode.order and child sorting stability.
- E2E `node-order.spec.ts` now asserts `data.order` and current selection via `window.__CDM_E2E__`, and covers AC6 outline drag reorder.

### Tests Run

- `pnpm --filter @cdm/plugin-mindmap-core test`
- `pnpm --filter @cdm/plugin-template test`
- `pnpm --filter @cdm/web test`
- `pnpm --filter @cdm/web test:e2e -- node-order.spec.ts`
