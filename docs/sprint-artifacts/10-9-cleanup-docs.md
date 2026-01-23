# Story 10.9: 删除冗余文件实现 + 文档更新 (Cleanup & Docs)

Status: done

<!-- Note: 本 Story 是 Epic 10 的收尾工作，清理旧实现并更新文档。 -->

## Story

As a **维护者**,
I want **移除旧 `FileService` 等冗余实现并更新文档**,
So that **代码库保持整洁，后续不再误用旧接口。**

## Acceptance Criteria

1. **Given** 已完成文件统一（Story 10.4-10.6）与插件迁移（Story 10.7-10.8）
   **When** 执行清理
   **Then** 旧文件处理实现与死代码被删除或不再被引用

2. **Given** 删除旧模块后
   **When** 运行 `pnpm build` 和 `pnpm test`
   **Then** 构建和测试均通过，无回归

3. **Given** 清理完成后
   **When** 检查文档
   **Then** 更新相关文档/开发指引（含本 Epic 的决策与新 API 入口）

## Tasks / Subtasks

- [x] **Task 1: 分析并确认旧模块无引用** (AC: #1)
  - [x] 1.1 搜索整个代码库确认无其他文件导入 `from './file/` 或 `FileService`（除 deprecated 注释外）
  - [x] 1.2 确认 `apps/api/src/app.module.ts` 已移除 `FileModule` 导入
  - [x] 1.3 确认无其他模块依赖 `FileModule` 或 `FileService`
  - [x] 1.4 记录所有待删除文件清单

- [x] **Task 2: 删除旧 file 模块** (AC: #1, #2)
  - [x] 2.1 删除 `apps/api/src/modules/file/file.service.ts`
  - [x] 2.2 删除 `apps/api/src/modules/file/file.controller.ts`
  - [x] 2.3 删除 `apps/api/src/modules/file/file.module.ts`
  - [x] 2.4 删除 `apps/api/src/modules/file/index.ts`
  - [x] 2.5 删除 `apps/api/src/modules/file/` 目录

- [x] **Task 3: 验证构建和测试** (AC: #2)
  - [x] 3.1 运行 `pnpm lint` 确认无错误（无新增错误，前端遗留警告不影响）
  - [x] 3.2 运行 `pnpm build` 确认构建成功（turbo build 全部通过）
  - [x] 3.3 运行 `pnpm --filter @cdm/api test` 确认 API 测试通过（12 suites, 111 tests PASSED）
  - [x] 3.4 运行 `pnpm test` 确认全量测试通过

- [x] **Task 4: 更新开发文档** (AC: #3)
  - [x] 4.1 更新 `docs/project-context.md` - 添加 FileStorageService 使用说明
  - [x] 4.2 更新 `docs/architecture.md` - 添加统一文件存储模块描述
  - [x] 4.3 在 `docs/analysis/refactoring-proposal-2026-01-20.md` 底部添加完成状态
  - [x] 4.4 创建/更新 API 文档说明新 `/api/files/*` 路由（已在 architecture.md + api-contracts-api.md 更新）

- [x] **Task 5: 更新 Sprint 状态** (AC: #1)
  - [x] 5.1 更新 `sprint-status.yaml` 中 `10-9-cleanup-docs` 状态为 `done`
  - [x] 5.2 确认 Epic 10 是否可标记为完成（Epic 10 全部 Stories done，可标记完成）

---

## Dev Notes

### 🔥 核心目标

**防止 LLM 开发者犯的常见错误**：
- ❌ 删除前未确认无引用：务必搜索确认无其他模块依赖旧 FileService
- ❌ 遗漏相关文件：确保删除整个 `file/` 目录
- ❌ 文档不同步：确保更新所有相关文档

### 🎯 Epic 10 目标与约束（必须遵守）

- **目标**：收敛核心 Service 的 Repository 规范，统一文件处理为 `FileStorageService`，完成插件迁移以降低维护成本与重复实现
- **已决策约束**：
  - ✅ 新增统一 `FileRecord` 模型；**无需迁移历史数据**（上线前清空 uploads + 相关表/目录）
  - ✅ API 路由无需向后兼容（允许调整），**但本 Story 不改动现有 `/api/files/*`**
  - ✅ 暂不做细粒度权限控制（先完成能力统一）
  - ✅ Repository 限制规则仅强制核心 Service/Controller；允许例外：listener / demo / test / 插件代码
  - ✅ 本地磁盘存储路径固定，并按 `graphId` 分层

### 🧩 技术栈与版本约束（防止用错库/版本）

- **Node.js**: >= 22.21.1（Volta 管理）
- **TypeScript**: 5.7.0
- **NestJS**: 11.1.9
- **pnpm**: 10.25.0 / Turborepo 2.6.0
- **数据库**: PostgreSQL 16+ / Prisma

> 本 Story **不升级依赖**、**不引入新库**，仅做清理与文档更新。
> 版本以 `docs/project-context.md` 与各 package.json 为准，不进行外部版本调研或升级。

### 🧱 代码规范要点（若需改动现有模块）

- 使用 Workspace 别名：`@cdm/*`（禁止跨包相对路径）
- 后端遵循 **Repository Pattern**：Service 不直接调用 `prisma.*`
- Controller 仅做 DTO 校验与 Service 调用，不包含业务逻辑
- 保持 ESLint 规则：`no-restricted-imports` 不新增违规

### 🗃️ 数据模型与文件存储约束（避免 schema 误改）

- `FileRecord` 关键字段：`id`, `graphId`, `originalName`, `storedName`, `mimeType`, `size`, `storagePath`, `storageType`, `thumbnailPath?`, `previewable`, `ownerType?`, `ownerId?`, `uploadedBy?`, `createdAt`, `deletedAt?`
- 关系与索引：`graphId` 关联 `Graph`（`onDelete: Cascade`），索引 `graphId` 与 `ownerType+ownerId`
- `FileOwnerType` 枚举：`DELIVERABLE | DATA_ASSET | ATTACHMENT | TEMPLATE`
- 软删除：依赖 `deletedAt`，**不得改为硬删除**
- **禁止**改动 `packages/database/prisma/schema.prisma` 中 `FileRecord` 结构（本 Story 仅清理旧模块）

### 🔐 安全与权限要求

- 保持 `FileStorageAuthGuard` 行为：
  - **生产环境**必须提供 `x-user-id` 或 `Authorization`（上传/删除）
  - **非生产环境**允许请求（开发友好）
- 保持 `graphId` 校验逻辑（上传必填 & 存在校验）
- LocalDiskAdapter 已做路径净化与防路径穿越；**不得弱化/移除**

### ⚡ 性能与稳定性要求

- 保持 `MAX_FILE_SIZE = 10MB` 上传限制（不要擅自放大）
- 缩略图生成失败 **不应阻塞上传**（现有行为）
- 下载/预览/缩略图响应头需保持不变（包含 `Content-Type` / `Content-Disposition` / `Cache-Control`）

### 📦 部署与环境约束

- 本地存储路径：`UPLOAD_DIR` 环境变量（默认 `process.cwd()/uploads`）
- `apps/api/.env` 通过根目录 `.env` 管理（不要在本 Story 调整环境加载逻辑）

### 🧩 集成边界（防止重复实现/耦合）

- 插件侧通过 `FILE_STORAGE_SERVICE` token 注入 `IFileStorageService`（**不要回退**到旧 `FileService`）
- 存储后端通过 `STORAGE_ADAPTER` 注入（LocalDisk 为默认）
- **非目标**：不改动 `file-storage` 模块 API/行为，仅移除旧 `file/` 模块

### 🚫 非目标（防止范围蔓延）

- 不重构 `FileStorageService` / Repository / Controller
- 不修改 `/api/files/*` 现有路由与行为
- 不新增权限策略或细粒度 RBAC
- 不修改 `FileRecord`/迁移历史数据
- 不调整插件注册、依赖方向或其内部实现

### 📁 待删除文件清单

| 文件                                           | 行数 | 状态                                      |
| ---------------------------------------------- | ---- | ----------------------------------------- |
| `apps/api/src/modules/file/file.service.ts`    | 194  | ❌ 已标记 @deprecated，待删除             |
| `apps/api/src/modules/file/file.controller.ts` | ~100 | ❌ 待删除                                 |
| `apps/api/src/modules/file/file.module.ts`     | ~20  | ❌ 待删除                                 |
| `apps/api/src/modules/file/index.ts`           | ~10  | ❌ 待删除                                 |

### ✅ 已确认无引用

根据代码分析：
- `apps/api/src/app.module.ts` - **不再导入** `FileModule`（Story 10.5 已移除）
- 无其他模块从 `./file/` 或 `../file/` 导入
- 插件使用 `FileStorageService` 通过 DI token 注入（不直接依赖旧模块）

### 🧾 Git 变更摘要（用于对齐历史实现）

最近与 `file-storage` 相关的提交（供回溯模式/规范）：
- `ea5c73d` feat(file-storage): Story 10.6 完成 controller tests
- `bc4b10d` feat(file-storage): Story 10.6 Code Review 修复
- `8df7a9c` feat(file-storage): Story 10.6 缩略图/预览增强
- `f96037b` Story 10.5: 迁移调用方到 FileStorageService
- `2d58eef` Story 10.4: 统一文件存储基础设施

变更模式（避免误删/误改）：
- 主要改动集中在 `apps/api/src/modules/file-storage/**` 与 `apps/api/src/app.module.ts`
- 缩略图能力依赖 `sharp`（`^0.34.5`，保持 `apps/api/package.json` 依赖不变）
- 插件侧依赖 `FILE_STORAGE_SERVICE` token（插件目录 `packages/plugins/*`）

### ♻️ 复用点（避免重复实现）

- **统一入口**：`FileStorageService`（上传/下载/预览/删除/缩略图）
- **存储后端**：`StorageAdapter`（LocalDisk；S3/MinIO 为后续扩展）
- **数据访问**：`FileStorageRepository`（不要新建直连 Prisma 的替代实现）

### 🧪 测试策略补充

- 后端测试使用 **Jest**，Service 测试应 Mock Repository（不直连数据库）
- `file-storage` 现有测试：`apps/api/src/modules/file-storage/__tests__/`
- Story 10.8 已补齐 `node-data-link.service.spec.ts` 关键用例（保持覆盖）

### 🏗️ 新统一文件存储架构

```
apps/api/src/modules/file-storage/
├── __tests__/                    # 单元测试
│   └── file-storage.service.spec.ts
├── adapters/                     # 存储适配器
│   ├── local-disk.adapter.ts     # 本地磁盘存储
│   └── storage-adapter.interface.ts
├── constants/
│   └── index.ts
├── constants.ts
├── dto/
│   └── *.ts
├── guards/
│   └── *.ts
├── file-storage.controller.ts    # /api/files/* 路由
├── file-storage.module.ts        # 模块定义
├── file-storage.repository.ts    # 数据访问层
├── file-storage.service.ts       # 核心服务
└── thumbnail.service.ts          # 缩略图生成
```

### 🔗 统一 API 路由

| 功能     | 路由                           | 方法   |
| -------- | ------------------------------ | ------ |
| 上传     | `/api/files/upload`            | POST   |
| 下载     | `/api/files/:id/download`      | GET    |
| 预览     | `/api/files/:id/preview`       | GET    |
| 缩略图   | `/api/files/:id/thumbnail`     | GET    |
| 元数据   | `/api/files/:id`               | GET    |
| 删除     | `/api/files/:id`               | DELETE |

### 📝 文档更新要点

#### project-context.md 新增内容

```markdown
### 文件存储规则 (File Storage Rules)

#### 统一文件存储服务
- **禁止**: 使用旧的 `FileService`（已删除）
- **必须**: 使用 `FileStorageService` 进行所有文件操作
- **API 入口**: `/api/files/*`
- **插件使用**: 通过 `FILE_STORAGE_SERVICE` token 注入

#### 上传规则
- 所有上传必须提供 `graphId`
- 文件按 `graphId` 分层存储
- 缩略图自动生成（图片类型）
```

#### architecture.md 新增章节

```markdown
### 统一文件存储模块

Story 10.4-10.6 引入了统一的文件存储基础设施：

**FileStorageModule** (`apps/api/src/modules/file-storage/`)
- 提供统一的文件上传/下载/预览/缩略图能力
- 使用 Repository 模式访问 `FileRecord` 数据模型
- 支持 StorageAdapter 接口扩展（LocalDisk → S3/MinIO）
- 所有业务模块（审批/数据资源/评论）统一使用此服务
```

### 🧪 验证命令

```bash
# 1. 删除前确认无引用
grep -r "file/file" apps/api/src --include="*.ts" | grep -v ".spec.ts"
grep -r "FileService" apps/api/src --include="*.ts" | grep -v ".spec.ts" | grep -v "@deprecated"

# 2. 删除旧模块
rm -rf apps/api/src/modules/file

# 3. 构建/测试命令见 Verification Plan
```

### References

- [Source: docs/epics.md#Story-10.9] - Story 定义
- [Source: docs/epics.md#Epic-10] - Epic 10 目标与约束
- [Source: docs/analysis/refactoring-proposal-2026-01-20.md] - 重构计划
- [Source: docs/project-context.md] - 技术栈版本与工程规则
- [Source: apps/api/src/modules/file/] - 待删除的旧实现
- [Source: apps/api/src/modules/file-storage/] - 新统一实现
- [Source: apps/api/src/modules/file-storage/file-storage.controller.ts] - /api/files 路由与 Guard
- [Source: apps/api/src/modules/file-storage/guards/file-storage-auth.guard.ts] - 文件权限守卫
- [Source: apps/api/src/modules/file-storage/constants.ts] - MAX_FILE_SIZE 等常量
- [Source: apps/api/src/modules/file-storage/adapters/local-disk.adapter.ts] - 本地存储/安全路径
- [Source: apps/api/src/modules/file-storage/thumbnail.service.ts] - 缩略图生成（sharp）
- [Source: apps/api/package.json] - 依赖版本（sharp 等）
- [Source: packages/database/prisma/schema.prisma] - FileRecord 模型
- [Source: docs/sprint-artifacts/10-8-plugin-data-management-migration.md] - 前置 Story 参考

---

## Previous Story Intelligence

### Story 10.8 完成情况

- ✅ `data-management` 成功迁移至 `packages/plugins/plugin-data-library`
- ✅ 使用 `FILE_STORAGE_SERVICE` token + `IFileStorageService` 接口处理文件依赖
- ✅ `apps/api/src/modules/data-management/` 目录已删除
- ✅ 12 suites, 111 API tests passed

**关键学习**：
- 删除旧模块前确保无其他模块引用
- 使用 DI token 解耦插件与内核模块
- 保持 API 路由不变以确保前端兼容

**Review Follow-ups (2026-01-22)**：
- ✅ `NodeDataLinkService.toAssetResponse()` 修复 storagePath → `/api/files/{fileId}` URL
- ✅ 增加 IMAGE thumbnail 自动补全逻辑
- ✅ 补充 `node-data-link.service.spec.ts` 响应格式测试
- ⏳ **Deferred**：`toAssetResponse()` 在 DataAssetService 与 NodeDataLinkService 重复（非本 Story 目标）
- ⏳ **Deferred**：`user_skill_level` 配置缺失 / 多余 TODO（非本 Story 目标）

**问题与解决**：
- 问题：资源链接返回旧路径 → 解决：统一转为 `/api/files/{fileId}`
- 问题：缩略图信息缺失 → 解决：补充 thumbnail 逻辑与测试

### Epic 10 完成进度

| Story   | 描述                                   | 状态          |
| ------- | -------------------------------------- | ------------- |
| 10.1    | GraphsService Repository 收敛          | ✅ done       |
| 10.2    | UsersService Repository 收敛           | ✅ done       |
| 10.3    | ESLint 规则收紧 + 技术债清理           | ✅ done       |
| 10.4    | 统一文件存储基础设施                   | ✅ done       |
| 10.5    | 迁移现有文件使用方到 FileStorageService | ✅ done       |
| 10.6    | 文件预览增强（缩略图）                 | ✅ done       |
| 10.7    | subscriptions 插件化迁移               | ✅ done       |
| 10.8    | data-management 插件化迁移             | ✅ done       |
| **10.9** | **删除冗余文件实现 + 文档更新**        | ⏳ **本 Story** |

---

## Verification Plan

### Automated Tests

```bash
# Lint（按 repo 约定）
pnpm lint

# 构建验证
pnpm build

# API 单测
pnpm --filter @cdm/api test

# 全量测试
pnpm test
```

### Manual Verification

| 检查项           | 操作                                    | 预期结果                     |
| ---------------- | --------------------------------------- | ---------------------------- |
| 旧模块已删除     | 检查 `apps/api/src/modules/file/`       | 目录不存在                   |
| 无编译错误       | `pnpm build`                            | 构建成功                     |
| API 正常启动     | `pnpm --filter @cdm/api dev`            | 无错误启动                   |
| 文件上传功能     | POST `/api/files/upload`                | 正常工作                     |
| 文档已更新       | 检查 `docs/project-context.md`          | 包含 FileStorageService 说明 |
| 上传/删除权限守卫 | 检查 controller 上 `@UseGuards(FileStorageAuthGuard)` | 仍存在且未弱化 |
| 上传大小限制     | 检查 `MAX_FILE_SIZE` 常量               | 仍为 10MB                   |

---

## Risk & Rollback

| 风险                 | 概率  | 影响  | 缓解                                       |
| -------------------- | ----- | ----- | ------------------------------------------ |
| 遗漏引用导致编译失败 | 🟢 低 | 🟡 中 | 删除前完整搜索确认无引用                   |
| 文档更新不完整       | 🟢 低 | 🟢 低 | 按检查清单逐项更新                         |
| 误删有用代码         | 🟢 低 | 🟡 中 | 仅删除已标记 @deprecated 的模块            |

**回滚策略**：使用 Git 恢复删除的文件（`git checkout HEAD~1 -- apps/api/src/modules/file/`）

---

## Dev Agent Record

### Agent Model Used

Antigravity (Google Deepmind Advanced Agentic Coding)

### Debug Log References

- Lint: `pnpm lint` ✅（0 errors；@cdm/web 仅 warnings）
- Build: `pnpm build` ✅（@cdm/api + @cdm/web 均成功）
- Tests: `pnpm test` ✅（@cdm/api: 12 suites / 111 tests；@cdm/web: 92 files / 958 tests）

### Completion Notes List

- ✅ Verified no external references to FileService/FileModule via grep
- ✅ Deleted `apps/api/src/modules/file/` directory (4 files, ~325 LOC)
- ✅ Monorepo builds and tests pass with no regressions (`pnpm build` / `pnpm test`)
- ✅ Updated docs to reflect unified FileStorageModule + correct `/api/files/*` endpoints
- ✅ Sprint status updated (Story 10.9 done; Epic 10 done)
- ✅ Epic 10 all stories now complete

### File List

**Deleted:**
- `apps/api/src/modules/file/file.service.ts` (194 lines)
- `apps/api/src/modules/file/file.controller.ts` (~100 lines)
- `apps/api/src/modules/file/file.module.ts` (~20 lines)
- `apps/api/src/modules/file/index.ts` (~10 lines)

**Modified:**
- `apps/web/eslint.config.mjs` - Ignore `.playwright-browsers/**` to prevent lint false positives
- `apps/web/types/vtk.d.ts` - Add missing vtk.js module declarations (Geometry profile)
- `apps/web/__tests__/hooks/useDrillDown.test.ts` - Fix X6 mock visibility helpers (isVisible/show/hide)
- `docs/project-context.md` - Added File Storage Rules section
- `docs/architecture.md` - Added Unified File Storage Module section
- `docs/api-contracts-api.md` - Sync `/api/files/*` routes and source controller path
- `docs/feature-specification.md` - Update File module path to `file-storage`
- `docs/analysis/refactoring-proposal-2026-01-20.md` - Added completion status section + checklist sync
- `docs/sprint-artifacts/sprint-status.yaml` - Story 10.9 done + Epic 10 done
- `project_features_checklist.md` - Update File module path to `file-storage`

**Created:**
- `docs/sprint-artifacts/validation-report-2026-01-23T08-14-19+0800.md` - Story validation report (workflow output)

---

## Change Log

| Date       | Change                             |
| ---------- | ---------------------------------- |
| 2026-01-23 | Code review fixes: sync docs + fix web build/test + lint ignores |
| 2026-01-23 | Story 10.9 completed: deleted file/ module, updated docs, epic 10 complete |
| 2026-01-23 | Added constraints/security/perf/test context for cleanup execution |
| 2026-01-23 | Story 10.9 created via create-story workflow |
