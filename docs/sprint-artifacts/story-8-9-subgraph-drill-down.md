# Story 8.9: 子图下钻导航 (Subgraph Drill-Down Navigation)

Status: review
Tech-Spec: [tech-spec-8-9-subgraph-drill-down.md](./tech-spec-8-9-subgraph-drill-down.md)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **用户**,
I want **通过右键菜单或快捷键进入节点的子图视图，并通过面包屑导航返回**,
so that **我能深入探索复杂子系统的细节，同时保持与父图的上下文关联。**

## Problem Statement

在处理大规模复杂图谱（500-5000+ 节点）时，用户面临以下痛点：

1. **视觉过载**：大量节点同时展示导致信息过载，难以聚焦特定子系统
2. **上下文丢失**：缩放查看细节时容易迷失当前位置与整体结构的关系
3. **协作困难**：多人协同时，不同用户可能在查看同一图谱的不同"深度"，缺乏同步机制
4. **导航效率低**：频繁缩放和平移来查看不同层级，效率低下

子图下钻导航通过允许用户"进入"任意节点查看其子树作为独立子图，结合面包屑导航提供清晰的层级路径，并确保子图内的数据变更通过 Yjs 与其他客户端实时同步（下钻路径本身不同步）。

## Scope

**In Scope:**
- ✅ 子图下钻入口：右键菜单"进入子图"或快捷键 `Cmd/Ctrl+Enter`（有子节点时可用）
- ✅ 面包屑导航栏：显示当前路径（根 → 父节点 → 当前节点），点击可快速返回
- ✅ 子图视图渲染：以选中节点为新的"根"，只渲染其直接子树
- ✅ 下钻状态持久化：刷新页面后保持当前下钻位置（URL hash + sessionStorage）
- ✅ 返回上层：通过点击面包屑导航返回（无专用快捷键）

**Out of Scope:**
- ❌ 多客户端下钻路径同步（Yjs Awareness）—— 下钻是本地视图状态
- ❌ 双击下钻（双击保持现有编辑模式行为）
- ❌ 返回上层快捷键（仅通过面包屑导航返回）
- ❌ 跨图引用与血缘可视化（Story 5.3）
- ❌ 子图独立权限控制（Epic 3 安全相关）
- ❌ 子图导出为独立文件（Epic 3 导出相关）
- ❌ 下钻动画的复杂过渡效果（可在后续迭代增强）

---

## Acceptance Criteria (验收标准)

### AC1: 右键菜单进入子图
**Given** 一个有子节点的节点
**When** 右键节点并选择"进入子图"（或选中后按 `Cmd/Ctrl+Enter`）
**Then** 视图应切换为以该节点为根的子图视图
**And** 只显示该节点及其所有后代节点
**And** 切换应有平滑过渡动画（遵守 `prefers-reduced-motion`）

### AC2: 面包屑导航显示与交互
**Given** 用户已下钻到某个深层节点
**When** 查看画布顶部
**Then** 应显示面包屑路径（如：根主题 › 系统设计 › 后端架构）
**When** 点击面包屑中的任意层级
**Then** 视图应快速切换到对应层级的子图
**And** 面包屑应更新为新的路径

### AC3: 通过面包屑返回上层
**Given** 用户处于下钻的子图视图中
**When** 点击面包屑中的父层级项
**Then** 应返回对应层级的子图视图
**When** 点击面包屑根节点（Home 图标）
**Then** 应返回主图视图
**And** 面包屑路径应正确更新

### AC4: 子图数据变更自动同步
**Given** 用户A在子图视图中，用户B在主图或其他子图视图中
**When** 用户A在子图中添加/修改/删除节点
**Then** 用户B应能实时看到数据变更（即使在不同视图层级）
**When** 用户B返回主图或进入包含该节点的子图
**Then** 用户B应能看到用户A添加的新节点
**And** 下钻路径是本地视图状态，不在客户端间同步（无 Awareness 同步）

### AC5: 下钻状态持久化
**Given** 用户已下钻到某个深层节点
**When** 刷新页面或关闭后重新打开
**Then** 视图应恢复到刷新前的下钻位置
**And** 面包屑应正确显示完整路径

### AC6: 叶子节点不可下钻
**Given** 一个没有子节点的叶子节点
**When** 右键该节点
**Then** 菜单中不应显示"进入子图"选项（或显示为灰色禁用）

---

## 🎨 High-Precision UI Design Specification (高精度 UI 设计规范)

![Subgraph Drill-Down UI Concept](../prototypes/story-8-9/subgraph-drill-down-ui.png)

