# Story 7.8: RightSidebar 重构测试计划

## 文档信息

- **Story**: 7.8 - RightSidebar 组件拆分
- **创建时间**: 2026-01-01
- **更新时间**: 2026-01-01T11:55:00+08:00
- **状态**: ✅ Ready (测试覆盖已完善)
- **目标**: 确保重构后的功能正确且完整

### 测试用例统计

| 类型 | 数量 | 状态 |
|------|------|------|
| P0 契约保护测试 | 3 | ✅ 全部通过 |
| P1 新增覆盖测试 | 12 | ✅ 全部通过 |
| **总计** | **15** (Web 测试总计 305) | ✅ |

### 新增测试文件

1. `apps/web/__tests__/components/RightSidebarDebounce.test.tsx` - C2 契约覆盖
2. `apps/web/__tests__/components/RightSidebarTimestamps.test.tsx` - C4 契约覆盖
3. `apps/web/__tests__/components/RightSidebarYDocFallback.test.tsx` - graph 未就绪时的 yDoc fallback 覆盖（tags/archive/approval）
4. `apps/web/lib/api/__tests__/nodes.test.ts` - `updateNodeProps` sanitize 回归：空字符串不转 `null`（避免后端 Zod 400）

---

## 1. 代码审查摘要

### 1.1 当前源代码分析

**文件**: `apps/web/components/layout/RightSidebar.tsx`

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| 总行数 | 694 行 | <300 行 |
| 职责数量 | 6+ | 1 (编排 + 渲染) |

**当前职责分析**:

| 职责 | 行号范围 | 函数/逻辑 | 建议迁移目标 |
|------|----------|-----------|--------------|
| 构建创建负载 | 36-55 | `buildCreatePayload()` | `useRightSidebarNodeData.ts` |
| 时间戳补全 | 57-76 | `ensureNodeTimestamps()` | `useRightSidebarNodeData.ts` |
| 节点存在性确认 | 108-278 | `ensureNodeExists()` | `useRightSidebarNodeData.ts` |
| X6/Yjs 同步写回 | 280-322 | `syncToGraph()` | `useRightSidebarActions.ts` |
| Props 持久化 debounce | 324-339 | `schedulePropsPersist()` | `useRightSidebarActions.ts` |
| 节点数据获取 | 349-434 | `useEffect` | `useRightSidebarNodeData.ts` |
| 节点数据订阅 | 436-516 | `useEffect` | `useRightSidebarNodeData.ts` |
| 类型变更处理 | 518-546 | `handleTypeChange()` | `useRightSidebarActions.ts` |
| Props 更新处理 | 548-567 | `handlePropsUpdate()` | `useRightSidebarActions.ts` |
| Tags 更新处理 | 569-587 | `handleTagsUpdate()` | `useRightSidebarActions.ts` |
| 归档切换处理 | 589-631 | `handleArchiveToggle()` | `useRightSidebarActions.ts` |
| 审批更新处理 | 633-659 | `handleApprovalUpdate()` | `useRightSidebarActions.ts` |

### 1.2 现有测试代码分析

**测试文件 1**: `apps/web/__tests__/components/RightSidebarEnsureNodeExistsBackfill.test.tsx`

| 测试场景 | 覆盖的关键行为 |
|----------|---------------|
| API props 为空时优先使用本地 props | `ensureNodeExists` 中的 backfill 规则 |
| 自动回填后端 | `updateNodeProps` 被正确调用 |
| 不会用空 props 覆盖本地 | `x6Node.setData` 不以空 props 调用 |

**测试文件 2**: `apps/web/__tests__/components/RightSidebarApprovalUpdate.test.tsx`

| 测试场景 | 覆盖的关键行为 |
|----------|---------------|
| 审批刷新同步到 X6 | `onApprovalUpdate` handler |
| overwrite 模式清空 deliverables | `setData(..., { overwrite: true })` |
| 正确传递 approval 和 deliverables | payload 结构验证 |

### 1.3 关键行为契约

