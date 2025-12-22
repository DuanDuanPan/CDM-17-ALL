# 永久删除功能详细设计方案

## 1. 需求背景

当前系统实现了"软删除"（归档）机制，但缺少"永久删除"功能的多端同步支持。需要实现：
- 从图形中选中节点进行永久删除（支持单选/多选）
- 从归档箱中永久删除（支持单个/批量）
- 多端实时同步删除操作
- 保证现有归档功能不受影响

## 2. 当前架构分析

### 2.1 软删除（归档）数据流 ✅ 已实现

```
用户操作 → Yjs 更新(isArchived=true) → GraphSyncManager → X6 hide()
                                    ↓
                          → API POST /nodes/:id:archive
                                    ↓
                          其他客户端 Yjs observe → applyNodeToGraph → hide()
```

### 2.2 硬删除（永久删除）数据流 ❌ 需要实现

```
用户操作 → 确认对话框 → Yjs delete(nodeId) → GraphSyncManager → X6 removeCell()
                     ↓                                           ↓
                     → API DELETE /nodes/:id              其他客户端 Yjs observe
                                                                   ↓
                                                          removeNodeFromGraph()
```

## 3. 设计方案

### 3.1 删除策略

| 操作场景 | 默认行为 | 快捷键 | 需要确认 |
|---------|---------|--------|---------|
| 图形中 Delete 键 | 归档（软删除） | Delete | 否 |
| 图形中永久删除 | 永久删除 | Shift+Delete | ✅ 是 |
| 归档箱单个删除 | 永久删除 | 点击"删除"按钮 | ✅ 是 |
| 归档箱批量删除 | 永久删除 | 点击"批量删除"按钮 | ✅ 是 |
| 归档箱清空 | 永久删除 | 点击"清空"按钮 | ✅ 是 |

### 3.2 交互设计

#### 3.2.1 图形中删除
```
用户选择节点 → Delete 键
            ↓
        归档节点（可通过归档箱恢复）
        
用户选择节点 → Shift+Delete
            ↓
        显示确认对话框：
        "确认永久删除 X 个节点？此操作无法撤销。"
        [取消] [永久删除]
            ↓
        永久删除节点及其子节点
```

#### 3.2.2 归档箱删除
```
归档箱 → 选择节点 → 点击"删除"
                   ↓
        显示确认对话框：
        "确认永久删除 X 个节点？此操作无法撤销。"
        [取消] [永久删除]
                   ↓
        永久删除节点
```

## 4. 技术实现

### 4.1 新增/修改的文件

| 文件 | 修改内容 | 状态 |
|------|---------|------|
| `apps/web/hooks/useClipboard.ts` | 添加 hardDeleteNodes() 方法 | ✅ 完成 |
| `apps/web/hooks/useClipboardShortcuts.ts` | 添加 Shift+Delete 快捷键 | ✅ 完成 |
| `apps/web/components/graph/GraphComponent.tsx` | 集成 hardDeleteNodes | ✅ 完成 |
| `apps/web/components/ArchiveBox/ArchiveDrawer.tsx` | 修改 handleDelete 以同步 Yjs | ✅ 完成 |
| `apps/web/features/collab/GraphSyncManager.ts` | 验证 delete 事件处理（已实现） | ✅ 完成 |
| `apps/api/src/modules/nodes/repositories/node.repository.ts` | 添加 delete() 方法 | ✅ 完成 |
| `apps/api/src/modules/nodes/nodes.service.ts` | 添加 hardDelete() 方法 | ✅ 完成 |
| `apps/api/src/modules/nodes/nodes.controller.ts` | 添加 DELETE /api/nodes/:id 端点 | ✅ 完成 |

### 4.2 核心代码实现

#### 4.2.1 useClipboard - 添加永久删除功能

