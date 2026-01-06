# 垂直布局与共享干线改造方案

> 目标：将「逻辑图」模式替换为垂直树形布局，并实现层级连线“上下中心点连接 + 同级共享水平干线”。

## 决策摘要
- **替换模式**：现有 `logic` 模式改为垂直树形（不新增模式）。
- **连线风格**：匹配高精度原型（细线 + 轻发光）。
- **干线位置**：父节点下中心与子节点上中心的**中点**。
- **折叠/展开**：折叠隐藏的节点不参与布局计算，展开后触发重新布局。

## 颜色与样式（由我统一设定）
- 层级边主色：`#4B8DFF`
- 层级边线宽：`2`
- 发光：`dropShadow(blur=6, color=#7CB6FF, opacity=0.6)`
- 线帽：`round`（圆角端点）

## 影响范围
- 布局插件：`packages/plugins/plugin-layout`
- 协作同步与边样式：`apps/web/features/collab/GraphSyncManager.ts`
- 本地新增边（child/sibling）：`packages/plugins/plugin-mindmap-core`
- 选中态边样式回退：`apps/web/components/graph/hooks/useGraphEvents.ts`
- 图初始化（注册 router）：`apps/web/hooks/useGraph.ts`（或同等入口）
- 折叠/展开触发布局：`BaseLayout` 过滤不可见节点

## 实施步骤与状态
1. [x] 创建/更新方案文档（本文件）
2. [x] **布局替换**：LogicLayout 改为垂直 compactBox；BaseLayout 增加可覆盖排序；新增左→右排序方法
3. [x] **折叠/展开联动**：布局计算剔除不可见节点
4. [x] **路由器注册**：新增 `vertical-shared-trunk` router（共享干线）
5. [x] **层级边统一样式**：GraphSyncManager 应用 router + anchors + 新样式
6. [x] **本地新增边一致化**：AddChild/AddSibling 使用相同 router/anchors/样式
7. [x] **选中/取消样式一致**：useGraphEvents 取消选中回退新样式
8. [x] **测试建议记录**（单测 + e2e）

## 测试建议
- 单测：`packages/plugins/plugin-layout` 断言垂直布局层级关系
- 单测：`apps/web/__tests__/features/GraphSyncManager.test.ts` 断言层级边 router/anchor/样式
- E2E：`apps/web/e2e/node-collapse.spec.ts` 折叠/展开后布局是否收拢/恢复

## 操作影响说明（复制/剪切/粘贴/删除/恢复）
- **复制/粘贴**：粘贴时仍写入层级边元数据；GraphSyncManager 统一套用新路由与样式，布局由当前模式重算。
- **剪切**：剪切会归档节点（隐藏），布局因 `node:change:visible` 触发重算并收拢。
- **删除/归档**：同剪切，隐藏后不会参与布局计算。
- **恢复**：恢复节点可见后触发重算，重新进入正确层级与干线。

## 状态记录
- 2026-01-06：完成布局替换与可见性过滤（已完成第 1~3 步）
- 2026-01-06：完成连线路由、样式与本地新增边一致化（已完成第 4~8 步）
- 2026-01-06：更新“逻辑图”模式提示文案为垂直树形
- 2026-01-06：补充复制/剪切/粘贴/删除/恢复的影响说明
- 2026-01-06：缩短逻辑图间距（H=90, V=50），新增排序与层级边样式测试
- 2026-01-06：测试执行完成：`pnpm --filter @cdm/plugin-layout test`、`pnpm --filter @cdm/web test`
- 2026-01-06：补充连线兜底逻辑（bbox 不可用时回退）+ 布局/尺寸变更后强制刷新层级边
- 2026-01-06：按布局模式区分层级边路由（logic/free 使用共享干线，mindmap/network 使用 smooth）
- 2026-01-06：更新 GraphSyncManager 测试并重新执行：`pnpm --filter @cdm/plugin-layout test`、`pnpm --filter @cdm/web test`
- 2026-01-06：修复共享干线在父子居中时的退化（避免重复顶点导致连线消失）
- 2026-01-06：居中对齐时让 router 返回 null，回退直线连接，避免中间分支消失
