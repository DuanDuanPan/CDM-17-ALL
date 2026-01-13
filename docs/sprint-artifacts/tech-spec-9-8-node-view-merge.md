# Tech-Spec: 节点视图合并（PBS+任务）

**Created:** 2026-01-12  
**Story:** 9.8  
**Status:** Ready for Development

## Overview

### Problem Statement

当前数据资源库 Drawer 提供 `PBS / 任务 / 文件夹` 三个组织视图。随着图谱节点类型增加，PBS 与任务两个 Tab 在信息层面高度重叠：

- 用户在图谱中以**根节点**为单一真相源（SoT）构建层级，但数据资源库需要在 PBS 与任务之间来回切换
- 图谱上层可能存在非 PBS/任务语义层（如第 2 层是 DATA），直接呈现整棵树会引入噪音

### Solution

合并 `PBS` 与 `任务` Tab 为统一的「节点（PBS+任务）」视图：

1. **投影算法**：从完整图谱树中过滤出 PBS/TASK 节点，重建父子关系
2. **多选机制**：支持跨片段节点多选，资产面板展示并集去重
3. **溯源展示**：完整 breadcrumb 路径 + 资产关联节点溯源
4. **双搜索入口**：节点搜索 + 资产搜索独立运作

### Scope (In/Out)

**In Scope (MVP):**
- Tab 合并 UI 重构
- 节点树投影算法
- 节点 breadcrumb 溯源
- 多选与资产并集去重
- 资产溯源展示
- 双搜索入口
- 解绑语义（移除仅解绑不删除）

**Out of Scope:**
- 资产关系自动推导
- 节点拖拽改父节点
- 权限/密级模型

---

## Agent Review Feedback (Party Mode)

> [!IMPORTANT]
> 以下改进建议已由 Winston (Architect)、Murat (Test Architect)、Amelia (Developer) 在 Party Mode 评审中提出，已采纳并整合到本规格中。

### 采纳的改进

| 来源      | 建议                                                      | 采纳状态          |
| --------- | --------------------------------------------------------- | ----------------- |
| 🏗️ Winston | 惰性计算 `originalPath`，避免每节点存储完整路径           | ✅ 已更新 Task 2   |
| 🏗️ Winston | 添加错误边界处理（孤儿节点、循环引用、GraphContext null） | ✅ 已增加 Task 2.6 |
| 🧪 Murat   | 增加投影算法边界测试用例（全 PBS、全 TASK、交叉嵌套）     | ✅ 已更新测试策略  |
| 🧪 Murat   | 用 MSW 替代 jest.mock 进行 API 测试                       | ✅ 已更新测试策略  |
| 💻 Amelia  | `findSemanticAncestor` 添加 depth limit (100) 防止长链    | ✅ 已更新 Task 2   |
| 💻 Amelia  | 新增批量详情查询 API `POST /api/data-assets/links:detailByNodes` | ✅ 已增加 Task 4.0 |
| 💻 Amelia  | `NodeTreeView` 拆分为子目录结构                           | ✅ 已更新文件结构  |

### Advanced Elicitation Feedback

> [!TIP]
> 以下改进通过 User Persona Focus Group、SCAMPER、Red Team vs Blue Team 三种深化方法产出。

| 来源          | 改进项                        | 采纳状态           |
| ------------- | ----------------------------- | ------------------ |
| 👥 Focus Group | AC8: 批量解绑                 | ✅ 已增加           |
| 👥 Focus Group | AC9: Breadcrumb Tooltip       | ✅ 已增加           |
| 👥 Focus Group | 展开状态持久化 (localStorage) | ✅ 已更新 Task 4    |
| 🔄 SCAMPER     | 节点类型图标 (📦 PBS / ✅ TASK) | ✅ 已更新 Task 4.2  |
| 🔄 SCAMPER     | Undo Toast 替代确认弹窗       | ✅ 已更新 Task 7    |
| 🔴 Red Team    | 根节点过多警告 (>50 roots)    | ✅ 已更新 Dev Notes |
| 🔴 Red Team    | Provenance 限制 (默认 10 条)  | ✅ 已更新 Task 5    |
| 🔴 Red Team    | 搜索输入 escapeRegex          | ✅ 已更新 Task 6    |

---

## Context for Development

### Codebase Patterns

| Pattern           | Location                     | Description                                    |
| ----------------- | ---------------------------- | ---------------------------------------------- |
| **Tree Hook**     | `usePbsNodes.ts`             | 从 GraphContext 提取节点，构建树结构           |
| **Tree View**     | `PbsTreeView.tsx`            | 递归渲染树节点，支持展开/折叠/选中             |
| **Tab Switching** | `OrganizationTabs.tsx`       | Tab 配置 + localStorage 持久化                 |
| **Asset Query**   | `useAssetLinks.ts`           | 按 nodeId 查询关联资产                         |
| **Test Pattern**  | `OrganizationViews.test.tsx` | 使用 react-testing-library + 模拟 GraphContext |

