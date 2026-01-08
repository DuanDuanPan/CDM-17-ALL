# Story 8.5: 聚焦模式 (Focus Mode)

Status: in-progress
Tech-Spec: [tech-spec-8-5-focus-mode.md](./tech-spec-8-5-focus-mode.md)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **日常编辑者**,
I want **聚焦到当前分支，淡化无关节点**,
so that **我能专注编辑而不被其他内容干扰。**

## Problem Statement

在处理复杂图谱（500-5000+ 节点）时，用户需要专注于当前工作的分支，但画布上的其他节点会分散注意力。目前系统没有提供"聚焦"能力，用户必须手动折叠不需要的分支（Story 8.1），这不够直观且需要预先了解图谱结构。

聚焦模式（Focus Mode）通过视觉淡化非关联节点（降低透明度），让用户在不改变图谱结构的情况下专注于当前分支的编辑工作。

## Scope

**In Scope:**
- ✅ 聚焦模式快捷键（`F` 键）激活/退出
- ✅ 非直接关联节点淡化（父/子/兄弟之外的节点降低透明度至 20%）
- ✅ 点击空白处或再次按 `F` 键退出聚焦模式
- ✅ 工具栏中的聚焦模式开关/状态指示器
- ✅ 聚焦层级配置（1层、2层、3层）

**Out of Scope:**
- ❌ 聚焦状态持久化（仅会话级别）
- ❌ 聚焦模式与协同编辑同步（各客户端独立）
- ❌ 聚焦动画过渡（Phase 2 考虑添加平滑过渡）

---

## Acceptance Criteria (验收标准)

### AC1: 聚焦模式激活
**Given** 选中了画布上的某个节点
**When** 按下聚焦快捷键 `F` 或点击工具栏"聚焦"按钮
**Then** 非直接关联节点（非父/子/兄弟）应淡化至 20% 透明度
**And** 工具栏中"聚焦"按钮应显示激活状态（高亮/图标变化）
**And** 被选中的节点及其直接关联节点保持 100% 透明度

### AC2: 聚焦模式退出
**Given** 聚焦模式已激活
**When** 再次按下 `F` 键
**Then** 所有节点恢复正常透明度（100%）
**When** 点击画布空白处
**Then** 所有节点恢复正常透明度，退出聚焦模式
**And** 工具栏中"聚焦"按钮恢复默认状态

### AC3: 聚焦层级配置
**Given** 聚焦模式激活
**When** 通过工具栏下拉菜单选择聚焦层级（1层/2层/3层）
**Then** 聚焦范围应扩展到对应层级的关联节点：
  - 1层：仅父/子/兄弟（默认）
  - 2层：1层 + 父的兄弟 + 子的子
  - 3层：2层 + 再扩展一层
**And** 选择后立即应用新的聚焦范围

### AC4: 边的透明度处理
**Given** 聚焦模式激活
**When** 渲染边时
**Then** 与淡化节点连接的边也应淡化至相同透明度
**And** 聚焦范围内节点之间的边保持 100% 透明度

### AC5: 边缘情况处理
**Given** 画布上未选中任何节点
**When** 按下 `F` 键
**Then** 应无操作或提示"请先选择一个节点"
**Given** 聚焦模式激活中
**When** 用户选择了另一个节点
**Then** 聚焦范围应基于新选中的节点重新计算

---

## 🎨 UI 设计规范 (UI Design Specification)

### 1. 组件构造 (Component Structure)

聚焦控制器采用 **"组合式胶囊" (Composite Capsule)** 设计，位于画布右下角 View Controls 栈（与 `ZoomIndicator`、`MinimapContainer` 同组），避免与右上角 `ClipboardToolbar` 冲突；提供 "开关" 与 "层级控制" 的无缝衔接。

**位置**: 作为 `GraphComponent` 的 View Controls 子项（父容器为 `absolute bottom-4 right-4 ... pointer-events-none`；本控件外层包一层 `pointer-events-auto`）

#### A. 容器 (Container)
- **Base**: `flex items-center p-0.5 bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-sm rounded-lg transition-all duration-200`
- **Active State**: `border-blue-200/80 shadow-blue-100/50`

#### B. 主开关按钮 (Toggle Button)
- **Size**: `h-8 px-2.5`
- **Layout**: `flex items-center gap-2`
- **Typography**: `text-xs font-medium`
- **Icon**: `w-3.5 h-3.5` (Lucide `Focus` or `ScanFocus`)
- **Default Style**: `text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md`
- **Active Style**: `bg-blue-50 text-blue-600 shadow-sm ring-1 ring-black/5`
- **Pressed**: `scale-95` (micro-interaction)

