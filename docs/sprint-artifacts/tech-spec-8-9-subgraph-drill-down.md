# Tech-Spec: 子图下钻导航 (Subgraph Drill-Down Navigation) - Story 8.9

**Created:** 2026-01-09
**Status:** Ready for Development
**Story Link:** [story-8-9-subgraph-drill-down.md](./story-8-9-subgraph-drill-down.md)
**Impact Analysis:** [story-8-9-impact-analysis.md](./story-8-9-impact-analysis.md)

---

## Overview

### Problem Statement

在处理大规模复杂图谱（500-5000+ 节点）时，用户面临视觉过载和上下文丢失的问题。频繁缩放和平移无法有效聚焦特定子系统的细节。

### Solution

实现子图下钻导航系统：
- 创建 `drillDownStore.ts` 全局状态管理下钻路径
- 通过右键菜单 "进入子图" 或 `Cmd/Ctrl+Enter` 快捷键触发下钻
- 面包屑导航栏显示当前路径，支持点击快速返回（无专用返回快捷键）
- URL hash + sessionStorage 持久化下钻状态

### Scope (In/Out)

**In Scope:**
- ✅ 下钻状态 Store（`useSyncExternalStore` 模式）
- ✅ 右键菜单 "进入子图" 选项（有子节点时可用）
- ✅ `Cmd/Ctrl+Enter` 下钻快捷键
- ✅ 面包屑导航组件（路径显示 + 点击跳转）
- ✅ URL hash / sessionStorage 持久化
- ✅ 子图视图过滤渲染（不修改 Yjs 数据）

**Out of Scope:**
- ❌ 多客户端下钻路径同步（Yjs Awareness）—— 设计已明确为本地视图状态
- ❌ 双击下钻（双击保持现有编辑模式行为）
- ❌ 返回上层快捷键（仅通过面包屑导航返回）
- ❌ 复杂过渡动画（Phase 2 增强）
- ❌ 跨图引用（Story 5.3）

---

## Context for Development

### Codebase Patterns

#### 1. Global Store Pattern (参考 `semanticZoomLOD.ts`)

项目使用 `useSyncExternalStore` 模式管理跨组件/Portal 状态：

```typescript
// apps/web/lib/semanticZoomLOD.ts (Line 14-39)
import { useSyncExternalStore } from 'react';

let currentLOD: LODLevel = 'full';
const subscribers = new Set<() => void>();

export function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function useLODLevel(): LODLevel {
  return useSyncExternalStore(subscribe, getCurrentLOD, getServerSnapshot);
}
```

**关键点**：X6 节点通过 Portal 渲染，无法访问 React Context，必须使用全局 Store。

#### 2. Hotkey Integration Pattern (参考 `useGraphHotkeys.ts`)

快捷键通过 `useGraphHotkeys` hook 统一管理，需要：
- 添加新的 callback prop（`onDrillDown`）
- 在 `handleKeyDown` 中添加 `Cmd/Ctrl+Enter` 下钻分支
- **无需修改 Escape 键逻辑**（返回通过面包屑导航实现）

#### 3. Context Menu Pattern (参考 NodeContextMenu)

右键菜单需要在 `NodeContextMenu.tsx` 中添加 "进入子图" 选项。

### Files to Reference

| 文件 | 行号 | 参考内容 |
|------|------|---------|
| `apps/web/lib/semanticZoomLOD.ts` | 全文 | Store 模式参考 |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | 222-234 | Escape 键逻辑 |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | 309-313 | Enter 键逻辑（避免冲突） |
| `apps/web/components/graph/GraphComponent.tsx` | 69-540 | 主组件结构 |
| `apps/web/__tests__/lib/semanticZoomLOD.test.ts` | 全文 | 测试模式参考 |

### Technical Decisions

#### TD-1: 下钻路径存储位置

**决策**: URL hash (`#drill=nodeA/nodeB`) + sessionStorage 备份

**理由**: 
- URL hash 支持刷新恢复和分享
- sessionStorage 作为无 hash 场景（如嵌入式）的备份
- 不写入 Yjs，保持数据层简洁

#### TD-2: 子图渲染方式

**决策**: 视图过滤，不修改 Yjs 数据结构

