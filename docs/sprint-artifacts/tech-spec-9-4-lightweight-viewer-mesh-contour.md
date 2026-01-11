# Tech-Spec: Story 9.4 轻量化预览器 - 网格与云图 (Mesh & Contour Viewer)

**Created:** 2026-01-11
**Status:** Ready for Development

---

## Overview

### Problem Statement

Story 9.3 已实现基于 Online3DViewer 的 STEP/glTF 等 CAD 格式预览器。但仿真工程师经常需要查看：
1. **网格模型** (STL/OBJ) 的线框/实体渲染切换
2. **仿真云图** (VTK/标量场 JSON) 的颜色映射可视化

当前系统无法展示带颜色映射的标量场数据，这些是仿真验证阶段的核心资产。

### Solution

扩展现有 `industrial-viewer` 模块：
1. **网格增强**: 在 `useOnline3DViewer` 中添加渲染模式 (Solid/Wireframe) 控制
2. **云图预览器**: 新增基于 **VTK.js** 的标量场可视化组件

### User Interface Design
> For high-fidelity UI mockups, see [Story 9.4 UI Design Spec](./9-4-lightweight-viewer-mesh-contour.md#-ui-design-specification).

### Scope

**In Scope:**
- 网格渲染模式切换 (Solid/Wireframe)
- VTK.js 云图预览器
- 色标切换 (Rainbow/Jet/Coolwarm)
- 色标范围调整 (Min/Max)

**Out of Scope:**
- 大型网格分块加载优化
- 时序云图动画播放
- 云图切片/剖面功能

---

## Context for Development

### Codebase Patterns (Story 9.3 已建立)

| Pattern                      | 位置                         | 说明                            |
| ---------------------------- | ---------------------------- | ------------------------------- |
| **Hook-First**               | `hooks/useOnline3DViewer.ts` | 所有 3D 引擎逻辑封装在 hooks    |
| **'use client' + ssr:false** | 所有组件                     | Next.js dynamic import 禁用 SSR |
| **@cdm/ui 组件**             | `ViewerToolbar.tsx`          | 使用 Button, Switch 等共享组件  |
| **data-testid**              | 全部组件                     | E2E 测试定位器                  |
| **模态框 Portal**            | `ModelViewerModal.tsx`       | createPortal 渲染               |

### Files to Reference

```text
# 核心扩展点
apps/web/features/industrial-viewer/hooks/useOnline3DViewer.ts    # 添加 renderMode
apps/web/features/industrial-viewer/components/ViewerToolbar.tsx  # 添加模式切换按钮

# 模式参考
apps/web/features/industrial-viewer/components/ModelViewerModal.tsx  # 复用布局
apps/web/features/industrial-viewer/components/ModelViewer.tsx       # 组件结构参考

# 集成点
apps/web/features/data-library/components/AssetCard.tsx           # 格式识别
apps/web/features/data-library/components/DataLibraryDrawer.tsx   # 模态框集成
```

### Technical Decisions

| 决策         | 选择                     | 理由                           |
| ------------ | ------------------------ | ------------------------------ |
| 网格渲染模式 | OV.ShadingType           | Online3DViewer 内置，API 简单  |
| 云图引擎     | **VTK.js**               | 专业仿真可视化，支持标量场着色 |
| 色标         | vtkColorTransferFunction | 标准科学可视化色标             |
| 云图格式     | VTP + JSON               | VTK 原生 + 简化格式便于调试    |

### Existing Hook Analysis (useOnline3DViewer.ts)

**当前状态**: 353 行 (超过 300 行限制！)

**已有 API**:
```typescript
interface UseOnline3DViewerResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  error: Error | null;
  model: Model | null;
  edgesEnabled: boolean;
  toggleEdges: () => void;
  resetView: () => void;
  highlightNode: (nodeId: number) => void;
  clearHighlight: () => void;
}
```

**需要添加**:
```typescript
// 扩展：渲染模式
renderMode: 'solid' | 'wireframe';
setRenderMode: (mode: 'solid' | 'wireframe') => void;
```

---

## Implementation Plan

### File Structure (新增/修改)

```text
apps/web/features/industrial-viewer/
├── components/
│   ├── ViewerToolbar.tsx          # [MODIFY] +渲染模式按钮
│   ├── ContourViewer.tsx          # [NEW] 云图预览核心 (~120 LOC)
│   ├── ContourViewerModal.tsx     # [NEW] 云图模态框 (~120 LOC)
│   ├── ColorScaleControl.tsx      # [NEW] 色标控制 (~100 LOC)
│   └── ColorBar.tsx               # [NEW] 色标条 (~60 LOC)
├── hooks/
│   ├── useOnline3DViewer.ts       # [MODIFY] +renderMode
│   └── useContourViewer.ts        # [NEW] VTK.js wrapper (~150 LOC)
├── constants/
│   └── colorMaps.ts               # [NEW] 预设色标定义
└── index.ts                       # [MODIFY] 导出新组件
```

### Tasks

#### Phase 0: 前置重构与依赖安装

> ⚠️ **关键前置**: 以下重构任务必须在添加新功能前完成，以遵守 300 行限制规范。

- [ ] **Task 0.1**: 拆分 `useOnline3DViewer.ts` (当前 355 行 → 目标 <300 行)
  - 拆分为 `useOnline3DViewer.ts` (核心) + `useViewerEnhancement.ts` (PBR 增强)
  - 提取 PBR 环境光逻辑 (Line 137-194) 到独立 hook

- [ ] **Task 0.2**: 拆分 `DataLibraryDrawer.tsx` (当前 319 行 → 目标 <300 行)
  - 提取预览状态管理到独立 hook 或子组件
  - 为 ContourViewerModal 集成预留空间

- [ ] **Task 0.3**: 在 `@cdm/ui` 添加 Select 组件
  - 创建 `packages/ui/src/select.tsx`
  - 变体: default, outline
  - 用于色标选择器

- [ ] **Task 0.4**: 安装 VTK.js
  ```bash
  cd apps/web && pnpm add vtk.js
  ```
- [ ] **Task 0.5**: 检查 TypeScript 类型（VTK.js 自带类型）

#### Phase 1: 网格渲染模式扩展 (AC1, AC2)
- [ ] **Task 1.1**: 修改 `useOnline3DViewer.ts`
  - 添加 `renderMode` 状态
  - 实现 `setRenderMode()` 使用 `OV.ShadingType.Phong` (solid) / `OV.ShadingType.Lines` (wireframe)
  - 返回新接口

- [ ] **Task 1.2**: 修改 `ViewerToolbar.tsx`
  - 添加渲染模式切换按钮 (Grid3X3/Box 图标)
  - 使用 `@cdm/ui` Button 组件

#### Phase 2: VTK.js 云图预览器 (AC3, AC4, AC5)
- [ ] **Task 2.1**: 创建 `constants/colorMaps.ts`
  ```typescript
  export const COLOR_MAPS = {
    rainbow: [[0,0,1], [0,1,1], [0,1,0], [1,1,0], [1,0,0]],
    jet: [[0,0,0.5], [0,0,1], [0,1,1], ...],
    coolwarm: [[0.23,0.30,0.75], ..., [0.70,0.02,0.15]],
  };
  ```

- [ ] **Task 2.2**: 创建 `hooks/useContourViewer.ts`
  - 封装 VTK.js 渲染管线
  - 支持 VTK 多格式加载:
    - `.vtp` (XML PolyData) - vtkXMLPolyDataReader
    - `.vtk` (Legacy) - vtkGenericDataReader
    - `.vtu` (Unstructured) - vtkXMLUnstructuredGridReader  
    - `.vti` (ImageData) - vtkXMLImageDataReader
  - 支持 JSON 标量场格式 (自定义解析)
  - 返回 `{ containerRef, isLoading, error, colorMap, setColorMap, range, setRange }`

- [ ] **Task 2.3**: 创建 `components/ColorBar.tsx`
  - CSS gradient 渲染色条
  - 显示 Min/Max 标签

- [ ] **Task 2.4**: 创建 `components/ColorScaleControl.tsx`
  - 色标选择使用 `@cdm/ui` Select 组件 (Task 0.3 新增)
  - Min/Max 范围输入使用 `@cdm/ui` Input
  - Options: Rainbow, Jet, Coolwarm

- [ ] **Task 2.5**: 创建 `components/ContourViewer.tsx`
  - 集成 useContourViewer
  - 加载/错误状态 UI
  - `data-testid="contour-viewer-container"`

- [ ] **Task 2.6**: 创建 `components/ContourViewerModal.tsx`
  - 复用 ModelViewerModal 布局模式
  - 集成 ContourViewer + ColorScaleControl + ColorBar

#### Phase 3: 集成
- [ ] **Task 3.1**: 修改 `AssetCard.tsx`
  - 识别 VTK/JSON 云图格式
  - 设置正确的 previewType

- [ ] **Task 3.2**: 修改 `DataLibraryDrawer.tsx`
  - 懒加载 ContourViewerModal
  - 根据 previewType 选择模态框

#### Phase 4: 测试
- [ ] **Task 4.1**: 创建测试数据文件
  - `test-mesh.stl`
  - `test-contour.vtp`
  - `test-contour.json`

- [ ] **Task 4.2**: 单元测试
  - `ContourViewer.test.tsx`
  - `ColorScaleControl.test.tsx`

- [ ] **Task 4.3**: E2E 测试扩展
  - 网格渲染模式切换
  - 云图预览打开/色标切换

### Acceptance Criteria

- [ ] **AC1**: 双击 STL/OBJ 资产 → 模态框显示 3D 网格预览
- [ ] **AC2**: 点击渲染模式按钮 → 切换 线框/实体 显示
- [ ] **AC3**: 双击 VTK/JSON 云图 → 模态框显示带颜色映射的云图
- [ ] **AC4**: 选择不同色标 → 颜色映射立即更新
- [ ] **AC5**: 修改 Min/Max 范围 → 颜色重新映射

---

## Additional Context

### Dependencies

```json
{
  "vtk.js": "^30.0.0"
}
```

### VTK.js Key API (Multi-Format Support)

```typescript
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkXMLUnstructuredGridReader from '@kitware/vtk.js/IO/XML/XMLUnstructuredGridReader';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkGenericDataReader from '@kitware/vtk.js/IO/Misc/GenericDataReader'; // Legacy .vtk
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

// Format-specific readers
const READERS = {
  '.vtp': vtkXMLPolyDataReader,      // XML PolyData
  '.vtk': vtkGenericDataReader,       // Legacy VTK
  '.vtu': vtkXMLUnstructuredGridReader, // XML Unstructured
  '.vti': vtkXMLImageDataReader,      // XML ImageData
};

// 初始化
const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({ container });
const renderer = fullScreenRenderer.getRenderer();

// 根据扩展名选择 Reader
const ext = dataUrl.split('.').pop()?.toLowerCase();
const ReaderClass = READERS[`.${ext}`] || vtkXMLPolyDataReader;
const reader = ReaderClass.newInstance();
await reader.setUrl(dataUrl);

// 色标
const lut = vtkColorTransferFunction.newInstance();
lut.addRGBPoint(0.0, 0.0, 0.0, 1.0);  // Blue
lut.addRGBPoint(1.0, 1.0, 0.0, 0.0);  // Red

// 映射器
const mapper = vtkMapper.newInstance();
mapper.setInputConnection(reader.getOutputPort());
mapper.setLookupTable(lut);
mapper.setScalarRange(minValue, maxValue);
```

### JSON 标量场格式

```json
{
  "format": "scalar-field-json",
  "version": "1.0",
  "geometry": {
    "points": [[x, y, z], ...],
    "cells": [[numPoints, i0, i1, i2], ...]
  },
  "scalars": {
    "name": "Temperature",
    "unit": "°C",
    "values": [v0, v1, v2, ...]
  }
}
```

### Online3DViewer ShadingType API

```typescript
// 渲染模式切换
const innerViewer = embeddedViewer.GetViewer();
innerViewer.SetShadingType(OV.ShadingType.Phong);     // 实体
innerViewer.SetShadingType(OV.ShadingType.Lines);     // 线框
```

### Testing Strategy

| 类型      | 文件                          | 用例数 |
| --------- | ----------------------------- | ------ |
| Unit      | `useContourViewer.test.ts`    | 5      |
| Component | `ContourViewer.test.tsx`      | 4      |
| Component | `ColorScaleControl.test.tsx`  | 4      |
| E2E       | `model-viewer.spec.ts` (扩展) | 6      |

### Notes

1. **SSR 禁用**: VTK.js 必须使用 `next/dynamic({ ssr: false })`
2. **WebGL Context**: VTK.js 创建独立 WebGL context，注意内存管理
3. **Hook 行数**: `useOnline3DViewer.ts` 已超限 (353 行)，添加时注意
4. **色标默认值**: Rainbow 色标为默认

---

**推荐**: 在 fresh context 中运行 `dev-story` 进行实现。
