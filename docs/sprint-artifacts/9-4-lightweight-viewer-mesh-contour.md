# Story 9.4: 轻量化预览器 - 网格与云图 (Lightweight Viewer - Mesh & Contour)

Status: ready-for-dev
Tech-Spec: [tech-spec-9-4-lightweight-viewer-mesh-contour.md](./tech-spec-9-4-lightweight-viewer-mesh-contour.md)

## Story

As a **仿真工程师**,
I want **预览网格模型和仿真云图结果**,
so that **快速检查仿真数据无需启动重型软件。**

## Problem Statement

Story 9.3 已实现基于 Online3DViewer 的 STEP/glTF 等 CAD 格式预览器。但仿真工程师经常需要查看网格模型（STL/OBJ）和仿真云图结果（VTK/标量场 JSON），当前系统无法展示带颜色映射的标量场数据——这些是仿真验证阶段的核心资产。

本 Story 将扩展现有 industrial-viewer 模块，增强 Online3DViewer 对网格的渲染模式支持，并新增基于 VTK.js 的云图预览器组件。

---

## Scope

**In Scope:**
- ✅ 网格文件预览（STL/OBJ）+ 线框/实体渲染模式切换
- ✅ 云图文件预览 - 多格式支持:
  - `.vtp` (XML PolyData)
  - `.vtk` (Legacy VTK)
  - `.vtu` (XML Unstructured)
  - `.vti` (XML ImageData)
  - JSON 标量场 (自定义格式)
- ✅ 色标切换（Rainbow, Jet, Coolwarm）
- ✅ 色标范围调整
- ✅ 复用 Story 9.3 的 ModelViewerModal 框架
- ✅ **前置重构**: 拆分超限文件 + 添加 Select 组件

**Out of Scope:**
- ❌ 大型网格分块加载（后续优化）
- ❌ 时序云图动画播放
- ❌ 云图切片/剖面功能

**开发说明:**
- ⚠️ 依赖 Story 9.3 完成的 `industrial-viewer` 模块
- ✅ 可复用 `ModelViewerModal` UI 框架和 `useOnline3DViewer` hook 模式

---

## Acceptance Criteria

1. **AC1: 网格预览**
   - **Given** 数据列表中有网格文件（STL/OBJ）
   - **When** 双击预览
   - **Then** 在模态框中显示 3D 网格预览
   - **And** 模型自动居中并适应视口

2. **AC2: 网格渲染模式**
   - **Given** 网格预览器已打开
   - **When** 点击渲染模式切换按钮
   - **Then** 可在线框/实体模式之间切换
   - **And** 切换平滑无闪烁

3. **AC3: 云图预览**
   - **Given** 数据列表中有云图文件（.vtk/.vtu/.vti/.vtp 或 JSON 标量场）
   - **When** 双击预览
   - **Then** 在模态框中显示带颜色映射的云图

4. **AC4: 色标切换**
   - **Given** 云图预览器已打开
   - **Then** 工具栏显示色标选择器
   - **When** 选择不同色标（Rainbow/Jet/Coolwarm）
   - **Then** 云图颜色映射立即更新

5. **AC5: 色标范围调整**
   - **Given** 云图预览器已打开
   - **Then** 显示色标范围输入（Min/Max）
   - **When** 修改范围值
   - **Then** 颜色映射基于新范围重新计算

---

## 🎨 UI Design Specification

### 1. 网格预览器界面

**复用 Story 9.3 的 ModelViewerModal 布局**，工具栏增加渲染模式按钮：

- **Toolbar Extension**:
  - 新增 Wireframe/Solid 切换按钮
  - 图标：`Grid3X3` (线框) / `Box` (实体) from Lucide
  - 位置：在现有边线开关旁

### 2. 云图预览器界面

**Modal Container**: 复用 ModelViewerModal 样式

- **Colorbar Panel** (右侧):
  - **Position**: `absolute right-4 top-1/2 -translate-y-1/2`
  - **Width**: `w-16`
  - **Gradient**: CSS linear-gradient 根据色标动态生成
  - **Labels**: `text-xs text-gray-600` 显示 Min/Max 值

- **Toolbar Extension**:
  - **色标选择器**: Dropdown / SegmentedControl
    - Options: `Rainbow`, `Jet`, `Coolwarm`
  - **范围输入**:
    - `Input` (number) for Min/Max
    - `@cdm/ui` Input 组件

