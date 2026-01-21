# Story 10.3: ESLint 规则收紧 + 技术债清理

Status: done

## Story

As a **架构维护者**,
I want **将 Repository 规则从 warn 升级到 error，并清理核心模块的明显 lint debt**,
So that **规则可执行且在后续迭代中不会再次回退。**

## Acceptance Criteria

1. **Given** 当前 `no-restricted-imports` 规则级别为 `warn`
   **When** 执行规则升级
   **Then** 核心 Service/Controller 中的 `prisma` 直接导入会导致 `pnpm --filter @cdm/api lint` 失败（error 级别）

2. **Given** 规则升级后会影响现有代码
   **When** 配置例外规则
   **Then** 规则显式允许例外目录/文件（listener / demo / test / 插件代码；以及明确标注、带 TODO 的过渡性例外文件）

3. **Given** 存在与本 Epic 改动相关的 lint 问题
   **When** 完成清理
   **Then** 清理本阶段涉及的未使用变量/显著 `any`（只处理与本 Epic 改动相关的部分）

4. **Given** 所有改动完成
   **When** 执行 `pnpm --filter @cdm/api lint`（或 `cd apps/api && pnpm lint`）
   **Then** lint 通过（0 errors；允许 warnings，例如测试文件的 `any`）

> 备注：仓库根目录的 `pnpm lint` 会跑全 workspace；本 Story 的通过条件以 `@cdm/api` 的 lint 结果为准。

## Tasks / Subtasks

