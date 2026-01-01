# Story 7.8: RightSidebar 组件拆分（按职责拆分，保持 UI 边界）

Status: done

## Story

As a **前端开发者**,
I want **将 `RightSidebar` 的“数据获取/补全、Graph/Yjs 同步、持久化 handlers”按职责拆分为独立模块（hooks/utils），并保持 UI 仍由 `PropertyPanel` 负责**,
so that **`RightSidebar.tsx` 主文件 <300 行、行为契约清晰、降低回归风险。**

## Acceptance Criteria

1. **Given** `apps/web/components/layout/RightSidebar.tsx` 当前有 693 行
   **When** 执行拆分后
   **Then** 主文件行数应降低至 300 行以内（新增模块可独立存在）

2. **Given** `RightSidebar` 目前承担节点数据获取/补全、Graph/X6 写回与 Yjs 同步、后端持久化等逻辑
   **When** 重构完成后
   **Then** 这些职责必须被拆到独立文件（hooks/utils），且 `RightSidebar.tsx` 仅做“编排 + 渲染 `PropertyPanel`”，并显式保持关键语义：
   - `ensureNodeExists` / 回填规则（避免空 props 覆盖本地 props）
   - props 持久化 debounce（保持 `PROPS_UPDATE_DEBOUNCE_MS`）
   - 审批/交付物同步必须保持 `x6Node.setData(..., { overwrite: true })` 语义

3. **Given** 页面通过 `<RightSidebar ... />` 使用该组件，且已存在单元测试覆盖关键行为
   **When** 重构完成后
   **Then** `RightSidebarProps` 与 `apps/web/components/layout/index.ts` 的导出保持兼容，且以下测试必须保持通过：
   - `apps/web/__tests__/components/RightSidebarEnsureNodeExistsBackfill.test.tsx`
   - `apps/web/__tests__/components/RightSidebarApprovalUpdate.test.tsx`

4. **Given** 该 Story 为重构
   **When** 验收
   **Then** 不引入新的 UI/交互变化（默认“无视觉变化”）：
   - `RightSidebar` 仍渲染 `PropertyPanel`（不新增 Tab/面板切换器 UI）
   - `CommentPanel` 仍由 `apps/web/app/graph/[graphId]/page.tsx` 独立控制渲染（不迁入 RightSidebar）
   - 手动回归：节点切换、类型切换、属性编辑、标签编辑、归档/恢复、审批交付物刷新均正常

## Tasks / Subtasks

