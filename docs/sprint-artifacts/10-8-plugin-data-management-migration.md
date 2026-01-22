# Story 10.8: data-management 插件化迁移 (Migrate Data Management to Plugin)

Status: ready-for-dev

<!-- Note: 本 Story 聚焦后端插件化迁移，不涉及前端改造。 -->

## Story

As a **架构师**,
I want **将 `apps/api/src/modules/data-management` 迁移到 `packages/plugins/plugin-data-library`**,
So that **数据资源库能力可独立演进，且边界更清晰。**

## Acceptance Criteria

1. **Given** `data-management` 当前与内核模块存在耦合（含文件上传/链接逻辑）
   **When** 完成迁移
   **Then** DataAsset/Folder/NodeLink 的主要 API 行为不变

2. **Given** 迁移后的 plugin-data-library 包
   **When** `apps/api` 启动时
   **Then** 通过插件方式加载该模块（无循环依赖）

3. **Given** 迁移后的 plugin-data-library 包
   **When** 检查文件上传/下载能力
   **Then** 文件能力对接 `FileStorageService`（通过依赖注入传入）

4. **Given** 迁移后的依赖关系
   **When** 检查代码导入
   **Then** 插件与内核依赖方向清晰（内核不依赖该插件）

## Tasks / Subtasks

