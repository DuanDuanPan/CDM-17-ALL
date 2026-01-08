# Tech-Spec: Story 8.5 - Focus Mode (聚焦模式)

**Created:** 2026-01-08
**Status:** Ready for Development
**Story File:** [story-8-5-focus-mode.md](./story-8-5-focus-mode.md)

---

## Overview

### Problem Statement

在处理复杂图谱（500-5000+ 节点）时，用户需要专注于当前工作的分支，但画布上的其他节点会分散注意力。目前系统没有提供"聚焦"能力，用户必须手动折叠不需要的分支（Story 8.1），这不够直观且需要预先了解图谱结构。

### Solution

实现聚焦模式（Focus Mode），通过视觉淡化非关联节点（降低透明度至 20%），让用户在不改变图谱结构的情况下专注于当前分支的编辑工作。用户可通过 `F` 键快捷切换，并在工具栏中显示状态和层级配置。

### Scope (In/Out)

**In Scope:**
- ✅ 聚焦模式快捷键（`F` 键）激活/退出
- ✅ 非直接关联节点淡化（20% 透明度）
- ✅ 工具栏状态指示器与层级选择（1/2/3 层）
- ✅ 点击空白处或再次按 `F` 键退出
- ✅ 边的透明度同步处理

**Out of Scope:**
- ❌ 聚焦状态持久化（仅会话级别）
- ❌ 聚焦模式协同同步（各客户端独立）
- ❌ 过渡动画（Phase 2）

---

## Context for Development

### Codebase Patterns

#### 1. Hook-First Architecture (必须遵守)

所有 UI 逻辑必须封装在 hooks 中。参考现有 hooks：

```typescript
// 文件路径: apps/web/components/graph/hooks/

// Story 8.1: useNodeCollapse.ts (562 LOC) - 树遍历模式
// Story 8.3: useZoomShortcuts.ts (271 LOC) - 视图操作模式
// Story 8.4: useOutlineData.ts - 数据聚合模式

// Hook 标准接口模式:
interface UseXxxOptions {
    graph: Graph | null;
    isReady: boolean;
    // ... 其他依赖
}

interface UseXxxReturn {
    // 状态 getter 和 actions
}

export function useXxx(options: UseXxxOptions): UseXxxReturn {
    // 实现
}
```

#### 2. 键盘快捷键集成模式

键盘快捷键通过 `useGraphHotkeys` 回调注入：

```typescript
// 文件: apps/web/components/graph/hooks/useGraphHotkeys.ts (line 12-42)
interface UseGraphHotkeysOptions {
    // ... 现有选项
    onCollapseNode?: (nodeId: string) => void;
    onToggleMinimap?: () => void;
    onZoomToFit?: () => void;
    onZoomTo100?: () => void;
    // 👆 需要新增:
    onToggleFocusMode?: () => void;
}
```

#### 3. GraphComponent 集成模式

```typescript
// 文件: apps/web/components/graph/GraphComponent.tsx (line 192-216)
// Story 8.1 集成示例:
const { isCollapsed, collapseNode, expandNode } = useNodeCollapse({ graph, isReady });

// Story 8.3 集成示例:
const { zoomToFit, zoomTo100, centerNode } = useZoomShortcuts({ graph, isReady });

const { handleKeyDown } = useGraphHotkeys({
    // ... 
    onZoomToFit: zoomToFit,
    onZoomTo100: zoomTo100,
    // 👆 新增:
    onToggleFocusMode: toggleFocusMode,
});
```

#### 4. X6 节点/边属性操作

```typescript
// 正确方式：用 X6 API 批量更新（本 Story 为本地 UI 状态，不写入 Yjs）
graph.batchUpdate(() => {
    // React Shape 默认使用 foreignObject（selector 为 fo）
    node.setAttr('fo/opacity', 0.2);

    // 层级边（cdm-hierarchical-edge）有 line/glow 两条 path：用 strokeOpacity 更稳
    edge.setAttr('line/strokeOpacity', 0.2);
    edge.setAttr('glow/strokeOpacity', 0.2);
});

// 显示/隐藏节点 (Story 8.1 模式):
node.show();  // 完全显示
node.hide();  // 完全隐藏
```

### Files to Reference