```typescript
// apps/web/hooks/useClipboard.ts

/**
 * 永久删除选中节点及其子节点
 * 通过 Yjs 同步到其他客户端
 */
const hardDeleteNodes = useCallback(() => {
    if (!graphRef.current || !yDoc || selectedNodes.length === 0) {
        return;
    }

    const yNodes = yDoc.getMap('nodes');
    const yEdges = yDoc.getMap('edges');

    // 收集选中的节点 ID
    const selectedIds = new Set(selectedNodes.map(n => n.id));

    // 保护根节点
    if (selectedIds.has('center-node')) {
        toast.warning('无法删除根节点');
        return;
    }

    // 显示确认对话框
    showConfirm({
        title: '确认永久删除',
        description: `将永久删除 ${selectedIds.size} 个节点及其所有子节点。此操作无法撤销。`,
        confirmText: '永久删除',
        cancelText: '取消',
        variant: 'danger',
        onConfirm: async () => {
            // 1. 查找所有子节点
            const findAllDescendants = (parentIds: Set<string>): Set<string> => {
                const descendants = new Set<string>();
                const queue = [...parentIds];
                while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    yNodes.forEach((nodeData, nodeId) => {
                        const data = nodeData as { parentId?: string };
                        if (data.parentId === currentId && !descendants.has(nodeId)) {
                            descendants.add(nodeId);
                            queue.push(nodeId);
                        }
                    });
                }
                return descendants;
            };

            const descendantIds = findAllDescendants(selectedIds);
            const allNodesToDelete = new Set([...selectedIds, ...descendantIds]);

            // 2. 查找所有需要删除的边
            const edgesToDelete = new Set<string>();
            yEdges.forEach((edgeData, edgeId) => {
                const edge = edgeData as { source: string; target: string };
                if (allNodesToDelete.has(edge.source) || allNodesToDelete.has(edge.target)) {
                    edgesToDelete.add(edgeId);
                }
            });

            // 3. 调用后端 API 删除（会级联删除数据库中的相关数据）
            try {
                await Promise.all(
                    Array.from(allNodesToDelete).map(id =>
                        fetch(`/api/nodes/${id}`, { method: 'DELETE' })
                    )
                );
            } catch (error) {
                console.error('[Clipboard] Failed to delete nodes on server:', error);
                toast.error('删除失败，请稍后重试');
                return;
            }

            // 4. 从 Yjs 中删除（触发多端同步）
            yDoc.transact(() => {
                // 先删除边
                edgesToDelete.forEach(edgeId => {
                    yEdges.delete(edgeId);
                });
                // 再删除节点
                allNodesToDelete.forEach(nodeId => {
                    yNodes.delete(nodeId);
                });
            });

            // 5. 清除选择
            clearSelection();

            const childCount = descendantIds.size;
            if (childCount > 0) {
                toast.success(`已永久删除 ${selectedIds.size} 个节点及 ${childCount} 个子节点`);
            } else {
                toast.success(`已永久删除 ${selectedIds.size} 个节点`);
            }
        },
    });
}, [yDoc, selectedNodes, clearSelection, showConfirm]);
```

#### 4.2.2 ArchiveDrawer - 修改 handleDelete 以同步 Yjs

```typescript
// apps/web/components/ArchiveBox/ArchiveDrawer.tsx

const handleDelete = useCallback((nodeIds: string[]) => {
    if (nodeIds.length === 0) return;

    const count = nodeIds.length;
    showConfirm({
        title: '确认永久删除',
        description: `确定要永久删除这 ${count} 个节点吗？此操作无法撤销。`,
        confirmText: '永久删除',
        cancelText: '取消',
        variant: 'danger',
        onConfirm: async () => {
            setProcessingIds(prev => {
                const next = new Set(prev);
                nodeIds.forEach(id => next.add(id));
                return next;
            });

            try {
                // 1. 调用后端 API 删除
                await Promise.all(nodeIds.map(id =>
                    fetch(`${API_BASE_URL}/api/nodes/${id}`, { method: 'DELETE' })
                ));

                // 2. 从 Yjs 中删除（触发多端同步）
                if (yDoc) {
                    const yNodes = yDoc.getMap('nodes');
                    const yEdges = yDoc.getMap('edges');

                    yDoc.transact(() => {
                        // 删除相关边
                        yEdges.forEach((edgeData, edgeId) => {
                            const edge = edgeData as { source: string; target: string };
                            if (nodeIds.includes(edge.source) || nodeIds.includes(edge.target)) {
                                yEdges.delete(edgeId);
                            }
                        });
                        // 删除节点
                        nodeIds.forEach(id => {
                            yNodes.delete(id);
                        });
                    });
                }

                // 3. 更新本地状态
                setArchivedNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    nodeIds.forEach(id => next.delete(id));
                    return next;
                });

                toast.success(`已永久删除 ${count} 个节点`);
            } catch (error) {
                console.error('Failed to delete nodes:', error);
                toast.error('删除失败，请稍后重试');
            } finally {
                setProcessingIds(prev => {
                    const next = new Set(prev);
                    nodeIds.forEach(id => next.delete(id));
                    return next;
                });
            }
        },
    });
}, [yDoc, showConfirm]);
```

