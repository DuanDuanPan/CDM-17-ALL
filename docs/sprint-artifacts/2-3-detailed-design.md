# Story 2.3 Detailed Functional Design: Multi-View Synchronization
# Story 2.3 功能详细设计：多视图联动

**相关 Story:** [2.3-multi-view-synchronization](2-3-multi-view-synchronization.md)
**Status:** Draft
**Last Updated:** 2025-12-19

## 1. 总体设计理念 (Design Philosophy)

本模块的核心在于 **"数据投影 (Data Projections)"** 模式。
*   **单一数据源 (Single Source of Truth):** 所有的业务数据（任务、时间、状态、依赖）均存储在 Yjs SharedMap (Mindmap Graph) 中。
*   **视图即投影 (Views as Projections):** 甘特图和看板不持有状态，它们只是 Mindmap 数据的不同“渲染方式”。
*   **双向同步 (Two-Way Sync):** 视图上的操作（拖拽、编辑）直接转换为对底层 Yjs 数据的原子操作 (Atomic Operations)。

## 2. 核心算法逻辑 (Core Algorithms)

### 2.1 甘特图：最近任务祖先查找 (Nearest Task Ancestor)
**需求：** 忽略中间的非任务节点（如 PBS、文件夹节点），建立逻辑上的“任务树”。

```typescript
/**
 * 查找逻辑上的 Gantt 父节点
 * @param node 当前节点
 * @param allNodes 所有节点 Map
 * @returns 逻辑父节点 ID (TaskNode 或 RootID)
 */
function findGanttParent(node: Node, allNodes: Map<string, Node>): string | null {
  let current = allNodes.get(node.parentId);
  
  while (current) {
    // 1. 如果找到根节点，停止，返回根节点 ID
    if (current.isRoot) return current.id;
    
    // 2. 如果找到任务节点，停止，返回该任务节点 ID
    if (current.data.isTask) return current.id;
    
    // 3. 否则继续向上查找
    current = allNodes.get(current.parentId);
  }
  
  return null; // 孤立节点
}
```

### 2.2 甘特图：依赖关系映射 (Dependency Mapping)
**需求：** 将脑图中的连线 (Edges) 转换为甘特图的依赖线。

*   **输入：** 所有的 Edges。
*   **过滤规则：** 仅保留 `type === 'dependency'` 的 Edge。
*   **连接点：**
    *   Source Node (Task A) -> Target Node (Task B).
    *   如果 Source 或 Target 被此视图“折叠”或过滤，则该依赖线不渲染，或渲染为指向“折叠组”的虚线（高级特性，v1可暂不实现）。

### 2.3 看板：动态分组 (Dynamic Grouping)
**需求：** 支持按“状态”或“自定义维度”分组。

```typescript
type GroupingMode = 'status' | 'custom_field' | 'tag';

function getGroupKey(node: Node, mode: GroupingMode, customField?: string): string {
  if (mode === 'status') {
    return node.data.task.status; // 'TODO', 'IN_PROGRESS', 'DONE'
  }
  if (mode === 'custom_field' && customField) {
    return node.data.properties[customField] || 'Uncategorized';
  }
  // Tag 模式较为特殊，一个节点可能有多个 Tag，通常需要复制显示或取第一个
  return 'Uncategorized'; 
}
```

## 3. 组件架构设计 (Component Architecture)

### 3.1 目录结构 (Directory Structure)
```text
apps/web/src/features/views/
├── ViewManager.tsx             # 视图容器与切换器 (Tabs: Mindmap | Kanban | Gantt)
├── shared/
│   ├── ViewToolbar.tsx         # 视图通用的工具栏 (Filter, Zoom, GroupBy)
│   └── useViewData.ts          # 核心 Hook：从 Graph 转换数据
├── components/
│   ├── Gantt/
│   │   ├── GanttChart.tsx      # 入口
│   │   ├── TimelineHeader.tsx  # 时间轴头
│   │   ├── TaskRow.tsx         # 任务行（左侧树状列表）
│   │   ├── TaskBar.tsx         # 时间条（右侧可拖拽条）
│   │   └── DependencyLine.svg  # 连线层
│   └── Kanban/
│       ├── KanbanBoard.tsx     # 入口 (DndContext)
│       ├── KanbanColumn.tsx    # 列 (SortableContext)
│       └── KanbanCard.tsx      # 卡片 (Draggable)
```

### 3.2 状态管理 (State Management)
我们引入一个 `ViewStore` (Zustand) 来管理**纯UI状态**（不持久化到 Yjs）：

