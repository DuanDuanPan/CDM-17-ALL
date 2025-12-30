# Story 7.3: UI 原子组件库搭建 (UI Atomic Components)

Status: review

## 1. Background

当前项目的通用 UI 组件严重缺失，`packages/ui` 仅包含 `toast` 和 `confirm-dialog`。前端开发中存在大量重复的 ad-hoc 样式代码（如按钮、卡片各个页面写法不一），违反了 "Centralized UI" (architecture.md:655) 和 "Utility-First" (architecture.md:656) 的核心架构原则。

为了保证通过 `packages/ui` 提供统一的设计语言，必须建立一套标准化的原子组件库，包含最基础的 `Button`, `Input`, `Card`, `Badge`。这将极大提升开发效率并确保全站视觉一致性。

### 与整体重构规划的对照

本 Story 对应 `refactoring-proposal-2025-12-28.md` 第一阶段 **1.3 UI 库基建启动**。

**依赖关系：**
- 前置：Story 7.2 (ESLint rules for architecture) - 已完成
- 后置：Story 7.5 (Plugin Migration) - 需要用到这些原子组件来构建插件 UI

**预估工时：** ~2 人天 (来源: refactoring-proposal Section 9.1.3)

### 架构决策声明

> **变体命名约定**: 本 Story 采用 **Shadcn UI 官方规范** 而非重构提案中的变体命名。
> - 重构提案定义: Button (`primary, secondary, ghost, danger`), Badge (`success, warning, error, info`)
> - Shadcn 规范定义: Button (`default, destructive, outline, secondary, ghost, link`), Badge (`default, secondary, destructive, outline`)
> 
> **决策理由**: Shadcn 是事实上的行业标准，其命名语义更清晰 (如 `destructive` 比 `danger` 更明确)，便于未来复用社区组件。
> 
> **后续行动**: 需更新 `refactoring-proposal-2025-12-28.md` 第 3.1.3 节和第 6 节验收标准以保持一致。

## 2. Requirements

### Must Have
- **基础组件实现**: 在 `packages/ui/src` 中创建以下组件（基于 Shadcn UI 规范）：
  - `Button`: 支持 `variant` (default, destructive, outline, secondary, ghost, link) 和 `size` (default, sm, lg, icon)。支持 `asChild` (Slot)。
  - `Input`: 支持基础文本输入，带 focus ring 样式。
  - `Badge`: 支持 `variant` (default, secondary, destructive, outline)。
  - `Card`:包含 `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent` 复合组件。
- **类型安全**: 所有组件必须导出 TypeScript 类型定义。
- **导出规范**: 通过 `packages/ui/src/index.ts` 统一导出。
- **依赖管理**: `packages/ui` 需补充必要的 Radix UI 依赖（如 `@radix-ui/react-slot`）。

### Should Have
- **验证页面**: 在 `apps/web` 中创建一个临时路由 `/poc/design-system`，展示所有变体的实际渲染效果，作为轻量级的 "Storybook" 替代。
  - **注意**: 需确认此 POC 路由是否需要认证绕过配置 (参考现有 POC 路由模式)。
- **图标集成**: 确保组件（如 Button）能良好适配 `lucide-react` 图标。
  - 验证示例: `<Button variant="outline" size="icon"><Loader2 className="animate-spin" /></Button>`
- **深色模式验证**: 在 POC 页面中验证所有组件在深色模式下的显示效果。
- **类型导出** (参考 Story 7.2 经验): 显式导出组件 Props 类型:
  ```typescript
  export type { ButtonProps } from './button'
  export type { BadgeProps } from './badge'
  ```

## 3. File Change Manifest (Predicted)

### 3.1 新建文件 (CREATE) - 5 files

| 文件路径 | 用途 |
|---------|------|
| `packages/ui/src/button.tsx` | 按钮组件 (Shadcn-like) |
| `packages/ui/src/input.tsx` | 输入框组件 |
| `packages/ui/src/badge.tsx` | 徽章组件 |
| `packages/ui/src/card.tsx` | 卡片复合组件 |
| `apps/web/app/poc/design-system/page.tsx` | 验证/展示页面 |