- [x] Task 1: 明确当前职责与行为契约（基线） (AC: #2, #3)
  - [x] 1.1 记录 `RightSidebar` 当前关键逻辑点：`ensureNodeExists` 回填规则、debounce 持久化、approval overwrite 同步
  - [x] 1.2 记录外部依赖/边界：`PropertyPanel`、`GraphPage` 的 `<RightSidebar />` 使用方式、`layout/index.ts` 导出
  - [x] 1.3 以现有单测作为重构护栏（至少确保上述 2 个 RightSidebar tests 可稳定通过）

- [x] Task 2: 抽离"节点数据获取 + ensureNodeExists/backfill"模块 (AC: #1, #2, #3)
  - [x] 2.1 新建 `apps/web/hooks/right-sidebar/useRightSidebarNodeData.ts`（该路径为本 Story 的 canonical location）
  - [x] 2.2 迁移并保持 `fetchNode → ensureNodeExists → nodeData state` 行为不变（尤其是"API props 为空时优先使用本地 props，并在必要时回填后端"）
  - [x] 2.3 保持时间戳补全/creator 写回逻辑不变

- [x] Task 3: 抽离"写回 Graph/Yjs + 持久化 handlers"模块 (AC: #1, #2, #3)
  - [x] 3.1 新建 `apps/web/hooks/right-sidebar/useRightSidebarActions.ts`
  - [x] 3.2 迁移并保持 `onTypeChange/onPropsUpdate/onTagsUpdate/onArchiveToggle/onApprovalUpdate` 语义不变
  - [x] 3.3 保持 props 持久化 debounce 行为与 `PROPS_UPDATE_DEBOUNCE_MS` 一致
  - [x] 3.4 审批/交付物同步必须保留 `x6Node.setData(..., { overwrite: true })`
  - [x] 3.5 `RightSidebar.tsx` 只保留：props/state wiring + `<PropertyPanel ... />` 渲染

- [x] Task 4: 项目结构与导出整理 (AC: #3, #4)
  - [x] 4.1 不移动 `apps/web/components/layout/RightSidebar.tsx` 的对外路径（保持 `@/components/layout/RightSidebar` 可用）
  - [x] 4.2 不新增对外导出；确保不破坏 `apps/web/components/layout/index.ts` 的现有导出
  - [x] 4.3 明确并保持"评论不在 RightSidebar 内"这一边界

- [x] Task 5: 验证与回归 (AC: #3, #4)
  - [x] 5.1 运行 Web 单测并确保通过：`pnpm --filter @cdm/web test`
  - [x] 5.2 关键手动回归：选择节点→属性面板更新；修改 props 后不会产生过量 API 调用；审批交付物更新可同步到 X6/Yjs

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] 修复 `ensureNodeExists` 递归确保 parent 时污染当前选中节点的 `nodeData`（避免错显/竞态） [apps/web/hooks/right-sidebar/ensureNodeExists.ts:86]
- [x] [AI-Review][HIGH] 补齐 graph 不可用时的 yDoc fallback（tags/archive/approval），避免协作状态分叉 [apps/web/hooks/right-sidebar/useRightSidebarActions.ts:188]
- [x] [AI-Review][HIGH] 拆分超过 300 行的 hook 文件（尤其 `useRightSidebarNodeData.ts`），满足项目规则 [docs/project-context.md:92]
- [x] [AI-Review][MEDIUM] Story 的 Dev Agent Record → File List 补齐：新增测试与测试计划（Debounce/Timestamps/YDocFallback/test-plan） [docs/sprint-artifacts/story-7-8-right-sidebar-refactor.md:169]
- [x] [AI-Review][MEDIUM] Debounce 测试改用 fake timers，移除真实 `delay()`；清理未使用 import [apps/web/__tests__/components/RightSidebarDebounce.test.tsx:103]
- [x] [AI-Review][MEDIUM] 修正 ApprovalUpdate 测试：去掉与实现不符的 mock（第二次 fetch），并补齐 `updateNodeProps` mock 以避免错误日志 [apps/web/__tests__/components/RightSidebarApprovalUpdate.test.tsx:80]
- [x] [AI-Review][MEDIUM] 移除 `ensureNodeExists` 的 `JSON.stringify` 深比较（性能/顺序风险），改为更稳健策略 [apps/web/hooks/right-sidebar/ensureNodeExists.ts:25]
- [x] [AI-Review][MEDIUM] `syncToGraph` 避免写入 `props: undefined` 导致潜在 wipe（仅在显式传入时覆盖） [apps/web/hooks/right-sidebar/useRightSidebarActions.ts:74]
- [x] [AI-Review][LOW] 清理生产代码顶部 `[AI-Review]` 注释噪音 [apps/web/components/layout/RightSidebar.tsx:1]
- [x] [AI-Review][LOW] 缩小 `apps/web/hooks/right-sidebar/index.ts` export 面（不要 re-export 内部 helper） [apps/web/hooks/right-sidebar/index.ts:1]
- [x] [AI-Review][HIGH] 修复 `updateNodeProps` sanitize：空字符串不应强制转 `null`（会触发后端 Zod 校验 400，如 REQUIREMENT.acceptanceCriteria） [apps/web/lib/api/nodes.ts:4]

## Dev Notes

### 当前文件位置
- `apps/web/components/layout/RightSidebar.tsx`

### Epic 7 背景与协作（避免并行冲突）
- **Epic 7 目标**：对齐架构设计、偿还技术债、降低巨型文件维护成本并提升可测试性（参考 `docs/epics.md`）。
- **Epic 7 Stories（全量，用于协作避让）**：
  - 7.1 Repository 模式重构（Backend）
  - 7.2 Hook-First 提取（Frontend）
  - 7.3 UI 原子组件库搭建（packages/ui）
  - 7.4 核心巨型文件拆分（GraphComponent/MindNode/useClipboard）
  - 7.5 业务模块插件化迁移（API → plugins）
  - 7.6 数据流一致性修复（移除双写，Yjs-First）
  - 7.7 ProductSearchDialog 拆分（UI refactor）
  - 7.8 RightSidebar 拆分（本 Story）
  - 7.9 ApprovalStatusPanel 拆分（UI refactor）
- **并行 Story 避让（硬规则）**：本 Story 应尽量把改动局限在 `RightSidebar` 与新 hooks 文件中；**禁止**同时深改 `PropertyPanel` 内部（尤其 `ApprovalStatusPanel.tsx`），以降低合并冲突与回归风险。若并行推进 Story 7.9，请先协调文件改动边界与合并顺序。

### 现实边界（必须保持）
- `RightSidebar`：负责节点数据获取/回填 + X6/Yjs 同步 + 调用 `PropertyPanel`
- `PropertyPanel`：负责右侧 UI（含类型表单、标签、归档、ApprovalStatusPanel 等）
- `CommentPanel`：当前由 `apps/web/app/graph/[graphId]/page.tsx` 独立渲染（不属于 RightSidebar）

### Tech Stack（本 Story 相关，含版本）
- Web：Next.js `16.0.7` + React `19.1.0` + TypeScript `^5.7.0`
- Graph/Sync：`@antv/x6 ^3.1.2` + `yjs ^13.6.27` + `@hocuspocus/provider ^3.4.3`
- Testing：Vitest `^3.2.0` + Testing Library React `^16.3.0`；E2E：Playwright `^1.49.0`

### 拆分建议（以职责为单位，不新增 UI 面板）
| 新文件 | 职责 | 预估行数 |
|--------|------|----------|
| `apps/web/hooks/right-sidebar/useRightSidebarNodeData.ts` | 读取/ensureNodeExists/backfill/时间戳补全 | ~150 |
| `apps/web/hooks/right-sidebar/useRightSidebarActions.ts` | syncToGraph + debounce 持久化 + handlers（含 overwrite） | ~150 |
| `apps/web/components/layout/RightSidebar.tsx` | 容器（编排 + 渲染 PropertyPanel） | ~200 |

### Known Pitfalls（评审纠错要点，必须避免）
- **不要重构 UI 边界**：不新增 Tab/切换器 UI；`RightSidebar` 仍只渲染 `PropertyPanel`；不要把 `CommentPanel` 迁入 RightSidebar。
- **不要破坏 backfill 规则**：当 API `props` 为空时必须优先保留本地 props，必要时再回填后端（对应测试：`RightSidebarEnsureNodeExistsBackfill`）。
- **不要破坏 debounce**：必须保留 `PROPS_UPDATE_DEBOUNCE_MS` 的去抖持久化策略，避免属性编辑导致高频 API 调用。
- **不要破坏 approval overwrite**：审批/交付物同步必须继续使用 `x6Node.setData(..., { overwrite: true })`（对应测试：`RightSidebarApprovalUpdate`）。
- **不要破坏对外 API**：保持 `RightSidebarProps` 与 `apps/web/components/layout/index.ts` 导出兼容；`GraphPage` 的 `<RightSidebar ... />` 调用不应改动。

### Debugging / Validation Tips
- **验证 debounce**：快速连续编辑同一字段时，网络请求不应按每次输入触发；应只在去抖窗口后触发持久化（以 `PROPS_UPDATE_DEBOUNCE_MS` 为准）。
- **验证 backfill**：跑 `RightSidebarEnsureNodeExistsBackfill`，确保“API 空 props 不会 wipe 本地 props”，且会触发一次后端回填。
- **验证 overwrite**：跑 `RightSidebarApprovalUpdate`，确保 deliverables 清空/更新能通过 overwrite 同步到 X6/Yjs（避免残留旧数组）。

### Non-Goals
- 不新增 `SidebarPanelSwitcher` / Tab UI（本 Story 默认“无视觉变化”）
- **禁止**修改 `PropertyPanel` 内部 UI；如发现必须修改才能完成拆分，则视为超出本 Story 范围：停止推进并另起 follow-up story
- 不将 `CommentPanel` 移入 RightSidebar
- 不引入新依赖

### References
- [Source: docs/epics.md#Epic 7 / Story 7.8]
- [Source: docs/sprint-artifacts/story-7-7-product-search-dialog-refactor.md] - Epic 7 并行 UI 拆分参考（用于避让冲突）
- [Source: docs/project-context.md#文件大小限制] - 超过 300 行必须拆分或附带重构计划
- [Source: docs/architecture.md#Testability & Quality] - 测试与质量要求（co-location / smoke test / snapshots）
- [Source: docs/analysis/refactoring-proposal-2025-12-28.md#4.实施准则] - “测试先行：重构前覆盖率 > 80%”
- [Source: docs/sprint-artifacts/2-1-task-conversion-properties.md#Debounce property persistence] - RightSidebar debounce 与 Yjs 同步相关历史
- [Source: apps/web/components/layout/RightSidebar.tsx] - 当前实现与关键行为
- [Source: apps/web/components/PropertyPanel/index.tsx] - UI 边界（属性面板与审批面板）
- [Source: apps/web/app/graph/[graphId]/page.tsx] - CommentPanel 独立渲染边界
- [Source: apps/web/__tests__/components/RightSidebarEnsureNodeExistsBackfill.test.tsx] - 回填/避免 wipe 的契约测试
- [Source: apps/web/__tests__/components/RightSidebarApprovalUpdate.test.tsx] - overwrite 同步契约测试

## Senior Developer Review (AI)

- **审查时间**: 2026-01-01
- **结论**: Approve（已修复全部问题，含 LOW）
- **要点（发现 → 处置）**:
  - HIGH: `ensureNodeExists` 在递归确保 parent 时可能覆盖当前选中节点 `nodeData` → 引入 `isSelectedNodeId` guard + 回归测试
  - HIGH: graph 未就绪时 tags/archive/approval 没有写入 yDoc → 增加 yDoc fallback（`yDocSync.ts`）+ 覆盖测试
  - HIGH: 单文件超过 300 行违反项目规则 → 拆分 hooks/utils 并保持对外 API 不变
  - MEDIUM: Story File List / 测试计划缺失新增内容 → 文档补齐并同步
  - MEDIUM: Debounce/ApprovalUpdate 测试稳定性与 mock 对齐 → 用 fake timers、清理不一致 mock
  - HIGH: `updateNodeProps` 将空字符串 props 强转 `null`，导致后端校验 400 → 改为 drop 空字符串（视作 unset）+ 单测保护
  - LOW: 清理噪音注释、收紧 barrel exports
- **验证**:
  - `pnpm --filter @cdm/web lint`（0 errors）
  - `pnpm --filter @cdm/web test -- --run`（305 tests）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - 重构无需调试日志

### Completion Notes List

1. **RightSidebar.tsx 变薄**: 从 693 行降至 97 行（目标 <300 行）
2. **职责拆分完成（并满足 >300 行限制）**:
   - `useRightSidebarNodeData.ts` (269 行): 节点数据获取/订阅 + ensureNodeExists 编排
   - `ensureNodeExists.ts` / `nodeDataUtils.ts`: backfill/parent ensure/创建 payload/时间戳补全
   - `useRightSidebarActions.ts` (288 行) + `yDocSync.ts`: syncToGraph + debounce 持久化 + handlers + graph 不可用时 yDoc fallback
3. **关键契约保持并加固**:
   - C1 (backfill): API 空 props 不 wipe 本地；新增“parent 递归不污染选中节点”回归用例
   - C2 (debounce): `PROPS_UPDATE_DEBOUNCE_MS` 去抖持久化保持（fake timers 覆盖）
   - C3 (overwrite): 审批/交付物继续 `overwrite: true`；补齐 graph 不可用时的 yDoc 同步
   - C4 (timestamps): `ensureNodeTimestamps` 时间戳与 creator 补全保持
4. **测试验证**: `pnpm --filter @cdm/web test -- --run`（305 tests）通过；`pnpm --filter @cdm/web lint` 0 errors
5. **无 UI 变化**: RightSidebar 仍只渲染 PropertyPanel，CommentPanel 边界保持

### File List

**新增文件:**
- `apps/web/hooks/right-sidebar/index.ts`
- `apps/web/hooks/right-sidebar/useRightSidebarNodeData.ts`
- `apps/web/hooks/right-sidebar/useRightSidebarActions.ts`
- `apps/web/hooks/right-sidebar/ensureNodeExists.ts`
- `apps/web/hooks/right-sidebar/nodeDataUtils.ts`
- `apps/web/hooks/right-sidebar/yDocSync.ts`
- `apps/web/__tests__/components/RightSidebarDebounce.test.tsx`
- `apps/web/__tests__/components/RightSidebarTimestamps.test.tsx`
- `apps/web/__tests__/components/RightSidebarYDocFallback.test.tsx`
- `apps/web/lib/api/__tests__/nodes.test.ts`
- `docs/sprint-artifacts/story-7-8-test-plan.md`

**修改文件:**
- `apps/web/components/layout/RightSidebar.tsx` (693 行 → 97 行)
- `apps/web/__tests__/components/RightSidebarEnsureNodeExistsBackfill.test.tsx`
- `apps/web/__tests__/components/RightSidebarApprovalUpdate.test.tsx`
- `apps/web/lib/api/nodes.ts`

### Change Log

- 2026-01-01: Story 7.8 实施完成 - RightSidebar 组件按职责拆分重构
- 2026-01-01: Code Review 修复完成 - 竞态保护、补齐 yDoc fallback、拆分 hooks/utils、补充测试与文档同步
- 2026-01-01: Bugfix - `updateNodeProps` 不再将空字符串 props 强转 `null`，避免 REQUIREMENT 等属性更新触发 400