```typescript
interface ViewState {
  currentView: 'mindmap' | 'kanban' | 'gantt';
  
  // 甘特图 UI 状态
  ganttZoomLevel: 'day' | 'week' | 'month';
  ganttExpandedRows: Record<nodeId, boolean>; // 展开/折叠状态
  
  // 看板 UI 状态
  kanbanGroupBy: 'status' | string; // 分组字段
  
  actions: {
    setView: (view) => void;
    toggleGanttRow: (nodeId) => void;
    setKanbanGroup: (field) => void;
  }
}
```

## 4. 交互详细设计 (Interaction Detail)

### 4.1 甘特图交互
1.  **拖拽移动 (Move Task):**
    *   用户拖拽 `TaskBar`。
    *   **计算：** `deltaX` 转换为 `deltaTime`。
    *   **更新：** `NewStart = OldStart + deltaTime`, `NewEnd = OldEnd + deltaTime`。
    *   **触发：** `node.update({ task: { startDate, dueDate } })`。
    *   *约束：* 如果开启了“自动排程”（v2特性，Story 2.3暂不强制），需要递归更新后置任务。v1 版本允许违反依赖约束，但显示红色警告线。

2.  **拖拽调整大小 (Resize Task):**
    *   用户拖拽 `TaskBar` 的右边缘。
    *   **更新：** 仅 `dueDate` 变化。

3.  **双击 (Edit):**
    *   双击 `TaskBar` 弹出 `NodeDetailModal`（复用脑图的节点详情弹窗）。

### 4.2 看板交互
1.  **卡片拖拽 (Card DnD):**
    *   使用 `@dnd-kit`。
    *   **DragEnd 事件：**
        *   获取 `active.id` (Card ID) 和 `over.id` (Column ID).
        *   如果 `over.id` 是不同的列 -> 更新 Node 属性。
        *   例如：从 "TODO" 列拖到 "DONE" 列 -> `node.update({ task: { status: 'DONE' } })`。
2.  **列内排序 (Reorder):**
    *   v1 版本：看板内的排序**不影响**脑图结构，仅为本地视图排序（或基于 `updatedAt` 排序）。
    *   v2 版本：如果需要持久化优先级，需要增加 `priority` 字段。

## 5. UI/UX 规范 (Magic UI & Shadcn)

### 5.1 甘特图样式
*   **配色：**
    *   TimeBar 颜色根据 `status` 变化：
        *   TODO: `bg-slate-400`
        *   IN_PROGRESS: `bg-blue-500`
        *   DONE: `bg-green-500` (变淡/去饱和)
        *   DELAYED (逾期): `bg-red-500` (且显示警告图标)
*   **圆角与质感：**
    *   TimeBar 使用 `rounded-md`。
    *   Hover 时显示 `HasShadow` 和详细 Tooltip。

### 5.2 看板样式
*   **列头 (Column Header):** 使用 Glassmorphism (毛玻璃) 背景，Sticky Top。
*   **卡片 (Card):**
    *   `Card` 组件 (Shadcn)。
    *   显示摘要：标题、执行人头像、截止日期 Badge。
    *   拖拽时：被拖拽卡片透明度 0.8，缩放 1.05，增加 DropShadow。

## 6. 异常处理与边界情况 (Edge Cases)

1.  **无时间属性的任务：**
    *   在甘特图中，如果任务没有 start/end date：
    *   *处理：* 放置在“未排程(Unscheduled)”侧边栏，或者给一个默认显示的“在此处添加日期”的占位条（点击即赋今日日期）。
2.  **循环依赖：**
    *   如果 A -> B -> A。
    *   *处理：* 检测算法发现闭环，依赖线显示为红色警告色，不进行自动排程计算。
3.  **权限控制：**
    *   只读用户 (Viewer) 可以切换视图、查看详情，但**无法拖拽**。
    *   实现：`Draggable` 组件的 `disabled` 属性绑定 `!canEdit`。

## 7. 性能优化策略 (Performance)

1.  **甘特图虚拟化 (Virtualization):**
    *   水平方向：只渲染视口（Viewport）日期范围内的列。
    *   垂直方向：使用 `react-window` 或手动计算，只渲染可视区域的行。
2.  **看板分页/Load More:**
    *   如果单列卡片超过 50 张，采用“滚动到底部加载更多”策略（虽然 Yjs 数据全在本地，但 DOM 渲染需控制）。

## 8. 测试计划 (Test Plan)

*   [ ] **Unit:** `findGanttParent` 算法覆盖所有层级情况（直接父子、跨层级、根节点下）。
*   [ ] **Unit:** `getGroupKey` 自定义分组逻辑测试。
*   [ ] **E2E:** Playwright 脚本模拟：
    1.  脑图模式创建节点 A、B。
    2.  切换 Gantt，拖拽 A 的时间。
    3.  切换 Mindmap，验证 A 的时间属性已变更。
    4.  切换 Kanban，将 A 拖入 Done。
    5.  验证 A 的状态变更为 Done。