### Files to Reference

#### 现有组件（需修改）
| File                                                                              | Purpose                         |
| --------------------------------------------------------------------------------- | ------------------------------- |
| [OrganizationTabs.tsx](../../apps/web/features/data-library/components/OrganizationTabs.tsx)   | Tab 配置，需从 3 Tab 改为 2 Tab |
| [DataLibraryDrawer.tsx](../../apps/web/features/data-library/components/DataLibraryDrawer.tsx) | 主容器，需集成新的 NodeTreeView |

#### 现有组件（参考/复用）
| File                                                                          | Purpose               |
| ----------------------------------------------------------------------------- | --------------------- |
| [PbsTreeView.tsx](../../apps/web/features/data-library/components/PbsTreeView.tsx)     | 树渲染模式参考        |
| [TaskGroupView.tsx](../../apps/web/features/data-library/components/TaskGroupView.tsx) | Task 节点数据结构参考 |
| [usePbsNodes.ts](../../apps/web/features/data-library/hooks/usePbsNodes.ts)            | Hook 模式参考         |

#### 类型定义
| File                                                           | Types                           |
| -------------------------------------------------------------- | ------------------------------- |
| [node-types.ts](../../packages/types/src/node-types.ts)                 | `NodeType.PBS`, `NodeType.TASK` |
| [data-library-types.ts](../../packages/types/src/data-library-types.ts) | `NodeDataLink`, `DataLinkType`  |

### Technical Decisions

| Decision         | Choice                   | Rationale                       |
| ---------------- | ------------------------ | ------------------------------- |
| **投影算法位置** | 纯前端 Hook              | 规模 ≤1k 节点，无需后端         |
| **多选状态**     | `activeNodeId` + `Set<nodeId>` | 区分“单节点焦点”与“多选并集”    |
| **虚拟列表**     | 可选（视性能）           | 初期用 useMemo 缓存             |
| **搜索防抖**     | 300ms debounce           | 避免请求风暴                    |
| **路径计算**     | 惰性 `getOriginalPath()` | 避免 1k 节点 × 5 深度的存储开销 |
| **祖先遍历**     | depth limit = 100        | 防止意外长链导致性能问题        |
| **批量查询**     | `POST /api/data-assets/links:detailByNodes` | 并集/溯源需要 linkType + asset |
| **节点类型图标** | 📦 PBS / ✅ TASK           | SCAMPER: 提高视觉区分度         |
| **解绑确认**     | Sonner Undo Toast        | 立即解绑 + 可撤销（撤销时重新关联） |
| **搜索模式**     | 统一输入框 + `@` 前缀    | SCAMPER: 参考 VS Code UX        |

---

## Implementation Plan

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   DataLibraryDrawer                      │
├────────────────────────┬────────────────────────────────┤
│  OrganizationTabs (2)  │         (Search Bar)           │
│   ├─ 节点(PBS+任务)    │                                │
│   └─ 文件夹            │                                │
├────────────────────────┴────────────────────────────────┤
│                 [If 节点 Tab Active]                     │
│  ┌─────────────────────┬─────────────────────────────┐  │
│  │    NodeTreeView     │       Asset Panel           │  │
│  │  ┌──────────────┐   │  ┌──────────────────────┐   │  │
│  │  │ SearchInput  │   │  │  NodeBreadcrumb      │   │  │
│  │  ├──────────────┤   │  ├──────────────────────┤   │  │
│  │  │ ProjectedTree│   │  │  Input/Output/Ref    │   │  │
│  │  │ ☑ PBS-1     │   │  │  Tabs + AssetCards   │   │  │
│  │  │ ☑ Task-A    │   │  │  + Provenance        │   │  │
│  │  │   └ Task-B  │   │  └──────────────────────┘   │  │
│  │  └──────────────┘   │                             │  │
│  │  [Selected: 2]      │                             │  │
│  │  [Clear Selection]  │                             │  │
│  └─────────────────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

### Tasks

#### Task 1: Tab 合并与 UI 重构 (AC: #1)

##### 1.1 修改 OrganizationTabs 配置

**File:** `apps/web/features/data-library/components/OrganizationTabs.tsx`

```diff
-export type OrganizationView = 'pbs' | 'task' | 'folder';
+export type OrganizationView = 'node' | 'folder';

 const TABS: Array<{...}> = [
-    { id: 'pbs', label: 'PBS', icon: Box, description: '按产品结构组织' },
-    { id: 'task', label: '任务', icon: ListTodo, description: '按任务状态分组' },
+    { id: 'node', label: '节点（PBS+任务）', icon: GitBranch, description: '按图谱结构组织' },
     { id: 'folder', label: '文件夹', icon: Folder, description: '自定义文件夹' },
 ];

-className="grid grid-cols-3 gap-1 ..."
+className="grid grid-cols-2 gap-1 ..."
```

