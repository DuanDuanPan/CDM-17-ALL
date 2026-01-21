# Story 10.5: 迁移现有文件使用方到 FileStorageService (Migrate Callers to Unified Storage)

Status: done

## Story

As a **开发者**,
I want **将审批交付物 / 数据资源 / 评论附件的文件读写统一迁移到 `FileStorageService`**,
So that **删除重复实现，消除不一致的 MIME 校验/路径生成/文件名解码逻辑。**

## Acceptance Criteria

1. **Given** `FileService`、`DataAssetService`、`AttachmentsController` 各自实现上传/下载
   **When** 完成迁移
   **Then** 这三处不再各自写磁盘/生成路径（统一走 `FileStorageService`）

2. **Given** API 路由可以调整
   **When** 完成迁移
   **Then** 允许调整 API 路由与前端调用方（无需兼容旧路径）

3. **Given** 旧实现存在
   **When** 完成迁移
   **Then** 旧实现被标记可删除或已删除（以实际代码为准）

## Tasks / Subtasks

- [x] **Task 0: 兼容性与依赖环（必须先定）** (AC: #2, #3)
  - [x] 0.1 **明确决策**：按 Epic 10 约束 **不保证历史文件可用**（上线前清空 uploads + 相关表），因此 **移除** `/api/files/*` 中对 Legacy `FileService` 的 fallback（避免引入 `FileStorageModule` ↔ `FileModule` 循环依赖）
  - [x] 0.2 修改 `FileStorageController`：删除 `legacyFileService` 注入与 fallback 分支（不再扫描磁盘/内存 Map）
  - [x] 0.3 修改 `FileStorageModule`：移除 `FileModule` import（否则 Task 1/2/3 会很容易踩到 DI 循环）

- [x] **Task 1: FileService / FileModule 退役（或最小化包装）** (AC: #1, #3)
  - [x] 1.1 全量搜 `FileService` 引用：迁移调用方到 `FileStorageService` 后应无剩余引用
  - [x] 1.2 从 `AppModule` 移除 `FileModule`（DataAssetService/AttachmentsController 已迁移）
  - [x] 1.3 `FileService` 保留为历史代码，不再被引用

- [x] **Task 2: DataAssetService 迁移** (AC: #1)
  - [x] 2.1 修改 `uploadAsset()`：使用 `FileStorageService.upload(file, graphId, { ownerType: DATA_ASSET, ownerId: assetId })` 代替 `FileService.storeFile()`
  - [x] 2.2 **存储契约（必须写清）**：`DataAsset.storagePath` 在 DB 中存储 `FileRecord.id`（fileId），不再存 `/api/files/...` 字符串
  - [x] 2.3 **对外契约（避免前端大面积破坏）**：API 返回 `DataAsset.storagePath` 时，统一映射为可访问 URL：`/api/files/{fileId}`（由 Service 的 response mapper 生成）
  - [x] 2.4 修改 `hardDeleteAsset()` / `emptyTrash()`：直接把 `storagePath` 视为 `fileId`，调用 `FileStorageService.delete(fileId)`（不再 parse URL）
  - [x] 2.5 更新 `DataManagementModule`：用 `FileStorageModule` 替换 `FileModule`
  - [x] 2.6 更新单测：`apps/api/src/modules/data-management/__tests__/data-asset.service.spec.ts`（mock `FileStorageService`，并调整对 `storagePath` 持久化/返回值的断言）

- [x] **Task 3: AttachmentsController 迁移** (AC: #1, #2)
  - [x] 3.1 **Kernel Wiring**：在 `apps/api/src/app.module.ts` 将 `CommentsServerModule.register()` 改为 `CommentsServerModule.forRoot({ imports: [FileStorageModule] })`，保证插件 Controller 可注入 `FileStorageService`
  - [x] 3.2 修改 `AttachmentsController`：注入 `FileStorageService`，移除 `diskStorage`/`UPLOAD_DIR`/本地 `fs` 流程，改为 `memoryStorage()`（需要 `file.buffer`）
  - [x] 3.3 **保留现有约束**：保持 `MAX_FILE_SIZE=10MB` + `ALLOWED_MIME_TYPES` 校验（可迁移为共享常量，但不要放宽）
  - [x] 3.4 修改 `upload()`（新增必需 `graphId`）：**先建 Attachment 记录拿到 `attachmentId`** → `fileStorageService.upload(file, graphId, { ownerType: ATTACHMENT, ownerId: attachmentId, uploadedBy: userId })` → 更新 Attachment.storagePath=`fileId`（需要给 `AttachmentsRepository` 增加 update 方法）；失败要回滚（删除 attachment 或 file）
  - [x] 3.5 修改 `download()`：把 Attachment.storagePath 作为 `fileId`，调用 `FileStorageService.download(fileId)` 并设置 headers（图片 inline / 其他 attachment）
  - [x] 3.6 修改 `delete()`：先鉴权 uploader，再 `FileStorageService.delete(fileId)`，最后删除 Attachment 记录
  - [x] 3.7 清理：删除 `uploads/comments` 写入逻辑，确保不再产生新文件

- [x] **Task 4: 前端调用方适配** (AC: #2)
  - [x] 4.1 审批交付物上传：确认已在 10.4 完成适配（`useApproval.ts` 已携带 graphId）
  - [x] 4.2 数据资源上传：确认 `apps/web/features/data-library/hooks/useDataUpload.ts` 已通过 formData 携带 graphId（若后端路由变更，再同步改 `uploadDataAsset`）
  - [x] 4.3 评论附件上传：更新 `apps/web/hooks/useAttachmentUpload.ts` 追加 `graphId` query（来源：`useGraphContextOptional().graphId`）
  - [x] 4.4 更新 Next.js 代理路由 `apps/web/app/api/comments/attachments/upload/route.ts`：将请求的 `graphId` 透传到后端 `/api/comments/attachments/upload?graphId=...`

- [x] **Task 5: 清理与测试** (AC: #3)
  - [x] 5.1 删除或标记废弃 `FileService` 中的直接磁盘操作代码
  - [x] 5.2 删除 `AttachmentsController` 中的 `uploads/comments` 目录逻辑
  - [x] 5.3 确保 lint 通过：`pnpm --filter @cdm/api lint` + `pnpm --filter @cdm/web lint`
  - [x] 5.4 确保现有 E2E/UT 不回归：18 test suites, 161 tests passed
  - [x] 5.5 验证文件存储路径统一为 `uploads/{graphId}/`

- [x] **Review Follow-ups (AI)** - Code Review 2026-01-21
  - [x] [AI-Review][HIGH] 添加 AttachmentsController 单元测试 [`attachments.controller.ts`]
  - [x] [AI-Review][HIGH] 替换 console.warn 为 NestJS Logger [`attachments.controller.ts:181,266`]
  - [x] [AI-Review][HIGH] 修复错误消息传播不一致 [`route.ts:45-47`, `useAttachmentUpload.ts:104`]
  - [ ] [AI-Review][HIGH] 添加评论附件上传 E2E 测试 (需要后续 Story)
  - [x] [AI-Review][MEDIUM] 增强错误日志包含原始错误信息 [`data-asset.service.ts`, `attachments.controller.ts`]
  - [x] [AI-Review][MEDIUM] 考虑移除 @Optional() 以在启动时发现配置错误 [`attachments.controller.ts:90-91`]
  - [x] [AI-Review][MEDIUM] FileOwnerType 类型安全改进 [`data-asset.service.ts:16,45`]
  - [x] [AI-Review][LOW] 清理 FileService 废弃实现 [`file.service.ts`]
  - [x] [AI-Review][LOW] 文件头注释补充 Story 编号 [`CommentInput.tsx`, `CommentPanel.tsx`, `CommentsPanelContent.tsx`]
  - [x] [AI-Review][LOW] 提取 MAX_FILE_SIZE 为共享常量 [`attachments.controller.ts`, `file-storage.controller.ts`]

---

## Dev Notes

### 🔥 核心目标

**防止 LLM 开发者犯的常见错误**：
- ❌ 忘记传递 `graphId` → 新 API 会 400 失败
- ❌ 保留旧的直接磁盘操作 → 双写导致不一致
- ❌ 不更新前端调用 → 旧 API 路径 404
- ❌ 混用 `FileService` 和 `FileStorageService` → 文件元数据丢失

### 📁 现有实现分析（需迁移）

| 模块                    | 位置                                                             | 问题                                               |
| ----------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| `FileService`           | `apps/api/src/modules/file/file.service.ts`                      | 元数据存内存 Map，重启丢失；无 graphId 分层        |
| `DataAssetService`      | `apps/api/src/modules/data-management/data-asset.service.ts`     | 调用 FileService，间接受影响                       |
| `AttachmentsController` | `packages/plugins/plugin-comments/.../attachments.controller.ts` | 独立磁盘存储到 `uploads/comments`，无 graphId 分层 |

### 🏗️ Story 10.4 已创建的基础设施

**`FileStorageService` 已提供的 API**：

| 方法                             | 参数                                                                                 | 返回值             | 说明                  |
| -------------------------------- | ------------------------------------------------------------------------------------ | ------------------ | --------------------- |
| `upload(file, graphId, options)` | `file: Multer.File`, `graphId: string`, `options?: {ownerType, ownerId, uploadedBy}` | `FileMetadataDto`  | 上传并持久化元数据    |
| `download(fileId)`               | `fileId: string`                                                                     | `{buffer, record}` | 下载文件内容 + 记录   |
| `delete(fileId)`                 | `fileId: string`                                                                     | `void`             | 删除磁盘 + 数据库记录 |
| `getMetadata(fileId)`            | `fileId: string`                                                                     | `FileMetadataDto`  | 仅获取元数据          |

### ✅ 迁移契约（防止误解）

- **DB 存储**
  - `FileRecord.storagePath`：`{graphId}/{fileId}.{ext}`（物理落盘：`uploads/{graphId}/...`）
  - `DataAsset.storagePath`：存 `fileId`（`FileRecord.id`），**不再**存 `/api/files/...`
  - `CommentAttachment.storagePath`：存 `fileId`（`FileRecord.id`），**不再**存 `uploads/comments/...`
- **API/前端可访问路径**
  - DataAsset 对外 `storagePath`：仍返回 `/api/files/{fileId}`（由后端 mapper 统一生成）
  - 评论附件下载 URL：仍为 `/api/comments/attachments/{attachmentId}`（由附件 Controller 提供）

### ⚠️ 关键迁移细节

#### 1. FileService 迁移示例

```typescript
// BEFORE (直接磁盘操作)
async storeFile(file: Express.Multer.File): Promise<FileMetadata> {
    const fileId = nanoid();
    const filePath = path.join(this.uploadDir, fileName);
    await fs.promises.writeFile(filePath, file.buffer);
    this.fileMetadata.set(fileId, storedFile); // 内存存储!
}

// AFTER (委托给 FileStorageService)
async storeFile(file: Express.Multer.File, graphId: string): Promise<FileMetadata> {
    const record = await this.fileStorageService.upload(file, graphId, {
        ownerType: FileOwnerType.DELIVERABLE,
    });
    return {
        id: record.id,
        originalName: record.originalName,
        mimeType: record.mimeType,
        size: record.size,
        uploadedAt: record.createdAt.toISOString(),
    };
}
```

#### 2. DataAssetService 迁移示例

```typescript
// BEFORE
async uploadAsset(file: Multer.File, graphId: string, folderId?: string): Promise<DataAsset> {
    const stored = await this.fileService.storeFile(file);
    const storagePath = `/api/files/${stored.id}`;
    const asset = await this.assetRepo.create({ ... , storagePath });
}

// AFTER
async uploadAsset(file: Multer.File, graphId: string, folderId?: string): Promise<DataAsset> {
    // 先创建 asset 获取 ID（storagePath 先留空），再上传文件设置 ownerId
    const asset = await this.assetRepo.create({ ... , storagePath: null });
    const uploaded = await this.fileStorageService.upload(file, graphId, {
        ownerType: FileOwnerType.DATA_ASSET,
        ownerId: asset.id,
    });
    await this.assetRepo.update(asset.id, { storagePath: uploaded.id }); // DB 存 fileId

    // 对外返回仍建议映射为可访问 URL（避免前端大面积破坏）
    return { ...asset, storagePath: `/api/files/${uploaded.id}` };
}
```

#### 3. AttachmentsController 关键变更

```typescript
// BEFORE (独立磁盘存储)
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'comments');
const storage = diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    ...
});

// AFTER (使用 FileStorageService)
@Post('upload')
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('graphId') graphId: string,  // 新增必需参数！
    @Headers('x-user-id') userId?: string
) {
    const attachment = await this.attachmentsRepository.create({ ... , storagePath: 'PENDING' });
    const uploaded = await this.fileStorageService.upload(file, graphId, {
        ownerType: FileOwnerType.ATTACHMENT,
        ownerId: attachment.id,
        uploadedBy: userId,
    });
    await this.attachmentsRepository.update(attachment.id, { storagePath: uploaded.id });
}
```

### 🔗 前端调用方清单

| 功能       | 位置                                                                                              | graphId 来源                        | 状态             |
| ---------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------- |
| 审批交付物 | `apps/web/hooks/useApproval.ts`                                                                   | `useGraphContextOptional()`         | ✅ 10.4 已适配    |
| 数据资源   | `apps/web/features/data-library/hooks/useDataUpload.ts`                                           | 调用方传入（通常来自 GraphContext） | ✅ 已携带 graphId |
| 评论附件   | `apps/web/hooks/useAttachmentUpload.ts` + `apps/web/app/api/comments/attachments/upload/route.ts` | `useGraphContextOptional()`         | ❗ 需补齐 graphId |

### 🧪 验证命令

```bash
# Lint 检查
pnpm --filter @cdm/api lint

# 单元测试
pnpm --filter @cdm/api test

# E2E 测试（数据资源上传主流程）
pnpm --filter @cdm/web test:e2e -- e2e/data-upload-node-linking.spec.ts

# 手动验证：评论附件上传
curl -X POST 'http://localhost:3001/api/comments/attachments/upload?graphId=xxx' \
  -H 'x-user-id: test-user' \
  -F 'file=@test.txt'
```

### References

- [Source: docs/epics.md#Story-10.5] - Story 定义
- [Source: docs/sprint-artifacts/10-4-unified-file-storage-foundation.md] - 基础设施与 API
- [Source: apps/api/src/modules/file-storage/file-storage.service.ts] - FileStorageService API（返回值/回滚/graphId 校验）
- [Source: apps/api/src/modules/file-storage/file-storage.controller.ts] - `/api/files/*`（Task 0: 移除 legacy fallback）
- [Source: apps/api/src/modules/file-storage/file-storage.module.ts] - Module imports（避免 `FileModule` 循环依赖）
- [Source: apps/api/src/app.module.ts] - Kernel 注入 plugin-comments（Task 3.1）
- [Source: apps/api/src/modules/file/file.service.ts] - 待退役/最小化的 FileService（若仍保留）
- [Source: apps/api/src/modules/data-management/data-asset.service.ts] - 待迁移的 DataAssetService
- [Source: apps/api/src/modules/data-management/__tests__/data-asset.service.spec.ts] - 需更新的单测断言
- [Source: packages/plugins/plugin-comments/src/server/comments/attachments.controller.ts] - 待迁移的 AttachmentsController
- [Source: packages/plugins/plugin-comments/src/server/comments/attachments.repository.ts] - 需扩展 update 方法
- [Source: apps/web/hooks/useAttachmentUpload.ts] - 评论附件上传（Task 4.3）
- [Source: apps/web/app/api/comments/attachments/upload/route.ts] - Next.js 代理透传 graphId（Task 4.4）
- [Source: apps/web/features/data-library/hooks/useDataUpload.ts] - 数据资源上传已携带 graphId（Task 4.2）
- [Source: docs/project-context.md#Repository Pattern] - Repository 规范

---

## Previous Story Intelligence

### Story 10.4 完成情况

- ✅ `FileStorageModule` 已创建并注册
- ✅ `FileRecord` 表已迁移
- ✅ `FileStorageService` 提供 upload/download/delete/getMetadata API
- ✅ 存储路径格式为 `uploads/{graphId}/{fileId}.{ext}`
- ✅ 前端审批交付物上传已携带 `graphId`
- **关键学习**：
  - DB 失败时需回滚已写入的磁盘文件
  - `graphId` 必须有效（外键约束）
  - 上传/删除需要 `x-user-id` header（生产环境）

### Git 历史参考

- `2d58eeffe10e55f624e9387713c7e075b0221c22` - Story 10.4: Unified File Storage Foundation
- 前序提交可参考 10.1-10.3 的 Repository 收敛模式

---

## Verification Plan

### Automated Tests

```bash
# Lint 检查
pnpm --filter @cdm/api lint
pnpm --filter @cdm/web lint

# 现有测试不能回归
pnpm --filter @cdm/api test
pnpm --filter @cdm/web test

# Playwright E2E（覆盖数据资源上传主流程）
pnpm --filter @cdm/web test:e2e -- e2e/data-upload-node-linking.spec.ts
```

### Manual Verification

| 检查项           | 操作                          | 预期结果                                                                                                            |
| ---------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 审批交付物上传   | 在审批面板上传文件            | 文件存储到 `uploads/{graphId}/`，可正常下载                                                                         |
| 数据资源上传     | 在数据资源库上传文件          | 文件存储到 `uploads/{graphId}/`；DB 中 DataAsset.storagePath=FileRecord.id；API/前端仍可通过 `/api/files/{id}` 访问 |
| 评论附件上传     | 在评论中上传附件              | 文件存储到 `uploads/{graphId}/`（非 `uploads/comments/`）                                                           |
| FileService 废弃 | 检查 FileService.fileMetadata | 应不再使用内存 Map 存储                                                                                             |
| 旧路径清理       | 检查 `uploads/comments/` 目录 | 不应有新文件写入                                                                                                    |

---

## Risk & Rollback

| 风险                            | 概率 | 影响 | 缓解                                                                |
| ------------------------------- | ---- | ---- | ------------------------------------------------------------------- |
| 前端遗漏 graphId 导致 400       | 🟡 中 | 🟡 中 | 全面检查调用方，先在 dev 环境测试                                   |
| 插件 DI 注入失败                | 🟡 中 | 🔴 高 | 按 Task 3.1 在 Kernel 注入 `FileStorageModule`                      |
| comments 文件迁移影响现有功能   | 🟡 中 | 🟡 中 | 保持 Attachment 表结构，仅变更 storagePath 含义；保持 MIME/大小校验 |
| FileStorage/FileModule 循环依赖 | 🟢 低 | 🔴 高 | 按 Task 0 先移除 legacy fallback 与 `FileModule` import             |
| 旧文件无法访问                  | 🟢 低 | 🟡 中 | Epic 10 约束：忽略历史数据，上线前清空                              |

---

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI) - 2026-01-21

### Debug Log References

- ESLint (api): 0 errors, 25 warnings
- Jest (api): 18/18 test suites, 161 tests passed
- ESLint (web): 0 errors, 89 warnings
- Vitest (web): 当前存在 9 个失败用例（`useDrillDown`：`node.isVisible is not a function`），与本 Story 变更无直接关联（未触达对应文件）

### Completion Notes List

- ✅ AC#1：`DataAssetService` / `AttachmentsController` 统一走 `FileStorageService`，不再直接写磁盘/生成路径
- ✅ AC#2：评论附件上传链路补齐 `graphId`（web hook → Next.js proxy → api controller）
- ✅ AC#3：移除 legacy fallback 与 `FileModule` 依赖，`FileService` 保留为历史代码但不再被引用
- ✅ Task 5.1：`FileService` 标记废弃（仅历史代码保留，避免误用）
- ✅ Review Fix：补齐“上传成功但 DB update 失败”场景的回滚（删除已上传文件，避免 orphan）
- ✅ Review Fix：Next.js 代理路由对非 JSON 错误响应做兼容，避免吞掉后端错误

### File List

| File                                                                             | Action                                                                                                          |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/app.module.ts`                                                     | Modified - CommentsServerModule.forRoot 注入 FileStorageModule；移除 legacy FileModule                          |
| `apps/api/src/modules/file-storage/file-storage.controller.ts`                   | Modified - 移除 legacy fallback；统一下载/预览/删除走 FileStorageService                                        |
| `apps/api/src/modules/file-storage/file-storage.module.ts`                       | Modified - 移除 FileModule import，避免循环依赖                                                                 |
| `apps/api/src/modules/file-storage/constants.ts`                                 | New - [Review Fix] 共享常量 MAX_FILE_SIZE、FileOwnerType                                                        |
| `apps/api/src/modules/data-management/data-management.module.ts`                 | Modified - 用 FileStorageModule 替换 FileModule                                                                 |
| `apps/api/src/modules/data-management/data-asset.service.ts`                     | Modified - DataAsset upload/delete 走 FileStorageService；[Review Fix] 增强错误信息、类型安全改进               |
| `apps/api/src/modules/data-management/__tests__/data-asset.service.spec.ts`      | Modified - 更新断言（storagePath 语义）；新增"update 失败回滚删除文件"用例                                      |
| `apps/api/src/modules/file/file.service.ts`                                      | Modified - 标记为 @deprecated（Story 10.5 起不再引用）                                                          |
| `packages/plugins/plugin-comments/src/server/comments/attachments.controller.ts` | Modified - 迁移到 FileStorageService；[Review Fix] 添加 NestJS Logger、增强错误信息                             |
| `packages/plugins/plugin-comments/src/server/comments/attachments.repository.ts` | Modified - 增加 update() 以写回 storagePath(fileId)                                                             |
| `packages/plugins/plugin-comments/src/server/comments/comments.module.ts`        | Modified - 动态注入 FILE_STORAGE_SERVICE token（清理未使用 import）                                             |
| `packages/plugins/plugin-comments/src/server/index.ts`                           | Modified - CommentsServerModule.forRoot 透传 FileStorageModule 与 FileStorageService class（清理未使用 import） |
| `apps/web/hooks/useAttachmentUpload.ts`                                          | Modified - 上传 URL 追加 graphId query；[Review Fix] 改进错误解析逻辑                                           |
| `apps/web/app/api/comments/attachments/upload/route.ts`                          | Modified - 透传 graphId；兼容非 JSON 错误响应                                                                   |
| `apps/web/components/Comments/CommentInput.tsx`                                  | Modified - 透传 graphId 到上传 hook；[Review Fix] 补充 Story 10.5 注释                                          |
| `apps/web/components/Comments/CommentPanel.tsx`                                  | Modified - 透传 mindmapId 作为 graphId；[Review Fix] 补充 Story 10.5 注释                                       |
| `apps/web/components/layout/panels/CommentsPanelContent.tsx`                     | Modified - 透传 mindmapId 作为 graphId；[Review Fix] 补充 Story 10.5 注释                                       |
| `packages/database/prisma/seed.ts`                                               | Modified - seed 显式加载根目录 `.env`                                                                           |
| `docs/sprint-artifacts/sprint-status.yaml`                                       | Modified - 10-5 状态更新                                                                                        |
| `docs/sprint-artifacts/10-5-migrate-callers-to-file-storage.md`                  | Modified - Story 文档（补齐 Dev Agent Record + Review Follow-ups）                                              |
| `docs/sprint-artifacts/validation-report-2026-01-21T19-40-23+0800.md`            | New - 自动验证报告（生成产物）                                                                                  |
