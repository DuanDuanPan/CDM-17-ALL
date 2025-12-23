---
artifactType: implementation_plan
title: "UI/UX Enhancement & Vertical Layout Impact Analysis"
description: "Analysis of implementing Rich Card UI and Top-Down Layout leveraging existing data structures."
---

## 1. 总体影响评估 (Overall Impact Assessment)

| 领域 (Area) | 影响等级 (Impact Level) | 描述 (Description) |
| :--- | :--- | :--- |
| **Frontend Components** | **High** | `MindNode.tsx` 需要从单一渲染逻辑重构为多变体（Variant）架构，以支持“极简模式”和“详情卡片模式”的切换。 |
| **Layout Engine** | **Medium** | 需要新增全新的 `OrgChartLayout`（自上而下布局），并解决与现有思维导图布局的切换时的连线锚点兼容性问题。 |
| **Data & Types** | **Low** | 主要复用现有的 `TaskProps` 和 `AppProps`。无需修改数据库 Schema，只需前端适配数据展示格式。 |
| **Performance** | **Medium** | 渲染复杂的“卡片模式”包含更多 DOM 元素（图标、多行文本、头像），在大规模节点（>100）场景下需关注渲染性能。 |

---

## 2. 前端组件影响 (MindNode.tsx)

### 现状
目前 `MindNode` 是一个单一组件，内部通过大量的 `if/else` 判断来处理不同类型 (`TASK`, `PBS`, `REQUIREMENT`) 的样式。代码行数已超过 500 行，维护成本较高。

### 改造影响
引入“参考图”中的**卡片 UI** 意味着每个节点需要展示的信息量翻倍（工期、时间范围、成本、负责人、图标）。

**建议方案**:
1.  **拆分组件**: 必须对 `MindNode` 进行拆分，否则文件将变得不可维护。
    *   `MindNode` (Container): 负责逻辑状态（选中、编辑、Hover）、事件分发。
    *   `NodeRenderers` (Folder):
        *   `CompactRenderer`: 现有的单行文本样式（用于普通思维导图）。
        *   `CardRenderer`: **新增**，支持 Header(Icon+Title) + Body(Metadata) + Footer(Status/User) 的布局。
2.  **状态映射**: 需要编写 Utilities 函数，将 `TaskStatus` / `Priority` 映射为具体的 Tailwind 颜色类（如左侧的状态色条）。

## 3. 布局引擎影响 (Layout Engine)

### 现状
现有 `MindmapLayout` (水平) 和 `LogicLayout` (向右)。

### 改造影响
1.  **新增策略**: 实现 `OrgChartLayout` 类。
    *   **算法**: 复用 `antv/hierarchy` 的 `mindmap` 算法，但参数设为垂直方向 (`V`)。
    *   **间距策略**: 垂直布局需要更大的垂直间距 (`vGap: 80-100px`) 来容纳 S 型连线，避免连线穿过节点文本。
2.  **连线锚点 (Anchors)**:
    *   **水平布局**: 锚点通常是 `Right` (Source) -> `Left` (Target)。
    *   **垂直布局**: 锚点必须强制变为 `Bottom` (Source) -> `Top` (Target)。
    *   **影响**: `GraphComponent` 需要根据当前 `LayoutMode` 动态更新所有 Edge 的锚点配置，否则切换布局时连线位置会错乱。

## 4. 连线与交互影响 (Edges & Interaction)

### 连接器 (Connector)
*   **现状**: 使用 `smooth` 或 `rounded`。
*   **改造**: 垂直组织图的最佳实践是使用 **"S-Curve"**（三次贝塞尔曲线，`connector: 'smooth'`），且需要调整贝塞尔的控制点方向 (`direction: 'vertical'`) 以确保线条从底部垂直向下延伸后再弯曲。

### 交互体验
*   **平移/缩放**: 垂直布局通常比水平布局更“高”，用户可能需要更多地进行垂直滚动。
*   **折叠/展开**: 垂直树的折叠逻辑与水平导图一致，视觉效果上是收起下方的子树。

## 5. 数据聚合计算 (App-level Enhancement)

### 需求
参考图中，父节点往往显示汇总信息。虽然我们不改后端，但前端可以做**实时聚合**。

### 影响
需要在 `GraphComponent` 或 `MindNode` 父容器层级引入简单的计算逻辑：
*   **Effort 汇总**: 父节点检测子节点是否包含 `effort` 字段，若有，则在渲染父节点时显示 `∑ effort`。
*   **Progress 汇总**: 简单的加权平均。
*   **注意**: 这属于纯前端的“视图层增强”，不会回写数据库，保持数据纯净。

---

## 结论与推荐路径

此次改造主要集中在 **视图层（View Layer）**，风险可控。

**推荐实施顺序**：
1.  **Refactor**: 先将 `MindNode` 拆分为 `Container` + `Renderers` 模式。（降低复杂度）
2.  **UI**: 实现 `CardRenderer`，复刻参考图的“白底卡片+状态色条+富信息”样式。（提升颜值）
3.  **Layout**: 实现 `OrgChartLayout` 及垂直连线逻辑。（支持架构视图）