##### 1.1.1 localStorage 迁移处理

> [!WARNING]
> 需要处理用户 localStorage 中已存储的旧值 (`'pbs'` 或 `'task'`)，否则会导致默认回退。

**修改 `useOrganizationView` hook:**

```typescript
export function useOrganizationView(graphId: string): [OrganizationView, (view: OrganizationView) => void] {
  const storageKey = `${STORAGE_KEY_PREFIX}-${graphId}`;

  const [view, setViewState] = useState<OrganizationView>(() => {
    if (typeof window === 'undefined') return 'node'; // 默认改为 'node'

    try {
      const stored = localStorage.getItem(storageKey);
      
      // 迁移逻辑: 旧值 'pbs' 或 'task' 自动迁移为 'node'
      if (stored === 'pbs' || stored === 'task') {
        localStorage.setItem(storageKey, 'node');
        return 'node';
      }
      
      // 验证存储值
      if (stored && ['node', 'folder'].includes(stored)) {
        return stored as OrganizationView;
      }
    } catch {
      // localStorage not available
    }
    return 'node'; // 默认改为 'node'
  });

  const setView = (newView: OrganizationView) => {
    setViewState(newView);
    try {
      localStorage.setItem(storageKey, newView);
    } catch {
      // localStorage not available
    }
  };

  return [view, setView];
}
```

##### 1.2 更新 DataLibraryDrawer 视图切换

**File:** `apps/web/features/data-library/components/DataLibraryDrawer.tsx`

替换 `PbsTreeView` 和 `TaskGroupView` 为新的 `NodeTreeView`：

```tsx
// 旧代码
{activeView === 'pbs' && <PbsTreeView ... />}
{activeView === 'task' && <TaskGroupView ... />}

// 新代码
{activeView === 'node' && <NodeTreeView ... />}
```

---

#### Task 2: 节点树投影算法实现 (AC: #2)

> [!NOTE]
> **数据来源确认**: TASK 节点与 PBS 节点一样，都存储在图谱中（通过 `NodeType.TASK` 标识），可通过 `graph.getNodes()` 获取。
> 现有 `TaskGroupView` 按状态分组展示任务，但其数据源也是图谱。投影算法统一处理 PBS 和 TASK 两种 `nodeType`。

##### 2.1 创建 useNodeTreeProjection Hook

**新建文件:** `apps/web/features/data-library/hooks/useNodeTreeProjection.ts`