根据 Story 要求，以下行为必须在重构后保持不变：

| 契约 ID | 行为描述 | 验证方式 |
|---------|----------|----------|
| **C1** | `ensureNodeExists` 回填规则：API props 为空时优先使用本地 props | 单测 |
| **C2** | Props 持久化 debounce：使用 `PROPS_UPDATE_DEBOUNCE_MS` (250ms) | 单测 + 手动 |
| **C3** | 审批/交付物同步：使用 `{ overwrite: true }` | 单测 |
| **C4** | 时间戳补全：确保 `createdAt`、`updatedAt`、`creator` | 单测 |
| **C5** | RightSidebarProps 导出兼容 | 编译检查 |
| **C6** | layout/index.ts 导出不变 | 编译检查 |

---

## 2. 测试策略

### 2.1 测试类型分布

```
┌─────────────────────────────────────────────────────────────┐
│                    测试金字塔                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ▲ E2E Tests                              │
│                   ▲▲▲ (手动回归)                            │
│                  ▲▲▲▲▲                                      │
│                                                             │
│               ▲▲▲▲▲▲▲ Integration Tests                     │
│              ▲▲▲▲▲▲▲▲▲ (RightSidebar + hooks)               │
│             ▲▲▲▲▲▲▲▲▲▲▲                                     │
│                                                             │
│          ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ Unit Tests                         │
│         ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ (hooks/utils 独立测试)            │
│        ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 测试优先级

| 优先级 | 测试类型 | 数量 | 说明 |
|--------|----------|------|------|
| **P0** | 契约保护测试 | 2 | 现有测试必须通过 |
| **P1** | 新模块单元测试 | 10+ | 覆盖拆分后的 hooks |
| **P2** | 集成测试 | 5+ | 验证模块协作 |
| **P3** | 手动回归测试 | 6 | 交互验证 |

---

## 3. 详细测试计划

### 3.1 P0: 契约保护测试（现有测试）

#### TC-P0-001: RightSidebarEnsureNodeExistsBackfill

```typescript
// 文件: apps/web/__tests__/components/RightSidebarEnsureNodeExistsBackfill.test.tsx
// 状态: ✅ 已存在，必须继续通过

describe('RightSidebar ensureNodeExists', () => {
  it('prefers local props when API props is empty (prevents wipe) and backfills backend', async () => {
    // 验证点:
    // 1. PropertyPanel 收到的 nodeData.props 是本地 props（非空）
    // 2. updateNodeProps 被调用以回填后端
    // 3. x6Node.setData 不以空 props 调用
  });
});
```

**预期结果**: PASS  
**契约覆盖**: C1

#### TC-P0-002: RightSidebarApprovalUpdate

```typescript
// 文件: apps/web/__tests__/components/RightSidebarApprovalUpdate.test.tsx
// 状态: ✅ 已存在，必须继续通过

describe('RightSidebar approval refresh', () => {
  it('syncs approval refresh to X6 with overwrite so empty deliverables clears', async () => {
    // 验证点:
    // 1. onApprovalUpdate 回调被正确传递
    // 2. x6Node.setData 被调用，包含 { overwrite: true }
    // 3. deliverables 和 approval 正确同步
  });
});
```

**预期结果**: PASS  
**契约覆盖**: C3

---

### 3.2 P1: 新模块单元测试

#### 3.2.1 useRightSidebarNodeData Hook 测试

**文件路径**: `apps/web/__tests__/hooks/right-sidebar/useRightSidebarNodeData.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useRightSidebarNodeData } from '@/hooks/right-sidebar/useRightSidebarNodeData';