#### C. 分隔符 (Separator)
- **Condition**: 仅在聚焦模式激活时显示
- **Style**: `w-px h-3.5 bg-gray-200 mx-0.5`

#### D. 层级选择器 (Level Selector)
- **Condition**: 仅在聚焦模式激活时显示
- **Trigger**: `h-8 px-2 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-md flex items-center gap-1 transition-colors`
- **Dropdown Content**:
  - **Container**: `min-w-[140px] p-1 bg-white border border-gray-100 shadow-lg rounded-lg animate-in fade-in zoom-in-95 duration-100`
  - **Item**: `px-2 py-1.5 text-xs text-gray-600 rounded flex flex-col gap-0.5 hover:bg-gray-50 cursor-pointer`
  - **Item Active**: `bg-blue-50 text-blue-600`
  - **Item Description**: `text-[10px] text-gray-400 font-normal`

### 2. 视觉状态 (Visual States)

#### 🔴 Inactive (Default)
```html
<div class="bg-white border-gray-200 shadow-sm ...">
  <button class="text-gray-600 ...">
    <IconFocus /> 
    <span>Focus</span>
  </button>
</div>
```

#### 🔵 Active (Focus Mode On)
```html
<div class="bg-white border-blue-200 shadow-blue-50 ...">
  <!-- Checkbox-like active state -->
  <button class="bg-blue-50 text-blue-600 ...">
    <IconFocus />
    <span>On</span>
  </button>
  
  <div class="separator" />
  
  <!-- Level Trigger -->
  <button class="text-xs text-gray-500 ...">
    <span>1层</span>
    <IconChevronDown size={12} />
  </button>
</div>
```

### 3. 动画与过渡 (Motion)

| 属性 | 参数 | 说明 |
|------|------|------|
| **Transition** | `all 200ms cubic-bezier(0.4, 0, 0.2, 1)` | 通用过渡曲线 |
| **Micro-scale** | `scale-95` (duration-75) | 点击按压反馈 |
| **Opacity Fade** | `duration-300 ease-in-out` | 节点淡淡入淡出 |
| **Dropdown** | `slide-in-from-top-1 opacity-0` -> `1` | 下拉菜单展开 |

### 4. 透明度系统 (Opacity System)

为保证视觉层级清晰，采用非线性透明度阶梯：

- **Focus (100%)**: `opacity: 1` + `filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))` (轻微强调)
- **Transition (Logic)**: 关联路径高亮（可选 Phase 2）
- **Dimmed (20%)**: `opacity: 0.2` + `grayscale(0.5)` (降低色彩干扰)

### 5. Design Tokens

```css
:root {
  /* Focus Mode Semantic Colors */
  --focus-ring: 147 197 253; /* blue-300 */
  --focus-bg-active: 239 246 255; /* blue-50 */
  --focus-text-active: 37 99 235; /* blue-600 */
  
  /* Layout */
  --toolbar-spacing: 1rem; /* 16px from edges */
  --control-height: 2rem; /* 32px */
}
```

---

## Tasks / Subtasks

### Phase 1: 核心 Hook 实现 (AC: #1, #2, #5)

- [ ] Task 1.1: 创建 `useFocusMode` hook (~180 LOC)
  - [ ] 1.1.1 创建文件 `apps/web/components/graph/hooks/useFocusMode.ts`
  - [ ] 1.1.2 定义 Hook 接口：
    ```typescript
    interface UseFocusModeOptions {
      graph: Graph | null;
      isReady: boolean;
      selectedNodeId: string | null;
    }
    
    interface UseFocusModeReturn {
      isFocusMode: boolean;
      focusLevel: 1 | 2 | 3;
      toggleFocusMode: () => void;
      exitFocusMode: () => void;
      setFocusLevel: (level: 1 | 2 | 3) => void;
    }
    ```
  - [ ] 1.1.3 实现 `getRelatedNodeIds(nodeId, level)` 函数：
    - 复用 `useNodeCollapse` 的**树结构语义**：子节点来自 outgoing hierarchical edges（跳过 dependency edges），父节点来自 `node.getData().parentId`
    - Level 计算建议用**层级关系图距离**（parent/child 视为无向边）做 BFS 扩展到 N 跳，避免手写 “父的兄弟/子的子” 特例遗漏
    - 注意：`useNodeCollapse` 的内部 helper 未对外暴露，避免直接调用不存在的 `useNodeCollapse.getDirectChildren`
  - [ ] 1.1.4 实现 `applyFocusOpacity(focusedIds: Set<string>)` 函数：
    - 遍历所有节点设置 `node.setAttr('fo/opacity', value)`（React Shape 默认使用 `foreignObject`，selector 为 `fo`；如遇非 React Shape 可降级尝试 `body/opacity`）
    - 遍历所有边：优先设置 `edge.setAttr('line/strokeOpacity', value)` + `edge.setAttr('glow/strokeOpacity', value)`（层级边使用 `cdm-hierarchical-edge` markup）；必要时再降级 `line/opacity`
  - [ ] 1.1.5 实现 `clearFocusOpacity()` 恢复所有节点/边透明度
  - [ ] 1.1.6 在 `hooks/index.ts` 中导出