```typescript
/**
 * Story 9.8: Node Tree Projection Hook
 * 从图谱提取 PBS/TASK 节点，构建投影树
 */

export interface ProjectedNode {
  id: string;
  label: string;
  nodeType: NodeType;
  originalParentId: string | null; // 原始父节点 ID
  displayParentId: string | null;  // 显示父节点 ID（最近语义祖先）
  children: ProjectedNode[];
  depth: number;
  // 注意: originalPath 改为惰性计算，不存储在节点上
}

export function useNodeTreeProjection() {
  const graphContext = useGraphContextOptional();
  const graph = graphContext?.graph;
  
  const projectedTree = useMemo(() => {
    if (!graph) return [];
    
    const allNodes = graph.getNodes();
    const nodeMap = new Map<string, MindNodeData>();
    
    // Step 1: 收集所有节点数据
    for (const node of allNodes) {
      const data = node.getData() as MindNodeData;
      if (data) nodeMap.set(node.id, data);
    }
    
    // Step 2: 过滤语义节点 (PBS/TASK)
    const semanticNodes = [...nodeMap.entries()]
      .filter(([_, data]) => 
        data.nodeType === NodeType.PBS || data.nodeType === NodeType.TASK
      );
    
    // Step 3: 找最近语义祖先 (添加 depth limit 防止长链)
    const MAX_ANCESTOR_DEPTH = 100;
    const findSemanticAncestor = (nodeId: string): string | null => {
      let current = nodeMap.get(nodeId);
      let depth = 0;
      while (current?.parentId && depth < MAX_ANCESTOR_DEPTH) {
        const parent = nodeMap.get(current.parentId);
        if (!parent) break;
        if (parent.nodeType === NodeType.PBS || parent.nodeType === NodeType.TASK) {
          return current.parentId;
        }
        current = parent;
        depth++;
      }
      if (depth >= MAX_ANCESTOR_DEPTH) {
        console.warn(`[useNodeTreeProjection] Max depth reached for node ${nodeId}`);
      }
      return null;
    };
    
    // Step 4: 惰性路径计算 (不存储在节点上，按需调用)
    // 移至 hook 返回值中作为方法
    
    // Step 5: 构建投影树
    const projectedMap = new Map<string, ProjectedNode>();
    
    for (const [id, data] of semanticNodes) {
      projectedMap.set(id, {
        id,
        label: data.label || '未命名',
        nodeType: data.nodeType!,
        originalParentId: data.parentId || null,
        displayParentId: findSemanticAncestor(id),
        children: [],
        depth: 0,
        // originalPath 移至 getOriginalPath() 惰性计算
      });
    }
    
    // Step 6: 建立父子关系
    const roots: ProjectedNode[] = [];
    
    for (const node of projectedMap.values()) {
      if (node.displayParentId && projectedMap.has(node.displayParentId)) {
        projectedMap.get(node.displayParentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    
    // Step 7: 排序 + 计算深度
    const sortAndSetDepth = (nodes: ProjectedNode[], depth = 0) => {
      nodes.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
      for (const node of nodes) {
        node.depth = depth;
        sortAndSetDepth(node.children, depth + 1);
      }
    };
    sortAndSetDepth(roots);
    
    return roots;
  }, [graph]);
  
  // 惰性路径计算方法 (Breadcrumb 展开时调用)
  const getOriginalPath = useCallback((nodeId: string): string[] => {
    if (!graph) return [nodeId];
    
    const path: string[] = [];
    const allNodes = graph.getNodes();
    const nodeMap = new Map<string, MindNodeData>();
    for (const node of allNodes) {
      const data = node.getData() as MindNodeData;
      if (data) nodeMap.set(node.id, data);
    }
    
    let currentId = nodeId;
    let depth = 0;
    while (currentId && depth < 100) {
      path.unshift(currentId);
      const current = nodeMap.get(currentId);
      if (!current?.parentId) break;
      currentId = current.parentId;
      depth++;
    }
    return path;
  }, [graph]);
  
  // 获取节点标签映射 (用于 Breadcrumb 显示)
  const getNodeLabel = useCallback((nodeId: string): string => {
    if (!graph) return nodeId;
    const node = graph.getCellById(nodeId);
    if (!node) return nodeId;
    const data = node.getData() as MindNodeData;
    return data?.label || nodeId;
  }, [graph]);
  
  return { projectedTree, getOriginalPath, getNodeLabel };
}
```

---

#### Task 3: NodeBreadcrumb 组件开发 (AC: #3)

**新建文件:** `apps/web/features/data-library/components/NodeBreadcrumb.tsx`

```typescript
import { Fragment, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@cdm/ui';

interface NodeBreadcrumbProps {
  path: string[];                    // 完整路径 ID 数组
  nodeLabels: Map<string, string>;   // ID -> label 映射
  maxVisible?: number;               // 最大显示数量，默认 4
  onNodeClick?: (nodeId: string) => void;
}

export function NodeBreadcrumb({
  path,
  nodeLabels,
  maxVisible = 4,
  onNodeClick,
}: NodeBreadcrumbProps) {
  const shouldCollapse = path.length > maxVisible;
  
  // 折叠策略: Root / … / Parent / Current
  const visiblePath = shouldCollapse
    ? [path[0], '...', ...path.slice(-2)]
    : path;
  
  // AC9: 计算被折叠的节点路径用于 tooltip 显示
  const collapsedPath = useMemo(() => {
    if (!shouldCollapse) return [];
    return path.slice(1, -2); // 跳过 root 和最后两个节点
  }, [path, shouldCollapse]);
  
  const collapsedLabels = useMemo(() => {
    return collapsedPath.map(id => nodeLabels.get(id) || id).join(' → ');
  }, [collapsedPath, nodeLabels]);
  
  return (
    <TooltipProvider>
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        {visiblePath.map((nodeId, idx) => (
          <Fragment key={idx}>
            {idx > 0 && <ChevronRight className="w-3 h-3" />}
            {nodeId === '...' ? (
              // AC9: hover 折叠区显示完整路径 tooltip
              <Tooltip>
                <TooltipTrigger asChild>
                  <span 
                    className="text-gray-400 cursor-help px-1 hover:bg-gray-100 rounded"
                    role="button"
                    aria-label="展开查看完整路径"
                  >
                    …
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs break-words">{collapsedLabels}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => onNodeClick?.(nodeId)}
                className="hover:text-blue-600 hover:underline"
              >
                {nodeLabels.get(nodeId) || nodeId}
              </button>
            )}
          </Fragment>
        ))}
      </nav>
    </TooltipProvider>
  );
}
```

---

#### Task 4: 多选与资产并集 (AC: #4)

##### 4.0 新增批量查询 API (Amelia 建议)

> [!IMPORTANT]
> 新增 API 需要完整的类型定义、Service 层实现、Controller 和路由注册。

