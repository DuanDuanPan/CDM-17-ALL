# Tags & Archive 协作同步修复报告

**时间**: 2025-12-21  
**问题**: Story 2.5 标签和归档字段无法在多用户间同步  
**严重程度**: 🔴 CRITICAL  

## 问题描述

当用户 A 在左侧浏览器设置节点标签时，用户 B 在右侧浏览器看不到标签更新。同样的问题也影响归档功能。

## Root Cause

`GraphSyncManager.ts` 在以下关键位置**遗漏了 `tags`, `isArchived`, `archivedAt` 字段**的同步：

1. ❌ `YjsNodeData` 接口定义中缺失这些字段
2. ❌ `syncNodeToYjs()` 方法未包含这些字段
3. ❌ `applyNodeToGraph()` 方法未恢复这些字段
4. ❌ `syncAllNodesToYjs()` 批量同步时也未包含

**同步流程断点**:
```
Browser A: 设置 tags → X6.setData → node:change:data 事件
  → GraphSyncManager.syncNodeToYjs() 
  → ❌ YjsNodeData 创建时丢弃 tags 字段
  → Yjs Doc (缺少 tags)
  → WebSocket 同步到 Browser B
  → ❌ Browser B 接收到的数据中无 tags
  → UI 显示为空
```

## 修复内容

### 1. 更新 `YjsNodeData` 接口 (第 11-36 行)
```typescript
export interface YjsNodeData {
    // ... 现有字段 ...
    
    // Story 2.5: Tags and Archive fields
    tags?: string[];
    isArchived?: boolean;
    archivedAt?: string | null;
}
```

### 2. 修复 `syncNodeToYjs()` - Local → Yjs 同步 (第 330-350 行)
```typescript
const yjsNodeData: YjsNodeData = {
    // ... 现有字段 ...
    
    // Story 2.5: Sync tags and archive fields
    tags: Array.isArray(data.tags) ? data.tags : undefined,
    isArchived: typeof data.isArchived === 'boolean' ? data.isArchived : undefined,
    archivedAt: data.archivedAt !== undefined ? data.archivedAt : undefined,
};
```

### 3. 修复 `applyNodeToGraph()` - Yjs → X6 Graph 恢复 (第 449-490 行)

**更新现有节点**:
```typescript
existingNode.setData({
    // ... 现有字段 ...
    
    // Story 2.5: Apply tags and archive fields
    tags: data.tags,
    isArchived: data.isArchived,
    archivedAt: data.archivedAt,
});
```

**添加新节点**:
```typescript
this.graph.addNode({
    // ...
    data: {
        // ... 现有字段 ...
        
        // Story 2.5: Apply tags and archive fields
        tags: data.tags,
        isArchived: data.isArchived,
        archivedAt: data.archivedAt,
    },
});
```

### 4. 修复 `syncAllNodesToYjs()` - 批量同步 (第 695-714 行)
```typescript
const yjsNodeData: YjsNodeData = {
    // ... 现有字段 ...
    
    // Story 2.5: Sync tags and archive fields
    tags: Array.isArray(data.tags) ? data.tags : undefined,
    isArchived: typeof data.isArchived === 'boolean' ? data.isArchived : undefined,
    archivedAt: data.archivedAt !== undefined ? data.archivedAt : undefined,
};
```

## 验证步骤

1. **打开两个浏览器**，登录到同一个 Graph
2. **浏览器 A**: 选择一个节点，在右侧面板添加标签 `#数据库`, `#设计`
3. **浏览器 B**: 应该立即看到节点上显示这两个蓝色标签徽章
4. **浏览器 A**: 归档该节点
5. **浏览器 B**: 节点应该从画布消失（被隐藏）
6. **打开归档箱**: 两边都应该看到归档的节点

## 影响范围

### ✅ 已修复
- ✅ 标签实时同步
- ✅ 归档状态实时同步
- ✅ 归档时间戳同步
- ✅ 初始加载时正确恢复标签/归档状态
- ✅ 批量同步（布局重算时）包含标签/归档

### 📋 相关功能
- Story 2.5: 数据组织与全图检索
  - AC#2.2: 标签在节点上可见 ✅
  - AC#3.2: 点击标签触发搜索 (依赖此修复)
  - AC#4.1-4.3: 归档功能 ✅

## 技术细节

**关键设计决策**:
- 使用可选类型检查 `Array.isArray()` 和 `typeof` 确保类型安全
- 保持 `undefined` 而非 `null` 以避免 Yjs 序列化问题
- 与现有字段（如 `nodeType`, `props`）保持一致的同步模式

**性能影响**:
- 额外的 3 个字段同步，数据量增加 < 1KB/节点
- 无需额外的网络请求，利用现有 Yjs WebSocket 通道
- 对于 100 个节点的画布，额外开销 < 100KB

## 遗留问题

⚠️ **仍需解决**（来自 Story 2.5 代码审查）:
- [ ] GlobalSearchDialog 未集成到应用布局
- [ ] TagEditor 未集成到 PropertyPanel
- [ ] ArchiveDrawer 无 UI 入口
- [ ] Tag 点击事件无监听者（AC#3.2）

这些问题不影响本次修复的协作同步功能，但影响完整的用户体验。

---

**修复完成**: 标签和归档字段现在可以在所有协作用户之间正确同步。