- [x] **Task 1: 升级 `no-restricted-imports` 规则** (AC: #1)
  - [x] 1.1 编辑 `apps/api/eslint.config.mjs`
  - [x] 1.2 将 `warn` 改为 `error`（针对 `*.service.ts`, `*.controller.ts`）
  - [x] 1.3 运行 `pnpm --filter @cdm/api lint` 确认规则已按 `error` 生效（随后在 Task 2 添加例外以恢复到 0 errors）

- [x] **Task 2: 配置规则例外** (AC: #2)
  - [x] 2.1 在 `demo-seed.service.ts` 的 prisma import 行添加 `eslint-disable-next-line`（最小范围例外）
  - [x] 2.2 在 `subscriptions.service.ts` 的 prisma import 行添加 `eslint-disable-next-line`（临时，Story 10.7 插件化后删除；最小范围例外）
  - [x] 2.3 添加注释说明例外原因和待办（含 Story 追溯）
  - [x] 2.4 验证 listener / test / 插件目录不受新规则影响

- [x] **Task 3: 清理 Epic 10 相关 lint 问题** (AC: #3)
  - [x] 3.1 修复 `data-asset.service.ts:118` 未使用变量 `error`
  - [x] 3.2 修复 `subscription.listener.ts:161` 未使用参数 `mindmapId`（加 `_` 前缀）
  - [x] 3.3 【可选】评估 data-management 测试文件的 `any` 问题 - 已验证，暂不处理（非核心）

- [x] **Task 4: 验证与文档** (AC: #4)
  - [x] 4.1 运行 `pnpm --filter @cdm/api lint` 确认 0 errors
  - [x] 4.2 更新 `eslint.config.mjs` 的注释（Story 7.1 → Story 10.3）
  - [x] 4.3 更新 `sprint-status.yaml` 状态

- **Review Follow-ups (AI)** - Code Review 2026-01-21
  - [ ] [AI-Review][MEDIUM] `subscriptions.service.ts` L33 仍有直接 prisma 调用（已有 disable comment），待 Story 10.7 插件化统一处理
  - [x] [AI-Review][MEDIUM] 提交 Story 10.3 变更并补充 Git commit hash 到文档 ✅ `58e5da8`
  - [x] [AI-Review][LOW] `sprint-status.yaml` L5/L41 的 `story_location` 路径为 Windows 格式，与当前 macOS 项目不一致 ✅ 已修复
  - [ ] [AI-Review][LOW] 可选：`eslint.config.mjs` 注释可添加"查看 disable comment 获取完整例外列表"

---

## Dev Notes

### 🔥 核心目标

**防止 LLM 开发者犯的常见错误**：
- ❌ 直接把 `warn` 改成 `error` 而不添加例外 → lint 失败
- ❌ 给所有文件添加 disable comment → 失去规则价值
- ❌ 修复测试文件的 `any` 却破坏类型推断 → 测试失败
- ❌ 忘记更新 `eslint.config.mjs` 的注释/Story 引用 → 后续维护者误以为仍处于迁移期而反复回退
- ❌ 忘记更新 sprint-status.yaml

### 🏗️ Lint 状态分析

**改动前（升级到 error 前）基线问题**：

| 文件 | 问题类型 | 行号 | 处理方式 |
|------|----------|------|----------|
| `demo-seed.service.ts` | `no-restricted-imports` (prisma) | L3 | `eslint-disable-next-line` |
| `subscriptions.service.ts` | `no-restricted-imports` (prisma) | L15 | `eslint-disable-next-line`（临时） |
| `data-asset.service.ts` | `no-unused-vars` (error) | L118 | 移除或使用 |
| `subscription.listener.ts` | `no-unused-vars` (mindmapId) | L161 | 加 `_` 前缀 |
| `data-management/__tests__/*.ts` | `no-explicit-any` (25+处) | 多处 | 暂不处理（非核心） |

**改动后（本 Story 完成后）**：`pnpm --filter @cdm/api lint` → `0 errors, 24 warnings`（warnings 全部来自 `apps/api/src/modules/data-management/__tests__` 的 `@typescript-eslint/no-explicit-any`）。

### 📁 Project Structure Notes

**需修改的文件位置**：
```
apps/api/
├── eslint.config.mjs              # 🎯 主要修改目标
├── src/
│   ├── demo/
│   │   └── demo-seed.service.ts   # 添加 disable comment
│   ├── modules/
│   │   ├── data-management/
│   │   │   └── data-asset.service.ts  # 修复未使用变量
│   │   └── subscriptions/
│   │       ├── subscription.listener.ts  # 修复未使用参数
│   │       └── subscriptions.service.ts  # 添加 disable comment
```

### ⚠️ 关键实现细节

1. **ESLint Disable Comment 规范**：

```typescript
// apps/api/src/demo/demo-seed.service.ts
// eslint-disable-next-line no-restricted-imports -- Demo/seed 脚本允许直接使用 prisma（Epic 10：demo 例外）
import { prisma } from '@cdm/database';
```

```typescript
// apps/api/src/modules/subscriptions/subscriptions.service.ts
// TODO(Story-10.7): 迁移到 plugin-subscriptions 并统一数据访问方式。
// eslint-disable-next-line no-restricted-imports -- 临时例外：Story 10.7 插件化迁移后删除此 prisma 直接访问
import { prisma, type Subscription } from '@cdm/database';
```

2. **`eslint.config.mjs` 规则升级**：

```javascript
// 修改前
'no-restricted-imports': [
    'warn',  // ← 改为 'error'
    ...
]

// 修改后
'no-restricted-imports': [
    'error',  // Story 10.3: 从 warn 升级到 error
    ...
]
```

3. **未使用变量修复**：

```typescript
// data-asset.service.ts:118
// 修改前
} catch (error) {
// 修改后
} catch (error) {
  this.logger.error(
    `Failed to create asset record, rolling back file: ${storedFile.id}`,
    error instanceof Error ? error.stack : String(error),
  );
  // ... rollback + rethrow
}
```

```typescript
// subscription.listener.ts:161  
// 修改前
mindmapId,
// 修改后
_mindmapId,  // 前缀表示有意忽略
```

### 🧪 验证命令

```bash
# 运行 lint 检查（应 0 errors）
cd apps/api && pnpm lint

# 预期输出：0 errors；允许 warnings（例如测试文件的 any）
# ✖ X problems (0 errors, Y warnings)
```

### 🔗 外部依赖检查

**影响分析**：
- `demo-seed.service.ts`: 仅用于开发环境数据填充，无生产影响
- `subscriptions.service.ts`: Story 10.7 会迁移为插件，临时例外合理
- listener / test 文件：不在 `*.service.ts` / `*.controller.ts` glob 范围内，无需处理

### References

- [Source: docs/epics.md#Epic-10] - 范围约束：允许 listener / demo / test / 插件代码例外
- [Source: docs/project-context.md#Repository Pattern] - 架构规范
- [Source: docs/sprint-artifacts/10-2-users-service-repository-compliance.md] - Story 10.2 模式参考
- [Source: apps/api/eslint.config.mjs] - 当前 ESLint 配置
- [Git] `58e5da8` - Story 10.3 完成（ESLint 规则收紧 + 技术债清理）
- [Git] `c14edd8` - Story 10.2 完成（UsersService Repository compliance）
- [Git] `8c4b2da` - Story 10.1 完成（GraphsService Repository compliance）
- [Git] `c6be351` - Story 7.1 引入 Repository 模式 + `no-restricted-imports` 规则
- [Git] `35d7d6b` - Story 3-6：迁移到 ESLint 9 Flat Config
- [ESLint] Disabling Rules（eslint-disable 指令）- https://eslint.org/docs/latest/use/configure/rules#disabling-rules
- [ESLint] Flat Config（新配置系统）- https://eslint.org/docs/latest/use/configure/configuration-files

---

## Verification Plan

### Automated Tests

```bash
# 运行 lint 检查
cd apps/api && pnpm lint

# 预期结果：0 errors，若干 warnings（来自测试文件的 any）
# ✖ X problems (0 errors, Y warnings)

# 运行现有测试确保无回归
pnpm --filter @cdm/api test
```

### Manual Verification

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| 规则生效 | 新建临时 `test.service.ts` 导入 prisma（验证后删除） | ESLint 报 error |
| 例外生效 | 检查 `demo-seed.service.ts` | 有 disable comment，无 error |
| 临时例外 | 检查 `subscriptions.service.ts` | 有 TODO comment 指向 Story 10.7 |
| 未使用变量 | grep `no-unused-vars` lint 输出 | 不再有 data-asset / listener 的 warning |

---

## Risk & Rollback

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 遗漏需要例外的文件 | 🟢 低 | 🟡 中 | 运行完整 lint 扫描 |
| 破坏 CI pipeline | 🟢 低 | 🔴 高 | PR 前验证 lint 通过 |
| 误删必要代码 | 🟢 低 | 🟡 中 | 仅修复明确的 unused 变量 |

---

## Dev Agent Record

### Agent Model Used

Gemini 2.5 (Antigravity) — implementation  
GPT-5.2 (Codex CLI) — code review & doc sync

### Debug Log References

- Lint 验证: `pnpm --filter @cdm/api lint` → 0 errors, 24 warnings (测试文件 `any` 类型)
- Tests: `pnpm --filter @cdm/api test` → 17 suites passed, 147 tests passed

### Completion Notes List

- ✅ Task 1: `no-restricted-imports` 规则从 `warn` 升级到 `error`
- ✅ Task 2: 为 demo-seed.service.ts 和 subscriptions.service.ts 添加 ESLint disable 注释
- ✅ Task 3.1: 修复 data-asset.service.ts 未使用 `error` 变量（添加到日志输出）
- ✅ Task 3.2: 修复 subscription.listener.ts 未使用 `mindmapId` 参数（改为 `_mindmapId`）
- ✅ Task 4: Lint 0 errors 验证通过；注释更新完成
- ✅ Code Review: 对齐 File List（补记 validate-create-story 报告文件），并将 Story 状态标记为 done
- ✅ Code Review: 收敛 `eslint-disable` 到最小范围（`eslint-disable-next-line`），并补齐订阅 listener 的错误日志 stack
- ✅ Code Review Round 2 (2026-01-21): 验证所有 AC 实现；创建 4 个 action items（2 MEDIUM + 2 LOW）；更新 `sprint-status.yaml` 路径格式

### Technical Debt Notes

> **Story 10.7 待处理**：`subscriptions.service.ts` L33 仍有直接 prisma 调用（已有 disable comment），待插件化迁移时统一收敛。

### File List

| File | Action |
|------|--------|
| `apps/api/eslint.config.mjs` | Modified - warn → error + 更新注释 |
| `apps/api/src/demo/demo-seed.service.ts` | Modified - 添加 eslint-disable comment |
| `apps/api/src/modules/subscriptions/subscriptions.service.ts` | Modified - 添加临时 eslint-disable comment |
| `apps/api/src/modules/data-management/data-asset.service.ts` | Modified - 修复未使用变量 |
| `apps/api/src/modules/subscriptions/subscription.listener.ts` | Modified - 修复未使用参数 |
| `docs/sprint-artifacts/10-3-lint-hardening-debt-cleanup.md` | Added - Story 文档 |
| `docs/sprint-artifacts/validation-report-2026-01-21T12-37-37+0800.md` | Added - validate-create-story report |
| `docs/sprint-artifacts/sprint-status.yaml` | Modified - 更新状态 |