**实现**: 在 `GraphComponent` 中根据 `drillPath` 计算“可见子树节点集合”（层级边、排除 dependency edges），并通过 X6 的 `Node.hide()/show()`、`Edge.hide()/show()` 切换可见性（只改 UI，可见性不写入 Yjs；**禁止移除 cells**）。

```typescript
const visibleNodeIds = useMemo(() => {
  if (!graph || drillPath.length === 0) return null;
  const rootId = drillPath[drillPath.length - 1];
  return computeSubtreeNodeIds(graph, rootId); // hierarchical edges only
}, [graph, drillPath]);

useEffect(() => {
  if (!graph) return;
  if (!visibleNodeIds) return; // empty drill path => main view (no filtering)

  graph.batchUpdate(() => {
    graph.getNodes().forEach((n) => (visibleNodeIds.has(n.id) ? n.show() : n.hide()));
    graph.getEdges().forEach((e) => {
      const src = e.getSourceCellId?.();
      const tgt = e.getTargetCellId?.();
      const visible = Boolean(src && tgt && visibleNodeIds.has(src) && visibleNodeIds.has(tgt));
      visible ? e.show() : e.hide();
    });
  });
}, [graph, visibleNodeIds]);
```

#### TD-3: 返回上层方式

**决策**: 仅通过面包屑导航返回，无专用快捷键

**理由**: 避免与现有 Escape 键逻辑（退出连接/退出依赖模式/退出编辑模式）的优先级冲突。面包屑提供更直观的多级跳转体验。

#### TD-4: 面包屑组件位置

**决策**: 独立组件 `Breadcrumb.tsx`，位于 GraphComponent 外部，通过 Store 通信

**理由**: 解耦面包屑 UI 与图形渲染逻辑。

#### TD-5: 双击行为

**决策**: 双击保持编辑模式，下钻仅通过右键菜单或 `Cmd/Ctrl+Enter`

**理由**: 避免修改现有双击编辑逻辑，减少回归风险。

---

## Implementation Plan

### Phase 1: Core Store 创建

#### Task 1.1: [NEW] `drillDownStore.ts`

**文件**: `apps/web/lib/drillDownStore.ts`

```typescript
/**
 * Story 8.9: Subgraph Drill-Down Navigation
 * DrillDownStore - Global store for drill-down path state
 *
 * Uses useSyncExternalStore pattern (same as semanticZoomLOD.ts)
 * Path stored in URL hash for persistence
 */

import { useSyncExternalStore } from 'react';

// ============================================================================
// Types
// ============================================================================

export type DrillDownPath = string[]; // Array of node IDs

// ============================================================================
// Global Store State
// ============================================================================

let drillPath: DrillDownPath = [];
const subscribers = new Set<() => void>();

// ============================================================================
// Store API
// ============================================================================

export function getCurrentPath(): DrillDownPath {
  return drillPath;
}

export function pushPath(nodeId: string): void {
  drillPath = [...drillPath, nodeId];
  syncToUrl();
  notifySubscribers();
}

export function popPath(): boolean {
  if (drillPath.length === 0) return false;
  drillPath = drillPath.slice(0, -1);
  syncToUrl();
  notifySubscribers();
  return true;
}

export function goToPath(targetPath: DrillDownPath): void {
  drillPath = [...targetPath];
  syncToUrl();
  notifySubscribers();
}

export function resetPath(): void {
  drillPath = [];
  syncToUrl();
  notifySubscribers();
}

// ============================================================================
// URL Persistence
// ============================================================================

function syncToUrl(): void {
  if (typeof window === 'undefined') return;
  const encoded = drillPath.map((id) => encodeURIComponent(id)).join('/');
  const hash = drillPath.length > 0 ? `#drill=${encoded}` : '';
  // IMPORTANT: Preserve pathname + search params (e.g. ?userId=) when updating hash.
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
  // Backup to sessionStorage
  sessionStorage.setItem('cdm-drillPath', JSON.stringify(drillPath));
}

