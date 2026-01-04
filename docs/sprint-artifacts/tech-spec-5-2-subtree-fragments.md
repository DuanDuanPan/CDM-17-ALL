# Tech-Spec: Story 5.2 子树模板保存与复用

**Created:** 2026-01-02
**Status:** Ready for Development
**Story:** [5-2-subtree-fragments.md](./5-2-subtree-fragments.md)

---

## Overview

### Problem Statement

用户在脑图中创建了高质量的节点结构后，希望能够将其保存为模板以便在其他项目或位置复用。目前 Story 5.1 仅支持从预设模板库创建新图谱，缺少用户自定义模板的保存和复用能力。

### Solution

扩展现有 `plugin-template` 插件，新增以下能力：
1. **保存子树为模板**: 从画布选中的节点提取完整结构（包含层级关系、依赖关系、metadata）
2. **可见性控制**: 支持公开（团队可见）和私有（仅创建者可见）两种模式
3. **智能插入**: 拖拽模板到画布时，根据上下文智能决定插入位置

### Scope

#### In Scope
- ✅ 右键菜单 "保存为模板" 入口
- ✅ 保存模板对话框（名称、描述、分类、可见性）
- ✅ 后端 `POST /templates` API
- ✅ 模板结构包含：节点基本信息、metadata、层级关系、依赖关系 (edges)
- ✅ 模板库中预览和拖拽已保存的模板
- ✅ 智能插入（选中节点则作为子节点，否则作为根级节点）

#### Out of Scope
- ❌ 模板编辑/删除功能（后续 Story）
- ❌ 模板版本管理
- ❌ 团队权限细粒度控制
- ❌ AI 模板推荐

---

## Context for Development

### Codebase Patterns

#### 1. 现有模板类型结构 (需扩展)

**文件:** `packages/types/src/template-types.ts`

当前 `TemplateNode` 仅支持层级关系（通过 `children`），需扩展支持依赖边：

```typescript
// 当前结构
export interface TemplateNode {
  label: string;
  type?: NodeType;
  metadata?: Record<string, unknown>;
  children?: TemplateNode[];
}

// 需扩展为
export interface TemplateNode {
  label: string;
  type?: NodeType;
  metadata?: Record<string, unknown>;
  children?: TemplateNode[];
  // NEW: 用于在 instantiate 时重建节点 ID 映射
  _tempId?: string; // 临时 ID，用于依赖边引用
}

// NEW: 模板边定义
export interface TemplateEdge {
  sourceRef: string; // _tempId of source node
  targetRef: string; // _tempId of target node
  kind: 'hierarchical' | 'dependency';
  dependencyType?: 'FS' | 'SS' | 'FF' | 'SF';
}

// 扩展模板结构
export interface TemplateStructure {
  rootNode: TemplateNode;
  edges?: TemplateEdge[]; // NEW: 依赖边
}
```

#### 2. 右键菜单模式

**文件:** `apps/web/components/graph/parts/NodeContextMenu.tsx`

菜单项通过 props 传入回调函数，需要新增 `onSaveAsTemplate` 回调：

```typescript
export interface NodeContextMenuProps {
  // ... existing props
  onSaveAsTemplate?: () => void; // NEW
}
```

#### 3. Yjs-First 数据流

节点插入必须通过 Yjs 事务，不能直接调用 REST API：

```typescript
// ✅ 正确
ydoc.transact(() => {
  nodes.forEach(n => nodesMap.set(n.id, n));
  edges.forEach(e => edgesMap.set(e.id, e));
});

// ❌ 错误
await api.createNodes(nodes); // 会导致协作脑裂
```

#### 4. 模板 API 模式

**文件:** `apps/web/lib/api/templates.ts`

遵循现有 API 封装模式：

```typescript
export const templatesApi = {
  // 现有
  list: (options?: TemplateQueryOptions) => fetch(...)
  getById: (id: string) => fetch(...)
  instantiate: (id: string, userId: string, name?: string) => fetch(...)
  
  // NEW
  create: (data: CreateTemplateRequest, userId: string) => fetch(...)
}
```

