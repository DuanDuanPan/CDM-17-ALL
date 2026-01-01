# Story 7.9: ApprovalStatusPanel 组件拆分

Status: done

## Story

As a **前端开发者**,
I want **将 ApprovalStatusPanel 组件拆分为状态展示和操作独立的模块**,
so that **审批流 UI 更易维护，各部分可独立复用和测试。**

## Acceptance Criteria

1. **Given** `ApprovalStatusPanel.tsx` 当前有 685 行
   **When** 执行拆分后
   **Then** 主文件行数应降低至 300 行以内

2. **Given** 审批状态展示和操作逻辑混合在 `ApprovalStatusPanel.tsx` 中
   **When** 重构完成后
   **Then** 应分离为以下独立组件（文件路径必须明确且稳定）：
   - `apps/web/components/PropertyPanel/ApprovalStatus.tsx`（状态/标题/徽章/提示文案；不处理 API）
   - `apps/web/components/PropertyPanel/ApprovalActions.tsx`（按钮区 + 驳回表单 UI；不处理 API）

3. **Given** 审批步骤（Stepper/步骤状态）展示逻辑内嵌
   **When** 重构完成后
   **Then** 应创建独立的 `apps/web/components/PropertyPanel/ApprovalHistory.tsx` 组件（复用现有 Stepper UI，不新增“历史时间轴”功能）

4. **Given** 交付物管理逻辑内嵌
   **When** 重构完成后
   **Then** 应创建独立的 `apps/web/components/PropertyPanel/DeliverablesSection.tsx` 组件，并保持以下能力不回退：
   - 上传（含 loading 状态）
   - 列表展示
   - 预览（当前为 mock 预览）
   - 下载
   - 删除（仅允许编辑时显示）

5. **Given** 所有拆分完成
   **When** 验证功能时
   **Then** 以下现有交互与展示必须保持正常且不改变 UX/行为（纯重构）：
   - 未配置审批流程时：显示“配置流程/配置审批流程”，可打开 `WorkflowConfigDialog`
   - 已配置时：状态徽章、步骤展示（含 completedAt/reason 展示）正常
   - 提交审批、通过、驳回（含“驳回原因”必填校验）正常
   - 交付物：上传/预览/下载/删除正常（权限与禁用条件不变）

6. **Given** Story 7.2 已落地 Hook-First
   **When** 本次拆分完成后
   **Then** 仍必须满足：
   - **不新增** `fetch()` 到 `components` 中（API 交互继续由 `useApproval` 统一处理）
   - `ApprovalStatusPanel` 保持 container 职责：编排数据与权限判断；子组件尽量为 presentational（仅 props + callbacks）

## Tasks / Subtasks

