# Story 10.1: GraphsService Repository 收敛

Status: done

## Story

As a **后端开发者**,
I want **让 `graphs.service.ts` 不再直接调用 `prisma.*`，而是通过 Repository 层访问数据库**,
So that **核心业务层与 ORM 解耦，符合架构规范且便于测试/演进。**

## Acceptance Criteria

1. **Given** `apps/api/src/modules/graphs/graphs.service.ts` 直接导入并使用 `prisma`
   **When** 完成重构
   **Then** `graphs.service.ts` 不再导入 `@cdm/database` 的 `prisma`

2. **Given** GraphsService 包含 6 个方法需要重构（`create/findByUser/findOne/update/remove/exists`）
   **When** 完成重构
   **Then** 所有 Graph CRUD/查询/存在性检查通过 `GraphRepository` 完成（可复用或扩展现有 Repository）

3. **Given** ESLint 规则已配置 `no-restricted-imports`
   **When** 执行 `pnpm lint`
   **Then** 不再报告 `graphs.service.ts` 的 `no-restricted-imports` 违规

4. **Given** 所有改动完成
   **When** 执行功能测试
   **Then** 现有 API 行为不变（创建/列表/详情/更新/删除图谱）

## Tasks / Subtasks

- [x] **Task 1: 扩展 GraphRepository** (AC: #2)
  - [x] 1.1 添加 `create()` 方法 - 创建图谱并返回含 project 关系
  - [x] 1.2 添加 `findByUserId()` 方法 - 按用户查询图谱列表（含 _count）
  - [x] 1.3 添加 `findOneWithProject()` 方法 - 查询单个图谱详情
  - [x] 1.4 添加 `update()` 方法 - 更新图谱名称
  - [x] 1.5 添加 `delete()` 方法 - 删除图谱
  - [x] 1.6 复用现有 `exists()` 方法（已实现）

- [x] **Task 2: 重构 GraphsService** (AC: #1, #2)
  - [x] 2.1 构造函数注入 `GraphRepository`
  - [x] 2.2 移除 `import { prisma } from '@cdm/database'`
  - [x] 2.3 重构 `create()` → 使用 `graphRepository.create()`
  - [x] 2.4 重构 `findByUser()` → 使用 `graphRepository.findByUserId()`
  - [x] 2.5 重构 `findOne()` → 使用 `graphRepository.findOneWithProject()`
  - [x] 2.6 重构 `update()` → 使用 `graphRepository.update()`
  - [x] 2.7 重构 `remove()` → 使用 `graphRepository.delete()`
  - [x] 2.8 `exists()` → 使用现有 `graphRepository.exists()`

- [x] **Task 3: 更新 Module 注册** (AC: #2)
  - [x] 3.1 确保 `GraphsModule` 导出 `GraphRepository`
  - [x] 3.2 确保 `GraphsService` 正确注入依赖

- [x] **Task 4: 测试与验证** (AC: #3, #4)
  - [x] 4.1 扩展 `apps/api/src/modules/graphs/__tests__/graph.repository.spec.ts` 覆盖新增方法
  - [x] 4.2 新增 `apps/api/src/modules/graphs/__tests__/graphs.service.spec.ts`（Mock `GraphRepository`，Service 单测不触 DB）
  - [x] 4.3 运行 `pnpm lint` 确认无违规
  - [x] 4.4 手动测试：创建图谱、列表、详情、更新、删除

- [x] **Review Follow-ups (AI Code Review @ 2026-01-21)**
  - [x] 5.1 [HIGH] `graph.repository.ts:update()` - 防止 undefined name 传入 Prisma
  - [x] 5.2 [HIGH] `graphs.service.spec.ts` - 移除 `as unknown as` 双重类型断言
  - [x] 5.3 [MEDIUM] `graphs.service.ts` - GraphResponse 类型从 Repository 派生
  - [ ] 5.4 [MEDIUM] `graphs.controller.ts` - 添加 class-validator DTO 验证 (out of scope)
  - [ ] 5.5 [MEDIUM] `graphs.controller.ts` - 移除 userId 默认值 (需 Auth Guard, out of scope)
  - [ ] 5.6 [LOW] `graph.repository.spec.ts` - 补充事务回滚测试 (out of scope)
  - [ ] 5.7 [LOW] Story File List 添加具体行号 (documentation improvement)

---

## Dev Notes

### 🔥 核心目标

**防止 LLM 开发者犯的常见错误**：
- ❌ 直接复制 prisma 调用到 Repository 而不考虑类型安全
- ❌ 遗漏现有 Repository 方法（如 `exists()` 已实现）
- ❌ 破坏现有的 `GraphRepository` 被 `CollabService` 使用的方法
- ❌ 忘记更新 Module 的 exports/imports

### 🏗️ 架构模式参考

**Repository Pattern 标准实现**（参考 Story 7.1）：

```typescript
// graph.repository.ts - 标准模式
import { Injectable } from '@nestjs/common';
import { prisma, type Graph, type Prisma } from '@cdm/database';

@Injectable()
export class GraphRepository {
  // 只有 Repository 可以导入 prisma
  // Service 通过注入 Repository 访问数据
}
```

**Service 依赖注入**：

```typescript
// graphs.service.ts - 正确模式
@Injectable()
export class GraphsService {
  constructor(
    private readonly graphRepository: GraphRepository,
    private readonly demoSeedService: DemoSeedService,
  ) {}
  // ❌ 禁止: import { prisma } from '@cdm/database'
}
```

### 📁 Project Structure Notes

**现有文件位置**：
```
apps/api/src/modules/graphs/
├── __tests__/
│   ├── graph.repository.spec.ts # ✅ 已存在，需扩展
│   └── graphs.service.spec.ts   # 🆕 需要新增（Mock GraphRepository）
├── graph.repository.ts      # ✅ 已存在，需扩展
├── graphs.controller.ts     # 无需修改
├── graphs.module.ts         # 可能需调整 exports
├── graphs.service.ts        # 🎯 重构目标
└── index.ts                 # barrel export
```

**现有 GraphRepository 方法（不可破坏！）**：
| 方法 | 用途 | 调用方 |
|------|------|--------|
| `findGraphWithRelations()` | 加载图谱含节点/边 | CollabService.onLoadDocument |
| `updateYjsState()` | 更新 Yjs 二进制状态 | CollabService.onStoreDocument |
| `findById()` | 基础查询 | 内部复用 |
| `exists()` | 检查存在性 | 可复用 |
| `upsertNodesBatch()` | 批量同步节点 | CollabService |

### 🔧 需新增的 Repository 方法

**基于 `graphs.service.ts` 分析**：

| 方法 | 对应 Service 方法 | Prisma 调用 | 行号 |
|------|------------------|-------------|------|
| `create()` | `create()` | `prisma.graph.create()` + include project | L55-72 |
| `findByUserId()` | `findByUser()` | `prisma.graph.findMany()` + where/include/_count | L82-106 |
| `findOneWithProject()` | `findOne()` | `prisma.graph.findUnique()` + include project | L113-127 |
| `update()` | `update()` | `prisma.graph.update()` + include project | L144-158 |
| `delete()` | `remove()` | `prisma.graph.delete()` | L174 |

### ⚠️ 关键实现细节

1. **权限/行为不变**：`update/remove` 的所有权校验逻辑必须保留（基于 `project.ownerId` 抛 `ForbiddenException`），不要下沉到 Controller，也不要弱化校验。
2. **返回 shape 必须匹配现状**：
   - `create/findOne/update`：必须 `include project.ownerId`（`update/remove` 依赖它做所有权校验；响应也包含 `project.ownerId`）。
   - `findByUser`：保持现状只返回 `project { id, name }` + `_count { nodes, edges }`，并按 `updatedAt desc` 排序。
3. **类型安全**：优先在 Repository 层用 `Prisma.GraphGetPayload<T>` 明确返回类型，避免在 Service 层用 `as` 大面积断言。
4. **Include 一致性**：`project` 关系在多个方法中复用，建议提取为常量（例如 `PROJECT_SELECT_WITH_OWNER` / `PROJECT_SELECT_PUBLIC`）。
5. **保持 DemoSeedService 调用**：`create()` 和 `findByUser()` 依赖 `demoSeedService`，这部分逻辑留在 Service。

### 🧪 测试提示

- Repository 单测位置：`apps/api/src/modules/graphs/__tests__/graph.repository.spec.ts`（当前已用 `jest.mock('@cdm/database')` mock `prisma`）。新增方法时需要补齐 `prisma.graph.create/findMany/delete/count` 等 mock。
- Service 单测建议新增：`apps/api/src/modules/graphs/__tests__/graphs.service.spec.ts`，使用 Nest TestingModule 注入 `GraphsService`，并 mock `GraphRepository` + `DemoSeedService`（单测不触达数据库）。

### 📋 ESLint 规则检查

当前规则位置：`apps/api/eslint.config.mjs`

```javascript
// apps/api/eslint.config.mjs (flat config) - 当前为 warn 级别
{
  files: ['**/*.service.ts', '**/*.controller.ts'],
  rules: {
    'no-restricted-imports': [
      'warn',
      {
        paths: [
          {
            name: '@cdm/database',
            importNames: ['prisma'],
            message:
              'Direct prisma import is prohibited in Services/Controllers. Use Repository pattern instead.',
          },
        ],
      },
    ],
  },
}
```

### ⏱️ 顺序建议

- 建议先完成本 Story（10.1），再执行 Story 10.3（将 `no-restricted-imports` 从 warn 收紧到 error），避免 CI/本地 `pnpm lint` 因 `graphs.service.ts` 违规而直接失败。

### References

- [Source: docs/analysis/refactoring-proposal-2026-01-20.md#3.2] - Repository 模式违规详细分析
- [Source: docs/analysis/refactoring-proposal-2026-01-20.md#6.2] - Phase 1 任务清单
- [Source: docs/project-context.md#Repository Pattern] - 架构规范
- [Source: docs/sprint-artifacts/story-7-1-backend-repo-refactor.md] - Story 7.1 实现模式参考
- [Source: apps/api/src/modules/graphs/graph.repository.ts] - 现有 Repository 实现
- [Source: apps/api/src/modules/graphs/graphs.service.ts] - 重构目标文件
- [Git] 相关提交：`c6be351`（引入 no-restricted-imports + 初版 Repository 模式），`6c77383`（Story 7.1 修复与测试补全），`f24e18f`（GraphRepository 近期更新）

---

## Verification Plan

### Automated Tests

```bash
# 运行 lint 检查
cd apps/api && pnpm lint

# 运行 Repository 单元测试
cd apps/api && pnpm test -- graph.repository.spec.ts

# 运行 Service 单元测试
cd apps/api && pnpm test -- graphs.service.spec.ts

# 运行 API 端点测试（如有）
cd apps/api && pnpm test:e2e -- graphs
```

### Manual Verification

| 功能 | 操作 | 预期结果 |
|------|------|----------|
| 创建图谱 | POST `/api/graphs` | 返回新图谱，含 project 信息 |
| 图谱列表 | GET `/api/graphs?userId=xxx` | 返回用户的图谱列表，含 _count |
| 图谱详情 | GET `/api/graphs/:id` | 返回图谱详情，含 project.ownerId |
| 更新图谱 | PATCH `/api/graphs/:id` | 返回更新后的图谱 |
| 删除图谱 | DELETE `/api/graphs/:id` | 返回成功消息 |

---

## Risk & Rollback

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 破坏 CollabService 依赖 | 🟡 中 | 🔴 高 | 不修改现有 Repository 方法签名 |
| 类型不匹配 | 🟢 低 | 🟡 中 | 使用 `Prisma.GraphGetPayload` 类型 |
| 测试遗漏 | 🟢 低 | 🟡 中 | 对每个新方法补充单测 |

---

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Completion Notes List

- Extended `GraphRepository` with 5 new CRUD methods: `create()`, `findByUserId()`, `findOneWithProject()`, `update()`, `delete()`
- Added type definitions using `Prisma.GraphGetPayload` for type-safe return types
- Refactored `GraphsService` to inject `GraphRepository` and use Repository methods for all DB operations
- Removed direct `prisma` import from `graphs.service.ts` - now complies with `no-restricted-imports` rule
- Removed unsafe type assertions in `GraphsService` by aligning response types with repository payloads
- Created comprehensive unit tests for `GraphsService` with mocked dependencies
- Extended `GraphRepository` unit tests to cover new CRUD methods (create/list/findOne/update/delete)
- Verified `GraphsModule` already had correct DI configuration
- Lint passes with 0 errors (only warnings from unrelated files)

### Code Review Notes (2026-01-21)

**Adversarial review completed by AI Senior Developer:**
- ✅ All 4 Acceptance Criteria verified implemented
- ✅ All tasks marked [x] confirmed complete against code
- ⚠️ Found 2 HIGH, 3 MEDIUM, 2 LOW issues
- 🔧 Fixed: `update()` undefined name protection, test mock type assertions
- 📝 Deferred: DTO validation, Auth Guard for userId (out of scope for this story)

### File List

| File | Action |
|------|--------|
| `apps/api/src/modules/graphs/graph.repository.ts` | Modified - Added 5 CRUD methods + type definitions + undefined fix |
| `apps/api/src/modules/graphs/graphs.service.ts` | Modified - Refactored to use Repository pattern |
| `apps/api/src/modules/graphs/__tests__/graphs.service.spec.ts` | Added - Unit tests + fixed mock type assertions |
| `apps/api/src/modules/graphs/__tests__/graph.repository.spec.ts` | Modified - Added unit tests for new CRUD methods |
| `docs/sprint-artifacts/sprint-status.yaml` | Modified - Status updated |
| `docs/sprint-artifacts/10-1-graphs-service-repository-compliance.md` | Modified - Tasks + review follow-ups |
| `docs/sprint-artifacts/validation-report-2026-01-21T09-44-47+0800.md` | Added - Story validation report |

