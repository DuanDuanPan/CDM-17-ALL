# Tech-Spec: Story 8.1 节点折叠/展开 (Node Collapse & Expand)

**Created:** 2026-01-04
**Status:** Ready for Development
**Story:** [8-1-node-collapse-expand](./story-8-1-node-collapse-expand.md)

---

## Overview

### Problem Statement

在处理 500-5000+ 节点的大规模图谱时，用户难以专注于当前工作分支，视觉复杂度过高导致认知负担和操作效率下降。需要提供折叠/展开机制让用户能够隐藏不相关的子树，聚焦当前关注区域。

### Solution

实现节点折叠/展开功能，允许用户：
1. 通过点击图标或快捷键折叠/展开节点子树
2. 折叠后显示子节点数量徽章
3. 递归折叠所有后代节点
4. 持久化折叠状态到用户会话
5. 搜索定位时自动展开折叠的祖先路径

### Scope

**In Scope:**
- 折叠/展开交互（图标点击、快捷键）
- 子节点数量徽章显示
- 递归折叠/展开
- 本地存储持久化（localStorage/IndexedDB）
- 搜索结果自动展开路径
- Yjs 状态同步（协同场景）

**Out of Scope:**
- 智能自动折叠（Story 8.9）
- 大纲视图折叠联动（Story 8.4）
- 演示模式自动折叠（Story 8.12）

---

## Context for Development

### Codebase Patterns

#### 1. Yjs-First 单向数据流 (CRITICAL)
```
用户操作 → X6 Node.setData() → GraphSyncManager → Yjs Map.set() → Hocuspocus 同步 → 后端 Hooks → 所有客户端更新 → React 重渲染
```
**禁止**: 直接 `setState` 后调用 API 保存（导致协作脑裂）

#### 2. Hook-First 逻辑封装
所有业务逻辑必须下沉到自定义 hooks，组件保持纯净：
- 参考: `useGraphEvents.ts`, `useGraphHotkeys.ts`, `useGraphSelection.ts`

#### 3. X6 图形操作模式
```typescript
// 节点隐藏/显示
cell.setVisible(boolean);

// 获取子节点
graph.getSuccessors(cell);  // 所有后代
graph.getNeighbors(cell, { outgoing: true });  // 直接子节点

// 获取相关边
graph.getConnectedEdges(cell);
```

#### 4. 组件结构 (Feature-Sliced)
```
apps/web/components/graph/
├── hooks/         # 逻辑封装
├── parts/         # UI 子组件
└── GraphComponent.tsx  # 主容器组件
```

### Files to Reference

| 文件 | 作用 | 修改类型 |
|------|------|----------|
| `packages/types/src/index.ts` | `NodeData.collapsed` 字段 **已存在** (L8) | 无需修改 |
| `apps/web/components/graph/hooks/useNodeCollapse.ts` | 折叠/展开核心逻辑 | **NEW** |
| `apps/web/hooks/useCollapseStorage.ts` | localStorage 缓存（可选） | **NEW** |
| `packages/ui/src/collapse-toggle.tsx` | 折叠切换按钮 | **NEW** |
| `apps/web/components/nodes/ChildCountBadge.tsx` | 子节点数量徽章 | **NEW** |
| `apps/web/components/nodes/MindNode.tsx` | 节点渲染 | **MODIFY**: 集成折叠控件 |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | 快捷键处理 | **MODIFY**: 添加折叠快捷键 |
| `apps/web/components/graph/parts/NodeContextMenu.tsx` | Node 右键菜单 | **MODIFY**: 添加折叠菜单项 |
| `apps/web/components/graph/GraphComponent.tsx` | Graph 容器 | **MODIFY**: 注入 collapse/expand handlers |
| `apps/web/contexts/GraphContext.tsx` | 导航/定位 | **MODIFY**: 导航时自动展开祖先路径 |

### Technical Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 状态存储 | Yjs (primary, persisted) + localStorage (optional cache) | `collapsed` 作为共享图谱状态写入 Yjs（由后端持久化）；localStorage 仅用于快速恢复/离线兜底，避免双源冲突 |
| 折叠图标位置 | 节点左侧 | XMind 惯例，用户认知一致 |
| 快捷键 | `Cmd/Ctrl + [` 折叠, `Cmd/Ctrl + ]` 展开 | 避免与现有快捷键冲突 |
| 动画库 | CSS transition (200ms ease-out) | 无需引入额外依赖 |

