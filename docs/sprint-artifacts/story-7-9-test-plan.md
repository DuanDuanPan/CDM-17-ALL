# Story 7.9: ApprovalStatusPanel 重构测试计划

## 文档信息

- **Story**: 7.9 - ApprovalStatusPanel 组件拆分
- **创建时间**: 2026-01-01
- **状态**: ✅ Ready (契约保护测试已创建)
- **目标**: 确保重构后的功能正确且完整

### 测试用例统计

| 类型 | 数量 | 状态 |
|------|------|------|
| P0 契约保护测试 (ApprovalStatusPanel) | 24 | ✅ 全部通过 |
| P0 契约保护测试 (DeliverablesSection) | 21 | ✅ 全部通过 |
| P0 契约保护测试 (ApprovalStepper) | 17 | ✅ 全部通过 |
| P0 既有测试 (useApproval Hook) | 7 | ✅ 已存在 |
| **总计（Story 7.9 相关）** | **69** | ✅ |

### 测试文件

1. `apps/web/__tests__/components/PropertyPanel/ApprovalStatusPanel.contract.test.tsx` - **新增**
2. `apps/web/__tests__/components/PropertyPanel/DeliverablesSection.contract.test.tsx` - **新增**
3. `apps/web/__tests__/components/PropertyPanel/ApprovalStepper.contract.test.tsx` - **新增**
4. `apps/web/hooks/__tests__/useApproval.spec.ts` - 已存在

---

## 1. 代码审查摘要

### 1.1 当前源代码分析

**文件**: `apps/web/components/PropertyPanel/ApprovalStatusPanel.tsx`

| 指标 | 重构前 | 重构后 | 目标值 |
|------|--------|--------|--------|
| 总行数 | 686 行 | 183 行 | <300 行 |
| 内联组件数量 | 4 个 | 0 | 0 (独立文件) |

**已拆分的组件**:

| 组件 | 目标文件 | 实际行数 |
|------|----------|----------|
| 标题/徽章/未配置展示/状态消息 | `ApprovalStatus.tsx` | 141 |
| Stepper/步骤展示 | `ApprovalHistory.tsx` | 107 |
| 交付物列表 + 上传/操作按钮 | `DeliverablesSection.tsx` | 169 |
| 交付物预览 Modal（Portal） | `DeliverablesPreviewModal.tsx` | 161 |
| 提交/通过/驳回 + 驳回表单 | `ApprovalActions.tsx` | 153 |

### 1.2 关键行为契约

根据 Story 7.9 的 Acceptance Criteria，以下行为必须在重构后保持不变：

| 契约 ID | AC# | 行为描述 | 测试覆盖 |
|---------|-----|----------|----------|
| **C1** | AC#5 | 未配置审批流程时显示配置入口 | ✅ ApprovalStatusPanel.contract |
| **C2** | AC#5 | 状态徽章映射 (PENDING/APPROVED/REJECTED/NONE) | ✅ ApprovalStatusPanel.contract |
| **C3** | AC#5 | 按钮条件 (canSubmit/canApprove/canReject) | ✅ ApprovalStatusPanel.contract |
| **C4** | AC#5 | 驳回原因必填校验 | ✅ ApprovalStatusPanel.contract |
| **C5** | AC#4 | 交付物上传 (含 loading) | ✅ DeliverablesSection.contract |
| **C6** | AC#4 | 交付物列表展示 | ✅ DeliverablesSection.contract |
| **C7** | AC#4 | 交付物预览 (mock) | ✅ DeliverablesSection.contract |
| **C8** | AC#4 | 交付物下载 | ✅ DeliverablesSection.contract |
| **C9** | AC#4 | 交付物删除 (仅编辑时) | ✅ DeliverablesSection.contract |
| **C10** | AC#3 | Stepper 步骤图标状态 | ✅ ApprovalStepper.contract |
| **C11** | AC#3 | 步骤信息展示 (名称/审批人) | ✅ ApprovalStepper.contract |
| **C12** | AC#3 | 完成时间展示 | ✅ ApprovalStepper.contract |
| **C13** | AC#3 | 驳回原因展示 | ✅ ApprovalStepper.contract |
| **C14** | AC#6 | Hook-First (API 交互由 useApproval 处理) | ✅ useApproval.spec |

---

## 2. 详细测试清单

### 2.1 ApprovalStatusPanel.contract.test.tsx

#### 未配置审批流程 (AC#5)
- [x] 当 approval 为 null 时显示 "配置流程" 按钮
- [x] 当 steps 数组为空时显示 "配置审批流程" 按钮
- [x] 显示 "此任务未配置审批流程" 提示
- [x] 点击配置按钮打开 WorkflowConfigDialog

#### 状态徽章映射 (AC#5)
- [x] PENDING 状态显示 "待审批" 徽章
- [x] APPROVED 状态显示 "已通过" 徽章
- [x] REJECTED 状态显示 "已驳回" 徽章
- [x] 有 steps 但 status 为 NONE 时显示 "待提交" 徽章

#### 按钮条件逻辑 (AC#5)
- [x] isAssignee && status != PENDING/APPROVED && has deliverables → 显示 "提交审批"
- [x] 无 deliverables → 不显示 "提交审批"
- [x] 当前用户是 approver && status === PENDING → 显示 "通过/驳回"
- [x] 非当前步骤的 approver → 不显示审批按钮
- [x] isLoading 时禁用所有按钮

#### 驳回表单 (AC#5)
- [x] 点击 "驳回" 显示驳回表单
- [x] 原因为空时禁用确认按钮
- [x] 填写原因后启用确认按钮
- [x] 确认后调用 reject 并传入原因
- [x] 点击取消隐藏表单