- [x] Task 1: 分析组件结构 (AC: #1)
  - [x] 1.1 识别审批状态展示区域
  - [x] 1.2 识别审批操作区域
  - [x] 1.3 识别交付物管理区域
  - [x] 1.4 识别历史记录区域

- [x] Task 2: 创建 ApprovalHistory 组件 (AC: #3)
  - [x] 2.1 创建 `apps/web/components/PropertyPanel/ApprovalHistory.tsx`
  - [x] 2.2 迁移 Stepper/步骤渲染（包含 StepIcon/状态颜色/完成时间/驳回原因展示）
  - [x] 2.3 确认不引入新交互（如展开/收起）；保持现有 UI 行为

- [x] Task 3: 创建 DeliverablesSection 组件 (AC: #4)
  - [x] 3.1 创建 `apps/web/components/PropertyPanel/DeliverablesSection.tsx`
  - [x] 3.2 迁移交付物上传 UI（含 loading）
  - [x] 3.3 迁移交付物列表/预览/下载/删除（保持权限与禁用条件不变）

- [x] Task 4: 创建 ApprovalActions 组件 (AC: #2, #5)
  - [x] 4.1 创建 `apps/web/components/PropertyPanel/ApprovalActions.tsx`
  - [x] 4.2 迁移提交/通过/驳回按钮 + 驳回表单 UI
  - [x] 4.3 通过 props 接收：`canSubmit/canApprove/canReject/isLoading` 与回调（submit/approve/reject），避免在子组件内引入 API 逻辑

- [x] Task 5: 创建 ApprovalStatus 组件 (AC: #2, #5)
  - [x] 5.1 创建 `apps/web/components/PropertyPanel/ApprovalStatus.tsx`
  - [x] 5.2 迁移标题区 + 状态徽章/文案（包含"审批已通过/已驳回"等状态提示）
  - [x] 5.3 迁移"未配置审批流程"展示 UI（打开配置弹窗的动作通过 callback 传入，不在组件内创建新副作用）

- [x] Task 6: 重构主组件 (AC: #1, #5, #6)
  - [x] 6.1 整合提取的子组件
  - [x] 6.2 验证行数 < 300
  - [x] 6.3 验证不引入 `fetch()`/新 API 逻辑到组件层（保持 Hook-First）
  - [x] 6.4 功能回归测试（按 AC#5 清单逐项验证）

## Dev Notes

### 当前文件位置
- `apps/web/components/PropertyPanel/ApprovalStatusPanel.tsx`

### 拆分策略
| 新文件 | 职责 | 预估行数 |
|--------|------|----------|
| `apps/web/components/PropertyPanel/ApprovalStatus.tsx` | 标题/徽章/状态提示 + 未配置展示（纯 UI） | ~120 |
| `apps/web/components/PropertyPanel/ApprovalHistory.tsx` | Stepper/步骤展示（复用现有 UI） | ~150 |
| `apps/web/components/PropertyPanel/DeliverablesSection.tsx` | 交付物上传/预览/下载/删除（保持 UX） | ~200 |
| `apps/web/components/PropertyPanel/ApprovalActions.tsx` | 提交/通过/驳回（含驳回原因表单） | ~150 |
| `ApprovalStatusPanel.tsx` | 主容器 | ~150 |

### 依赖关系
- 依赖 `useApproval` hook（已在 Story 7.2 中创建）
- 使用 `@cdm/ui` 中的 Button, Badge 等原子组件

### 关键约束（防回退/防事故）
- **纯重构**：不得改变 UI 文案、布局、按钮禁用条件、loading 表现、权限判断逻辑。
- **Hook-First**：所有 API 交互继续由 `useApproval` 处理；子组件不应引入 `fetch()` 或自行封装 API。
- **Container vs Presentational**：
  - `ApprovalStatusPanel`：负责 `useApproval(nodeId, ...)`、`canSubmit/canApprove/canReject` 计算、回调编排、配置弹窗开关
  - 子组件：尽量只接收 props + callbacks；允许内部管理纯 UI 状态（如驳回输入框的本地 state）

### 最小回归验证清单（手动）
1. 未配置审批流程：能打开配置弹窗并配置成功后刷新展示
2. 已配置流程：状态徽章显示正确；步骤展示包含完成时间/驳回原因
3. Assignee：有交付物时可“提交审批”，提交后状态变化正确
4. Approver：可“通过/驳回”；驳回必须填写原因；提交后状态/步骤更新正确
5. 交付物：上传/预览/下载/删除（在允许编辑时）均可用且不报错

### Project Structure Notes
- 新组件统一放在 `apps/web/components/PropertyPanel/` 同级目录（避免额外目录/导出改动）
- `apps/web/components/PropertyPanel/index.tsx` 继续只导入 `./ApprovalStatusPanel`（不需要对外导出拆分后的子组件）

### References
- [Source: docs/analysis/refactoring-proposal-2025-12-28.md#第二阶段]
- [Source: docs/project-context.md#Line93] - 文件大小限制 300 行
- [Source: docs/sprint-artifacts/story-7-2-frontend-hook-first-extraction.md] - useApproval hook
- [Source: apps/web/components/PropertyPanel/ApprovalStatusPanel.tsx] - 当前实现基线（Stepper/交付物/操作/配置流程）

## Senior Developer Review (AI)

- **审查时间**: 2026-01-01
- **结论**: Approve（问题已全部修复）
- **要点（发现 → 处置）**:
  - HIGH: `ApprovalStatusHeader` 已抽出但未被容器使用，导致“状态展示拆分”不彻底且存在重复 UI → 改为 `ApprovalStatusPanel` 使用 `ApprovalStatusHeader`
  - HIGH: `DeliverablesSection.tsx` 335 行 > 300 行违反项目规则 → 抽出 `DeliverablesPreviewModal.tsx`，两个文件均 < 300 行
  - MEDIUM: Story File List 缺少契约测试/测试计划等实际变更 → 补齐 File List，并修正测试数量描述
  - LOW: mock 预览内容含 `Math.random()` 导致非确定性 → 改为确定性 mock 内容生成
- **验证**:
  - `pnpm --filter @cdm/web lint`（0 errors, 5 warnings）
  - `pnpm --filter @cdm/web test`（367 tests）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - 纯重构无调试问题

### Completion Notes List

- ✅ ApprovalStatusPanel.tsx 从 686 行降低到 183 行（目标 < 300 行）
- ✅ 创建 ApprovalHistory.tsx (107 行) - Stepper/步骤展示
- ✅ 创建 DeliverablesSection.tsx (169 行) + DeliverablesPreviewModal.tsx (161 行) - 交付物上传/预览/下载/删除
- ✅ 创建 ApprovalActions.tsx (153 行) - 提交/通过/驳回按钮 + 驳回表单
- ✅ 创建 ApprovalStatus.tsx (141 行) - 状态徽章/未配置展示/状态消息（含 ApprovalStatusHeader）
- ✅ 所有 367 个测试通过（包括 62 个契约保护测试）
- ✅ ESLint 无错误（5 个无关 warnings）
- ✅ Hook-First 模式保持：子组件不引入 fetch()，API 交互由 useApproval 统一处理
- ✅ Container vs Presentational 分离：主组件编排数据与权限，子组件纯展示

### File List

**新增文件：**
- `apps/web/components/PropertyPanel/ApprovalHistory.tsx`
- `apps/web/components/PropertyPanel/DeliverablesSection.tsx`
- `apps/web/components/PropertyPanel/DeliverablesPreviewModal.tsx`
- `apps/web/components/PropertyPanel/ApprovalActions.tsx`
- `apps/web/components/PropertyPanel/ApprovalStatus.tsx`
- `apps/web/__tests__/components/PropertyPanel/ApprovalStatusPanel.contract.test.tsx`
- `apps/web/__tests__/components/PropertyPanel/DeliverablesSection.contract.test.tsx`
- `apps/web/__tests__/components/PropertyPanel/ApprovalStepper.contract.test.tsx`
- `docs/sprint-artifacts/story-7-9-test-plan.md`

**修改文件：**
- `apps/web/components/PropertyPanel/ApprovalStatusPanel.tsx` (686 → 183 行)

## Change Log

- **2026-01-01**: Story 7.9 完成 - ApprovalStatusPanel 组件拆分重构
- **2026-01-01**: Code Review 修复完成 - Header 组件复用、交付物模块按 300 行规则拆分、补齐测试/文档同步