describe('useRightSidebarNodeData', () => {
  
  // TC-P1-001: 节点数据初始化
  describe('initialization', () => {
    it('should return null when selectedNodeId is null', () => {
      // Given: selectedNodeId = null
      // When: hook 初始化
      // Then: nodeData = null, isLoading = false
    });

    it('should fetch node data from X6 graph when available', () => {
      // Given: X6 graph 有目标节点
      // When: hook 初始化
      // Then: nodeData 从 X6 获取，不发起 API 请求
    });

    it('should fetch node data from Yjs when X6 unavailable', () => {
      // Given: X6 graph 无目标节点，Yjs 有
      // When: hook 初始化
      // Then: nodeData 从 Yjs 获取
    });

    it('should fetch node data from API as fallback', async () => {
      // Given: X6 和 Yjs 都无目标节点
      // When: hook 初始化
      // Then: 发起 API 请求获取
    });
  });

  // TC-P1-002: ensureNodeExists 行为
  describe('ensureNodeExists', () => {
    it('should prefer local props over empty API props (C1)', async () => {
      // Given: 本地有 props，API 返回空 props
      // When: ensureNodeExists 执行
      // Then: 使用本地 props，触发后端回填
    });

    it('should prefer local tags over empty API tags', async () => {
      // Given: 本地有 tags，API 返回空数组
      // When: ensureNodeExists 执行
      // Then: 使用本地 tags
    });

    it('should create node if not existing in backend', async () => {
      // Given: fetchNode 返回 null
      // When: ensureNodeExists 执行
      // Then: createNode 被调用
    });

    it('should ensure parent exists before child creation (FK constraint)', async () => {
      // Given: 节点有 parentId，父节点不存在
      // When: ensureNodeExists 执行
      // Then: 递归确保父节点存在
    });
  });

  // TC-P1-003: 时间戳补全
  describe('ensureNodeTimestamps', () => {
    it('should add timestamps when missing (C4)', () => {
      // Given: X6 节点无 createdAt/updatedAt
      // When: 补全执行
      // Then: 添加当前时间戳
    });

    it('should preserve existing timestamps', () => {
      // Given: X6 节点已有时间戳
      // When: 补全执行
      // Then: 保留原有时间戳
    });

    it('should add creator when missing', () => {
      // Given: X6 节点无 creator
      // When: 补全执行
      // Then: 使用 resolvedCreatorName
    });
  });

  // TC-P1-004: 数据变更订阅
  describe('data subscription', () => {
    it('should update nodeData on X6 node change:data event', () => {
      // Given: 订阅已建立
      // When: X6 节点数据变更
      // Then: nodeData 更新
    });

    it('should ignore stale updates (older updatedAt)', () => {
      // Given: 当前 nodeData 有较新的 updatedAt
      // When: 收到较旧的更新
      // Then: 忽略更新
    });

    it('should fall back to Yjs subscription when X6 unavailable', () => {
      // Given: 无 X6 graph，有 yDoc
      // When: Yjs 节点变更
      // Then: nodeData 更新
    });
  });
});
```

#### 3.2.2 useRightSidebarActions Hook 测试

**文件路径**: `apps/web/__tests__/hooks/right-sidebar/useRightSidebarActions.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useRightSidebarActions } from '@/hooks/right-sidebar/useRightSidebarActions';