**类型定义 (新增到 `packages/types/src/data-library-types.ts`):**

```typescript
/**
 * Story 9.8: 批量查询「链接详情」DTO（多节点）
 */
export interface NodeAssetLinksDetailByNodesDto {
  nodeIds: string[];
}

/**
 * Story 9.8: 批量查询「链接详情」响应（多节点）
 * - 需要包含 nodeId + linkType + asset 详情，才能做并集分栏 + 溯源
 */
export interface NodeAssetLinksDetailByNodesResponse {
  links: NodeDataLinkWithAsset[];
}
```

**Service 层（新增到 `apps/api/src/modules/data-management/node-data-link.service.ts`，并由 `data-asset.service.ts` 委托暴露）：**

```typescript
/**
 * Story 9.8: 批量查询多个节点的链接详情（含 asset + linkType）
 * @param nodeIds 节点 ID 数组
 * @returns 所有关联的链接（每条含 asset 详情）
 */
async getNodeAssetLinksByNodes(nodeIds: string[]): Promise<NodeDataLinkWithAsset[]> {
  if (!nodeIds || nodeIds.length === 0) return [];

  const links = await this.linkRepo.findByNodeIds(nodeIds);
  return links.map((link) => ({
    id: link.id,
    nodeId: link.nodeId,
    assetId: link.assetId,
    linkType: link.linkType as DataLinkType,
    note: link.note,
    createdAt: link.createdAt.toISOString(),
    asset: this.toAssetResponse(link.asset),
  }));
}
```

**Controller（修改 `apps/api/src/modules/data-management/data-asset.controller.ts`）：**

```typescript
@Post('data-assets/links\\:detailByNodes')
async getLinksDetailByNodes(
  @Body() dto: NodeAssetLinksDetailByNodesDto
): Promise<NodeAssetLinksDetailByNodesResponse> {
  const links = await this.service.getNodeAssetLinksByNodes(dto.nodeIds);
  return { links };
}
```

**API 路由:** `POST /api/data-assets/links:detailByNodes`

**前端调用:**
```typescript
const fetchNodeAssetLinksDetailByNodes = async (nodeIds: string[]): Promise<NodeDataLinkWithAsset[]> => {
  const response = await fetch('/api/data-assets/links:detailByNodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeIds }),
  });
  const data = await response.json();
  return data.links;
};
```

##### 4.1 创建 useSelectedNodesAssets Hook

**新建文件:** `apps/web/features/data-library/hooks/useSelectedNodesAssets.ts`

```typescript
interface UseSelectedNodesAssetsOptions {
  selectedNodeIds: Set<string>;
  graphId: string;
}

interface AssetWithProvenance extends DataAssetWithFolder {
  provenance: Array<{
    nodeId: string;
    nodePath: string[];
    linkType: DataLinkType;
  }>;
}

export function useSelectedNodesAssets({
  selectedNodeIds,
  graphId,
}: UseSelectedNodesAssetsOptions) {
  // 查询所有选中节点的链接详情（含 asset + linkType）
  const { data: allLinks } = useQuery({
    queryKey: ['node-assets-batch', [...selectedNodeIds].sort().join(',')],
    queryFn: async () => {
      const nodeIds = [...selectedNodeIds];
      if (nodeIds.length === 0) return [];
      
      // 单次批量查询 (Task 4.0 新增 API)
      return fetchNodeAssetLinksDetailByNodes(nodeIds);
    },
    enabled: selectedNodeIds.size > 0,
  });
  
  // 按 linkType 分组 + 去重 + 溯源
  const groupedAssets = useMemo(() => {
    const input: AssetWithProvenance[] = [];
    const output: AssetWithProvenance[] = [];
    const reference: AssetWithProvenance[] = [];
    
    const assetMap = new Map<string, AssetWithProvenance>();
    
    for (const link of allLinks ?? []) {
      const existing = assetMap.get(link.assetId);
      if (!existing) {
        assetMap.set(link.assetId, {
          ...link.asset,
          provenance: [{ 
            nodeId: link.nodeId, 
            nodePath: [], // 需要从投影树获取
            linkType: link.linkType 
          }],
        });
      } else {
        existing.provenance.push({
          nodeId: link.nodeId,
          nodePath: [],
          linkType: link.linkType,
        });
      }
    }
    
    // 分类到对应分栏
    for (const asset of assetMap.values()) {
      const hasInput = asset.provenance.some(p => p.linkType === 'input');
      const hasOutput = asset.provenance.some(p => p.linkType === 'output');
      const hasRef = asset.provenance.some(p => p.linkType === 'reference');
      
      if (hasInput) input.push(asset);
      if (hasOutput) output.push(asset);
      if (hasRef) reference.push(asset);
    }
    
    return { input, output, reference };
  }, [allLinks]);
  
  return {
    groupedAssets,
    totalCount: new Set(allLinks?.map(l => l.assetId)).size,
    isLoading: false,
  };
}
```