### 3.2 修改文件 (MODIFY) - 2 files

| 文件路径 | 修改内容 | 预期变化 |
|---------|---------|----------|
| `packages/ui/src/index.ts` | 导出新组件及类型 | +4 组件 exports, +4 类型 exports |
| `packages/ui/package.json` | 添加 `@radix-ui/react-slot` 依赖 | +1 dependency |

## 4. Technical Design

### 4.0 现有基础设施 (必读)

> **关键**: 以下工具和依赖**已存在**于 `packages/ui` 中，**禁止重复创建**:
> 
> | 已存在项 | 位置 | 用途 |
> |:--------|:----|:----|
> | `cn()` 工具函数 | `packages/ui/src/utils.ts` | Tailwind 类名合并 |
> | `class-variance-authority` | `package.json` dependencies | 变体定义 |
> | `clsx` + `tailwind-merge` | `package.json` dependencies | 类名处理 |
> | CSS 变量 (Light/Dark) | `globals.css` | 主题 Token |
>
> 组件开发中直接使用: `import { cn } from './utils'`

### 4.1 组件设计规范

所有组件应遵循 Shallow Merge 策略，允许通过 `className` prop 覆盖默认样式（利用 `cn` / `tailwind-merge`）。

**Button API Design:**
```typescript
import { type VariantProps } from "class-variance-authority"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}
```
*依赖*: 需要 `@radix-ui/react-slot` 来支持 `asChild` 属性（允许按钮作为 Link 的子元素渲染）。

**Card API Design:**
采用复合组件模式，提供灵活的内容布局：
```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

### 4.2 依赖管理

`packages/ui` 需要添加以下 peerDependencies 或 dependencies：
- `@radix-ui/react-slot`: 用于 Button 的多态渲染。

### 4.3 建议的未来 ESLint 规则

完成本 Story 后，建议添加 ESLint 规则阻止业务代码中手写基础组件样式:
```javascript
// 禁止在 apps/web/components 中创建本地 CSS 类如 .btn, .my-card
// 强制使用 @cdm/ui 导出的 Button, Card, Badge, Input
```
*参考: refactoring-proposal Section 3.1.3*

## 5. Implementation Tasks

### 5.0 Pre-Flight Check (开始前验证)
- [x] **Task 5.0.1**: 验证现有基础设施可用。
  - 确认 `packages/ui/src/utils.ts` 中 `cn()` 函数存在且可导入
  - 确认 `class-variance-authority` 在 `package.json` 中已存在
  - 确认 `globals.css` 中 CSS 变量 (`--primary`, `--destructive` 等) 已定义

### 5.1 Infrastructure
- [x] **Task 5.1.1**: 在 `packages/ui` 中安装依赖。
  - `pnpm add @radix-ui/react-slot` (在 packages/ui 目录下)

### 5.2 Component Implementation
- [x] **Task 5.2.1**: 实现 `Button` 组件。
  - 定义 `buttonVariants` (cva)
  - 实现组件与类型导出
- [x] **Task 5.2.2**: 实现 `Input` 组件。
  - 处理 focus ring 和 disabled 状态
- [x] **Task 5.2.3**: 实现 `Badge` 组件。
  - 定义 `badgeVariants`
- [x] **Task 5.2.4**: 实现 `Card` 组件。
  - 实现 Header, Footer, Title, Description, Content 子组件

### 5.3 Export & Integration
- [x] **Task 5.3.1**: 在 `packages/ui/src/index.ts` 中导出所有组件。
- [x] **Task 5.3.2**: 创建验证页面 `apps/web/app/poc/design-system/page.tsx`。
  - 展示 Button 的所有 variant 和 size
  - 展示 Input 状态 (Default, Disabled, With Label)
  - 展示 Badge 列表
  - 展示一个标准 Card 样例

## 6. Verification Plan

### 6.1 Automated Verification
- **Build Test**: 运行 `pnpm build` 确保 `packages/ui` 编译无误，且 `apps/web` 能消费新组件。
- **Type Check**: 确保组件 Props 类型推导正常 (`tsc --noEmit`)。
- **Existing Exports**: 确认现有 `toast` 和 `confirm-dialog` 导出未被破坏。

### 6.2 Manual Verification
- 启动前端服务 `pnpm dev`。
- 访问 `http://localhost:3000/poc/design-system`。
- **Button Check**: 确认所有颜色变体显示正确，Hover 状态正常，点击无报错。
- **Input Check**: 确认输入聚焦时的 Ring 样式颜色符合设计系统（Token）。
- **Responsive Check**: 确认 Card 在不同屏幕宽度下的表现。
- **深色模式 Check**: 切换系统主题或添加 `class="dark"` 到 `<html>`，确认所有组件在深色模式下正确显示。
- **图标集成 Check**: 验证以下图标按钮渲染正确:
  ```tsx
  import { Loader2, ChevronRight, Plus } from 'lucide-react'
  <Button size="icon"><Plus /></Button>
  <Button variant="outline" size="sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading</Button>
  ```