> **Design Philosophy**: 遵循 "Arc/Linear" 风格的高端暗色模式美学。强调 "Functional Elegance"（功能优雅），减少不必要的色彩干扰，专注内容结构。

### 1. Visual Aesthetics (视觉美学)

- **Color Palette**:
  - **Background**: Matte Charcoal `#1C1C1C` / `bg-background` (Subtle Grid)
  - **Glass Surface**: `bg-black/40` with `backdrop-blur-md` and fine `border-white/10`.
  - **Accents**: 仅在交互点（如选中、Hover、Focus）使用细腻的 Primary Blue 或 White Glow，避免使用高饱和霓虹色。
- **Typography**: Inter (System UI)，高对比度白字 (`text-foreground`) vs 灰字 (`text-muted-foreground`)。
- **Cards**: **Frosted Glass** 质感，深色半透明填充 + 极细微的白色描边（10% opacity）+ 柔和阴影。

### 2. Breadcrumb Navigation Bar (面包屑导航栏)

> **Visual Target**: 悬浮于画布左上角的精致玻璃胶囊。

| 属性 | 规格 | 详细说明 |
|------|------|----------|
| **Container** | `flex` | 采用 **Glassmorphic** 风格：`bg-black/30 backdrop-blur-md`，`border border-white/10`，`rounded-md` (8px)。具有极其微妙的内部高光。 |
| **Position** | `fixed` | 画布左上方 `top-4 left-4`，Z轴层级高于画布内容。 |
| **Items** | Text | 非当前项：`text-muted-foreground` (approx `#888`)，Hover 时变为 `#AAA` 并带有轻微背景色 `hover:bg-white/5`。 |
| **Current Item** | Active | 当前所在子图名称：`text-white`，`font-medium`，无 Hover 背景。 |
| **Separator** | Icon | `> ` (Chevron) 使用极细线条，透明度 `0.3`。 |
| **Motion** | Transition | 路径变化时，内容轻微 Slide + Fade 切换。 |

#### 组件代码参考样式

```tsx
const breadcrumbContainer = "flex items-center gap-1.5 px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl shadow-black/20";
const breadcrumbItem = "text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/5 px-2 py-1 rounded-md transition-all duration-200 cursor-pointer";
const breadcrumbActive = "text-sm text-white font-medium px-2 py-1 cursor-default";
```

### 3. Drill-Down Interaction (交互细节)

#### Context Menu (右键菜单)
- **Style**: 极简深色浮层，`bg-zinc-900/90 backdrop-blur-xl`，`border border-zinc-800`。
- **Action Item**: "Enter Subgraph" 选项hover时呈现高亮状态（如深蓝/深紫背景），图标高亮。
- **Position**: 紧随鼠标位置，但在节点附近时吸附对齐。

#### Transition Animation (转场动画)
- **Enter**: 
  - 主图淡出 (`opacity: 0`, `scale: 0.95`)
  - 面包屑 Slide In (`translateY: -10px` -> `0`, `opacity: 0` -> `1`)
  - 子图节点 Staggered Fade In (依次错落浮现)
- **Exit**: 
  - 点击面包屑返回时，当前视图向右/下退出，上一级视图反向进入。

### 4. Node Presentation in Subgraph (子图节点呈现)
- **Focus Root**: 当前子图的根节点应视觉增强（如：略大的尺寸，或特殊的边框光晕），表明它是当前视图的"Anchor"。
- **Connectors**: 连接线使用平滑的贝塞尔曲线，颜色为深灰 `stroke-zinc-700`，不抢占节点注意力。

### 5. Motion & Accessibility
| 动画 | 规格 | Reduced Motion |
|------|------|----------------|
| 下钻切换 | `opacity`, `transform` 300ms cubic-bezier(0.2, 0, 0, 1) | 仅 Fade 效果 |
| Hover Effects | 150ms ease-out | 取消位移，仅变色 |

---

## Tasks / Subtasks

> **关键实现约束**：下钻路径是**纯本地视图状态**，不通过 Yjs 同步。UI 状态存储在 URL hash + sessionStorage 以支持刷新持久化。

### Phase 1: 核心数据模型与状态管理 (AC: #1, #5)