export function restoreFromUrl(): void {
  if (typeof window === 'undefined') return;
  
  // Try URL hash first
  const hash = window.location.hash;
  if (hash.startsWith('#drill=')) {
    const pathStr = hash.slice(7);
    drillPath = pathStr
      .split('/')
      .filter(Boolean)
      .map((seg) => {
        try {
          return decodeURIComponent(seg);
        } catch {
          return seg;
        }
      });
    notifySubscribers();
    return;
  }
  
  // Fallback to sessionStorage
  const stored = sessionStorage.getItem('cdm-drillPath');
  if (stored) {
    try {
      drillPath = JSON.parse(stored);
      notifySubscribers();
    } catch {}
  }
}

// ============================================================================
// Subscription
// ============================================================================

export function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySubscribers(): void {
  subscribers.forEach((callback) => callback());
}

// ============================================================================
// React Hook
// ============================================================================

export function useDrillPath(): DrillDownPath {
  return useSyncExternalStore(subscribe, getCurrentPath, getServerSnapshot);
}

function getServerSnapshot(): DrillDownPath {
  return [];
}

// ============================================================================
// Testing Helpers
// ============================================================================

export function resetDrillDownStore(): void {
  drillPath = [];
  subscribers.clear();
}
```

### Phase 2: Hotkey Integration

#### Task 2.1: [MODIFY] `useGraphHotkeys.ts`

**修改点**:

1. 添加新 props:
```typescript
export interface UseGraphHotkeysOptions {
  // ... existing props
  /** Story 8.9: Drill-down handler */
  onDrillDown?: () => void;
}
```

2. 添加 `Cmd/Ctrl+Enter` 下钻快捷键 (在 Enter 键处理前):
```typescript
// Cmd/Ctrl + Enter: Drill down into selected node (Story 8.9)
if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && onDrillDown) {
  e.preventDefault();
  e.stopPropagation();
  onDrillDown();
  return;
}
```

> ⚠️ **Note**: 无需修改 Escape 键逻辑，返回上层仅通过面包屑导航实现。

### Phase 3: Context Menu

#### Task 3.1: [MODIFY] `NodeContextMenu.tsx`

在"折叠/展开"区块之后添加"进入子图"选项：

```typescript
export interface NodeContextMenuProps {
  // ...
  hasChildren?: boolean;
  onDrillDown?: () => void;
}

// In menu items (reuse hasChildren already computed by GraphComponent)
{nodeId && hasChildren && onDrillDown && (
  <>
    <div className="border-t border-gray-100 my-1" />
    <button onClick={() => handleAction(onDrillDown)}>
      进入子图
      <span className="ml-auto text-xs text-gray-400">⌘⏎</span>
    </button>
  </>
)}
```

### Phase 4: Breadcrumb Component

#### Task 4.1: [NEW] `Breadcrumb.tsx`

**文件**: `apps/web/components/graph/parts/Breadcrumb.tsx`

```typescript
'use client';

import { useMemo } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useDrillPath, goToPath, resetPath } from '@/lib/drillDownStore';

interface BreadcrumbProps {
  /** Function to get node label by ID */
  getNodeLabel: (nodeId: string) => string;
}