---

## Tasks / Subtasks

### Phase 0: 前置重构与依赖安装 ⚠️

> **关键前置**: 以下重构任务必须在添加新功能前完成，以遵守 300 行限制规范。

- [ ] Task 0.1: 拆分 `useOnline3DViewer.ts` (当前 355 行 → 目标 <300 行) (AC: GR-2)
  - [ ] 0.1.1 拆分为 `useOnline3DViewer.ts` (核心) + `useViewerEnhancement.ts` (PBR 增强)
  - [ ] 0.1.2 提取 PBR 环境光逻辑到独立 hook

- [ ] Task 0.2: 拆分 `DataLibraryDrawer.tsx` (当前 319 行 → 目标 <300 行) (AC: GR-2)
  - [ ] 0.2.1 提取预览状态管理到独立 hook 或子组件
  - [ ] 0.2.2 为 ContourViewerModal 集成预留空间

- [ ] Task 0.3: 在 `@cdm/ui` 添加 Select 组件 (AC: GR-3)
  - [ ] 0.3.1 创建 `packages/ui/src/select.tsx`
  - [ ] 0.3.2 实现变体: default, outline
  - [ ] 0.3.3 导出并更新 index.ts

- [ ] Task 0.4: 安装 VTK.js 依赖
  - [ ] 0.4.1 安装 `vtk.js` 到 `apps/web`
  - [ ] 0.4.2 检查 TypeScript 类型支持
  - [ ] 0.4.3 确认 Next.js SSR 兼容性 (需要 `dynamic` import)

- [ ] Task 0.5: 确认前序 Story 状态
  - [ ] 0.5.1 **确认 Story 9.3 状态为 `done` 或 `review`** (industrial-viewer 模块可用)

### Phase 1: 网格渲染增强 (AC: #1, #2)

- [ ] Task 1.1: 扩展 useOnline3DViewer Hook
  - [ ] 1.1.1 在 `useOnline3DViewer.ts` 中添加 `renderMode: 'solid' | 'wireframe'` 参数
  - [ ] 1.1.2 实现 `toggleRenderMode()` 方法
  - [ ] 1.1.3 在渲染设置中使用 `OV.ShadingType` 控制

- [ ] Task 1.2: 更新 ViewerToolbar
  - [ ] 1.2.1 在 `ViewerToolbar.tsx` 添加渲染模式切换按钮
  - [ ] 1.2.2 使用 `@cdm/ui` Button 组件
  - [ ] 1.2.3 添加 Lucide 图标 (`Grid3X3`, `Box`)

### Phase 2: 云图预览器开发 (AC: #3, #4, #5)

- [ ] Task 2.1: 创建云图 Viewer Hook
  - [ ] 2.1.1 创建 `apps/web/features/industrial-viewer/hooks/useContourViewer.ts`
  - [ ] 2.1.2 封装 VTK.js 渲染管线初始化
  - [ ] 2.1.3 实现 VTP/VTK 文件加载
  - [ ] 2.1.4 实现 JSON 标量场解析和渲染
  - [ ] 2.1.5 返回 `{ containerRef, isLoading, error, setColorMap, setRange }`
  - [ ] 2.1.6 **控制文件行数 ≤ 150 LOC**

- [ ] Task 2.2: 创建云图组件
  - [ ] 2.2.1 创建 `apps/web/features/industrial-viewer/components/ContourViewer.tsx`
  - [ ] 2.2.2 集成 useContourViewer hook
  - [ ] 2.2.3 添加 `'use client'` 指令 + Next.js dynamic import (ssr: false)
  - [ ] 2.2.4 **控制文件行数 ≤ 120 LOC**

- [ ] Task 2.3: 创建色标控制组件
  - [ ] 2.3.1 创建 `apps/web/features/industrial-viewer/components/ColorScaleControl.tsx`
  - [ ] 2.3.2 实现色标选择 Dropdown (Rainbow/Jet/Coolwarm)
  - [ ] 2.3.3 实现 Min/Max 范围输入
  - [ ] 2.3.4 使用 `@cdm/ui` 组件
  - [ ] 2.3.5 **控制文件行数 ≤ 100 LOC**

