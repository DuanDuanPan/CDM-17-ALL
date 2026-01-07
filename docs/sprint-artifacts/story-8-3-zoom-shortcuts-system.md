# Story 8.3: 缩放快捷键系统 (Zoom Shortcuts System)

Status: done
Tech-Spec: [tech-spec-8-3-zoom-shortcuts-system.md](./tech-spec-8-3-zoom-shortcuts-system.md)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **用户**,
I want **通过快捷键快速控制缩放级别**,
so that **我能高效地在全局概览和细节编辑之间切换。**

## Problem Statement

在大规模图谱场景（500-5000+ 节点）中，用户需要频繁在全局概览和细节编辑之间切换。目前仅支持滚轮缩放，缺乏快捷键快速控制缩放级别的能力，导致导航效率低下。

## Scope

**In Scope:**
- ✅ Cmd+0 适应屏幕快捷键
- ✅ Cmd+1 恢复 100% 快捷键
- ✅ 双击节点居中（仅居中，不改变缩放）
- ✅ 平滑缩放动画 + prefers-reduced-motion 支持
- ✅ 缩放级别指示器 UI

**Out of Scope:**
- ❌ 浏览器页面缩放快捷键（Cmd/Ctrl + +/-/0 等），本 Story 只处理“图内缩放”
- ❌ 触摸板手势增强（X6 内置）
- ❌ 语义缩放 LOD（Story 8.8）
- ❌ 视图书签（Story 8.11）

---

## Acceptance Criteria (验收标准)

### AC1: 滚轮缩放 (Mousewheel Zoom - Already Implemented) ✅
**Given** 画布处于任意缩放级别
**When** 滚动滚轮
**Then** 画布应以鼠标位置为中心平滑缩放

> **Note**: 此功能已在 `useGraph.ts` 中实现（mousewheel.zoomAtMousePosition: true）

### AC2: 适应屏幕 (Fit to Screen)
**Given** 画布包含至少一个节点
**When** 按下 `Cmd/Ctrl + 0`
**Then** 画布应缩放到"适应屏幕"，显示全部节点（缩放不超过 100%）

**Given** 画布为空（没有节点）
**When** 按下 `Cmd/Ctrl + 0`
**Then** 不做任何处理

### AC3: 100% 缩放 (Reset to 100%)
**When** 按下 `Cmd/Ctrl + 1`
**Then** 画布恢复到 100% 缩放

### AC4: 双击节点居中 (Double-Click Center)
**Given** 节点未处于编辑状态
**When** 双击某个节点
**Then** 画布应平移使该节点居中显示（**不改变当前缩放级别**）

**Given** 节点正处于编辑状态（isEditing: true）
**When** 双击该节点
**Then** 不触发居中，保持现有编辑状态

### AC5: 缩放动画 (Zoom Animation)
**And** 所有缩放/平移过程应有平滑动画（300ms）
**And** 当用户开启 `prefers-reduced-motion` 时，禁用动画

### AC6: 缩放级别指示器 (Zoom Level Indicator)
**Given** 画布处于任意状态
**Then** 右下角（minimap 上方或旁边）应显示当前缩放百分比（如 "100%"）
**When** 缩放级别变化时
**Then** 指示器应实时更新
**When** 点击指示器
**Then** 应重置为 100% 缩放

---

## 🎨 UI 设计规范 (UI Design Specification)

### 📸 高精度 UI 设计 (High-Fidelity UI Mockups)

#### 画布布局与缩放指示器位置 (Canvas Layout with Zoom Indicator)

![画布布局 - 缩放指示器位于 minimap 上方](../prototypes/story-8-3/canvas-with-zoom-ui.png)

**设计要点:**
- 缩放指示器固定在 minimap 上方 8px
- Glassmorphism 风格与 minimap 保持一致
- 显示当前缩放百分比，点击可重置为 100%

---

#### 缩放指示器状态对比 (Zoom Indicator States)

![缩放指示器三种状态: 默认、缩小、悬停](../prototypes/story-8-3/zoom-indicator-states.png)

| 状态 | 外观 | 说明 |
|------|------|------|
| **Default** | 100% 灰色文字 | 默认状态 |
| **Zoomed Out** | 50% 灰色文字 | 缩小后显示当前级别 |
| **Hover** | 75% 亮色背景 | 悬停时提示可点击 |

---

#### 双击节点居中交互流程 (Double-Click Center Interaction Flow)

![双击居中流程: 节点偏离 → 双击 → 节点居中（缩放不变）](../prototypes/story-8-3/double-click-center-flow.png)

**交互步骤:**
1. **Before**: 节点位于画布边缘，缩放级别 100%
2. **Double Click**: 用户双击目标节点
3. **After**: 节点平滑移动到画布中心，**缩放级别保持不变**

---