describe('useRightSidebarActions', () => {

  // TC-P1-005: 类型变更
  describe('handleTypeChange', () => {
    it('should reset props when type changes', async () => {
      // Given: 节点类型为 TASK，有 props
      // When: 切换到 REQUIREMENT
      // Then: props 重置为 {}
    });

    it('should sync to X6 graph immediately', async () => {
      // Given: X6 graph 可用
      // When: handleTypeChange 调用
      // Then: x6Node.setData 被调用
    });

    it('should persist to backend (non-blocking)', async () => {
      // Given: 类型切换
      // When: handleTypeChange 完成
      // Then: updateNodeType API 调用（后台）
    });

    it('should clear pending props debounce timer', async () => {
      // Given: 有挂起的 props 更新计时器
      // When: handleTypeChange 调用
      // Then: 计时器被清除
    });
  });

  // TC-P1-006: Props 更新
  describe('handlePropsUpdate', () => {
    it('should sanitize props before sync', async () => {
      // Given: props 包含无效字段
      // When: handlePropsUpdate 调用
      // Then: props 被 sanitizeNodeProps 处理
    });

    it('should sync to X6 immediately (optimistic)', async () => {
      // Given: 有效 props
      // When: handlePropsUpdate 调用
      // Then: x6Node.setData 立即调用（overwrite: true）
    });

    it('should debounce backend persistence (C2)', async () => {
      // Given: PROPS_UPDATE_DEBOUNCE_MS = 250
      // When: 连续调用 handlePropsUpdate 3 次（间隔 < 250ms）
      // Then: updateNodeProps 只调用 1 次（最后一次）
    });

    it('should persist each update if interval > debounce', async () => {
      // Given: 两次调用间隔 > 250ms
      // When: handlePropsUpdate 调用两次
      // Then: updateNodeProps 调用两次
    });
  });

  // TC-P1-007: Tags 更新
  describe('handleTagsUpdate', () => {
    it('should update local state immediately', () => {
      // Given: 当前有 tags
      // When: handleTagsUpdate 调用新 tags
      // Then: nodeData.tags 立即更新
    });

    it('should sync to X6 via updateData', () => {
      // Given: X6 节点可用
      // When: handleTagsUpdate 调用
      // Then: x6Node.updateData 调用
    });

    it('should persist to backend', async () => {
      // Given: 新 tags
      // When: handleTagsUpdate 调用
      // Then: updateNodeTags API 调用
    });
  });

  // TC-P1-008: 归档切换
  describe('handleArchiveToggle', () => {
    it('should call archiveNode API when archiving', async () => {
      // Given: nextIsArchived = true
      // When: handleArchiveToggle 调用
      // Then: archiveNode API 调用
    });

    it('should call unarchiveNode API when restoring', async () => {
      // Given: nextIsArchived = false
      // When: handleArchiveToggle 调用
      // Then: unarchiveNode API 调用
    });

    it('should hide X6 node and clear selection on archive', async () => {
      // Given: 归档成功
      // When: 归档完成
      // Then: x6Node.hide()、graph.cleanSelection()、onClose() 调用
    });

    it('should show X6 node on restore', async () => {
      // Given: 取消归档成功
      // When: 恢复完成
      // Then: x6Node.show() 调用
    });

    it('should not update state on API failure', async () => {
      // Given: API 返回失败
      // When: handleArchiveToggle 调用
      // Then: nodeData 状态不变
    });
  });

  // TC-P1-009: 审批更新
  describe('handleApprovalUpdate', () => {
    it('should sync deliverables to X6 with overwrite (C3)', async () => {
      // Given: 新的 deliverables 数组
      // When: handleApprovalUpdate 调用
      // Then: x6Node.setData(..., { overwrite: true })
    });

    it('should correctly clear deliverables when empty array', async () => {
      // Given: deliverables = []
      // When: handleApprovalUpdate 调用
      // Then: X6 节点的 deliverables 清空（非合并）
    });

    it('should update approval status in X6 node', async () => {
      // Given: 新的 approval 对象
      // When: handleApprovalUpdate 调用
      // Then: X6 节点包含新 approval
    });

    it('should merge deliverables into props', async () => {
      // Given: 现有 props
      // When: handleApprovalUpdate 调用
      // Then: props.deliverables 更新
    });
  });

  // TC-P1-010: syncToGraph 核心函数
  describe('syncToGraph', () => {
    it('should update X6 node when graph available', () => {
      // Given: 有效 X6 graph
      // When: syncToGraph 调用
      // Then: x6Node.setData 调用 with overwrite: true
    });

    it('should fallback to Yjs when X6 unavailable', () => {
      // Given: 无 X6，有 yDoc
      // When: syncToGraph 调用
      // Then: yDoc.transact() 调用
    });

    it('should add timestamps on sync', () => {
      // Given: 同步数据
      // When: syncToGraph 调用
      // Then: updatedAt 设置为当前时间
    });
  });
});
```

---

### 3.3 P2: 集成测试

**文件路径**: `apps/web/__tests__/components/RightSidebar.integration.test.tsx`

```typescript
import { render, waitFor, act, fireEvent } from '@testing-library/react';
import { RightSidebar } from '@/components/layout/RightSidebar';

