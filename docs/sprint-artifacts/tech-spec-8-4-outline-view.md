# Tech-Spec: Story 8.4 大纲/轮廓视图 (Outline View)

**Created:** 2026-01-07
**Status:** Ready for Development
**Story Link:** [story-8-4-outline-view.md](./story-8-4-outline-view.md)

---

## Overview

### Problem Statement

在处理大规模图谱（500-5000+ 节点）时，用户仅依赖画布视图难以快速理解层级结构、精准定位和高效重组节点。需要一个树形大纲视图作为辅助导航工具。

### Solution

在左侧边栏添加"大纲"Tab，提供树形视图来：
1. 以文本列表形式展示节点层级结构
2. 点击跳转到画布对应节点
3. 拖拽重排父子关系（同步到图谱/Yjs）
4. 独立的折叠/展开控制（与画布折叠状态分离）

### Scope (In/Out)

| ✅ In Scope | ❌ Out of Scope |
|------------|----------------|
| 大纲 Tab 入口（LeftSidebar） | 大纲内直接编辑节点文本 |
| 树形节点列表渲染 | 大纲内右键上下文菜单 |
| 点击跳转定位（centerNode） | 大纲内搜索过滤（用全局搜索） |
| 拖拽重排父子关系 | 热力图/密度指示 |
| 大纲折叠/展开 | |
| 与画布实时双向同步 | |

---

## Context for Development

### Codebase Patterns

**1. Hook-First Pattern (架构强制):**
所有 UI 逻辑必须封装在 hooks 中，组件保持纯展示。

```typescript
// Pattern from useNodeCollapse.ts
export function useOutlineData({ graph, isReady }: UseOutlineDataOptions): UseOutlineDataReturn {
  // 所有状态和事件处理在 hook 内
  // 组件只接收返回值并渲染
}
```

**2. Tree Traversal Pattern (复用 useNodeCollapse):**

```typescript
// 从 useNodeCollapse.ts 的核心 API
const getDirectChildren = (nodeId: string): Node[] => { ... }
const getAllDescendants = (nodeId: string): Node[] => { ... }
const getAncestors = (nodeId: string): Node[] => { ... }
```

**3. LeftSidebar Tab Pattern:**

```typescript
// LeftSidebar.tsx:33-39
const navItems: NavItem[] = [
  { id: 'components', icon: <Shapes />, label: '组件' },
  { id: 'templates', icon: <LayoutGrid />, label: '模板' },
  // 新增：
  { id: 'outline', icon: <ListTree />, label: '大纲' },
];
```

**4. Event-Driven Sync Pattern:**

```typescript
// 监听 graph 事件实现双向同步
graph.on('node:added', handleNodeAdded);
graph.on('node:removed', handleNodeRemoved);
graph.on('node:change:data', handleDataChange);
```

### Files to Reference

| File | Purpose |
|------|---------|
| `apps/web/components/graph/hooks/useNodeCollapse.ts` | 树遍历算法、事件监听模式 |
| `apps/web/components/graph/hooks/useZoomShortcuts.ts` | centerNode 实现 |
| `apps/web/components/layout/LeftSidebar.tsx` | Tab 结构、面板渲染 |
| `apps/web/components/graph/GraphComponent.tsx` | hook 集成点 |
| `apps/web/components/graph/parts/index.ts` | 组件导出模式 |

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **TD-1: 折叠状态独立** | 大纲折叠使用本地 state | 避免与画布 Story 8.1 折叠状态冲突；两视图服务不同用途 |
| **TD-2: 数据源** | graph.getNodes() + 边关系 | 与 Yjs 最终一致；复用现有 getDirectChildren 等 API |
| **TD-3: 拖拽库** | @dnd-kit/sortable | 项目已安装；内置可访问性和动画 |
| **TD-4: 更新边关系** | 通过 graph.addEdge/removeEdge | 触发 node:change 同步到 Yjs |

---

## Implementation Plan

### Phase 1: useOutlineData Hook [~150 LOC]

**文件**: `apps/web/components/graph/hooks/useOutlineData.ts`

