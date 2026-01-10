# Tech-Spec: Story 9.2 多维度组织视图 (Multi-Dimensional Organization)

**Created:** 2026-01-10
**Status:** Ready for Development

## Overview

### Problem Statement

Story 9.1 实现了数据资源库的基础 Drawer 组件，支持网格/列表视图切换和搜索过滤。但用户需要更灵活的方式来组织和查找数据资产：

1. **按 PBS 结构查看** - 工程师需要按照产品分解结构浏览关联的数据
2. **按任务查看** - 项目经理需要按任务状态分组查看交付物和过程数据
3. **按文件夹管理** - 用户需要自定义文件夹结构来组织资产

当前的扁平列表/网格视图无法满足这些多维度的组织需求。

### Solution

在 `DataLibraryDrawer` 中添加 **Tab 切换组件 (`OrganizationTabs`)**，支持三种组织视图：

1. **PBS View** - 左侧显示 PBS 树（从脑图节点同步），右侧显示选中 PBS 节点关联的资产
2. **Task View** - 按任务状态分组（待办/进行中/已完成），每个任务展开后显示关联的交付物
3. **Folder View** - 虚拟文件夹树，支持 CRUD 和拖拽资产到文件夹

### Scope

**In Scope:**
- 三种组织视图的 Tab 切换 UI
- PBS 视图：从 Yjs 同步 PBS 节点，显示关联资产
- 任务视图：按状态分组，显示交付物
- 文件夹视图：CRUD 操作，拖拽移动资产
- Tab 切换时保持各视图的展开/选中状态

**Out of Scope:**
- 文件夹的权限控制（后续 Story）
- 跨图资产共享
- 资产版本管理

---

## Context for Development

### Codebase Patterns

#### 前端 Feature-Sliced 架构
```
apps/web/features/data-library/
├── components/     # UI 组件
├── hooks/          # 数据获取 Hooks (TanStack Query)
├── api/            # API 客户端函数
└── __tests__/      # 测试文件
```

#### 后端 Repository 模式
```
apps/api/src/modules/data-management/
├── data-asset.controller.ts   # HTTP 端点
├── data-asset.service.ts      # 业务逻辑
├── data-asset.repository.ts   # 数据访问 (Prisma)
└── data-management.module.ts  # NestJS Module
```

#### 既有组件复用清单
| 组件 | 位置 | 复用场景 |
|------|------|----------|
| `DataLibraryDrawer` | `features/data-library/components/` | 主容器，添加 Tab 切换 |
| `AssetGrid` / `AssetList` | 同上 | 在各视图中展示资产列表 |
| `AssetCard` | 同上 | 资产卡片渲染 |
| `DataAssetRepository` | `modules/data-management/` | 扩展查询方法 |
| `DataFolderRepository` | 同上 | 已有基础 CRUD，需扩展 |
| `NodeDataLinkRepository` | 同上 | 按节点查找资产 |

### Files to Reference

**前端核心文件：**
- `apps/web/features/data-library/components/DataLibraryDrawer.tsx` - 集成组织视图 Tabs，并保持 Story 9.1 的搜索/筛选/视图切换行为
- `apps/web/features/data-library/hooks/useDataAssets.ts` - 既有资产列表 Query（全局过滤的 canonical source）
- `apps/web/features/data-library/api/data-assets.ts` - 扩展 folders/links 的 API client

**后端核心文件：**
- `apps/api/src/modules/data-management/data-asset.repository.ts` - `DataFolderRepository` / `NodeDataLinkRepository`（补齐 include folder + 批量查询）
- `apps/api/src/modules/data-management/data-asset.service.ts` - folder/link 业务逻辑（补齐 folders:update / links:byNodes）
- `apps/api/src/modules/data-management/data-asset.controller.ts` - `/api/data-assets/*` 端点（已含 folders/links；补齐新 action）