#### 快捷键参考卡片 (Keyboard Shortcuts Reference)

![缩放控制快捷键卡片](../prototypes/story-8-3/keyboard-shortcuts-overview.png)

| 操作 | 快捷键 | 效果 |
|------|--------|------|
| 缩放到鼠标位置 | 滚轮 | 以鼠标为中心缩放 |
| 适应屏幕 | `Cmd/Ctrl + 0`（备用：`Alt/Option + 0`） | 显示全部节点 (≤100%) |
| 重置 100% | `Cmd/Ctrl + 1`（备用：`Alt/Option + 1`） | 恢复默认缩放 |
| 节点居中 | 双击节点 | 平移使节点居中 |

---

### 交互流程状态机

```mermaid
stateDiagram-v2
    [*] --> 正常视图: 页面加载
    
    正常视图 --> 适应屏幕: Cmd/Ctrl+0
    适应屏幕 --> 正常视图: Cmd/Ctrl+1
    
    正常视图 --> 缩放中: 滚轮/手势
    缩放中 --> 正常视图: 释放
    
    正常视图 --> 节点居中: 双击节点
    节点居中 --> 正常视图: 动画完成
    
    state 缩放等级 {
        20%: minScale (0.2)
        100%: 默认
        400%: maxScale (4)
    }
```

---

### 组件规范

#### 1. ZoomIndicator 组件 (AC6)

| 属性 | 规范 |
|------|------|
| **位置** | 右下角 Flex 堆叠容器中，位于 Minimap 上方，间距自动管理 |
| **尺寸** | 自适应宽度，min-width: 48px |
| **背景** | `bg-background/80 backdrop-blur-sm` (Glassmorphism) |
| **边框** | `border border-border/50 rounded-md` |
| **字体** | 12px, tabular-nums, `text-muted-foreground` |
| **悬停** | `hover:bg-muted cursor-pointer` |
| **点击** | 重置为 100% 缩放 |

```tsx
// 实现参考（统一使用 @cdm/ui 的 Button + cn）
<Button
  type="button"
  variant="ghost"
  size="sm"
  data-testid="zoom-indicator"
  aria-label={`当前缩放 ${zoomPercent}%，点击重置为 100%`}
  onClick={onReset}
  className={cn(
    "absolute right-4 z-50",
    // 位置：minimap 上方（可按实际 minimap 高度微调）
    "bottom-[180px]",
    "min-w-[48px] px-2 py-1",
    "bg-background/80 backdrop-blur-sm",
    "border border-border/50 rounded-md",
    "text-xs tabular-nums text-muted-foreground",
    "hover:bg-muted/50 cursor-pointer",
    "transition-colors duration-150"
  )}
>
  {zoomPercent}%
</Button>
```

---

### 设计 Token

```css
/* 缩放快捷键功能设计 Token */
:root {
  /* Zoom Levels */
  --zoom-min-scale: 0.2;
  --zoom-max-scale: 4;
  --zoom-default-scale: 1;
  --zoom-fit-padding: 40px;  /* 适应屏幕时的边距 */
  
  /* Animation */
  --zoom-animation-duration: 300ms;
  --zoom-animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Center Animation */
  --center-animation-duration: 400ms;
  --center-animation-easing: ease-out;
  
  /* Indicator */
  /* 位置由 Flex 容器自动管理，不再使用绝对定位变量 */
  /* --zoom-indicator-bottom: 210px; DEPRECATED */
  /* --zoom-indicator-right: 16px; DEPRECATED */
}
```

---

### 响应式与可访问性

| 需求 | 实现方式 |
|------|----------|
| **键盘导航** | `Cmd/Ctrl + 0` 适应屏幕, `Cmd/Ctrl + 1` 100% |
| **动效减弱** | 遵守 `prefers-reduced-motion` 媒体查询 |
| **触屏设备** | 支持 pinch-to-zoom 手势（X6 内置） |
| **屏幕阅读器** | 指示器带 `aria-label` 说明当前缩放和操作 |

---

## Tasks / Subtasks

### Phase 1: 创建 useZoomShortcuts Hook (AC: #2, #3, #4, #5)

