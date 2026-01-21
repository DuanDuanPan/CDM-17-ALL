# Story 10.2: UsersService Repository 收敛

Status: done

## Story

As a **后端开发者**,
I want **引入 `UsersRepository` 并重构 `users.service.ts` 不再直接调用 `prisma.*`**,
So that **用户查询逻辑与数据访问解耦，避免 Service 层 ORM 侵入。**

## Acceptance Criteria

1. **Given** `apps/api/src/modules/users/users.service.ts` 直接导入并使用 `prisma`
   **When** 完成重构
   **Then** `users.service.ts` 不再导入 `@cdm/database` 的 `prisma`

2. **Given** UsersService 包含 3 个方法需要重构（`list/search/findById`）
   **When** 完成重构
   **Then** 所有用户查询通过新建的 `UsersRepository` 完成

3. **Given** ESLint 规则已配置 `no-restricted-imports`
   **When** 执行 `pnpm lint`
   **Then** 不再报告 `users.service.ts` 的 `no-restricted-imports` 违规

4. **Given** 所有改动完成
   **When** 执行功能测试
   **Then** 现有 API 行为不变（分页列表/模糊搜索/按ID查询）

## Tasks / Subtasks

- [x] **Task 1: 创建 UsersRepository** (AC: #2)
  - [x] 1.1 新建 `apps/api/src/modules/users/users.repository.ts`
  - [x] 1.2 添加 `findMany()` 方法 - 分页查询用户列表 + 计数（保持 `Promise.all([findMany, count])` 并行模式）
  - [x] 1.3 添加 `search()` 方法 - 模糊搜索用户（name/email）
  - [x] 1.4 添加 `findById()` 方法 - 按 ID 查询单个用户
  - [x] 1.5 定义返回类型 `UserBasicInfo` 使用 `Prisma.UserGetPayload<T>`

- [x] **Task 2: 重构 UsersService** (AC: #1, #2)
  - [x] 2.1 构造函数注入 `UsersRepository`
  - [x] 2.2 移除 `import { prisma } from '@cdm/database'`
  - [x] 2.3 重构 `list()` → 使用 `usersRepository.findMany()`
  - [x] 2.4 重构 `search()` → 使用 `usersRepository.search()`
  - [x] 2.5 重构 `findById()` → 使用 `usersRepository.findById()`
  - [x] 2.6 保留现有接口类型定义 `UserSearchResult`（或从 Repository 派生）

- [x] **Task 3: 更新 Module 注册** (AC: #2)
  - [x] 3.1 在 `UsersModule` 中注册 `UsersRepository` 为 provider
  - [x] 3.2 导出 `UsersRepository`（如有需要）
  - [x] 3.3 确保 `plugin-kernel.module.ts` 的 `USERS_SERVICE` 注入正常

- [x] **Task 4: 测试与验证** (AC: #3, #4)
  - [x] 4.1 新增 `apps/api/src/modules/users/__tests__/users.repository.spec.ts`
  - [x] 4.2 新增 `apps/api/src/modules/users/__tests__/users.service.spec.ts`（Mock Repository）
  - [x] 4.3 运行 `pnpm lint` 确认无违规
  - [x] 4.4 手动测试：用户列表、搜索、按ID查询

- [x] **Review Follow-ups Round 1 (AI Code Review @ 2026-01-21 11:05)**
  - [x] 5.1 [MEDIUM] `apps/api/src/modules/users/index.ts` - 补齐 `UsersRepository` 的 barrel export，与 graphs 模块保持一致
  - [x] 5.2 [MEDIUM] `users.repository.spec.ts` - 移除基于时间的并行性断言，改为确定性 Promise.all 护栏测试
  - [ ] 5.3 [LOW] `users.controller.ts` - 对 `limit/offset` 做 NaN/负数保护（需确认是否允许改变既有行为）

- [x] **Review Follow-ups Round 2 (AI Code Review @ 2026-01-21 12:24)**
  - [x] 6.1 [MEDIUM] `apps/api/src/modules/users/index.ts` - Story comment 过时 (当前 Story 4.1 → 应为 Story 10.2)
  - [ ] 6.2 [LOW] `users.controller.ts` - `parseInt` 未做 NaN/负数保护 (同 5.3)
  - [ ] 6.3 [LOW] Git changes 未 commit - 建议合适时机提交
  - [ ] 6.4 [LOW] `_bmad/bmm/config.yaml` - 缺少 `user_skill_level` 配置

---

## Dev Notes

### 🔥 核心目标

**防止 LLM 开发者犯的常见错误**：
- ❌ 忘记创建 `__tests__` 目录（现在 users 模块没有测试目录！）
- ❌ 直接复制 prisma 调用而不考虑类型安全
- ❌ 破坏 `plugin-kernel.module.ts` 对 `UsersService` 的依赖
- ❌ 忘记更新 Module 的 providers/exports

### 🏗️ 架构模式参考

**Repository Pattern 标准实现**（参考 Story 10.1 GraphRepository）：

```typescript
// users.repository.ts - 标准模式
import { Injectable } from '@nestjs/common';
import { prisma, type Prisma } from '@cdm/database';

// 定义返回类型（使用 Prisma 类型工具）
const userBasicSelect = {
  id: true,
  name: true,
  email: true,
} as const;

export type UserBasicInfo = Prisma.UserGetPayload<{
  select: typeof userBasicSelect;
}>;

@Injectable()
export class UsersRepository {
  // 只有 Repository 可以导入 prisma
}
```

**Service 依赖注入**：

```typescript
// users.service.ts - 正确模式
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  // ❌ 禁止: import { prisma } from '@cdm/database'
}
```

### 📁 Project Structure Notes

**现有文件位置**：
```
apps/api/src/modules/users/
├── __tests__/                  # 🆕 需要新建目录
│   ├── users.repository.spec.ts # 🆕 需要新增
│   └── users.service.spec.ts    # 🆕 需要新增
├── users.repository.ts         # 🆕 需要新建
├── users.controller.ts         # 无需修改（已符合极简原则）
├── users.module.ts             # 需添加 Repository provider
├── users.service.ts            # 🎯 重构目标
└── index.ts                    # 可能需更新 barrel export
```

**UsersService 当前方法分析**（需重构）：

| 方法 | 对应 Repository 方法 | Prisma 调用 | 行号 |
|------|---------------------|-------------|------|
| `list()` | `findMany()` | `prisma.user.findMany()` + `prisma.user.count()` | L26-44 |
| `search()` | `search()` | `prisma.user.findMany()` with OR filter | L50-85 |
| `findById()` | `findById()` | `prisma.user.findUnique()` | L90-100 |

### ⚠️ 关键实现细节

1. **Select 字段一致性**：所有方法当前 select `{ id, name, email }`，建议提取为常量供复用。

2. **分页逻辑**：`list()` 返回 `{ users, total }`，需要 Repository 同时返回 count。

3. **搜索逻辑**：`search()` 空关键字返回默认列表（take: limit），有关键字则 OR 匹配 name/email。

4. **类型安全**：优先在 Repository 层用 `Prisma.UserGetPayload<T>` 明确返回类型，避免在 Service 层用 `as` 断言。

5. **Plugin 依赖**：`UsersService` 被 `plugin-kernel.module.ts` 通过 `USERS_SERVICE` token 导出给插件使用，确保接口不变。

6. **行为不变（Behavior Invariants）**：
   - `list()`：默认 `limit=50`, `offset=0`；`orderBy: { name: 'asc' }`；`select: { id, name, email }`；并行执行列表查询 + `count()`
   - `search()`：默认 `limit=20`；`q` 为空返回默认列表（同上 `orderBy/select`）；`q` 非空时 OR 匹配 `name/email`，必须保留 `mode: 'insensitive'`，排序仍为 `name: 'asc'`

### 🔗 外部依赖检查

**UsersService 被以下位置依赖**：
- `apps/api/src/modules/users/users.controller.ts` - 直接注入
- `apps/api/src/modules/plugin-kernel/plugin-kernel.module.ts` - 通过 `USERS_SERVICE` token 导出

**不需要修改上述文件**，只要 UsersService 接口（方法签名）保持不变。

### 🧪 测试提示

- **Repository 单测**：`jest.mock('@cdm/database')` mock `prisma`，测试 findMany/search/findById。
- **Service 单测**：使用 Nest TestingModule 注入 `UsersService`，mock `UsersRepository`（单测不触达数据库）。
- **参考**：`apps/api/src/modules/graphs/__tests__/` 下的 `graph.repository.spec.ts` 和 `graphs.service.spec.ts`。

### 📋 ESLint 规则检查

规则位置：`apps/api/eslint.config.mjs`

```javascript
// 当前为 warn 级别，Story 10.3 会收紧到 error
{
  files: ['**/*.service.ts', '**/*.controller.ts'],
  rules: {
    'no-restricted-imports': [
      'warn',
      {
        paths: [{
          name: '@cdm/database',
          importNames: ['prisma'],
          message: 'Direct prisma import is prohibited. Use Repository pattern.',
        }],
      },
    ],
  },
}
```

### References

- [Source: docs/analysis/refactoring-proposal-2026-01-20.md#3.2] - Repository 模式违规详细分析
- [Source: docs/project-context.md#Repository Pattern] - 架构规范
- [Source: docs/sprint-artifacts/10-1-graphs-service-repository-compliance.md] - Story 10.1 模式参考
- [Source: apps/api/src/modules/users/users.service.ts] - 重构目标文件
- [Source: apps/api/src/modules/graphs/graph.repository.ts] - Repository 实现参考
- [Git] `8c4b2da` - Story 10.1 实现（GraphsService Repository compliance）
- [Git] `c6be351` - Story 7.1 引入 Repository 模式 + `no-restricted-imports` 规则
- [Git] `b458007` - UsersService 现状基线（当前仍直接使用 `prisma`）

---

## Verification Plan

### Automated Tests

```bash
# 运行 lint 检查
cd apps/api && pnpm lint

# 运行 Repository 单元测试
cd apps/api && pnpm test -- users.repository.spec.ts

# 运行 Service 单元测试
cd apps/api && pnpm test -- users.service.spec.ts
```

### Manual Verification

| 功能 | 操作 | 预期结果 |
|------|------|----------|
| 用户列表 | GET `/api/users?limit=10&offset=0` | 返回分页用户列表，含 total |
| 用户搜索 | GET `/api/users/search?q=test` | 返回匹配 name/email 的用户 |
| 空搜索 | GET `/api/users/search` | 返回默认用户列表（前20条）|
| 按ID查询 | GET `/api/users/:id` | 返回单个用户信息 |

---

## Risk & Rollback

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 破坏 plugin-kernel 依赖 | 🟢 低 | 🔴 高 | 保持 UsersService 接口签名不变 |
| 类型不匹配 | 🟢 低 | 🟡 中 | 使用 `Prisma.UserGetPayload` 类型 |
| 测试遗漏 | 🟡 中 | 🟡 中 | 参考 Story 10.1 测试模式 |

---

## Senior Developer Review (AI)

### ✅ 结论

- ✅ AC1：`UsersService` 不再直接导入 `prisma`（`apps/api/src/modules/users/users.service.ts:8`）。
- ✅ AC2：`list/search/findById` 全部委托给 `UsersRepository`（`apps/api/src/modules/users/users.service.ts:30` / `40` / `48`），且 Repository 提供对应方法（`apps/api/src/modules/users/users.repository.ts:50` / `72` / `102`）。
- ✅ AC3：`pnpm --filter @cdm/api lint` 不再对 `users.service.ts` 报 `no-restricted-imports`（仍存在其他文件的 warn，非本 Story 目标）。
- ✅ AC4：关键行为保持不变：`list()` 的默认 `limit/offset` + `Promise.all([findMany, count])`；`search()` 的 `trim` + `mode: 'insensitive'` + `orderBy: { name: 'asc' }`；`findById()` 的 select 字段一致。
- Verdict：✅ Approve（含 review 期间修复）。

### 🔴 High（0）

### 🟡 Medium（2，已修复）

- Git vs Story：原 Dev Agent Record 的 File List 未包含 `apps/api/src/modules/users/index.ts`（barrel export）与 `docs/sprint-artifacts/sprint-status.yaml`（状态同步）；已补齐。
- `apps/api/src/modules/users/__tests__/users.repository.spec.ts` 使用时间阈值断言并行性（在 CI/负载环境下易抖动导致假失败）→ 已改为确定性 Promise.all 护栏（`apps/api/src/modules/users/__tests__/users.repository.spec.ts:67`）。

### 🟢 Low（2，建议后续）

- `apps/api/src/modules/users/users.controller.ts` 的 `parseInt` 可能产生 NaN/负数并传给 Prisma；建议在 controller 层做 clamp/validate（需确认是否允许改变既有行为）。
- Story 10.3 收紧 lint（warn→error）时，`subscriptions.service.ts` / `demo-seed.service.ts` 的 prisma import 会变成阻断项（非本 Story 目标）。

## Dev Agent Record

### Agent Model Used

Claude 3.5 Sonnet (Antigravity)

### Debug Log References

- `pnpm --filter @cdm/api lint` (pass; warnings only)
- `pnpm --filter @cdm/api test -- users.repository.spec.ts` (pass)
- `pnpm --filter @cdm/api test -- users.service.spec.ts` (pass)

### Completion Notes List

- ✅ Created `UsersRepository` with `findMany`, `search`, `findById` methods using `Prisma.UserGetPayload<T>` for type safety
- ✅ Refactored `UsersService` to use dependency injection, removed direct `prisma` import
- ✅ `UserSearchResult` is now a type alias pointing to `UserBasicInfo` from Repository for backward compatibility
- ✅ Registered `UsersRepository` in `UsersModule` as provider and export
- ✅ Exported `UsersRepository` from `apps/api/src/modules/users/index.ts` (barrel export parity with graphs module)
- ✅ Lint passes - `users.service.ts` no longer triggers `no-restricted-imports` warning
- ✅ Replaced flaky timing-based test with deterministic Promise.all guard; all 18 unit tests pass (10 Repository + 8 Service)
- ✅ `plugin-kernel.module.ts` dependency on `USERS_SERVICE` unaffected (interface unchanged)

### File List

| File | Action |
|------|--------|
| `apps/api/src/modules/users/users.repository.ts` | Added - New Repository with findMany/search/findById |
| `apps/api/src/modules/users/users.service.ts` | Modified - Refactored to use Repository pattern |
| `apps/api/src/modules/users/users.module.ts` | Modified - Added UsersRepository provider |
| `apps/api/src/modules/users/index.ts` | Modified - Export UsersRepository in barrel export |
| `apps/api/src/modules/users/__tests__/users.repository.spec.ts` | Added - Unit tests for Repository (10 tests) + deterministic Promise.all guard |
| `apps/api/src/modules/users/__tests__/users.service.spec.ts` | Added - Unit tests for Service (8 tests) |
| `docs/sprint-artifacts/10-2-users-service-repository-compliance.md` | Modified - Add Senior Developer Review + Change Log |
| `docs/sprint-artifacts/validation-report-2026-01-21T11-05-06+0800.md` | Added - Validation report (create-story) |
| `docs/sprint-artifacts/sprint-status.yaml` | Modified - Sync Story 10.2 status |

### Change Log

- 2026-01-21: [Code Review] Adversarial review complete. Fixed MEDIUM: `users/index.ts` barrel export parity; removed flaky timing assertion in `users.repository.spec.ts`. Users module unit tests pass.
- 2026-01-21: [Code Review Round 2] 0 High, 1 Medium, 3 Low issues found. Fixed MEDIUM: `users/index.ts` Story comment updated (4.1 → 10.2). 3 LOW items added as action items.