export function Breadcrumb({ getNodeLabel }: BreadcrumbProps) {
  const drillPath = useDrillPath();

  const items = useMemo(() => {
    return drillPath.map((nodeId, index) => ({
      id: nodeId,
      label: getNodeLabel(nodeId),
      path: drillPath.slice(0, index + 1),
    }));
  }, [drillPath, getNodeLabel]);

  if (drillPath.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 text-sm bg-background/80 backdrop-blur-sm border border-border/30 rounded-lg shadow-sm">
      {/* Root */}
      <button
        onClick={resetPath}
        className="text-muted-foreground hover:text-foreground hover:bg-accent/50 px-2 py-0.5 rounded-md transition-colors"
      >
        <Home className="w-4 h-4" />
      </button>

      {items.map((item, index) => (
        <span key={item.id} className="flex items-center">
          <ChevronRight className="text-muted-foreground/50 w-4 h-4" />
          <button
            onClick={() => goToPath(item.path)}
            disabled={index === items.length - 1}
            className={`px-2 py-0.5 rounded-md transition-colors truncate max-w-[120px] ${
              index === items.length - 1
                ? 'text-foreground font-medium cursor-default'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
            title={item.label}
          >
            {item.label}
          </button>
        </span>
      ))}
    </div>
  );
}
```

### Phase 5: GraphComponent Integration

#### Task 5.1: [MODIFY] `GraphComponent.tsx`

1. 导入 drill-down store 和 Breadcrumb
2. 在 `useGraphHotkeys` 调用中添加 drill-down handlers
3. 添加子图过滤逻辑
4. 渲染 Breadcrumb 组件

---

## Acceptance Criteria

- [ ] **AC1**: 右键菜单进入子图 - 有子节点的节点显示"进入子图"选项
- [ ] **AC2**: 面包屑导航显示与交互 - 路径正确，点击可跳转
- [ ] **AC3**: 通过面包屑返回上层 - 点击面包屑可跳转到对应层级
- [ ] **AC4**: 子图数据变更自动同步 - 视图过滤不影响 Yjs 同步
- [ ] **AC5**: 下钻状态持久化 - 刷新页面后恢复下钻位置
- [ ] **AC6**: 叶子节点不可下钻 - 无子节点时菜单项不显示/禁用

---

## Additional Context

### Dependencies

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@antv/x6` | 3.1.2 | 图形渲染 |
| `lucide-react` | - | Breadcrumb 图标 |
| React `useSyncExternalStore` | - | Store Hook |

### Testing Strategy

#### 单元测试 (Vitest)

**文件**: `apps/web/__tests__/lib/drillDownStore.test.ts`

```bash
# 运行命令
pnpm --filter @cdm/web test drillDownStore
```

| 测试用例 | 覆盖 AC |
|----------|--------|
| `pushPath` 添加节点到路径 | AC1 |
| `popPath` 返回上一层 | AC3 |
| `goToPath` 直接跳转 | AC2 |
| 空路径时 `popPath` 返回 false | AC3 |
| URL hash 同步 | AC5 |
| `restoreFromUrl` 恢复路径 | AC5 |

#### E2E 测试 (Playwright)

**文件**: `apps/web/e2e/drill-down.spec.ts`

```bash
# 运行命令
pnpm --filter @cdm/web test:e2e drill-down
```

| 测试场景 | 覆盖 AC |
|----------|--------|
| 右键有子节点的节点 → 显示"进入子图" | AC1, AC6 |
| 右键叶子节点 → 不显示"进入子图" | AC6 |
| 点击"进入子图" → 视图切换，面包屑显示 | AC1, AC2 |
| 点击面包屑中间项 → 跳转到对应层级 | AC2, AC3 |
| 点击面包屑 Home 图标 → 返回主图 | AC3 |
| 刷新页面 → 恢复下钻位置 | AC5 |
| 节点删除后自动回退 | AC4 |

> 📋 **完整测试策略**：详见 [Story 文档测试策略部分](./story-8-9-subgraph-drill-down.md#-测试策略-testing-strategy)（50 个测试用例）

### Notes

1. **`useGraphHotkeys.ts` 已超 300 行**：当前 447 行，添加下钻逻辑后预计 ~470 行。可考虑未来拆分为多个专门 hooks。

2. **与 Focus Mode 集成**：无需新增 API。Focus Mode 是本地视觉态；下钻仅隐藏非子树节点，Focus 仍对当前可见节点生效（不要杜撰 `recalculateFocus()` 之类不存在的接口）。

3. **性能考量**：子图过滤使用 `useMemo`，避免每次渲染重新计算。

---

## File Change Summary

| 文件 | 类型 | 预估行数 | 描述 |
|------|------|:--------:|------|
| `apps/web/lib/drillDownStore.ts` | NEW | ~100 | 下钻路径 Store |
| `apps/web/components/graph/parts/Breadcrumb.tsx` | NEW | ~80 | 面包屑组件（含返回功能） |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | MODIFY | +15 | 下钻快捷键（仅 Cmd/Ctrl+Enter） |
| `apps/web/components/graph/GraphComponent.tsx` | MODIFY | +40 | 集成下钻逻辑 |
| `apps/web/components/graph/parts/NodeContextMenu.tsx` | MODIFY | +15 | 菜单项 |
| `apps/web/__tests__/lib/drillDownStore.test.ts` | NEW | ~200 | 单元测试（14 cases） |
| `apps/web/__tests__/components/Breadcrumb.test.tsx` | NEW | ~150 | 组件测试（11 cases） |
| `apps/web/e2e/drill-down.spec.ts` | NEW | ~250 | E2E 测试（16 cases） |