##### 4.2 NodeTreeView 组件 (含 checkbox 多选)

**新建文件:** `apps/web/features/data-library/components/NodeTreeView.tsx`

```typescript
interface NodeTreeViewProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  searchQuery: string;
}

export function NodeTreeView({
  selectedIds,
  onSelectionChange,
  expandedIds,
  onToggleExpand,
  searchQuery,
}: NodeTreeViewProps) {
  const { projectedTree } = useNodeTreeProjection();
  
  // 搜索过滤
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return projectedTree;
    return filterTree(projectedTree, searchQuery);
  }, [projectedTree, searchQuery]);
  
  const handleToggle = (nodeId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    onSelectionChange(newSet);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Selection count + Clear */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b">
          <span className="text-sm text-blue-600">
            已选 {selectedIds.size} 个节点
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange(new Set())}
          >
            清空选择
          </Button>
        </div>
      )}
      
      {/* Tree content */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredTree.map(node => (
          <NodeTreeItem
            key={node.id}
            node={node}
            selectedIds={selectedIds}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onExpand={onToggleExpand}
            level={0}
          />
        ))}
      </div>
    </div>
  );
}
```

---

#### Task 5: 资产溯源展示 (AC: #5)

扩展 `AssetCard` 组件，添加溯源摘要和展开详情：

```typescript
interface AssetCardWithProvenanceProps extends AssetCardProps {
  provenance: Array<{
    nodeId: string;
    nodePath: string[];
    linkType: DataLinkType;
  }>;
  onLocateNode?: (nodeId: string) => void;
}

// 溯源摘要
const provenanceCounts = useMemo(() => {
  const counts = { input: 0, output: 0, reference: 0 };
  for (const p of provenance) {
    counts[p.linkType]++;
  }
  return counts;
}, [provenance]);

// 渲染摘要徽章
<div className="flex gap-1">
  {provenanceCounts.output > 0 && (
    <Badge variant="blue">输出: {provenanceCounts.output}</Badge>
  )}
  {provenanceCounts.reference > 0 && (
    <Badge variant="gray">引用: {provenanceCounts.reference}</Badge>
  )}
</div>

// 展开详情
{isExpanded && (
  <div className="mt-2 pl-4 border-l-2">
    {provenance.map((p, idx) => (
      <div key={idx} className="flex items-center gap-2">
        <NodeBreadcrumb 
          path={p.nodePath} 
          onNodeClick={onLocateNode}
        />
        <Badge size="sm">{p.linkType}</Badge>
      </div>
    ))}
  </div>
)}
```

---

#### Task 6: 双搜索入口 (AC: #6)

在 NodeTreeView 上方添加搜索切换：

```typescript
type SearchMode = 'node' | 'asset';

interface DualSearchProps {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

export function DualSearch({ mode, onModeChange, query, onQueryChange }: DualSearchProps) {
  return (
    <div className="flex gap-2 p-2 border-b">
      <div className="flex rounded-md border">
        <Button
          variant={mode === 'node' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('node')}
        >
          搜节点
        </Button>
        <Button
          variant={mode === 'asset' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('asset')}
        >
          搜资产
        </Button>
      </div>
      <Input
        placeholder={mode === 'node' ? '搜索 PBS/任务...' : '搜索资产...'}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="flex-1"
      />
    </div>
  );
}
```

---

#### Task 7: 解绑语义实现 (AC: #7)

> [!IMPORTANT]
> 解绑操作需要后端 API 支持，并使用 Undo Toast 替代确认弹窗 (SCAMPER 建议)。

##### 7.0 后端解绑 API

**类型定义 (新增到 `packages/types/src/data-library-types.ts`):**

```typescript
/**
 * Story 9.8: 批量解绑 DTO（nodeIds × assetIds）
 */
export interface NodeAssetLinksDestroyByNodesDto {
  nodeIds: string[];
  assetIds: string[];
}

export interface NodeAssetLinksDestroyByNodesResponse {
  success: boolean;
  deletedCount: number;
}
```

**Service 层（新增到 `apps/api/src/modules/data-management/node-data-link.{repository,service}.ts`，并由 `data-asset.service.ts` 委托暴露）：**

```typescript
/**
 * Story 9.8: 批量解绑（仅删除 NodeDataLink，不删除资产）
 */
async unlinkNodeAssetsByNodes(nodeIds: string[], assetIds: string[]): Promise<number> {
  if (nodeIds.length === 0 || assetIds.length === 0) return 0;
  return this.linkRepo.deleteManyByNodeIdsAndAssetIds(nodeIds, assetIds);
}
```

