# 测试与代码逻辑对齐修复记录（2025-12-28）

> 目标：由于开发过程中代码逻辑迭代较快，部分测试（尤其是 Playwright E2E）与最新实现不匹配，导致测试失败或不稳定。本次对测试用例逐步复现、定位根因并完成修复，使测试重新稳定可用。

## 一、问题背景与现象

### 1) 主要失败集中在 E2E（Playwright）
在运行 `pnpm --filter @cdm/web test:e2e` 时，出现以下典型问题：

- **创建/操作节点时后端报 500**
  - 触发路径通常为前端在 E2E 测试过程中调用 `/api/nodes` `POST`。
  - 具体表现为：测试导航到某个 graph 后，操作节点（创建/粘贴/复制/删除/协作等）会触发后端 Prisma 外键约束，返回 500。

- **右键菜单/粘贴等交互不稳定（flaky）**
  - 键盘模拟粘贴（`Meta+V`）在无用户手势时被浏览器/自动化环境限制，导致测试偶发失败。
  - 右键菜单悬浮层可能拦截点击（menu/backdrop overlay intercept），导致 locator click 超时。

- **编辑行为与预期不一致**
  - 测试使用 `Escape` 取消编辑，但 UI 的 `onBlur` 仍可能触发提交（commit），导致“取消”被覆盖。

### 2) `pnpm test`（monorepo 单测）也出现不通过
主要症状是 `apps/web` 测试环境在 teardown 后仍有异步 `setState` 发生，Vitest 报：
- `Unhandled Rejection` / `window is not defined`
- 原因是 hook 内部异步请求结束后仍在更新 state（组件已卸载）。

---

## 二、根因分析（Root Cause）

### 根因 1：E2E 使用了“虚构 graphId”，与数据库实际 Graph 不一致
早期 E2E 为了快速隔离用例，使用 `e2e-...` 之类的 graphId 拼 URL：
- UI 可以打开图谱页面（前端仍能渲染），但数据库并不存在对应 Graph 记录。
- 一旦触发后端持久化（例如 `POST /api/nodes`）就会出现 **Prisma FK 约束失败**（Node.graphId 引用 Graph.id）。

**结论：**E2E 必须使用后端真实存在的 Graph（在 DB 中可追溯），才能覆盖需要持久化的路径。

### 根因 2：E2E 过度依赖 `window.__cdmGraph`（调试对象）进行坐标级交互
某些用例通过 `page.evaluate()` 读取 `window.__cdmGraph` 取 node 坐标并用 `mouse.click` 触发右键：
- 该对象只在开发环境暴露，并非稳定测试契约。
- 同时无法处理“菜单浮层未关闭导致拦截点击”等 UI 真实行为。

**结论：**用例应该优先通过 DOM（`.x6-node[data-cell-id="..."]`）进行交互，更贴近真实用户行为且更稳定。

### 根因 3：菜单/浮层与键盘事件的“自动化限制”
- `Meta+V` 粘贴依赖浏览器权限与手势，在 headless/自动化下存在不确定性。
- 右键菜单是 `position: fixed` + backdrop 的组合，若未关闭就会拦截后续点击。

**结论：**测试应显式使用 UI 提供的按钮（例如工具栏“粘贴”），并在每次右键前确保菜单关闭。

### 根因 4：hook 异步更新在测试 teardown 后触发
`useSubscriptionList` / `useSubscription` 在 mount/交互时发起请求，最终在 `finally` 里 `setIsLoading(false)`：
- 测试结束后组件可能已卸载，state 更新触发 React/Vitest 报错。

**结论：**为该 hook 增加 `isMounted` 防护（或 AbortController），避免卸载后 setState。

---

## 三、修复思路（策略与原则）

1. **先让测试依赖“真实数据模型”**：凡涉及后端持久化（nodes/subscriptions/archived/delete 等），E2E 必须创建真实 graph 并使用真实 graphId。
2. **减少对内部实现/调试接口的依赖**：优先用 DOM 定位与可视交互（click/contextmenu/button），避免 `__cdmGraph`/坐标推算。
3. **用例稳定性优先**：避免受浏览器策略影响的模拟（如无手势的 clipboard keyboard paste），改用 UI 按钮触发。
4. **严格处理 UI 浮层生命周期**：右键菜单出现后，后续交互前显式关闭，避免拦截事件。
5. **单测环境避免 teardown 后副作用**：hook/异步任务在 unmount 后不再 setState。

---

## 四、关键改动摘要（按模块归类）

### A. Playwright E2E：统一改为创建真实 Graph
**文件：**`apps/web/e2e/testUtils.ts`