### Files to Reference

| 文件 | 用途 |
|------|------|
| `packages/types/src/template-types.ts` | 模板类型定义（需扩展） |
| `packages/types/src/edge-types.ts` | 边类型定义（EdgeKind, DependencyType） |
| `packages/plugins/plugin-template/src/server/templates/templates.repository.ts` | Repository 模式参考 |
| `packages/plugins/plugin-template/src/server/templates/templates.service.ts` | Service 业务逻辑参考 |
| `apps/web/components/graph/parts/NodeContextMenu.tsx` | 右键菜单扩展点 |
| `apps/web/components/TemplateLibrary/TemplateLibraryDialog.tsx` | 拖拽功能参考 |
| `apps/web/hooks/useTemplates.ts` | Hook 扩展点 |

### Technical Decisions

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| **模板可见性** | 公开/私有/团队 | 公开+私有 | 简化实现，满足基本需求 |
| **插入位置** | 固定根级/智能判断 | 智能判断 | 更好的用户体验 |
| **边保存方式** | 仅层级/含依赖 | 含依赖边 | 完整保留业务语义 |
| **ID 映射策略** | 原 ID 保留/全部重生成 | 全部重生成 | 避免 ID 冲突 |
| **数据库字段** | 新表/现有 Template.structure | 复用现有 | 利用 JSON 灵活性 |

---

## Implementation Plan

### Phase 1: 类型定义扩展

#### Task 1.1: 扩展 TemplateStructure 类型

**文件:** `packages/types/src/template-types.ts`

```typescript
// 1. 添加 TemplateEdge 接口
export interface TemplateEdge {
  sourceRef: string;  // 源节点的 _tempId
  targetRef: string;  // 目标节点的 _tempId
  kind: EdgeKind;     // 'hierarchical' | 'dependency'
  dependencyType?: DependencyType; // 仅 dependency 边需要
}

// 2. 扩展 TemplateNode
export interface TemplateNode {
  label: string;
  type?: NodeType;
  metadata?: Record<string, unknown>;
  children?: TemplateNode[];
  _tempId?: string; // 新增：用于边引用
}

// 3. 扩展 TemplateStructure
export interface TemplateStructure {
  rootNode: TemplateNode;
  edges?: TemplateEdge[]; // 新增：依赖边
}

// 4. 创建模板请求
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  categoryId?: string;
  structure: TemplateStructure;
  defaultClassification?: string;
  isPublic?: boolean; // 新增：可见性控制
}

// 5. 创建模板响应
export interface CreateTemplateResponse {
  id: string;
  name: string;
  createdAt: string;
}
```

- [ ] 添加 `TemplateEdge` 接口
- [ ] 扩展 `TemplateNode` 添加 `_tempId`
- [ ] 扩展 `TemplateStructure` 添加 `edges`
- [ ] 添加 `CreateTemplateRequest` 接口
- [ ] 添加 `CreateTemplateResponse` 接口
- [ ] 更新 `index.ts` 导出

### Phase 2: 后端 API 开发

#### Task 2.1: 创建 DTO

**文件:** `packages/plugins/plugin-template/src/server/templates/dto/create-template.dto.ts`

```typescript
import { IsString, IsOptional, IsObject, IsBoolean, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsObject()
  structure: any; // Will be validated in service

  @IsString()
  @IsOptional()
  defaultClassification?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean; // default: true
}
```

- [ ] 创建 `CreateTemplateDto` 类
- [ ] 添加字段验证装饰器

#### Task 2.2: 扩展 Repository

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.repository.ts`

```typescript
// 新增方法
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
      status: TemplateStatus.PUBLISHED,
      // isPublic 通过 metadata 或单独字段存储
    },
    include: { category: true },
  });
  return this.mapToTemplate(template);
}

// 扩展 findAll 支持 creatorId 筛选
async findAll(options?: TemplateQueryOptions & { 
  creatorId?: string;
  includePrivate?: boolean;
}): Promise<TemplateListItem[]> {
  // ... 扩展 where 条件
}
```

- [ ] 实现 `create()` 方法
- [ ] 扩展 `findAll()` 支持 `creatorId` 筛选

#### Task 2.3: 扩展 Service

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.service.ts`

