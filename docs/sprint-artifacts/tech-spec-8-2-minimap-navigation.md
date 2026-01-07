# Tech-Spec: Story 8.2 - Minimap Navigation (小地图导航)

**Created:** 2026-01-06
**Status:** Ready for Development
**Story File:** [story-8-2-minimap-navigation.md](./story-8-2-minimap-navigation.md)

## Overview

### Problem Statement

在处理 500-5000+ 节点的大型图谱时，用户容易迷失方向，缺乏有效的全局导航工具。当前的平移和缩放操作无法提供快速的全局定位能力，导致：

1. 用户需要反复缩放来理解图谱全貌
2. 搜索结果定位后，难以理解目标节点在全图中的位置
3. 缺乏视觉反馈来显示当前视口在图谱中的位置

### Solution

实现基于 `@antv/x6` 内置 `MiniMap` 插件（样式来自 `@antv/x6-plugin-minimap`）的小地图导航系统，提供：

1. **全局缩略图** - 右下角显示整个图谱的缩略视图
2. **视口交互** - 拖动视口矩形实时平移主画布
3. **点击定位** - 点击小地图任意位置快速跳转
4. **高亮系统** - 选中节点和搜索匹配在小地图上高亮
5. **性能优化** - 简化渲染（节点色块，不渲染边）

### Scope (In/Out)

**In Scope:**
- ✅ 小地图容器 UI（Glassmorphism 风格）
- ✅ 视口拖动同步主画布
- ✅ 点击快速定位（带动画）
- ✅ 节点缩略显示
- ✅ 选中节点高亮
- ✅ 搜索匹配高亮
- ✅ 隐藏/显示切换
- ✅ 快捷键 `M` 切换
- ✅ 移动端自适应隐藏
- ✅ localStorage 偏好持久化

**Out of Scope:**
- ❌ 热力图功能（Story 8.10）
- ❌ 可拖拽调整大小
- ❌ 自定义缩放级别
- ❌ 边的渲染（性能考虑）

---

## Context for Development

### Codebase Patterns

#### 1. X6 Plugin 使用模式

参考 `apps/web/hooks/useGraph.ts`:

```typescript
// 插件初始化模式
import { Graph, Selection, History } from '@antv/x6';

const graph = new Graph({ ... });

// 通过 graph.use() 注册插件
const selectionPlugin = new Selection({ enabled: true, ... });
graph.use(selectionPlugin);

graph.use(new History({ enabled: true, stackSize: 50 }));
```

**关键点:**
- 插件在 `useGraph` 创建 Graph 后通过 `graph.use()` 注册
- 插件需要在 cleanup 时 dispose

#### 2. Hook 结构模式

参考 `apps/web/components/graph/hooks/useNodeCollapse.ts`:

```typescript
// Hook 接口定义
export interface UseNodeCollapseOptions {
    graph: Graph | null;
    isReady: boolean;
}

export interface UseNodeCollapseReturn {
    isCollapsed: (nodeId: string) => boolean;
    toggleCollapse: (nodeId: string) => void;
    // ...
}

// Hook 实现
export function useNodeCollapse({
    graph,
    isReady,
}: UseNodeCollapseOptions): UseNodeCollapseReturn {
    // 使用 useCallback 包装方法
    const isCollapsed = useCallback((nodeId: string): boolean => {
        // ...
    }, [graph]);

    // 使用 useEffect 监听事件
    useEffect(() => {
        if (!graph || !isReady) return;
        graph.on('node:change:data', handleDataChange);
        return () => graph.off('node:change:data', handleDataChange);
    }, [graph, isReady]);

    return { isCollapsed, toggleCollapse, ... };
}
```

#### 3. Hooks 导出模式

参考 `apps/web/components/graph/hooks/index.ts`:

```typescript
// Story 8.1: Node Collapse & Expand
export { useNodeCollapse } from './useNodeCollapse';
export type { UseNodeCollapseOptions, UseNodeCollapseReturn } from './useNodeCollapse';
```

#### 4. GraphComponent 集成模式

参考 `apps/web/components/graph/GraphComponent.tsx`:

```typescript
// Hook 使用
const collapse = useNodeCollapse({ graph, isReady });

// 事件处理通过 hooks
const handleToggleCollapse = useCallback(() => {
    collapse.toggleCollapse(selectedNodeId);
}, [collapse, selectedNodeId]);
```

### Files to Reference