| 文件 | 用途 |
|------|------|
| `apps/web/components/graph/hooks/useNodeCollapse.ts` | 树遍历算法 (`getDirectChildren`, `getAllDescendants`, `getAncestors`) |
| `apps/web/components/graph/hooks/useZoomShortcuts.ts` | 视图操作模式参考 |
| `apps/web/components/graph/hooks/index.ts` | Hook 导出模式 |
| `apps/web/components/graph/GraphComponent.tsx` | 集成点（line 66-300） |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | 快捷键处理（line 49-313） |
| `apps/web/components/graph/parts/ZoomIndicator.tsx` | UI 组件布局参考 |
| `apps/web/__tests__/hooks/useNodeCollapse.test.ts` | 测试模式参考 |

### Technical Decisions

#### TD-1: 透明度实现方式

**决策**: React Shape 使用 `cell.setAttr('fo/opacity', value)` 修改节点透明度；边使用 `line/glow` 的 `strokeOpacity`

**理由**:
- X6 内部正确处理 SVG 渲染
- 与现有节点/边样式系统一致
- 复用 Story 8.1 已验证的 `graph.batchUpdate()` 模式

#### TD-2: 关联节点算法

**决策**: 复用 `useNodeCollapse` 的树遍历算法

```typescript
// 算法伪代码:
function getRelatedNodeIds(nodeId: string, level: 1 | 2 | 3): Set<string> {
  const related = new Set<string>([nodeId]);
  
  // Level 1: 父 + 子 + 兄弟
  const parent = getParent(nodeId);
  if (parent) {
    related.add(parent);
    getSiblings(nodeId).forEach(id => related.add(id));  // 包括自己
  }
  getDirectChildren(nodeId).forEach(id => related.add(id));
  
  // Level 2+: 递归扩展
  if (level >= 2) {
    // 添加父的兄弟、子的子等
    expandLevel(related, level - 1);
  }
  
  return related;
}
```

#### TD-3: 本地状态 vs Yjs

**决策**: 聚焦模式是纯本地视觉状态，使用 React useState，不同步到 Yjs

**理由**: 聚焦是个人视觉偏好，不影响协作数据

#### TD-4: 快捷键冲突处理

**决策**: `F` 键仅在非编辑状态下响应

**实现**: 在 `useGraphHotkeys` 中检查 `isEditing` 状态（现有模式）

---

## Implementation Plan

### Phase 1: 核心 Hook 实现

#### Task 1.1: 创建 `useFocusMode.ts` (~180 LOC)

**路径**: `apps/web/components/graph/hooks/useFocusMode.ts`

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Graph, Node, Edge } from '@antv/x6';
import { isDependencyEdge } from '@/lib/edgeValidation';

// Constants
const DIMMED_OPACITY = 0.2;
const FULL_OPACITY = 1;

export interface UseFocusModeOptions {
  graph: Graph | null;
  isReady: boolean;
  selectedNodeId: string | null;
}

export interface UseFocusModeReturn {
  isFocusMode: boolean;
  focusLevel: 1 | 2 | 3;
  toggleFocusMode: () => void;
  exitFocusMode: () => void;
  setFocusLevel: (level: 1 | 2 | 3) => void;
}