```typescript
/**
 * 保存子树为模板
 */
async saveSubtreeAsTemplate(
  data: CreateTemplateRequest & { creatorId: string }
): Promise<Template> {
  // 1. 验证结构
  this.validateTemplateStructure(data.structure);
  
  // 2. 验证分类（如果提供）
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

/**
 * 验证模板结构完整性
 */
private validateTemplateStructure(structure: TemplateStructure): void {
  if (!structure.rootNode || !structure.rootNode.label) {
    throw new BadRequestException('Template must have a root node with label');
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

/**
 * 收集所有节点的 _tempId
 */
private collectTempIds(node: TemplateNode, ids: Set<string> = new Set()): Set<string> {
  if (node._tempId) ids.add(node._tempId);
  node.children?.forEach(child => this.collectTempIds(child, ids));
  return ids;
}
```

- [ ] 实现 `saveSubtreeAsTemplate()` 方法
- [ ] 实现 `validateTemplateStructure()` 验证逻辑
- [ ] 扩展 `generateGraphFromTemplate()` 支持边重建

#### Task 2.4: 扩展 Controller

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.controller.ts`

```typescript
@Post()
async createTemplate(
  @Query('userId') userId: string,
  @Body(new ValidationPipe({ whitelist: true })) dto: CreateTemplateDto
): Promise<{ template: CreateTemplateResponse }> {
  if (!userId) {
    throw new BadRequestException('userId query parameter is required');
  }
  
  const template = await this.service.saveSubtreeAsTemplate({
    ...dto,
    creatorId: userId,
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

- [ ] 添加 `POST /templates` 端点
- [ ] 实现请求验证

### Phase 3: 前端实现

#### Task 3.1: 子树提取工具函数

**文件:** `apps/web/lib/graph/subtree-extractor.ts` (NEW)

```typescript
import type { TemplateNode, TemplateEdge, TemplateStructure } from '@cdm/types';
import type { Node, Edge } from '@antv/x6';

/**
 * 从选中的节点提取模板结构
 */
export function extractSubtreeAsTemplate(
  selectedNodes: Node[],
  allNodes: Node[],
  allEdges: Edge[]
): TemplateStructure {
  // 1. 找到选中节点中的根节点（父节点不在选中列表中的节点）
  const selectedIds = new Set(selectedNodes.map(n => n.id));
  const rootNodes = selectedNodes.filter(node => {
    const parentId = node.getData()?.parentId;
    return !parentId || !selectedIds.has(parentId);
  });
  
  if (rootNodes.length === 0) {
    throw new Error('No root node found in selection');
  }
  
  // 如果有多个根节点，创建虚拟根
  let rootNode: TemplateNode;
  const tempIdMap = new Map<string, string>(); // nodeId -> tempId
  
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

function buildTemplateNode(
  node: Node,
  allNodes: Node[],
  selectedIds: Set<string>,
  tempIdMap: Map<string, string>
): TemplateNode {
  const data = node.getData() || {};
  const tempId = generateTempId();
  tempIdMap.set(node.id, tempId);
  
  // 找子节点
  const children = allNodes
    .filter(n => n.getData()?.parentId === node.id && selectedIds.has(n.id))
    .map(child => buildTemplateNode(child, allNodes, selectedIds, tempIdMap));
  
  return {
    label: data.label || node.id,
    type: data.type !== 'ORDINARY' ? data.type : undefined,
    metadata: sanitizeMetadata(data.metadata),
    _tempId: tempId,
    children: children.length > 0 ? children : undefined,
  };
}

function extractDependencyEdges(
  allEdges: Edge[],
  selectedIds: Set<string>,
  tempIdMap: Map<string, string>
): TemplateEdge[] {
  return allEdges
    .filter(edge => {
      const data = edge.getData() || {};
      const sourceId = edge.getSourceCellId();
      const targetId = edge.getTargetCellId();
      // 只保留两端都在选中范围内的依赖边
      return data.kind === 'dependency' && 
             selectedIds.has(sourceId) && 
             selectedIds.has(targetId);
    })
    .map(edge => {
      const data = edge.getData() || {};
      return {
        sourceRef: tempIdMap.get(edge.getSourceCellId())!,
        targetRef: tempIdMap.get(edge.getTargetCellId())!,
        kind: data.kind as 'dependency',
        dependencyType: data.dependencyType,
      };
    });
}

function sanitizeMetadata(metadata: any): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  // 移除敏感字段
  const { graphId, creatorId, createdAt, updatedAt, ...safe } = metadata;
  return Object.keys(safe).length > 0 ? safe : undefined;
}

function generateTempId(): string {
  return `temp_${Math.random().toString(36).substr(2, 9)}`;
}
```

- [ ] 创建 `subtree-extractor.ts` 文件
- [ ] 实现 `extractSubtreeAsTemplate()` 函数
- [ ] 实现 `buildTemplateNode()` 递归构建
- [ ] 实现 `extractDependencyEdges()` 边提取

#### Task 3.2: SaveTemplateDialog 组件

**文件:** `apps/web/components/TemplateLibrary/SaveTemplateDialog.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTemplates } from '@/hooks/useTemplates';
import type { TemplateStructure, TemplateCategory } from '@cdm/types';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structure: TemplateStructure;
  userId: string;
  onSaved: (templateId: string) => void;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  structure,
  userId,
  onSaved,
}: SaveTemplateDialogProps) {
  const { categories, fetchCategories, saveAsTemplate, loading, error } = useTemplates(userId);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [isPublic, setIsPublic] = useState(true);
  
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);
  
  const handleSave = async () => {
    try {
      const result = await saveAsTemplate({
        name,
        description: description || undefined,
        categoryId,
        structure,
        isPublic,
      });
      onSaved(result.id);
      onOpenChange(false);
    } catch (err) {
      // Error handled by hook
    }
  };
  
  // ... Dialog UI (约 150 行)
}
```

- [ ] 创建对话框组件
- [ ] 实现表单字段（名称、描述、分类、可见性）
- [ ] 实现结构预览区
- [ ] 集成 Toast 提示

#### Task 3.3: 扩展 useTemplates Hook

**文件:** `apps/web/hooks/useTemplates.ts`

```typescript
// 新增方法
const saveAsTemplate = async (
  data: Omit<CreateTemplateRequest, 'creatorId'>
): Promise<CreateTemplateResponse> => {
  setSaveLoading(true);
  setSaveError(null);
  try {
    const response = await fetch(`/api/templates?userId=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to save template');
    }
    const { template } = await response.json();
    toast.success('模板保存成功');
    return template;
  } catch (err: any) {
    setSaveError(err.message);
    toast.error(err.message);
    throw err;
  } finally {
    setSaveLoading(false);
  }
};

