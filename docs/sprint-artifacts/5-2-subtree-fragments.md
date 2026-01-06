# Story 5.2: 子树模板保存与复用 (Save Subtree as Template)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Relationship: 依赖 Story 5.1 (Template Library) 的基础设施 -->
<!-- Tech-Spec: docs/sprint-artifacts/tech-spec-5-2-subtree-fragments.md -->

## Story

As a **用户**,
I want **将常用的节点结构保存为"模板"并在其他地方复用**,
so that **沉淀最佳实践，提高绘图效率。**

---

## Acceptance Criteria

### AC1: 子树选择与保存入口
**Given** 画布上选中的一组节点（子树）
**When** 右键选择"保存为模板"
**Then** 应弹出"保存模板"对话框

### AC2: 模板信息填写
**Given** "保存模板"对话框已打开
**When** 用户填写模板名称、描述（可选）、选择分类（可选）
**Then** 用户可以预览将要保存的节点结构
**And** 保存按钮在名称非空时启用

### AC3: 模板持久化
**Given** 用户填写完模板信息
**When** 点击"保存"按钮
**Then** 该结构被保存到个人或团队的模板库中
**And** 模板状态设为 PUBLISHED（可直接使用）
**And** 显示保存成功提示

### AC4: 模板库预览与拖拽
**Given** 在另一个图（或当前图其他位置）打开模板库
**When** 查看之前保存的模板
**Then** 可以预览并拖拽该模板到画布中
**And** 预览显示完整的节点结构预览

### AC5: 模板实例化保真
**Given** 用户拖拽模板到画布中
**When** 模板被插入
**Then** 插入的节点应保留原有的结构、数据和样式
**And** 节点 ID 应重新生成以避免重复
**And** 节点应作为选中节点的子节点（或作为新的根级节点）
**And** 依赖边 (dependency edges) 应正确重建

### AC6: 模板可见性控制
**Given** 用户保存模板时
**When** 选择可见性为"私有"
**Then** 该模板仅对创建者可见
**When** 选择可见性为"公开"
**Then** 该模板对所有用户可见

### Non-Goals (本 Story 不包含)
- 模板编辑/删除功能（管理员后台 Story 承接）
- 团队级别模板分享权限控制
- 模板版本管理
- AI 智能生成模板推荐

---

## Dev Notes

### 技术决策总结

| 决策点 | 选择 | 理由 |
|--------|------|------|
| **模板所有权** | 公开+私有两种模式 | 通过 `isPublic` 字段控制 |
| **插入位置** | 智能判断 | 有选中节点则作为子节点，否则作为根级节点 |
| **保存粒度** | 基本信息 + metadata + 层级 + **依赖边** | 完整保留业务语义 |
| **ID 映射策略** | 使用 `_tempId` 临时 ID | 边引用有效性，instantiate 时全部重生成 |
| **数据库字段** | 复用 `Template.structure` JSON | 利用 JSON 灵活性，无需新表 |

### 架构决策与参考模式

本 Story **扩展** Story 5.1 的模板基础设施，复用以下已有组件：

| 组件 | 文件路径 | 复用方式 |
|------|----------|----------|
| **TemplatesRepository** | `packages/plugins/plugin-template/src/server/templates/templates.repository.ts` | 新增 `create()` 方法 |
| **TemplatesService** | `packages/plugins/plugin-template/src/server/templates/templates.service.ts` | 新增 `saveSubtreeAsTemplate()` 方法 |
| **TemplatesController** | `packages/plugins/plugin-template/src/server/templates/templates.controller.ts` | 新增 `POST /templates` 端点 |
| **TemplateLibraryDialog** | `apps/web/components/TemplateLibrary/TemplateLibraryDialog.tsx` | 增强支持拖拽插入 |
| **useTemplates Hook** | `apps/web/hooks/useTemplates.ts` | 新增 `saveAsTemplate()` 方法 |
| **NodeContextMenu** | `apps/web/components/graph/parts/NodeContextMenu.tsx` | 新增 "保存为模板" 菜单项 |

### 关键技术点

#### 0. 实现护栏（MUST：避免协作/边渲染灾难）

- **不要重复实现 Clipboard 协议**：模板插入到画布必须复用/对齐 `apps/web/hooks/clipboard/*` 的 Yjs 写入 shape（node/edge）。否则会出现“插入后不显示/不同步/依赖边丢失/数据结构分叉”。参考：`apps/web/hooks/clipboard/clipboardPaste.ts`、`apps/web/hooks/clipboard/pasteHelpers.ts`。
- **依赖边判定路径**：依赖边应以 `edge.getData()?.metadata?.kind === 'dependency'` 为准（不是 `edge.getData().kind`）。
- **TemplateStructure.edges 的约定**：`edges` 仅保存 dependency edges；层级边由 `children/parentId` 推导并在插入时生成（hierarchical edges）。
- **节点 props 清洗**：保存模板时节点 `metadata` 必须使用白名单策略 `sanitizeNodeProps(nodeType, rawProps)`（见 `packages/types/src/node-types.ts`）。不要用“删除若干字段”的黑名单方式。
- **规模上限**：保存模板与插入模板都必须设置上限（建议复用 `MAX_CLIPBOARD_NODES = 100`），超限提示并拒绝保存/插入。
- **Yjs canonical shape（插入到画布）**：
  - node 最少包含：`{ id, label, mindmapType:'topic', nodeType, description?, x, y, width, height, parentId?, props?, metadata?, tags?, graphId, createdAt, updatedAt }`
  - edge 最少包含：`{ id, source, target, type: kind==='dependency' ? 'reference' : 'hierarchical', metadata:{ kind, dependencyType? }, graphId }`

#### 1. 子树序列化 (Subtree Serialization)

从画布选中节点提取完整子树结构：

```typescript
interface SubtreeExtractionResult {
  rootNode: TemplateNode;
  nodeCount: number;
  hasSpecialTypes: boolean; // TASK/PBS/REQUIREMENT 等
}

// 递归提取子树
function extractSubtree(selectedNodes: Node[], edges: Edge[]): SubtreeExtractionResult {
  // 1. 找到选中节点中的根节点（没有父节点在选中列表中的节点）
  // 2. 递归构建 TemplateNode 树结构
  // 3. 保留节点的 label、nodeType、description/tags（可选）、metadata（使用 sanitizeNodeProps 白名单）
  // 4. 不保留节点的 id、graphId、x/y 坐标（实例化时重新生成）
}
```

#### 2. 扩展模板类型定义 (关键!)

当前 `TemplateNode` 仅支持层级关系，需扩展支持依赖边：

```typescript
// packages/types/src/template-types.ts

// NEW: 模板边定义 - 用于保存依赖关系
export interface TemplateEdge {
  sourceRef: string;  // 源节点的 _tempId
  targetRef: string;  // 目标节点的 _tempId
  kind: 'dependency'; // 约定：TemplateStructure.edges 仅保存 dependency edges
  dependencyType?: 'FS' | 'SS' | 'FF' | 'SF'; // 仅 dependency 边需要
}

// 扩展 TemplateNode - 添加临时 ID 用于边引用
export interface TemplateNode {
  label: string;
  type?: NodeType;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  children?: TemplateNode[];
  _tempId?: string; // NEW: 用于在 instantiate 时重建 ID 映射
}

// 扩展 TemplateStructure - 支持依赖边
export interface TemplateStructure {
  rootNode: TemplateNode;
  edges?: TemplateEdge[]; // NEW: 依赖边列表
}

// 创建模板请求
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  categoryId?: string;
  structure: TemplateStructure;
  defaultClassification?: string;
  isPublic?: boolean; // NEW: 可见性控制
}

// 创建模板响应
export interface CreateTemplateResponse {
  id: string;
  name: string;
  createdAt: string;
}
```

