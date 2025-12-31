# Story 7.9: ApprovalStatusPanel 组件拆分

Status: ready-for-dev

## Story

As a **前端开发者**,
I want **将 ApprovalStatusPanel 组件拆分为状态展示和操作独立的模块**,
so that **审批流 UI 更易维护，各部分可独立复用和测试。**

## Acceptance Criteria

1. **Given** `ApprovalStatusPanel.tsx` 当前有 685 行
   **When** 执行拆分后
   **Then** 主文件行数应降低至 300 行以内

2. **Given** 审批状态展示和操作逻辑混合
   **When** 重构完成后
   **Then** 应分离为 `ApprovalStatus.tsx` 和 `ApprovalActions.tsx`

3. **Given** 交付物管理逻辑内嵌
   **When** 重构完成后
   **Then** 应创建独立的 `DeliverablesSection.tsx` 组件

4. **Given** 审批历史显示内嵌
   **When** 重构完成后
   **Then** 应创建独立的 `ApprovalHistory.tsx` 组件

5. **Given** 所有拆分完成
   **When** 验证功能时
   **Then** 审批提交、审批/驳回、交付物上传、历史查看功能应正常工作

## Tasks / Subtasks

- [ ] Task 1: 分析组件结构 (AC: #1)
  - [ ] 1.1 识别审批状态展示区域
  - [ ] 1.2 识别审批操作区域
  - [ ] 1.3 识别交付物管理区域
  - [ ] 1.4 识别历史记录区域

- [ ] Task 2: 创建 ApprovalStatus 组件 (AC: #2)
  - [ ] 2.1 创建 `ApprovalStatus.tsx`
  - [ ] 2.2 迁移状态标签/徽章渲染
  - [ ] 2.3 迁移审批步骤进度展示

- [ ] Task 3: 创建 ApprovalActions 组件 (AC: #2)
  - [ ] 3.1 创建 `ApprovalActions.tsx`
  - [ ] 3.2 迁移提交/审批/驳回按钮
  - [ ] 3.3 配置操作回调

- [ ] Task 4: 创建 DeliverablesSection 组件 (AC: #3)
  - [ ] 4.1 创建 `DeliverablesSection.tsx`
  - [ ] 4.2 迁移交付物上传 UI
  - [ ] 4.3 迁移交付物列表展示

- [ ] Task 5: 创建 ApprovalHistory 组件 (AC: #4)
  - [ ] 5.1 创建 `ApprovalHistory.tsx`
  - [ ] 5.2 迁移历史记录时间轴
  - [ ] 5.3 配置展开/收起逻辑

- [ ] Task 6: 重构主组件 (AC: #1, #5)
  - [ ] 6.1 整合提取的子组件
  - [ ] 6.2 验证行数 < 300
  - [ ] 6.3 功能回归测试

## Dev Notes

### 当前文件位置
- `apps/web/components/PropertyPanel/ApprovalStatusPanel.tsx`

### 拆分策略
| 新文件 | 职责 | 预估行数 |
|--------|------|----------|
| `ApprovalStatus.tsx` | 状态展示 | ~150 |
| `ApprovalActions.tsx` | 操作按钮 | ~150 |
| `DeliverablesSection.tsx` | 交付物管理 | ~150 |
| `ApprovalHistory.tsx` | 历史记录 | ~100 |
| `ApprovalStatusPanel.tsx` | 主容器 | ~150 |

### 依赖关系
- 依赖 `useApproval` hook（已在 Story 7.2 中创建）
- 使用 `@cdm/ui` 中的 Button, Badge 等原子组件

### Project Structure Notes
- 组件应保留在 `apps/web/components/PropertyPanel/` 目录
- 可考虑创建 `PropertyPanel/Approval/` 子目录

### References
- [Source: docs/analysis/refactoring-proposal-2025-12-28.md#第二阶段]
- [Source: docs/project-context.md#Line93] - 文件大小限制 300 行
- [Source: docs/sprint-artifacts/story-7-2-frontend-hook-first-extraction.md] - useApproval hook

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