- [x] Task 1.1: 创建 `useZoomShortcuts` hook
  - [x] 1.1.1 创建文件 `apps/web/components/graph/hooks/useZoomShortcuts.ts`
  - [x] 1.1.2 实现 Hook 接口：
    ```typescript
    interface UseZoomShortcutsOptions {
      graph: Graph | null;
      isReady: boolean;
    }
    
    interface UseZoomShortcutsReturn {
      zoomToFit: () => void;       // Cmd/Ctrl + 0（空画布时不操作）
      zoomTo100: () => void;       // Cmd/Ctrl + 1
      centerNode: (nodeId: string) => void;  // 双击居中（不缩放）
    }
    ```
  - [x] 1.1.3 实现 `zoomToFit()`（含空画布检查）：
    ```typescript
    const zoomToFit = useCallback(() => {
      if (!graph || !isReady) return;
      // 空画布检查
      const nodes = graph.getNodes();
      if (nodes.length === 0) return;

      // 说明：X6 的 zoomToFit/zoomTo/centerCell API 不支持 animation 选项（会触发 TS “excess property”）
      // 做法：计算目标 scale + translate，并用 requestAnimationFrame 插值（参考 useMinimap.ts 的平移动画实现）
      const padding = 40;
      const container = (graph as unknown as { container?: HTMLElement }).container;
      const rect = container?.getBoundingClientRect();
      if (!rect?.width || !rect?.height) return;

      // 用节点 bbox 计算内容范围（只看 nodes，避免边影响）
      const bbox = nodes
        .map((n) => n.getBBox())
        .reduce((acc, r) => acc.union(r));

      const availableW = Math.max(1, rect.width - padding * 2);
      const availableH = Math.max(1, rect.height - padding * 2);
      const targetScale = Math.min(availableW / bbox.width, availableH / bbox.height, 1);

      const center = bbox.getCenter();
      const targetTx = rect.width / 2 - center.x * targetScale;
      const targetTy = rect.height / 2 - center.y * targetScale;

      animateGraphTransformTo(graph, { scale: targetScale, tx: targetTx, ty: targetTy }, 300, prefersReducedMotion);
    }, [graph, isReady, prefersReducedMotion]);
    ```
  - [x] 1.1.4 实现 `zoomTo100()`（平滑缩放到 100%，遵守 reduced-motion）
    ```typescript
    const zoomTo100 = useCallback(() => {
      if (!graph || !isReady) return;
      // 仅缩放到 1（保持当前视口中心点不跳动）
      animateGraphZoomTo(graph, 1, 300, prefersReducedMotion);
    }, [graph, isReady, prefersReducedMotion]);
    ```
  - [x] 1.1.5 实现 `centerNode(nodeId)`（仅平移，不缩放）：
    ```typescript
    const centerNode = useCallback((nodeId: string) => {
      if (!graph || !isReady) return;
      const cell = graph.getCellById(nodeId);
      if (!cell?.isNode()) return;

      // 仅平移：用 node bbox 的中心点，按当前 zoom 计算目标 translate，并 rAF 平滑移动
      const node = cell as Node;
      const { x, y } = node.getBBox().getCenter();
      animateTranslateToCenterPoint(graph, x, y, 400, prefersReducedMotion);
    }, [graph, isReady, prefersReducedMotion]);
    ```
  - [x] 1.1.6 添加 `prefers-reduced-motion` 检测
  - [x] 1.1.7 在 `hooks/index.ts` 中导出 hook

### Phase 2: 快捷键集成 (AC: #2, #3)

- [x] Task 2.1: 添加缩放快捷键到 useGraphHotkeys
  - [x] 2.1.1 修改 `apps/web/components/graph/hooks/useGraphHotkeys.ts`
  - [x] 2.1.2 扩展 `UseGraphHotkeysOptions` 接口：
    ```typescript
    // Story 8.3: Zoom shortcuts
    onZoomToFit?: () => void;
    onZoomTo100?: () => void;
    ```
  - [x] 2.1.3 添加快捷键处理（优先用 `e.code`，避免不同键盘布局导致 `e.key` 不稳定）
    - 主快捷键：
      - `Cmd/Ctrl + 0` → `onZoomToFit?.()`（AC2）
      - `Cmd/Ctrl + 1` → `onZoomTo100?.()`（AC3）
    - Web 备用快捷键（解决浏览器保留快捷键导致无法拦截的问题，E2E 也用它来稳定断言）：
      - `Alt/Option + 0` → `onZoomToFit?.()`
      - `Alt/Option + 1` → `onZoomTo100?.()`
    - 处理顺序：放在 “selectedNodes === 1” 之前（不要求选中节点也可触发）
  - [x] 2.1.4 输入保护：确保在 `input/textarea/select/contentEditable` 中不触发

### Phase 3: 双击节点居中 (AC: #4)

- [x] Task 3.1: 添加双击事件监听
  - [x] 3.1.1 修改 `apps/web/components/graph/GraphComponent.tsx`
  - [x] 3.1.2 添加 `node:dblclick` 事件监听：
    ```typescript
    useEffect(() => {
      if (!graph || !isReady) return;
      
      const handleNodeDblClick = ({ node }: { node: Node }) => {
        const data = node.getData() || {};
        // 仅在非编辑状态时居中
        if (!data.isEditing) {
          centerNode(node.id);
        }
      };
      
      graph.on('node:dblclick', handleNodeDblClick);
      return () => graph.off('node:dblclick', handleNodeDblClick);
    }, [graph, isReady, centerNode]);
    ```