**Controller（修改 `apps/api/src/modules/data-management/data-asset.controller.ts`）：**

```typescript
@Post('data-assets/links\\:destroyByNodes')
@HttpCode(HttpStatus.OK)
async destroyLinksByNodes(
  @Body() dto: NodeAssetLinksDestroyByNodesDto
): Promise<NodeAssetLinksDestroyByNodesResponse> {
  const deletedCount = await this.service.unlinkNodeAssetsByNodes(dto.nodeIds, dto.assetIds);
  return { success: true, deletedCount };
}
```

**API 路由:**
- 单个解绑（已存在）: `DELETE /api/data-assets/links:destroy?nodeId=...&assetId=...`
- 批量解绑（新增）: `POST /api/data-assets/links:destroyByNodes`

##### 7.1 前端解绑实现 (使用 Undo Toast)

修改 AssetCard 中的删除按钮逻辑，使用 Undo Toast 替代确认弹窗：

```typescript
import { toast } from 'sonner';

// 在 NodeTreeView 场景下 - 使用 Undo Toast (SCAMPER)
// linksToRemove 需从当前 UI 状态构造：
// - 单节点模式：[{ nodeId: activeNodeId, assetId, linkType }]
// - 多选模式：从 provenance 过滤出 (selectedNodeIds × selectedAssetIds) 的链接集合
const handleUnlink = async (
  linksToRemove: Array<{ nodeId: string; assetId: string; linkType: DataLinkType }>,
  label: string
) => {
  // 乐观更新: 立即从 UI 移除（或触发 refetch 前先隐藏）
  const previousAssets = [...assets];
  setAssets(assets.filter(a => !linksToRemove.some(l => l.assetId === a.id)));

  // 立即解绑（成功后 toast 提供“撤销”= 重新关联）
  try {
    await destroyLinksByNodes({
      nodeIds: [...new Set(linksToRemove.map(l => l.nodeId))],
      assetIds: [...new Set(linksToRemove.map(l => l.assetId))],
    });
  } catch (error) {
    setAssets(previousAssets);
    toast.error('解绑失败');
    return;
  }

  toast.success(`已解除「${label}」的关联`, {
    action: {
      label: '撤销',
      onClick: async () => {
        try {
          await Promise.all(
            linksToRemove.map((l) =>
              createNodeAssetLink({ nodeId: l.nodeId, assetId: l.assetId, linkType: l.linkType })
            )
          );
          // TODO: refetch links/assets，确保 UI 与服务端一致
        } catch (e) {
          toast.error('撤销失败');
        }
      },
    },
    duration: 5000,
  });
};

// 按钮渲染
<Button
  variant="ghost"
  size="icon"
  onClick={() => handleUnlink(linksToRemove, asset.name)}
  title="解除关联"
>
  <Unlink className="w-4 h-4 text-gray-400" />
</Button>
```

---

### Acceptance Criteria

| AC  | Criteria                                                       | Verification        |
| --- | -------------------------------------------------------------- | ------------------- |
| AC1 | Tab 合并：仅显示 `节点（PBS+任务）` 和 `文件夹`                | UI 测试             |
| AC2 | 投影算法：仅展示 PBS/TASK 节点                                 | 单元测试 + 手动验证 |
| AC3 | Breadcrumb：显示完整路径，长路径折叠                           | 单元测试            |
| AC4 | 多选：资产并集去重，按 linkType 分栏                           | 集成测试            |
| AC5 | 溯源：摘要徽章 + 展开详情                                      | UI 测试             |
| AC6 | 双搜索：节点/资产独立搜索                                      | 端到端测试          |
| AC7 | 解绑：仅删除 Link，不删除资产                                  | API 测试            |
| AC8 | 批量解绑：多选资产一次性解除关联 **(Focus Group)**             | 集成测试            |
| AC9 | Breadcrumb Tooltip：hover 折叠区显示完整路径 **(Focus Group)** | UI 测试             |

---

## Additional Context

### Dependencies

| Story     | Dependency                         |
| --------- | ---------------------------------- |
| Story 9.1 | DataLibraryDrawer 基础组件 ✅       |
| Story 9.2 | OrganizationTabs + PBS/Task 视图 ✅ |
| Story 9.5 | NodeDataLink + linkType 字段 ✅     |

### Testing Strategy

#### 单元测试

**新增文件:** `apps/web/features/data-library/hooks/__tests__/useNodeTreeProjection.test.ts`

