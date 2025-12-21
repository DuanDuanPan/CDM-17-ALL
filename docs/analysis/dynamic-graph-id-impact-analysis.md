# 动态GraphID实现影响范围分析

## 需求概述

**当前状态：**
- 数据库中使用固定的 `demo-graph-1` 作为默认图谱ID
- 应用启动时自动创建种子数据（demo用户、项目、图谱）
- 前端硬编码使用 `DEMO_GRAPH_ID = 'demo-graph-1'`

**目标状态：**
1. 清空数据库默认数据
2. 首次访问 `http://127.0.0.1:3000` 时动态创建新的图谱ID
3. 在用户首次访问时创建唯一的图谱

---

## 核心变更策略

### 方案选择
**推荐方案A：URL路由 + 动态创建**
- URL格式：`/graph/[graphId]` 或 `/` 自动创建/跳转
- 首次访问 `/` 时，创建新图谱并重定向到 `/graph/{newId}`
- 支持多图谱管理
- 符合SaaS应用架构

**方案B：LocalStorage + 单图谱**
- 在浏览器localStorage中保存用户的graphId
- 首次访问时创建并保存
- 简单但不支持多设备同步

**本文档基于方案A进行分析**

---

## 影响范围详细分析

### 1. 数据库层 (Database Layer)

#### 1.1 删除种子数据服务
**文件：** `apps/api/src/demo/demo-seed.service.ts`

**影响：**
- ❌ **删除整个文件**或禁用自动种子数据创建
- 保留种子数据逻辑作为测试/开发环境的可选功能

**变更：**
```typescript
// 选项1：完全删除
// 选项2：改为手动触发而非OnModuleInit自动执行
// 选项3：添加环境变量控制：ENABLE_DEMO_SEED=false
```

**依赖文件：**
- `apps/api/src/app.module.ts` - 移除 DemoSeedService provider

#### 1.2 清空数据库脚本
**需要创建：** `scripts/reset-database.sh`

```bash
# 清空所有数据
npx prisma migrate reset --force --skip-seed

# 或只清空数据保留schema
npx prisma db execute --stdin <<< "
TRUNCATE TABLE \"Notification\", \"Edge\", \"NodeTask\", \"NodeRequirement\", \"NodePBS\", \"NodeData\", \"Node\", \"Graph\", \"Project\", \"User\" CASCADE;
"
```

---

### 2. 后端API层 (Backend API Layer)

#### 2.1 新增Graph管理API
**文件：** 需要创建 `apps/api/src/modules/graphs/` 模块

**新增接口：**
```typescript
// 1. 创建新图谱
POST /api/graphs
Request: { name?: string, projectId?: string }
Response: { id: string, name: string, ... }

// 2. 获取用户的图谱列表
GET /api/graphs?userId={userId}
Response: { graphs: Graph[] }

// 3. 获取图谱详情
GET /api/graphs/:id
Response: Graph

// 4. 删除图谱
DELETE /api/graphs/:id
```

**实现文件：**
- `apps/api/src/modules/graphs/graphs.module.ts`
- `apps/api/src/modules/graphs/graphs.controller.ts`
- `apps/api/src/modules/graphs/graphs.service.ts`
- `apps/api/src/modules/graphs/dto/create-graph.dto.ts`

#### 2.2 修改现有API的默认行为
**影响文件：**
- `apps/api/src/modules/nodes/nodes.controller.ts`
  - 当前所有硬编码 `test1` 的地方需要改为从认证上下文获取
  - 移除默认graphId逻辑，要求前端必须提供graphId

---

### 3. 前端应用层 (Frontend Layer)

#### 3.1 路由架构变更
**当前：** `app/page.tsx` - 单页面应用
**新增：** 多页面路由结构

```
app/
├── page.tsx                    # 首页：创建/选择图谱
├── graph/
│   └── [graphId]/
│       └── page.tsx            # 图谱详情页（原page.tsx逻辑）
└── layout.tsx
```

**影响文件：**
1. `app/page.tsx` - 改为Landing Page或Graph List
2. `app/graph/[graphId]/page.tsx` - 移动原有逻辑至此

#### 3.2 GraphID状态管理
**文件：** `apps/web/app/graph/[graphId]/page.tsx`

**变更：**
```typescript
// OLD: 硬编码
const DEMO_GRAPH_ID = 'demo-graph-1';

// NEW: 从路由参数获取
export default function GraphPage({ params }: { params: { graphId: string } }) {
  const graphId = params.graphId;
  // ... 使用graphId
}
```

#### 3.3 新增Graph创建/选择组件
**新建文件：**
- `apps/web/components/graph/GraphSelector.tsx` - 图谱选择器
- `apps/web/components/graph/CreateGraphDialog.tsx` - 创建图谱对话框
- `apps/web/hooks/useGraphs.ts` - 图谱列表管理hook