#### 3. 拖拽插入实现

使用 `@dnd-kit/core` 实现模板到画布的拖拽：

```typescript
// 推荐实现：对齐 repo 现有 dnd-kit 用法（参考 Kanban）
// - 拖拽源：apps/web/features/views/components/KanbanView/KanbanCard.tsx (useDraggable)
// - Drop 目标：apps/web/features/views/components/KanbanView/KanbanColumn.tsx (useDroppable)

// 拖拽源（TemplateCard）
const { attributes, listeners, setNodeRef } = useDraggable({
  id: `template:${template.id}`,
  data: { type: 'template', templateId: template.id },
});

// Drop 目标（GraphComponent 容器）
const { setNodeRef: setDropRef } = useDroppable({
  id: 'graph-canvas',
  data: { type: 'graph-canvas' },
});

// DndContext（在上层组件包裹）
<DndContext
  onDragEnd={(event) => {
    // 1) 从 event.active.data.current 取 templateId
    // 2) 计算 drop 坐标（可用鼠标 clientX/clientY → graph.clientToLocal）
    // 3) 决定 parentNodeId（有选中节点则作为子节点，否则 undefined）
    // 4) 调用 useTemplateInsert.insertTemplate(templateId, pos, parentNodeId)
  }}
>
  {/* ... */}
</DndContext>
```

### Project Structure Notes

#### 需要修改的文件

```
packages/plugins/plugin-template/
├── src/server/templates/
│   ├── templates.repository.ts  # +create()
│   ├── templates.service.ts     # +saveSubtreeAsTemplate(), +validateTemplateStructure()
│   ├── templates.controller.ts  # +POST /templates
│   ├── templates.request.dto.ts # 建议在此扩展 CreateTemplate DTO（避免新建 dto/ 目录）
│   └── __tests__/
│       ├── templates.repository.spec.ts  # +create tests
│       └── templates.service.spec.ts     # +save tests

packages/types/src/
├── template-types.ts  # +TemplateEdge, +_tempId, +CreateTemplateRequest, +isPublic

apps/web/
├── lib/graph/
│   └── subtree-extractor.ts         # NEW - 子树提取工具函数
├── components/
│   ├── graph/
│   │   ├── GraphComponent.tsx       # +handleSaveAsTemplate, +Drop 处理
│   │   └── parts/NodeContextMenu.tsx # +onSaveAsTemplate prop
│   ├── TemplateLibrary/
│   │   ├── TemplateLibraryDialog.tsx # 增强拖拽支持
│   │   └── SaveTemplateDialog.tsx    # NEW - 保存对话框
├── hooks/
│   ├── useTemplates.ts              # +saveAsTemplate()
│   └── useTemplateInsert.ts         # NEW - 模板插入 Hook
└── __tests__/
    ├── lib/graph/
    │   └── subtree-extractor.test.ts # NEW
    ├── components/TemplateLibrary/
    │   └── SaveTemplateDialog.test.tsx  # NEW
    └── hooks/
        └── useTemplates.test.ts  # +save tests
```

#### 新增文件

| 文件 | 用途 |
|------|------|
| `apps/web/lib/graph/subtree-extractor.ts` | 子树结构提取工具函数 |
| `apps/web/components/TemplateLibrary/SaveTemplateDialog.tsx` | 保存模板对话框组件 |
| `apps/web/hooks/useTemplateInsert.ts` | 模板插入到画布的 Hook |
| `packages/plugins/plugin-template/src/server/templates/templates.request.dto.ts` | 扩展创建模板 DTO（CreateTemplate*Dto） |

### References

