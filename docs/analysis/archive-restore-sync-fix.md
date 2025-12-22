# 归档/恢复操作多客户端同步修复

## 问题描述
归档/恢复操作在执行后没有正确传递给其他协作客户端，导致只有操作发起者能看到变化。

## Root Cause 分析

### 问题1：ArchiveDrawer 恢复操作没有更新 Yjs
`ArchiveDrawer.handleRestore` 只调用了后端 API 和本地 X6 `show()`，没有更新 Yjs 共享状态中的 `isArchived: false`。

**原代码路径：**
```
用户点击恢复 → API调用 → 本地 X6 show() → 其他客户端看不到变化
```

### 问题2：GraphSyncManager.applyNodeToGraph 没有处理可见性
即使 Yjs 中 `isArchived` 字段更新了，其他客户端接收到变化后只更新了节点的 `data`，没有根据 `isArchived` 调用 `hide()` 或 `show()`。

## 修复方案

### 修复1: 扩展 GraphContext (GraphContext.tsx)
添加 `yDoc` 字段到 GraphContext，使 ArchiveDrawer 可以访问 Yjs 文档。

```typescript
export interface GraphContextValue {
    graph: Graph | null;
    graphId: string | null;
    yDoc: Y.Doc | null;  // 新增
    navigateToNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;
}
```

### 修复2: 更新 page.tsx
传递 `yDoc` 给 GraphProvider：
```tsx
<GraphProvider graph={graph} graphId={graphId} yDoc={collab.yDoc} onNodeSelect={handleNodeSelect}>
```

### 修复3: 更新 ArchiveDrawer.handleRestore
现在 `handleRestore` 会:
1. 调用后端 API
2. 更新 Yjs 状态 (`isArchived: false`)
3. 更新本地 X6 可见性
4. 更新本地组件状态
5. 通知父组件

```typescript
// 2. Story 2.7: Update Yjs to sync to other clients
if (yDoc) {
    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    yDoc.transact(() => {
        nodeIds.forEach(id => {
            const existing = yNodes.get(id);
            if (existing) {
                yNodes.set(id, {
                    ...existing,
                    isArchived: false,
                    archivedAt: null,
                    updatedAt: now,
                });
            }
        });
    });
}
```

### 修复4: 更新 GraphSyncManager.applyNodeToGraph
现在当收到远程 Yjs 更新时，会根据 `isArchived` 状态自动处理节点可见性：

```typescript
// Story 2.7: Handle visibility based on isArchived state
if (data.isArchived) {
    existingNode.hide();
    const edges = this.graph.getConnectedEdges(existingNode);
    edges?.forEach(edge => edge.hide());
} else {
    existingNode.show();
    const edges = this.graph.getConnectedEdges(existingNode);
    edges?.forEach(edge => {
        const source = edge.getSourceCell();
        const target = edge.getTargetCell();
        if (source?.isVisible() && target?.isVisible()) {
            edge.show();
        }
    });
}
```

## 修复后的数据流

**归档操作 (useClipboard.cut/deleteNodes)：**
```
用户删除/剪切 → Yjs更新(isArchived:true) → 本地hide() → API调用
                    ↓
               其他客户端 Yjs observe → applyNodeToGraph → hide()
```

**恢复操作 (ArchiveDrawer.handleRestore)：**
```
用户点击恢复 → API调用 → Yjs更新(isArchived:false) → 本地show()
                              ↓
                         其他客户端 Yjs observe → applyNodeToGraph → show()
```

## 影响的文件
- `apps/web/contexts/GraphContext.tsx` - 添加 yDoc 支持
- `apps/web/app/graph/[graphId]/page.tsx` - 传递 yDoc 给 GraphProvider
- `apps/web/components/ArchiveBox/ArchiveDrawer.tsx` - 恢复时更新 Yjs
- `apps/web/components/layout/TopBar.tsx` - 简化 handleArchiveRestore
- `apps/web/features/collab/GraphSyncManager.ts` - 处理节点可见性同步

## 验证方式
1. 打开两个浏览器窗口，连接到同一个图谱
2. 在窗口1中选择节点，按 Delete 键归档
3. 验证窗口2中该节点自动隐藏
4. 在窗口1中打开归档箱，恢复该节点
5. 验证窗口2中该节点自动显示