```typescript
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Graph, Node, Edge } from '@antv/x6';
import { isDependencyEdge } from '@/lib/edgeValidation';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export interface OutlineNode {
  id: string;
  label: string;
  type: string;
  children: OutlineNode[];
  hasChildren: boolean;
  depth: number;
}

export interface UseOutlineDataOptions {
  graph: Graph | null;
  isReady: boolean;
}

export interface UseOutlineDataReturn {
  /** 树形大纲数据 */
  outlineData: OutlineNode[];
  /** 刷新数据（手动触发） */
  refresh: () => void;
  /** 重排节点：将 nodeId 移动到 newParentId 下的 siblingIndex 位置 */
  reorderNode: (nodeId: string, newParentId: string | null, siblingIndex: number) => void;
}

// ─────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────

export function useOutlineData({
  graph,
  isReady,
}: UseOutlineDataOptions): UseOutlineDataReturn {
  const [version, setVersion] = useState(0);
  
  // ═══════════════════════════════════════════════
  // Helper: Get direct children (copy from useNodeCollapse)
  // ═══════════════════════════════════════════════
  const getDirectChildren = useCallback((nodeId: string): Node[] => {
    if (!graph) return [];
    const node = graph.getCellById(nodeId);
    if (!node?.isNode()) return [];

    const outgoingEdges = graph.getOutgoingEdges(node as Node) ?? [];
    const children: Node[] = [];
    const seen = new Set<string>();

    outgoingEdges.forEach((edge) => {
      if (isDependencyEdge(edge)) return;
      const targetId = edge.getTargetCellId();
      if (!targetId || seen.has(targetId)) return;
      const targetCell = graph.getCellById(targetId);
      if (!targetCell?.isNode()) return;
      seen.add(targetId);
      children.push(targetCell as Node);
    });

    return children;
  }, [graph]);

  // ═══════════════════════════════════════════════
  // Helper: Find root nodes (no parent)
  // ═══════════════════════════════════════════════
  const getRootNodes = useCallback((): Node[] => {
    if (!graph) return [];
    const allNodes = graph.getNodes();
    
    // Build set of all node IDs that are children
    const childIds = new Set<string>();
    allNodes.forEach((node) => {
      const children = getDirectChildren(node.id);
      children.forEach((c) => childIds.add(c.id));
    });
    
    // Root nodes have no parent (not in childIds)
    return allNodes.filter((n) => !childIds.has(n.id));
  }, [graph, getDirectChildren]);

  // ═══════════════════════════════════════════════
  // Build tree recursively
  // ═══════════════════════════════════════════════
  const buildTree = useCallback((nodeId: string, depth: number, visited: Set<string>): OutlineNode | null => {
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);

    const node = graph?.getCellById(nodeId);
    if (!node?.isNode()) return null;
    
    const data = (node as Node).getData() || {};
    const children = getDirectChildren(nodeId);
    
    const childNodes = children
      .map((c) => buildTree(c.id, depth + 1, visited))
      .filter((n): n is OutlineNode => n !== null);

    return {
      id: nodeId,
      label: data.label || 'Untitled',
      type: data.type || 'topic',
      children: childNodes,
      hasChildren: children.length > 0,
      depth,
    };
  }, [graph, getDirectChildren]);

  // ═══════════════════════════════════════════════
  // Computed: Outline data (memoized)
  // ═══════════════════════════════════════════════
  const outlineData = useMemo((): OutlineNode[] => {
    if (!graph || !isReady) return [];
    // version 用于强制刷新
    void version;
    
    const roots = getRootNodes();
    const visited = new Set<string>();
    
    return roots
      .map((r) => buildTree(r.id, 0, visited))
      .filter((n): n is OutlineNode => n !== null);
  }, [graph, isReady, version, getRootNodes, buildTree]);

  // ═══════════════════════════════════════════════
  // Refresh trigger
  // ═══════════════════════════════════════════════
  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  // ═══════════════════════════════════════════════
  // Reorder node (update parent-child edge)
  // ═══════════════════════════════════════════════
  const reorderNode = useCallback((
    nodeId: string,
    newParentId: string | null,
    _siblingIndex: number
  ) => {
    if (!graph || !isReady) return;
    
    const node = graph.getCellById(nodeId);
    if (!node?.isNode()) return;
    
    // 1. Remove existing hierarchical edges to this node (as target)
    const incomingEdges = graph.getIncomingEdges(node as Node) ?? [];
    incomingEdges.forEach((edge) => {
      if (!isDependencyEdge(edge)) {
        graph.removeEdge(edge.id);
      }
    });
    
    // 2. Create new edge if newParentId is provided
    if (newParentId) {
      const parent = graph.getCellById(newParentId);
      if (parent?.isNode()) {
        graph.addEdge({
          source: { cell: newParentId },
          target: { cell: nodeId },
          // Use existing edge style
          attrs: {
            line: {
              stroke: '#a0aec0',
              strokeWidth: 1,
            },
          },
        });
      }
    }
    
    // 3. Update node.data.parentId for consistency
    const data = (node as Node).getData() || {};
    (node as Node).setData({ ...data, parentId: newParentId || undefined });
    
    // 4. Trigger refresh
    refresh();
  }, [graph, isReady, refresh]);

  // ═══════════════════════════════════════════════
  // Listen to graph changes for auto-refresh
  // ═══════════════════════════════════════════════
  useEffect(() => {
    if (!graph || !isReady) return;

    const handleChange = () => {
      // Debounce could be added here for performance
      refresh();
    };

    graph.on('node:added', handleChange);
    graph.on('node:removed', handleChange);
    graph.on('edge:added', handleChange);
    graph.on('edge:removed', handleChange);
    graph.on('node:change:data', handleChange);

    return () => {
      graph.off('node:added', handleChange);
      graph.off('node:removed', handleChange);
      graph.off('edge:added', handleChange);
      graph.off('edge:removed', handleChange);
      graph.off('node:change:data', handleChange);
    };
  }, [graph, isReady, refresh]);

  return {
    outlineData,
    refresh,
    reorderNode,
  };
}
```

