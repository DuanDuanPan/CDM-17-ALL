# Story 9.8: 节点视图合并（PBS+任务） (Node View Merge - PBS+Task)

Status: ready-for-dev

## Story

As a **用户**,
I want **在数据资源库中看到统一的「节点（PBS+任务）」视图，而非分离的 PBS 与任务两个 Tab**,
so that **我可以以图谱根节点为单一真相源（SoT）进行结构化浏览，无需在两个视图间来回切换。**

## 背景

当前「数据资源库」Drawer 提供 `PBS / 任务 / 文件夹` 三个组织视图。随着图谱节点类型增加（DATA、REQUIREMENT、APP…），`PBS` 与 `任务` 两个 Tab 在信息层面高度重叠：

- 用户在图谱中以**根节点**为单一真相源（SoT）构建层级，但数据资源库需要在 PBS 与任务之间来回切换才能完成关联/追溯
- 图谱上层可能存在非 PBS/任务语义层（如第 2 层是 DATA，第 3 层才出现 PBS），直接呈现整棵树会引入噪音

## Acceptance Criteria

### AC1: Tab 合并与 UI 重构

**Given** 数据资源库 Drawer 已打开
**When** 查看顶部 Tab 栏
**Then** 应只显示两个 Tab：`节点（PBS+任务）` 和 `文件夹`
**And** 原有的 `PBS` 和 `任务` Tab 应被移除

### AC2: 节点树片段生成（投影算法）

**Given** 图谱根节点包含多种节点类型（PBS、TASK、DATA、ORDINARY、REQUIREMENT、APP 等）
**When** 节点视图加载时
**Then** 应只展示 `NodeType.PBS` 与 `NodeType.TASK` 的投影片段
**And** DATA/ORDINARY/REQUIREMENT/APP 等非语义节点不在树中出现
**And** 投影规则：
  - 对每个语义节点（PBS/TASK），在原始 parent 链上找到最近的语义祖先作为显示父节点
  - 若无语义祖先，则作为片段根节点（Top-level）
  - 维持原始树的同级顺序
  - **节点类型使用图标区分：📦 PBS / ✅ TASK** (SCAMPER)

### AC3: 节点 Breadcrumb 溯源

**Given** 用户选中一个节点
**When** 右侧面板顶部显示 breadcrumb
**Then** breadcrumb 应从**图谱根节点**到当前节点显示完整路径
**And** 路径基于原始 parent 链（包含被隐藏的 DATA/ORDINARY 等节点）
**And** 路径过长时自动折叠：`Root / … / Parent / Current`
**And** breadcrumb 每一段可点击定位到对应节点

### AC4: 节点多选与资产并集

**Given** 节点视图处于激活状态
**When** 用户通过 checkbox 选择多个节点（可跨片段）
**Then** 右侧资产面板应按 `输入/输出/参考` 分栏展示所选节点资产的**并集去重**
**And** 去重键为 `assetId`
**And** 同一资产在不同节点可具有不同 `linkType`，可同时出现在多个分栏
**And** 提供"清空选择"入口，显示已选数量

### AC5: 资产溯源展示

**Given** 资产面板中列出资产卡片
**When** 查看资产卡片
**Then** 每个资产应展示溯源摘要（如：`输出：2` / `引用：5`）
**When** 点击展开溯源
**Then** 显示该资产在所选节点集合内的关联节点路径列表
**And** 路径展示使用与节点 breadcrumb 相同的折叠策略
**And** 点击某条路径可定位/选中对应节点
**And** **默认显示最多 10 条溯源，超过时显示"查看更多"按钮** (Red Team)

### AC6: 双搜索入口

**Given** 节点视图处于激活状态
**When** 使用节点搜索
**Then** 作用域为投影后的 PBS/TASK 节点集合
**And** 匹配节点名称，过滤/高亮命中，自动展开命中路径
**And** 清空搜索后恢复完整片段森林
**And** **搜索输入需执行 escapeRegex() 防止正则注入** (Red Team)

**When** 使用资产搜索
**Then** 作用域为数据资源库内的资产（graphId 级别）
**And** 匹配资产名称
**And** 结果在右侧面板展示，每个结果可查看溯源并一键定位到关联节点

### AC7: 解绑语义

**Given** 节点视图中选中资产
**When** 点击"删除/移除"按钮
**Then** 操作应仅**解除关联**（移除 `NodeDataLink`）
**And** 不删除资产实体本身
**And** 资产物理删除仅在 `文件夹` 视图中允许
**And** **使用 Undo Toast 替代确认弹窗** (SCAMPER)