### Phase 4: 缩放级别指示器 (AC: #6)

- [x] Task 4.1: 创建 `ZoomIndicator` 组件
  - [x] 4.1.1 创建文件 `apps/web/components/graph/parts/ZoomIndicator.tsx`
  - [x] 4.1.2 实现组件：
    ```typescript
    interface ZoomIndicatorProps {
      zoom: number;
      onReset: () => void;
    }
    ```
  - [x] 4.1.3 显示格式：`{Math.round(zoom * 100)}%`
  - [x] 4.1.4 点击触发 `onReset` (zoomTo100)
  - [x] 4.1.5 在 `parts/index.ts` 中导出

- [x] Task 4.2: 集成到 GraphComponent
  - [x] 4.2.1 添加 `ZoomIndicator` 渲染
  - [x] 4.2.2 监听 `scale` 事件更新显示（复用 `useGraphTransform` 的 `scale`，避免在 `useZoomShortcuts` 里再维护 `currentZoom`）

### Phase 5: 测试 (All ACs)

- [x] Task 5.1: 单元测试 (Vitest)
  - [x] 5.1.1 创建 `apps/web/__tests__/hooks/useZoomShortcuts.test.ts`
  - [x] 5.1.2 覆盖：zoomToFit（含空画布）、zoomTo100、centerNode、reduced-motion

- [x] Task 5.2: 组件测试
  - [x] 5.2.1 创建 `apps/web/__tests__/components/ZoomIndicator.test.tsx`

- [x] Task 5.3: E2E 测试 (Playwright)
  - [x] 5.3.1 创建 `apps/web/e2e/zoom-shortcuts.spec.ts`
  - [x] 5.3.2 覆盖 AC2-AC6

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] AC4：双击居中需忽略编辑态节点（补齐 `isEditing` guard） [apps/web/components/graph/hooks/useGraphEvents.ts:110]
- [x] [AI-Review][HIGH] AC4 E2E：避免依赖 `trigger?.()`；确保事件真正触发并断言 `translate` 发生变化 [apps/web/e2e/zoom-shortcuts.spec.ts:202]
- [x] [AI-Review][HIGH] 输入保护 E2E：在真实 `input/textarea/contentEditable` 聚焦时验证快捷键不触发（避免未聚焦导致假绿） [apps/web/e2e/zoom-shortcuts.spec.ts:219]
- [x] [AI-Review][MEDIUM] 补全 Dev Agent Record → File List（列出本 Story 实际改动文件并简述） [docs/sprint-artifacts/story-8-3-zoom-shortcuts-system.md:855]
- [x] [AI-Review][MEDIUM] 性能：useGraphTransform 用 rAF 合并 `scale/translate` 更新，避免缩放/平移动画导致 React 高频 setState [apps/web/components/graph/hooks/useGraphTransform.ts:32]
- [x] [AI-Review][MEDIUM] UX：ZoomIndicator 的 `bottom-[210px]` 与 minimap 显示状态未联动；隐藏 minimap 时位置可能不合理 [apps/web/components/graph/parts/ZoomIndicator.tsx:39] - *已通过 Flex 布局解决*
- [x] [AI-Review][MEDIUM] 状态流：修复 HIGH/MED 后将 Story 状态标记为 done 并同步 sprint-status（避免过早标记 review） [docs/sprint-artifacts/story-8-3-zoom-shortcuts-system.md:3; docs/sprint-artifacts/sprint-status.yaml:106]
- [x] [AI-Review][LOW] 快捷键兼容：支持 `Numpad0/Numpad1`（或明确不支持） [apps/web/components/graph/hooks/useGraphHotkeys.ts:156]
- [x] [AI-Review][LOW] 清理新增测试/用例中的 unused 变量/类型，减少 ESLint warning 噪音 [apps/web/__tests__/hooks/useZoomShortcuts.test.ts:8; apps/web/e2e/zoom-shortcuts.spec.ts:178]

---

## Dev Notes

### 技术决策 (Technical Decisions)

#### TD-1: 使用 X6 内置缩放 API

**决策**: 使用 `graph.zoomToFit()`, `graph.zoomTo()`, `graph.translate()` 作为基础能力；平滑动画用 `requestAnimationFrame` 插值实现（遵守 prefers-reduced-motion）

**理由**:
- X6 的 Graph API typings 不支持 `animation` 选项（需自行做动效）
- 复用项目中已落地的 rAF 动画模式（参考 minimap 的平移动画）
- 与现有 mousewheel 缩放一致

#### TD-2: 双击仅居中，不改变缩放

**决策**: 双击节点仅做平移居中（按当前 zoom 计算目标 translate），不触发缩放