**Export in `hooks/index.ts`:**

```typescript
export { useOutlineData } from './useOutlineData';
export type { OutlineNode, UseOutlineDataOptions, UseOutlineDataReturn } from './useOutlineData';
```

---

### Phase 2: OutlineItem Component [~80 LOC]

**文件**: `apps/web/components/graph/parts/OutlineItem.tsx`

```typescript
'use client';

import React, { memo } from 'react';
import { ChevronRight, ChevronDown, Circle, CheckSquare, Box } from 'lucide-react';
import { cn } from '@cdm/ui';
import type { OutlineNode } from '../hooks/useOutlineData';

interface OutlineItemProps {
  node: OutlineNode;
  isSelected: boolean;
  isExpanded: boolean;
  onClick: (nodeId: string) => void;
  onToggle: (nodeId: string) => void;
  onDragStart: (e: React.DragEvent, nodeId: string) => void;
  onDragOver: (e: React.DragEvent, nodeId: string) => void;
  onDrop: (e: React.DragEvent, nodeId: string) => void;
  dragOverId: string | null;
}

const typeIcons: Record<string, React.ElementType> = {
  topic: Circle,
  task: CheckSquare,
  pbs: Box,
};

export const OutlineItem = memo(function OutlineItem({
  node,
  isSelected,
  isExpanded,
  onClick,
  onToggle,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverId,
}: OutlineItemProps) {
  const TypeIcon = typeIcons[node.type] || Circle;
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
  
  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  };

  return (
    <div
      data-testid={`outline-item-${node.id}`}
      className={cn(
        'flex items-center gap-1 h-8 px-2 cursor-pointer rounded transition-colors',
        'hover:bg-gray-50',
        isSelected && 'bg-blue-50',
        dragOverId === node.id && 'border-t-2 border-blue-500'
      )}
      style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
      draggable
      onClick={() => onClick(node.id)}
      onDragStart={(e) => onDragStart(e, node.id)}
      onDragOver={(e) => onDragOver(e, node.id)}
      onDrop={(e) => onDrop(e, node.id)}
    >
      {/* Collapse toggle */}
      {node.hasChildren ? (
        <button
          type="button"
          className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
          onClick={handleChevronClick}
          aria-label={isExpanded ? '折叠' : '展开'}
        >
          <ChevronIcon className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="w-4" />
      )}
      
      {/* Type icon */}
      <TypeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      
      {/* Label */}
      <span className="text-sm text-gray-700 truncate flex-1">
        {node.label}
      </span>
    </div>
  );
});
```

---

### Phase 3: OutlinePanel Component [~120 LOC]

**文件**: `apps/web/components/graph/parts/OutlinePanel.tsx`