```typescript
describe('useNodeTreeProjection', () => {
  // 基础功能
  it('should filter PBS and TASK nodes only', () => { ... });
  it('should find correct semantic ancestor', () => { ... });
  it('should handle orphan nodes as roots', () => { ... });
  
  // 惰性路径计算 (Winston 建议)
  it('should compute originalPath lazily via getOriginalPath()', () => { ... });
  
  // 边界用例 (Murat 建议)
  it('should handle graph with only PBS nodes', () => { ... });
  it('should handle graph with only TASK nodes', () => { ... });
  it('should handle root node being PBS/TASK', () => { ... });
  it('should handle cross-nested PBS→TASK→PBS→TASK', () => { ... });
  
  // 防御性 (Winston/Amelia 建议)
  it('should limit depth to 100 in findSemanticAncestor', () => { ... });
  it('should return empty array when graph is null', () => { ... });
});
```

**运行命令:**
```bash
cd apps/web && pnpm test -- useNodeTreeProjection
```

#### 集成测试

**更新文件:** `apps/web/features/data-library/__tests__/OrganizationViews.test.tsx`

```typescript
describe('NodeTreeView', () => {
  it('should render projected PBS/TASK tree', () => { ... });
  it('should support multi-select with checkboxes', () => { ... });
  it('should show asset union for multiple selected nodes', () => { ... });
});
```

**运行命令:**
```bash
cd apps/web && pnpm test -- OrganizationViews
```

#### 手动验证

1. **Tab 合并验证**
   - 启动 dev server: `pnpm dev`
   - 打开图谱页面，按 `Cmd+D` 打开数据资源库
   - 确认只有两个 Tab：`节点（PBS+任务）` 和 `文件夹`

2. **投影算法验证**
   - 创建包含 PBS → DATA → TASK 层级的图谱
   - 在节点视图中确认 DATA 节点不显示
   - 确认 TASK 显示为 PBS 的直接子节点

3. **多选验证**
   - 勾选多个节点
   - 确认右侧资产面板显示并集
   - 确认同一资产可出现在多个分栏（如同时是 input 和 reference）

### Notes

- **性能考虑**: 初期不使用虚拟列表，使用 `useMemo` 缓存投影结果。若节点超过 500 可后续引入 `@tanstack/virtual`
- **状态独立**: 节点搜索与资产搜索状态完全独立，互不干扰
- **错误处理**: 投影算法需处理孤儿节点（无父节点）和循环引用（理论上不应存在）

### Red Team Defenses (攻防分析防御措施)

> [!CAUTION]
> 以下防御措施来自 Red Team vs Blue Team 对抗分析，**必须在实现中落实**。

| 风险            | 攻击向量                            | 防御措施                                    | Priority      |
| --------------- | ----------------------------------- | ------------------------------------------- | ------------- |
| 循环祖先链      | A.parentId=B, B.parentId=A → 死循环 | `findSemanticAncestor` 添加 depth limit=100 | ✅ 已实现      |
| 大量孤儿节点    | 1000 roots → 渲染卡顿               | **>50 roots 时显示警告 + 懒加载分页**       | 🔲 Task 2 补充 |
| Provenance 爆炸 | 同资产 1000+ Links → 内存溢出       | **默认显示 10 条 + "查看更多" 按钮**        | 🔲 Task 5 补充 |
| 搜索注入        | 用户输入 `.*` 等正则 → 崩溃         | **对输入执行 `escapeRegex()` 处理**         | 🔲 Task 6 补充 |

```typescript
// 示例: escapeRegex 工具函数
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

## File List (Estimated Changes)

### 新增文件
- `apps/web/features/data-library/hooks/useNodeTreeProjection.ts` (~180 行，含惰性路径计算)
- `apps/web/features/data-library/hooks/useSelectedNodesAssets.ts` (~100 行)
- `apps/web/features/data-library/components/node-tree/NodeTreeView.tsx` (~80 行) ← Amelia 建议拆分
- `apps/web/features/data-library/components/node-tree/NodeTreeItem.tsx` (~120 行)
- `apps/web/features/data-library/components/node-tree/index.ts` (~5 行)
- `apps/web/features/data-library/components/NodeBreadcrumb.tsx` (~60 行)
- `apps/web/features/data-library/components/DualSearch.tsx` (~50 行)
- `apps/web/features/data-library/hooks/__tests__/useNodeTreeProjection.test.ts` (~150 行，含边界用例)

### 修改文件
- `apps/web/features/data-library/components/OrganizationTabs.tsx` (~20 行改动)
- `apps/web/features/data-library/components/DataLibraryDrawer.tsx` (~50 行改动)
- `apps/web/features/data-library/components/AssetCard.tsx` (~80 行改动)
- `apps/web/features/data-library/__tests__/OrganizationViews.test.tsx` (~50 行改动)

### 可删除文件 (可选，保持兼容性可保留)
- `apps/web/features/data-library/components/PbsTreeView.tsx` (被 NodeTreeView 替代)
- `apps/web/features/data-library/components/TaskGroupView.tsx` (被 NodeTreeView 替代)