#### 状态消息展示 (AC#5)
- [x] APPROVED 时显示 "审批已通过"
- [x] REJECTED 时显示 "审批已驳回"

#### Hook 方法调用 (AC#6)
- [x] 点击 "提交审批" 调用 submit
- [x] 点击 "通过" 调用 approve

### 2.2 DeliverablesSection.contract.test.tsx

#### 列表展示 (AC#4)
- [x] 空列表显示 "暂无交付物"
- [x] 正确渲染所有交付物
- [x] 显示 "交付物" section 标题

#### 文件图标 (AC#4)
- [x] PDF 文件显示正确图标
- [x] 图片文件显示正确图标
- [x] JSON 文件显示正确图标

#### 上传功能 (AC#4)
- [x] canEdit 时显示上传按钮
- [x] status 为 APPROVED 时不显示上传按钮
- [x] 非 assignee 时不显示上传按钮
- [x] isUploading 时显示 spinner 并禁用按钮
- [x] 选择文件后调用 uploadDeliverable
- [x] 接受常见文件类型

#### 下载功能 (AC#4)
- [x] 点击下载按钮在新标签打开下载链接

#### 预览功能 (AC#4)
- [x] 点击预览按钮打开模态框
- [x] 点击关闭按钮关闭模态框
- [x] 显示 mock 预览提示
- [x] JSON 文件生成 JSON 格式内容

#### 删除功能 (AC#4)
- [x] canEdit 时显示删除按钮
- [x] 非 canEdit 时不显示删除按钮
- [x] status 为 APPROVED 时不显示删除按钮
- [x] 点击删除调用 deleteDeliverable 并传入正确 ID

### 2.3 ApprovalStepper.contract.test.tsx

#### 步骤名称展示 (AC#3)
- [x] 按顺序显示所有步骤名称

#### 审批人信息展示 (AC#3)
- [x] 显示每个步骤的 assignee ID
- [x] 显示 assignee 头像 (前两个字符大写)

#### 步骤状态图标 (AC#3)
- [x] approved 步骤显示绿色勾选图标
- [x] rejected 步骤显示红色叉号图标
- [x] pending/active 步骤显示蓝色脉冲时钟图标
- [x] 未来的 pending 步骤也显示蓝色图标

#### 完成时间展示 (AC#3)
- [x] 已完成步骤显示 completedAt
- [x] pending 步骤不显示完成时间

#### 驳回原因展示 (AC#3)
- [x] rejected 步骤显示 "驳回原因: xxx"
- [x] approved 步骤不显示驳回原因

#### 连接线展示 (AC#3)
- [x] approved 步骤后显示绿色连接线
- [x] pending 步骤后显示灰色连接线
- [x] 最后一个步骤无连接线

#### 步骤文字颜色 (AC#3)
- [x] approved 步骤名称为绿色
- [x] rejected 步骤名称为红色
- [x] pending 步骤名称为蓝色

---

## 3. 测试执行指南

### 3.1 运行契约保护测试

```bash
# 运行所有 Story 7.9 契约测试
pnpm --filter @cdm/web test -- --testNamePattern="Contract"

# 单独运行某个测试文件
pnpm --filter @cdm/web test -- __tests__/components/PropertyPanel/ApprovalStatusPanel.contract.test.tsx
pnpm --filter @cdm/web test -- __tests__/components/PropertyPanel/DeliverablesSection.contract.test.tsx
pnpm --filter @cdm/web test -- __tests__/components/PropertyPanel/ApprovalStepper.contract.test.tsx
```

### 3.2 重构验证流程

```bash
# 1. 重构前 - 确保基线通过
pnpm --filter @cdm/web test -- --testNamePattern="Contract"

# 2. 每个 Task 完成后 - 验证契约仍然满足
pnpm --filter @cdm/web test -- --testNamePattern="Contract"

# 3. 重构完成后 - 全量测试
pnpm --filter @cdm/web test

# 4. 检查行数目标
wc -l apps/web/components/PropertyPanel/ApprovalStatusPanel.tsx
# 应该 < 300 行
```

### 3.3 手动回归验证清单 (AC#5)

| # | 场景 | 步骤 | 预期结果 |
|---|------|------|----------|
| 1 | 未配置审批流程 | 选中任务节点 → 查看审批面板 | 显示配置按钮，可打开配置弹窗 |
| 2 | 已配置流程 | 配置审批流程后查看 | 状态徽章显示正确，步骤展示包含审批人 |
| 3 | Assignee 提交 | 上传交付物 → 点击提交审批 | 状态变为 "待审批"，步骤更新 |
| 4 | Approver 通过 | 切换到审批人 → 点击通过 | 状态变为 "已通过" 或进入下一步 |
| 5 | Approver 驳回 | 点击驳回 → 填写原因 → 确认 | 状态变为 "已驳回"，显示驳回原因 |
| 6 | 交付物操作 | 上传/预览/下载/删除 | 所有操作按预期工作，权限正确 |

---

## 4. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 拆分后 props 传递遗漏 | 中 | 高 | 契约测试覆盖所有交互场景 |
| Modal/Portal 测试问题 | 中 | 中 | 使用 `document.querySelector` 查询 portal 内容 |
| Hook 依赖变更 | 低 | 中 | useApproval.spec 已覆盖所有 API 交互 |

---

## 5. 附录

### 5.1 相关文档

- [Story 7.9 定义](./story-7-9-approval-status-panel-refactor.md)
- [Story 7.2 useApproval Hook](./story-7-2-frontend-hook-first-extraction.md)
- [重构提案](../analysis/refactoring-proposal-2025-12-28.md)

### 5.2 测试运行结果

```
 Test Files  31 passed (31)
      Tests  367 passed (367)
   Duration  7.37s
```

最后更新: 2026-01-01T12:40:00+08:00