**数据模型：**
- `packages/database/prisma/schema.prisma` - DataFolder, DataAsset, NodeDataLink 模型

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tab 组件 | 轻量 Tabs（`@cdm/ui` `Button` + `role="tablist"`） | `packages/ui` 未提供 Tabs/ContextMenu 原语，避免引入新依赖与错误 import |
| 树组件 | 自定义递归 `TreeNode` | 需要支持 PBS/文件夹两种数据源 |
| 拖拽库 | `@dnd-kit/core`（可选 `@dnd-kit/sortable`） | Repo 既有使用（Kanban），与现有模式一致 |
| PBS 数据源 | GraphContext 的 `yDoc.getMap('nodes')`，过滤 `nodeType === NodeType.PBS` | `type` 为 legacy mindmap 字段（root/topic/subtopic），不可用于语义类型 |
| 任务分组 | 前端从 `yDoc` 提取 Task（`nodeType === NodeType.TASK`），按 `TaskProps.status` groupBy | 与 Kanban 的 “Yjs → projection” 模式一致 |
| 视图状态持久化 | Zustand slice | 独立于 URL，Drawer 内部状态 |

---

## Implementation Plan

### Phase 1: Tab 基础架构

#### Task 1.1: 创建 OrganizationTabs 组件

**文件**: `apps/web/features/data-library/components/OrganizationTabs.tsx`

```tsx
'use client';

import { FolderTree, ListTodo, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@cdm/ui';
import { PbsTreeView } from './PbsTreeView';
import { TaskGroupView } from './TaskGroupView';
import { FolderTreeView } from './FolderTreeView';
import { AssetGrid } from './AssetGrid';
import { AssetList } from './AssetList';
import { usePbsAssets } from '../hooks/usePbsAssets';
import type { DataAssetWithFolder } from '@cdm/types';

type OrgTabKey = 'pbs' | 'task' | 'folder';

interface OrganizationTabsProps {
  graphId: string;
  viewMode: 'grid' | 'list';
  /** 已由 DataLibraryDrawer 全局搜索/筛选后的资产集合 */
  assets: DataAssetWithFolder[];
}

export function OrganizationTabs({ graphId, viewMode, assets }: OrganizationTabsProps) {
  const [activeTab, setActiveTab] = useState<OrgTabKey>('pbs');
  const [selectedPbsNodeId, setSelectedPbsNodeId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // PBS View：通过 NodeDataLink API 获取“节点 → 资产”关联，再与 assets 求交集
  const { assetIds: pbsAssetIds } = usePbsAssets({ selectedNodeId: selectedPbsNodeId });
  const pbsAssets = selectedPbsNodeId
    ? assets.filter((a) => pbsAssetIds.has(a.id))
    : assets;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div role="tablist" aria-label="Organization views" className="flex gap-2 mb-4">
        <Button
          role="tab"
          aria-selected={activeTab === 'pbs'}
          variant={activeTab === 'pbs' ? 'default' : 'outline'}
          className="flex items-center gap-2"
          onClick={() => setActiveTab('pbs')}
        >
          <FolderTree className="w-4 h-4" />
          PBS
        </Button>
        <Button
          role="tab"
          aria-selected={activeTab === 'task'}
          variant={activeTab === 'task' ? 'default' : 'outline'}
          className="flex items-center gap-2"
          onClick={() => setActiveTab('task')}
        >
          <ListTodo className="w-4 h-4" />
          任务
        </Button>
        <Button
          role="tab"
          aria-selected={activeTab === 'folder'}
          variant={activeTab === 'folder' ? 'default' : 'outline'}
          className="flex items-center gap-2"
          onClick={() => setActiveTab('folder')}
        >
          <FolderOpen className="w-4 h-4" />
          文件夹
        </Button>
      </div>

      <div role="tabpanel" hidden={activeTab !== 'pbs'} className="flex-1 min-h-0">
        <div className="flex gap-4 h-full">
          <div className="w-1/3 border-r">
            <PbsTreeView
              graphId={graphId}
              selectedId={selectedPbsNodeId}
              onSelect={setSelectedPbsNodeId}
            />
          </div>
          <div className="flex-1">
            {viewMode === 'grid' ? (
              <AssetGrid assets={pbsAssets} />
            ) : (
              <AssetList assets={pbsAssets} />
            )}
          </div>
        </div>
      </div>

      <div role="tabpanel" hidden={activeTab !== 'task'} className="flex-1 min-h-0">
        <TaskGroupView graphId={graphId} viewMode={viewMode} />
      </div>

      <div role="tabpanel" hidden={activeTab !== 'folder'} className="flex-1 min-h-0">
        <FolderTreeView
          graphId={graphId}
          selectedId={selectedFolderId}
          onSelect={setSelectedFolderId}
          viewMode={viewMode}
        />
      </div>
    </div>
  );
}
```

