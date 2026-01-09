# Tech-Spec: Semantic Zoom / Level of Detail (Story 8.8)

**Created:** 2026-01-09
**Status:** Ready for Development
**Story Link:** [story-8-8-semantic-zoom-lod.md](./story-8-8-semantic-zoom-lod.md)

---

## Overview

### Problem Statement

在处理大规模图谱（500-5000+ 节点）时，用户缩小画布查看全局结构时，节点内容（标题、描述、属性标签）全部挤在一起变得难以辨认。当前系统在任何缩放级别都显示节点的完整内容，这在低缩放级别下造成视觉拥挤，无法快速识别结构。

### Solution

实现语义缩放 / LOD（Level of Detail）系统：
- 创建 `LODContext` 传递当前 LOD 级别到节点组件
- 复用 `useGraphTransform` 获取 `scale`
- 修改三个节点渲染器适配新的高精度设计 (Glassmorphic Card / Compact Pill / Semantic Dot)
- LOD 阈值：≥60% Full, 30%-59% Compact, <30% Micro (Icon)

### Scope (In/Out)

**In Scope:**
- ✅ `useGraphTransform` scale 复用与阈值计算 (60% / 30%)
- ✅ `LODContext` 提供当前 LOD 级别
- ✅ 三层 LOD 视觉实现：
  - LOD-0 (Full): Glassmorphic Card (Icon + Title + Desc + Tags)
  - LOD-1 (Compact): Compact Pill (Icon + Title Truncated)
  - LOD-2 (Micro): Semantic Dot (Icon only)
- ✅ 视觉过渡：Spring Physics (CSS simulation)
- ✅ 与 Focus Mode (Story 8.5) 兼容

**Out of Scope:**
- ❌ 边的 LOD（暂不处理）
- ❌ 节点动态 resize 布局计算 (Phase 2, 使用 CSS 布局自适应)
- ❌ 用户可配置阈值

---

## Context for Development

### Codebase Patterns

#### 1. 现有缩放状态来源

`GraphComponent.tsx` 已通过 `useGraphTransform` hook 获取 `scale`:

```typescript
// GraphComponent.tsx:235
const { canvasOffset, scale } = useGraphTransform({ graph, isReady });
```

#### 2. 节点渲染架构

`MindNode.tsx` 使用三个子渲染器：`OrdinaryNode`, `RichNode`, `LegacyCardNode`。需分别适配新的视觉风格。

### Technical Decisions

#### TD-1: LOD 状态传递方式

**决策**: 使用 React Context + 直接 Props 组合

**理由**: 
- `MindNode` 是 React Shape 渲染的 React 组件，Context 避免逐节点 `setData()` 性能开销
- Context 变化触发批量重渲染

#### TD-2: LOD 阈值定义 (Update)

| 缩放级别 | LOD Level |
|---------|-----------|
| `>= 0.6` | `full` (LOD-0) |
| `>= 0.3 && < 0.6` | `compact` (LOD-1) |
| `< 0.3` | `icon` (LOD-2) |

```typescript
export type LODLevel = 'full' | 'compact' | 'icon';

export function getLODLevel(scale: number): LODLevel {
  if (scale < 0.3) return 'icon';
  if (scale < 0.6) return 'compact';
  return 'full';
}
```

#### TD-3: 节点内容条件渲染与样式 (Design Tokens)

**实现方案**: 使用 Tailwind Utility Classes 实现设计规范。

- **LOD-0 (Full)**: `bg-card/90 backdrop-blur-sm border-muted/20 shadow-sm rounded-lg`
- **LOD-1 (Compact)**: `bg-card shadow-sm rounded-md h-[36px] flex items-center px-2.5`
- **LOD-2 (Micro)**: `size-6 rounded-full shadow-md flex items-center justify-center`

#### TD-4: 过渡动画 (Spring Physics without framer-motion)

**决策**: 使用 CSS `transition` 配合 spring-like bezier 曲线，不引入 `framer-motion` 以保持轻量。

```css
/* Spring-like transition */
.lod-transition {
  transition-property: opacity, transform, height, width, border-radius;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* spring-like */
}

/* Reduced motion fallback */
@media (prefers-reduced-motion: reduce) {
  .lod-transition {
    transition: opacity 200ms ease-out;
  }
}
```

**理由**: `framer-motion` 未在当前依赖中，使用 CSS 可达到类似效果且无额外 bundle 开销。