- [x] Task 1.1: 创建下钻状态 Store
  - [x] 1.1.1 新建 `apps/web/lib/drillDownStore.ts`
  - [x] 1.1.2 定义 `DrillDownPath = string[]`（节点 ID 路径）
  - [x] 1.1.3 实现 `setDrillPath(path)` / `getCurrentPath()` / `subscribe(listener)`
  - [x] 1.1.4 支持 `pushPath(nodeId)` / `popPath()` / `goToPath(path)`
  - [x] 1.1.5 使用 `useSyncExternalStore` 创建 `useDrillPath()` hook

- [x] Task 1.2: URL/SessionStorage 持久化
  - [x] 1.2.1 下钻路径同步到 URL hash（如 `#drill=nodeA/nodeB/nodeC`）
  - [x] 1.2.2 页面加载时从 URL 恢复路径
  - [x] 1.2.3 备用 sessionStorage 存储（无 hash 场景）

### Phase 2: 子图渲染逻辑 (AC: #1, #6)

- [x] Task 2.1: GraphComponent 集成
  - [x] 2.1.1 在 `GraphComponent.tsx` 中消费 `useDrillPath()`
  - [x] 2.1.2 基于 **X6 Graph** 的层级边（排除 dependency edges）计算“可见子树集合”（根节点 + 所有后代）
  - [x] 2.1.3 通过 `node.hide()/node.show()` + `edge.hide()/edge.show()` 实现视图过滤（只改可见性，**不移除 cells**）
  - [x] 2.1.4 **不修改 Yjs 数据**（不写入 Yjs、不删节点/边；下钻仅是本地视图状态）

- [x] Task 2.2: 下钻入口交互
  - [x] 2.2.1 修改 `NodeContextMenu.tsx` 添加"进入子图"菜单项
    - 有子节点：显示可点击选项
    - 无子节点：隐藏或禁用选项
  - [x] 2.2.2 修改 `useGraphHotkeys` 添加 `Cmd/Ctrl+Enter` 下钻快捷键

### Phase 3: 面包屑导航组件 (AC: #2, #3)

- [x] Task 3.1: 创建 Breadcrumb 组件
  - [x] 3.1.1 新建 `apps/web/components/graph/parts/Breadcrumb.tsx`
  - [x] 3.1.2 消费 `useDrillPath()` 获取当前路径
  - [x] 3.1.3 根据路径查询节点标题（从 Yjs 或 store）
  - [x] 3.1.4 渲染面包屑项，支持点击导航
  - [x] 3.1.5 点击父层级项返回对应层级
  - [x] 3.1.6 点击 Home 图标返回主图
  - [x] 3.1.7 溢出处理：超过 4 项时中间折叠为 `...`

> ⚡ **设计决策**：返回上层仅通过面包屑导航，无专用快捷键。这简化了与现有 Escape 键逻辑的冲突，并提供更直观的导航体验。

### Phase 4: 过渡动画与视觉反馈 (AC: #1, #2)

- [x] Task 4.1: 下钻/返回动画
  - [x] 4.1.1 实现 CSS transition 动画（opacity + scale）
  - [x] 4.1.2 使用 `motion-reduce:*` 遵守用户偏好
  - [x] 4.1.3 添加下钻指示器图标到有子节点的节点

### Phase 5: 测试 (All ACs)

- [x] Task 5.1: 单元测试 (Vitest)
- [x] Task 5.2: 组件测试 (Vitest + RTL)
- [x] Task 5.3: E2E 测试 (Playwright)

---

## Dev Notes

### 🛡️ 工程规范护栏 (Engineering Guardrails)

#### GR-1: Hook-First 模式 🔴 强制
所有下钻逻辑封装在 `useDrillPath` hook 中。

#### GR-2: 文件大小限制 (300 行) 🔴 强制
新组件（Breadcrumb）和 store 各自不超过 300 行。

#### GR-3: Yjs-First 数据流 🔴 强制
**下钻路径是视图状态，不是数据**。不修改 Yjs 中的节点结构，仅在渲染层过滤。
不使用 Yjs Awareness 同步下钻路径（纯本地视图状态）。

> 📖 **架构引用**: `architecture.md:546-549` - UI 不能直接修改本地状态，需通过 Yjs 执行写操作。下钻路径属于视图状态，不属于数据层。

#### GR-3.1: 视图过滤安全性 🔴 强制
**禁止**用 `graph.removeNode/removeEdge` 实现“只渲染子树”。只能使用 `hide()/show()`（或等价的可见性切换）。  
原因：节点/边移除会被同步层捕获并写入 Yjs，导致协作场景下的真实删除。

#### GR-3.2: URL Hash 持久化不破坏查询参数 🔴 强制
更新 `#drill=...` 时必须保留 `window.location.pathname + window.location.search`（例如 `?userId=`），禁止用仅 `pathname` 的 replaceState。