#### Task 1.2: 修改 DataLibraryDrawer 集成 Tabs

**修改文件**: `apps/web/features/data-library/components/DataLibraryDrawer.tsx`

```diff
+ import { OrganizationTabs } from './OrganizationTabs';

  // Content 区域（保留既有 loading/error UI，仅替换“成功渲染资产列表”的分支）：
  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
-   {isLoading ? (...) : error ? (...) : assets.length === 0 ? (...) : viewMode === 'grid' ? (
-     <AssetGrid assets={assets} />
-   ) : (
-     <AssetList assets={assets} />
-   )}
+   {isLoading ? (...) : error ? (...) : (
+     <OrganizationTabs graphId={graphId} viewMode={viewMode} assets={assets} />
+   )}
  </div>
```

---

### Phase 2: PBS 视图

#### Task 2.1: 创建 usePbsNodes Hook

**文件**: `apps/web/features/data-library/hooks/usePbsNodes.ts`

```typescript
import { useMemo } from 'react';
import { useGraphContextOptional } from '@/contexts/GraphContext';
import { NodeType } from '@cdm/types';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';
import type { TreeNode } from '../types';

interface UsePbsNodesOptions {
  graphId: string;
}

export function usePbsNodes({ graphId }: UsePbsNodesOptions) {
  const graphContext = useGraphContextOptional();
  const yDoc = graphContext?.yDoc;
  
  // 从 GraphContext.yDoc 提取 PBS 节点（⚠ nodeType 才是语义类型；type 为 legacy mindmap 字段）
  const pbsNodes = useMemo(() => {
    if (!yDoc) return [];
    
    const nodesMap = yDoc.getMap<YjsNodeData>('nodes');
    const nodes: TreeNode[] = [];
    
    nodesMap.forEach((value, key) => {
      const node = value as YjsNodeData;
      if (node.nodeType === NodeType.PBS) {
        nodes.push({
          id: key,
          label: node.label,
          parentId: node.parentId,
          children: [],
        });
      }
    });
    
    // 构建树结构
    return buildTree(nodes);
  }, [yDoc]);
  
  return { pbsNodes };
}

function buildTree(nodes: TreeNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  
  nodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));
  
  nodes.forEach(n => {
    const node = nodeMap.get(n.id)!;
    if (n.parentId && nodeMap.has(n.parentId)) {
      nodeMap.get(n.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
}
```

#### Task 2.2: 创建 PbsTreeView 组件

**文件**: `apps/web/features/data-library/components/PbsTreeView.tsx`

```tsx
'use client';

import { usePbsNodes } from '../hooks/usePbsNodes';
import { TreeNode } from './TreeNode';
import { FolderTree, ChevronRight } from 'lucide-react';

interface PbsTreeViewProps {
  graphId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function PbsTreeView({ graphId, selectedId, onSelect }: PbsTreeViewProps) {
  const { pbsNodes } = usePbsNodes({ graphId });

  if (pbsNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <FolderTree className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm">暂无 PBS 节点</p>
      </div>
    );
  }

  return (
    <div data-testid="pbs-tree" className="py-2">
      {pbsNodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          level={0}
        />
      ))}
    </div>
  );
}
```