- [ ] Task 1.2: 快捷键集成
  - [ ] 1.2.1 修改 `apps/web/components/graph/hooks/useGraphHotkeys.ts`
  - [ ] 1.2.2 在 `UseGraphHotkeysOptions` 接口添加 `onToggleFocusMode?: () => void`
  - [ ] 1.2.3 添加 `F` 键处理逻辑：
    ```typescript
    // 复用 useGraphHotkeys 已有的 input protection（基于 e.target / isContentEditable）
    if (!isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      e.stopPropagation();
      onToggleFocusMode?.();
      return;
    }
    ```
  - [ ] 1.2.4 确保非编辑状态才响应 `F` 键（避免输入冲突）

### Phase 2: UI 组件集成 (AC: #1, #3)

- [ ] Task 2.1: 创建 `FocusModeButton` 组件 (~100 LOC)
  - [ ] 2.1.1 创建文件 `apps/web/components/graph/parts/FocusModeButton.tsx`
  - [ ] 2.1.2 复用 `@cdm/ui` 中的 `Button` 组件
  - [ ] 2.1.3 实现"组合胶囊"样式：使用 Flex 容器包裹两个 Button（开关 + 下拉触发器）
  - [ ] 2.1.4 实现下拉菜单逻辑（使用简易 Popover）
  - [ ] 2.1.5 Props：
    ```typescript
    interface FocusModeButtonProps {
      isFocusMode: boolean;
      focusLevel: 1 | 2 | 3;
      onToggle: () => void;
      onLevelChange: (level: 1 | 2 | 3) => void;
      disabled?: boolean;
    }
    ```
  - [ ] 2.1.6 添加 `data-testid="focus-mode-button"` 和 `data-testid="focus-level-dropdown"`

- [ ] Task 2.2: 集成到 GraphComponent 视图控制区
  - [ ] 2.2.1 在 `GraphComponent.tsx` 中引入 `FocusModeButton`
  - [ ] 2.2.2 放置在右下角 View Controls 栈（与 Zoom/Minimap 同容器），避免与 `ClipboardToolbar` 冲突

### Phase 3: 选中状态响应 (AC: #5)

- [ ] Task 3.1: 选中变化时更新聚焦范围
  - [ ] 3.1.1 在 `useFocusMode` 中监听 `selectedNodeId` 变化
  - [ ] 3.1.2 当 `isFocusMode && selectedNodeId` 变化时重新计算并应用聚焦范围
  - [ ] 3.1.3 无节点选中时自动退出聚焦模式

### Phase 4: 边透明度处理 (AC: #4)

- [ ] Task 4.1: 边的聚焦透明度
  - [ ] 4.1.1 在 `applyFocusOpacity` 中处理边：
    - 如果边的 `source` 和 `target` 都在聚焦范围内 → 100%
    - 否则 → 20%
  - [ ] 4.1.2 确保依赖边（虚线）和层级边（实线）都正确处理

### Phase 5: 点击空白退出 (AC: #2)

- [ ] Task 5.1: 空白点击监听
  - [ ] 5.1.1 修改 `apps/web/components/graph/hooks/useGraphEvents.ts`：在 `UseGraphEventsOptions` 增加 `onBlankClick?: () => void`
  - [ ] 5.1.2 在 `handleBlankClick` 内调用 `onBlankClick?.()`（保持原有清选中/聚焦容器行为不变）
  - [ ] 5.1.3 在 `GraphComponent.tsx` 传入 `onBlankClick: exitFocusMode`（无聚焦时 `exitFocusMode()` 为 no-op）

### Phase 6: 集成到 GraphComponent.tsx (All ACs)