describe('RightSidebar Integration', () => {

  // TC-P2-001: 完整流程 - 节点选择到属性显示
  it('should display node properties when node selected', async () => {
    // Given: 配置好的 graph 和 yDoc
    // When: RightSidebar 渲染，传入 selectedNodeId
    // Then: PropertyPanel 接收到正确的 nodeData
  });

  // TC-P2-002: 完整流程 - 类型切换
  it('should handle full type change flow', async () => {
    // Given: 已选中节点
    // When: 调用 onTypeChange
    // Then: 
    // - nodeData.type 更新
    // - nodeData.props 重置
    // - X6 节点更新
    // - API 调用
  });

  // TC-P2-003: 完整流程 - Props 编辑
  it('should handle full props update flow with debounce', async () => {
    // Given: 已选中任务节点
    // When: 连续修改 props 3 次
    // Then:
    // - 每次 UI 立即更新
    // - API 只调用 1 次（最后一次）
  });

  // TC-P2-004: 完整流程 - 归档恢复
  it('should handle archive and restore flow', async () => {
    // Given: 已选中节点
    // When: 归档 → 恢复
    // Then:
    // - 归档：节点隐藏，面板关闭
    // - 恢复：节点显示
  });

  // TC-P2-005: 边界情况 - 节点切换
  it('should handle rapid node selection changes', async () => {
    // Given: 多个节点
    // When: 快速切换选中节点
    // Then: 最终显示正确节点数据，无竞态
  });
});
```

---

### 3.4 P3: 手动回归测试

| 测试 ID | 测试场景 | 步骤 | 预期结果 | 验收标准 |
|---------|----------|------|----------|----------|
| **MR-001** | 节点切换 | 1. 选中节点 A<br>2. 查看属性面板<br>3. 选中节点 B<br>4. 查看属性面板 | 属性面板正确切换显示对应节点 | AC#4 |
| **MR-002** | 类型切换 | 1. 选中普通节点<br>2. 切换为任务<br>3. 切换为需求<br>4. 切换回普通 | 类型切换顺利，props 正确重置 | AC#4 |
| **MR-003** | 属性编辑 | 1. 选中任务节点<br>2. 快速连续编辑多个字段<br>3. 打开 DevTools Network | 不会产生过量 API 调用（debounce 生效） | AC#2 (C2) |
| **MR-004** | 标签编辑 | 1. 选中节点<br>2. 添加标签<br>3. 删除标签<br>4. 刷新页面 | 标签正确保存和恢复 | AC#4 |
| **MR-005** | 归档/恢复 | 1. 选中节点<br>2. 点击归档<br>3. 确认<br>4. 通过筛选器恢复 | 归档：节点隐藏；恢复：节点显示 | AC#4 |
| **MR-006** | 审批交付物更新 | 1. 选中有审批的任务<br>2. 上传交付物<br>3. 删除交付物<br>4. 检查 Yjs 同步 | 交付物正确同步到 X6/Yjs | AC#2 (C3) |

---

## 4. 测试覆盖率目标

### 4.1 代码覆盖率

| 模块 | 语句覆盖 | 分支覆盖 | 函数覆盖 |
|------|----------|----------|----------|
| `useRightSidebarNodeData.ts` | >80% | >75% | >90% |
| `useRightSidebarActions.ts` | >80% | >75% | >90% |
| `RightSidebar.tsx` (重构后) | >70% | >65% | >85% |

### 4.2 契约覆盖率

| 契约 ID | 单测覆盖 | 集成测试 | 手动验证 | 状态 |
|---------|----------|----------|----------|------|
| C1 | ✅ `RightSidebarEnsureNodeExistsBackfill.test.tsx` | ✅ | ✅ MR-003 | ✅ 已覆盖 |
| C2 | ✅ `RightSidebarDebounce.test.tsx` (3 tests) | ✅ TC-P2-003 | ✅ MR-003 | ✅ **新增** |
| C3 | ✅ `RightSidebarApprovalUpdate.test.tsx` | ✅ | ✅ MR-006 | ✅ 已覆盖 |
| C4 | ✅ `RightSidebarTimestamps.test.tsx` (5 tests) | ✅ | - | ✅ **新增** |
| C5 | ✅ 编译检查 | ✅ | - | ✅ 已覆盖 |
| C6 | ✅ 编译检查 | ✅ | - | ✅ 已覆盖 |

---

## 5. 测试执行顺序

### 5.1 重构前验证

```bash
# 1. 确保现有测试全部通过
pnpm --filter @cdm/web test -- --run