#### Task 2.3: 创建通用 TreeNode 组件

**文件**: `apps/web/features/data-library/components/TreeNode.tsx`

```tsx
'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@cdm/ui';
import type { TreeNode as TreeNodeType } from '../types';

interface TreeNodeProps {
  node: TreeNodeType;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  level: number;
}

export function TreeNode({ node, selectedId, onSelect, level }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2); // 默认展开前两层
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        data-testid={`tree-node-${node.id}`}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded',
          isSelected && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(isSelected ? null : node.id)}
      >
        {/* Expander */}
        {hasChildren ? (
          <button
            data-testid="tree-expander"
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Icon */}
        {expanded && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-yellow-500" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500" />
        )}

        {/* Label */}
        <span className="text-sm truncate">{node.label}</span>

        {/* Badge */}
        {node.assetCount !== undefined && node.assetCount > 0 && (
          <span className="ml-auto text-xs text-gray-400">{node.assetCount}</span>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div data-testid="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Phase 3: 任务视图

#### Task 3.1: 创建 useTaskNodes Hook（从 Yjs 提取任务并按状态分组）

**文件**: `apps/web/features/data-library/hooks/useTaskNodes.ts`

```typescript
import { useMemo } from 'react';
import { NodeType, type TaskProps, type TaskStatus } from '@cdm/types';
import { useGraphContextOptional } from '@/contexts/GraphContext';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

export interface TaskNode {
  id: string;
  label: string;
  status: TaskStatus;
  deliverables: TaskProps['deliverables'];
}

export function useTaskNodes(graphId: string) {
  const graphContext = useGraphContextOptional();
  const yDoc = graphContext?.yDoc;

  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, TaskNode[]> = {
      todo: [],
      'in-progress': [],
      done: [],
    };
    if (!yDoc) return groups;

    const nodesMap = yDoc.getMap<YjsNodeData>('nodes');
    nodesMap.forEach((value, key) => {
      const node = value as YjsNodeData;
      if (node.nodeType !== NodeType.TASK) return;

      const props = node.props as TaskProps | undefined;
      const status = props?.status || 'todo';
      groups[status].push({
        id: key,
        label: node.label,
        status,
        deliverables: props?.deliverables,
      });
    });

    return groups;
  }, [yDoc, graphId]);

  return { tasksByStatus };
}
```

#### Task 3.2: 创建 useTaskAssets Hook（通过 NodeDataLink 查询任务关联资产）

**文件**: `apps/web/features/data-library/hooks/useTaskAssets.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchNodeAssets } from '../api/data-assets';

export function useTaskAssets({ nodeId, enabled }: { nodeId: string; enabled: boolean }) {
  return useQuery({
    queryKey: ['data-assets', 'links', 'node', nodeId],
    queryFn: () => fetchNodeAssets(nodeId),
    enabled: enabled && !!nodeId,
  });
}
```

#### Task 3.3: 创建 TaskGroupView 组件

**文件**: `apps/web/features/data-library/components/TaskGroupView.tsx`

```tsx
'use client';