// 返回值扩展
return {
  // ... existing
  saveAsTemplate,
  saveLoading,
  saveError,
};
```

- [ ] 添加 `saveAsTemplate()` 方法
- [ ] 添加 `saveLoading` / `saveError` 状态

#### Task 3.4: 扩展 NodeContextMenu

**文件:** `apps/web/components/graph/parts/NodeContextMenu.tsx`

```typescript
// 扩展 Props
export interface NodeContextMenuProps {
  // ... existing
  onSaveAsTemplate?: () => void; // NEW
}

// 在菜单中添加按钮
{hasSelection && (
  <>
    {/* 现有复制/剪切按钮 */}
    <div className="border-t border-gray-100 my-1" />
    <button
      onClick={() => handleAction(onSaveAsTemplate)}
      className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
    >
      <span className="w-4">📦</span>保存为模板
    </button>
  </>
)}
```

- [ ] 添加 `onSaveAsTemplate` prop
- [ ] 添加 "保存为模板" 菜单项

#### Task 3.5: GraphComponent 集成

**文件:** `apps/web/components/graph/GraphComponent.tsx`

```typescript
// 1. 状态
const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
const [subtreeStructure, setSubtreeStructure] = useState<TemplateStructure | null>(null);

// 2. 处理函数
const handleSaveAsTemplate = useCallback(() => {
  if (!graph) return;
  const selectedNodes = graph.getSelectedCells().filter(cell => cell.isNode());
  if (selectedNodes.length === 0) {
    toast.error('请先选择要保存的节点');
    return;
  }
  
  try {
    const allNodes = graph.getNodes();
    const allEdges = graph.getEdges();
    const structure = extractSubtreeAsTemplate(selectedNodes, allNodes, allEdges);
    setSubtreeStructure(structure);
    setSaveTemplateDialogOpen(true);
  } catch (err: any) {
    toast.error(err.message);
  }
}, [graph]);