- [ ] Task 2.4: 创建色标条组件
  - [ ] 2.4.1 创建 `apps/web/features/industrial-viewer/components/ColorBar.tsx`
  - [ ] 2.4.2 实现渐变色条渲染 (CSS gradient / Canvas)
  - [ ] 2.4.3 显示 Min/Max 标签

- [ ] Task 2.5: 创建云图预览模态框
  - [ ] 2.5.1 创建 `apps/web/features/industrial-viewer/components/ContourViewerModal.tsx`
  - [ ] 2.5.2 集成 ContourViewer + ColorScaleControl + ColorBar
  - [ ] 2.5.3 复用 ModelViewerModal 的样式和交互模式
  - [ ] 2.5.4 **控制文件行数 ≤ 120 LOC**

### Phase 3: 集成到数据资源库 (AC: #1, #3)

- [ ] Task 3.1: 扩展 AssetCard 预览逻辑
  - [ ] 3.1.1 修改 `AssetCard.tsx` 识别 VTK/JSON 云图格式
  - [ ] 3.1.2 根据格式类型选择 ModelViewerModal 或 ContourViewerModal

- [ ] Task 3.2: 更新 DataLibraryDrawer
  - [ ] 3.2.1 使用 `next/dynamic` 懒加载 `ContourViewerModal`
  - [ ] 3.2.2 添加 previewType 状态区分网格和云图

### Phase 4: 测试与验证 (All ACs)

- [ ] Task 4.1: 创建测试数据
  - [ ] 4.1.1 准备示例 STL 网格文件
  - [ ] 4.1.2 准备示例 VTK 云图文件
  - [ ] 4.1.3 准备示例 JSON 标量场文件 (简化格式)

- [ ] Task 4.2: 单元测试
  - [ ] 4.2.1 创建 `apps/web/features/industrial-viewer/__tests__/ContourViewer.test.tsx`
  - [ ] 4.2.2 创建 `apps/web/features/industrial-viewer/__tests__/ColorScaleControl.test.tsx`

- [ ] Task 4.3: E2E 测试
  - [ ] 4.3.1 扩展 `apps/web/e2e/model-viewer.spec.ts` 添加网格渲染模式测试
  - [ ] 4.3.2 创建云图预览测试用例

---

## 🛡️ 工程规范护栏 (Engineering Guardrails)

### GR-1: Hook-First 模式 (Frontend)

**规则**: 所有 VTK.js 逻辑必须封装在 hooks 中。

```typescript
// ✅ 正确：hook 封装 VTK 渲染管线
const { containerRef, isLoading, setColorMap, setRange } = useContourViewer({
  dataUrl: assetUrl,
  colorMap: 'jet',
});

// ❌ 禁止：组件内直接操作 VTK renderWindow
const mapper = vtkMapper.newInstance();
```

**来源**: `project-context.md:84-86`

---

### GR-2: 文件大小限制

**规则**: 单个文件不得超过 **300 行**。

| 文件                     | 预估行数 | 状态 |
| ------------------------ | -------- | ---- |
| `useContourViewer.ts`    | ~150 LOC | ✅    |
| `ContourViewer.tsx`      | ~120 LOC | ✅    |
| `ColorScaleControl.tsx`  | ~100 LOC | ✅    |
| `ColorBar.tsx`           | ~60 LOC  | ✅    |
| `ContourViewerModal.tsx` | ~120 LOC | ✅    |

**来源**: `project-context.md:93`

---

### GR-3: UI 组件来源

**规则**: 基础 UI 元素必须来自 `packages/ui`。

```typescript
// ✅ 正确：使用共享 UI 库
import { Button, Input, cn } from '@cdm/ui';

// ❌ 禁止：手写基础组件
<button className="px-4 py-2 bg-blue-500...">
```

**来源**: `architecture.md:655-656`

---

### GR-4: Next.js SSR 兼容

**规则**: VTK.js 只能在浏览器运行，必须禁用 SSR。

```typescript
// ✅ 正确：使用 dynamic import 禁用 SSR
const ContourViewer = dynamic(
  () => import('./ContourViewer').then(mod => mod.ContourViewer),
  { ssr: false, loading: () => <LoadingSpinner /> }
);

// 组件内使用 'use client' 指令
'use client';
```

---

### GR-5: 代码审查清单

PR 提交前必须自检：