#### GR-4: 过渡动画遵守 prefers-reduced-motion 🔴 强制
所有动画检查用户偏好。

> 📖 **工程规范引用**: `project-context.md:93` - 文件大小限制 300 行；`project-context.md:84-86` - Hook-First 封装。

---

### 💡 技术决策 (Technical Decisions)

| 决策 | 说明 |
|------|------|
| TD-1 | 下钻路径存储在 URL hash + sessionStorage，不写入 Yjs 主文档 |
| TD-2 | **不使用** Yjs Awareness 同步（下钻是纯本地视图状态） |
| TD-3 | 子图渲染通过视图过滤实现，不改变底层数据结构 |
| TD-4 | 面包屑组件位于 `GraphComponent` 外部，通过 store 通信 |
| TD-5 | 双击保持编辑模式，下钻仅通过右键菜单或 `Cmd/Ctrl+Enter` |
| TD-6 | 返回上层仅通过面包屑导航，无专用快捷键 |

---

### 📁 项目结构落点

| 文件 | 类型 | 描述 |
|------|------|------|
| `apps/web/lib/drillDownStore.ts` | [NEW] | 下钻路径状态 store + hooks |
| `apps/web/components/graph/parts/Breadcrumb.tsx` | [NEW] | 面包屑导航组件（含返回功能） |
| `apps/web/components/graph/GraphComponent.tsx` | [MODIFY] | 集成下钻过滤逻辑 |
| `apps/web/components/graph/parts/NodeContextMenu.tsx` | [MODIFY] | 添加"进入子图"菜单项 |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | [MODIFY] | 添加 `Cmd/Ctrl+Enter` 下钻快捷键 |
| `apps/web/e2e/drill-down.spec.ts` | [NEW] | E2E 测试 |
| `apps/web/__tests__/lib/drillDownStore.test.ts` | [NEW] | 单元测试 |

---

## 🧪 测试策略 (Testing Strategy)

> **目标覆盖率**: 100% AC 场景 + 边界条件 + 容错处理

### 测试覆盖矩阵

| AC | 描述 | 单元测试 | 组件测试 | E2E 测试 | 边界测试 |
|----|------|:--------:|:--------:|:--------:|:--------:|
| AC1 | 右键菜单/快捷键进入子图 | ✅ 4 | ✅ 2 | ✅ 4 | ✅ 2 |
| AC2 | 面包屑导航显示与交互 | ✅ 2 | ✅ 4 | ✅ 3 | ✅ 2 |
| AC3 | 通过面包屑返回上层 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 1 |
| AC4 | 子图数据变更自动同步 | ✅ 1 | ✅ 1 | ✅ 2 | ✅ 1 |
| AC5 | 下钻状态持久化 | ✅ 4 | ✅ 1 | ✅ 3 | ✅ 2 |
| AC6 | 叶子节点不可下钻 | ✅ 1 | ✅ 1 | ✅ 2 | ✅ 1 |

**总计**: 单元 14 + 组件 11 + E2E 16 + 边界 9 = **50 个测试用例**

---

### 单元测试 (Vitest)

**文件**: `apps/web/__tests__/lib/drillDownStore.test.ts`

#### 核心功能测试

| 测试用例 | 覆盖 AC | 优先级 |
|----------|--------|:------:|
| `pushPath` 添加节点到路径 | AC1 | P0 |
| `pushPath` 多层连续下钻 | AC1 | P1 |
| `popPath` 返回上一层 | AC3 | P0 |
| `popPath` 空路径返回 false | AC3 | P1 |
| `goToPath` 直接跳转到指定路径 | AC2 | P0 |
| `goToPath` 跨层级跳转（level 3 → level 1） | AC2 | P1 |
| `resetPath` 清空所有层级 | AC3 | P1 |
| `getCurrentPath` 返回当前路径副本 | AC1 | P1 |

#### 持久化测试

| 测试用例 | 覆盖 AC | 优先级 |
|----------|--------|:------:|
| URL hash 同步 (`#drill=a/b/c`) | AC5 | P0 |
| `restoreFromUrl` 从 URL hash 恢复 | AC5 | P0 |
| `restoreFromUrl` sessionStorage fallback | AC5 | P0 |
| URL 特殊字符编码（nodeId 包含 `/`、`#`） | AC5 | P1 |

#### 订阅与通知测试