- [ ] **Task 1: 创建 Plugin 包结构** (AC: #2, #4)
  - [ ] 1.1 在 `packages/plugins/` 创建 `plugin-data-library` 目录
  - [ ] 1.2 创建 `package.json`（对齐 `plugin-subscriptions`：包含 `exports` 的 `.` 与 `./server`）
  - [ ] 1.3 创建 `tsconfig.json`（对齐 `plugin-subscriptions` 的编译配置：`outDir=dist`, `rootDir=src`, decorators 支持）
  - [ ] 1.4 创建 `jest.config.js`（对齐 `plugin-subscriptions`：`rootDir: 'src'`, `testRegex: '.*\\.spec\\.ts$'`，并设置 `moduleNameMapper`）
  - [ ] 1.5 创建 `src/` 目录结构（对齐现有插件约定）：
    - [ ] `src/index.ts`（导出 `PLUGIN_NAME = 'plugin-data-library'`）
    - [ ] `src/server/index.ts`（导出 `DataLibraryServerModule` 与服务/模块）
    - [ ] `src/server/data-library/*`（Module/Controller/Services/Repositories/DTOs + tests）

- [ ] **Task 2: 迁移 Module/Services/Repositories** (AC: #1, #3)
  - [ ] 2.1 迁移核心文件：
    - [ ] `data-management.module.ts` → `plugin-data-library/src/server/data-library/data-library.module.ts`
    - [ ] `data-asset.controller.ts` → `plugin-data-library/src/server/data-library/data-asset.controller.ts`
    - [ ] `data-asset.service.ts` → `plugin-data-library/src/server/data-library/data-asset.service.ts`
    - [ ] `data-asset.repository.ts` → `plugin-data-library/src/server/data-library/data-asset.repository.ts`
    - [ ] `data-folder.service.ts` → `plugin-data-library/src/server/data-library/data-folder.service.ts`
    - [ ] `data-folder.repository.ts` → `plugin-data-library/src/server/data-library/data-folder.repository.ts`
    - [ ] `node-data-link.service.ts` → `plugin-data-library/src/server/data-library/node-data-link.service.ts`
    - [ ] `node-data-link.repository.ts` → `plugin-data-library/src/server/data-library/node-data-link.repository.ts`
  - [ ] 2.2 迁移辅助文件：
    - [ ] `dto/` 目录 → `plugin-data-library/src/server/data-library/dto/`
    - [ ] `guards/` 目录 → `plugin-data-library/src/server/data-library/guards/`
    - [ ] `utils/` 目录 → `plugin-data-library/src/server/data-library/utils/`
    - [ ] `mock-data.ts` → `plugin-data-library/src/server/data-library/mock-data.ts`
    - [ ] `index.ts` → `plugin-data-library/src/server/data-library/index.ts`
  - [ ] 2.3 调整导入路径：
    - [ ] `@cdm/database` 保持不变
    - [ ] `@cdm/types` 保持不变
    - [ ] `FileOwnerType` 从 `@cdm/database` 引入（禁止再用 `apps/api/src/modules/file-storage/constants`）
    - [ ] **禁止**从 `apps/api/*` 导入任何模块（除了通过 DI 注入）
  - [ ] 2.4 更新 package.json 依赖（对齐 plugin-subscriptions）

- [ ] **Task 3: 处理 FileStorageModule 依赖** (AC: #3, #4)
  - [ ] 3.1 在插件内定义注入 token（如 `FILE_STORAGE_SERVICE`）+ `IFileStorageService` 接口
  - [ ] 3.2 接口定义必要方法（参考 `FileStorageService` 公开 API）：
    - `upload(file, graphId, options)` → `FileRecord`
    - `delete(id)` → `void`
  - [ ] 3.3 URL 规则：`DataAsset.storagePath` 存的是 `FileRecord.id`，对外 URL 为 `/api/files/{id}`（缩略图 `/api/files/{id}/thumbnail`）
  - [ ] 3.4 在 `DataLibraryServerModule.forRoot()` 中接收 `fileStorageServiceClass` 并用 `useExisting` 绑定
  - [ ] 3.5 `DataAssetService` 通过 `@Inject(FILE_STORAGE_SERVICE)` 注入，不直接引用 `FileStorageService` 类
  - [ ] 3.6 移除对 `../file-storage/file-storage.module` 的直接导入

- [ ] **Task 4: 迁移测试文件** (AC: #1)
  - [ ] 4.1 迁移测试文件：
    - [ ] `__tests__/data-asset.controller.spec.ts`
    - [ ] `__tests__/data-asset.repository.spec.ts`
    - [ ] `__tests__/data-asset.service.spec.ts`
    - [ ] `__tests__/data-folder.repository.spec.ts`
    - [ ] `__tests__/format-detection.spec.ts`
    - [ ] `__tests__/node-data-link.service.spec.ts`
  - [ ] 4.2 调整测试导入路径：
    - [ ] `FileStorageService` mock → mock `IFileStorageService`（或直接注入 token provider）
    - [ ] 其余类路径改为插件内相对路径
  - [ ] 4.3 运行测试验证：`pnpm --filter @cdm/plugin-data-library test`

- [ ] **Task 5: 在 apps/api 中通过插件方式加载** (AC: #2)
  - [ ] 5.1 在 `apps/api/package.json` 添加依赖：`"@cdm/plugin-data-library": "workspace:*"`
  - [ ] 5.2 在 `apps/api/src/app.module.ts` 导入 `DataLibraryServerModule`（`@cdm/plugin-data-library/server`）：
    - [ ] `DataLibraryServerModule.forRoot({ imports: [FileStorageModule], fileStorageServiceClass: FileStorageService })`
    - [ ] 从 `app.module.ts` 移除旧的 `DataManagementModule` import
  - [ ] 5.3 在 `apps/api/src/modules/plugin-kernel/kernel-plugin-manager.service.ts` 注册 `plugin-data-library`
  - [ ] 5.4 从 `apps/api/src/modules/` 删除旧 `data-management/` 目录
  - [ ] 5.5 验证无循环依赖（Turbo build 通过）

- [ ] **Task 6: 验证功能完整性** (AC: #1, #2, #3)
  - [ ] 6.1 启动 API 服务：`pnpm --filter @cdm/api dev`
  - [ ] 6.2 测试资产列表：`GET /api/data-assets?graphId=...`
  - [ ] 6.3 测试资产上传：`POST /api/data-assets:upload` (multipart)
  - [ ] 6.4 测试资产详情：`GET /api/data-assets:get?filterByTk=...`
  - [ ] 6.5 测试文件夹操作：`GET /api/data-assets/folders?graphId=...`
  - [ ] 6.6 测试节点链接：`POST /api/data-assets/links`
  - [ ] 6.7 运行完整构建：`pnpm build`
  - [ ] 6.8 运行完整测试：`pnpm test`

- [ ] **Task 7: 更新 Sprint 状态** (AC: #1)
  - [ ] 7.1 更新 `sprint-status.yaml` 中 `10-8-plugin-data-management-migration` 状态为 `done`

---

## Dev Notes

### 🔥 核心目标

**防止 LLM 开发者犯的常见错误**：
- ❌ 破坏循环依赖：插件不能反向依赖 `apps/api` 内核模块
- ❌ 丢失 FileStorageService 功能：上传/下载必须通过 DI token 注入
- ❌ 测试路径错误：确保 Jest 配置正确指向插件包
- ❌ 遗漏 DTO/Guards：确保所有辅助文件都迁移

### 📁 现有实现分析

| 文件 | 位置 | 行数 | 依赖分析 |
|------|------|------|----------|
| `data-management.module.ts` | `apps/api/src/modules/data-management/` | 43 | 依赖 `FileStorageModule` |
| `data-asset.controller.ts` | `apps/api/src/modules/data-management/` | 409 | 依赖 `DataAssetService` |
| `data-asset.service.ts` | `apps/api/src/modules/data-management/` | 473 | 依赖 `FileStorageService`, `*Repository`, `*Service` |
| `data-asset.repository.ts` | `apps/api/src/modules/data-management/` | ~200 | 依赖 `@cdm/database` prisma |
| `data-folder.service.ts` | `apps/api/src/modules/data-management/` | ~120 | 依赖 `DataFolderRepository` |
| `data-folder.repository.ts` | `apps/api/src/modules/data-management/` | ~80 | 依赖 `@cdm/database` prisma |
| `node-data-link.service.ts` | `apps/api/src/modules/data-management/` | ~280 | 依赖 `NodeDataLinkRepository` |
| `node-data-link.repository.ts` | `apps/api/src/modules/data-management/` | ~180 | 依赖 `@cdm/database` prisma |
| `dto/` | `apps/api/src/modules/data-management/dto/` | 12 files | 纯 Zod schemas |
| `guards/` | `apps/api/src/modules/data-management/guards/` | 1 file | Auth guard |
| `utils/` | `apps/api/src/modules/data-management/utils/` | 1 file | Format detection |
| `mock-data.ts` | `apps/api/src/modules/data-management/` | ~180 | Seed service |

**测试文件 (6 个)**：
- `data-asset.controller.spec.ts` (7231 bytes)
- `data-asset.repository.spec.ts` (7632 bytes)
- `data-asset.service.spec.ts` (14902 bytes)
- `data-folder.repository.spec.ts` (1555 bytes)
- `format-detection.spec.ts` (2083 bytes)
- `node-data-link.service.spec.ts` (3428 bytes)

### ⚠️ FileStorageService 依赖处理

**问题**：`DataAssetService` 需要调用 `FileStorageService.upload()` / `.delete()`，但插件不能从 `apps/api/src/modules/file-storage/*` 反向导入。

**推荐方案（对齐 plugin-subscriptions 模式）**：

```typescript
// packages/plugins/plugin-data-library/src/server/data-library/interfaces.ts
export const FILE_STORAGE_SERVICE = 'FILE_STORAGE_SERVICE';

export interface IFileStorageService {
  upload(
    file: Express.Multer.File,
    graphId: string,
    options?: { ownerId?: string; ownerType?: string }
  ): Promise<{ id: string; originalName: string; mimeType: string; size: number; storagePath: string }>;

  delete(id: string): Promise<void>;
}
```

**URL 规则**：`DataAsset.storagePath` 存的是 `FileRecord.id`，对外 URL 为 `/api/files/{id}`（缩略图 `/api/files/{id}/thumbnail`）。  
**注意**：`FileOwnerType` 请使用 `@cdm/database` 导出，避免依赖 `apps/api` 常量。

```typescript
// packages/plugins/plugin-data-library/src/server/index.ts
@Module({})
export class DataLibraryServerModule {
  static forRoot(options: { imports?: any[]; fileStorageServiceClass: any }): DynamicModule {
    return {
      module: DataLibraryServerModule,
      imports: [
        DataLibraryModule.forRoot({
          imports: options.imports,
          fileStorageServiceClass: options.fileStorageServiceClass,
        }),
      ],
      exports: [DataLibraryModule],
    };
  }
}
```

```typescript
// packages/plugins/plugin-data-library/src/server/data-library/data-library.module.ts
@Module({})
export class DataLibraryModule {
  static forRoot(options: { imports?: any[]; fileStorageServiceClass: any }): DynamicModule {
    return {
      module: DataLibraryModule,
      imports: options.imports ?? [],
      controllers: [DataAssetController],
      providers: [
        DataAssetService,
        DataFolderService,
        NodeDataLinkService,
        DataAssetRepository,
        DataFolderRepository,
        NodeDataLinkRepository,
        DataLibrarySeedService,
        DataManagementAuthGuard,
        { provide: FILE_STORAGE_SERVICE, useExisting: options.fileStorageServiceClass },
      ],
      exports: [DataAssetService, DataFolderService, NodeDataLinkService],
    };
  }
}
```

```typescript
// apps/api/src/app.module.ts
import { DataLibraryServerModule } from '@cdm/plugin-data-library/server';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { FileStorageService } from './modules/file-storage/file-storage.service';

@Module({
  imports: [
    // ... other modules
    DataLibraryServerModule.forRoot({
      imports: [FileStorageModule],
      fileStorageServiceClass: FileStorageService,
    }),
  ],
})
export class AppModule {}
```

### 🏗️ 现有插件包结构（参考 plugin-subscriptions）

```
packages/plugins/plugin-subscriptions/
├── package.json          # name: "@cdm/plugin-subscriptions"
├── tsconfig.json         # 编译配置（outDir/rootDir + decorators 支持）
├── jest.config.js        # Jest 配置
└── src/
    ├── index.ts          # 前端入口（PLUGIN_NAME）
    └── server/
        ├── index.ts      # server 入口（导出 *ServerModule + services）
        └── subscriptions/
            ├── subscriptions.module.ts
            ├── subscriptions.service.ts
            ├── subscriptions.repository.ts
            ├── subscriptions.controller.ts
            ├── subscription.listener.ts
            └── __tests__/
                └── *.spec.ts
```

### 🔗 依赖方向（必须遵守）

```
apps/api (内核)
    │
    ├── 依赖 ─→ packages/plugins/plugin-data-library  ✅ 正确
    │
    └── 不被依赖 ←─ packages/plugins/*                 ✅ 正确

plugin-data-library
    │
    ├── 依赖 ─→ @cdm/database                          ✅ 共享包
    ├── 依赖 ─→ @cdm/types                             ✅ 共享包
    ├── 依赖 ─→ @nestjs/common + @nestjs/core + @nestjs/platform-express ✅ 框架包
    │
    └── 禁止依赖 ─→ apps/api/src/modules/*             ❌ 循环依赖!
```

### ✅ API 路由清单（迁移后必须保持）

- 资产列表：`GET /api/data-assets?graphId=...`
- 资产上传：`POST /api/data-assets:upload`
- 资产详情：`GET /api/data-assets:get?filterByTk=...`
- 文件夹树：`GET /api/data-assets/folders?graphId=...`
- 节点链接：`POST /api/data-assets/links`

### 🧪 验证命令

```bash
# 1. 创建插件包后，验证工作区识别
pnpm list --filter @cdm/plugin-data-library

# 2. 运行插件测试
pnpm --filter @cdm/plugin-data-library test

# 3. 验证无循环依赖
pnpm build

# 4. 验证 API 启动
pnpm --filter @cdm/api dev

# 5. 测试资产 API
curl -X GET 'http://localhost:3001/api/data-assets?graphId=test-graph' \
  -H 'x-user-id: test-user'

curl -X GET 'http://localhost:3001/api/data-assets/folders?graphId=test-graph' \
  -H 'x-user-id: test-user'

# 6. 全量 lint + test
pnpm lint
pnpm test
```

### References

- [Source: docs/epics.md#Story-10.8] - Story 定义
- [Source: docs/analysis/refactoring-proposal-2026-01-20.md#Phase-3] - 重构计划
- [Source: apps/api/src/modules/data-management/] - 当前实现
- [Source: packages/plugins/plugin-subscriptions/] - 参考插件结构
- [Source: docs/project-context.md] - 项目规范与约束
- [Source: docs/sprint-artifacts/10-7-plugin-subscriptions-migration.md] - 前置 Story 参考

---

## Previous Story Intelligence

### Story 10.7 完成情况

- ✅ `plugin-subscriptions` 成功迁移至 `packages/plugins/`
- ✅ 使用 `NOTIFICATION_SERVICE` token + `INotificationService` 接口处理内核依赖
- ✅ 使用 `forRoot()` 动态模块配置
- ✅ 17/17 插件测试通过，175/175 API 测试通过

**关键学习**：
- NestJS Module 的动态配置使用 `forRoot()` 静态方法
- 插件依赖内核服务时：通过 Module imports + `useExisting` 绑定注入 token
- 保留 TODO 注释标记后续需要清理的技术债
- 迁移后保持 API 路由不变以确保前端兼容

### 插件迁移先例 (共 6 个)

| 插件 | 位置 | 业务域 |
|------|------|--------|
| `plugin-mindmap-core` | `packages/plugins/` | 节点/边 CRUD |
| `plugin-workflow-approval` | `packages/plugins/` | 审批工作流 |
| `plugin-comments` | `packages/plugins/` | 评论系统 |
| `plugin-template` | `packages/plugins/` | 模板库 |
| `plugin-layout` | `packages/plugins/` | 布局算法 |
| `plugin-subscriptions` | `packages/plugins/` | 订阅机制 |

### Git 历史参考

- `7aec517` - Story 10.7: subscriptions 插件化迁移
- `2d58eef` - Story 10.4/10.5: Unified File Storage (FileStorageService)
- 需要更多上下文时：`git log -- apps/api/src/modules/data-management`

**关键注意事项（来自 10.5/10.6 实际实现）**：
- `FileStorageService.upload(file, graphId, options)` 必须传 `graphId`；`storagePath` 存 `fileId`（不是 URL）。
- 资源对外 URL 由 `storagePath` 拼接：`/api/files/{fileId}`；图片缩略图为 `/api/files/{fileId}/thumbnail`。
- 删除资产需走 `FileStorageService.delete(fileId)`，并保留失败回滚逻辑。

---

## Verification Plan

### Automated Tests

```bash
# Lint（按 repo 约定）
pnpm --filter @cdm/api lint

# 插件自身构建 + 单测
pnpm --filter @cdm/plugin-data-library build
pnpm --filter @cdm/plugin-data-library test

# API 单测（可替代全量）
pnpm --filter @cdm/api test

# 现有测试不能回归（全量）
pnpm test

# 构建验证（确保无循环依赖）
pnpm build
```

### Manual Verification

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| 插件加载 | 启动 API 服务 | 无错误；`/api/data-assets` 路由可用 |
| 资产列表 | GET `/api/data-assets?graphId=...` | 返回资产列表 |
| 资产上传 | POST `/api/data-assets:upload` | 文件上传成功，返回资产信息 |
| 文件夹操作 | GET `/api/data-assets/folders?graphId=...` | 返回文件夹树 |
| 节点链接 | POST `/api/data-assets/links` | 创建节点-资产链接 |
| 循环依赖检查 | `pnpm build` | 构建成功，无循环依赖警告 |

---

## Risk & Rollback

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| FileStorageService 依赖问题 | 🟡 中 | 🔴 高 | 使用 `forRoot()` 动态模块配置，参考 10.7 成功模式 |
| DTO 迁移遗漏 | 🟢 低 | 🟡 中 | 完整复制 `dto/` 目录 |
| 测试路径错误 | 🟡 中 | 🟡 中 | 复制 jest.config.js 并调整 |
| 循环依赖 | 🟡 中 | 🔴 高 | 保持正确的依赖方向；禁止插件依赖内核代码 |
| API 行为变化 | 🟢 低 | 🟡 中 | 迁移时保持路由和响应格式不变 |

**回滚策略**：保留 `apps/api/src/modules/data-management/` 直到验证完成，若失败则在 `app.module.ts` 回退导入。

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Change |
|------|--------|
| 2026-01-22 | Story 10.8 created via create-story workflow |