```typescript
'use client';

import React, { useCallback, useState } from 'react';
import type { OutlineNode } from '../hooks/useOutlineData';
import { OutlineItem } from './OutlineItem';

interface OutlinePanelProps {
  data: OutlineNode[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onReorder: (nodeId: string, newParentId: string | null, index: number) => void;
}

export function OutlinePanel({
  data,
  selectedNodeId,
  onNodeClick,
  onReorder,
}: OutlinePanelProps) {
  // Local collapse state (independent from canvas collapse)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  // Drag state
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // ═══════════════════════════════════════════════
  // Drag Handlers
  // ═══════════════════════════════════════════════
  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    setDraggedId(nodeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nodeId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(nodeId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    setDragOverId(null);
    
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetNodeId) return;
    
    // Move source node to become child of target
    // Index 0 = insert as first child (simplified; could add sibling logic)
    onReorder(sourceId, targetNodeId, 0);
    setDraggedId(null);
  }, [onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
    setDraggedId(null);
  }, []);

  // ═══════════════════════════════════════════════
  // Recursive render
  // ═══════════════════════════════════════════════
  const renderNode = useCallback((node: OutlineNode): React.ReactNode => {
    const isExpanded = !collapsedIds.has(node.id);
    const isDragging = draggedId === node.id;

    return (
      <div
        key={node.id}
        className={isDragging ? 'opacity-50' : ''}
        onDragEnd={handleDragEnd}
      >
        <OutlineItem
          node={node}
          isSelected={selectedNodeId === node.id}
          isExpanded={isExpanded}
          onClick={onNodeClick}
          onToggle={toggleCollapse}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          dragOverId={dragOverId}
        />
        {isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map(renderNode)}
          </div>
        )}
      </div>
    );
  }, [
    collapsedIds,
    selectedNodeId,
    draggedId,
    dragOverId,
    onNodeClick,
    toggleCollapse,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  ]);

  if (data.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-8">
        暂无节点
      </p>
    );
  }

  return (
    <div className="space-y-0.5" data-testid="outline-panel">
      {data.map(renderNode)}
    </div>
  );
}
```

**Export in `parts/index.ts`:**

```typescript
export { OutlinePanel } from './OutlinePanel';
export { OutlineItem } from './OutlineItem';
```

---

### Phase 4: LeftSidebar Integration [MODIFY]

**文件**: `apps/web/components/layout/LeftSidebar.tsx`

**变更 1: 添加 navItem**

```diff
+ import { ListTree } from 'lucide-react';
+ import { OutlinePanel } from '@/components/graph/parts/OutlinePanel';
+ import type { OutlineNode } from '@/components/graph/hooks/useOutlineData';

const navItems: NavItem[] = [
  { id: 'components', icon: <Shapes className="w-5 h-5" />, label: '组件' },
  { id: 'templates', icon: <LayoutGrid className="w-5 h-5" />, label: '模板' },
+ { id: 'outline', icon: <ListTree className="w-5 h-5" />, label: '大纲' },
  { id: 'text', icon: <Type className="w-5 h-5" />, label: '文本' },
  { id: 'media', icon: <Image className="w-5 h-5" />, label: '媒体' },
  { id: 'links', icon: <Link2 className="w-5 h-5" />, label: '链接' },
];
```

**变更 2: 扩展 Props**

```diff
export interface LeftSidebarProps {
  isDependencyMode?: boolean;
  onDependencyModeToggle?: () => void;
  onTemplatesOpen?: () => void;
  userId?: string;
+ // Story 8.4: Outline View
+ outlineData?: OutlineNode[];
+ selectedNodeId?: string | null;
+ onOutlineNodeClick?: (nodeId: string) => void;
+ onOutlineReorder?: (nodeId: string, newParentId: string | null, index: number) => void;
}
```

**变更 3: 添加 Outline 面板渲染**

```tsx
{activeNav === 'outline' && (
  <div className="space-y-3">
    <p className="text-xs text-gray-500 mb-2">
      点击节点跳转，拖拽重排层级
    </p>
    {outlineData && onOutlineNodeClick && onOutlineReorder && (
      <OutlinePanel
        data={outlineData}
        selectedNodeId={selectedNodeId ?? null}
        onNodeClick={onOutlineNodeClick}
        onReorder={onOutlineReorder}
      />
    )}
  </div>
)}
```

---

### Phase 5: Page-Level Integration

**位置**: `apps/web/app/[graphId]/page.tsx` 或等效路由