### AC8: 批量解绑 (Focus Group)

**Given** 节点视图中已选中多个节点
**When** 在资产面板选择多个资产并执行移除
**Then** 应支持一次性批量解除所有选中的关联

### AC9: Breadcrumb Tooltip (Focus Group)

**Given** breadcrumb 路径被折叠为 `Root / … / Current`
**When** 用户 hover 折叠区域 (`…`)
**Then** 应显示完整路径的 tooltip

## Tasks / Subtasks

- [ ] Task 1: Tab 合并与 UI 重构 (AC: #1)
  - [ ] 1.1 修改 `OrganizationTabs.tsx` 配置（3 Tab → 2 Tab）
  - [ ] 1.2 更新 `OrganizationView` 类型：`'node' | 'folder'`
  - [ ] 1.3 更新 `DataLibraryDrawer.tsx` 视图切换逻辑

- [ ] Task 2: 节点树投影算法实现 (AC: #2)
  - [ ] 2.1 创建 `useNodeTreeProjection` Hook
  - [ ] 2.2 实现语义节点过滤逻辑（PBS/TASK）
  - [ ] 2.3 实现 `findSemanticAncestor`（带 depth limit=100）
  - [ ] 2.4 实现惰性路径计算 `getOriginalPath(nodeId)`
  - [ ] 2.5 实现 `getNodeLabel(nodeId)` 获取标签
  - [ ] 2.6 添加 >50 roots 警告日志 (Red Team)

- [ ] Task 3: Breadcrumb 组件开发 (AC: #3, #9)
  - [ ] 3.1 创建 `NodeBreadcrumb` 组件
  - [ ] 3.2 实现完整路径惰性计算
  - [ ] 3.3 实现路径折叠策略 (`Root / … / Parent / Current`)
  - [ ] 3.4 添加折叠区 hover tooltip (AC9)
  - [ ] 3.5 添加点击定位功能

- [ ] Task 4: 多选与资产并集 (AC: #4)
  - [ ] 4.0 新增后端批量 API `POST /links:batch` (Amelia 建议)
  - [ ] 4.1 创建 `node-tree/` 子目录结构 (Amelia 建议)
  - [ ] 4.2 创建 `NodeTreeView.tsx` + `NodeTreeItem.tsx`
  - [ ] 4.3 实现节点 checkbox 多选（带类型图标 📦/✅）
  - [ ] 4.4 创建 `useSelectedNodesAssets` Hook
  - [ ] 4.5 实现资产并集去重逻辑（使用批量 API）
  - [ ] 4.6 按 linkType 分栏展示
  - [ ] 4.7 添加清空选择入口与选中数量显示
  - [ ] 4.8 展开状态持久化到 localStorage (Focus Group)

- [ ] Task 5: 资产溯源展示 (AC: #5)
  - [ ] 5.1 扩展资产卡片，添加溯源摘要徽章
  - [ ] 5.2 创建溯源详情展开组件
  - [ ] 5.3 实现路径列表与折叠
  - [ ] 5.4 添加路径点击定位功能
  - [ ] 5.5 限制默认显示 10 条 + "查看更多" (Red Team)

- [ ] Task 6: 双搜索入口 (AC: #6)
  - [ ] 6.1 创建 `DualSearch` 组件
  - [ ] 6.2 实现节点搜索（PBS/TASK 作用域）
  - [ ] 6.3 实现搜索结果高亮与路径展开
  - [ ] 6.4 实现资产搜索（graphId 级别）
  - [ ] 6.5 资产搜索结果与溯源联动
  - [ ] 6.6 添加 `escapeRegex()` 防注入 (Red Team)

- [ ] Task 7: 解绑语义实现 (AC: #7, #8)
  - [ ] 7.1 修改节点视图中"移除"按钮逻辑
  - [ ] 7.2 调用 NodeDataLink 解绑 API
  - [ ] 7.3 使用 Undo Toast 替代确认弹窗 (SCAMPER)
  - [ ] 7.4 确保不调用资产删除 API
  - [ ] 7.5 支持批量解绑（AC8）

## Dev Notes

### 技术规格说明书

> [!IMPORTANT]
> 详细实现请参考: [tech-spec-9-8-node-view-merge.md](file:///Users/enjoyjavapan163.com/Code/ALT/Prototype/CDM-17/CDM-17-ALL/docs/sprint-artifacts/tech-spec-9-8-node-view-merge.md)

### 架构约束

- **数据模型**：使用现有 `NodeDataLink` 模型（`packages/types/src/data-library-types.ts`）
- **节点类型**：`packages/types/src/node-types.ts` 中的 `NodeType.PBS`、`NodeType.TASK`
- **投影算法**：纯前端计算，不修改图谱真实 `parentId`

### 技术决策 (Tech-Spec 对齐)

| Decision     | Choice                   | Rationale               |
| ------------ | ------------------------ | ----------------------- |
| 投影算法位置 | 纯前端 Hook              | 规模 ≤1k 节点，无需后端 |
| 多选状态     | `Set<nodeId>`            | 高效查询/增删           |
| 路径计算     | 惰性 `getOriginalPath()` | 避免 1k×5 存储开销      |
| 祖先遍历     | depth limit = 100        | 防止长链性能问题        |
| 批量查询     | `POST /links:batch`      | 减少 N 次请求           |
| 节点类型图标 | 📦 PBS / ✅ TASK           | 视觉区分度              |
| 解绑确认     | Undo Toast               | 减少弹窗打断            |

### Red Team 防御措施

| 风险            | 防御            | Task |
| --------------- | --------------- | ---- |
| 循环祖先链      | depth limit=100 | 2.3  |
| 大量孤儿节点    | >50 roots 警告  | 2.6  |
| Provenance 爆炸 | 默认 10 条限制  | 5.5  |
| 搜索注入        | escapeRegex()   | 6.6  |

### Project Structure Notes

- 组件位置：`apps/web/features/data-library/components/`
- 新增子目录：`components/node-tree/` (NodeTreeView + NodeTreeItem)
- 新增 Hooks：`useNodeTreeProjection`, `useSelectedNodesAssets`
- 复用现有：`DataLibraryDrawer`, `AssetCard` 组件

### References

- [tech-spec-9-8-node-view-merge.md](file:///Users/enjoyjavapan163.com/Code/ALT/Prototype/CDM-17/CDM-17-ALL/docs/sprint-artifacts/tech-spec-9-8-node-view-merge.md) - 完整技术规格
- [data-library-node-tab-merge-prd.md](file:///Users/enjoyjavapan163.com/Code/ALT/Prototype/CDM-17/CDM-17-ALL/docs/plans/data-library-node-tab-merge-prd.md) - 完整 PRD
- [architecture.md](file:///Users/enjoyjavapan163.com/Code/ALT/Prototype/CDM-17/CDM-17-ALL/docs/architecture.md) - 数据管理架构
- [data-library-types.ts](file:///Users/enjoyjavapan163.com/Code/ALT/Prototype/CDM-17/CDM-17-ALL/packages/types/src/data-library-types.ts) - NodeDataLink 类型
- [node-types.ts](file:///Users/enjoyjavapan163.com/Code/ALT/Prototype/CDM-17/CDM-17-ALL/packages/types/src/node-types.ts) - NodeType 枚举

## Test Design

### 测试文件结构

```
apps/web/features/data-library/
├── __tests__/
│   ├── OrganizationViews.test.tsx      # [MODIFY] 更新 Tab 测试
│   ├── NodeTreeView.test.tsx           # [NEW] 投影树组件测试
│   └── NodeBreadcrumb.test.tsx         # [NEW] Breadcrumb 组件测试
├── hooks/__tests__/
│   ├── useNodeTreeProjection.test.ts   # [NEW] 投影算法单元测试
│   └── useSelectedNodesAssets.test.ts  # [NEW] 多选资产 Hook 测试
└── components/node-tree/__tests__/
    └── NodeTreeItem.test.tsx           # [NEW] 树节点项测试
```

---

### 单元测试 (Unit Tests)

#### UT-1: useNodeTreeProjection Hook (AC2)

| Test ID | 测试用例                   | 预期结果                        |
| ------- | -------------------------- | ------------------------------- |
| UT-1.1  | 空图谱 (graph=null)        | 返回空数组 `[]`                 |
| UT-1.2  | 仅包含 PBS 节点            | 返回 PBS 投影树                 |
| UT-1.3  | 仅包含 TASK 节点           | 返回 TASK 投影树                |
| UT-1.4  | PBS→DATA→TASK 嵌套         | DATA 被隐藏，TASK 挂载到 PBS 下 |
| UT-1.5  | 交叉嵌套 PBS→TASK→PBS→TASK | 正确维护层级关系                |
| UT-1.6  | 根节点就是 PBS/TASK        | 作为投影树根节点                |
| UT-1.7  | 100+ 深度祖先链            | 触发 depth limit 警告，不死循环 |
| UT-1.8  | >50 个根节点               | 输出 console.warn 警告          |

**测试文件:** `apps/web/features/data-library/hooks/__tests__/useNodeTreeProjection.test.ts`

```typescript
describe('useNodeTreeProjection', () => {
  it('UT-1.1: should return empty array when graph is null', () => {
    const { result } = renderHook(() => useNodeTreeProjection());
    expect(result.current.projectedTree).toEqual([]);
  });
  
  it('UT-1.4: should hide DATA nodes and mount TASK to PBS', () => {
    // Setup: PBS-1 → DATA-1 → TASK-1
    mockGraphContext({ nodes: [...] });
    const { result } = renderHook(() => useNodeTreeProjection());
    
    // Verify: PBS-1 → TASK-1 (DATA-1 隐藏)
    expect(result.current.projectedTree[0].id).toBe('pbs-1');
    expect(result.current.projectedTree[0].children[0].id).toBe('task-1');
  });
  
  it('UT-1.7: should warn on depth limit exceeded', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    mockGraphContext({ /* 100+ depth chain */ });
    renderHook(() => useNodeTreeProjection());
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Max depth reached')
    );
  });
});
```

**运行命令:**
```bash
cd apps/web && pnpm test -- useNodeTreeProjection
```

---

#### UT-2: getOriginalPath 惰性路径计算 (AC3)

| Test ID | 测试用例         | 预期结果                           |
| ------- | ---------------- | ---------------------------------- |
| UT-2.1  | 根节点路径       | 返回 `[rootId]`                    |
| UT-2.2  | 3 层路径         | 返回 `[root, parent, current]`     |
| UT-2.3  | 含隐藏节点的路径 | 返回完整路径（包含 DATA/ORDINARY） |

---

#### UT-3: NodeBreadcrumb 组件 (AC3, AC9)

| Test ID | 测试用例     | 预期结果                             |
| ------- | ------------ | ------------------------------------ |
| UT-3.1  | 路径 ≤4 项   | 完整显示所有节点                     |
| UT-3.2  | 路径 >4 项   | 折叠为 `Root / … / Parent / Current` |
| UT-3.3  | hover 折叠区 | 显示完整路径 tooltip (AC9)           |
| UT-3.4  | 点击节点     | 触发 onNodeClick 回调                |

```typescript
describe('NodeBreadcrumb', () => {
  it('UT-3.2: should collapse long path', () => {
    render(<NodeBreadcrumb 
      path={['r', 'a', 'b', 'c', 'd', 'e']} 
      nodeLabels={new Map([...labels])} 
    />);
    expect(screen.getByText('…')).toBeDefined();
  });
  
  it('UT-3.3: should show tooltip on hover (AC9)', async () => {
    const user = userEvent.setup();
    render(<NodeBreadcrumb path={['r','a','b','c','d','e']} ... />);
    await user.hover(screen.getByText('…'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('a → b → c → d');
  });
});
```

---

#### UT-4: escapeRegex 工具函数 (AC6)

| Test ID | 测试用例           | 预期结果        |
| ------- | ------------------ | --------------- |
| UT-4.1  | 普通字符串 "hello" | 返回 "hello"    |
| UT-4.2  | 正则特殊字符 ".*"  | 返回 `\\.\\*`   |
| UT-4.3  | 混合输入 "a(b)"    | 返回 `a\\(b\\)` |

---

### 集成测试 (Integration Tests)

#### IT-1: Tab 合并与视图切换 (AC1)

| Test ID | 测试用例        | 预期结果                                   |
| ------- | --------------- | ------------------------------------------ |
| IT-1.1  | 打开 Drawer     | 显示 2 个 Tab：`节点(PBS+任务)` / `文件夹` |
| IT-1.2  | PBS Tab 不存在  | `org-tab-pbs` 不在 DOM 中                  |
| IT-1.3  | Task Tab 不存在 | `org-tab-task` 不在 DOM 中                 |
| IT-1.4  | 点击节点 Tab    | 渲染 NodeTreeView 组件                     |

**测试文件:** `apps/web/features/data-library/__tests__/OrganizationViews.test.tsx`

```typescript
describe('Story 9.8: Node View Merge (IT-1)', () => {
  it('IT-1.1: should show only 2 tabs after merge', () => {
    render(<DataLibraryDrawer isOpen graphId="g1" onClose={vi.fn()} />);
    expect(screen.getByTestId('org-tab-node')).toBeDefined();
    expect(screen.getByTestId('org-tab-folder')).toBeDefined();
    expect(screen.queryByTestId('org-tab-pbs')).toBeNull();
    expect(screen.queryByTestId('org-tab-task')).toBeNull();
  });
});
```

---

#### IT-2: 节点多选与资产并集 (AC4)

| Test ID | 测试用例            | 预期结果                        |
| ------- | ------------------- | ------------------------------- |
| IT-2.1  | 选中 1 个节点       | 右侧显示该节点资产              |
| IT-2.2  | 选中 2 个节点       | 右侧显示资产并集（去重）        |
| IT-2.3  | 同一资产多 linkType | 同时出现在 input + reference 栏 |
| IT-2.4  | 点击"清空选择"      | 选中数量归零，资产面板清空      |

**Mock 要求:** 使用 MSW 模拟 `POST /links:batch` API

---

#### IT-3: 资产溯源展示 (AC5)

| Test ID | 测试用例             | 预期结果                      |
| ------- | -------------------- | ----------------------------- |
| IT-3.1  | 资产卡片显示溯源摘要 | 显示 `输出: 2 / 引用: 5` 徽章 |
| IT-3.2  | 点击展开溯源         | 显示关联节点路径列表          |
| IT-3.3  | >10 条溯源           | 默认显示 10 条 + "查看更多"   |
| IT-3.4  | 点击路径定位         | 触发 onLocateNode 回调        |

---

#### IT-4: 双搜索入口 (AC6)

| Test ID | 测试用例          | 预期结果               |
| ------- | ----------------- | ---------------------- |
| IT-4.1  | 搜索节点 "PBS"    | 过滤显示匹配节点，高亮 |
| IT-4.2  | 搜索资产 "卫星"   | 右侧显示匹配资产列表   |
| IT-4.3  | 输入正则字符 ".*" | 不崩溃，正确 escape    |
| IT-4.4  | 清空搜索          | 恢复完整树/列表        |

---

#### IT-5: 解绑与批量解绑 (AC7, AC8)

| Test ID | 测试用例          | 预期结果                    |
| ------- | ----------------- | --------------------------- |
| IT-5.1  | 单资产解绑        | 显示 Undo Toast，不显示弹窗 |
| IT-5.2  | 批量解绑 3 个资产 | 一次 API 调用解除所有关联   |
| IT-5.3  | Undo 撤销         | 恢复关联                    |
| IT-5.4  | 解绑后资产仍存在  | 可在文件夹视图找到该资产    |

---

### 端到端测试 (E2E Tests)

> [!NOTE]
> E2E 测试使用 Playwright，需在本地启动开发服务器

| Test ID | 测试场景         | 验证步骤                                                                                                                        |
| ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| E2E-1   | 完整节点视图流程 | 1. 创建 PBS→DATA→TASK 图谱<br>2. Cmd+D 打开 Drawer<br>3. 验证只有 2 个 Tab<br>4. 验证 DATA 不显示<br>5. 验证 TASK 挂载到 PBS 下 |
| E2E-2   | 多选资产溯源     | 1. 选中 2 个节点<br>2. 验证资产并集<br>3. 展开溯源<br>4. 点击定位验证跳转                                                       |
| E2E-3   | 搜索与解绑       | 1. 搜索节点 "任务"<br>2. 选中结果<br>3. 解绑资产<br>4. 验证 Undo Toast<br>5. 撤销验证恢复                                       |

**运行命令:**
```bash
cd apps/web && pnpm test:e2e -- story-9-8
```

---

### 测试覆盖矩阵

| AC             | 单元测试           | 集成测试   | E2E   |
| -------------- | ------------------ | ---------- | ----- |
| AC1 Tab 合并   | -                  | IT-1.1-4   | E2E-1 |
| AC2 投影算法   | UT-1.1-8           | -          | E2E-1 |
| AC3 Breadcrumb | UT-2.1-3, UT-3.1-4 | -          | -     |
| AC4 多选并集   | -                  | IT-2.1-4   | E2E-2 |
| AC5 溯源展示   | -                  | IT-3.1-4   | E2E-2 |
| AC6 双搜索     | UT-4.1-3           | IT-4.1-4   | E2E-3 |
| AC7 解绑       | -                  | IT-5.1,3,4 | E2E-3 |
| AC8 批量解绑   | -                  | IT-5.2     | -     |
| AC9 Tooltip    | UT-3.3             | -          | -     |

---

### 测试命令汇总

```bash
# 运行所有 Story 9.8 相关单元测试
cd apps/web && pnpm test -- --grep "Story 9.8"

# 运行投影算法测试
cd apps/web && pnpm test -- useNodeTreeProjection

# 运行组件集成测试
cd apps/web && pnpm test -- NodeTreeView

# 运行 E2E 测试
cd apps/web && pnpm test:e2e -- story-9-8
```

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