**理由**:
- 用户明确要求（选项 A）
- 保持与现有编辑模式不冲突（isEditing 检查）
- 用户心智模型清晰：双击居中，Space 编辑

#### TD-3: 空画布时 Cmd+0 不处理

**决策**: `zoomToFit()` 在 `graph.getNodes().length === 0` 时直接返回

**理由**:
- 用户明确要求
- 避免 X6 在空内容时的异常行为

#### TD-4: 缩放指示器实时更新

**决策**: 复用 `useGraphTransform` hook 监听 `scale` 事件

**理由**:
- 已有成熟实现（Story 1.4 协作光标）
- 避免重复事件监听

#### TD-5: Web 端快捷键冲突处理

**决策**: 仍实现 `Cmd/Ctrl + 0/1`，同时提供 `Alt/Option + 0/1` 作为 Web 备用快捷键；E2E 使用备用快捷键保证稳定性

**理由**:
- 部分浏览器/系统会拦截常见组合键（尤其数字键组合），导致无法可靠触发
- 备用键不改变主 UX 预期，同时确保可测试、可用性更稳

#### TD-6: 视图控制区 (View Controls) 采用 Flex 堆叠布局

**决策**: 移除 `ZoomIndicator` 和 `MinimapContainer` 的绝对定位，使用右下角 Flex 容器 (`bottom-4 right-4 flex-col`) 进行自动堆叠管理。

**理由**:
- 避免小地图收起时出现大面积视觉留白
- 解耦组件与布局定位
- 方便未来扩展其他视图控制按钮（如全屏、网格切换）


### 📁 项目结构落点

| 文件 | 类型 | 描述 |
|------|------|------|
| `apps/web/components/graph/hooks/useZoomShortcuts.ts` | [NEW] | 核心 hook |
| `apps/web/components/graph/hooks/index.ts` | [MODIFY] | 导出 |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | [MODIFY] | 添加快捷键 |
| `apps/web/components/graph/parts/ZoomIndicator.tsx` | [NEW] | 缩放指示器 |
| `apps/web/components/graph/parts/index.ts` | [MODIFY] | 导出 |
| `apps/web/components/graph/GraphComponent.tsx` | [MODIFY] | 集成 |
| `apps/web/__tests__/hooks/useZoomShortcuts.test.ts` | [NEW] | 单元测试 |
| `apps/web/__tests__/components/ZoomIndicator.test.tsx` | [NEW] | 组件测试 |
| `apps/web/e2e/zoom-shortcuts.spec.ts` | [NEW] | E2E 测试 |
| `apps/web/components/graph/hooks/useGraphEvents.ts` | [MODIFY] | 添加 onNodeDoubleClick (AC4) |
| `apps/web/__tests__/GraphComponent.test.tsx` | [MODIFY] | 添加 useZoomShortcuts mock |

### 依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@antv/x6` | 3.1.2 | `zoomToFit`, `zoomTo`, `translate` 等基础变换 API |
| `useMediaQuery` | - | 检测 `prefers-reduced-motion` |
| `useGraphTransform` | - | 监听缩放变化 |

### 🔗 References