- [Source: docs/epics.md#Story 5.2] - Story 需求定义
- [Source: docs/architecture.md#NocoBase-Inspired Architecture] - 插件架构模式
- [Source: docs/project-context.md#Yjs-First 单向数据流] - Yjs 数据流原则
- [Source: docs/sprint-artifacts/5-1-template-library.md] - Story 5.1 实现参考
- [Source: packages/plugins/plugin-template/src/server/templates/templates.service.ts] - 现有模板服务
- [Source: apps/web/hooks/useTemplates.ts] - 现有模板 Hook
- [Source: apps/web/hooks/clipboard/clipboardSerializer.ts] - 子树展开 + 依赖边判定（metadata.kind）
- [Source: apps/web/hooks/clipboard/clipboardPaste.ts] - Yjs nodes/edges canonical 写入 shape
- [Source: apps/web/features/collab/GraphSyncManager.ts] - Yjs → X6 渲染协议（依赖边 type/reference + metadata.kind）

---

## UI Design Specifications (UI 设计规范)

### 设计文件

| 设计图 | 文件路径 | 对应 AC |
|--------|----------|---------|
| 保存模板对话框 | `docs/prototypes/story-5-2/5-2-save-template-dialog.png` | AC1, AC2 |
| 右键菜单 | `docs/prototypes/story-5-2/5-2-node-context-menu.png` | AC1 |
| 模板库拖拽 | `docs/prototypes/story-5-2/5-2-template-library-drag.png` | AC4, AC5 |

### 1. SaveTemplateDialog (保存模板对话框)

**位置:** `apps/web/components/TemplateLibrary/SaveTemplateDialog.tsx`

**视觉规范:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  📦 保存为模板                                               [×]   │
├───────────────────────────────┬─────────────────────────────────────┤
│                               │                                     │
│  📋 结构预览                  │   📝 模板信息                       │
│                               │                                     │
│  ┌─ 需求分析 [TASK]           │   模板名称 *                        │
│  │  ├─ 用户故事 [REQ]         │   ┌─────────────────────────────┐   │
│  │  ├─ 验收标准 [REQ]         │   │ 输入模板名称...             │   │
│  │  └─ 技术评审 [PBS]         │   └─────────────────────────────┘   │
│  │                            │                                     │
│  │  FS→ (依赖关系预览)        │   描述 (可选)                       │
│                               │   ┌─────────────────────────────┐   │
│  节点: 4 | 依赖边: 1          │   │ 描述模板的用途...           │   │
│                               │   │                             │   │
│                               │   └─────────────────────────────┘   │
│                               │                                     │
│                               │   分类                              │
│                               │   ┌────────────────────────┬──┐    │
│                               │   │ 选择分类...            │▼ │    │
│                               │   └────────────────────────┴──┘    │
│                               │                                     │
│                               │   可见性                            │
│                               │   ○ 公开 (所有用户可见)            │
│                               │   ● 私有 (仅自己可见)              │
│                               │                                     │
├───────────────────────────────┴─────────────────────────────────────┤
│                                              [取消]  [保存模板]     │
└─────────────────────────────────────────────────────────────────────┘
```

**设计规格:**

| 元素 | 规格 |
|------|------|
| **对话框尺寸** | 800×600px (响应式) |
| **背景色** | `#1e1e2e` (深灰) |
| **边框圆角** | 16px |
| **标题字体** | 18px, Semi-bold, `#ffffff` |
| **标签字体** | 14px, Medium, `#a0a0b0` |
| **输入框背景** | `#2d2d3d` |
| **输入框边框** | 1px `#3d3d4d`, focus: `#4f8cf7` |
| **主按钮** | 蓝色渐变 `linear-gradient(135deg, #4f8cf7, #6366f1)` |
| **预览区** | 左侧 50%, 背景 `#252535`, 圆角 12px |

**交互规范:**

1. **表单验证:**
   - 名称非空 → 启用保存按钮
   - 名称最大 100 字符
   - 描述最大 500 字符
   
2. **预览区:**
   - 实时显示将保存的节点树结构
   - 每个节点显示类型标签 (TASK/REQ/PBS 等)
   - 底部显示统计信息：节点数量、依赖边数量
   
3. **可见性切换:**
   - 默认选中"公开"
   - 切换时无需额外确认

4. **Loading 状态:**
   - 保存按钮显示 Spinner
   - 禁用所有输入
   - 成功后自动关闭，显示 Toast

### 2. NodeContextMenu (节点右键菜单)

**位置:** `apps/web/components/graph/parts/NodeContextMenu.tsx`

**视觉规范:**

```
┌────────────────────────┐
│ 📋 复制          ⌘C    │
│ ✂️ 剪切          ⌘X    │
├────────────────────────┤
│ 📥 粘贴到此处    ⌘V    │
│ ☑️ 全选          ⌘A    │
├────────────────────────┤
│ 📦 保存为模板    ★     │ ← 新增项，蓝色高亮
├────────────────────────┤
│ 🔔 关注节点            │
└────────────────────────┘
```

**设计规格:**

| 元素 | 规格 |
|------|------|
| **菜单宽度** | 180px |
| **背景色** | `#2d2d3d`, 透明度 95% |
| **边框圆角** | 12px |
| **阴影** | `0 4px 20px rgba(0,0,0,0.3)` |
| **菜单项高度** | 36px |
| **图标尺寸** | 16px |
| **字体** | 14px, Regular, `#e0e0e0` |
| **快捷键字体** | 12px, `#808090` |
| **分隔线** | 1px `#3d3d4d`, 上下 margin 4px |
| **"保存为模板" 高亮** | 背景 `rgba(79,140,247,0.15)`, 左边框 2px `#4f8cf7` |

**交互规范:**

1. **显示条件:**
   - 右键点击已选中的节点
   - 有选中节点时显示复制/剪切/保存为模板
   - 无选中节点时隐藏这些选项

2. **"保存为模板" 启用条件:**
   - 至少选中 1 个节点

3. **Hover 效果:**
   - 背景变为 `#3d3d4d`
   - 过渡动画 150ms

### 3. TemplateLibraryPanel (模板库面板 - 拖拽模式)

**位置:** `apps/web/components/TemplateLibrary/TemplateLibraryDialog.tsx`

**视觉规范:**

```
┌─────────────────────────────┐    ┌────────────────────────────────────────┐
│  📚 模板库                  │    │                                        │
├─────────────────────────────┤    │     画布区域                           │
│  🔍 搜索模板...             │    │                                        │
├─────────────────────────────┤    │    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐             │
│  全部 | 我的模板 | 最近使用  │    │    │  📦 拖放区域      │              │
├─────────────────────────────┤    │    │  (蓝色虚线边框)   │              │
│ ┌─────────────────────────┐ │    │    └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘             │
│ │ 📦 敏捷研发模板         │ │    │                                        │
│ │ ┌──┬──┬──┐ 使用 12 次   │ │    │                                        │
│ │ │⬜│⬜│⬜│              │ │→→→→→→→→→(拖拽中)→→→→→→→→→→→→→→→→→→→→│
│ │ └──┴──┴──┘ 敏捷 研发    │ │    │                                        │
│ └─────────────────────────┘ │    │                                        │
│ ┌─────────────────────────┐ │    │                                        │
│ │ 📦 故障复盘模板         │ │    │                                        │
│ │ 使用 8 次  ⭐ 我创建的   │ │    │                                        │
│ └─────────────────────────┘ │    │                                        │
│ ┌─────────────────────────┐ │    └────────────────────────────────────────┘
│ │ 📦 系统架构模板         │ │
│ │ 使用 5 次               │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**设计规格:**

| 元素 | 规格 |
|------|------|
| **面板宽度** | 320px |
| **背景色** | `#1e1e2e` |
| **模板卡片高度** | 80px |
| **卡片圆角** | 12px |
| **卡片背景** | `#252535` |
| **卡片阴影** | `0 2px 8px rgba(0,0,0,0.2)` |
| **标签 Pills** | 背景 `#3d3d4d`, 圆角 4px, 字体 12px |
| **"我创建的" 徽章** | 背景 `#4f8cf720`, 文字 `#4f8cf7` |

**拖拽交互规范:**

1. **拖拽开始:**
   - 卡片透明度变为 0.5
   - 显示拖拽 Ghost (半透明副本跟随鼠标)
   
2. **拖拽中:**
   - 画布显示蓝色虚线 drop zone
   - 如有选中节点，该节点高亮显示（表示将插入为其子节点）
   
3. **拖拽释放:**
   - 无选中节点 → 在 drop 位置创建根级节点
   - 有选中节点 → 作为该节点的子节点插入
   - 成功后显示 Toast "模板插入成功"

4. **Tab 切换:**
   - "我的模板" 显示 `creatorId === currentUserId` 的模板
   - 包含私有模板 (`isPublic === false`)

### 4. 颜色系统

```css
:root {
  /* 背景色 */
  --bg-primary: #1e1e2e;
  --bg-secondary: #252535;
  --bg-tertiary: #2d2d3d;
  
  /* 边框色 */
  --border-default: #3d3d4d;
  --border-focus: #4f8cf7;
  
  /* 文字色 */
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-muted: #808090;
  
  /* 强调色 */
  --accent-blue: #4f8cf7;
  --accent-purple: #6366f1;
  --accent-gradient: linear-gradient(135deg, #4f8cf7, #6366f1);
  
  /* 状态色 */
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  
  /* 节点类型色 */
  --node-task: #4f8cf7;
  --node-requirement: #10b981;
  --node-pbs: #f59e0b;
  --node-data: #8b5cf6;
  --node-app: #ec4899;
}
```

### 5. 动画规范

| 动画 | 属性 | 时长 | 缓动函数 |
|------|------|------|----------|
| 对话框打开 | opacity, scale | 200ms | ease-out |
| 按钮 Hover | background | 150ms | ease |
| 菜单项 Hover | background | 150ms | ease |
| 拖拽 Ghost | opacity | 100ms | linear |
| Drop Zone 出现 | border-color, opacity | 200ms | ease-in-out |
| Loading Spinner | rotate | 1000ms | linear |
| Toast 出现 | translateY, opacity | 300ms | ease-out |

### 6. 响应式断点

| 断点 | 对话框行为 |
|------|-----------|
| > 1024px | 左右分栏布局 |
| 768-1024px | 预览区折叠为可展开区域 |
| < 768px | 单列布局，预览在上，表单在下 |

## Tasks / Subtasks

### Phase 1: 类型定义扩展

#### Task 1.1: 扩展模板类型定义 (AC: #2, #3, #5)

**文件:** `packages/types/src/template-types.ts`

- [ ] 添加 `TemplateEdge` 接口
  ```typescript
  export interface TemplateEdge {
    sourceRef: string;  // 源节点的 _tempId
    targetRef: string;  // 目标节点的 _tempId
    kind: EdgeKind;     // 约定：仅使用 'dependency'（层级边由 children/parentId 推导）
    dependencyType?: DependencyType; // 仅 dependency 边需要
  }
  ```
- [ ] 扩展 `TemplateNode` 添加 `_tempId` 字段
  ```typescript
  export interface TemplateNode {
    label: string;
    type?: NodeType;
    description?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    children?: TemplateNode[];
    _tempId?: string; // NEW: 用于边引用
  }
  ```
- [ ] 扩展 `TemplateStructure` 添加 `edges` 字段
  ```typescript
  export interface TemplateStructure {
    rootNode: TemplateNode;
    edges?: TemplateEdge[]; // NEW: 依赖边
  }
  ```
- [ ] 添加 `CreateTemplateRequest` 接口
  ```typescript
  export interface CreateTemplateRequest {
    name: string;
    description?: string;
    categoryId?: string;
    structure: TemplateStructure;
    defaultClassification?: string;
    isPublic?: boolean; // NEW: 可见性控制
  }
  ```
- [ ] 添加 `CreateTemplateResponse` 接口
- [ ] 扩展 `Template` 增加 `isPublic`（与 Prisma 字段对齐）
- [ ] 扩展 `TemplateListItem` 增加 `creatorId`、`isPublic`（用于“我的模板”与私有筛选）
- [ ] 扩展 `TemplateQueryOptions` 支持 `userId`（viewer）与 `mine`（仅我的模板，可选）用于后端过滤（避免私有模板泄露）
- [ ] 更新 `packages/types/src/index.ts` 导出

### Phase 2: 后端 API 开发

#### Task 2.0: Prisma Schema 扩展（可见性落盘）(AC: #6)

**文件:** `packages/database/prisma/schema.prisma`

- [ ] 给 `Template` 增加字段（并生成迁移）
  ```prisma
  model Template {
    // ...
    isPublic Boolean @default(true) // NEW: 可见性（true=公开，false=私有，仅创建者可见）
    @@index([isPublic])
    @@index([creatorId, isPublic])
  }
  ```

#### Task 2.1: DTO 定义 (AC: #3)

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.request.dto.ts`

**参考模式:** 项目中其他 DTO（如 comments plugin）

- [ ] 在现有文件中新增创建模板 DTO（保持与 `TemplatesListQueryDto`/`InstantiateTemplate*Dto` 同一位置）
  ```typescript
  import { IsString, IsOptional, IsObject, IsBoolean, IsNotEmpty, MaxLength } from 'class-validator';
  import { Type } from 'class-transformer';
  
  export class CreateTemplateQueryDto {
    @IsString()
    @IsNotEmpty()
    userId!: string;
  }

  export class CreateTemplateBodyDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;
  
    @IsString()
    @IsOptional()
    @MaxLength(500)
    description?: string;
  
    @IsString()
    @IsOptional()
    categoryId?: string;
  
    @IsObject()
    structure!: unknown; // TemplateStructure（在 service 做强校验）
  
    @IsString()
    @IsOptional()
    defaultClassification?: string;

    @IsBoolean()
    @IsOptional()
    isPublic?: boolean; // default: true
  }
  ```

#### Task 2.2: Repository 扩展 (AC: #3)

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.repository.ts`

- [ ] 实现 `create(data: CreateTemplateData)` 方法
  ```typescript
  async create(data: {
    name: string;
    description?: string;
    categoryId?: string;
    structure: TemplateStructure;
    defaultClassification?: string;
    creatorId: string;
    isPublic?: boolean;
  }): Promise<Template> {
    const template = await prisma.template.create({
      data: {
        name: data.name,
        description: data.description || null,
        categoryId: data.categoryId || null,
        structure: data.structure as Prisma.InputJsonValue,
        defaultClassification: data.defaultClassification || 'internal',
        creatorId: data.creatorId,
        isPublic: data.isPublic ?? true,
        status: TemplateStatus.PUBLISHED, // 用户创建的直接发布
      },
      include: { category: true },
    });
    // 映射方式：复用本文件 `findById` 的映射结构（当前 repo 没有 mapToTemplate 函数）
    return this.findById(template.id) as Promise<Template>;
  }
  ```

#### Task 2.3: Service 扩展 (AC: #3, #5)

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.service.ts`

- [ ] 实现 `saveSubtreeAsTemplate()` 方法
  ```typescript
  async saveSubtreeAsTemplate(
    data: CreateTemplateRequest & { creatorId: string }
  ): Promise<Template> {
    // 1. 验证结构完整性
    this.validateTemplateStructure(data.structure);
    
    // 2. 验证分类存在（如果提供）
    if (data.categoryId) {
      const categories = await this.repository.findCategories();
      if (!categories.find(c => c.id === data.categoryId)) {
        throw new BadRequestException('Invalid category');
      }
    }
    
    // 3. 创建模板
    return this.repository.create({
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      structure: data.structure,
      defaultClassification: data.defaultClassification,
      creatorId: data.creatorId,
      isPublic: data.isPublic ?? true,
    });
  }
  ```

- [ ] 实现 `validateTemplateStructure()` 验证逻辑
  ```typescript
  private validateTemplateStructure(structure: TemplateStructure): void {
    if (!structure.rootNode || !structure.rootNode.label) {
      throw new BadRequestException('Template must have a root node with label');
    }

    // 可选但强烈建议：限制模板规模（前后端双保险）
    const nodeCount = this.countNodes(structure.rootNode);
    if (nodeCount > MAX_CLIPBOARD_NODES) {
      throw new BadRequestException(`Template too large (${nodeCount}/${MAX_CLIPBOARD_NODES})`);
    }
    
    // 验证边引用的有效性
    if (structure.edges && structure.edges.length > 0) {
      const allTempIds = this.collectTempIds(structure.rootNode);
      for (const edge of structure.edges) {
        if (!allTempIds.has(edge.sourceRef) || !allTempIds.has(edge.targetRef)) {
          throw new BadRequestException('Edge references invalid node');
        }
      }
    }
  }
  
  private collectTempIds(node: TemplateNode, ids: Set<string> = new Set()): Set<string> {
    if (node._tempId) ids.add(node._tempId);
    node.children?.forEach(child => this.collectTempIds(child, ids));
    return ids;
  }

  private countNodes(node: TemplateNode): number {
    const childrenCount = node.children?.reduce((sum, child) => sum + this.countNodes(child), 0) ?? 0;
    return 1 + childrenCount;
  }
  ```

- [ ] 扩展 `generateGraphFromTemplate()` 支持依赖边重建

#### Task 2.4: Controller 扩展 (AC: #3)

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.controller.ts`

- [ ] 添加 `POST /templates` 端点
  ```typescript
  @Post()
  async createTemplate(
    @Query() query: CreateTemplateQueryDto,
    @Body() dto: CreateTemplateBodyDto
  ): Promise<{ template: CreateTemplateResponse }> {
    // 注意：apps/api 全局已启用 ValidationPipe（无需在 @Body(...) 再传一次）
    const template = await this.service.saveSubtreeAsTemplate({
      ...dto,
      creatorId: query.userId,
    });

    return {
      template: {
        id: template.id,
        name: template.name,
        createdAt: template.createdAt!,
      },
    };
  }
  ```

#### Task 2.5: 可见性过滤 & 访问控制 (AC: #6)

**目标:** 私有模板仅创建者可见；公开模板所有人可见（避免私有模板泄露）

**文件:**
- `packages/plugins/plugin-template/src/server/templates/templates.request.dto.ts`
- `packages/plugins/plugin-template/src/server/templates/templates.repository.ts`
- `packages/plugins/plugin-template/src/server/templates/templates.service.ts`
- `packages/plugins/plugin-template/src/server/templates/templates.controller.ts`

- [ ] 扩展 `TemplatesListQueryDto`（新增可选 query）
  - `userId?: string`（viewer，用于返回“公开 + 我创建的私有”）
  - `mine?: boolean`（仅我的模板，可选）
- [ ] Repository `findAll`：where 必须保证：
  - 默认：`status=PUBLISHED AND isPublic=true`
  - 有 `userId`：`status=PUBLISHED AND (isPublic=true OR creatorId=userId)`
  - `mine=true` 且有 `userId`：`status=PUBLISHED AND creatorId=userId`（包含私有）
- [ ] `GET /templates/:id`：当 `isPublic=false` 时，必须校验 `userId` 且等于 `creatorId`，否则返回 404（避免枚举私有模板 ID）
- [ ] `POST /templates/:id/instantiate`：同样需要按 `isPublic` 做访问控制

### Phase 3: 前端实现

#### Task 3.1: 保存对话框组件 (AC: #1, #2)

**文件:** `apps/web/components/TemplateLibrary/SaveTemplateDialog.tsx`

**参考模式:** `TemplateLibraryDialog.tsx`

- [ ] 创建对话框组件 (~200行)
  - 模板名称输入框 (必填)
  - 描述文本域 (可选)
  - 分类下拉选择 (可选，从 useTemplates.categories 获取)
  - 节点结构预览区（建议将 `TemplateNodePreview` 从 `TemplateLibraryDialog.tsx` 抽取成可复用组件，或在本组件内实现同等预览）
  - 取消/保存按钮
- [ ] 实现表单验证
  - 名称非空验证
  - 最大长度验证 (name: 100, description: 500)
- [ ] 实现 loading 和 error 状态展示
- [ ] 实现保存成功后自动关闭并显示 toast

#### Task 3.2: Hook 扩展 (AC: #3, #5)

**文件:** `apps/web/hooks/useTemplates.ts`

- [ ] 添加 `saveAsTemplate()` 方法
  - [ ] 新增 `isSaving` 状态（避免复用 `isLoading` 影响模板列表加载状态）
  ```typescript
  // 建议：保持与 instantiate 一致的签名（显式传入 userId）
  const saveAsTemplate = async (
    userId: string,
    data: CreateTemplateRequest
  ): Promise<CreateTemplateResponse> => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save template');
      const { template } = await response.json();
      return template;
    } finally {
      setIsSaving(false);
    }
  };
  ```

- [ ] 说明：模板插入到画布请使用独立 Hook `useTemplateInsert`（见 Task 3.5），不要放在 `useTemplates`，避免职责膨胀

#### Task 3.2.1: templates API 扩展 (AC: #3, #6)

**文件:** `apps/web/lib/api/templates.ts`

- [ ] 新增 `createTemplate(userId, body)`（对应 `POST /templates?userId=...`）
- [ ] 扩展 `fetchTemplates(options)` 支持传入 `userId` / `mine`（用于“我的模板”与私有模板）
- [ ] 扩展 `fetchTemplate(id)` 支持可选 `userId`（用于私有模板预览/插入）

#### Task 3.3: 子树提取工具函数 (AC: #1, #5) - 核心逻辑

**文件:** `apps/web/lib/graph/subtree-extractor.ts` (NEW)

- [ ] 创建 `extractSubtreeAsTemplate()` 主函数
  ```typescript
  import { MAX_CLIPBOARD_NODES, NodeType, sanitizeNodeProps } from '@cdm/types';
  import type { TemplateNode, TemplateEdge, TemplateStructure } from '@cdm/types';
  import type { Node, Edge } from '@antv/x6';

  export function extractSubtreeAsTemplate(
    selectedNodes: Node[],
    allNodes: Node[],
    allEdges: Edge[]
  ): TemplateStructure {
    if (selectedNodes.length > MAX_CLIPBOARD_NODES) {
      throw new Error(`选择过多节点 (${selectedNodes.length}/${MAX_CLIPBOARD_NODES})，请减少选择数量`);
    }

    // 1. 找到选中节点中的根节点（父节点不在选中列表中的节点）
    const selectedIds = new Set(selectedNodes.map(n => n.id));
    const rootNodes = selectedNodes.filter(node => {
      const parentId = node.getData()?.parentId;
      return !parentId || !selectedIds.has(parentId);
    });
    
    if (rootNodes.length === 0) {
      throw new Error('No root node found in selection');
    }
    
    const tempIdMap = new Map<string, string>(); // nodeId -> tempId
    let rootNode: TemplateNode;
    
    if (rootNodes.length === 1) {
      rootNode = buildTemplateNode(rootNodes[0], allNodes, selectedIds, tempIdMap);
    } else {
      // 多个根节点时，创建虚拟容器
      rootNode = {
        label: '模板',
        _tempId: generateTempId(),
        children: rootNodes.map(n => buildTemplateNode(n, allNodes, selectedIds, tempIdMap)),
      };
    }
    
    // 2. 提取依赖边（非层级边）
    const edges = extractDependencyEdges(allEdges, selectedIds, tempIdMap);
    
    return {
      rootNode,
      edges: edges.length > 0 ? edges : undefined,
    };
  }
  ```

- [ ] 实现 `buildTemplateNode()` 递归构建节点
  ```typescript
  function buildTemplateNode(
    node: Node,
    allNodes: Node[],
    selectedIds: Set<string>,
    tempIdMap: Map<string, string>
  ): TemplateNode {
    const data = node.getData() || {};
    const tempId = generateTempId();
    tempIdMap.set(node.id, tempId);

    const nodeType = (data.nodeType || data.type || NodeType.ORDINARY) as NodeType;
    const rawProps = (data.props || data.metadata || {}) as Record<string, unknown>;
    const sanitizedProps = sanitizeNodeProps(nodeType, rawProps);

    // 找子节点（仅选中范围内）
    const children = allNodes
      .filter(n => n.getData()?.parentId === node.id && selectedIds.has(n.id))
      .map(child => buildTemplateNode(child, allNodes, selectedIds, tempIdMap));

    return {
      label: data.label || node.id,
      type: nodeType === NodeType.ORDINARY ? undefined : nodeType,
      description: data.description,
      tags: data.tags || [],
      metadata: sanitizedProps,
      _tempId: tempId,
      children: children.length > 0 ? children : undefined,
    };
  }
  ```

- [ ] 实现 `extractDependencyEdges()` 边提取
  ```typescript
  function extractDependencyEdges(
    allEdges: Edge[],
    selectedIds: Set<string>,
    tempIdMap: Map<string, string>
  ): TemplateEdge[] {
    return allEdges
      .filter(edge => {
        const sourceId = edge.getSourceCellId();
        const targetId = edge.getTargetCellId();
        if (!sourceId || !targetId) return false;

        const data = edge.getData() || {};
        const metadata = (data as { metadata?: { kind?: string } }).metadata || {};
        const kind = metadata.kind ?? (data.type === 'reference' ? 'dependency' : 'hierarchical');
        // 只保留两端都在选中范围内的依赖边
        return kind === 'dependency' &&
          selectedIds.has(sourceId) &&
          selectedIds.has(targetId);
      })
      .map(edge => {
        const data = edge.getData() || {};
        const metadata = (data as { metadata?: { kind?: string; dependencyType?: string } }).metadata || {};
        return {
          sourceRef: tempIdMap.get(edge.getSourceCellId())!,
          targetRef: tempIdMap.get(edge.getTargetCellId())!,
          kind: 'dependency',
          dependencyType: metadata.dependencyType,
        };
      });
  }
  ```

- [ ] 实现 `generateTempId()` 工具函数（建议用 `nanoid()`；确保仅在模板内部唯一即可）

#### Task 3.4: 右键菜单集成 (AC: #1)

**文件:** `apps/web/components/graph/parts/NodeContextMenu.tsx`

- [ ] 添加 `onSaveAsTemplate` prop
  ```typescript
  export interface NodeContextMenuProps {
    // ... existing props
    onSaveAsTemplate?: () => void; // NEW
  }
  ```

- [ ] 添加 "保存为模板" 菜单项
  ```typescript
  {hasSelection && (
    <>
      {/* 现有复制/剪切按钮 */}
      <div className="border-t border-gray-100 my-1" />
      <button
        onClick={() => handleAction(() => onSaveAsTemplate?.())}
        disabled={!onSaveAsTemplate}
        className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
      >
        <span className="w-4">📦</span>保存为模板
      </button>
    </>
  )}
  ```

**文件:** `apps/web/components/graph/GraphComponent.tsx`

- [ ] 添加状态和处理函数
  ```typescript
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [subtreeStructure, setSubtreeStructure] = useState<TemplateStructure | null>(null);

  const handleSaveAsTemplate = useCallback(() => {
    if (!graph) return;
    if (selectedNodes.length === 0) return addToast({ type: 'error', title: '提示', description: '请先选择要保存的节点' });
    
    try {
      const allNodes = graph.getNodes();
      const allEdges = graph.getEdges();
      const structure = extractSubtreeAsTemplate(selectedNodes, allNodes, allEdges);
      setSubtreeStructure(structure);
      setSaveTemplateDialogOpen(true);
    } catch (err: any) {
      addToast({ type: 'error', title: '保存失败', description: err.message });
    }
  }, [graph, selectedNodes, addToast]);
  ```
- [ ] 传递给 NodeContextMenu 并集成 SaveTemplateDialog

#### Task 3.5: 模板插入 Hook (AC: #4, #5)

**文件:** `apps/web/hooks/useTemplateInsert.ts` (NEW)

- [ ] 创建 `useTemplateInsert` Hook
  ```typescript
  import { useCallback } from 'react';
  import { nanoid } from 'nanoid';
  import type { Graph } from '@antv/x6';
  import { MAX_CLIPBOARD_NODES, NodeType, sanitizeNodeProps } from '@cdm/types';
  import type { TemplateStructure } from '@cdm/types';
  import * as Y from 'yjs';

  export function useTemplateInsert(
    graph: Graph | null,
    ydoc: Y.Doc | null,
    graphId: string,
    userId: string
  ) {
    const insertTemplate = useCallback(async (
      templateId: string,
      position: { x: number; y: number },
      parentNodeId?: string | null
    ) => {
      if (!graph || !ydoc) return [];
      
      // 1. 获取模板
      const response = await fetch(`/api/templates/${templateId}?userId=${userId}`);
      const { template } = await response.json();

      const totalNodeCount = countTemplateNodes(template.structure.rootNode);
      if (totalNodeCount > MAX_CLIPBOARD_NODES) {
        throw new Error(`模板过大 (${totalNodeCount}/${MAX_CLIPBOARD_NODES})，请拆分后再插入`);
      }
      
      // 2. 生成节点和边
      const { nodes, edges } = generateFromTemplate(
        template.structure,
        graphId,
        position,
        parentNodeId
      );
      
      // 3. 通过 Yjs 事务插入（遵循 Yjs-First）
      const nodesMap = ydoc.getMap('nodes');
      const edgesMap = ydoc.getMap('edges');
      
      ydoc.transact(() => {
        nodes.forEach(node => nodesMap.set(node.id, node));
        edges.forEach(edge => edgesMap.set(edge.id, edge));
      });
      
      return nodes.map(n => n.id);
    }, [graph, ydoc, graphId, userId]);
    
    return { insertTemplate };
  }

  function countTemplateNodes(node: { children?: unknown[] }): number {
    const children = Array.isArray(node.children) ? node.children : [];
    return 1 + children.reduce((sum, child) => sum + countTemplateNodes(child as { children?: unknown[] }), 0);
  }
  ```

- [ ] 实现 `generateFromTemplate()` 节点/边生成
  ```typescript
  function generateFromTemplate(
    structure: TemplateStructure,
    graphId: string,
    basePosition: { x: number; y: number },
    parentNodeId?: string | null
  ): { nodes: any[]; edges: any[] } {
    const nodes: Array<Record<string, unknown>> = [];
    const edges: Array<Record<string, unknown>> = [];
    const tempIdToNewId = new Map<string, string>();
    const parentChildRelations: Array<{ parentId: string; childId: string }> = [];
    const now = new Date().toISOString();
    
    // 递归生成节点
    function processNode(
      templateNode: any,
      parentId: string | undefined,
      depth: number,
      siblingIndex: number
    ): string {
      const newId = nanoid();
      if (templateNode._tempId) {
        tempIdToNewId.set(templateNode._tempId, newId);
      }

      if (parentId) parentChildRelations.push({ parentId, childId: newId });

      const nodeType = (templateNode.type || NodeType.ORDINARY) as NodeType;
      const rawProps = (templateNode.metadata && typeof templateNode.metadata === 'object')
        ? (templateNode.metadata as Record<string, unknown>)
        : {};
      const sanitizedProps = sanitizeNodeProps(nodeType, rawProps);
      const props = Object.keys(sanitizedProps).length > 0 ? sanitizedProps : undefined;
      
      nodes.push({
        id: newId,
        label: templateNode.label,
        mindmapType: 'topic',
        nodeType,
        description: templateNode.description,
        x: basePosition.x + depth * 200,
        y: basePosition.y + siblingIndex * 80,
        width: 120,
        height: 50,
        parentId,
        props,
        metadata: props,
        tags: templateNode.tags || [],
        graphId,
        createdAt: now,
        updatedAt: now,
      });
      
      templateNode.children?.forEach((child: any, index: number) => {
        processNode(child, newId, depth + 1, index);
      });
      
      return newId;
    }
    
    const rootParentId = parentNodeId || undefined;
    processNode(structure.rootNode, rootParentId, 0, 0);

    // 先生成层级边（由 parentId 推导），保证插入后立即可见
    parentChildRelations.forEach(({ parentId, childId }) => {
      const edgeId = nanoid();
      edges.push({
        id: edgeId,
        source: parentId,
        target: childId,
        type: 'hierarchical',
        metadata: { kind: 'hierarchical' },
        graphId,
      });
    });
    
    // 重建依赖边
    structure.edges?.forEach(templateEdge => {
      const sourceId = tempIdToNewId.get(templateEdge.sourceRef);
      const targetId = tempIdToNewId.get(templateEdge.targetRef);
      if (sourceId && targetId) {
        edges.push({
          id: nanoid(),
          source: sourceId,
          target: targetId,
          type: 'reference',
          metadata: {
            kind: 'dependency',
            dependencyType: templateEdge.dependencyType,
          },
          graphId,
        });
      }
    });
    
    return { nodes, edges };
  }
  ```

#### Task 3.6: 模板库增强 (AC: #4, #6)

**文件:** `apps/web/components/TemplateLibrary/TemplateLibraryDialog.tsx`

- [ ] 添加模板卡片的拖拽功能
- [ ] 区分"从模板创建新图"和"插入到当前图"两种模式
- [ ] 添加"我的模板"筛选 Tab（按 creatorId 筛选）
- [ ] 处理 isPublic 筛选逻辑
- [ ] 加载列表/详情时传入 `userId`（确保“公开 + 我创建的私有”闭环；私有模板预览/插入需带 `userId`）

### Phase 4: 测试

#### Task 4.1: 后端单元测试 (AC: All)

**文件:** `packages/plugins/plugin-template/src/server/templates/__tests__/`

- [ ] TC-REPO-CREATE-1: create 成功创建模板并返回完整数据
- [ ] TC-REPO-CREATE-2: create 正确处理可选字段
- [ ] TC-REPO-CREATE-3: create 正确保存含 edges 的结构
- [ ] TC-REPO-VIS-1: findAll（无 userId）仅返回 isPublic=true 的模板
- [ ] TC-REPO-VIS-2: findAll（有 userId）返回 isPublic=true + creatorId=userId 的私有模板
- [ ] TC-REPO-VIS-3: findAll（mine=true & userId）仅返回 creatorId=userId（包含私有）
- [ ] TC-SVC-SAVE-1: saveSubtreeAsTemplate 验证结构必须有 rootNode
- [ ] TC-SVC-SAVE-2: saveSubtreeAsTemplate 验证边引用有效性
- [ ] TC-SVC-SAVE-3: saveSubtreeAsTemplate 校验无效分类抛出异常
- [ ] TC-SVC-SAVE-4: saveSubtreeAsTemplate 成功创建用户模板
- [ ] TC-SVC-SAVE-5: saveSubtreeAsTemplate 支持 isPublic 参数
- [ ] TC-SVC-VIS-1: getTemplate（私有模板）对非创建者返回 404（或统一 NotFound）

#### Task 4.2: 前端工具函数测试 (AC: #1, #5)

**文件:** `apps/web/__tests__/lib/graph/subtree-extractor.test.ts`

- [ ] TC-EXTRACT-1: extractSubtreeAsTemplate 正确提取单根子树
- [ ] TC-EXTRACT-2: extractSubtreeAsTemplate 正确提取多根子树（创建虚拟容器）
- [ ] TC-EXTRACT-3: extractSubtreeAsTemplate 正确提取依赖边
- [ ] TC-EXTRACT-4: extractSubtreeAsTemplate 过滤非选中范围的边
- [ ] TC-EXTRACT-5: 节点 metadata 使用 sanitizeNodeProps 白名单策略（非法字段被丢弃）

#### Task 4.3: 前端 Hook 测试 (AC: #3, #5)

**文件:** `apps/web/__tests__/hooks/useTemplates.test.ts`

- [ ] TC-HOOK-SAVE-1: saveAsTemplate 成功保存模板
- [ ] TC-HOOK-SAVE-2: saveAsTemplate 失败时正确设置 error

**文件:** `apps/web/__tests__/hooks/useTemplateInsert.test.ts`

- [ ] TC-HOOK-INSERT-1: insertTemplate 正确生成节点
- [ ] TC-HOOK-INSERT-2: insertTemplate 正确重建依赖边
- [ ] TC-HOOK-INSERT-3: insertTemplate 生成层级边（parent-child 的 hierarchical edges）
- [ ] TC-HOOK-INSERT-4: insertTemplate 依赖边写入 `type='reference'` 且 `metadata.kind='dependency'`
- [ ] TC-HOOK-INSERT-5: insertTemplate 使用 Yjs 事务插入

#### Task 4.4: 组件测试 (AC: #1, #2)

**文件:** `apps/web/__tests__/components/TemplateLibrary/SaveTemplateDialog.test.tsx`

- [ ] TC-SAVE-UI-1: 对话框正确渲染所有表单字段（名称、描述、分类、可见性）
- [ ] TC-SAVE-UI-2: 名称为空时保存按钮禁用
- [ ] TC-SAVE-UI-3: 提交时调用 saveAsTemplate
- [ ] TC-SAVE-UI-4: loading 状态正确显示
- [ ] TC-SAVE-UI-5: 保存成功后关闭对话框
- [ ] TC-SAVE-UI-6: 错误状态正确显示
- [ ] TC-SAVE-UI-7: 可见性开关正确工作

#### Task 4.5: E2E 测试 (AC: All)

**文件:** `apps/web/e2e/template-save.spec.ts`

- [ ] TC-E2E-SAVE-1: 完整保存子树为模板流程
- [ ] TC-E2E-SAVE-2: 保存的模板出现在模板库中
- [ ] TC-E2E-INSERT-1: 拖拽模板到画布插入
- [ ] TC-E2E-INSERT-2: 插入的节点保持正确结构
- [ ] TC-E2E-INSERT-3: 验证依赖边正确重建
- [ ] TC-E2E-VISIBILITY-1: 私有模板仅创建者可见

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] AC4/AC5 未闭环：缺少“在图内打开模板库 + 拖拽到画布插入”的 UI 入口与 drop 处理 [apps/web/components/layout/LeftSidebar.tsx:23, apps/web/components/graph/GraphComponent.tsx:255]
- [x] [AI-Review][HIGH] 私有模板访问控制缺失：`GET /templates/:id` 与 `POST /templates/:id/instantiate` 未按 `isPublic/creatorId` 限制（需基于 `userId`） [packages/plugins/plugin-template/src/server/templates/templates.controller.ts:87, packages/plugins/plugin-template/src/server/templates/templates.controller.ts:100, packages/plugins/plugin-template/src/server/templates/templates.service.ts:85, packages/plugins/plugin-template/src/server/templates/templates.service.ts:109]
- [x] [AI-Review][HIGH] 依赖边提取路径错误：依赖边应读取 `edge.getData()?.metadata?.kind`，当前实现读 `edge.getData().kind` 导致 dependency edges 丢失 [apps/web/lib/subtree-extractor.ts:106, apps/web/components/graph/hooks/useGraphDependencyMode.ts:107]
- [x] [AI-Review][HIGH] metadata 清洗策略不符合项目约束：应使用 `sanitizeNodeProps(nodeType, rawProps)` 白名单；当前黑名单容易漏字段 [apps/web/lib/subtree-extractor.ts:73, apps/web/hooks/clipboard/clipboardSerializer.ts:133]
- [x] [AI-Review][MEDIUM] 缺少规模上限：保存/插入模板需限制节点数量（建议复用 `MAX_CLIPBOARD_NODES = 100`），避免大选区卡死 [apps/web/lib/subtree-extractor.ts:152, apps/web/hooks/clipboard/clipboardSerializer.ts:41]
- [x] [AI-Review][MEDIUM] 单测与真实 edge shape 不一致：测试用 `edge.getData().kind`，但实际为 `edge.getData().metadata.kind`，造成“假绿”测试 [apps/web/lib/__tests__/subtree-extractor.spec.ts:77, apps/web/components/graph/hooks/useGraphDependencyMode.ts:107]
- [x] [AI-Review][MEDIUM] `dependencyType` 未校验：类型约束为 `FS/SS/FF/SF`，但当前可写入任意字符串，后续渲染/逻辑可能崩 [packages/types/src/edge-types.ts:30, apps/web/lib/subtree-extractor.ts:120]
- [x] [AI-Review][LOW] 文件体积超标：`TemplateLibraryDialog.tsx`/`SaveTemplateDialog.tsx` 超过 300 行，建议拆分 [apps/web/components/TemplateLibrary/TemplateLibraryDialog.tsx:1, apps/web/components/TemplateLibrary/SaveTemplateDialog.tsx:1]

### Code Review Round 2 (2026-01-04)

**Reviewer**: Claude Opus 4.5 (Adversarial Code Review)

#### Issues Found & Fixed

| ID | 严重性 | 问题 | 修复状态 |
|----|--------|------|----------|
| CR2-HIGH-1 | 🔴 HIGH | 后端 `validateTemplateStructure()` 缺少节点数量上限校验，可被恶意用户绕过前端发送超大模板 | ✅ Fixed |
| CR2-HIGH-2 | 🔴 HIGH | 后端未校验 `edge.dependencyType`（前端已校验），允许任意字符串写入数据库 | ✅ Fixed |
| CR2-MEDIUM-1 | 🟡 MEDIUM | 后端测试未覆盖 CR2-HIGH-1/2 的新增校验逻辑 | ✅ Fixed |

#### Fixes Applied

**CR2-HIGH-1 & CR2-HIGH-2**: `packages/plugins/plugin-template/src/server/templates/templates.service.ts`
- 导入 `MAX_CLIPBOARD_NODES` 和 `DependencyTypeSchema` from `@cdm/types`
- 新增 `countTemplateNodes()` 私有方法递归计算节点数
- 在 `validateTemplateStructure()` 中添加节点数量校验（超过 100 拒绝）
- 在 `validateTemplateStructure()` 中添加 `DependencyTypeSchema.safeParse()` 校验

**CR2-MEDIUM-1**: `packages/plugins/plugin-template/src/server/templates/__tests__/templates.service.spec.ts`
- 新增测试 TC-5.2-SVC-8: 超大模板拒绝校验
- 新增测试 TC-5.2-SVC-9: 非法 dependencyType 拒绝校验
- 新增测试 TC-5.2-SVC-10: 合法 dependencyType 通过校验

#### Test Results

- 后端测试: 44 passed ✅
- 前端测试: 462 passed ✅

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Test Design (测试设计)

### 测试策略概述

| 测试层级 | 工具 | 目标 | 覆盖率目标 |
|----------|------|------|-----------| 
| 单元测试 (后端) | Jest | Repository/Service 创建逻辑 | 80%+ |
| 单元测试 (前端) | Vitest | Hooks 保存/插入逻辑 | 80%+ |
| 组件测试 | Vitest + Testing Library | SaveTemplateDialog 交互 | 关键路径 |
| E2E 测试 | Playwright | 保存+插入用户流程 | 关键场景 |

### AC 追溯矩阵

| AC | 测试用例 | 测试类型 |
|----|----------|----------|
| AC1: 子树选择与保存入口 | TC-EXTRACT-1~5, TC-SAVE-UI-1, TC-E2E-SAVE-1 | 单元/组件/E2E |
| AC2: 模板信息填写 | TC-SAVE-UI-1~2, TC-SAVE-UI-7 | 组件 |
| AC3: 模板持久化 | TC-REPO-CREATE-1~3, TC-SVC-SAVE-1~5, TC-HOOK-SAVE-1~2, TC-SAVE-UI-3~6 | 单元/组件 |
| AC4: 模板库预览与拖拽 | TC-E2E-SAVE-2, TC-E2E-INSERT-1 | E2E |
| AC5: 模板实例化保真 | TC-HOOK-INSERT-1~3, TC-E2E-INSERT-2~3 | 单元/E2E |
| AC6: 模板可见性控制 | TC-SVC-SAVE-5, TC-SAVE-UI-7, TC-E2E-VISIBILITY-1 | 单元/组件/E2E |

### 关键测试用例代码示例

#### TC-SVC-SAVE-1: 验证模板结构完整性

```typescript
describe('TemplatesService.saveSubtreeAsTemplate', () => {
  it('throws BadRequestException for missing rootNode', async () => {
    await expect(
      service.saveSubtreeAsTemplate({
        name: 'Test Template',
        structure: {} as any, // Missing rootNode
        creatorId: 'user-1',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for rootNode without label', async () => {
    await expect(
      service.saveSubtreeAsTemplate({
        name: 'Test Template',
        structure: { rootNode: {} as any },
        creatorId: 'user-1',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('successfully creates template with valid structure', async () => {
    mockRepo.create.mockResolvedValue({
      id: 'tpl-1',
      name: 'Test Template',
      status: 'PUBLISHED',
    });

    const result = await service.saveSubtreeAsTemplate({
      name: 'Test Template',
      structure: {
        rootNode: { label: 'Root', children: [{ label: 'Child' }] },
      },
      creatorId: 'user-1',
    });

    expect(result.id).toBe('tpl-1');
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Template',
      creatorId: 'user-1',
    }));
  });
});
```

#### TC-SAVE-UI-3: 提交时调用 saveAsTemplate

```typescript
describe('SaveTemplateDialog', () => {
  const mockSaveAsTemplate = vi.fn();
  
  beforeEach(() => {
    vi.mocked(useTemplates).mockReturnValue({
      ...defaultMock,
      saveAsTemplate: mockSaveAsTemplate,
    });
  });

  it('calls saveAsTemplate on form submit', async () => {
    mockSaveAsTemplate.mockResolvedValue({ id: 'tpl-new' });
    
    render(
      <SaveTemplateDialog
        open={true}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
        structure={mockStructure}
        userId="test-user"
      />
    );

    // Fill form
    await userEvent.type(screen.getByLabelText('模板名称'), '我的模板');
    await userEvent.type(screen.getByLabelText('描述'), '这是一个测试模板');
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: '保存模板' }));

    expect(mockSaveAsTemplate).toHaveBeenCalledWith({
      name: '我的模板',
      description: '这是一个测试模板',
      structure: mockStructure,
    });
  });
});
```

---

## Previous Story Intelligence

### Story 5.1 实现学习

1. **Repository 模式**: 参考 `templates.repository.ts` 的 `findAll`/`findById` 实现模式
2. **Service 层验证**: 在创建前进行业务规则验证（状态检查、结构验证）
3. **Hook 设计**: `useTemplates` 采用 loading/error/data 三态模式
4. **组件结构**: Dialog 采用左右分栏布局（列表+预览）

### 代码模式复用

| 模式 | Story 5.1 实现 | Story 5.2 复用 |
|------|----------------|----------------|
| 模板结构递归 | `generateNodesFromStructure()` | 反向提取 `buildTemplateNode()` |
| 节点类型映射 | `NODE_TYPE_MAP` 常量 | 直接复用 |
| 分类获取 | `findCategories()` | 下拉选择器数据源 |
| 预览组件 | `TemplateNodePreview` | SaveDialog 中复用 |

---

## Latest Tech Information

### @dnd-kit/core 拖拽集成

项目已安装 `@dnd-kit/core 6.3.1`，用于模板拖拽需注意：

```typescript
// 拖拽上下文需在 App 级别提供
import { DndContext, DragEndEvent } from '@dnd-kit/core';

// 拖拽源 ID 格式约定
const TEMPLATE_DRAGGABLE_PREFIX = 'template:';

// 处理 drop 事件
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (active.id.startsWith(TEMPLATE_DRAGGABLE_PREFIX) && over?.id === 'canvas') {
    const templateId = active.id.replace(TEMPLATE_DRAGGABLE_PREFIX, '');
    // 处理模板插入
  }
}
```

### Yjs 协作数据流

模板插入必须遵循 Yjs-First 原则：

```typescript
// ✅ 正确：通过 Yjs 事务插入
ydoc.transact(() => {
  nodesToInsert.forEach(node => nodesMap.set(node.id, node));
});

// ❌ 错误：直接调用 REST API
await api.createNodes(nodesToInsert); // 会导致协作脑裂
```

---

## Architecture Compliance Checklist

- [ ] **Repository Pattern**: 数据库操作封装在 Repository 层
- [ ] **Service Layer**: 业务逻辑在 Service 层，不在 Controller
- [ ] **DTO Validation**: 使用 class-validator 进行请求验证
- [ ] **Type Sharing**: 接口定义在 `@cdm/types` 包 (TemplateEdge, CreateTemplateRequest)
- [ ] **Yjs-First**: 前端节点修改通过 Yjs 事务 (useTemplateInsert)
- [ ] **Hook-First**: UI 逻辑封装在自定义 Hook (useTemplateInsert)
- [ ] **File Size**: 新文件控制在 300 行以内
- [ ] **Edge Support**: 正确保存和重建依赖边
- [ ] **Visibility Control**: 支持公开/私有模板

---

## Project Context Reference

参考 `docs/project-context.md` 中的关键规则：

- **类型共享**: 从 `@cdm/types` 导入所有共享类型
- **Yjs-First**: UI 组件不直接修改本地状态
- **Repository Pattern**: Service 不直接调用 `prisma.*`
- **测试 Co-location**: 测试文件放在组件同目录

---

## Story Completion Status

**Status**: review
**Code Review Round 2 completed - all HIGH issues fixed (2026-01-04)**

All acceptance criteria implemented. Ready for final verification.