- 新增 `createTestGraph(page, testInfo, userId)`：通过 `POST /api/graphs?userId=...` 创建图谱，获取后端返回的真实 `graphId`。
- `gotoTestGraph()` 由“拼接假 graphId”改为“先创建 graph，再导航到 `/graph/{graphId}`”。
- `makeTestGraphUrl()` 入参调整：从基于 `testInfo` 派生，改为直接接收 `graphId`。

**收益：**
- 彻底消除 `/api/nodes` 写入时的 Graph 外键约束失败。
- 多人协作/归档/删除等需要持久化的数据路径可可靠覆盖。

### B. Playwright E2E：右键菜单（Watch/Subscription）稳定性修复
**文件：**`apps/web/e2e/watch_subscription.spec.ts`

- 改用 DOM 节点定位：`.x6-node[data-cell-id="..."]`，避免 `window.__cdmGraph` 取坐标失败或不稳定。
- 右键菜单定位改为 **限定在菜单容器内** 查找按钮，避免全局 `text=关注节点` 被其它节点文本/隐藏元素干扰。
- 新增 `closeNodeContextMenu()`：每次 right-click 前先关闭已有菜单，避免菜单浮层拦截点击导致超时。
- 移除对硬编码 `graphId/userId` 的依赖：测试通过 `createTestGraph()` 动态创建图谱，并在订阅/取消订阅前确保目标节点在 DB 中存在（否则后端会返回 404）。
- 增强断言：订阅/取消订阅不仅验证 UI 文案切换，也通过 `/api/subscriptions/check` 轮询确认后端状态一致。

### C. Playwright E2E：剪贴板/编辑/选择器等问题修复（稳定性提升）
涉及多个用例（例如粘贴数据清洗、协作、多视图、归档删除、知识关联、PBS 增强等），统一做了以下类型调整：

- **粘贴从键盘改为 UI 按钮**：避免无用户手势导致的 clipboard 不确定性。
- **`Escape` 与提交逻辑对齐**：对需要提交的用例改用 `Enter`，并修复了部分“Escape 取消但 blur 又提交”的冲突。
- **替换易误命中的 locator**：从 `text=...` 改为更稳的 `.x6-node` + `data-cell-id` / `hasText` 等，避开隐藏测量层（measure div）或重复文本。
- **多客户端用例共享同一 graphId**：避免 A/B 打开不同图导致同步验证失真。

### D. Playwright 配置：支持自动启动 web + api（可复用已有服务）
**文件：**`apps/web/playwright.config.ts`

- `webServer` 由单一 `pnpm dev` 调整为同时启动：
  - `apps/api`（`pnpm -C ../api dev:no-watch`，监听 `http://localhost:3001/api`）
  - `apps/web`（`next dev`，监听 `http://localhost:3000`）
- `reuseExistingServer: true`（非 CI）保留：你手动启动服务时不会重复启动。

### E. Web 单测：补齐 Provider 与 UI 约定变化
典型修复如下：

- `apps/web/__tests__/GraphComponent.test.tsx`：补上 `ConfirmDialogProvider`（组件依赖变更）。
- `apps/web/__tests__/setup.ts`：mock `next/navigation` 的 `useSearchParams`（避免 client 组件在测试环境报错）。
- `apps/web/__tests__/features/views/...`：适配动态 import 的 loading 文案、Gantt root id、Kanban 未归类列标题等变更。
- `apps/web/__tests__/components/PropertyPanel/...`：适配字段默认值（例如 `null` vs `undefined`）与依赖的 context（`UserProvider`）。

### F. 业务代码（为修复测试也提升了稳定性）

#### 1) 修复编辑取消与 blur 提交冲突
**文件：**`apps/web/components/nodes/MindNode.tsx`

- `onBlur` 提交前增加守卫：仅当仍处于编辑态（`isEditing`）时才 commit，避免 `Escape` 取消后 blur 仍覆盖。

#### 2) 修复 hook 卸载后 setState 导致的 unhandled rejection
**文件：**`apps/web/hooks/useSubscription.ts`

- `useSubscription` / `useSubscriptionList` 增加 `isMounted` guard：组件卸载后不再 setState，避免 Vitest teardown 后触发 unhandled error。
- 同时让 `useSubscription` 的 subscribe/unsubscribe 路径也受 `currentNodeIdRef` 约束，避免 nodeId 快速切换导致的“旧请求回写新状态”问题。

### G. API 单测：补齐依赖与 mock

- `apps/api/src/modules/collab/collab.service.spec.ts`
  - 增加 `EventEmitter2` provider mock；
  - mock `@hocuspocus/server` 避免真实启动 server 引发不稳定。
- `apps/api/src/modules/edges/edges.service.spec.ts`
  - 增加 `prisma.node.findMany` mock，避免 service 内部调用缺失导致用例失败。