```typescript
import { useOutlineData } from '@/components/graph/hooks';
import { useZoomShortcuts } from '@/components/graph/hooks';
import { useNodeCollapse } from '@/components/graph/hooks';

// Inside component:
const { outlineData, reorderNode } = useOutlineData({ graph, isReady });
const { centerNode } = useZoomShortcuts({ graph, isReady });
const { expandPathToNode } = useNodeCollapse({ graph, isReady });
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

const handleOutlineNodeClick = useCallback((nodeId: string) => {
  // 1. Expand collapsed ancestors (Story 8.1)
  expandPathToNode(nodeId);
  // 2. Center node in view (Story 8.3)
  centerNode(nodeId);
  // 3. Select node
  setSelectedNodeId(nodeId);
}, [expandPathToNode, centerNode]);

// Pass to LeftSidebar
<LeftSidebar
  outlineData={outlineData}
  selectedNodeId={selectedNodeId}
  onOutlineNodeClick={handleOutlineNodeClick}
  onOutlineReorder={reorderNode}
  // ...other props
/>
```

---

### Tasks

- [ ] **Task 1**: Create `useOutlineData` hook
  - [ ] 1.1 Implement tree building algorithm
  - [ ] 1.2 Implement `reorderNode` (edge manipulation)
  - [ ] 1.3 Add graph event listeners for auto-refresh
  - [ ] 1.4 Export from `hooks/index.ts`

- [ ] **Task 2**: Create `OutlineItem` component
  - [ ] 2.1 Implement node item UI with indent
  - [ ] 2.2 Add drag handlers
  - [ ] 2.3 Add collapse toggle

- [ ] **Task 3**: Create `OutlinePanel` component
  - [ ] 3.1 Implement recursive rendering
  - [ ] 3.2 Manage local collapse state
  - [ ] 3.3 Implement drag-and-drop logic
  - [ ] 3.4 Export from `parts/index.ts`

- [ ] **Task 4**: Integrate into `LeftSidebar`
  - [ ] 4.1 Add outline navItem
  - [ ] 4.2 Extend props
  - [ ] 4.3 Render OutlinePanel when active

- [ ] **Task 5**: Page-level integration
  - [ ] 5.1 Call hooks at page level
  - [ ] 5.2 Wire up callbacks to LeftSidebar

- [ ] **Task 6**: Testing
  - [ ] 6.1 Unit test `useOutlineData` (tree build, reorder)
  - [ ] 6.2 Component test `OutlinePanel` (render, collapse)
  - [ ] 6.3 E2E test outline flow (click, drag)

---

### Acceptance Criteria

- [x] **AC1**: Given 侧边栏任意状态 When 点击大纲图标 Then 面板展开显示大纲 And 图标高亮
- [x] **AC2**: Given 多层级图谱 When 打开大纲 Then 显示树形列表反映层级 And 节点显示折叠图标+标题
- [x] **AC3**: Given 大纲节点列表 When 单击节点 Then 画布定位到节点 And 节点选中 And 路径自动展开
- [x] **AC4**: Given 大纲节点 When 拖拽到另一节点 Then 父子关系同步更新 And 显示拖拽指示
- [x] **AC5**: Given 有子节点的大纲项 When 点击折叠 Then 子节点隐藏 And 再点击展开 And 独立于画布折叠
- [x] **AC6**: Given 大纲打开 When 画布添加/删除节点 Then 大纲实时更新 When 大纲重排 Then 画布同步

---

## Additional Context

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@antv/x6` | 3.1.2 | graph.getNodes(), getIncomingEdges(), addEdge() |
| `@dnd-kit/core` | 6.3.1 | DndContext, useDraggable, useDroppable |
| `@dnd-kit/sortable` | 10.0.0 | SortableContext, useSortable |
| `lucide-react` | existing | ListTree, ChevronRight/Down 图标 |
| `@cdm/ui` | existing | cn() utility |

### Testing Strategy

**Unit Tests (Vitest):**
- `useOutlineData.test.ts`: 测试树构建、reorderNode 边操作
- Mock graph 实例

**Component Tests (Vitest + RTL):**
- `OutlinePanel.test.tsx`: 渲染、折叠交互、选中高亮
- `OutlineItem.test.tsx`: 拖拽事件、点击

**E2E Tests (Playwright):**
- `outline-view.spec.ts`:
  - 打开大纲 Tab
  - 点击节点检查画布定位
  - 拖拽节点验证层级变化

### Notes

1. **Performance**: 大规模节点需考虑虚拟滚动（Phase 2）
2. **Debounce**: graph 事件可添加防抖避免高频刷新
3. **Yjs 一致性**: reorderNode 通过 graph.addEdge/removeEdge 操作，会通过现有 GraphSyncManager 同步到 Yjs