| 文件 | 用途 |
|------|------|
| `apps/web/hooks/useGraph.ts` | X6 Graph 初始化和插件注册模式 |
| `apps/web/components/graph/hooks/useNodeCollapse.ts` | Hook 结构参考（562 行） |
| `apps/web/components/graph/hooks/index.ts` | Hook 导出模式 |
| `apps/web/components/graph/GraphComponent.tsx` | 组件集成模式 |
| `apps/web/components/CommandPalette/GlobalSearchDialog.tsx` | 搜索事件模式 |
| `packages/ui/src/collapse-toggle.tsx` | UI 组件参考 |

### Technical Decisions

#### TD-1: 使用官方 @antv/x6-plugin-minimap

**决策**: 使用 `@antv/x6-plugin-minimap` 而非自定义实现

**理由**:
- 官方维护，与 X6 3.1.2 兼容
- 内置视口拖动和点击定位
- 支持 `graphOptions` 自定义渲染
- 减少开发和维护成本

#### TD-2: 简化节点渲染

**决策**: Minimap 中只渲染节点色块，不渲染边

**理由**:
- 大量边会严重影响 minimap 渲染性能
- 小地图主要用于空间定位，边的细节不重要
- 通过 `graphOptions.createCellView` 返回 `null` 跳过边渲染

#### TD-3: 视口状态本地化

**决策**: Minimap 可见性偏好存储在 localStorage，不同步到 Yjs

**理由**:
- 各用户独立的视图偏好
- 避免协作时相互干扰
- 类似于 Story 8.1 的 collapse 视觉状态

#### TD-4: 高亮实现方案

**决策**: 通过自定义 `SimpleNodeView` 和数据属性实现高亮

**实现**:
```typescript
graphOptions: {
  createCellView(cell) {
    if (cell.isNode()) {
      const data = cell.getData() || {};
      if (data._minimapHighlight === 'selected') {
        return SelectedNodeView;
      }
      if (data._minimapHighlight === 'search') {
        return SearchMatchNodeView;
      }
      return SimpleNodeView;
    }
    return null; // 不渲染边
  }
}
```

---

## Implementation Plan

### Dependencies

```bash
# 安装 X6 Minimap 插件
pnpm add @antv/x6-plugin-minimap@^3.0.0 -F web
```

**依赖版本要求:**
- `@antv/x6`: ^3.1.2 (已安装)
- `@antv/x6-plugin-minimap`: ^3.0.x (需安装，仅样式包)

---

### Tasks

#### Phase 1: 基础设施

- [ ] **Task 1.1**: 安装 `@antv/x6-plugin-minimap` 依赖
  - 运行: `pnpm add @antv/x6-plugin-minimap@^3.0.0 -F web`
  - 验证: `package.json` 包含依赖

- [ ] **Task 1.2**: 创建 `useMinimap` hook
  - 文件: `apps/web/components/graph/hooks/useMinimap.ts`
  - 接口:
    ```typescript
    export interface UseMinimapOptions {
      graph: Graph | null;
      isReady: boolean;
      containerRef: RefObject<HTMLDivElement>;
      enabled?: boolean;
      onViewportChange?: (rect: { x: number; y: number; width: number; height: number }) => void;
    }
    
    export interface UseMinimapReturn {
      isEnabled: boolean;
      toggle: () => void;
      show: () => void;
      hide: () => void;
      highlightNodes: (nodeIds: string[], type: 'selected' | 'search') => void;
      clearHighlights: () => void;
    }
    ```

- [ ] **Task 1.3**: 添加 hook 导出到 `hooks/index.ts`

#### Phase 2: UI 组件

- [ ] **Task 2.1**: 创建 `MinimapContainer` 组件
  - 文件: `apps/web/components/graph/parts/MinimapContainer.tsx`
  - Props:
    ```typescript
    interface MinimapContainerProps {
      graph: Graph | null;
      isReady: boolean;
      selectedNodeId?: string | null;
      searchMatchIds?: string[];
    }
    ```
  - 样式: Glassmorphism, 固定右下角

- [ ] **Task 2.2**: 创建 `MinimapToggleButton` 组件
  - 文件: `apps/web/components/graph/parts/MinimapToggleButton.tsx`
  - 隐藏时显示的浮动按钮

- [ ] **Task 2.3**: 集成到 GraphComponent
  - 修改: `apps/web/components/graph/GraphComponent.tsx`
  - 添加 MinimapContainer 渲染

#### Phase 3: 高亮功能

- [ ] **Task 3.1**: 实现选中节点高亮 (AC5)
  - 监听 `selection:changed` 事件
  - 更新 minimap 中对应节点样式