- `apps/api/src/modules/subscriptions/__tests__/subscription.listener.spec.ts`
  - 对齐节流窗口（当前测试/开发为 5s）：从源文件导出 `THROTTLE_WINDOW_MS` 常量供测试引用，并补齐 `findUnique` mock 作为默认祖先链。

### H. Plugin Layout：测试脚本与排序规则补齐
- `packages/plugins/plugin-layout/package.json`：`test` 改为 `vitest run`（避免进入 watch 导致 CI/脚本悬挂）。
- `packages/plugins/plugin-layout/src/__tests__/sortNodes.test.ts`：补充“显式 order 优先于坐标”的排序用例，确保与当前排序逻辑一致。

---

## 五、验证方式与结果

### 1) Web E2E（Playwright）
执行：
- `pnpm --filter @cdm/web test:e2e`

结果：
- **88 passed, 2 skipped**（共 90 tests）

> 注：skip 的用例为“依赖特定数据/后端条件”的场景，仍保留为条件性验证。

### 2) Monorepo 单测
执行：
- `pnpm test`

结果：
- **全绿通过**

---

## 附录：涉及文件清单（主要）

### E2E（Playwright）
- `apps/web/e2e/testUtils.ts`：创建真实 Graph、统一导航工具。
- `apps/web/e2e/watch_subscription.spec.ts`：右键菜单定位/关闭策略、从 `__cdmGraph` 迁移到 DOM。
- 其它已对齐/增强稳定性的用例（均围绕“真实 graphId + 稳定选择器 + 可靠交互”）：
  - `apps/web/e2e/clipboard-data-sanitization.spec.ts`
  - `apps/web/e2e/collaboration.spec.ts`
  - `apps/web/e2e/context-menu-selection.spec.ts`
  - `apps/web/e2e/multi-view-synchronization.spec.ts`
  - `apps/web/e2e/knowledge-mock.spec.ts`
  - `apps/web/e2e/pbs-enhancement.spec.ts`
  - `apps/web/e2e/permanent-delete.spec.ts`
  - 以及若干基础交互回归用例：`arrow_key_navigation.spec.ts`、`edit_mode.spec.ts`、`tab_key_creates_child.spec.ts`、`enter_key_creates_sibling.spec.ts`、`dependency-mode.spec.ts`、`node-type-conversion.spec.ts`、`layout-switching.spec.ts`、`app-node.spec.ts`

### Playwright 配置
- `apps/web/playwright.config.ts`：`webServer` 同时启动 web + api，并可复用已有服务。

### Web 单测（Vitest）
- `apps/web/__tests__/setup.ts`：mock `next/navigation`（`useSearchParams`）。
- `apps/web/__tests__/GraphComponent.test.tsx`：补齐 `ConfirmDialogProvider`。
- `apps/web/__tests__/components/PropertyPanel/PBSForm.test.tsx`：对齐 `null/undefined` 约定。
- `apps/web/__tests__/components/PropertyPanel/TaskForm.knowledge.test.tsx`：补齐 `UserProvider`。
- `apps/web/__tests__/features/views/ViewContainer.test.tsx`：适配动态 import loading UI。
- `apps/web/__tests__/features/views/useGanttData.test.ts`：对齐 Gantt 根节点 id。
- `apps/web/__tests__/features/views/useKanbanData.test.ts`：对齐“未归类”列行为与标题。

### Web 业务代码
- `apps/web/components/nodes/MindNode.tsx`：修复 `Escape` 取消与 `onBlur` 提交冲突。
- `apps/web/hooks/useSubscription.ts`：修复卸载后 setState 的 unhandled rejection。

### API 单测（Jest）
- `apps/api/src/modules/collab/collab.service.spec.ts`：mock `@hocuspocus/server`，补齐 `EventEmitter2`。
- `apps/api/src/modules/edges/edges.service.spec.ts`：补齐 `prisma.node.findMany` mock。
- `apps/api/src/modules/subscriptions/__tests__/subscription.listener.spec.ts`：对齐节流窗口与补齐 node ancestor mock。

### Plugin Layout
- `packages/plugins/plugin-layout/package.json`：`test` 改为 `vitest run`。
- `packages/plugins/plugin-layout/src/__tests__/sortNodes.test.ts`：补齐“显式 order 优先”测试。

## 六、后续建议（避免再次失配）

1. **E2E 永远不要硬编码不存在的 graphId**：涉及持久化时必须创建真实 graph（推荐统一走 `gotoTestGraph`）。
2. **尽量为关键交互补充稳定的 `data-testid`**：右键菜单、关键按钮、列表项等，这比 `text=` 或 class 选择器更抗重构。
3. **测试尽量走用户路径**：避免依赖 debug window（`__cdmGraph`）或内部状态。
4. **hook 异步更新需可取消/可卸载**：统一使用 `isMounted` guard 或 `AbortController`，减少测试与 SSR 环境问题。