// 3. 传递给 NodeContextMenu
<NodeContextMenu
  // ... existing props
  onSaveAsTemplate={handleSaveAsTemplate}
/>

// 4. 渲染 SaveTemplateDialog
{subtreeStructure && (
  <SaveTemplateDialog
    open={saveTemplateDialogOpen}
    onOpenChange={setSaveTemplateDialogOpen}
    structure={subtreeStructure}
    userId={userId}
    onSaved={(id) => toast.success(`模板已保存: ${id}`)}
  />
)}
```

- [ ] 添加状态管理
- [ ] 实现 `handleSaveAsTemplate` 处理函数
- [ ] 集成 `SaveTemplateDialog`

#### Task 3.6: 模板插入功能

**文件:** `apps/web/hooks/useTemplateInsert.ts` (NEW)

```typescript
import { useCallback } from 'react';
import type { Graph } from '@antv/x6';
import type { TemplateStructure } from '@cdm/types';
import * as Y from 'yjs';

export function useTemplateInsert(
  graph: Graph | null,
  ydoc: Y.Doc | null,
  userId: string
) {
  const insertTemplate = useCallback(async (
    templateId: string,
    position: { x: number; y: number },
    parentNodeId?: string | null
  ) => {
    if (!graph || !ydoc) return;
    
    // 1. 获取模板
    const response = await fetch(`/api/templates/${templateId}`);
    const { template } = await response.json();
    
    // 2. 生成节点和边
    const { nodes, edges } = generateFromTemplate(
      template.structure,
      position,
      parentNodeId
    );
    
    // 3. 通过 Yjs 事务插入
    const nodesMap = ydoc.getMap('nodes');
    const edgesMap = ydoc.getMap('edges');
    
    ydoc.transact(() => {
      nodes.forEach(node => nodesMap.set(node.id, node));
      edges.forEach(edge => edgesMap.set(edge.id, edge));
    });
    
    return nodes.map(n => n.id);
  }, [graph, ydoc]);
  
  return { insertTemplate };
}

