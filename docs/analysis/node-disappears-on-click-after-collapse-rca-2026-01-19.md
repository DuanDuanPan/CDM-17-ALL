# 折叠后点击导致节点“消失” - Root Cause 分析（RCA）

**时间**: 2026-01-19  
**问题**: 折叠「分系统设计」后，点击「总体方案设计」下的子节点（如「轨道设计」）会导致节点从画布原位置消失（实际为层级被错误重挂载 + 布局重算挪走）。  
**严重程度**: 🔴 HIGH（结构性数据被错误修改，可能被协作/持久化链路带走）  
**范围**: `apps/web`（Next.js）+ X6 Graph + `packages/plugins/plugin-layout` 自动布局 + Yjs 协作  

---

## 1. 现象描述（Symptoms）

复现操作（用户路径）：
1. 清空画布（仅保留中心节点）
2. 拖入模板：「卫星总体设计协同」
3. 折叠「分系统设计」
4. 点击「总体方案设计」下的子节点，并切换该子节点点击事件

可观测现象：
- 被点击节点在画布中“消失”（用户视角）
- 你补充的现象：消失的子节点在**大纲视图**中变成了「分系统设计」的子节点（这与实际数据 `parentId` 被改写一致）

---

## 2. 影响面（Impact）

- **数据层级被污染**：节点的 `node.data.parentId` 被错误改写，改变树结构。
- **视图不一致**：层级边（hierarchical edge）与 `parentId` 可能不一致，导致大纲、布局、导航表现错乱。
- **协作放大**：`node:change:data` 会被 `GraphSyncManager` 同步到 Yjs，进一步在多人协作/持久化中扩散。

---

## 3. 证据保全（Evidence）

### 3.1 最小复现（MRE）

在 `http://127.0.0.1:3000/graph/<graphId>?userId=test1`：
1. 左侧「模板」拖入「卫星总体设计协同」
2. 选中「分系统设计」→ 折叠（快捷键 `⌘[`）
3. 点击「轨道设计」

### 3.2 关键状态变化（点击前后）

在一次复现中（通过浏览器执行 `window.__cdmGraph` 读取 X6 Graph 实例）：

- 折叠后点击前：
  - `分系统设计`：`collapsed === true`
  - `轨道设计.parentId === 总体方案设计.id`
- 点击 `轨道设计` 后（未拖拽）：
  - `轨道设计.parentId` **变为** `分系统设计.id`
  - `轨道设计.order` 发生变化（符合“插入到目标后 + normalize”的写法）

并且同时观察到：
- `轨道设计` 的层级边（hierarchical edge）仍然是 `总体方案设计 -> 轨道设计`（边关系未跟随 `parentId` 更新），形成结构不一致。

---

## 4. Root Cause（根因）

**自动布局模式（非 `free`）下，`useLayoutPlugin` 监听 `node:mouseup` 并执行“拖拽重挂载（reparent）”逻辑，但没有区分“点击 vs 拖拽”，且 `findTargetNode` 未过滤隐藏节点。**

当「分系统设计」折叠后，其子树节点通过 `hide()` 变为不可见，但仍保留在 Graph 模型中并参与 hit-test；布局算法（`BaseLayout.buildHierarchy`）会跳过不可见节点进行重新布局，导致可见节点位置更容易与隐藏节点的 bbox 区域重叠/接近。

结果：用户只是点击了「轨道设计」，mouseup 时被误判为“drop 到某个（隐藏）节点上”，触发 `parentId` 改写与布局重算，造成节点从原处“消失/被挪走”。

---

## 5. 代码级证据链（Causal Chain）

### 5.1 错误重挂载入口：`apps/web/hooks/useLayoutPlugin.ts`

`node:mouseup` 事件在非 `free` 模式下执行重挂载逻辑：

```ts
graph.on('node:mouseup', handleNodeMouseUp);
```

核心写入（会直接改 `parentId`）：

```ts
const dropTarget = findTargetNode(graph, node.id, local.x, local.y);
if (!dropTarget) return;
const targetData = dropTarget.getData() || {};
const parentId = targetData.parentId ?? (targetData.type === 'root' ? targetData.id : undefined);
const newOrder = (targetData.order ?? 0) + 0.5;
node.setData({ ...currentData, parentId, order: newOrder });
normalizeSiblingOrder(graph, parentId, currentMode);
layoutManager?.recalculate(true);
```

问题点：
- 没有任何“拖拽阈值/移动距离”判定；**点击也会进入这条路径**。
- 只要 `findTargetNode` 找到一个 bbox 命中目标，就会改写 `parentId`。

### 5.2 命中算法未过滤隐藏节点：`apps/web/hooks/useLayoutPlugin.ts`

```ts
function findTargetNode(graph: Graph, draggedId: string, x: number, y: number) {
  const nodes = graph.getNodes().filter((n) => n.id !== draggedId);
  return nodes.find((n) => {
    const bbox = n.getBBox();
    return x >= bbox.x && x <= bbox.x + bbox.width && y >= bbox.y && y <= bbox.y + bbox.height;
  });
}
```

问题点：
- 没有排除 `!n.isVisible()` 的节点 → 折叠后隐藏节点仍参与命中。

### 5.3 布局算法跳过隐藏节点导致位置“挤压”：`packages/plugins/plugin-layout/src/strategies/BaseLayout.ts`

```ts
if (typeof n.isVisible === 'function' && !n.isVisible()) return false;
```

这会导致：
- 折叠后，布局只针对“可见节点子树”重排；
- 隐藏节点仍保留 bbox，但不参与布局，增加可见节点落入隐藏节点 bbox 区域的概率。

---

## 6. 为什么“大纲视图显示变成分系统设计子节点”？

大纲数据源（`apps/web/components/graph/hooks/useOutlineData.ts`）是根据 **hierarchical edges** 构建子关系，同时也读取 `node.getData().parentId` 作为一致性字段（重排时显式写入）。

当 `useLayoutPlugin` 错误改写了 `parentId` 时，大纲视图会将其视为新的父子关系来源之一，因此出现“子节点变成分系统设计的子节点”的表现（即便层级边仍旧指向旧父节点，视图也可能出现不一致/闪烁/重建）。

---

## 7. 止血与缓解（Mitigation）

短期（不改代码）：
- 折叠大分支后，避免在该区域附近点击其他节点；优先使用搜索（`Cmd/Ctrl+K`）定位并居中后再操作。
- 需要频繁点击/选择时切到 `自由` 布局模式（`free` 模式下该重排逻辑不会运行）。

中期（建议产品侧开关）：
- 为“非 free 模式的 canvas 拖拽重排”加 feature flag，默认关闭，仅保留“显式的大纲拖拽重排”。

---

## 8. 修复建议（Fix Suggestions，仅建议）

1. **严格区分点击 vs 拖拽**：只有发生实际拖动（超过阈值）才允许进入重排逻辑（可用 pointerdown/up 的位移判断或 `node:moved` 标记）。
2. **过滤 dropTarget**：`findTargetNode` 必须跳过不可见节点（`!isVisible()`）、归档节点等。
3. **统一树结构真相源**：避免 `parentId` 与 hierarchical edges 同时作为权威来源；保证重排时两者一致更新。
4. **补回归用例**：E2E 覆盖“模板插入 → 折叠分系统设计 → 点击轨道设计 → 断言 parentId 不变”。

