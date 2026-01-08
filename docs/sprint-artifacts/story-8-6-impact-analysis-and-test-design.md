# Story 8.6 影响分析与测试设计

**Created:** 2026-01-08
**Purpose:** 确保 Node Order 修改功能正确且不影响已实现功能

---

## 一、影响范围分析

### 1.1 需要修改的文件

| 文件 | 修改内容 | 影响范围 | 风险等级 |
|------|----------|----------|----------|
| `schema.prisma` | Node 添加 `order Int @default(0)` | 数据库结构 | 🟡 中 |
| `template-types.ts` | TemplateNode 添加 `order?: number` | 类型定义 | 🟢 低 |
| `AddChildCommand.ts` | 赋值 `order = max(siblings.order) + 1` | 子节点创建 | 🟡 中 |
| `AddSiblingCommand.ts` | 赋值 order + 兄弟重排 | 兄弟节点创建 | 🟡 中 |
| `NavigationCommand.ts` | 改为按 order 排序 | 键盘导航 | 🟡 中 |
| `subtree-extractor.ts` | 保存模板时写入 order + children 按 order 排序 | 模板保存 | 🟡 中 |
| `templates.service.ts` | GeneratedNode 添加 order | 模板实例化 | 🟡 中 |
| `collab.service.ts` | relational init / Yjs→Node 同步补齐 order 映射 | 后端持久化与恢复 | 🟠 高 |
| `graph.repository.ts` | Node upsert create/update 写入 order | 后端持久化 | 🟡 中 |
| `seed.ts` | 种子模板添加 order 值 | 初始化数据 | 🟢 低 |

### 1.2 不需要修改的文件（已就绪）

| 文件 | 现有实现 | 验证状态 |
|------|----------|----------|
| `packages/types/src/index.ts` | `NodeData.order?: number` 已存在 (line 9) | ✅ 无需修改 |
| `useOutlineData.ts` | 已按 `data.order` 排序 (lines 86-92) | ✅ 已测试覆盖 |

---

## 二、现有测试分析

### 2.1 测试文件清单

| 测试文件 | 覆盖组件 | order 相关测试 |
|----------|----------|----------------|
| `commands.test.ts` | AddChild/Sibling/Remove | ❌ 无 order 测试 |
| `NavigationCommand.test.ts` | 键盘导航 | ❌ 仅测试 Y 坐标排序 |
| `templates.service.spec.ts` | 模板实例化 | ❌ 无 order 测试 |
| `subtree-extractor.spec.ts` | 子树模板保存 | ❌ 无 order 测试 |
| `useOutlineData.test.ts` | 大纲视图 | ✅ **已有 order 排序测试** |

### 2.2 现有测试覆盖详情

#### commands.test.ts (Lines 105-136, 138-229)

**当前测试内容**：
- ✅ AddChildCommand 创建子节点位置 (x+200, y+80)
- ✅ AddChildCommand 设置 nodeType
- ✅ AddSiblingCommand 创建兄弟节点位置
- ✅ AddSiblingCommand 继承 nodeType (TASK, REQUIREMENT, PBS)

**缺失测试**：
- ❌ AddChildCommand 未验证 `data.order` 赋值
- ❌ AddSiblingCommand 未验证 order 插入逻辑
- ❌ AddSiblingCommand 未验证兄弟重排逻辑

#### NavigationCommand.test.ts (Lines 91-110, 182-211)

**当前测试内容**：
- ✅ `getChildren` 按 Y 坐标排序
- ✅ `navigateUp/Down` 基于 Y 坐标

**将会改变的行为**：
- ⚠️ 排序逻辑从 Y 坐标改为 order 字段
- ⚠️ 现有测试需更新 Mock 数据以包含 order

#### useOutlineData.test.ts (Lines 197-212)

**已有 order 测试** ✅：
```typescript
it('should sort children by order field', () => {
  mockGraph.addNode('parent', { label: 'Parent' });
  mockGraph.addNode('c', { label: 'C', order: 2 });
  mockGraph.addNode('a', { label: 'A', order: 0 });
  mockGraph.addNode('b', { label: 'B', order: 1 });
  // ... asserts children order is [a, b, c]
});
```

#### templates.service.spec.ts (Lines 270-327)

**当前测试内容**：
- ✅ 模板节点数量验证
- ✅ 类型节点扩展表创建

**缺失测试**：
- ❌ 模板 order 属性处理
- ❌ 实例化后节点 order 值验证

#### subtree-extractor.spec.ts

**当前测试内容**：
- ✅ 保留层级结构、依赖边、元数据清洗

**缺失测试**：
- ❌ TemplateNode.order 写入
- ❌ children 按 order 排序（order 缺失时稳定兜底）

