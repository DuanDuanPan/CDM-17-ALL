# Story 9.10: 属性面板关联资产增强 (Property Panel Asset Binding Enhancement)

## 1. 背景与目标

### 1.1 背景
当前在属性面板（PropertyPanel）中关联资产的流程较为繁琐。用户点击"添加"按钮后，仅收到一个 Toast 提示，引导其手动去数据资源库操作。这导致用户必须中断当前心流，手动切换视图、寻找节点、搜索资产，体验断裂且效率低下。

### 1.2 目标
优化从属性面板关联资产的体验，实现"一键直达、沉浸式绑定"。
- **一键直达**：点击属性面板"添加"，直接打开数据资源库并定位到目标节点。
- **沉浸式绑定**：提供明确的"绑定模式"（Binding Mode）UI，通过醒目的横幅和购物车式操作，让用户明确当前处于"为节点选资产"的状态。
- **批量高效**：支持跨文件夹、多次搜索、批量选中资产后一次性提交绑定。

---

## 2. User Story

**As a** 项目经理/系统工程师
**I want** 在属性面板点击"关联资产"时，系统自动带我去数据资源库并准备好一切
**So that** 我可以快速、批量地为当前节点关联所需的数据资产，而不需要手动查找节点或重复操作。

---

## 3. 详细需求 (Acceptance Criteria)

### AC1: 属性面板发起绑定
**Given** 用户正在属性面板编辑一个节点（Task 或 PBS）
**When** 用户点击"关联资产"区域的"添加"按钮
**Then** 数据资源库抽屉（DataLibraryDrawer）应自动打开
**And** 视图自动切换为默认的**文件夹视图**（Folder View）
**And** 进入**绑定模式**（Binding Mode）

### AC2: 绑定模式 UI 呈现
**Given** 数据资源库处于绑定模式
**Then** 顶部应显示醒目的**绑定目标横幅**（Binding Target Banner）
  - 内容：`🎯 即将绑定资产到节点: [节点名称]`
  - 操作：提供`[✕ 清除选择]`按钮，点击后清除目标节点但保持抽屉打开
**And** 底部或右下角应显示**已选资产托盘**（Selected Assets Tray）
  - 类似购物车，显示当前已选中的资产数量
  - 支持展开查看明细、移除单个资产
  - 提供`[清空全部]`按钮
  - 提供核心操作按钮：`确认绑定 (N)`

### AC3: 资产选择与批量操作
**Given** 处于绑定模式
**When** 用户勾选资产卡片上的复选框
**Then** 资产被加入"已选资产托盘"
**And** 选中状态应**跨视图保持**（即使切换文件夹或搜索关键词，之前的选中依然保留）
**And** 支持**多次搜索、多次选中**，最后统一提交

### AC4: 确认绑定流程
**Given** 已选中 N 个资产
**When** 点击"确认绑定 (N)"按钮
**Then** 系统自动将这 N 个资产与目标节点建立关联（默认类型：Reference）
**And** 显示成功 Toast
**And** 数据资源库抽屉**自动关闭**
**And** 属性面板的关联资产列表自动刷新，显示新关联的资产

### AC5: 节点兼容性
**Given** 当前节点是 PBS 或 Task 类型
**Then** 该功能均应支持
**And** 如果目标节点被意外删除，应自动退出绑定模式并提示用户

---

## 4. UI/UX 设计方案

### 4.1 绑定目标横幅 (Binding Target Banner)
位于 Toolbar 下方，筛选栏上方。使用高对比度背景（如淡蓝色/紫色渐变），强调当前任务上下文。

```text
┌─────────────────────────────────────────────────────────────┐
│  🎯 即将绑定资产到节点: Sprint规划                [✕ 清除]  │
│  （选择下方资产进行关联，或重新选择目标节点）               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 已选资产托盘 (Selected Assets Tray)
悬浮于右下角，类似电商购物车结算栏。

```text
┌──────────────────────────────────┐
│  已选资产 (3)        [清空全部] │
├──────────────────────────────────┤
│  📄 文件1.json           [✕]    │
│  📦 模型2.glb            [✕]    │
│  📄 数据3.vtp            [✕]    │
├──────────────────────────────────┤
│        [确认绑定 (3)]            │
└──────────────────────────────────┘
```

---

## 5. 技术实现方案

### 5.1 核心架构：Context-based State Management
创建 `DataLibraryBindingContext` 来管理跨组件的绑定状态，避免 props 层层传递（Prop Drilling）。

```typescript
// contexts/DataLibraryBindingContext.tsx
interface BindingState {
  isBindingMode: boolean;       // 是否处于绑定模式
  targetNodeId: string | null;  // 目标节点 ID
  selectedAssetIds: Set<string>; // 已选资产 ID（跨视图保持）
  selectedAssetsById: Map<string, { id: string; name: string; format: DataAssetFormat }>; // 用于托盘明细展示
}