## 7. Dev Notes

### 7.1 推荐实现顺序

按复杂度从低到高:
1. `Badge` (最简单, 纯样式组件)
2. `Input` (带 ForwardRef)
3. `Button` (CVA 变体 + asChild)
4. `Card` (复合组件模式)

### 7.2 关键约束

- **样式来源**: 参考 [Shadcn UI Registry](https://ui.shadcn.com/docs/components/button)，保持与现有 `globals.css` 中的 CSS Variables (HSL) 兼容。
- **图标**: 验证页面使用 `lucide-react` 图标测试 Button 的 icon size 适配。
- **严禁**: 在组件内部编写硬编码颜色（如 `bg-blue-500`），必须使用语义化 Token（如 `bg-primary`, `bg-destructive`）。
- **使用现有 `cn()`**: **禁止**重新创建 `cn` 函数，直接 `import { cn } from './utils'`。

### 7.3 来自 Story 7.2 的经验

- 类型必须显式导出 (`export type { ButtonProps }`)，否则消费者无法获得类型推导
- ESLint 规则初始可设为 `warn`，待所有违规修复后改为 `error`

---

# Technical Specification

## 1. Overview

### Problem Statement
前端开发中存在代码重复、视觉不一致、维护困难等问题，严重违反了架构原则。需建立标准化组件库。

### Solution
建立一套标准化的原子组件库 (`packages/ui`)，基于 **Shadcn UI** 规范（Headless Radix UI + Tailwind CSS）。

## 2. Context for Development

### Codebase Patterns
- **Style System**: 
  - `packages/ui/src/globals.css`: 定义 CSS Variables (`--primary`, `--radius` 等)。
  - `packages/config/tailwind.config.ts`: 映射 CSS 变量。
- **Utility**: `packages/ui/src/utils.ts` 中的 `cn()`。
- **Architecture**: Radix UI (Headless) + CVA (Variants) + ForwardRef.

### Dependencies
- **New Required**: `@radix-ui/react-slot` (Button asChild support).

## 3. Tech Spec Implementation Plan

### Infrastructure
- [ ] **TS-1**: Install `@radix-ui/react-slot` in `packages/ui`.

### Component Details

#### Button (`button.tsx`)
- **Variants**: default, destructive, outline, secondary, ghost, link.
- **Sizes**: default (h-10), sm (h-9), lg (h-11), icon (h-10).
- **Props**: `ButtonProps` extends `html.button` + `VariantProps` + `asChild`.

#### Badge (`badge.tsx`)
- **Variants**: default, secondary, destructive, outline.
- **Style**: `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold`.

#### Input (`input.tsx`)
- **Style**: `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm`.
- **Focus**: `ring-2 ring-ring ring-offset-2`.

#### Card (`card.tsx`)
- **Composites**: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter.
- **Styling**: `rounded-lg border bg-card text-card-foreground shadow-sm`.

### Verification
- **POC Page**: `apps/web/app/poc/design-system/page.tsx`
- **Criteria**: Visual check of all variants; Dark mode support; Type safety.

## 4. Test Design (Multi-Level)

### Level 1: Static Analysis (Type Check)
- **Goal**: Ensure Strict Type Safety.
- **Tool**: TypeScript (`tsc --noEmit`).
- **Scope**:
  - Verify `VariantProps` correctly constrains accepted props.
  - Verify `asChild` prop implies polymorphic behavior type compatibility.
  - Verify strict export types from `index.ts`.

### Level 2: Component Implementation Tests (Unit)
*Note: Since strictly configuring Vitest might be outside current scope, we define the requirements for future automation.*
- **Goal**: Functional correctness of logic (though mostly presentational).
- **Tool**: `vitest` + `@testing-library/react` (Proposed).
- **Cases**:
  - `Button`:
    - Renders with default class.
    - Applies `variant` classes (e.g. `bg-destructive`).
    - Fires `onClick` event.
    - `asChild` renders underlying element (e.g. `<a href>`).
    - `disabled` attribute prevents interaction.
  - `Input`:
    - Renders correctly.
    - Handles `disabled` state.
    - Forwards refs (critical for React Hook Form).
  - `Badge`:
    - Renders correct variant text colors.

### Level 3: Visual Verification (Manual/POC)
- **Goal**: Design fidelity and browser rendering.
- **Tool**: `/poc/design-system` page.
- **Checklist**:
  - [ ] **Responsiveness**: Card layout adapts to mobile/desktop.
  - [ ] **State Feedback**: Button Hover, Active, Focus states visible.
  - [ ] **Theme Consistency**: Dark Mode toggle (if active) works or system preference respected.
  - [ ] **Icon Alignment**: Icons inside Buttons are centered and sized correctly.

### Level 4: Consumer Integration
- **Goal**: Verify export pathways.
- **Action**: Import components in `apps/web` (done via POC page).
- **Check**: No "Module not found" or ESM/CJS interop issues.

---

## 8. Component Integration Analysis

> 本节由后续分析补充，记录将已创建组件应用到现有功能的影响分析。

### 8.1 Hardcoded Patterns Summary

| Pattern Type | Count | Example Classes |
|:-------------|:-----:|:----------------|
| Hardcoded Blue Colors | 70+ | `bg-blue-500`, `bg-blue-600`, `text-blue-600`, `hover:bg-blue-700` |
| Button-like Styles | 30+ | `px-4 py-2 ... rounded-md ... transition-colors` |
| Badge-like Styles | 9+ | `px-2 py-1 rounded text-xs font-medium bg-*-100 text-*-700` |

### 8.2 High-Priority Migration Files

| Component | Priority | Button Count | Badge Count | Complexity |
|:----------|:--------:|:------------:|:-----------:|:----------:|
| `components/PropertyPanel/TaskDispatchSection.tsx` | P0 | 3 | 1 | Low |
| `components/PropertyPanel/ApprovalStatusPanel.tsx` | P0 | 9+ | 5 | Medium |
| `components/PropertyPanel/RejectReasonDialog.tsx` | P1 | 2 | 0 | Low |
| `components/PropertyPanel/WorkflowConfigDialog.tsx` | P1 | 3 | 0 | Low |
| `components/PropertyPanel/DataPreviewDialog.tsx` | P2 | 2 | 1 | Low |
| `components/PropertyPanel/PBSForm.tsx` | P2 | 3 | 2 | Medium |
| `components/PropertyPanel/DataForm.tsx` | P2 | 1 | 1 | Low |

### 8.3 Component Variant Mapping

#### Button Variant Mapping

| Hardcoded Pattern | Button Variant | Notes |
|:------------------|:---------------|:------|
| `bg-blue-600 hover:bg-blue-700` | `variant="default"` | Primary action |
| `bg-red-600 hover:bg-red-700` | `variant="destructive"` | Danger/Reject action |
| `bg-green-600 hover:bg-green-700` | `variant="default"` + custom green class | Success/Accept action |
| `border border-gray-300 hover:bg-gray-50` | `variant="outline"` | Secondary action |
| `text-gray-600 hover:text-gray-800` | `variant="ghost"` | Tertiary action |

#### Badge Variant Mapping (需扩展)

| Hardcoded Pattern | Badge Variant | Status |
|:------------------|:--------------|:-------|
| `bg-green-100 text-green-700` | `variant="success"` | **需新增** |
| `bg-yellow-100 text-yellow-700` | `variant="warning"` | **需新增** |
| `bg-red-100 text-red-700` | `variant="destructive"` | 已存在 |
| `bg-blue-100 text-blue-700` | `variant="info"` | **需新增** |
| `bg-gray-100 text-gray-600` | `variant="secondary"` | 已存在 |

---

## 9. Integration Tasks

### 9.0 Badge Variant Extension (前置任务)

> **决策**: 扩展 Badge 组件以支持语义化状态变体。

- [ ] **Task 9.0.1**: 扩展 `badge.tsx` 变体定义
  - 在 `badgeVariants` 中添加 `success`, `warning`, `info` 变体
  - 更新 `BadgeProps` 类型定义
  - 文件: `packages/ui/src/badge.tsx`

```typescript
// 新增变体定义
success: 'border-green-200 bg-green-100 text-green-700',
warning: 'border-yellow-200 bg-yellow-100 text-yellow-700',
info: 'border-blue-200 bg-blue-100 text-blue-700',
```

- [ ] **Task 9.0.2**: 更新 POC 验证页面
  - 添加新变体展示
  - 文件: `apps/web/app/poc/design-system/page.tsx`

### 9.1 P0: Core Workflow Components

- [ ] **Task 9.1.1**: 迁移 `TaskDispatchSection.tsx`
  - 替换 3 个 `<button>` 为 `<Button>`
  - 替换 1 个状态 Badge
  - **Before**:
    ```tsx
    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium">
    ```
  - **After**:
    ```tsx
    import { Button } from '@cdm/ui';
    <Button className="w-full" disabled={isSubmitting}>...</Button>
    ```

- [ ] **Task 9.1.2**: 迁移 `ApprovalStatusPanel.tsx`
  - 替换 9+ 个按钮元素
  - 替换 5 个状态 Badge（`getStatusBadge` 函数返回值）
  - 注意: 需保持 `StepIcon` 组件的圆形样式不变（非 Badge 语义）

### 9.2 P1: Dialog Components

- [ ] **Task 9.2.1**: 迁移 `RejectReasonDialog.tsx`
  - 替换 2 个按钮（取消 + 确认驳回）

- [ ] **Task 9.2.2**: 迁移 `WorkflowConfigDialog.tsx`
  - 替换配置按钮、取消按钮、确认按钮

### 9.3 P2: Property Panel Forms

- [ ] **Task 9.3.1**: 迁移 `DataPreviewDialog.tsx`
  - 替换关闭/下载按钮
  - 替换数据类型 Badge

- [ ] **Task 9.3.2**: 迁移 `PBSForm.tsx`
  - 替换"添加指标"、"常用指标"按钮
  - 替换产品关联 Badge

- [ ] **Task 9.3.3**: 迁移 `DataForm.tsx`
  - 替换预览按钮
  - 替换数据格式 Badge

---

## 10. Extended Verification Plan

### 10.1 Migration Verification Checklist

| File | Build ✓ | Type ✓ | Visual ✓ | Functional ✓ |
|:-----|:-------:|:------:|:--------:|:------------:|
| `TaskDispatchSection.tsx` | [ ] | [ ] | [ ] | [ ] |
| `ApprovalStatusPanel.tsx` | [ ] | [ ] | [ ] | [ ] |
| `RejectReasonDialog.tsx` | [ ] | [ ] | [ ] | [ ] |
| `WorkflowConfigDialog.tsx` | [ ] | [ ] | [ ] | [ ] |
| `DataPreviewDialog.tsx` | [ ] | [ ] | [ ] | [ ] |
| `PBSForm.tsx` | [ ] | [ ] | [ ] | [ ] |
| `DataForm.tsx` | [ ] | [ ] | [ ] | [ ] |

### 10.2 Regression Testing

- **Existing Tests**: 运行 `pnpm test` 确保现有测试（如 `PBSForm.test.tsx`）通过
- **E2E Tests**: 运行 `pnpm test:e2e` 确保端到端流程正常

### 10.3 Dark Mode Verification

每个迁移文件需在深色模式下验证：
1. Button hover/active 状态颜色
2. Badge 对比度
3. Input focus ring 可见性

