# Story 7.2: 前端 Hook-First 模式提取 (Frontend Hook-First Extraction)

Status: ready-for-dev

## 1. Background

在当前的前端代码中，部分 UI 组件（如 `ApprovalStatusPanel` 和 `TaskDispatchSection`）违反了 Hook-First 架构原则，直接在组件内部进行数据获取 (`fetch`) 和状态管理。这导致了以下问题：
1.  **违反架构设计**: 与 `architecture.md:650-652` 中定义的 "Hook-First Logic" 规范不符。
2.  **测试困难**: 难以对 UI 组件进行独立的单元测试（需 Mock 全局 fetch）。
3.  **复用性差**: API 交互逻辑绑定在特定组件内，无法在其他视图复用。
4.  **组件污染**: UI 组件包含了大量副作用代码，不纯净。

本 Story 旨在将这些散落的 API 调用提取为自定义 Hooks (`useApproval`, `useTaskDispatch`)，并建立 ESLint 规则防止未来衰退。

### 与整体重构规划的对照

本 Story 对应 `docs/analysis/refactoring-proposal-2025-12-28.md` 第一阶段 (止血与核心规范强防) 中的 **1.2 强制 Hook-First (Frontend)**。

#### 当前 fetch 违规完整清单 (来源: refactoring-proposal 9.1.2)

根据重构提案分析，共发现 **23 处** 直接 `fetch()` 调用分布于以下组件：

| 组件 | fetch 次数 | 优先级 | 本 Story 覆盖 | 备注 |
|:-----|:----------:|:------:|:-------------:|:-----|
| `ApprovalStatusPanel.tsx` | 8 次 | 🔴 P0 | ✅ Task 5.2.1 | 审批核心流程，必须修复 |
| `TaskDispatchSection.tsx` | 3 次 | 🔴 P1 | ✅ Task 5.2.2 | 任务派发核心流程 |
| `ArchiveDrawer.tsx` | 3 次 | 🟡 P2 | ⏸️ Story 7.5 | 归档功能，低频使用 |
| `UserSelector.tsx` | 2 次 | 🟡 P2 | ⏸️ Story 7.5 | 用户选择器，可复用 `useUsers` |
| `AppLibraryDialog.tsx` | 2 次 | 🟡 P2 | ⏸️ Story 7.5 | APP 库搜索 |
| `CommentPanel.tsx` | 1 次 | 🟢 P3 | ⏸️ 已有 `useComments` | 需验证是否已覆盖 |
| `CommentInput.tsx` | 1 次 | 🟢 P3 | ⏸️ 已有 `useComments` | @mention 搜索 |
| `CommentItem.tsx` | 1 次 | 🟢 P3 | ⏸️ Story 7.5 | 附件下载 |
| `KnowledgeSearchDialog.tsx` | 1 次 | 🟢 P3 | ⏸️ Story 7.5 | 知识搜索 |
| `AppForm.tsx` | 1 次 | 🟢 P3 | ⏸️ Story 7.5 | APP 执行 |
| **总计** | **23 次** | - | **11 次 (48%)** | - |

#### 本 Story 覆盖范围

| 规划任务 | 优先级 | 本 Story 覆盖 | 修复 fetch 数 |
|:---------|:------:|:-------------:|:-------------:|
| 提取 `ApprovalStatusPanel` 逻辑到 `useApproval` | P0 | ✅ Task 5.2.1 | 8 次 |
| 提取 `TaskDispatchSection` 逻辑到 `useTaskDispatch` | P1 | ✅ Task 5.2.2 | 3 次 |
| 添加 ESLint 规则禁止组件直接使用 `fetch` | P2 | ✅ Task 5.1.1 | 阻止新增 |
| **本 Story 直接修复** | - | - | **11 次** |

#### 后续 Story 规划 (Backlog)

为实现重构提案"零 fetch 违规"目标，需后续 Story 处理剩余 12 处违规：