---

## Implementation Plan

### Phase 1: 核心 Hook 实现

#### Task 1.1: 创建 `useNodeCollapse` hook
**文件**: `apps/web/components/graph/hooks/useNodeCollapse.ts` [NEW]

```typescript
interface UseNodeCollapseOptions {
  graph: Graph | null;
  ydoc: Y.Doc | null;
}

interface UseNodeCollapseReturn {
  isCollapsed: (nodeId: string) => boolean;
  toggleCollapse: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  collapseDescendants: (nodeId: string) => void;
  expandPathToNode: (nodeId: string) => void;
  getChildCount: (nodeId: string) => number;
}

export function useNodeCollapse({
  graph,
  ydoc,
}: UseNodeCollapseOptions): UseNodeCollapseReturn
```

**实现要点**:
1. 本地入口以 X6 `node.setData({ collapsed })` 为准（GraphSyncManager 负责同步到 Yjs），避免在 UI 侧直接写 `ydoc.getMap('nodes')`
2. 使用 `graph.getSuccessors()` 获取所有后代
3. 批量调用 `cell.setVisible(false)` 隐藏节点和边
4. 默认**不触发布局重排**（保持节点坐标，满足 AC2）；如需“折叠后收缩布局”应另开 Story/Feature Flag

#### Task 1.2: 创建 `useCollapseStorage` hook（可选缓存）
**文件**: `apps/web/hooks/useCollapseStorage.ts` [NEW]

```typescript
interface CollapsePreference {
  graphId: string;
  collapsedNodes: string[];  // nodeIds
  lastUpdated: string;
}

export function useCollapseStorage(graphId: string)
```

**存储 key**: `cdm-collapse-pref-${graphId}`
> 说明：以 Yjs 持久化状态为真相源；localStorage 仅用于启动加速/离线兜底，不应在已完成 `onSynced` 的协作场景覆盖 Yjs。

---

### Phase 2: UI 组件实现

#### Task 2.1: 创建 `CollapseToggle` 按钮
**文件**: `packages/ui/src/collapse-toggle.tsx` [NEW]

```typescript
interface CollapseToggleProps {
  isCollapsed: boolean;
  childCount: number;
  onToggle: () => void;
  className?: string;
}
```

**视觉规范**:
- 图标: Lucide `ChevronRight` (折叠) / `ChevronDown` (展开)
- 尺寸: 16x16px
- 颜色: `text-muted-foreground`
- 过渡: `transition-transform duration-200`

#### Task 2.2: 创建 `ChildCountBadge` 组件
**文件**: `apps/web/components/nodes/ChildCountBadge.tsx` [NEW]

```typescript
interface ChildCountBadgeProps {
  count: number;
  onClick: () => void;
}
```

**视觉规范**:
- 背景: `bg-primary/10 backdrop-blur-sm` (glassmorphism)
- 文本: `+{count}` 格式
- 尺寸: 自适应内容
- 位置: 折叠节点右侧

#### Task 2.3: 修改 `MindNode.tsx` 集成折叠控件
**文件**: `apps/web/components/nodes/MindNode.tsx` [MODIFY]

在节点渲染中添加:
```tsx
{hasChildren && (
  <div className="absolute -left-6 top-1/2 -translate-y-1/2">
    <CollapseToggle
      isCollapsed={nodeData.collapsed ?? false}
      childCount={childCount}
      onToggle={handleToggleCollapse}
    />
  </div>
)}
{nodeData.collapsed && childCount > 0 && (
  <ChildCountBadge count={childCount} onClick={handleExpand} />
)}
```

---

### Phase 3: 快捷键与事件处理

#### Task 3.1: 添加折叠快捷键
**文件**: `apps/web/components/graph/hooks/useGraphHotkeys.ts` [MODIFY]

