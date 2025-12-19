# 验证报告：Story 2.2 - 任务依赖关系网络

Document: docs/sprint-artifacts/2-2-task-dependency-network.md  
Checklist: .bmad/bmm/workflows/4-implementation/create-story/checklist.md  
Date: 2025-12-18 12:47:28 +0800  
Status: **FAIL**（3 个关键问题，8 个增强建议）

## 总结
- Story 的目标和 AC 覆盖了：创建依赖边、循环依赖拦截、类型切换、删除、协作同步（`docs/sprint-artifacts/2-2-task-dependency-network.md` 第 13–27 行）。
- 结合 XMind 的行为模型：必须区分两类连线：
  - **层级连线（Hierarchy / 父子）**：参与思维导图/逻辑图的自动布局与树操作。
  - **关系连线（Relationship / 依赖）**：用于表达跨层级关系（FS/SS/FF/SF），一般**不参与布局**，也不应影响树结构。
- 当前仓库里“树操作/布局”代码普遍把 **所有 edge 当层级边** 处理；如果直接把“依赖边”当普通 X6 edge 加进来，会破坏导航、删除子树、以及布局计算。
- 协作同步目前只覆盖 edge 的增删；**对 edge data 的更新（依赖类型切换）不会同步到其他协作者**，无法满足 AC 的 200ms 同步要求。

## 对标 XMind：建议写进 Story 的“规则”
把下面这段作为 Story 2.2 的 Dev Notes / Constraints（否则开发者很容易踩坑）：

1) **层级边（hierarchical）= 结构边**
   - 由“新增子节点/换父（拖拽变为子主题）”产生，用户不需要通过“拉线”来创建结构。
   - 在 **思维导图/逻辑图** 模式下：布局算法只基于层级结构重排节点。
   - 在 **自由布局** 模式下：节点坐标由用户决定；层级边只负责连接，不驱动节点重排。

2) **依赖边（dependency）= 关系边**
   - 只在“依赖模式”下由用户手动连线创建。
   - 不改变 `parentId`（不改变树结构），不参与树导航/子树删除/折叠/布局。
   - 仅用于“依赖网络/甘特”等执行逻辑；支持 FS/SS/FF/SF 与可视化标签。

3) **布局切换规则**
   - 切到 **思维导图/逻辑图**：重新排版只看 `parentId`/层级边；依赖边仅更新路由，不影响节点位置。
   - 切到 **自由布局**：保留当前坐标；不做自动重排。

4) **循环检测范围**
   - 只对 **依赖边** 构建有向图做 cycle check；层级边不纳入（层级结构天然应为树/有向无环）。

## 关键问题（必须修）

### 1) 未隔离“层级边 vs 依赖边”，会直接破坏现有树操作 + 布局
**为什么是关键问题：** 目前的实现把“edge”当成“父子关系”的来源之一；一旦加入依赖边，树就会被污染，出现：
- 方向键导航会把依赖边当成“父边/子边”
- 删除子树会沿依赖边误删
- “根节点保护”会失效（根节点只要有任意 incoming edge 就会被当成非根）
- 布局算法可能把依赖边当作树分支，甚至因依赖环触发布局中的 cycle 防护

**证据**
- Story 明确要求在任务之间创建依赖边（`docs/sprint-artifacts/2-2-task-dependency-network.md` 第 13–27 行）。
- 树导航把第一条 incoming edge 当父节点：`packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts` 第 16–27 行。
- 树导航把所有 outgoing edges 当子节点：`packages/plugins/plugin-mindmap-core/src/commands/NavigationCommand.ts` 第 33–49 行。
- 子树删除把“有无 incoming edges”当根判断，并用所有 outgoing edges 递归：`packages/plugins/plugin-mindmap-core/src/commands/RemoveNodeCommand.ts` 第 13–18 行、第 51–58 行。
- “新增子节点”找孩子时也用所有 outgoing edges：`packages/plugins/plugin-mindmap-core/src/commands/AddChildCommand.ts` 第 85–92 行。
- 布局的树构建逻辑：优先 `parentId`，否则 fallback 使用 outgoing edges（会把依赖边当分支），并且有 cycle 防护：`packages/plugins/plugin-layout/src/strategies/BaseLayout.ts` 第 124–139 行、第 113–121 行。

**Story 必须补充的修正指导（写进 Tasks/Dev Notes）**
1) 明确定义并贯穿全栈的数据模型：
   - `edgeKind`: `'hierarchical' | 'dependency' | 'reference'`
   - `dependencyType`: `'FS' | 'SS' | 'FF' | 'SF'`（仅当 `edgeKind==='dependency'` 时存在）
