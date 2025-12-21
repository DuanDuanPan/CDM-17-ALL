# 归档箱无法展示数据 - Root Cause 分析

**时间**: 2025-12-21  
**问题**: 后端正确返回归档节点数据，但前端归档箱显示"暂无归档节点"  
**严重程度**: 🔴 HIGH  

## 问题描述

用户打开归档箱时：
- ✅ 后端 API `/api/nodes/archived` 正确返回数据
- ❌ 前端归档箱（Archive Drawer）显示空状态："暂无归档节点"

**API 响应（正确）**:
```json
{
  "results": [
    {
      "id": "246ef929-9a59-40bf-93c3-51033a145add",
      "label": "需求分析报告",
      "type": "DATA",
      "tags": ["报告"],
      "isArchived": true,
      "graphId": "demo-graph-1",
      ...
    }
  ],
  "total": 1,
  "hasMore": false
}
```

## Root Cause

**`ArchiveDrawer` 组件在 TopBar 中渲染时，未传递 `graphId` prop。**

### 证据链

####  1. ArchiveDrawer 渲染代码 (`TopBar.tsx:131-135`)

```tsx
<ArchiveDrawer
  isOpen={isArchiveOpen}
  onClose={() => setIsArchiveOpen(false)}
  onRestore={handleArchiveRestore}
  // ❌ 缺少: graphId prop
/>
```

#### 2. TopBar 有 graphId 可用 (`TopBar.tsx:57-59, 129`)

```tsx
const graphContext = useGraphContextOptional();
// graphContext?.graphId 可用，并且已经传给 GlobalSearchDialog

<GlobalSearchDialog
  onSelect={handleSearchSelect}
  graphId={graphContext?.graphId || undefined}  // ✅ 这里传了
/>

<ArchiveDrawer
  isOpen={isArchiveOpen}
  //  ❌ 但这里没传
/>
```

#### 3. ArchiveDrawer 的 fetchArchivedNodes 逻辑 (`ArchiveDrawer.tsx:67-85`)

```tsx
const fetchArchivedNodes = useCallback(async () => {
    setIsLoading(true);
    try {
        const params = new URLSearchParams();
        if (graphId) params.set('graphId', graphId);  // graphId 未传入 = undefined
        
        const response = await fetch(
            `${API_BASE_URL}/api/nodes/archived?${params.toString()}`
        );
        // params.toString() = "" (空字符串)
        // 实际请求: http://localhost:3001/api/nodes/archived?
        
        if (response.ok) {
            const data = await response.json();
            setArchivedNodes(data.results || []);
        }
    } catch (error) {
        console.error('Failed to fetch archived nodes:', error);
    } finally {
        setIsLoading(false);
    }
}, [graphId]);  // graphId 依赖，但为 undefined
```

#### 4. 后端行为 (`nodes.service.ts:331-332`)

```tsx
async listArchived(graphId?: string): Promise<SearchResponse> {
    const { results: nodes, total } = await this.nodeRepo.findArchived(graphId);
    // 如果 graphId 为 undefined，findArchived 会返回所有图的归档节点
}
```

#### 5. Repository 实现 (`node.repository.ts:153-169`)

```tsx
async findArchived(graphId?: string): Promise<{ results: NodeWithGraph[]; total: number }> {
    const where: any = { isArchived: true };
    if (graphId) {  // graphId 为 undefined，不添加过滤
        where.graphId = graphId;
    }
    
    const [results, total] = await Promise.all([
        prisma.node.findMany({
            where,  // where = { isArchived: true }  ← 返回所有图的归档节点
            include: { graph: { select: { id: true, name: true } } },
            orderBy: [{ archivedAt: 'desc' }],
        }),
        prisma.node.count({ where }),
    ]);
    
    return { results: results as NodeWithGraph[], total };
}
```

### 为什么用户看到空数据？

**可能的原因**:

1. **跨域问题 (CORS)**:
   - 前端运行在不同端口
   - API 请求被浏览器阻止
   - `response.ok` 为 false，进入 error handler
   - `setArchivedNodes([])` 设置为空数组

2. **graphId 问题**:
   - 虽然后端没有 graphId 过滤也能返回数据
   - 但可能前端网络请求失败或被拦截

3. **最可能**: **graphContext 未正确初始化**
   - TopBar 中 `graphContext?.graphId` 为 `undefined`
   - 但实际上应该有 `graphId`
   - 导致前端发送请求到 `/api/nodes/archived?` （无参数）
   - **然而后端应该还是返回数据的**

**真正的 Root Cause**: 需要在浏览器 DevTools 中检查：
- Network 请求是否成功？
- 返回的 data.results 是否为空？
- 是否有 CORS 或其他错误？

## 直接原因

**TopBar 未传递 `graphId` 给 ArchiveDrawer。**

虽然后端在没有 graphId 的情况下也能返回数据，但：
1. **语义不清晰**: ArchiveDrawer 应该只显示当前图的归档节点
2. **可能的边界情况**: 如果系统中有多个图，缺少 graphId 会返回所有图的归档节点，这不符合预期

## 修复方案

### 方案 1: 传递 graphId (推荐)

```tsx
// apps/web/components/layout/TopBar.tsx:131-135

<ArchiveDrawer
  isOpen={isArchiveOpen}
  onClose={() => setIsArchiveOpen(false)}
  graphId={graphContext?.graphId || undefined}  // ✅ 添加这一行
  onRestore={handleArchiveRestore}
/>
```

### 方案 2: 在 ArchiveDrawer 中获取 graphId

如果不想在 TopBar 传递，可以在 ArchiveDrawer 内部自己获取：

```tsx
// apps/web/components/ArchiveBox/ArchiveDrawer.tsx

import { useGraphContextOptional } from '@/contexts';

export function ArchiveDrawer({ isOpen, onClose, onRestore }: ArchiveDrawerProps) {
    const graphContext = useGraphContextOptional();
    const graphId = graphContext?.graphId;
    
    // ... rest of the code
}
```

**推荐使用方案 1**，因为：
- ✅ 更明确的依赖关系
- ✅ 可测试性更好（可以传入 mock graphId）
- ✅ 符合 React 的 props drilling 原则

## 实施步骤

1. 修改 `apps/web/components/layout/TopBar.tsx`
2. 在 ArchiveDrawer 渲染处添加 `graphId` prop
3. 测试归档箱是否正确显示数据

## 影响范围

- **修改文件**: 1 个
- **修改行数**: 1 行
- **测试范围**: 归档箱功能

---

**预期结果**: 修复后，归档箱将正确显示当前图的归档节点。