interface BindingActions {
  openForBinding: (params: { nodeId: string; nodeLabel?: string }) => void;
  confirmBinding: (params?: { linkType?: DataLinkType }) => Promise<{ created: number; skipped: number }>;
  clearSelection: () => void;
  exitBindingMode: () => void;
  // ... 其他操作（toggleAssetSelection/removeAsset 等）
}
```

### 5.2 组件集成点

1.  **Layout 集成**：在 `apps/web/app/graph/[graphId]/page.tsx` 的 `<GraphProvider>` 内包裹 `DataLibraryBindingProvider`（确保 `TopBar` / `RightSidebar` 可访问）。
2.  **触发入口**：修改 `TaskForm` / `DataForm` / `PBSForm`，点击添加时调用 `openForBinding()`。
3.  **抽屉响应**：`TopBar` 监听 `isBindingMode`，并控制 `DataLibraryDrawer` 的 `isOpen`（绑定模式自动打开；确认后关闭）。
4.  **UI 注入**：
     - `DataLibraryDrawerPanel` 根据状态条件渲染 `BindingTargetBanner`。
     - 注入浮动组件 `SelectedAssetsTray`。
5.  **选中持久化**：改造 `useAssetSelection` 或在 Context 中实现选择逻辑，确保切换文件夹时不丢失选中项。

### 5.3 数据流同步
- **绑定成功后**：调用 `queryClient.invalidateQueries({ queryKey: ['node-asset-links', nodeId] })`，确保属性面板（LinkedAssetsSection）自动刷新。

---

## 6. 实施计划 (Implementation Phases)

### Phase 1: 基础设施 (Infrastructure)
- 创建 `DataLibraryBindingContext` 及 Provider
- 定义相关 TypeScript 类型

### Phase 2: UI 组件开发 (UI Components)
- 开发 `BindingTargetBanner` 组件
- 开发 `SelectedAssetsTray` 组件（含展开/收起动画）

### Phase 3: 逻辑集成 (Integration)
- 修改 `DataLibraryDrawer` 对接 Context
- 修改 `PropertyPanel` 各 Form 组件对接 Context
- 实现批量绑定 API 调用 Hook (`useBatchAssetBinding`)

### Phase 4: 完善与测试 (Refinement & QA)
- 单元测试：Context 逻辑、Tray 交互
- E2E 测试：完整绑定流程覆盖
- 细节优化：跨视图选中保持、多浏览器同步

---

## 7. 开放问题结论 (Decisions)

根据 Advanced Elicitation 阶段的深入讨论，确定以下详细交互规则：

1.  **多选管理**：使用**悬浮托盘 (Shopping Cart Style)** 管理已选资产，支持查看列表、单项移除和清空全部。
2.  **跨视图保持**：切换文件夹视图、节点视图或修改筛选条件时，**保留**已选中的资产状态，不自动清空。
3.  **绑定触发**：操作入口统一为托盘底部的**固定按钮 "确认绑定 (N)"**。
4.  **默认视图**：进入绑定模式时默认切换到**文件夹视图**，允许用户手动切换回结构视图查找资产。
5.  **目标节点视觉**：非本 Story 必做项（后续可在节点树/画布上高亮目标节点并显示 🎯 提示）。
6.  **目标删除处理**：若目标节点被删除，系统自动**退出绑定模式**并显示 Toast 错误提示。
7.  **重复绑定**：按 **幂等** 处理：已存在的关联会被后端 `createMany({ skipDuplicates: true })` 跳过，并在响应中计入 `skipped`。
8.  **绑定数量**：单次最多 **500** 个（后端 DTO 限制），超过需前端分批或提示用户。
9.  **自动刷新**：绑定成功后，属性面板（LinkedAssetsSection）**自动刷新**显示新关联资产（支持多浏览器/多标签页同步）。
10. **节点支持**：**全面支持** Task 节点和 PBS 节点。