**功能：**
```typescript
// useGraphs hook
export function useGraphs() {
  const createGraph = async (name: string) => {
    const response = await fetch('/api/graphs', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return response.json();
  };

  const listGraphs = async () => { /* ... */ };
  
  return { createGraph, listGraphs, ... };
}
```

---

### 4. 协作层 (Collaboration Layer)

#### 4.1 WebSocket连接
**文件：** `apps/web/hooks/useCollaboration.ts`

**影响：**
- ✅ 已经支持动态graphId（通过参数传入）
- 无需变更，只需确保传入正确的graphId

**代码位置：**
```typescript
// Line 50-53 in app/page.tsx
const collab = useCollaboration({
  graphId: DEMO_GRAPH_ID, // 改为动态graphId
  user: DEMO_USER,
  wsUrl: process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234',
});
```

#### 4.2 Hocuspocus服务器
**文件：** `apps/api/src/modules/collab/collab.service.ts`

**影响：**
- ✅ 已支持动态文档名称 (`graph:{graphId}`)
- ✅ onLoadDocument 和 onStoreDocument 已支持动态graphId
- 无需变更

---

### 5. 上下文层 (Context Layer)

#### 5.1 GraphContext
**文件：** `apps/web/contexts/GraphContext.tsx`

**影响：**
- ✅ 已支持动态graphId（刚刚添加）
- 只需确保在路由变更时更新graphId

---

### 6. 测试层 (Testing Layer)

#### 6.1 单元测试
**影响文件：**
- 所有使用 `demo-graph-1` 的测试文件需要更新

**策略：**
```typescript
// 测试中创建临时graphId
const testGraphId = `test-graph-${Date.now()}`;

// 或使用固定测试ID
const TEST_GRAPH_ID = 'test-graph-fixture-1';
```

#### 6.2 E2E测试
**影响：**
- 需要更新测试流程：先创建图谱，再进行操作

---

### 7. 环境配置层

#### 7.1 环境变量
**新增：** `.env.example` 和 `.env`

```bash
# 是否启用Demo种子数据（开发/测试用）
ENABLE_DEMO_SEED=false

# Default graph name
DEFAULT_GRAPH_NAME=新建图谱
```

---

## 实施步骤建议

### Phase 1: 后端准备（不影响现有功能）
1. ✅ 创建 Graph CRUD API模块
2. ✅ 添加环境变量控制种子数据
3. ✅ 编写数据库重置脚本
4. ✅ 单元测试

### Phase 2: 前端路由改造
1. ✅ 创建 `/graph/[graphId]` 路由
2. ✅ 移动现有逻辑到新路由
3. ✅ 创建 Landing Page（`/`）
4. ✅ 实现首次访问时自动创建并跳转

### Phase 3: 清理与测试
1. ✅ 禁用/删除 DemoSeedService
2. ✅ 清空数据库
3. ✅ 端到端测试
4. ✅ 更新文档

---

## 风险评估

### 高风险 🔴
1. **数据库清空** - 需要确保有备份
2. **路由变更** - 可能导致现有链接失效

### 中风险 🟡
1. **测试用例更新** - 大量测试需要修改
2. **协作功能** - 多用户同时访问不同图谱的并发问题

### 低风险 🟢
1. **后端API扩展** - 新增功能，不影响现有
2. **环境变量** - 向后兼容

---

## 回滚策略

1. **数据库级别：** 保留migration备份，可回滚到包含种子数据的版本
2. **代码级别：** Git分支隔离，出问题可快速回退
3. **配置级别：** 保留 `ENABLE_DEMO_SEED=true` 选项作为fallback

---

## 预估工作量

| 任务 | 工作量 | 优先级 |
|------|-------|--------|
| Graph CRUD API | 4h | P0 |
| 前端路由改造 | 6h | P0 |
| Landing Page | 3h | P0 |
| 清理种子数据逻辑 | 2h | P0 |
| 测试更新 | 4h | P1 |
| 文档更新 | 2h | P1 |
| **总计** | **21h** | - |

---

## 其他考虑

### 用户体验
- 首次访问应该立即可用，而非要求用户手动创建
- 考虑添加"示例图谱"模板功能

### 性能
- 频繁创建图谱可能导致DB压力
- 考虑添加速率限制

### 安全
- 未认证用户创建的图谱应该如何处理？
- 考虑添加匿名会话机制

---

## 结论

**总体影响：中等偏大**
- 需要改造15+个文件
- 涉及数据库、后端、前端、测试多个层面
- 建议分3个phase逐步实施，降低风险

**建议优先级：**
1. 如果项目处于早期开发阶段 → **高优先级**，现在改造成本最低
2. 如果已有生产数据 → **需谨慎**，考虑数据迁移方案
3. 如果只是Demo环境 → **中优先级**，可以分阶段实施