- [ ] Task 6.1: GraphComponent 层集成
  - [ ] 6.1.1 导入 `useFocusMode` 和 `FocusModeButton`：
    ```typescript
    import { useFocusMode } from './hooks';
    import { FocusModeButton } from './parts';
    ```
  - [ ] 6.1.2 在 `GraphComponent` 中调用 `useFocusMode`：
    ```typescript
    const { isFocusMode, focusLevel, toggleFocusMode, exitFocusMode, setFocusLevel } = useFocusMode({
        graph,
        isReady,
        selectedNodeId: selectedNodeIds[0] || null,
    });
    ```
  - [ ] 6.1.3 传递 `onToggleFocusMode` 到 `useGraphHotkeys`
  - [ ] 6.1.4 在右下角 View Controls 栈添加 `FocusModeButton`（同 Zoom/Minimap，使用 `pointer-events-auto` 包裹）
  - [ ] 6.1.5 处理键盘焦点和事件冒泡

### Phase 7: 测试 (All ACs)

- [ ] Task 7.1: 单元测试 (Vitest)
  - [ ] 7.1.1 创建 `apps/web/__tests__/hooks/useFocusMode.test.ts`
  - [ ] 7.1.2 覆盖：聚焦范围计算、透明度应用、层级切换、退出逻辑

- [ ] Task 7.2: 组件测试
  - [ ] 7.2.1 创建 `apps/web/__tests__/components/FocusModeButton.test.tsx`
  - [ ] 7.2.2 覆盖：按钮点击、下拉选择、禁用状态

- [ ] Task 7.3: E2E 测试 (Playwright)
  - [ ] 7.3.1 创建 `apps/web/e2e/focus-mode.spec.ts`
  - [ ] 7.3.2 覆盖 AC1-AC5

### Review Follow-ups (AI) - ✅ COMPLETED

- [x] [AI-Review][HIGH] 修正聚焦层级语义：Level 2 必须包含"父的兄弟"，当前 BFS 仅在 depth=0 加 siblings 导致 Level 2 缺失 [apps/web/components/graph/hooks/useFocusMode.ts:151]
  - **Fix**: 在 BFS 循环中每个深度都调用 `getSiblings(currentId)` 添加兄弟节点
- [x] [AI-Review][HIGH] 修复退出聚焦后的边样式回归：`clearFocusOpacity()` 不应把 `glow/strokeOpacity` 强制设为 `1`（应恢复到原始值，例如 `0.35`） [apps/web/components/graph/hooks/useFocusMode.ts:261]
  - **Fix**: 导入 `HIERARCHICAL_EDGE_GLOW_OPACITY` 并在 `clearFocusOpacity` 中使用它恢复 glow 透明度
- [x] [AI-Review][MEDIUM] 补全 `Dev Agent Record -> File List`（以 git 真实改动为准）并补充 Change Log，避免"story 无变更记录" [docs/sprint-artifacts/story-8-5-focus-mode.md:610]
  - **Fix**: 已在下方 File List 添加所有相关文件
- [x] [AI-Review][MEDIUM] 补足测试覆盖：至少覆盖 Level 2/3 语义、边透明度、退出恢复（否则 AC3/AC4 回归无法被测试捕获） [apps/web/__tests__/hooks/useFocusMode.test.ts:203]
  - **Fix**: 添加了 "Level 2 includes parent siblings and children's children"、"should handle hierarchical edge glow opacity" 等测试
- [x] [AI-Review][MEDIUM] 加性能护栏：避免每次 selection-change 都 O(n) 扫全图（可用 set 相等跳过、debounce/raf 合并等） [apps/web/components/graph/hooks/useFocusMode.ts:201]
  - **Fix**: 添加 `areSetsEqual` 函数和 `prevFocusedIdsRef` 用于跳过重复的 applyFocusOpacity 调用
- [x] [AI-Review][MEDIUM] 修正"非 React Shape 降级"逻辑：当前先写 `fo/opacity` 再判断 `getAttrByPath('fo')`，降级路径基本不可达 [apps/web/components/graph/hooks/useFocusMode.ts:208]
  - **Fix**: 先用 `getAttrByPath('fo')` 检查再设置属性，确保降级逻辑可达
- [x] [AI-Review][MEDIUM] 对齐 UI spec：层级选择器应仅在聚焦模式激活时显示（避免无意义操作入口） [apps/web/components/graph/parts/FocusModeButton.tsx:136]
  - **Fix**: 使用 `{isFocusMode && (...)}` 条件渲染层级选择器