添加快捷键处理:
```typescript
// Cmd/Ctrl + [ : 折叠当前节点
if (e.key === '[' && (e.metaKey || e.ctrlKey)) {
  e.preventDefault();
  collapseNode(selectedNodeId);
}

// Cmd/Ctrl + ] : 展开当前节点  
if (e.key === ']' && (e.metaKey || e.ctrlKey)) {
  e.preventDefault();
  expandNode(selectedNodeId);
}

// Option/Alt + Cmd/Ctrl + [ : 递归折叠所有后代
if (e.key === '[' && e.altKey && (e.metaKey || e.ctrlKey)) {
  e.preventDefault();
  collapseDescendants(selectedNodeId);
}
```

#### Task 3.2: 添加右键菜单选项
**文件**: `apps/web/components/graph/parts/NodeContextMenu.tsx` [MODIFY] + `apps/web/components/graph/GraphComponent.tsx` [MODIFY]

添加菜单项:
- "折叠子节点" (有子节点且未折叠时显示)
- "展开子节点" (已折叠时显示)
- "折叠所有后代" (有后代时显示)

---

### Phase 4: 搜索集成

#### Task 4.1: 修改搜索结果处理
**文件**: `apps/web/contexts/GraphContext.tsx` [MODIFY]

定位到搜索结果前，展开祖先路径:
```typescript
const handleSearchResultClick = (nodeId: string) => {
  // 1. 展开通往目标节点的路径
  expandPathToNode(nodeId);
  
  // 2. 等待动画完成后定位
  setTimeout(() => {
    graph.centerCell(graph.getCellById(nodeId));
  }, 250);
};
```

---

### Phase 5: 导出到 hooks/index.ts

**文件**: `apps/web/components/graph/hooks/index.ts` [MODIFY]

添加导出:
```typescript
export { useNodeCollapse } from './useNodeCollapse';
export type { UseNodeCollapseOptions, UseNodeCollapseReturn } from './useNodeCollapse';
```

---

## Acceptance Criteria

- [ ] **AC1**: 点击折叠图标隐藏所有子节点，显示 "+N" 徽章
- [ ] **AC2**: 再次点击展开恢复子节点显示，保持原有布局
- [ ] **AC3**: `Cmd+Alt+[` 递归折叠所有后代节点
- [ ] **AC4**: 刷新页面后折叠状态保持（同一用户、同一图谱）
- [ ] **AC5**: 搜索定位到被折叠节点时，自动展开祖先路径

---

## Additional Context

### Dependencies

| 依赖 | 用途 | 已安装 |
|------|------|--------|
| `@antv/x6` | 图形操作 API | ✅ |
| `yjs` | 状态同步 | ✅ |
| `lucide-react` | 图标 | ✅ |

### Testing Strategy

#### 单元测试
- `useNodeCollapse.spec.ts`: 折叠/展开逻辑、子节点计数
- `CollapseToggle.spec.tsx`: 组件渲染、点击事件

#### E2E 测试 (Playwright)
```typescript
test('should collapse and expand node', async ({ page }) => {
  // 1. 点击折叠图标
  await page.click('[data-testid="collapse-toggle"]');
  
  // 2. 验证子节点隐藏
  await expect(page.locator('[data-node-id="child-1"]')).not.toBeVisible();
  
  // 3. 验证徽章显示
  await expect(page.locator('.child-count-badge')).toHaveText('+3');
  
  // 4. 展开
  await page.click('[data-testid="collapse-toggle"]');
  await expect(page.locator('[data-node-id="child-1"]')).toBeVisible();
});

test('should expand path when searching collapsed node', async ({ page }) => {
  // 1. 折叠父节点
  // 2. 搜索子节点
  // 3. 验证父节点自动展开
});
```

### Performance Considerations

1. **批量操作**: 折叠/展开使用 `graph.batchUpdate()` 包装避免多次重渲染
2. **子节点计算缓存**: 使用 `useMemo` 缓存 `getChildCount` 结果
3. **节流**: 快速连续折叠/展开操作节流 100ms

### Notes

- `NodeData.collapsed` 字段已在类型定义中存在，无需修改类型
- 协作场景下，折叠状态写入 Yjs 并由后端持久化；默认所有协作者视图一致（如需“每用户独立”，应改用 awareness 并另开 Story）
- 折叠状态不影响节点业务数据（props/审批/标签等），仅为视图层概念

---

**Next Step:** 运行 `dev-story` 或 `quick-dev` 开始实现