export function useFocusMode({
  graph,
  isReady,
  selectedNodeId,
}: UseFocusModeOptions): UseFocusModeReturn {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusLevel, setFocusLevel] = useState<1 | 2 | 3>(1);

  // 树遍历辅助函数 (复用 useNodeCollapse 模式)
  const getDirectChildren = useCallback((nodeId: string): Node[] => {
    // 实现: 获取 outgoing hierarchical edges 的 targets
  }, [graph]);

  const getParent = useCallback((nodeId: string): string | null => {
    // 实现: 从 node.getData().parentId 获取
  }, [graph]);

  const getSiblings = useCallback((nodeId: string): string[] => {
    // 实现: 同一父节点的其他子节点
  }, [graph, getParent, getDirectChildren]);

  // 核心: 计算聚焦范围内的节点 ID
  const getRelatedNodeIds = useCallback((nodeId: string, level: 1 | 2 | 3): Set<string> => {
    // 实现层级扩展算法
  }, [graph, getDirectChildren, getParent, getSiblings]);

  // 应用聚焦透明度
  const applyFocusOpacity = useCallback((focusedIds: Set<string>) => {
    if (!graph) return;
    graph.batchUpdate(() => {
      graph.getNodes().forEach((node) => {
        const opacity = focusedIds.has(node.id) ? FULL_OPACITY : DIMMED_OPACITY;
        node.setAttr('fo/opacity', opacity);
      });
      graph.getEdges().forEach((edge) => {
        const sourceId = edge.getSourceCellId();
        const targetId = edge.getTargetCellId();
        const opacity = (focusedIds.has(sourceId) && focusedIds.has(targetId)) 
          ? FULL_OPACITY : DIMMED_OPACITY;
        edge.setAttr('line/strokeOpacity', opacity);
        edge.setAttr('glow/strokeOpacity', opacity);
      });
    });
  }, [graph]);

  // 清除聚焦透明度
  const clearFocusOpacity = useCallback(() => {
    if (!graph) return;
    graph.batchUpdate(() => {
      graph.getNodes().forEach((node) => node.setAttr('fo/opacity', FULL_OPACITY));
      graph.getEdges().forEach((edge) => {
        edge.setAttr('line/strokeOpacity', FULL_OPACITY);
        edge.setAttr('glow/strokeOpacity', FULL_OPACITY);
      });
    });
  }, [graph]);

  // 切换聚焦模式
  const toggleFocusMode = useCallback(() => {
    if (!selectedNodeId) return; // AC5: 无选中节点时无操作
    
    if (isFocusMode) {
      clearFocusOpacity();
      setIsFocusMode(false);
    } else {
      const relatedIds = getRelatedNodeIds(selectedNodeId, focusLevel);
      applyFocusOpacity(relatedIds);
      setIsFocusMode(true);
    }
  }, [selectedNodeId, isFocusMode, focusLevel, getRelatedNodeIds, applyFocusOpacity, clearFocusOpacity]);

  // 退出聚焦模式
  const exitFocusMode = useCallback(() => {
    if (isFocusMode) {
      clearFocusOpacity();
      setIsFocusMode(false);
    }
  }, [isFocusMode, clearFocusOpacity]);

  // AC5: 选中节点变化时重新计算聚焦范围
  useEffect(() => {
    if (isFocusMode && selectedNodeId) {
      const relatedIds = getRelatedNodeIds(selectedNodeId, focusLevel);
      applyFocusOpacity(relatedIds);
    }
  }, [isFocusMode, selectedNodeId, focusLevel, getRelatedNodeIds, applyFocusOpacity]);

  // AC5: 无选中节点时自动退出
  useEffect(() => {
    if (isFocusMode && !selectedNodeId) {
      exitFocusMode();
    }
  }, [isFocusMode, selectedNodeId, exitFocusMode]);

  // 层级变化时重新应用
  const handleSetFocusLevel = useCallback((level: 1 | 2 | 3) => {
    setFocusLevel(level);
    if (isFocusMode && selectedNodeId) {
      const relatedIds = getRelatedNodeIds(selectedNodeId, level);
      applyFocusOpacity(relatedIds);
    }
  }, [isFocusMode, selectedNodeId, getRelatedNodeIds, applyFocusOpacity]);

  return {
    isFocusMode,
    focusLevel,
    toggleFocusMode,
    exitFocusMode,
    setFocusLevel: handleSetFocusLevel,
  };
}
```

#### Task 1.2: 更新 hooks/index.ts

```diff
+// Story 8.5: Focus Mode
+export { useFocusMode } from './useFocusMode';
+export type { UseFocusModeOptions, UseFocusModeReturn } from './useFocusMode';
```

---

### Phase 2: 键盘快捷键集成

#### Task 2.1: 更新 useGraphHotkeys.ts

**路径**: `apps/web/components/graph/hooks/useGraphHotkeys.ts`

```diff
 interface UseGraphHotkeysOptions {
     // ... 现有选项
     onZoomTo100?: () => void;
+    // Story 8.5: Focus Mode
+    onToggleFocusMode?: () => void;
 }

 // 在 handleKeyDown 函数中添加:
+    // Story 8.5: Focus Mode toggle (F key)
+    // 复用 useGraphHotkeys 现有的 input protection（基于 e.target / isContentEditable）
+    if (!isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'f' || e.key === 'F')) {
+        e.preventDefault();
+        e.stopPropagation();
+        onToggleFocusMode?.();
+        return;
+    }
```

---

### Phase 3: UI 组件集成 (AC: #1, #3)

#### Task 3.1: 创建 `FocusModeButton` 组件 (~100 LOC)

**路径**: `apps/web/components/graph/parts/FocusModeButton.tsx`
**设计**: 使用 Flex 容器包裹两个 `@cdm/ui` 的 `Button` 组件，通过 Tailwind 实现"胶囊"外观。

```typescript
'use client';