---

## 三、测试设计

### 3.1 需要更新的现有测试

#### Test File: `commands.test.ts`

| 测试用例 | 修改说明 |
|----------|----------|
| `AddChildCommand - stacks children vertically` | 添加 order 验证 |
| `AddSiblingCommand - creates sibling` | 添加 order 验证 |

**新增测试用例**：

```typescript
// commands.test.ts additions

describe('AddChildCommand - order assignment', () => {
  it('sets order=0 for first child', () => {
    const root = graph.addNode({ id: 'root', x: 100, y: 100 });
    const cmd = new AddChildCommand();
    const child = cmd.execute(graph, root);
    expect(child.getData().order).toBe(0);
  });

  it('sets order=max+1 for subsequent children', () => {
    const root = graph.addNode({ id: 'root', x: 100, y: 100 });
    const cmd = new AddChildCommand();
    const child1 = cmd.execute(graph, root);
    const child2 = cmd.execute(graph, root);
    expect(child1.getData().order).toBe(0);
    expect(child2.getData().order).toBe(1);
  });
});

describe('AddSiblingCommand - order assignment', () => {
  it('inserts sibling at selectedNode.order+1', () => {
    // Setup: root -> [child1(order:0), child2(order:1)]
    // Action: select child1, add sibling
    // Assert: new sibling order=1, child2 order=2
  });

  it('reorders subsequent siblings', () => {
    // Verify all siblings after insertion have order+1
  });
});
```

#### Test File: `NavigationCommand.test.ts`

**修改现有测试用例**：

```typescript
// Update Mock to include order field
const createMockNode = (id: string, position: { x: number; y: number }, order?: number) => ({
  id,
  getPosition: vi.fn().mockReturnValue(position),
  getData: vi.fn().mockReturnValue({ order }),
  isNode: () => true,
});

it('should return children sorted by order (not Y position)', () => {
  // Y 坐标故意乱序，但 order 明确
  const child1 = createMockNode('child1', { x: 200, y: 200 }, 0); // order=0
  const child2 = createMockNode('child2', { x: 200, y: 50 }, 2);  // order=2
  const child3 = createMockNode('child3', { x: 200, y: 100 }, 1); // order=1
  
  // Assert: children sorted as child1, child3, child2 (by order)
});
```

#### Test File: `templates.service.spec.ts`

**新增测试用例**：

```typescript
describe('generateNodesFromStructure - order handling', () => {
  it('assigns order from templateNode.order property', async () => {
    const templateWithOrder = {
      structure: {
        rootNode: {
          label: 'Root',
          children: [
            { label: 'First', order: 0 },
            { label: 'Second', order: 1 },
            { label: 'Third', order: 2 },
          ],
        },
      },
    };
    // Assert: created nodes have correct order values
  });

  it('uses siblingIndex when order not specified', async () => {
    // Template without order property should use array index
  });
});
```

#### Test File: `subtree-extractor.spec.ts`

**新增测试用例：**

```typescript
it('writes TemplateNode.order and sorts children by order', () => {
  // Arrange: parent with children order: 2,0,1
  // Act: extractSubtreeAsTemplate(...)
  // Assert: template.children order is 0,1,2 and each child has .order
});
```

### 3.2 测试执行命令

```bash
# 1. 运行修改前的测试（建立基线）
pnpm --filter @cdm/plugin-mindmap-core test

# 2. 运行模板相关测试
pnpm --filter @cdm/plugin-template test

# 3. 运行大纲视图测试
pnpm --filter @cdm/web test -- --testPathPattern="useOutlineData"

# 4. 运行全量测试套件
pnpm test

# 5. 运行 E2E 测试（如需验证 UI）
pnpm --filter @cdm/web test:e2e
```

---

## 四、回归测试清单

### 4.1 功能回归测试

| 编号 | 测试项 | 预期结果 | 验证方法 |
|------|--------|----------|----------|
| REG-1 | 现有 AddChildCommand 测试通过 | ✅ Pass | `pnpm --filter @cdm/plugin-mindmap-core test` |
| REG-2 | 现有 AddSiblingCommand 测试通过 | ✅ Pass | 同上 |
| REG-3 | 现有 NavigationCommand 测试通过 | ✅ Pass | 同上 |
| REG-4 | 现有模板服务测试通过 | ✅ Pass | `pnpm --filter @cdm/plugin-template test` |
| REG-5 | 现有大纲视图测试通过 | ✅ Pass | `pnpm --filter @cdm/web test` |
| REG-6 | 全量测试套件通过 | 601+ tests pass | `pnpm test` |
| REG-7 | 后端 Collab/Repository 不回归 | ✅ Pass | `pnpm --filter @cdm/api test`（或最小集成验证） |