import { useState } from 'react';
import { AssetGrid } from './AssetGrid';
import { AssetList } from './AssetList';
import { ChevronRight, ChevronDown, ListTodo, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@cdm/ui';
import { useTaskNodes } from '../hooks/useTaskNodes';
import { useTaskAssets } from '../hooks/useTaskAssets';

interface TaskGroupViewProps {
  graphId: string;
  viewMode: 'grid' | 'list';
}

const STATUS_CONFIG = {
  'in-progress': { label: '进行中', icon: Clock, color: 'text-blue-500' },
  todo: { label: '待办', icon: ListTodo, color: 'text-gray-500' },
  done: { label: '已完成', icon: CheckCircle2, color: 'text-green-500' },
};

export function TaskGroupView({ graphId, viewMode }: TaskGroupViewProps) {
  const { tasksByStatus } = useTaskNodes(graphId);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['in-progress', 'todo']);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);

  return (
    <div data-testid="task-group-view" className="space-y-4">
      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const tasks = tasksByStatus[status as keyof typeof tasksByStatus] || [];
        const isExpanded = expandedGroups.includes(status);
        const Icon = config.icon;

        return (
          <div key={status} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100"
              onClick={() =>
                setExpandedGroups((prev) =>
                  prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
                )
              }
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Icon className={cn('w-4 h-4', config.color)} />
              <span className="font-medium">{config.label}</span>
              <span className="text-sm text-gray-400">({tasks.length})</span>
            </button>

            {isExpanded && (
              <div className="divide-y">
                {tasks.map((task) => (
                  <div key={task.id} data-testid={`task-card-${task.id}`}>
                    <button
                      className="w-full flex items-center gap-2 px-6 py-2 hover:bg-gray-50 text-left"
                      onClick={() =>
                        setExpandedTasks((prev) =>
                          prev.includes(task.id) ? prev.filter((t) => t !== task.id) : [...prev, task.id]
                        )
                      }
                    >
                      {expandedTasks.includes(task.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span>{task.label}</span>
                      <span className="ml-auto text-xs text-gray-400">
                        {(task.deliverables?.length ?? 0)} 交付物
                      </span>
                    </button>

                    {expandedTasks.includes(task.id) && (
                      <div data-testid="task-deliverables" className="px-6 py-3 bg-gray-50/50">
                        <TaskAssetsPanel nodeId={task.id} viewMode={viewMode} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskAssetsPanel({ nodeId, viewMode }: { nodeId: string; viewMode: 'grid' | 'list' }) {
  const { data, isLoading } = useTaskAssets({ nodeId, enabled: true });
  const assets = data?.assets ?? [];
  if (isLoading) return <div className="text-sm text-gray-500">加载中...</div>;
  return viewMode === 'grid' ? <AssetGrid assets={assets} /> : <AssetList assets={assets} />;
}
```

---

### Phase 4: 文件夹视图

#### Task 4.1: 后端 - 对齐既有 folders 端点（补齐 rename + 复用资产 update 做 move）

**修改文件**: `apps/api/src/modules/data-management/data-asset.controller.ts`

```typescript
// 新增：PUT /api/data-assets/folders:update?filterByTk=:id （重命名文件夹）
@Put('data-assets/folders\\:update')
async updateFolder(@Query('filterByTk') id: string, @Body() dto: { name: string }) {
  const folder = await this.service.updateFolder(id, dto);
  return { success: true, folder };
}

// 资产移动到文件夹：复用 PUT /api/data-assets:update?filterByTk=:assetId
// Body: { folderId: string | null }
```

#### Task 4.2: 创建 useDataFolders Hook

**文件**: `apps/web/features/data-library/hooks/useDataFolders.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDataFolders,
  createDataFolder,
  updateDataFolder,
  deleteDataFolder,
  updateDataAsset,
} from '../api/data-assets';

export function useDataFolders(graphId: string) {
  const queryClient = useQueryClient();

  const foldersQuery = useQuery({
    queryKey: ['data-assets', 'folders', graphId],
    queryFn: () => fetchDataFolders(graphId),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createDataFolder({ graphId, name }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['data-assets', 'folders', graphId] }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateDataFolder({ id, name }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['data-assets', 'folders', graphId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDataFolder(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['data-assets', 'folders', graphId] }),
  });

  const moveAssetMutation = useMutation({
    mutationFn: ({ assetId, folderId }: { assetId: string; folderId: string | null }) =>
      updateDataAsset({ id: assetId, folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-assets', 'folders', graphId] });
      queryClient.invalidateQueries({ queryKey: ['data-assets'] });
    },
  });

  return {
    folders: foldersQuery.data?.folders || [],
    isLoading: foldersQuery.isLoading,
    createFolder: createMutation.mutate,
    renameFolder: renameMutation.mutate,
    deleteFolder: deleteMutation.mutate,
    moveAsset: moveAssetMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
```

#### Task 4.3: 创建 FolderTreeView 组件（dnd-kit）

**文件**: `apps/web/features/data-library/components/FolderTreeView.tsx`

```tsx
'use client';

import { useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { useDataFolders } from '../hooks/useDataFolders';
import { useDataAssets } from '../hooks/useDataAssets';
import { AssetGrid } from './AssetGrid';
import { AssetList } from './AssetList';
import { FolderPlus, FolderOpen } from 'lucide-react';

export function FolderTreeView({ graphId, selectedId, onSelect, viewMode }: FolderTreeViewProps) {
  const { folders, createFolder, renameFolder, deleteFolder, moveAsset } = useDataFolders(graphId);
  const { assets } = useDataAssets({ graphId, folderId: selectedId || undefined });

  const handleDragEnd = (event: DragEndEvent) => {
    const assetId = event.active?.id as string | undefined;
    const folderId = event.over?.id as string | undefined;
    if (!assetId || !folderId) return;
    moveAsset({ assetId, folderId });
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full">
        {/* 左侧：Folder Tree（folder node 使用 useDroppable 作为 drop target） */}
        {/* 右侧：Folder 内资产列表（AssetCard/row 使用 useDraggable） */}
        <div className="flex-1">
          {viewMode === 'grid' ? <AssetGrid assets={assets} /> : <AssetList assets={assets} />}
        </div>
      </div>
    </DndContext>
  );
}
```

---

## Additional Context

### API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data-assets/folders?graphId=:id` | 获取文件夹树 |
| POST | `/api/data-assets/folders` | 创建文件夹 |
| DELETE | `/api/data-assets/folders:destroy?filterByTk=:id` | 删除空文件夹 |
| PUT | `/api/data-assets/folders:update?filterByTk=:id` | 重命名文件夹 |
| PUT | `/api/data-assets:update?filterByTk=:assetId` | 移动资产到文件夹（body 传 `folderId`） |
| GET | `/api/data-assets/links?nodeId=:nodeId` | 查询节点关联资产 |
| POST | `/api/data-assets/links:byNodes` | 批量查询多个节点关联资产 |

### Dependencies

- **Story 9.1** (完成): DataLibraryDrawer 基础组件
- **@dnd-kit/core**: 拖拽功能（项目已有依赖）

### Testing Strategy

#### E2E Tests
以 Story 9.2 的 Testing Requirements 为准：每个用例需用 Playwright `page.request` 创建独立测试数据（graph/folders/assets/links），不要依赖全局 mock seed。

#### Unit Tests
- `OrganizationTabs`: 验证 Tab 渲染和切换
- `PbsTreeView`: 验证树渲染和选择
- `TaskGroupView`: 验证分组和展开
- `FolderTreeView`: 验证 CRUD 和拖拽

### Notes

1. **PBS 数据同步**: PBS 节点数据从 Yjs Doc 实时读取，无需额外 API
2. **任务视图分组**: 任务节点来自 `yDoc`；资产关联通过 NodeDataLink API 查询（可按需用 `links:byNodes` 批量优化）
3. **文件夹删除**: 仅允许删除空文件夹，非空会返回错误
4. **拖拽视觉反馈**: 使用 @dnd-kit 的 DragOverlay 提供拖拽预览

---

## Acceptance Criteria Checklist

- [ ] AC1: PBS 视图 - 左侧树，右侧关联资产
- [ ] AC2: 任务视图 - 按状态分组，展开显示交付物
- [ ] AC3: 文件夹视图 - CRUD 操作
- [ ] AC4: 拖拽移动资产到文件夹
- [ ] AC5: Tab 切换保持状态