| 后续 Story | 覆盖组件 | 预估工时 | 备注 |
|:-----------|:---------|:--------:|:-----|
| **Story 7.5** | `ArchiveDrawer`, `UserSelector`, `AppLibraryDialog`, `CommentItem`, `KnowledgeSearchDialog`, `AppForm` | 1 人天 | 创建 `useArchive`, `useUsers`, `useAppLibrary` 等 |
| **验证任务** | `CommentPanel`, `CommentInput` | 0.5 人天 | 确认现有 `useComments` 是否已覆盖 |

> **止血策略**: 本 Story 完成后 ESLint 规则生效，即使剩余违规未修复，也能阻止新增违规。

### 来自 Story 7.1 的经验教训

基于 Story 7.1 (后端 Repository 模式重构) 的实施经验，本 Story 需注意：

1. **认证头处理**: API 调用需携带 `x-user-id` header，参考 `CommentItem.tsx:144` 的修复
2. **乐观更新模式**: 可参考 `handleDeleteDeliverable` 中的乐观更新 (`setDeliverables(prev => prev.filter(...))`)
3. **测试 Mock 模式**: 使用 `vi.mock()` + `vi.fn()` 模式 mock fetch
4. **ESLint 规则级别**: 初始设为 `warn`，待所有违规修复后改为 `error`

### 现有 Hook 生态分析

当前 `apps/web/hooks/` 目录包含 **17 个** 自定义 Hooks，需评估复用可能性：

| 现有 Hook | 可复用性 | 备注 |
|:----------|:--------:|:-----|
| `useAttachmentUpload.ts` | 🟡 评估 | 可能与 `useApproval.uploadDeliverable` 逻辑重叠 |
| `useComments.ts` | ✅ 已有 | 评论相关逻辑已封装 |
| `useNotifications.ts` | ✅ 已有 | 通知逻辑已封装 |
| `useSubscription.ts` | ✅ 已有 | 订阅逻辑已封装 |

**决策**: `useApproval` 和 `useTaskDispatch` 为新增 Hooks，不复用现有实现以保持职责清晰。

**预估工时**：1.5 - 2 人天

---

## 2. Requirements

### Must Have
- [ ] 创建 `useApproval(nodeId)` Hook，封装审批相关的 6 个 API 交互。
- [ ] 创建 `useTaskDispatch(nodeId)` Hook，封装任务下发相关的 3 个 API 交互。
- [ ] 重构 `ApprovalStatusPanel` 组件，移除内部 fetch (Line 451-609)，使用 `useApproval`。
- [ ] 重构 `TaskDispatchSection` 组件，移除内部 fetch (Line 53-159)，使用 `useTaskDispatch`。
- [ ] 添加 ESLint 规则，禁止在 `apps/web/components` 目录下直接使用 `fetch`。

### Should Have
- [ ] 为提取出的 Hooks 添加单元测试（使用 `renderHook`）。
- [ ] 确保重构后的 UI 行为（加载状态、错误处理、成功反馈）与原版完全一致。
- [ ] 组件行数验证：`ApprovalStatusPanel` 从 794 行减少约 200 行。

---

## 3. File Change Manifest (Predicted)

### 3.1 新建文件 (CREATE) - 4 files

| 文件路径 | 用途 |
|---------|------|
| `apps/web/hooks/useApproval.ts` | 审批逻辑 Hook (6 个 API) |
| `apps/web/hooks/useTaskDispatch.ts` | 任务下发逻辑 Hook (3 个 API) |
| `apps/web/hooks/__tests__/useApproval.spec.ts` | 审批 Hook 测试 |
| `apps/web/hooks/__tests__/useTaskDispatch.spec.ts` | 任务下发 Hook 测试 |

### 3.2 修改文件 (MODIFY) - 6 files

| 文件路径 | 修改内容 | 预期变化 |
|---------|---------|----------|
| `apps/web/components/PropertyPanel/ApprovalStatusPanel.tsx` | 移除 fetch，集成 Hook | -200 行 |
| `apps/web/components/PropertyPanel/TaskDispatchSection.tsx` | 移除 fetch，集成 Hook | -100 行 |
| `apps/web/hooks/index.ts` | 导出新 Hooks (barrel export) | +2 行 |
| `apps/web/eslint.config.mjs` | 添加 `no-restricted-syntax` 规则 | +15 行 |
| `docs/epics.md` | 更新 Story 状态 | - |
| `docs/sprint-artifacts/sprint-status.yaml` | 更新 Story 状态 | - |