---

## Implementation Plan

### Phase 1: LOD Context 创建

#### Task 1.1: 创建 `LODContext.tsx`

**文件**: `apps/web/components/graph/contexts/LODContext.tsx`

```typescript
'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type LODLevel = 'full' | 'compact' | 'icon';

const LODContext = createContext<LODLevel>('full');

export function useLODContext(): LODLevel {
  return useContext(LODContext);
}

// Updated thresholds: 0.3 / 0.6
export function getLODLevel(scale: number): LODLevel {
  if (scale < 0.3) return 'icon';
  if (scale < 0.6) return 'compact';
  return 'full';
}

interface LODProviderProps {
  scale: number;
  children: ReactNode;
}

export function LODProvider({ scale, children }: LODProviderProps) {
  const lodLevel = getLODLevel(scale);
  return <LODContext.Provider value={lodLevel}>{children}</LODContext.Provider>;
}
```

### Phase 2: GraphComponent 集成

#### Task 2.1: 包裹 LODProvider

**文件**: `apps/web/components/graph/GraphComponent.tsx` (MODIFY)

```typescript
// 添加 import
import { LODProvider } from './contexts';

// 在 return 中包裹 graph-container
return (
  <div className="relative w-full h-full">
    <LODProvider scale={scale}>
      {/* Graph Canvas */}
      <div
        id="graph-container"
        ref={containerRef}
        ...
      />
    </LODProvider>
    {/* ... rest unchanged ... */}
  </div>
);
```

### Phase 3: MindNode LOD 支持

#### Task 3.1: 在 MindNode 获取 LOD 级别

**文件**: `apps/web/components/nodes/MindNode.tsx` (MODIFY)

```typescript
// 添加 import
import { useLODContext, type LODLevel } from '@/components/graph/contexts';

// 在组件内获取 LOD
export function MindNode({ node }: MindNodeProps) {
  const lodLevel = useLODContext();
  
  // ... 传递给子渲染器
  return (
    <OrdinaryNode ... lodLevel={lodLevel} />
    // 或
    <RichNode ... lodLevel={lodLevel} />
    // 或
    <LegacyCardNode ... lodLevel={lodLevel} />
  );
}
```

#### Task 3.2: 修改 OrdinaryNode 支持 LOD

**文件**: `apps/web/components/nodes/OrdinaryNode.tsx` (MODIFY)

```typescript
export function OrdinaryNode({ lodLevel = 'full', ...props }: OrdinaryNodeProps) {
  // Icon mode (LOD-2): Micro Node
  if (lodLevel === 'icon') {
    return (
      <div className="size-6 rounded-full bg-blue-500 shadow-md border-2 border-white/50 flex items-center justify-center lod-transition">
        {/* Simple Icon */}
      </div>
    );
  }
  
  // Compact mode (LOD-1): Pill
  if (lodLevel === 'compact') {
      // Return pill style
  }
  
  // Full mode (LOD-0)
  return ( /* ... existing render ... */ );
}
```

#### Task 3.3: 修改 RichNode 支持 LOD

**文件**: `apps/web/components/nodes/RichNode.tsx` (MODIFY)

应用 Glassmorphism 和详细设计规范。

#### Task 3.4: 修改 LegacyCardNode 支持 LOD

**文件**: `apps/web/components/nodes/LegacyCardNode.tsx` (MODIFY)

与 RichNode 类似的条件渲染逻辑。

### Phase 4: 测试

需要更新测试用例中的阈值：0.6, 0.3。

---

## Acceptance Criteria

- [x] AC1: 缩放到 < 60% 时切换为 Compact 模式 (隐去描述)
- [x] AC2: 缩放到 < 30% 时切换为 Micro 模式 (仅显示 Dot)
- [x] AC3: 放大回 ≥ 60% 时恢复 Full 模式 (完整信息卡片)
- [x] AC4: 过渡平滑无跳变 (Spring Physics Simulation)
- [x] AC5: 与 Focus Mode 兼容

---

## Additional Context

### Dependencies

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@antv/x6` | 3.1.2 | 图形渲染 |
| React Context | - | LOD 状态传递 |
| Tailwind CSS | - | 样式实现 |

### Notes

- 已确认不引入 `framer-motion`，使用 CSS `cubic-bezier` 模拟 Spring 动画。
- 需注意 CSS `transition` 可能会对性能造成微小影响，在极大量节点时需监控 FPS。