- [x] [AI-Review][MEDIUM] 对齐 `data-testid`：story 约定 `focus-mode-button` / `focus-level-dropdown`，当前实现使用了不同命名，后续 RTL/E2E 会直接失效 [docs/sprint-artifacts/story-8-5-focus-mode.md:241]
  - **Fix**: 更新为 `data-testid="focus-mode-button"` 和 `data-testid="focus-level-dropdown"`
- [ ] [AI-Review][LOW] 可选 UX：无选中时按 `F` 目前是静默 no-op，可考虑 toast/状态提示（AC5 允许 no-op，但体验可提升） [apps/web/components/graph/hooks/useFocusMode.ts:280]
  - **Status**: Deferred to Phase 2 - AC5 explicitly allows no-op behavior. Button tooltip already shows "请先选中一个节点"

### Review Follow-ups (AI) - Round 2

- [x] [AI-Review][MEDIUM] FocusModeButton：退出聚焦模式后应自动关闭层级下拉菜单（当前仅依赖 `isDropdownOpen`，当 `isFocusMode=false` 时菜单仍可能残留） [apps/web/components/graph/parts/FocusModeButton.tsx:165]
  - **Fix**: 退出聚焦模式时强制关闭下拉菜单，并将菜单渲染条件收敛为 `{isFocusMode && isDropdownOpen}`
- [x] [AI-Review][MEDIUM] Hotkey：`F` 键需在编辑态完全失效（目前仅做 input/contentEditable 保护；若容器获得焦点仍可能触发），与 Tech-Spec TD-4 不一致 [apps/web/components/graph/hooks/useGraphHotkeys.ts:244]
  - **Fix**: 在触发聚焦热键前检查选中节点 `data.isEditing`，编辑态直接 return
- [x] [AI-Review][MEDIUM] Focus Mode × Edge Selection：退出聚焦时不应覆盖已选中层级边的选中高亮（`glow/strokeOpacity` 被恢复到 `0.35`，可能弱化选中态） [apps/web/components/graph/hooks/useFocusMode.ts:292]
  - **Fix**: 清理聚焦时若层级边处于 selected，恢复 glow 透明度为 `HIERARCHICAL_EDGE_SELECTED_ATTRS` 对应值（否则恢复默认 `0.35`）
- [x] [AI-Review][MEDIUM] Tests：强化 AC4 “边随节点淡化”覆盖——当前用例未真正断言 out-of-range 边的 opacity（建议添加一条自定义边连接 focused↔unrelated，并断言 attr 变为 `0.2`；同时补覆盖非 glow / dependency edge 路径） [apps/web/__tests__/hooks/useFocusMode.test.ts:501]
  - **Fix**: 新增用例覆盖 out-of-range 层级边 dim（`0.2`）、非 glow 依赖边 dim（`line/opacity=0.2`）、选中层级边退出聚焦恢复选中 glow
- [x] [AI-Review][MEDIUM] Story/File List：当前工作区存在额外变更（例如 `docs/epics.md`、`docs/sprint-artifacts/sprint-status.yaml`、`_bmad/bmm/config.yaml`）；合并前要么拆分/回滚这些无关改动，要么补充到本 Story 的 File List/Change Log [docs/sprint-artifacts/story-8-5-focus-mode.md:631]
  - **Fix**: 已核对 `git status`，当前本 Story 仅涉及 Focus Mode 相关文件；本地存在未追踪的 Story 8.6 文档（请勿在本 Story 提交中 stage）
- [x] [AI-Review][LOW] File size guideline：`useFocusMode.ts` 目前 403 行，超过 300 行护栏；建议拆分 traversal/helpers 或抽 utils（不改变公开 API） [apps/web/components/graph/hooks/useFocusMode.ts:50]
  - **Fix**: 抽取 traversal/opacity 到 `focusModeUtils.ts`，`useFocusMode.ts` 已降至 < 300 LOC 且不影响公开 API

---

## Dev Notes

### 🛡️ 工程规范护栏 (Engineering Guardrails)

> 以下规则摘自 `docs/analysis/refactoring-proposal-2025-12-28.md` 和 `docs/project-context.md`，必须严格遵守。

#### GR-1: Hook-First 模式 (Frontend)

**规则**: 所有 UI 逻辑和数据获取必须封装在 hooks 中，组件保持纯展示。