function generateFromTemplate(
  structure: TemplateStructure,
  basePosition: { x: number; y: number },
  parentNodeId?: string | null
): { nodes: any[]; edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];
  const tempIdToNewId = new Map<string, string>();
  
  // 递归生成节点
  function processNode(
    templateNode: any,
    parentId: string | null,
    depth: number,
    siblingIndex: number
  ): string {
    const newId = `n_${crypto.randomUUID()}`;
    if (templateNode._tempId) {
      tempIdToNewId.set(templateNode._tempId, newId);
    }
    
    nodes.push({
      id: newId,
      label: templateNode.label,
      type: templateNode.type || 'ORDINARY',
      x: basePosition.x + depth * 200,
      y: basePosition.y + siblingIndex * 80,
      parentId,
      metadata: templateNode.metadata || {},
    });
    
    templateNode.children?.forEach((child: any, index: number) => {
      processNode(child, newId, depth + 1, index);
    });
    
    return newId;
  }
  
  const rootId = processNode(structure.rootNode, parentNodeId || null, 0, 0);
  
  // 重建依赖边
  structure.edges?.forEach(templateEdge => {
    const sourceId = tempIdToNewId.get(templateEdge.sourceRef);
    const targetId = tempIdToNewId.get(templateEdge.targetRef);
    if (sourceId && targetId) {
      edges.push({
        id: `e_${crypto.randomUUID()}`,
        source: sourceId,
        target: targetId,
        kind: templateEdge.kind,
        dependencyType: templateEdge.dependencyType,
      });
    }
  });
  
  return { nodes, edges };
}
```

- [ ] 创建 `useTemplateInsert` Hook
- [ ] 实现 `generateFromTemplate()` 节点/边生成
- [ ] 处理 ID 映射和边重建

### Phase 4: 测试

#### Task 4.1: 后端单元测试

**文件:** `packages/plugins/plugin-template/src/server/templates/__tests__/`

- [ ] TC-CREATE-1: `saveSubtreeAsTemplate` 验证结构必须有 rootNode
- [ ] TC-CREATE-2: `saveSubtreeAsTemplate` 验证边引用有效性
- [ ] TC-CREATE-3: `saveSubtreeAsTemplate` 成功创建模板
- [ ] TC-CREATE-4: `saveSubtreeAsTemplate` 支持 isPublic 参数
- [ ] TC-REPO-1: `create()` 正确保存含边的结构

#### Task 4.2: 前端单元测试

**文件:** `apps/web/__tests__/`

- [ ] TC-EXTRACT-1: `extractSubtreeAsTemplate` 正确提取单根子树
- [ ] TC-EXTRACT-2: `extractSubtreeAsTemplate` 正确提取多根子树
- [ ] TC-EXTRACT-3: `extractSubtreeAsTemplate` 正确提取依赖边
- [ ] TC-HOOK-1: `saveAsTemplate` 成功保存
- [ ] TC-HOOK-2: `insertTemplate` 正确生成节点和边

#### Task 4.3: 组件测试

**文件:** `apps/web/__tests__/components/TemplateLibrary/SaveTemplateDialog.test.tsx`

- [ ] TC-UI-1: 表单字段正确渲染
- [ ] TC-UI-2: 名称非空验证
- [ ] TC-UI-3: 保存按钮触发 API 调用
- [ ] TC-UI-4: 成功后关闭对话框

#### Task 4.4: E2E 测试

**文件:** `apps/web/e2e/template-save.spec.ts`

- [ ] TC-E2E-1: 完整保存子树流程
- [ ] TC-E2E-2: 保存的模板出现在模板库
- [ ] TC-E2E-3: 拖拽模板插入画布
- [ ] TC-E2E-4: 验证依赖边正确重建

---

## Acceptance Criteria

- [ ] **AC1:** 右键选中节点可弹出包含 "保存为模板" 的菜单
- [ ] **AC2:** 保存对话框支持输入名称、描述、选择分类、设置可见性
- [ ] **AC3:** POST API 成功持久化模板到数据库
- [ ] **AC4:** 保存的模板可在模板库中预览
- [ ] **AC5:** 拖拽模板到画布可正确插入节点，含依赖边
- [ ] **AC6:** 可见性控制生效（私有模板仅创建者可见）

---

## Additional Context

### Dependencies

- **Story 5.1 (Template Library)**: 必须已完成，提供基础设施
- **@dnd-kit/core 6.3.1**: 拖拽功能
- **Yjs 13.6.27**: 协作数据流

### Testing Strategy

| 层级 | 覆盖率目标 | 关键场景 |
|------|-----------|---------|
| 单元测试 | 80%+ | 结构验证、边提取、ID 映射 |
| 组件测试 | 关键路径 | 对话框交互、表单验证 |
| E2E 测试 | 3-4 场景 | 保存→查看→插入完整流程 |

### Notes

1. **性能考虑**: 大型子树（100+ 节点）保存时考虑添加进度指示
2. **向后兼容**: `edges` 字段为可选，现有模板无边也能正常工作
3. **未来扩展**: 模板编辑/删除功能可复用此基础设施

---

**Recommended Next Step:** 
在 fresh context 中运行 `dev-story` 工作流实现此技术规格。