- [ ] 新文件是否超过 300 行？
- [ ] UI 元素是否使用 `packages/ui` 中的组件？
- [ ] Hook 是否正确处理 error 和 loading 状态？
- [ ] 是否使用 `next/dynamic` 懒加载且禁用 SSR？
- [ ] 色标渲染是否支持三种预设色标？
- [ ] 是否添加了 `data-testid` 便于测试？

---

## Dev Notes

### 技术决策 (Technical Decisions)

| 决策点       | 选择                      | 理由                                  |
| ------------ | ------------------------- | ------------------------------------- |
| **网格引擎** | Online3DViewer            | 复用 Story 9.3 已集成的引擎           |
| **云图引擎** | VTK.js                    | 专业仿真数据可视化，支持标量场着色    |
| 色标实现     | VTK ColorTransferFunction | 标准科学可视化色标                    |
| 文件格式     | VTK + JSON                | VTK 原生格式 + 简化 JSON 格式便于调试 |

### VTK.js 关键 API Reference

```typescript
import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow';
import vtkXMLPolyDataReader from 'vtk.js/Sources/IO/XML/XMLPolyDataReader';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';

// 初始化渲染窗口
const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
  container: containerElement,
});

// 加载 VTP 数据
const reader = vtkXMLPolyDataReader.newInstance();
reader.setUrl(dataUrl);

// 设置色标
const lut = vtkColorTransferFunction.newInstance();
lut.setColorSpaceToRGB();
// Rainbow 色标
lut.addRGBPoint(0.0, 0.0, 0.0, 1.0);  // Blue
lut.addRGBPoint(0.25, 0.0, 1.0, 1.0); // Cyan
lut.addRGBPoint(0.5, 0.0, 1.0, 0.0);  // Green
lut.addRGBPoint(0.75, 1.0, 1.0, 0.0); // Yellow
lut.addRGBPoint(1.0, 1.0, 0.0, 0.0);  // Red

// 映射器配置
const mapper = vtkMapper.newInstance();
mapper.setInputConnection(reader.getOutputPort());
mapper.setLookupTable(lut);
mapper.setScalarRange(minValue, maxValue);
```

### JSON 标量场格式设计 (简化格式)

```json
{
  "format": "scalar-field-json",
  "version": "1.0",
  "geometry": {
    "points": [[x, y, z], ...],
    "cells": [[n, i0, i1, i2, ...], ...]
  },
  "scalars": {
    "name": "Temperature",
    "unit": "°C",
    "values": [v0, v1, v2, ...]
  }
}
```

### 📁 项目结构落点

```text
apps/web/features/industrial-viewer/
├── components/
│   ├── ModelViewer.tsx            # [EXISTING] Story 9.3
│   ├── ModelViewerModal.tsx       # [EXISTING] Story 9.3
│   ├── ModelStructureTree.tsx     # [EXISTING] Story 9.3
│   ├── ViewerToolbar.tsx          # [MODIFY] 添加渲染模式切换
│   ├── ContourViewer.tsx          # [NEW] 云图预览核心组件
│   ├── ContourViewerModal.tsx     # [NEW] 云图预览模态框
│   ├── ColorScaleControl.tsx      # [NEW] 色标控制组件
│   └── ColorBar.tsx               # [NEW] 色标条组件
├── hooks/
│   ├── useOnline3DViewer.ts       # [MODIFY] 添加渲染模式支持
│   └── useContourViewer.ts        # [NEW] VTK.js wrapper
├── constants/
│   └── colorMaps.ts               # [NEW] 预设色标定义
├── types/
│   └── index.ts                   # [MODIFY] 添加云图相关类型
├── __tests__/
│   ├── ContourViewer.test.tsx     # [NEW]
│   └── ColorScaleControl.test.tsx # [NEW]
└── index.ts                       # [MODIFY] 导出新组件

apps/web/features/data-library/
├── components/
│   ├── AssetCard.tsx              # [MODIFY] 识别 VTK/JSON 格式
│   └── DataLibraryDrawer.tsx      # [MODIFY] 集成 ContourViewerModal
```

### 前序 Story 完成情况

| Story                     | 状态   | 关联                             |
| ------------------------- | ------ | -------------------------------- |
| **9.1 数据资源库 Drawer** | done   | 资产列表触发预览                 |
| **9.2 多维度组织视图**    | review | 组织视图中触发预览               |
| **9.3 STEP/glTF 预览器**  | review | 复用 ModelViewerModal, hook 模式 |

### 依赖