- [ ] **Task 3.2**: 实现搜索匹配高亮 (AC6)
  - 订阅 GlobalSearchDialog 搜索结果
  - 通过 Context 或事件传递匹配 ID
  - 更新 minimap 中匹配节点样式

#### Phase 4: 快捷键与持久化

- [ ] **Task 4.1**: 添加 `M` 键快捷键
  - 修改: `apps/web/components/graph/hooks/useGraphHotkeys.ts`

- [ ] **Task 4.2**: 创建 `useMinimapStorage` hook
  - 文件: `apps/web/hooks/useMinimapStorage.ts`
  - localStorage key: `cdm-minimap-visible`

- [ ] **Task 4.3**: 移动端自适应
  - 屏幕 < 768px 时默认隐藏

#### Phase 5: 测试

- [ ] **Task 5.1**: 单元测试
  - `apps/web/__tests__/hooks/useMinimap.test.ts`

- [ ] **Task 5.2**: 组件测试
  - `apps/web/__tests__/components/MinimapContainer.test.tsx`

- [ ] **Task 5.3**: E2E 测试
  - `apps/web/e2e/minimap.spec.ts`

---

### Acceptance Criteria

- [x] **AC1**: 页面加载时右下角显示小地图（可隐藏）
- [x] **AC2**: 拖动视口矩形实时平移主画布
- [x] **AC3**: 点击小地图区域快速定位（带动画）
- [x] **AC4**: 小地图显示节点缩略轮廓
- [x] **AC5**: 选中节点在小地图上高亮
- [x] **AC6**: 搜索匹配节点在小地图上高亮

---

## Additional Context

### X6 MiniMap Plugin API

```typescript
import { MiniMap } from '@antv/x6';
import '@antv/x6-plugin-minimap/es/index.css';

const minimap = new MiniMap({
  container: containerElement,       // 必需: 挂载容器
  width: 200,                        // 默认 300
  height: 150,                       // 默认 200
  padding: 10,                       // 内边距
  scalable: true,                    // 是否可缩放
  minScale: 0.01,                    // 最小缩放
  maxScale: 1,                       // 最大缩放
  graphOptions: {                    // 自定义渲染
    createCellView(cell) {
      if (cell.isNode()) return SimpleNodeView;
      return null; // 不渲染边
    }
  }
});

graph.use(minimap);

// 方法
minimap.show();
minimap.hide();
minimap.dispose();
```

### SimpleNodeView 实现参考

```typescript
import { NodeView } from '@antv/x6';

// 普通节点视图 - 简单矩形
class SimpleNodeView extends NodeView {
  render() {
    const { width, height } = this.cell.getSize();
    return this.container.innerHTML = `
      <rect width="${width}" height="${height}" 
            fill="var(--muted)" rx="2" />
    `;
  }
}

// 选中节点视图 - 主色边框
class SelectedNodeView extends NodeView {
  render() {
    const { width, height } = this.cell.getSize();
    return this.container.innerHTML = `
      <rect width="${width}" height="${height}" 
            fill="var(--primary)" rx="2" />
    `;
  }
}

// 搜索匹配视图 - 黄色高亮
class SearchMatchNodeView extends NodeView {
  render() {
    const { width, height } = this.cell.getSize();
    return this.container.innerHTML = `
      <rect width="${width}" height="${height}" 
            fill="#facc15" rx="2" />
    `;
  }
}
```

### Testing Strategy

| 测试类型 | 文件 | 覆盖范围 |
|----------|------|----------|
| 单元测试 | `useMinimap.test.ts` | Hook 方法、状态管理 |
| 组件测试 | `MinimapContainer.test.tsx` | 渲染、交互、可访问性 |
| E2E 测试 | `minimap.spec.ts` | AC1-AC6 完整流程 |

### Performance Notes

1. **延迟初始化**: 在 1000+ 节点场景下，考虑延迟加载 minimap
2. **简化渲染**: 使用 `graphOptions.createCellView` 只渲染节点色块
3. **节流更新**: 高亮变化使用 debounce 避免频繁重绘
4. **内存警告**: 参考 Story 3.5，在堆内存 > 350MB 时可考虑禁用

### Notes

- 小地图可见性是**本地偏好**，不通过 Yjs 同步
- 与 Story 8.1 折叠功能协同：折叠的节点在小地图中仍显示父节点
- 后续 Story 8.10 将在此基础上添加热力图功能