| 测试用例 | 覆盖 AC | 优先级 |
|----------|--------|:------:|
| `subscribe` 多订阅者通知 | AC4 | P1 |
| 取消订阅后不再通知 | AC4 | P2 |

---

### 组件测试 (Vitest + React Testing Library)

**文件**: `apps/web/__tests__/components/Breadcrumb.test.tsx`

#### Breadcrumb 组件

| 测试用例 | 覆盖 AC | 优先级 |
|----------|--------|:------:|
| 空路径不渲染任何内容 | AC2 | P0 |
| 渲染正确的路径层级 | AC2 | P0 |
| 当前项（最后一项）显示为禁用/不可点击 | AC2 | P1 |
| 溢出处理：超过 4 项时折叠为 `...` | AC2 | P1 |
| Hover 显示完整标题 tooltip | AC2 | P2 |
| 点击父层级项调用 `goToPath` | AC3 | P0 |
| 点击 Home 图标调用 `resetPath` | AC3 | P0 |

#### 菜单项组件

| 测试用例 | 覆盖 AC | 优先级 |
|----------|--------|:------:|
| 有子节点时显示 "进入子图" 选项 | AC1, AC6 | P0 |
| 无子节点时隐藏/禁用 "进入子图" 选项 | AC6 | P0 |

#### 动画组件

| 测试用例 | 覆盖 AC | 优先级 |
|----------|--------|:------:|
| `prefers-reduced-motion` 时禁用 scale 动画 | AC1 | P1 |
| 正常模式下应用 opacity + scale 动画 | AC1 | P2 |

---

### E2E 测试 (Playwright)

**文件**: `apps/web/e2e/drill-down.spec.ts`

#### 下钻入口测试 (AC1)

| 测试用例 | 优先级 |
|----------|:------:|
| 右键有子节点的节点 → 显示 "进入子图" 菜单项 | P0 |
| 点击 "进入子图" → 视图切换为子图，只显示后代节点 | P0 |
| `Cmd/Ctrl+Enter` 快捷键 → 进入选中节点的子图视图 | P0 |
| `Cmd/Ctrl+Enter` 在叶子节点上 → 无效果（不报错） | P1 |

#### 面包屑导航测试 (AC2, AC3)

| 测试用例 | 优先级 |
|----------|:------:|
| 下钻后面包屑显示正确路径（格式：Home › 父节点 › 当前节点） | P0 |
| 点击面包屑中间项 → 跳转到对应层级 | P0 |
| 点击 Home 图标 → 返回主图视图 | P0 |
| 多层下钻后（A → B → C），从 C 直接跳到 A | P1 |
| 深层路径（>4项）面包屑折叠为 `...` | P1 |

#### 持久化测试 (AC5)

| 测试用例 | 优先级 |
|----------|:------:|
| 下钻后刷新页面 → 恢复到刷新前的位置 | P0 |
| 深层下钻（3+ 层）后刷新 → 正确恢复完整路径 | P1 |
| URL hash 手动修改后加载页面 → 导航到指定路径 | P2 |

#### 叶子节点测试 (AC6)

| 测试用例 | 优先级 |
|----------|:------:|
| 右键叶子节点 → 不显示 "进入子图" 选项 | P0 |
| 双击叶子节点 → 进入编辑模式（保持现有行为） | P1 |

#### 协作同步测试 (AC4) ⚠️ 需双用户环境

| 测试用例 | 优先级 |
|----------|:------:|
| 用户A在子图中添加节点 → 用户B在主图可见 | P0 |
| 用户A和B在不同子图层级 → 双方看到各自视图（drillPath 本地隔离） | P1 |

---

### 边界条件与容错测试

#### 边界场景

| 测试类型 | 测试用例 | 覆盖 AC | 优先级 |
|----------|----------|--------|:------:|
| 单元 | 空图（无节点）下钻尝试 | AC1 | P0 |
| 单元 | 单节点图（仅根节点）下钻尝试 | AC6 | P1 |
| E2E | 深层级（10+ 层）下钻性能 | AC1 | P2 |
| E2E | 超长节点标题（100+ 字符）面包屑截断 | AC2 | P2 |

#### 容错场景 🔴 关键

| 测试类型 | 测试用例 | 覆盖 AC | 优先级 |
|----------|----------|--------|:------:|
| 单元 | `drillPath` 中节点 ID 不存在时的处理 | AC5 | P0 |
| E2E | 用户在子图中时，**该节点被删除** → 自动回退到主图 | AC4 | **P0** |
| 单元 | URL hash 格式错误时的 fallback | AC5 | P1 |
| E2E | 浏览器 Back/Forward 按钮与 URL hash 交互 | AC5 | P2 |