```typescript
// ✅ 正确：hook 封装逻辑
const { isFocusMode, toggleFocusMode } = useFocusMode({ graph, isReady, selectedNodeId });

// ❌ 禁止：组件内直接操作 graph
graph.getCells().forEach(cell => cell.setAttr('fo/opacity', 0.2));
```

**来源**: `project-context.md:84-86`

---

#### GR-2: 文件大小限制

**规则**: 单个文件不得超过 **300 行**。

| 新文件 | 预估行数 | 状态 |
|--------|----------|------|
| `useFocusMode.ts` | ~180 LOC | ✅ |
| `FocusModeButton.tsx` | ~100 LOC | ✅ |

**来源**: `project-context.md:93`

---

#### GR-3: 本地状态 vs Yjs

**规则**: 聚焦模式是**纯本地视觉状态**，不需要同步到 Yjs。

```typescript
// ✅ 正确：使用 React 本地状态
const [isFocusMode, setIsFocusMode] = useState(false);

// ❌ 禁止：不需要写入 Yjs
ydoc.getMap('focusState').set('enabled', true);
```

**理由**: 聚焦是个人视觉偏好，不影响协作数据。

---

#### GR-4: X6 节点属性操作

**规则**: 使用 `node.setAttr()` 修改视觉属性，不要直接操作 DOM。

```typescript
// ✅ 正确：通过 X6 API
node.setAttr('fo/opacity', 0.2); // React Shape: foreignObject selector 为 fo

// ❌ 禁止：直接操作 DOM
document.querySelector(`[data-cell-id="${nodeId}"]`).style.opacity = '0.2';
```

---

### 技术决策 (Technical Decisions)

#### TD-1: 透明度实现方式

**决策**: 使用 X6 的 `cell.setAttr('fo/opacity', value)` 修改节点透明度（React Shape），边使用 `line/glow` 的 `strokeOpacity`

**理由**:
- X6 内部会正确处理 SVG 渲染
- 与现有节点样式系统一致
- 支持动画过渡（通过 CSS transition）

**备选方案考虑**:
- CSS `filter: opacity()` - 可能影响性能
- SVG `fill-opacity` - 不够统一

#### TD-2: 聚焦范围算法

**决策**: 复用 `useNodeCollapse` 中的 `getDirectChildren` 树遍历算法

**理由**:
- 已验证的树遍历逻辑
- 避免重复代码
- 性能已优化

**算法伪代码**:
```typescript
function getRelatedNodeIds(nodeId: string, level: number): Set<string> {
  const related = new Set<string>([nodeId]);
  
  // Level 1: 父/子/兄弟
  related.add(getParent(nodeId));
  getChildren(nodeId).forEach(id => related.add(id));
  getSiblings(nodeId).forEach(id => related.add(id));
  
  // Level 2+: 递归扩展
  if (level >= 2) {
    // 扩展到父的兄弟、子的子等
  }
  
  return related;
}
```

#### TD-3: 快捷键冲突处理

**决策**: `F` 键仅在非编辑状态下响应

**理由**:
- 用户在编辑节点文本时需要输入 `F` 字符
- 与现有快捷键系统一致（Space 编辑、Enter 创建）

**实现**: 复用 `useGraphHotkeys` 的 input protection（基于 `e.target` / `isContentEditable`）

### 📁 项目结构落点

| 文件 | 类型 | 描述 |
|------|------|------|
| `apps/web/components/graph/hooks/useFocusMode.ts` | [NEW] | 核心聚焦模式 hook |
| `apps/web/components/graph/hooks/index.ts` | [MODIFY] | 导出 useFocusMode |
| `apps/web/components/graph/parts/FocusModeButton.tsx` | [NEW] | 聚焦模式按钮组件 |
| `apps/web/components/graph/parts/index.ts` | [MODIFY] | 导出 FocusModeButton |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | [MODIFY] | 添加 F 键绑定（回调注入） |
| `apps/web/components/graph/hooks/useGraphEvents.ts` | [MODIFY] | blank:click 回调注入，用于退出聚焦 |
| `apps/web/components/graph/GraphComponent.tsx` | [MODIFY] | 集成 useFocusMode + FocusModeButton |
| `apps/web/__tests__/hooks/useFocusMode.test.ts` | [NEW] | 单元测试 |
| `apps/web/__tests__/components/FocusModeButton.test.tsx` | [NEW] | 组件测试 |
| `apps/web/e2e/focus-mode.spec.ts` | [NEW] | E2E 测试 |