### 4.2 新增功能测试

| 编号 | 测试项 | 验证标准 | AC 关联 |
|------|--------|----------|---------|
| NEW-1 | AddChildCommand order 赋值 | order=max+1 | AC1 |
| NEW-2 | AddSiblingCommand order 插入 | 正确位置+重排 | AC2 |
| NEW-3 | NavigationCommand order 排序 | order 优先于 Y | AC3 |
| NEW-4 | 模板实例化 order 保留 | 与模板定义一致 | AC5 |
| NEW-5 | 种子数据 order 值 | 所有模板有 order | AC4 |
| NEW-6 | 模板保存 order 写入 | TemplateNode.order + children 排序 | AC4 |
| NEW-7 | AC7 fallback 恢复 | yjsState 为空时仍按 Node.order init | AC7 |

---

## 五、手动验证检查单

> 以下步骤需在开发完成后手动执行

### 5.1 新建子节点顺序 (AC1)

1. 打开任意图谱
2. 选中一个节点，按 `Tab` 键添加子节点
3. 重复步骤 2 添加第二个子节点
4. 打开大纲视图，验证：
   - 第一个子节点在上方
   - 第二个子节点在下方
5. 刷新页面，验证顺序保持

### 5.2 新建兄弟节点顺序 (AC2)

1. 创建结构：父 -> [A, B, C]
2. 选中节点 A，按 `Enter` 键
3. 验证新节点出现在 A 和 B 之间
4. 打开大纲视图确认顺序：A → 新节点 → B → C

### 5.3 键盘导航顺序 (AC3)

1. 创建结构：父 -> [order:0, order:1, order:2]
2. **手动移动** order:0 节点的位置到画布最下方（Y 坐标最大）
3. 选中父节点，按 `→` 键进入第一个子节点
4. 验证选中的是 order:0 的节点（而非 Y 最小的节点）
5. 按 `↓` 键，验证跳转到 order:1 的节点

### 5.4 模板导入顺序 (AC5)

1. 选择一个种子模板（如"敏捷研发管理"）
2. 点击"使用模板"创建图谱
3. 打开大纲视图
4. 验证子节点顺序与模板定义一致

---

## 六、风险评估

### 6.1 高风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 现有 NavigationCommand 测试失败 | 开发阻塞 | 更新测试 Mock 数据 |
| 数据库迁移失败 | 无法启动 | 使用 db:reset 重置 |

### 6.2 中风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 模板实例化节点顺序错误 | 用户体验差 | 添加单元测试 |
| 兄弟重排不完整 | 顺序混乱 | 使用 batchUpdate |

### 6.3 低风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 种子数据遗漏 order | 初始化顺序不确定 | CI 验证 seed |

---

## 七、测试矩阵

```
                    ┌─────────────────────────────────────────────────┐
                    │           Story 8.6 测试覆盖矩阵               │
                    └─────────────────────────────────────────────────┘

    ┌──────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
    │   组件       │ 单元测试 │ 集成测试 │ E2E 测试 │ 手动测试 │ 覆盖 AC  │
    ├──────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
    │ AddChild     │    ✅    │    -     │    ✅    │    ✅    │   AC1    │
    │ AddSibling   │    ✅    │    -     │    ✅    │    ✅    │   AC2    │
    │ Navigation   │    ✅    │    -     │    -     │    ✅    │   AC3    │
    │ Templates    │    ✅    │    ✅    │    -     │    ✅    │  AC4,5   │
    │ Outline      │ ✅ 已有  │    -     │    -     │    -     │   AC6    │
    │ Persistence  │    -     │    ✅    │    ✅    │    ✅    │   AC7    │
    └──────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## 附录：测试代码模板

### A. FakeNode 增强（支持 order）

```typescript
// commands.test.ts - 更新 FakeNode
class FakeNode {
  constructor(
    public id: string,
    private position: Point,
    private data: Record<string, unknown> = {}
  ) {}

  getData(): Record<string, unknown> {
    return this.data;
  }

  setData(next: Record<string, unknown>) {
    Object.assign(this.data, next);  // 使用 Object.assign 保持引用
  }
}
```

### B. NavigationCommand Mock 增强

```typescript
// NavigationCommand.test.ts - 更新 Mock
const createMockNode = (
  id: string, 
  position: { x: number; y: number },
  data: Record<string, unknown> = {}
) => ({
  id,
  getPosition: vi.fn().mockReturnValue(position),
  getData: vi.fn().mockReturnValue(data),
  isNode: () => true,
});
```