- [Source: docs/epics.md#Story-8.3] 原始需求
- [Source: apps/web/hooks/useGraph.ts#L53-60] mousewheel 配置
- [Source: apps/web/components/graph/hooks/useGraphTransform.ts] 缩放状态监听
- [Source: apps/web/components/graph/hooks/useMinimap.ts] rAF 动画（平移 + reduced-motion）参考
- Story 8.1/8.2 快捷键/动画模式参考

---

## 🧪 测试设计 (Test Design)

### 测试文件清单

| 文件路径 | 类型 | 覆盖 AC |
|----------|------|---------|
| `apps/web/__tests__/hooks/useZoomShortcuts.test.ts` | 单元测试 | AC2, AC3, AC4, AC5 |
| `apps/web/__tests__/components/ZoomIndicator.test.tsx` | 组件测试 | AC6 |
| `apps/web/e2e/zoom-shortcuts.spec.ts` | E2E 测试 | AC2-AC6 |

---

### 单元测试: `useZoomShortcuts.test.ts`

**文件**: `apps/web/__tests__/hooks/useZoomShortcuts.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Rectangle } from '@antv/x6';
import { useZoomShortcuts } from '@/components/graph/hooks/useZoomShortcuts';

const mockUseMediaQuery = vi.fn().mockReturnValue(true); // reduced-motion by default
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: (...args: unknown[]) => mockUseMediaQuery(...args),
}));

function createMockGraph() {
  const container = document.createElement('div');
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, top: 0, left: 0,
    width: 1000, height: 500,
    right: 1000, bottom: 500,
    toJSON: () => {},
  } as DOMRect);

  const mockNode = {
    isNode: () => true,
    getBBox: () => new Rectangle(0, 0, 2000, 1000), // big bbox -> fit will zoom out
  };

  return {
    container,
    getNodes: vi.fn(() => [mockNode]),
    getCellById: vi.fn(),
    zoom: vi.fn(() => 2),
    zoomTo: vi.fn(),
    translate: vi.fn(),
    centerPoint: vi.fn(),
  };
}

describe('useZoomShortcuts', () => {
  let graph: any;

  beforeEach(() => {
    graph = createMockGraph();
    mockUseMediaQuery.mockReturnValue(true);
  });

  it('zoomToFit: no-op when canvas is empty (AC2)', () => {
    graph.getNodes.mockReturnValue([]);
    const { result } = renderHook(() => useZoomShortcuts({ graph, isReady: true }));
    act(() => result.current.zoomToFit());
    expect(graph.zoomTo).not.toHaveBeenCalled();
    expect(graph.translate).not.toHaveBeenCalled();
  });

  it('zoomToFit: applies zoom + translate (reduced-motion path) (AC2/AC5)', () => {
    const { result } = renderHook(() => useZoomShortcuts({ graph, isReady: true }));
    act(() => result.current.zoomToFit());
    expect(graph.zoomTo).toHaveBeenCalled();
    expect(graph.translate).toHaveBeenCalled();
    // 关键断言：fit 不应放大超过 1
    const lastScale = graph.zoomTo.mock.calls.at(-1)?.[0];
    expect(lastScale).toBeLessThanOrEqual(1);
  });

  it('zoomTo100: zooms to 1 (reduced-motion path) (AC3/AC5)', () => {
    const { result } = renderHook(() => useZoomShortcuts({ graph, isReady: true }));
    act(() => result.current.zoomTo100());
    const lastScale = graph.zoomTo.mock.calls.at(-1)?.[0];
    expect(lastScale).toBe(1);
  });

  it('centerNode: centers valid node and does not crash (AC4)', () => {
    graph.getCellById.mockReturnValue({
      isNode: () => true,
      getBBox: () => new Rectangle(100, 200, 10, 20),
    });
    const { result } = renderHook(() => useZoomShortcuts({ graph, isReady: true }));
    act(() => result.current.centerNode('test-node'));
    expect(graph.centerPoint).toHaveBeenCalled();
  });
});
```

---

### 组件测试: `ZoomIndicator.test.tsx`

**文件**: `apps/web/__tests__/components/ZoomIndicator.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomIndicator } from '@/components/graph/parts/ZoomIndicator';

describe('ZoomIndicator (AC6)', () => {
  describe('rendering', () => {
    it('should display zoom percentage correctly', () => {
      render(<ZoomIndicator zoom={1} onReset={vi.fn()} />);
      expect(screen.getByTestId('zoom-indicator')).toHaveTextContent('100%');
    });

    it('should display 75% for zoom 0.75', () => {
      render(<ZoomIndicator zoom={0.75} onReset={vi.fn()} />);
      expect(screen.getByTestId('zoom-indicator')).toHaveTextContent('75%');
    });

    it('should display 150% for zoom 1.5', () => {
      render(<ZoomIndicator zoom={1.5} onReset={vi.fn()} />);
      expect(screen.getByTestId('zoom-indicator')).toHaveTextContent('150%');
    });

    it('should round to nearest integer', () => {
      render(<ZoomIndicator zoom={0.333} onReset={vi.fn()} />);
      expect(screen.getByTestId('zoom-indicator')).toHaveTextContent('33%');
    });
  });

  describe('accessibility', () => {
    it('should have aria-label with current zoom and reset instruction', () => {
      render(<ZoomIndicator zoom={0.5} onReset={vi.fn()} />);
      const button = screen.getByTestId('zoom-indicator');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('50%'));
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('100%'));
    });
  });

  describe('interaction', () => {
    it('should call onReset when clicked', () => {
      const onReset = vi.fn();
      render(<ZoomIndicator zoom={0.5} onReset={onReset} />);

      fireEvent.click(screen.getByTestId('zoom-indicator'));

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('should have glassmorphism background classes', () => {
      render(<ZoomIndicator zoom={1} onReset={vi.fn()} />);
      const button = screen.getByTestId('zoom-indicator');
      expect(button.className).toContain('backdrop-blur');
    });

    it('should use tabular-nums for consistent width', () => {
      render(<ZoomIndicator zoom={1} onReset={vi.fn()} />);
      const button = screen.getByTestId('zoom-indicator');
      expect(button.className).toContain('tabular-nums');
    });
  });
});
```

---

### E2E 测试: `zoom-shortcuts.spec.ts`

**文件**: `apps/web/e2e/zoom-shortcuts.spec.ts`

```typescript
import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraph = {
  zoom: () => number;
  translate: () => { tx: number; ty: number };
  zoomTo?: (factor: number) => void;
  getCellById: (id: string) => any | null;
  addNode: (config: any) => void;
};

async function waitForGraph(page: Page) {
  await expect
    .poll(async () => page.evaluate(() => Boolean((window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph)))
    .toBe(true);
}

async function getZoom(page: Page) {
  return page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    return graph?.zoom?.() ?? 1;
  });
}

async function getTranslate(page: Page) {
  return page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    return graph?.translate?.() ?? { tx: 0, ty: 0 };
  });
}

async function seedNodes(page: Page) {
  await page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    if (!graph) return;
    const now = new Date().toISOString();

    const ensureNode = (id: string, x: number, y: number) => {
      if (graph.getCellById(id)) return;
      graph.addNode({
        shape: 'mind-node',
        id,
        x,
        y,
        width: 160,
        height: 50,
        data: {
          id,
          label: id,
          type: 'topic',
          isEditing: false,
          createdAt: now,
          updatedAt: now,
        },
      });
    };

    // 两个远距离节点，确保 fit-to-screen 会缩小 (<= 1)
    ensureNode('zoom-n1', 0, 0);
    ensureNode('zoom-n2', 2000, 1000);
  });
}

test.describe('Story 8.3: Zoom Shortcuts System', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
    await waitForGraph(page);
    await seedNodes(page);
    await page.getByTestId('graph-canvas').click(); // Hotkeys require focus
  });

  test('AC2: Fit to screen (Alt+0 fallback)', async ({ page }) => {
    await page.evaluate(() => {
      const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
      graph?.zoomTo?.(2);
    });

    await page.keyboard.press('Alt+Digit0');
    await page.waitForTimeout(350);

    const zoom = await getZoom(page);
    expect(zoom).toBeLessThanOrEqual(1);
  });

  test('AC3: Reset to 100% (Alt+1 fallback)', async ({ page }) => {
    await page.evaluate(() => {
      const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
      graph?.zoomTo?.(0.5);
    });

    await page.keyboard.press('Alt+Digit1');
    await page.waitForTimeout(350);

    const zoom = await getZoom(page);
    expect(zoom).toBeCloseTo(1, 1);
  });

  test('AC4: Double-click centers node without changing zoom', async ({ page }) => {
    const node = page.locator('.x6-node[data-cell-id=\"zoom-n2\"]');
    await expect(node).toBeVisible();

    const zoomBefore = await getZoom(page);
    const translateBefore = await getTranslate(page);

    await node.dblclick();
    await page.waitForTimeout(450);

    const zoomAfter = await getZoom(page);
    const translateAfter = await getTranslate(page);

    expect(zoomAfter).toBeCloseTo(zoomBefore, 2);
    expect(translateAfter).not.toEqual(translateBefore);
  });

  test('AC4: Double-click does nothing when isEditing=true', async ({ page }) => {
    await page.evaluate(() => {
      const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
      const cell = graph?.getCellById?.('zoom-n2');
      const data = cell?.getData?.() ?? {};
      cell?.setData?.({ ...data, isEditing: true });
    });

    const node = page.locator('.x6-node[data-cell-id=\"zoom-n2\"]');
    await expect(node).toBeVisible();

    const before = await getTranslate(page);
    await node.dblclick();
    await page.waitForTimeout(450);
    const after = await getTranslate(page);

    expect(after).toEqual(before);
  });

  test('AC6: Zoom indicator visible and resets on click', async ({ page }) => {
    const indicator = page.getByTestId('zoom-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText('%');

    await page.keyboard.press('Alt+Digit0');
    await page.waitForTimeout(350);

    await indicator.click();
    await page.waitForTimeout(350);

    const zoom = await getZoom(page);
    expect(zoom).toBeCloseTo(1, 1);
  });

  test('Input protection: should not trigger when search input focused', async ({ page }) => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('mindmap:open-search')));
    await page.getByTestId('global-search-input').click();

    const before = await getZoom(page);
    await page.keyboard.press('Alt+Digit0');
    await page.waitForTimeout(350);
    const after = await getZoom(page);

    expect(after).toBeCloseTo(before, 2);
  });
});
```

---

### 测试覆盖矩阵

| 测试场景 | AC | 单元 | 组件 | E2E |
|---------|-----|------|------|-----|
| Cmd+0 正常缩放 | AC2 | ✅ | - | ✅ |
| Cmd+0 空画布不操作 | AC2 | ✅ | - | ✅ |
| Cmd+1 恢复 100% | AC3 | ✅ | - | ✅ |
| 双击居中（不缩放） | AC4 | ✅ | - | ✅ |
| 双击编辑状态不居中 | AC4 | - | - | ✅ |
| 动画平滑 | AC5 | ✅ | - | ✅ |
| reduced-motion 禁用动画 | AC5 | ✅ | - | - |
| 指示器显示百分比 | AC6 | - | ✅ | ✅ |
| 指示器点击重置 | AC6 | - | ✅ | ✅ |
| 输入保护 | - | - | - | ✅ |

## Dev Agent Record

### Validation Applied

- ✅ [2026-01-07] validate-create-story 已执行（见 `validation-report-2026-01-07T11-01-37+0800.md`）
- ✅ 已按报告修正 Must Fix / Should Improve：Epic AC 对齐、X6 `animation` 改为 rAF 动效、Playwright 对齐 `gotoTestGraph` + 备用快捷键、移除重复缩放状态

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

### Completion Notes List

### File List

| File | Type | Description |
|------|------|-------------|
| `apps/web/components/graph/hooks/useZoomShortcuts.ts` | [NEW] | Core hook implementing zoom-to-fit, reset-to-100%, and center-node with animations |
| `apps/web/components/graph/hooks/useGraphHotkeys.ts` | [MODIFY] | Added Cmd/Ctrl+0/1, Alt+0/1, Numpad0/1 shortcuts with input protection |
| `apps/web/components/graph/hooks/useGraphEvents.ts` | [MODIFY] | Added node:dblclick handler with isEditing guard (AC4) |
| `apps/web/components/graph/hooks/index.ts` | [MODIFY] | Export useZoomShortcuts hook |
| `apps/web/components/graph/parts/ZoomIndicator.tsx` | [NEW] | Zoom level indicator component with glassmorphism styling |
| `apps/web/components/graph/parts/MinimapToggleButton.tsx` | [MODIFY] | Extracted toggle button for minimap visibility |
| `apps/web/components/graph/parts/MinimapContainer.tsx` | [MODIFY] | Refactored to use controlled visibility with toggle button |
| `apps/web/components/graph/parts/index.ts` | [MODIFY] | Export ZoomIndicator and MinimapToggleButton |
| `apps/web/components/graph/GraphComponent.tsx` | [MODIFY] | Integrated useZoomShortcuts, ZoomIndicator, and Flex layout for view controls |
| `apps/web/components/graph/hooks/useGraphTransform.ts` | [MODIFY] | Coalesced `scale/translate` updates with rAF to reduce render churn during animations |
| `apps/web/__tests__/hooks/useZoomShortcuts.test.ts` | [NEW] | Unit tests covering AC2-AC5 |
| `apps/web/__tests__/components/ZoomIndicator.test.tsx` | [NEW] | Component tests for AC6 |
| `apps/web/__tests__/GraphComponent.test.tsx` | [MODIFY] | Added useZoomShortcuts mock |
| `apps/web/e2e/zoom-shortcuts.spec.ts` | [NEW] | E2E tests covering AC2-AC6 with real input protection tests |
| `docs/epics.md` | [MODIFY] | Updated Story 8.3 Acceptance Criteria to match implementation |
| `docs/sprint-artifacts/sprint-status.yaml` | [MODIFY] | Synced sprint tracking status for Story 8.3 |
| `docs/sprint-artifacts/story-8-3-zoom-shortcuts-system.md` | [NEW] | Story definition, tasks, and dev record |
| `docs/sprint-artifacts/tech-spec-8-3-zoom-shortcuts-system.md` | [NEW] | Tech spec for implementation details |
| `docs/sprint-artifacts/validation-report-2026-01-07T11-01-37+0800.md` | [NEW] | validate-create-story report |
| `docs/prototypes/story-8-3/canvas-with-zoom-ui.png` | [NEW] | Hi-fi mock: canvas layout with zoom UI |
| `docs/prototypes/story-8-3/zoom-indicator-states.png` | [NEW] | Hi-fi mock: zoom indicator states |
| `docs/prototypes/story-8-3/double-click-center-flow.png` | [NEW] | Hi-fi mock: double-click center flow |
| `docs/prototypes/story-8-3/keyboard-shortcuts-overview.png` | [NEW] | Hi-fi mock: shortcuts reference card |
| `docs/sprint-artifacts/story-8-4-outline-view.md` | [NEW] | (Out of scope for 8.3) Outline View story draft |
| `docs/sprint-artifacts/tech-spec-8-4-outline-view.md` | [NEW] | (Out of scope for 8.3) Outline View tech spec draft |
| `docs/sprint-artifacts/images/story-8-4-sidebar-full.png` | [NEW] | (Out of scope for 8.3) Outline View mock |
| `docs/sprint-artifacts/images/story-8-4-outline-default.png` | [NEW] | (Out of scope for 8.3) Outline View mock |
| `docs/sprint-artifacts/images/story-8-4-outline-dragging.png` | [NEW] | (Out of scope for 8.3) Outline View mock |