---

## 4. Technical Design

### 4.1 useApproval Hook - 完整 API 规格

**位置**: `apps/web/hooks/useApproval.ts`

**源代码分析**: 提取自 `ApprovalStatusPanel.tsx:451-609`

```typescript
import { useState, useCallback, useEffect } from 'react';
import type { ApprovalPipeline, Deliverable } from '@cdm/types';
import { useCurrentUserId } from '../contexts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface UseApprovalReturn {
  // State
  approval: ApprovalPipeline | null;
  deliverables: Deliverable[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  
  // Actions (对应 ApprovalStatusPanel 中的 6 个 fetch 调用)
  fetchApproval: () => Promise<void>;           // Line 451-461
  submit: () => Promise<void>;                  // Line 549-565
  approve: () => Promise<void>;                 // Line 567-583
  reject: (reason: string) => Promise<void>;    // Line 585-609
  uploadDeliverable: (file: File) => Promise<void>;  // Line 480-521 (2次fetch)
  deleteDeliverable: (id: string) => Promise<void>;  // Line 524-539
}

export function useApproval(nodeId: string): UseApprovalReturn {
  const currentUserId = useCurrentUserId();
  const [approval, setApproval] = useState<ApprovalPipeline | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取审批状态 - 对应 Line 451-461
  const fetchApproval = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/approval/${nodeId}`);
      if (response.ok) {
        const data = await response.json();
        setApproval(data.approval);
      }
    } catch (err) {
      console.error('Failed to fetch approval status:', err);
      setError('获取审批状态失败');
    }
  }, [nodeId]);

  // 提交审批 - 对应 Line 549-565
  const submit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/approval/${nodeId}/submit`, {
        method: 'POST',
        headers: { 'x-user-id': currentUserId },
      });
      if (response.ok) {
        await fetchApproval();
      } else {
        throw new Error('提交失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, currentUserId, fetchApproval]);

  // 审批通过 - 对应 Line 567-583
  const approve = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/approval/${nodeId}/approve`, {
        method: 'POST',
        headers: { 'x-user-id': currentUserId },
      });
      if (response.ok) {
        await fetchApproval();
      } else {
        throw new Error('审批失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '审批失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, currentUserId, fetchApproval]);

  // 驳回 - 对应 Line 585-609
  const reject = useCallback(async (reason: string) => {
    if (!reason.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/approval/${nodeId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({ reason }),
      });
      if (response.ok) {
        await fetchApproval();
      } else {
        throw new Error('驳回失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '驳回失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, currentUserId, fetchApproval]);

  // 上传交付物 - 对应 Line 480-521 (两次 fetch: 文件上传 + deliverable 关联)
  const uploadDeliverable = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await fetch(`${API_BASE}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error('文件上传失败');
      const fileMetadata = await uploadResponse.json();

      // Step 2: Associate deliverable
      const deliverableData = {
        id: crypto.randomUUID(),
        fileId: fileMetadata.id,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      };
      const deliverableResponse = await fetch(`${API_BASE}/api/approval/${nodeId}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliverableData),
      });
      if (deliverableResponse.ok) {
        await fetchApproval();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [nodeId, fetchApproval]);

  // 删除交付物 - 对应 Line 524-539 (含乐观更新)
  const deleteDeliverable = useCallback(async (deliverableId: string) => {
    setError(null);
    // 乐观更新: 立即从本地状态移除
    setDeliverables(prev => prev.filter(d => d.id !== deliverableId));
    try {
      const response = await fetch(`${API_BASE}/api/approval/${nodeId}/deliverables/${deliverableId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        // 回滚: 重新获取
        await fetchApproval();
        throw new Error('删除失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
      throw err;
    }
  }, [nodeId, fetchApproval]);

  // 初始化加载
  useEffect(() => {
    fetchApproval();
  }, [fetchApproval]);

  return {
    approval,
    deliverables,
    isLoading,
    isUploading,
    error,
    fetchApproval,
    submit,
    approve,
    reject,
    uploadDeliverable,
    deleteDeliverable,
  };
}
```

### 4.2 useTaskDispatch Hook - 完整 API 规格

**位置**: `apps/web/hooks/useTaskDispatch.ts`

**源代码分析**: 提取自 `TaskDispatchSection.tsx:53-159`

```typescript
import { useState, useCallback } from 'react';
import type { TaskProps } from '@cdm/types';
import { useToast } from '@cdm/ui';
import { useCurrentUserId } from '../contexts';

export interface UseTaskDispatchReturn {
  isSubmitting: boolean;
  dispatch: (formData: TaskProps) => Promise<TaskProps>;  // Line 53-87
  accept: (formData: TaskProps) => Promise<TaskProps>;    // Line 89-120
  reject: (formData: TaskProps, reason: string) => Promise<TaskProps>;  // Line 122-159
}

export function useTaskDispatch(nodeId: string): UseTaskDispatchReturn {
  const currentUserId = useCurrentUserId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  // 解析 API 错误
  const parseApiError = async (response: Response, defaultMsg: string): Promise<string> => {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.message || json.error || defaultMsg;
    } catch {
      return text || defaultMsg;
    }
  };

  // 派发任务 - 对应 Line 53-87
  const dispatch = useCallback(async (formData: TaskProps): Promise<TaskProps> => {
    if (!formData.assigneeId) {
      addToast({ type: 'warning', title: '缺少信息', description: '请先指定执行人' });
      throw new Error('Missing assignee');
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/nodes/${nodeId}:dispatch?userId=${encodeURIComponent(currentUserId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response, '派发失败'));
      }
      const now = new Date().toISOString();
      const updatedData: TaskProps = {
        ...formData,
        assignmentStatus: 'dispatched',
        ownerId: currentUserId,
        dispatchedAt: now,
      };
      addToast({ type: 'success', title: '派发成功', description: '任务已成功派发！' });
      return updatedData;
    } catch (error) {
      const message = error instanceof Error ? error.message : '派发失败，请重试';
      addToast({ type: 'error', title: '派发失败', description: message });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [nodeId, currentUserId, addToast]);

  // 接受任务 - 对应 Line 89-120
  const accept = useCallback(async (formData: TaskProps): Promise<TaskProps> => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/nodes/${nodeId}:feedback?userId=${encodeURIComponent(currentUserId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response, '接受失败'));
      }
      const now = new Date().toISOString();
      const updatedData: TaskProps = {
        ...formData,
        assignmentStatus: 'accepted',
        status: 'todo',
        feedbackAt: now,
      };
      addToast({ type: 'success', title: '接受成功', description: '任务已接受！' });
      return updatedData;
    } catch (error) {
      const message = error instanceof Error ? error.message : '接受失败，请重试';
      addToast({ type: 'error', title: '接受失败', description: message });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [nodeId, currentUserId, addToast]);

  // 驳回任务 - 对应 Line 122-159
  const reject = useCallback(async (formData: TaskProps, reason: string): Promise<TaskProps> => {
    if (!reason?.trim()) {
      addToast({ type: 'warning', title: '提示', description: '请填写驳回理由' });
      throw new Error('Missing reason');
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/nodes/${nodeId}:feedback?userId=${encodeURIComponent(currentUserId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response, '驳回失败'));
      }
      const now = new Date().toISOString();
      const updatedData: TaskProps = {
        ...formData,
        assignmentStatus: 'rejected',
        rejectionReason: reason,
        feedbackAt: now,
      };
      addToast({ type: 'success', title: '驳回成功', description: '任务已驳回' });
      return updatedData;
    } catch (error) {
      const message = error instanceof Error ? error.message : '驳回失败，请重试';
      addToast({ type: 'error', title: '驳回失败', description: message });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [nodeId, currentUserId, addToast]);

  return { isSubmitting, dispatch, accept, reject };
}
```

### 4.3 ESLint Configuration (修正版)

**位置**: `apps/web/eslint.config.mjs`

> **注意**: 使用 `no-restricted-syntax` 而非 `no-restricted-globals`，因为后者对 `await fetch()` 无效。

```javascript
// 添加到 eslint.config.mjs
{
  files: ['apps/web/components/**/*.tsx', 'apps/web/components/**/*.ts'],
  rules: {
    // 禁止在组件中直接调用 fetch
    'no-restricted-syntax': [
      'warn', // 初始设为 warn，待所有违规修复后改为 error
      {
        selector: 'CallExpression[callee.name="fetch"]',
        message: '❌ 禁止在组件中直接调用 fetch()。请使用 Custom Hooks (如 useApproval, useTaskDispatch) 或 @/lib/api 服务层。[Source: project-context.md:85, architecture.md:650]'
      },
      {
        selector: 'MemberExpression[object.name="window"][property.name="fetch"]',
        message: '❌ 禁止在组件中直接调用 window.fetch()。请使用 Custom Hooks 或服务层。'
      }
    ],
  }
}
```

---

## 5. Implementation Tasks

### 5.1 Setup
- [ ] **Task 5.1.1**: 更新前端 ESLint 配置，禁止在组件层直接调用 `fetch`。
  - 使用 `no-restricted-syntax` 规则
  - 初始设为 `warn` 级别

### 5.2 Hook Extraction
- [ ] **Task 5.2.1**: 创建 `useApproval` Hook
  - 实现 6 个 API 方法
  - 包含乐观更新逻辑
  - 添加 8+ 个测试用例
- [ ] **Task 5.2.2**: 创建 `useTaskDispatch` Hook
  - 实现 3 个 API 方法
  - 添加 6+ 个测试用例

### 5.3 Component Refactor
- [ ] **Task 5.3.1**: 重构 `ApprovalStatusPanel.tsx`
  - 移除 Line 451-609 的 fetch 逻辑
  - 使用 `useApproval` Hook
  - 验收: 行数减少 ~200 行
- [ ] **Task 5.3.2**: 重构 `TaskDispatchSection.tsx`
  - 移除 Line 53-159 的 fetch 逻辑
  - 使用 `useTaskDispatch` Hook
  - 验收: 行数减少 ~100 行

### 5.4 Verification
- [ ] **Task 5.4.1**: 运行 Lint 检查
  - 验证 ESLint 规则生效
  - 记录现有 warnings 数量
- [ ] **Task 5.4.2**: 运行 Hook 单元测试
  - `pnpm test apps/web/hooks/__tests__/useApproval.spec.ts`
  - `pnpm test apps/web/hooks/__tests__/useTaskDispatch.spec.ts`
- [ ] **Task 5.4.3**: 手动验证功能
  - 审批提交/通过/驳回
  - 交付物上传/删除
  - 任务派发/接受/驳回

---

## 6. QA Plan

### 6.1 Manual Testing Matrix

| Feature | Action | Expected Result | 验收标准映射 |
|:--------|:-------|:----------------|:-------------|
| **Approval - Fetch** | 打开审批面板 | 审批状态正确加载 | Task 5.2.1 |
| **Approval - Submit** | 点击提交审批 | Loading 显示，成功 Toast 弹出 | Task 5.2.1 |
| **Approval - Approve** | 审批人点击通过 | 状态更新为已通过 | Task 5.2.1 |
| **Approval - Reject** | 审批人填写理由驳回 | 状态更新为已驳回，理由显示 | Task 5.2.1 |
| **Approval - Upload** | 上传交付物 | 文件上传成功，列表更新 | Task 5.2.1 |
| **Approval - Delete** | 删除交付物 | 乐观更新立即生效 | Task 5.2.1 |
| **Dispatch - Dispatch** | 派发任务 | 状态变为待确认 | Task 5.2.2 |
| **Dispatch - Accept** | 执行人接受 | 状态变为已接受 | Task 5.2.2 |
| **Dispatch - Reject** | 执行人驳回 | 驳回理由显示 | Task 5.2.2 |

### 6.2 Automated Testing

**测试模式 (参考 Story 7.1)**:

```typescript
// apps/web/hooks/__tests__/useApproval.spec.ts
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApproval } from '../useApproval';

// Mock dependencies
vi.mock('../../contexts', () => ({
  useCurrentUserId: () => 'test-user-id',
}));

describe('useApproval', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  it('should fetch approval status on mount', async () => {
    const mockApproval = { status: 'PENDING', steps: [] };
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ approval: mockApproval }),
    });

    const { result } = renderHook(() => useApproval('node-1'));

    await waitFor(() => {
      expect(result.current.approval).toEqual(mockApproval);
    });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/approval/node-1'));
  });

  it('should submit approval with x-user-id header', async () => {
    (fetch as Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // initial fetch
      .mockResolvedValueOnce({ ok: true }) // submit
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // refetch

    const { result } = renderHook(() => useApproval('node-1'));

    await act(async () => {
      await result.current.submit();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/approval/node-1/submit'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-user-id': 'test-user-id' }),
      })
    );
  });

  it('should perform optimistic delete for deliverable', async () => {
    const mockDeliverables = [{ id: 'd1' }, { id: 'd2' }];
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ approval: null, deliverables: mockDeliverables }),
    });

    const { result } = renderHook(() => useApproval('node-1'));

    // Set initial deliverables (mock state)
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    (fetch as Mock).mockResolvedValueOnce({ ok: true }); // delete

    await act(async () => {
      await result.current.deleteDeliverable('d1');
    });

    // Verify optimistic update was called
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/approval/node-1/deliverables/d1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
```

---

## 7. Definition of Done

- [ ] `ApprovalStatusPanel.tsx` 无直接 fetch 调用 (Line 451-609 迁移完成)
- [ ] `TaskDispatchSection.tsx` 无直接 fetch 调用 (Line 53-159 迁移完成)
- [ ] 新增 `useApproval` Hook，包含 6 个 API 方法
- [ ] 新增 `useTaskDispatch` Hook，包含 3 个 API 方法
- [ ] Hooks 单元测试通过 (≥14 个测试用例)
- [ ] ESLint 规则生效 (组件中写 fetch 会报 warning)
- [ ] 功能无回归 (手动测试 9 项全部通过)
- [ ] 组件行数验证:
  - `ApprovalStatusPanel.tsx`: 794 → ~594 行 (-200)
  - `TaskDispatchSection.tsx`: 277 → ~177 行 (-100)

---

## 8. Risk & Mitigation

| 风险 | 影响 | 可能性 | 缓解措施 |
|:-----|:-----|:-------|:---------|
| **状态同步问题**: Hook 内部状态与组件 props 不同步 | 🟡 中 | 🟡 中 | 使用 `useEffect` 同步 `initialDeliverables` 变化 |
| **乐观更新回滚失败**: 网络错误时无法回滚 | 🟢 低 | 🟢 低 | 在 catch 中调用 `fetchApproval()` 重新获取 |
| **ESLint 规则误报**: 合法的 fetch 被标记 | 🟢 低 | 🟢 低 | 初始设为 warn；hooks 目录排除在规则外 |

---

## 9. Dev Notes (实现时更新)

_此区域在开发过程中记录重要发现、问题和解决方案_

### 9.1 实现进度

- [ ] Task 5.1.1 - ESLint 配置
- [ ] Task 5.2.1 - useApproval Hook
- [ ] Task 5.2.2 - useTaskDispatch Hook
- [ ] Task 5.3.1 - ApprovalStatusPanel 重构
- [ ] Task 5.3.2 - TaskDispatchSection 重构
- [ ] Task 5.4.1 - Lint 验证
- [ ] Task 5.4.2 - 测试验证
- [ ] Task 5.4.3 - 手动验证

### 9.2 遇到的问题与解决方案

_待开发时填写_

### 9.3 代码审查反馈

_待代码审查时填写_