# 2. 记录当前测试数量和覆盖率作为基线
pnpm --filter @cdm/web test:coverage -- --run
```

### 5.2 重构中验证（每个 Task 后）

```bash
# Task 2 完成后：验证 useRightSidebarNodeData
pnpm --filter @cdm/web test -- --run --testNamePattern="useRightSidebarNodeData"

# Task 3 完成后：验证 useRightSidebarActions
pnpm --filter @cdm/web test -- --run --testNamePattern="useRightSidebarActions"

# 始终确保契约测试通过
pnpm --filter @cdm/web test -- --run --testNamePattern="RightSidebar"
```

### 5.3 重构后验证

```bash
# 1. 全量测试
pnpm --filter @cdm/web test -- --run

# 2. 覆盖率报告
pnpm --filter @cdm/web test:coverage -- --run

# 3. 类型检查
pnpm --filter @cdm/web typecheck

# 4. Lint 检查
pnpm --filter @cdm/web lint
```

---

## 6. 测试数据准备

### 6.1 Mock 数据模板

```typescript
// 通用 X6 节点 mock
export const mockX6Node = {
  id: 'node-1',
  isNode: () => true,
  getData: vi.fn(() => ({
    label: 'Test Node',
    nodeType: NodeType.TASK,
    props: { assigneeId: 'user-1', status: 'todo' },
    tags: ['tag1'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    creator: 'Test User',
  })),
  setData: vi.fn(),
  updateData: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  hide: vi.fn(),
  show: vi.fn(),
};

// 通用 Graph mock
export const mockGraph = {
  getCellById: vi.fn(() => mockX6Node),
  cleanSelection: vi.fn(),
};

// API 响应 mock
export const mockNodeResponse = {
  id: 'node-1',
  label: 'Test Node',
  type: NodeType.TASK,
  x: 0,
  y: 0,
  width: 120,
  height: 50,
  graphId: 'g1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  creator: 'Test User',
  props: { assigneeId: 'user-1', status: 'todo' },
  tags: ['tag1'],
  isArchived: false,
  archivedAt: null,
};
```

---

## 7. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 拆分后 hook 依赖循环 | 中 | 高 | 仔细设计接口，先定义再实现 |
| debounce 时序问题 | 中 | 中 | 使用 fake timers，精确控制时间 |
| Yjs mock 复杂度 | 高 | 中 | 创建可复用的 Yjs mock factory |
| 现有测试脆弱性 | 低 | 高 | 先加固现有测试再重构 |

---

## 8. 附录

### 8.1 相关文档

- [Story 7.8 定义](./story-7-8-right-sidebar-refactor.md)
- [架构文档 - Testability](../architecture.md#testability--quality)
- [重构提案](../analysis/refactoring-proposal-2025-12-28.md)

### 8.2 命令速查

```bash
# 运行所有 Web 测试
pnpm --filter @cdm/web test -- --run

# 运行特定测试
pnpm --filter @cdm/web test -- --run --testNamePattern="RightSidebar"

# 监视模式
pnpm --filter @cdm/web test -- --watch

# 覆盖率报告
pnpm --filter @cdm/web test:coverage -- --run

# 类型检查
pnpm --filter @cdm/web typecheck
```