### 依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@antv/x6` | 3.1.2 | `cell.setAttr()`, `graph.batchUpdate()` |
| `@antv/x6-react-shape` | 3.0.1 | React Shape markup selector `fo`（用于透明度） |
| `lucide-react` | - | Focus/Target 图标 |
| `@cdm/ui` | - | cn() utility, Dropdown 组件 |
| `useNodeCollapse` | Story 8.1 | 复用 getDirectChildren 树遍历 |
| `useZoomShortcuts` | Story 8.3 | 布局参考 |

### 🔗 References

- [Source: docs/epics.md#Story-8.5] 原始需求
- [Source: apps/web/components/graph/hooks/useNodeCollapse.ts] Story 8.1 折叠实现
- [Source: apps/web/components/graph/hooks/useZoomShortcuts.ts] Story 8.3 缩放实现
- [Source: apps/web/components/graph/parts/ZoomIndicator.tsx] 工具栏布局参考
- [Source: apps/web/components/graph/hooks/useGraphHotkeys.ts] 快捷键注册/输入保护
- [Source: apps/web/components/graph/hooks/useGraphEvents.ts] blank:click / focus 容器行为
- [Source: apps/web/app/graph/[graphId]/page.tsx] Page 集成点
- [Source: docs/project-context.md] 工程规范

### 前序 Story 完成情况

| Story | 状态 | 关联 |
|-------|------|------|
| 8.1 节点折叠/展开 | done | 复用 `getDirectChildren` 树遍历 |
| 8.2 小地图导航 | done | 无直接依赖 |
| 8.3 缩放快捷键系统 | done | UI 布局参考 |
| 8.4 大纲/轮廓视图 | done | 无直接依赖 |

---

## 🧪 测试策略 (Testing Strategy)

### 单元测试 (Vitest)

**文件**: `apps/web/__tests__/hooks/useFocusMode.test.ts`

| 测试用例 | 覆盖 AC |
|----------|--------|
| 无选中节点时 toggleFocusMode 无效 | AC5 |
| 选中节点后激活聚焦模式 | AC1 |
| 聚焦范围正确计算（1层：父/子/兄弟） | AC1 |
| 聚焦范围正确计算（2层、3层递归扩展） | AC3 |
| 再次 toggle 退出聚焦模式 | AC2 |
| exitFocusMode 正确清除透明度 | AC2 |
| 选中变化时重新计算聚焦范围 | AC5 |
| 边的透明度正确处理（source+target 都在范围内→100%，否则→20%） | AC4 |

### 组件测试 (Vitest + RTL)

**文件**: `apps/web/__tests__/components/FocusModeButton.test.tsx`

| 测试用例 | 覆盖 AC |
|----------|--------|
| 默认状态渲染（text-gray-500） | AC2 |
| 点击触发 onToggle 回调 | AC1 |
| 激活状态显示正确样式（bg-blue-50 text-blue-600 ring-2） | AC1 |
| 激活状态时显示层级下拉选择器 | AC3 |
| 层级选择触发 onLevelChange 回调 | AC3 |
| 禁用状态（disabled=true）样式和交互 | AC5 |

### E2E 测试 (Playwright)

**文件**: `apps/web/e2e/focus-mode.spec.ts`

**测试用例总览** (共 8 个):

| 测试用例 | 覆盖 AC | 验证点 |
|----------|--------|--------|
| AC1: 激活聚焦模式 | AC1 | 非关联节点透明度 ≈ 0.2 |
| AC1: 按钮激活样式 | AC1 | 按钮 class 包含 `bg-blue-50` |
| AC2: 按 F 键退出 | AC2 | 所有节点透明度 = 1 |
| AC2: 点击空白退出 | AC2 | 退出后按钮样式恢复 |
| AC3: 层级选择 | AC3 | 2层时更多节点保持 100% |
| AC4: 边透明度同步 | AC4 | 边与节点透明度一致 |
| AC5: 无选中节点时无操作 | AC5 | 按 F 后无变化 |
| AC5: 选中变化时更新 | AC5 | 切换选中后聚焦范围更新 |

```typescript
test('AC1: 激活聚焦模式', async ({ page }) => {
  await page.click('[data-cell-id="node1"]');
  await page.keyboard.press('f');
  // 验证非关联节点透明度降低
  const dimmedNode = page.locator('[data-cell-id="unrelated-node"]');
  await expect(dimmedNode).toHaveCSS('opacity', '0.2');
});

test('AC1: 按钮激活样式变化', async ({ page }) => {
  await page.click('[data-cell-id="node1"]');
  await page.keyboard.press('f');
  const button = page.locator('[data-testid="focus-mode-button"]');
  await expect(button).toHaveClass(/bg-blue-50/);
});

test('AC2: 按 F 键退出聚焦模式', async ({ page }) => {
  // ... 激活聚焦模式
  await page.keyboard.press('f');
  // 验证所有节点恢复 100% 透明度
});

test('AC2: 点击空白退出聚焦模式', async ({ page }) => {
  // ... 激活聚焦模式
  await page.click('.x6-graph-background');
  const button = page.locator('[data-testid="focus-mode-button"]');
  await expect(button).not.toHaveClass(/bg-blue-50/);
});

test('AC3: 层级选择', async ({ page }) => {
  await page.click('[data-testid="focus-level-dropdown"]');
  await page.click('text=2层');
  // 验证聚焦范围扩展到更多节点
});

test('AC4: 边透明度同步', async ({ page }) => {
  await page.click('[data-cell-id="node1"]');
  await page.keyboard.press('f');
  // 验证边的透明度与连接节点一致
  const focusedEdge = page.locator('[data-edge-id="edge-in-focus"]');
  await expect(focusedEdge).toHaveCSS('opacity', '1');
  const dimmedEdge = page.locator('[data-edge-id="edge-out-of-focus"]');
  await expect(dimmedEdge).toHaveCSS('opacity', '0.2');
});

test('AC5: 无选中节点时按 F 无操作', async ({ page }) => {
  // 不选中任何节点
  await page.keyboard.press('f');
  const button = page.locator('[data-testid="focus-mode-button"]');
  await expect(button).not.toHaveClass(/bg-blue-50/);
});

test('AC5: 选中变化时聚焦范围更新', async ({ page }) => {
  await page.click('[data-cell-id="node1"]');
  await page.keyboard.press('f');
  // 切换选中到另一个节点
  await page.click('[data-cell-id="node2"]');
  // 验证聚焦范围基于 node2 重新计算
});
```

### 测试运行命令

```bash
# 单元测试 + 组件测试 (Vitest)
pnpm --filter @cdm/web test

# E2E 测试 (Playwright)
pnpm --filter @cdm/web test:e2e
```

---

## ⚠️ 注意事项 (Notes)

1. **性能优化**: 大规模节点 (1000+) 需考虑批量操作 `setAttr` 而非逐个调用
2. **过渡动画 (Phase 2)**: 可添加 CSS transition 使透明度变化更平滑
3. **与 Story 8.1 交互**: 聚焦模式下，折叠的节点不参与聚焦计算（已隐藏）
4. **与 Story 8.9 智能折叠交互**: 两者功能互补，智能折叠隐藏节点，聚焦模式淡化节点

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

| File | Type | Description |
|------|------|-------------|
| `apps/web/components/graph/hooks/useFocusMode.ts` | NEW | Core focus mode hook (BFS traversal + apply/clear opacity), kept < 300 LOC |
| `apps/web/components/graph/hooks/focusModeUtils.ts` | NEW | Extracted traversal/opacity helpers for focus mode |
| `apps/web/components/graph/parts/FocusModeButton.tsx` | NEW | Focus mode toggle button with level dropdown |
| `apps/web/__tests__/hooks/useFocusMode.test.ts` | NEW | Unit tests for focus mode traversal + node/edge opacity behaviors |
| `apps/web/components/graph/hooks/index.ts` | MODIFY | Export useFocusMode hook |
| `apps/web/components/graph/parts/index.ts` | MODIFY | Export FocusModeButton component |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | MODIFY | Add F key binding for focus mode toggle + editing guard |
| `apps/web/components/graph/hooks/useGraphEvents.ts` | MODIFY | Add onBlankClick callback for exit focus mode |
| `apps/web/components/graph/GraphComponent.tsx` | MODIFY | Integrate useFocusMode hook and FocusModeButton |
| `apps/web/__tests__/GraphComponent.test.tsx` | MODIFY | Update tests for focus mode integration |
| `docs/sprint-artifacts/story-8-5-focus-mode.md` | MODIFY | Review follow-ups, file list, and change log updates |

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-08 | Initial implementation of Story 8.5 Focus Mode | AI Agent |
| 2026-01-08 | Review Follow-ups fixes: Level 2/3 semantics, glow opacity, performance guard, UI alignment | AI Agent |
| 2026-01-08 | Review Follow-ups Round 2: dropdown close, hotkey edit guard, selected-edge restore, AC4 tests, file split | AI Agent |