| 依赖               | 版本    | 用途                                |
| ------------------ | ------- | ----------------------------------- |
| `online-3d-viewer` | ^0.12.x | 网格预览 (复用 Story 9.3)           |
| `vtk.js`           | ^30.x   | 云图预览引擎                        |
| `lucide-react`     | -       | 图标 (Grid3X3, Box)                 |
| `@cdm/ui`          | -       | Button, Input, Select, cn() utility |

### Mock 数据 (卫星领域)

基于 Story 9.1 已 seed 的资产，新增：
- **帆板网格模型.stl** (格式: MESH/STL)
- **热控系统温度场.vtp** (格式: CONTOUR/VTK)
- **结构应力分析.json** (格式: CONTOUR/JSON)

### 🔗 References

- [Source: docs/epics.md#Story-9.4] 原始需求
- [Source: docs/architecture.md#L823-833] industrial-viewer 组件架构
- [Source: docs/sprint-artifacts/9-3-lightweight-viewer-step-gltf.md] 前序 Story 实现
- [VTK.js Documentation](https://kitware.github.io/vtk-js/)
- [VTK.js Examples](https://kitware.github.io/vtk-js/examples/)

---

## Testing Requirements

### E2E 测试 (`apps/web/e2e/model-viewer.spec.ts` 扩展)

```typescript
test.describe('Mesh & Contour Viewer', () => {
  // === AC1: 网格预览 ===
  
  test('AC1.1: opens mesh viewer for STL file', async ({ page }) => {
    await page.goto('/graph/test-id');
    await page.keyboard.press('Meta+d'); // Open Data Library
    await page.locator('[data-testid="asset-card"][data-format="stl"]').first().dblclick();
    await expect(page.locator('[data-testid="model-viewer-modal"]')).toBeVisible();
  });
  
  // === AC2: 渲染模式 ===
  
  test('AC2.1: toggles wireframe mode', async ({ page }) => {
    const renderModeBtn = page.locator('[data-testid="render-mode-toggle"]');
    await renderModeBtn.click();
    await expect(renderModeBtn).toHaveAttribute('data-mode', 'wireframe');
  });
  
  // === AC3: 云图预览 ===
  
  test('AC3.1: opens contour viewer for VTK file', async ({ page }) => {
    await page.locator('[data-testid="asset-card"][data-format="vtk"]').first().dblclick();
    await expect(page.locator('[data-testid="contour-viewer-modal"]')).toBeVisible();
  });
  
  // === AC4: 色标切换 ===
  
  test('AC4.1: changes color map', async ({ page }) => {
    const colorMapSelect = page.locator('[data-testid="colormap-select"]');
    await colorMapSelect.selectOption('jet');
    await expect(colorMapSelect).toHaveValue('jet');
  });
  
  // === AC5: 色标范围 ===
  
  test('AC5.1: adjusts scalar range', async ({ page }) => {
    const minInput = page.locator('[data-testid="scalar-min"]');
    const maxInput = page.locator('[data-testid="scalar-max"]');
    await minInput.fill('0');
    await maxInput.fill('100');
    await expect(minInput).toHaveValue('0');
    await expect(maxInput).toHaveValue('100');
  });
});
```

### 组件单元测试

```typescript
// apps/web/features/industrial-viewer/__tests__/ContourViewer.test.tsx
describe('ContourViewer', () => {
  it('AC3: renders viewer container', () => {
    render(<ContourViewer dataUrl="/test.vtp" />);
    expect(screen.getByTestId('contour-viewer-container')).toBeInTheDocument();
  });
  
  it('AC4: shows loading state initially', () => {
    render(<ContourViewer dataUrl="/test.vtp" />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});

// apps/web/features/industrial-viewer/__tests__/ColorScaleControl.test.tsx
describe('ColorScaleControl', () => {
  it('AC4: renders color map selector', () => {
    render(<ColorScaleControl onColorMapChange={vi.fn()} onRangeChange={vi.fn()} />);
    expect(screen.getByTestId('colormap-select')).toBeInTheDocument();
  });
  
  it('AC5: renders min/max inputs', () => {
    render(<ColorScaleControl onColorMapChange={vi.fn()} onRangeChange={vi.fn()} />);
    expect(screen.getByTestId('scalar-min')).toBeInTheDocument();
    expect(screen.getByTestId('scalar-max')).toBeInTheDocument();
  });
});
```

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
