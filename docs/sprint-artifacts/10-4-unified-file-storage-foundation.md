# Story 10.4: 统一文件存储基础设施 (Unified File Storage Foundation)

Status: done

## Story

As a **开发者**,
I want **新增 `file-storage` 内核模块与 `FileRecord` 数据模型**,
So that **上传/下载/预览等文件能力有统一入口，且元数据持久化。**

## Acceptance Criteria

1. **Given** 系统存在多套文件处理实现（`FileService`, `DataAssetService`, `AttachmentsController`）
   **When** 引入 `FileStorageModule` 后
   **Then** 具备统一的上传/下载/预览/元数据/删除 API（以 `/api/files/*` 为入口）

2. **Given** 需要上传文件
   **When** 调用上传 API
   **Then** 必须提供 `graphId` 参数，本地磁盘存储按 `graphId` 分层（如 `uploads/{graphId}/{fileId}.ext`）

3. **Given** 需要持久化文件元数据
   **When** 上传文件完成
   **Then** 新增 `FileRecord` 表用于持久化元数据（无需迁移历史数据）

4. **Given** 已上传文件
   **When** 访问下载/预览 API
   **Then** 可正确返回文件内容和元数据

## Tasks / Subtasks

- [x] **Task 1: 创建 Prisma FileRecord 模型** (AC: #3)
  - [x] 1.1 在 `packages/database/prisma/schema.prisma` 新增 `FileRecord` 表
  - [x] 1.2 新增 `StorageType` 和 `FileOwnerType` 枚举
  - [x] 1.3 创建关联索引（graphId, ownerType+ownerId）
  - [x] 1.4 运行 `prisma migrate dev` 生成迁移

- [x] **Task 2: 创建 StorageAdapter 接口与 LocalDiskAdapter** (AC: #2)
  - [x] 2.1 创建 `storage-adapter.interface.ts` 定义 write/read/delete/exists 方法
  - [x] 2.2 实现 `local-disk.adapter.ts`，按 `graphId` 分层存储
  - [x] 2.3 添加路径安全性检查（防止路径穿越）

- [x] **Task 3: 创建 FileStorageRepository** (AC: #3, #4)
  - [x] 3.1 封装 `FileRecord` 的 CRUD 操作
  - [x] 3.2 支持按 graphId/ownerId 查询

- [x] **Task 4: 创建 FileStorageService** (AC: #1, #2, #3, #4)
  - [x] 4.1 实现 `upload(file, graphId, options)` 方法
  - [x] 4.2 实现 `download(fileId)` 方法
  - [x] 4.3 实现 `delete(fileId)` 方法（含磁盘清理）
  - [x] 4.4 实现 `getMetadata(fileId)` 方法
  - [x] 4.5 UTF-8 文件名解码（复用现有逻辑）

- [x] **Task 5: 创建 FileStorageController** (AC: #1)
  - [x] 5.1 `POST /api/files/upload` - 上传（multipart/form-data）
  - [x] 5.2 `GET /api/files/:id/download` - 下载
  - [x] 5.3 `GET /api/files/:id/preview` - 内联预览
  - [x] 5.4 `GET /api/files/:id/metadata` - 获取元数据
  - [x] 5.5 `DELETE /api/files/:id` - 删除文件

- [x] **Task 6: 创建 FileStorageModule** (AC: #1)
  - [x] 6.1 注册 Controller/Service/Repository/Adapter
  - [x] 6.2 导出 FileStorageService 供其他模块使用
  - [x] 6.3 在 `app.module.ts` 中导入

- [x] **Task 7: 验证与测试** (AC: #1, #2, #3, #4)
  - [x] 7.1 编写 Service 单元测试
  - [x] 7.2 手动测试上传/下载/预览/删除
  - [x] 7.3 验证存储路径按 graphId 分层

---

## Dev Notes

### 🔥 核心目标

**防止 LLM 开发者犯的常见错误**：
- ❌ 在 Service 中直接调用 `prisma.*` → 违反 Repository 模式
- ❌ 存储路径不按 graphId 分层 → 文件混乱，无法按项目隔离清理
- ❌ 忘记 UTF-8 文件名解码 → 中文文件名乱码
- ❌ 路径拼接不安全 → 目录穿越漏洞
- ❌ 元数据存内存 Map → 重启后丢失（现有 `FileService` 的问题）

### 🏗️ 现有实现分析

**当前 3 套文件处理实现的问题**：

| 模块 | 位置 | 问题 |
|------|------|------|
| `FileService` | `apps/api/src/modules/file/` | 元数据存内存 Map，重启丢失 |
| `DataAssetService` | `apps/api/src/modules/data-management/` | 复用 FileService + Prisma，耦合复杂 |
| `AttachmentsController` | 评论插件 | 独立实现，IDOR 风险 |

**统一后的优势**：
- ✅ 元数据持久化到 `FileRecord` 表
- ✅ 存储路径按 `graphId` 分层，便于清理
- ✅ 统一 API 入口 `/api/files/*`
- ✅ 可扩展为云存储（StorageAdapter 预留）

### 📁 Project Structure Notes

**创建以下文件结构**：
```
apps/api/src/modules/file-storage/
├── adapters/
│   ├── storage-adapter.interface.ts
│   └── local-disk.adapter.ts
├── file-storage.controller.ts
├── file-storage.service.ts
├── file-storage.repository.ts
├── file-storage.module.ts
└── dto/
    ├── upload-file.dto.ts
    └── file-response.dto.ts
```

### ⚠️ 关键实现细节

#### 1. Prisma Schema (FileRecord)

```prisma
model FileRecord {
  id            String        @id @default(uuid())
  graphId       String
  graph         Graph         @relation(fields: [graphId], references: [id], onDelete: Cascade)
  originalName  String        // 原始文件名 (UTF-8)
  storedName    String        // 存储文件名
  mimeType      String
  size          Int
  storagePath   String
  storageType   StorageType   @default(LOCAL)
  thumbnailPath String?
  previewable   Boolean       @default(false)
  ownerType     FileOwnerType?
  ownerId       String?
  uploadedBy    String?
  createdAt     DateTime      @default(now())
  deletedAt     DateTime?

  @@index([graphId])
  @@index([ownerType, ownerId])
}

enum StorageType {
  LOCAL
  S3
  MINIO
}

enum FileOwnerType {
  DELIVERABLE
  DATA_ASSET
  ATTACHMENT
  TEMPLATE
}
```

#### 2. StorageAdapter 接口

```typescript
// adapters/storage-adapter.interface.ts
export interface StorageAdapter {
  write(path: string, buffer: Buffer): Promise<void>;
  read(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
```

#### 3. LocalDiskAdapter 存储路径

```typescript
// 存储路径格式: uploads/{graphId}/{fileId}.{ext}
private buildPath(graphId: string, fileName: string): string {
  const safeGraphId = this.sanitizePath(graphId);
  return path.join(this.baseDir, safeGraphId, fileName);
}
```

#### 4. Controller API 示例

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(
  @UploadedFile() file: Express.Multer.File,
  @Query('graphId') graphId: string,  // 必需
  @Query('ownerType') ownerType?: FileOwnerType,
  @Query('ownerId') ownerId?: string,
) { ... }
```

### 🧪 验证命令

```bash
# 生成迁移
cd packages/database && pnpm prisma migrate dev --name add-file-record

# 运行 lint
pnpm --filter @cdm/api lint

# 运行测试
pnpm --filter @cdm/api test

# 手动测试上传
curl -X POST 'http://localhost:3001/api/files/upload?graphId=xxx' \
  -F 'file=@test.txt'
```

### 🔗 外部依赖检查

**无新依赖引入** - 使用现有的：
- `fs/promises` - 文件操作
- `nanoid` - 文件 ID 生成
- `@nestjs/platform-express` - multipart 处理

### References

- [Source: docs/epics.md#Story-10.4] - Story 定义
- [Source: docs/analysis/refactoring-proposal-2026-01-20.md#5-文件处理统一化] - 架构设计
- [Source: apps/api/src/modules/file/file.service.ts] - 现有实现参考
- [Source: docs/project-context.md#Repository Pattern] - Repository 规范

---

## Previous Story Intelligence

### Story 10.3 完成情况

- ✅ ESLint `no-restricted-imports` 从 `warn` 升级到 `error`
- ✅ 核心 Service/Controller 禁止直接导入 prisma（有明确例外机制）
- ✅ 例外使用 `eslint-disable-next-line` 最小范围
- **教训**：必须严格遵循 Repository 模式，`FileStorageService` 不能直接调用 prisma

### Git 历史参考

- `ad8fc98` - Story 10.3: ESLint 规则收紧
- `c14edd8` - Story 10.2: UsersService Repository 收敛
- `8c4b2da` - Story 10.1: GraphsService Repository compliance

---

## Verification Plan

### Automated Tests

```bash
# Prisma 迁移验证
cd packages/database && pnpm prisma migrate status

# Lint 检查
pnpm --filter @cdm/api lint

# 单元测试
pnpm --filter @cdm/api test -- --grep "FileStorage"
```

### Manual Verification

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| 上传 API | POST /api/files/upload?graphId=xxx | 返回 FileRecord，文件存储于 `uploads/{graphId}/` |
| 下载 API | GET /api/files/:id/download | 返回文件内容，Content-Disposition 含原始文件名 |
| 预览 API | GET /api/files/:id/preview | 返回文件内容，Content-Disposition: inline |
| 元数据 API | GET /api/files/:id/metadata | 返回 JSON 元数据 |
| 删除 API | DELETE /api/files/:id | 磁盘文件和数据库记录均被删除 |
| graphId 必需 | POST /api/files/upload（无 graphId） | 400 Bad Request |

---

## Risk & Rollback

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 迁移失败导致其他表损坏 | 🟢 低 | 🔴 高 | 先在开发环境验证迁移 |
| 路径穿越漏洞 | 🟡 中 | 🔴 高 | 严格校验 graphId/fileId |
| 现有功能回归 | 🟢 低 | 🟡 中 | 本 Story 仅创建基础设施，不替换现有调用 |

---

## Dev Agent Record

### Agent Model Used

Antigravity (Google DeepMind) - 2026-01-21

### Debug Log References

- Migration `20260121073730_add_file_record` applied successfully
- ESLint: 0 errors, 24 warnings (pre-existing)
- Jest: 13/13 tests passed (Round 2: +2 rollback tests)

### Completion Notes List

- ✅ Task 1: Created FileRecord model with StorageType and FileOwnerType enums. Migration `20260121073730_add_file_record` applied successfully.
- ✅ Task 2: Implemented StorageAdapter interface and LocalDiskAdapter with path traversal protection using `sanitizePath()`.
- ✅ Task 3: Created FileStorageRepository with full CRUD operations using prisma singleton (no PrismaService injection).
- ✅ Task 4: Implemented FileStorageService with upload/download/delete/getMetadata, UTF-8 filename decoding, previewable MIME detection.
- ✅ Task 5: Created FileStorageController with all 5 API endpoints under `/api/files/*`.
- ✅ Task 6: Created FileStorageModule and registered in app.module.ts.
- ✅ Task 7: 13 unit tests pass (Round 2: added rollback tests), lint passes with 0 errors.

### File List

| File | Action |
|------|--------|
| `packages/database/prisma/schema.prisma` | Modified - 新增 FileRecord/StorageType/FileOwnerType；补齐 DataAssetFormat: VTK（迁移漂移） |
| `packages/database/prisma/migrations/20260121073730_add_file_record/` | New - 迁移（FileRecord + DataAssetFormat.VTK） |
| `packages/database/src/index.ts` | Modified - 导出 FileRecord, FileOwnerType, StorageType |
| `apps/api/src/modules/file-storage/adapters/storage-adapter.interface.ts` | New |
| `apps/api/src/modules/file-storage/adapters/local-disk.adapter.ts` | New - 本地存储适配器（review: 前缀校验更严格） |
| `apps/api/src/modules/file-storage/constants/previewable-types.ts` | New - 共享 PREVIEWABLE_MIME_TYPES 常量（Round 2 review） |
| `apps/api/src/modules/file-storage/file-storage.repository.ts` | New - Repository（review: 支持显式 id + 不吞错） |
| `apps/api/src/modules/file-storage/file-storage.service.ts` | New - Service（review: graphId 存在校验 + DB/磁盘回滚；Round 2: 使用共享常量） |
| `apps/api/src/modules/file-storage/file-storage.controller.ts` | New - `/api/files/*`（review: 修复路由前缀 + legacy 兼容；Round 2: 使用共享常量） |
| `apps/api/src/modules/file-storage/file-storage.module.ts` | New - Module（review: 引入 Multer memoryStorage + FileModule/GraphsModule） |
| `apps/api/src/modules/file-storage/guards/file-storage-auth.guard.ts` | New - upload/delete 在 prod 要求 header |
| `apps/api/src/modules/file-storage/dto/upload-file.dto.ts` | New - DTO 校验（review: IsEnum(FileOwnerType) + graphId 非空） |
| `apps/api/src/modules/file-storage/dto/file-response.dto.ts` | New |
| `apps/api/src/modules/file-storage/__tests__/file-storage.service.spec.ts` | New - 13 tests（Round 2: +2 rollback tests） |
| `apps/api/src/modules/file/file.module.ts` | Modified - 移除 FileController，保留 FileService 供 legacy 调用 |
| `apps/api/src/app.module.ts` | Modified - 导入 FileStorageModule（review: 更新备注） |
| `apps/web/hooks/useApproval.ts` | Modified - 上传补齐 graphId + owner 元信息 + x-user-id |
| `apps/web/hooks/__tests__/useApproval.spec.ts` | Modified - mock graphId（适配上传参数） |
| `docs/sprint-artifacts/sprint-status.yaml` | Modified - 更新状态 |
| `docs/sprint-artifacts/10-4-unified-file-storage-foundation.md` | New - Story 文档（review: 补充代码审查记录） |

---

## Senior Developer Review (AI)

### Summary

- 结论：**Changes Requested → 已修复并通过后端测试**
- AC 覆盖：AC#1~#4 已验证（含 `/api/files/*`、graphId 分层、FileRecord 持久化、下载/预览/元数据/删除）

### Round 1 Findings（已修复）

#### 🔴 HIGH

1. **路由前缀错误导致 AC#1 直接失败**：全局 `app.setGlobalPrefix('api')` + Controller 再写 `api/files` 会变成 `/api/api/files/*`
2. **前端上传未携带 graphId → 新接口必然 400**：审批交付物上传调用 `/api/files/upload` 没有 `graphId`
3. **缺少上传大小限制/校验**：memory upload 无上限，存在 OOM/DoS 风险
4. **写磁盘→写 DB 无回滚**：DB 失败会遗留孤儿文件；graphId 不存在会触发 Prisma 外键失败 → 500
5. **删除缺少一致性策略**：DB/磁盘任一失败会产生"记录删了但文件还在/文件删了但记录还活着"的不一致

#### 🟡 MEDIUM

6. **Query 未走 DTO 校验**：`ownerType` 传错会在 Prisma 层炸 500
7. **路径穿越校验边界不严谨**：`startsWith(base)` 缺少分隔符边界（虽然 sanitize 已挡大部分）
8. **Story File List 与 git reality 不一致**：Story 文档未跟踪（`??`），且存在无关临时产物（已清理）

### Round 1 Fixes Applied（自动修复）

- API 路由：统一为 `@Controller('files')` → 实际路径 `/api/files/*`（同时保留 legacy `/api/files/:id` 下载兼容）
- 上传：强制 `graphId`（DTO + Service）、加 `MAX_FILE_SIZE=10MB` 限制、`ownerType/ownerId` DTO 校验
- 稳定性：upload 增加 graph 存在校验 + DB 失败时删除已写入文件（回滚）；delete 增加失败回滚 `deletedAt`
- 安全：LocalDiskAdapter 前缀校验改为 `resolve + basePrefix`；upload/delete 在 prod 需要 `x-user-id`/`Authorization`
- 前端：审批交付物上传补齐 `graphId` + `ownerType=DELIVERABLE` + `ownerId=nodeId` + `x-user-id`

### Round 2 Findings（2026-01-21）

#### 🔴 CRITICAL
1. **所有更改未提交到 Git**：git status 显示 7 个 Modified 文件 + 3 个 Untracked 目录

#### 🔴 HIGH
2. **Story 文档测试数量不一致**：Story 声称 "10/10 tests passed"，实际为 11 tests（Round 2 后为 13）

#### 🟡 MEDIUM
3. **缺少回滚逻辑测试**：upload DB 失败和 delete storage 失败的回滚无测试覆盖

#### 🟢 LOW
4. **PREVIEWABLE_MIME_TYPES 重复定义**：Service 和 Controller 各有一份相同的 Set

### Round 2 Fixes Applied（自动修复）

- 新增 `constants/previewable-types.ts` 共享常量模块
- Service/Controller 改为使用共享 `isPreviewableMimeType()` 函数
- 新增 2 个回滚测试（upload DB 失败 + delete storage 失败）
- 修正 Story 文档测试数量：13/13 tests passed
- Git 提交所有更改

### Verification

- `pnpm --filter @cdm/api test` ✅ 13/13 tests passed (file-storage module)
- `pnpm --filter @cdm/api lint` ✅ 0 errors / 24 warnings（既有告警）

### Change Log

| Date | Change |
|------|--------|
| 2026-01-21 | Story 10.4 implementation complete: FileStorageModule with unified file storage API |
| 2026-01-21 | Senior code review Round 1: fixed `/api/files` routing, graphId enforcement, validation, rollback, and web upload integration |
| 2026-01-21 | Senior code review Round 2: consolidated duplicate constants, added rollback tests, committed all changes (`ae9e904`) |