---

### 可访问性测试 (Accessibility)

| 测试用例 | 覆盖 | 优先级 |
|----------|------|:------:|
| 面包屑支持键盘 Tab 导航 | WCAG 2.1 | P2 |
| 下钻后焦点管理（应聚焦到新视图） | WCAG 2.1 | P2 |
| Screen Reader 可读取面包屑路径 | WCAG 2.1 | P3 |

---

### 测试运行命令

```bash
# 单元测试 + 组件测试 (Vitest)
pnpm --filter @cdm/web test

# 运行 drillDown 相关测试
pnpm --filter @cdm/web test drillDownStore
pnpm --filter @cdm/web test Breadcrumb

# E2E 测试 (Playwright)
pnpm --filter @cdm/web test:e2e

# 运行特定 E2E 测试
pnpm --filter @cdm/web test:e2e drill-down

# 协作同步测试（需双用户环境）
pnpm --filter @cdm/web test:e2e drill-down --grep "collaboration"
```

---

### 测试数据准备

```typescript
// fixtures/drillDownTestData.ts
export const testGraph = {
  root: { id: 'root', label: '根主题', children: ['a', 'b'] },
  a: { id: 'a', label: '系统设计', children: ['a1', 'a2'] },
  a1: { id: 'a1', label: '后端架构', children: ['a1-1'] },
  a1-1: { id: 'a1-1', label: 'API 设计', children: [] }, // 叶子节点
  a2: { id: 'a2', label: '前端架构', children: [] }, // 叶子节点
  b: { id: 'b', label: '产品规划', children: [] }, // 叶子节点
};

// 用于测试的深层路径
export const deepPath = ['root', 'a', 'a1', 'a1-1'];
```

---

## ⚠️ 注意事项 (Notes)

1. **⚡ 视图过滤优先**：下钻是"视图"概念，不修改底层 Yjs 数据结构
2. **📏 双击保持编辑**：双击节点始终进入编辑模式，不触发下钻（与现有行为一致）
3. **🔗 与 Focus Mode 区别**：Focus Mode 淡化其他节点，下钻完全隐藏其他节点
4. **🌐 URL Hash 管理**：注意与现有 URL 参数（如 `?id=`）的兼容
5. **返回方式**：仅通过面包屑导航返回，无专用快捷键（简化与 Escape 键的冲突）

---

## 🔗 相关需求追溯

| 来源 | 描述 |
|------|------|
| PRD R1 | 节点下钻子图并回链 |
| PRD 10.画布交互 | 节点下钻子图（面包屑回退） |
| Epic 8 | 大规模图谱体验优化 |
| FR1 | 脑图核心交互：节点下钻回链 |

---

## 📊 与现有 Stories 的关系

| Story | 关系 | 说明 |
|-------|------|------|
| Story 8.1 折叠展开 | 互补 | 折叠隐藏子节点但不改变视图层级 |
| Story 8.5 Focus Mode | 并存 | Focus 淡化节点，下钻切换视图 |
| Story 8.8 Semantic Zoom | 并存 | LOD 控制节点详细程度，与下钻无冲突 |
| Story 5.3 跨图引用 | 延伸 | 未来可从子图引用其他图 |

---

## Senior Developer Review (AI)

### Review Summary

- ⏳ 待开发：准备实施
- ✅ AC 覆盖完整，测试策略明确
- ✅ 技术决策遵循 Yjs-First 原则（下钻是视图状态，不修改数据层）
- ✅ 与现有 Focus Mode / Collapse / 双击编辑功能无冲突
- ✅ 快捷键冲突已识别并给出解决方案：`Cmd/Ctrl+Enter` 必须在 `useGraphHotkeys` 中优先拦截，避免落入现有 Enter 创建逻辑

### Architecture Compliance

| 规范 | 状态 | 引用 |
|------|:----:|------|
| Hook-First 封装 | ✅ | `project-context.md:84-86` |
| Yjs-First 数据流 | ✅ | `architecture.md:546-549` |
| 文件大小限制 (300行) | ✅ | `project-context.md:93` |
| 无直接 fetch 调用 | ✅ | `refactoring-proposal §1.2` |

### Notes

- ✅ Awareness 同步已明确排除在本 Story 范围外
- ✅ 返回快捷键已移除，简化与现有 Escape 逻辑的冲突
- 💡 建议：未来可考虑添加 Awareness 同步作为增强功能（显示协作者当前层级）