import { Focus, ChevronDown, Check } from 'lucide-react';
import { Button, cn } from '@cdm/ui';
import { useState, useRef, useEffect } from 'react';

export interface FocusModeButtonProps {
  isFocusMode: boolean;
  focusLevel: 1 | 2 | 3;
  onToggle: () => void;
  onLevelChange: (level: 1 | 2 | 3) => void;
  disabled?: boolean;
}

export function FocusModeButton({
  isFocusMode,
  focusLevel,
  onToggle,
  onLevelChange,
  disabled = false,
}: FocusModeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative z-50 font-sans" data-testid="focus-mode-container">
      {/* 1. Composite Container */}
      <div className={cn(
        "flex items-center p-0.5 bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-sm rounded-lg transition-all duration-200",
        isFocusMode 
          ? "border-blue-200/80 shadow-blue-100/50" 
          : "hover:border-gray-300",
        disabled && "opacity-50 pointer-events-none"
      )}>
        
        {/* 2. Toggle Button (Using UI Button with ghost variant) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          disabled={disabled}
          className={cn(
            "h-8 px-2.5 gap-2 text-xs font-medium rounded-md hover:bg-transparent", // Override hover to handle custom active state
            isFocusMode
              ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-black/5 hover:bg-blue-50"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
          title="聚焦模式 (F)"
          data-testid="focus-mode-button"
        >
          <Focus className="w-3.5 h-3.5" />
          <span>Focus</span>
        </Button>
        
        {/* 3. Level Selector Trigger */}
        {isFocusMode && (
          <>
            <div className="w-px h-3.5 bg-gray-200 mx-0.5 animate-in fade-in duration-200" />
            
            <Button
               variant="ghost"
               size="sm"
               onClick={() => setIsOpen(!isOpen)}
               className={cn(
                 "h-8 px-2 gap-1 text-xs font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-blue-600 transition-colors active:bg-gray-100",
                 isOpen && "bg-gray-100 text-gray-900"
               )}
               title="切换聚焦层级"
               data-testid="focus-level-dropdown"
            >
               <span>{focusLevel}层</span>
               <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </>
        )}
      </div>

      {/* 4. Dropdown Popover */}
      {isOpen && isFocusMode && (
        <div className="absolute top-full right-0 mt-1 w-40 p-1 bg-white border border-gray-100 shadow-lg rounded-lg animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5 cursor-default">
          {[1, 2, 3].map((level) => (
            <Button
              key={level}
              variant="ghost"
              size="sm"
              onClick={() => {
                onLevelChange(level as 1 | 2 | 3);
                setIsOpen(false);
              }}
              className={cn(
                "h-auto px-2 py-1.5 justify-start text-xs text-left rounded transition-colors w-full",
                focusLevel === level 
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-50" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
              data-testid={`focus-level-option-${level}`}
            >
              <div className="flex flex-col gap-0.5 w-full">
                <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{level}层</span>
                    {focusLevel === level && <Check className="w-3 h-3" />}
                </div>
                <span className={cn(
                    "text-[10px] font-normal",
                    focusLevel === level ? "text-blue-400" : "text-gray-400"
                )}>
                  {level === 1 ? '父/子/兄弟' : level === 2 ? '扩展一层' : '扩展两层'}
                </span>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Task 3.2: 更新 parts/index.ts

```diff
+export { FocusModeButton } from './FocusModeButton';
+export type { FocusModeButtonProps } from './FocusModeButton';
```

---

### Phase 4: GraphComponent 集成

#### Task 4.1: 集成 useFocusMode

**路径**: `apps/web/components/graph/GraphComponent.tsx`

```diff
+import { useFocusMode } from './hooks';
+import { FocusModeButton } from './parts';

 // 在 GraphComponent 函数体内 (line ~200):
+// Story 8.5: Focus Mode
+const { isFocusMode, focusLevel, toggleFocusMode, exitFocusMode, setFocusLevel } = useFocusMode({
+    graph,
+    isReady,
+    selectedNodeId: selectedNodeIds[0] || null,
+});

 const { handleKeyDown } = useGraphHotkeys({
     // ... 现有选项
     onZoomTo100: zoomTo100,
+    // Story 8.5: Focus Mode
+    onToggleFocusMode: toggleFocusMode,
 });

+// AC2: 点击空白退出聚焦模式
+useEffect(() => {
+    if (!graph || !isReady) return;
+    const handleBlankClick = () => {
+        if (isFocusMode) exitFocusMode();
+    };
+    graph.on('blank:click', handleBlankClick);
+    return () => graph.off('blank:click', handleBlankClick);
+}, [graph, isReady, isFocusMode, exitFocusMode]);
```

#### Task 4.2: 添加 UI 按钮

```diff
 {/* Story 8.5: Focus Mode Button - 右上角工具栏 */}
 <div className="absolute top-4 right-4 z-50 pointer-events-auto">
     <FocusModeButton
         isFocusMode={isFocusMode}
         focusLevel={focusLevel}
         onToggle={toggleFocusMode}
         onLevelChange={setFocusLevel}
         disabled={!isReady || !selectedNodeIds.length}
     />
 </div>
 
 {/* View Controls: Bottom-Right Stack (ZoomIndicator 保持在右下角) */}
 <div className="absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
     {/* Story 8.3: Zoom Level Indicator */}
     <div className="pointer-events-auto">
         <ZoomIndicator ... />
     </div>
```

---

### Phase 5: 测试

#### Task 5.1: 单元测试 useFocusMode.test.ts

**路径**: `apps/web/__tests__/hooks/useFocusMode.test.ts`

**测试用例**:
- 无选中节点时 toggleFocusMode 无效 (AC5)
- 选中节点后激活聚焦模式 (AC1)
- 聚焦范围正确计算 - 1层 (AC1)
- 聚焦范围正确计算 - 2层、3层 (AC3)
- 再次 toggle 退出聚焦模式 (AC2)
- 选中变化时重新计算聚焦范围 (AC5)
- 边的透明度正确处理 (AC4)

#### Task 5.2: 组件测试 FocusModeButton.test.tsx

**路径**: `apps/web/__tests__/components/FocusModeButton.test.tsx`

**测试用例**:
- 渲染按钮
- 点击触发 onToggle
- 激活状态显示正确样式
- 层级选择器功能

#### Task 5.3: E2E 测试 focus-mode.spec.ts

**路径**: `apps/web/e2e/focus-mode.spec.ts`

**测试用例**: AC1-AC5 完整覆盖

---

## Verification Plan

### Automated Tests

#### 单元测试 (Vitest)

```bash
# 运行所有 web 测试 (包括新增的 useFocusMode 测试)
pnpm --filter @cdm/web test

# 仅运行 Focus Mode 相关测试
pnpm --filter @cdm/web test useFocusMode
pnpm --filter @cdm/web test FocusModeButton
```

**期望结果**: 所有测试通过，覆盖率 > 80%

#### E2E 测试 (Playwright)

```bash
# 运行 E2E 测试
pnpm --filter @cdm/web test:e2e

# 仅运行 Focus Mode E2E
pnpm --filter @cdm/web test:e2e focus-mode.spec.ts
```

**期望结果**: 8 个 E2E 测试全部通过

### Manual Verification

#### MV-1: 聚焦模式激活 (AC1)

1. 启动开发服务器: `pnpm dev`
2. 打开 http://localhost:3000/graph/test-graph?userId=test1
3. 点击选中画布上的某个节点
4. 按 `F` 键
5. **验证**: 非直接关联节点透明度降低到 ~20%；工具栏按钮高亮

#### MV-2: 聚焦模式退出 (AC2)

1. 在聚焦模式激活状态下
2. 再次按 `F` 键
3. **验证**: 所有节点恢复 100% 透明度

#### MV-3: 点击空白退出 (AC2)

1. 激活聚焦模式
2. 点击画布空白区域
3. **验证**: 聚焦模式自动退出

#### MV-4: 层级选择 (AC3)

1. 激活聚焦模式
2. 在下拉菜单中选择 "2层"
3. **验证**: 聚焦范围扩展到 2 层关联节点

---

## Dependencies

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@antv/x6` | 3.1.2 | node.setAttr(), graph.batchUpdate() |
| `lucide-react` | - | Focus 图标 |
| `@cdm/ui` | - | cn() utility |

---

## Notes

1. **性能**: 大规模节点 (1000+) 使用 `graph.batchUpdate()` 批量操作
2. **可访问性**: 按钮有 title 属性提供快捷键提示
3. **与 Story 8.1 交互**: 折叠的节点（不可见）不参与聚焦计算
4. **与 Story 8.9 智能折叠**: 两者功能互补，可组合使用
