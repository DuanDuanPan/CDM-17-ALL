# Tech-Spec: Story 9.3 轻量化预览器 (Online3DViewer Integration)

**Created:** 2026-01-10
**Status:** Ready for Development

---

## Overview

### Problem Statement

数据资源库 (Story 9.1/9.2) 已支持浏览和管理 3D 模型资产，但用户无法在浏览器中直接预览 STEP/IGES/glTF 等工业格式文件。工程师需要下载文件并使用专业 CAD 软件才能查看模型，严重影响工作效率。

### Solution

使用 **Online3DViewer** 库（基于 three.js）实现浏览器端 3D 预览器：
- **原生支持 STEP/IGES** 格式（通过 occt-import-js WebAssembly）
- **无需服务端转换**，前端直接加载和渲染
- **开箱即用** 的交互控制和边线渲染

### User Interface Design
> For high-fidelity UI mockups and detailed frontend specifications, please refer to [Story 9.3 UI Design Specification](./9-3-lightweight-viewer-step-gltf.md#1-预览器模态框布局-main-view).

### Scope

**In Scope:**
- `online-3d-viewer` 依赖安装
- `useOnline3DViewer` hook 封装 EmbeddedViewer API
- `ModelViewer` 组件：加载/错误状态、边线切换
- `ModelStructureTree` 组件：模型层级结构树 (新增)
- `ModelViewerModal` 模态框：集成到 DataLibraryDrawer
- AssetCard 双击预览触发

**Out of Scope:**
- 模型测量工具
- 模型注释/标记
- 模型结构树面板（低优先级）
- 大模型分块加载优化

**开发说明:**
- 可与 Story 9.2 并行开发

---

## Context for Development

### Codebase Patterns

基于 Story 9.1/9.2 已建立的模式：

| Pattern               | 位置                        | 说明                               |
| --------------------- | --------------------------- | ---------------------------------- |
| **Hook-First**        | `hooks/useDataAssets.ts`    | 所有数据获取和状态管理封装在 hooks |
| **'use client' 指令** | 所有组件顶部                | Next.js App Router 客户端组件      |
| **Portal 渲染**       | `DataLibraryDrawer.tsx:224` | 模态框使用 `createPortal`          |
| **TailwindCSS 样式**  | 全部组件                    | 使用 utility classes               |
| **lucide-react 图标** | `AssetCard.tsx:8-16`        | 统一图标来源                       |
| **data-testid**       | 全部组件                    | E2E 测试定位器                     |

### Files to Reference

```text
# 集成点 - 需要修改
apps/web/features/data-library/components/AssetCard.tsx      # 添加 onPreview prop
apps/web/features/data-library/components/DataLibraryDrawer.tsx  # 集成 ModelViewerModal

# 模式参考
apps/web/features/data-library/hooks/useDataAssets.ts       # hook 结构参考
apps/web/features/data-library/components/AssetGrid.tsx     # 组件结构参考

# 类型定义
packages/types/src/data-library-types.ts                     # DataAssetFormat 枚举
```

### Technical Decisions

| 决策     | 选择                        | 理由                                |
| -------- | --------------------------- | ----------------------------------- |
| 3D 引擎  | **Online3DViewer**          | 原生 STEP/IGES 支持，代码量减少 70% |
| 加载策略 | `next/dynamic` (ssr: false) | WebGL 只能在浏览器运行              |
| 模态框   | 自定义 (Portal)             | 与 DataLibraryDrawer 模式一致       |
| 边线控制 | EdgeSettings API            | OV 内置，无需额外实现               |

---

## Implementation Plan

### File Structure (新增)

```text
apps/web/features/industrial-viewer/
├── components/
│   ├── ModelViewer.tsx          # 主预览器 (~120 LOC)
│   ├── ModelViewerModal.tsx     # 模态框 (~120 LOC)
│   ├── ModelStructureTree.tsx   # 模型结构树 (~150 LOC) [NEW]
│   └── ViewerToolbar.tsx        # 工具栏 (~60 LOC)
├── hooks/
│   └── useOnline3DViewer.ts     # EmbeddedViewer wrapper (~100 LOC)
├── types/
│   └── index.ts                 # 类型定义
└── index.ts                     # 模块导出
```

### Tasks

#### Phase 0: 依赖安装
- [ ] **Task 0.1**: 安装 `online-3d-viewer` 到 `apps/web`
  ```bash
  cd apps/web && pnpm add online-3d-viewer
  ```
- [ ] **Task 0.2**: 检查 TypeScript 类型支持，如需创建 `.d.ts`

#### Phase 1: Hook 开发
- [ ] **Task 1.1**: 创建 `useOnline3DViewer.ts`
  - 初始化 `OV.EmbeddedViewer`
  - 实现 `LoadModelFromUrlList` 加载
  - 返回 `{ containerRef, isLoading, error, toggleEdges, resetView }`
  - 实现 ResizeObserver 响应

#### Phase 2: 组件开发
- [ ] **Task 2.1**: 创建 `ModelViewer.tsx`
  - 集成 useOnline3DViewer
  - 加载状态：Spinner + "加载中..."
  - 错误状态：AlertTriangle + 错误信息 + 重试按钮
  - `data-testid="model-viewer-container"`

- [ ] **Task 2.2**: 创建 `ViewerToolbar.tsx`
  - 边线开关 (Switch)
  - Home 按钮（重置视角）
  - 全屏按钮

- [ ] **Task 2.3**: 创建 `ModelStructureTree.tsx` [NEW - AC5]
  - 从 Online3DViewer Model 对象提取结构层级
  - 点击节点高亮对应几何体
  - 展开/折叠交互
  - `data-testid="model-structure-tree"`

- [ ] **Task 2.4**: 创建 `ModelViewerModal.tsx`
  - Portal 渲染（参考 DataLibraryDrawer:224）
  - 布局：左侧结构树面板 (可折叠) + 右侧 3D 视图
  - ESC/backdrop 关闭
  - `data-testid="model-viewer-modal"`

#### Phase 3: 集成
- [ ] **Task 3.1**: 修改 `AssetCard.tsx`
  - 新增 `onPreview?: () => void` prop
  - 3D 格式显示预览图标按钮
  - 双击触发 onPreview

- [ ] **Task 3.2**: 修改 `DataLibraryDrawer.tsx`
  - 新增 `previewAsset` 状态
  - 使用 `next/dynamic` 懒加载 `ModelViewerModal`
  - 传递 asset URL 到模态框

#### Phase 4: 测试
- [ ] **Task 4.1**: 创建 `useOnline3DViewer.test.ts`
- [ ] **Task 4.2**: 创建 `ModelViewer.test.tsx`
- [ ] **Task 4.3**: 创建 `model-viewer.spec.ts` (E2E)

### Acceptance Criteria

- [ ] **AC1**: 双击 STEP/glTF 资产卡片 → 模态框打开 → 显示 3D 预览
- [ ] **AC2**: 支持鼠标旋转/缩放/平移 (OV 内置)
- [ ] **AC3**: 边线开关切换正常
- [ ] **AC4**: 加载中显示 Spinner，加载失败显示错误信息和重试按钮
- [ ] **AC5**: 装配体模型显示结构树，点击节点高亮几何体

---

## Additional Context

### Dependencies

```json
{
  "online-3d-viewer": "^0.12.0"
}
```

> 注意: online-3d-viewer 内部依赖 three.js，无需单独安装

### Supported Formats

```
Import: 3dm, 3ds, 3mf, amf, bim, brep, dae, fbx, fcstd, 
        gltf, ifc, iges, step, stl, obj, off, ply, wrl
```

### Key API Reference

```typescript
import * as OV from 'online-3d-viewer';

// 初始化
const viewer = new OV.EmbeddedViewer(containerElement, {
  backgroundColor: new OV.RGBAColor(245, 245, 245, 255),
  edgeSettings: new OV.EdgeSettings(true, new OV.RGBColor(0, 0, 0), 1),
});

// 加载
viewer.LoadModelFromUrlList([modelUrl]);

// 边线控制需要重新初始化 viewer
```

### Testing Strategy

| 类型      | 文件                          | 用例数 |
| --------- | ----------------------------- | ------ |
| Unit      | `useOnline3DViewer.test.ts`   | 5      |
| Component | `ModelViewer.test.tsx`        | 4      |
| Component | `ModelStructureTree.test.tsx` | 4      |
| E2E       | `model-viewer.spec.ts`        | 9      |

### Notes

1. **SSR 禁用**: 必须使用 `next/dynamic({ ssr: false })`
2. **WASM 加载**: 首次加载 STEP 文件时会下载 ~800KB WASM
3. **内存管理**: Online3DViewer 自动处理 cleanup
4. **Mock 数据**: Story 9.1 已 seed 卫星领域 3D 模型

---

**推荐**: 在 fresh context 中运行 `dev-story` 进行实现。