#### 4.2.3 GraphSyncManager - 验证删除处理

现有代码已经支持：

```typescript
// apps/web/features/collab/GraphSyncManager.ts - setupRemoteToLocalSync()

// Observe node changes
this.yNodes.observe((event) => {
    event.changes.keys.forEach((change, nodeId) => {
        if (change.action === 'delete') {
            this.removeNodeFromGraph(nodeId);  // ✅ 已实现
        }
    });
});

// Observe edge changes  
this.yEdges.observe((event) => {
    event.changes.keys.forEach((change, edgeId) => {
        if (change.action === 'delete') {
            this.removeEdgeFromGraph(edgeId);  // ✅ 已实现
        }
    });
});
```

### 4.3 键盘快捷键绑定

```typescript
// 在 GraphComponent 或 useKeyboardShortcuts 中添加

useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Delete' && selectedNodes.length > 0) {
            e.preventDefault();
            if (e.shiftKey) {
                // Shift+Delete: 永久删除
                hardDeleteNodes();
            } else {
                // Delete: 归档（软删除）
                deleteNodes();
            }
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
}, [selectedNodes, deleteNodes, hardDeleteNodes]);
```

## 5. 后端验证

### 5.1 节点删除 API

确认 DELETE `/api/nodes/:id` 支持：
- 级联删除子节点（通过数据库外键 CASCADE）
- 级联删除相关边
- 返回适当的状态码

```typescript
// apps/api/src/modules/nodes/nodes.service.ts

async hardDelete(nodeId: string): Promise<boolean> {
    // 使用 Prisma 的 cascade 删除
    // 1. 删除相关边（如果没有配置 cascade）
    await this.prisma.edge.deleteMany({
        where: {
            OR: [
                { sourceId: nodeId },
                { targetId: nodeId },
            ],
        },
    });

    // 2. 递归删除子节点
    const children = await this.prisma.node.findMany({
        where: { parentId: nodeId },
        select: { id: true },
    });
    for (const child of children) {
        await this.hardDelete(child.id);
    }

    // 3. 删除节点本身
    await this.prisma.node.delete({
        where: { id: nodeId },
    });

    return true;
}
```

## 6. 测试策略

### 6.1 单元测试

| 测试用例 | 描述 |
|---------|------|
| `should delete node from Yjs` | 验证 Yjs delete 触发正确事件 |
| `should cascade delete children` | 验证子节点被正确删除 |
| `should delete related edges` | 验证相关边被删除 |
| `should protect root node` | 验证无法删除根节点 |

### 6.2 集成测试

| 测试用例 | 描述 |
|---------|------|
| `should sync delete to other clients` | 验证多端同步 |
| `should not break archive/restore` | 验证归档功能不受影响 |
| `should show confirmation dialog` | 验证确认对话框显示 |

### 6.3 回归测试

- [ ] Delete 键仍然执行归档操作
- [ ] Ctrl+Z 可以撤销归档操作
- [ ] 归档箱恢复功能正常
- [ ] 多端归档同步正常

## 7. 实施计划

### Phase 1: 核心功能（优先级高）✅ 已完成
1. ✅ 修复确认对话框样式（使用 useConfirmDialog 替换 confirm()）
2. ✅ 修改 ArchiveDrawer.handleDelete 添加 Yjs 同步
3. ✅ 验证 GraphSyncManager 删除处理

### Phase 2: 图形中永久删除 ✅ 已完成
1. ✅ 在 useClipboard 添加 hardDeleteNodes
2. ✅ 在 useClipboardShortcuts 添加 Shift+Delete 快捷键绑定
3. ✅ 更新 GraphComponent 集成新功能

### Phase 3: 测试与验证 🔄 进行中
1. 单元测试
2. 多端同步测试
3. 回归测试

## 8. 风险与缓解

| 风险 | 缓解措施 |
|-----|---------|
| 误删除 | 强制二次确认 + 明确的文案提示 |
| 同步失败 | 先调用 API 成功后再更新 Yjs |
| 性能问题（大量子节点） | 使用 Yjs transaction 批量删除 |
| 破坏现有功能 | 详细的回归测试 |

---

**文档版本**: v1.0
**创建日期**: 2025-12-22
**作者**: AI Assistant
