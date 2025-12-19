# UI 设计优化与改造方案 (UI Redesign & Refactoring Plan)

## 1. 目标 (Objective)
针对当前任务依赖网络视图 (Dependency Network) 中存在的空间浪费和信息密度低的问题，执行 UI/UX 深度优化。目标是打造一个**紧凑、专业、高密度**的工程化视图，提升单屏信息承载量 150% - 200%。

## 2. 改造范围 (Scope)

### 2.1 组件层改造 (`apps/web/components/nodes/MindNode.tsx`)
核心仍然是 React 节点组件的渲染逻辑重构。

- **全局固定宽度 (Fixed Width)**:
  - 废除普通节点 (`ORDINARY`) 的动态宽度计算逻辑。
  - 统一所有节点类型宽度为 **220px** (原 240px/动态)。
  
- **紧凑布局 (Compact Layout)**:
  - **Padding**: 从 `p-4` (16px) 减少至 `p-2` (8px)。
  - **Gap**: 从 `gap-2` (8px) 减少至 `gap-0.5` (2px).
  - **Height**: 采用内容自适应但极为紧凑的策略。
  
- **内部结构重组**:
  - **Header**: Icon (16px) + Title (14px Bold) 单行排列，右侧放 Menu Trigger。
  - **Body**: Description 仅限 1 行 (`line-clamp-1`)，字体缩小至 10px-11px，若为空则隐藏。
  - **Footer**: Tag/Pill (10px) + Meta Icon/ID 左右对齐，置于底部边缘。

### 2.2 布局算法参数调优 (`packages/plugins/plugin-layout/...`)
仅仅减小节点尺寸是不够的，必须同步压缩节点间的间距。

- **网络布局 (`NetworkLayout.ts`)**:
  - `nodesep` (水平间距): 50 -> **20** (紧密排列)。
  - `ranksep` (层级间距): 80 -> **40** (减少连线跨度)。
  
- **思维导图布局 (`MindmapLayout.ts`)**:
  - `DEFAULT_HORIZONTAL_GAP`: 60 -> **30**。
  - `DEFAULT_VERTICAL_GAP`: 40 -> **10** (在紧凑树状图中，垂直间距可以非常小)。

## 3. 详细变更计划 (Implementation Steps)

### Step 1: 节点组件重构 (Refactor MindNode)
修改 `apps/web/components/nodes/MindNode.tsx`:
1.  定义 `const NODE_WIDTH = 220;`。
2.  移除 `useLayoutEffect` 中针对 `ORDINARY` 节点的特殊宽度计算，强制应用 `NODE_WIDTH`。
3.  重写 JSX 结构：
    - 使用 `flex-row` 头部。
    - 调整 Tailwind 类名：`text-xs`, `p-2`, `leading-tight`。
    - 为 Title 添加 `truncate` 防止换行破坏布局，提供 `title` 属性显示完整文本。

### Step 2: 布局参数调整 (Tune Layout Algorithms)
1.  修改 `packages/plugins/plugin-layout/src/strategies/NetworkLayout.ts`:
    - 更新 `dagre` 配置对象的 `nodesep` 和 `ranksep`。
2.  修改 `packages/plugins/plugin-layout/src/strategies/MindmapLayout.ts`:
    - 更新默认 GAP 常量。

## 4. 变更影响与风险分析 (Impact Analysis)

| 变更点 | 潜在影响 (Risk) | 缓解措施 (Mitigation) |
| :--- | :--- | :--- |
| **由动态宽度改为固定宽度** | 长文本标题会被截断，用户无法一眼看到完整信息。 | 1. 添加浏览器原生 `title` 提示。<br>2. 双击编辑时显示完整文本框。<br>3. 鼠标悬停显示 Tooltip (后续优化)。 |
| **高度压缩间距** | 连线可能会变得陡峭，或者在复杂交叉时显得混乱。 | `dagre` 算法通常能处理好，但需验证 `ranksep=40` 是否足以容纳贝塞尔曲线的弯曲，避免线穿过节点。可能需回调至 50/60。 |
| **点击误触** | 节点变小，操作按钮（如 More Menu）变得密集，容易误触。 | 保持按钮点击热区 (hit area) 不变，仅缩小视觉图标大小。 |
| **自动化测试** | 原有的截图测试或布局快照如果存在，必定失败。 | 如果有 Visual Regression Tests，需要更新基准图。目前项目中似乎主要是单元测试，影响较小。 |

## 5. 验收标准 (Acceptance Criteria)
1.  所有节点（含普通文本节点）宽度严格一致 (220px)。
2.  单屏（1920x1080）可显示的节点数量比之前增加明显。
3.  节点内部无明显的"无效留白" (Wasted Whitespace)。
4.  拖拽、连线功能正常，无布局错乱。