2) 强制所有“树逻辑/布局逻辑”只认层级结构：
   - 以 `parentId` 为主；如需边作为兜底，也必须过滤 `edgeKind==='hierarchical'`。
3) 兼容性策略：历史边如果没有 `edgeKind`，默认按 `hierarchical` 处理，避免存量数据崩掉。

---

### 2) 协作同步缺口：依赖类型切换不会同步（违反 AC）
**为什么是关键问题：** AC 要求修改依赖类型后 200ms 内通过 Yjs 同步（`docs/sprint-artifacts/2-2-task-dependency-network.md` 第 20–27 行）；但现在的同步只处理 edge 的新增/删除。

**证据**
- GraphSyncManager 只监听 `edge:added` / `edge:removed`：`apps/web/features/collab/GraphSyncManager.ts` 第 180–192 行。
- `syncEdgeToYjs` 只存 `{ id, source, target, type }`：`apps/web/features/collab/GraphSyncManager.ts` 第 374–392 行。
- 虽然 Yjs observe 能收到 edge “update”，但 `applyEdgeToGraph` 只在 edge 不存在时 add，已存在时不更新：`apps/web/features/collab/GraphSyncManager.ts` 第 223–242 行、第 483–505 行。

**Story 必须补充的修正指导**
- 增加任务：
  - 监听 `edge:change:data`（或 X6 等价事件）并把变更写入 Yjs。
  - 扩展 Yjs edge payload（至少 `edgeKind` + `dependencyType`）。
  - 在 `applyEdgeToGraph` 中实现“update existing edge”（更新 data、attrs、label），确保远端能看到类型切换。

---

### 3) 数据模型/命名冲突：`type` 语义重叠，极易写错
**为什么是关键问题：** Story 同时用 `type` 表示“边的种类（hierarchical vs dependency）”和“依赖类型（FS/SS/FF/SF）”，而仓库里 `type` 已被用于其它语义（节点的 root/topic/subtopic 等）。

**证据**
- Story 既建议用 `Edge.type` 区分 hierarchical/dependency，又要存 FS/SS/FF/SF（`docs/sprint-artifacts/2-2-task-dependency-network.md` 第 86–94 行、第 31–35 行）。
- Prisma Edge 已存在 `type String @default("hierarchical")`：`packages/database/prisma/schema.prisma` 第 144–147 行。
- 共享类型里 edge 仅支持 `'hierarchical' | 'reference'`：`packages/types/src/index.ts` 第 35–41 行。
- Yjs edge payload 也仅支持 `'hierarchical' | 'reference'`：`apps/web/features/collab/GraphSyncManager.ts` 第 36–41 行。

**Story 必须补充的修正指导**
- 避免 `type` 继续膨胀：建议改为 `edgeKind`（或把 Prisma 的 `type` 当作 `kind` 使用，并在 types/Yjs 中统一命名）。
- `dependencyType` 独立字段（或 `dependency: { type, lag }`），不要塞进 `edgeKind/type`。

## 增强建议（应补充）
1) **删除依赖边的交互还没落地**：当前键盘 Delete/Backspace 只对“选中的 node”生效（`apps/web/components/graph/GraphComponent.tsx` 第 233–268 行）。Story 需要明确“edge 如何被选中 + 删除优先级规则（先删边后删节点）”。
2) **循环拦截最好前置**：Story 写在 `edge:connected` 里预检（`docs/sprint-artifacts/2-2-task-dependency-network.md` 第 48 行），建议改为使用 X6 `connecting.validateConnection` 直接阻止连接（更贴近 XMind 的“不能连上就不生成”体验）。
3) **仅允许 Task→Task 的依赖**：Story 需要明确前后端校验（source/target 都必须是 `NodeType.TASK`）。
4) **明确“依赖模式”入口/退出**：工具栏 Toggle？快捷键？光标状态？否则 dev 会各自实现导致 UX 不一致。
5) **迁移命令要贴合仓库脚本**：建议写成 `pnpm --filter @cdm/database db:migrate`（仓库已有脚本），避免 `prisma migrate dev` 直接跑错环境。
6) **补一个“树操作不被依赖边污染”的回归测试**：至少覆盖：方向键导航、删除子树、新增子节点在存在依赖边时仍正确。
7) **布局范围声明**：在 Story 中明确“依赖边不参与布局计算”，切换 mindmap/logic 时只重新排版层级结构（对标 XMind）。
8) **自由布局行为声明**：明确自由布局下不自动重排，依赖边只更新路由与端点（对标 XMind）。

## 建议
- 在 Story 里补齐“对标 XMind 的规则”和上述 3 个关键修正点之前，不应维持 `ready-for-dev`；建议先回退到 `drafted`，补完再进入开发。
