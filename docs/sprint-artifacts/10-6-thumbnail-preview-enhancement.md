# Story 10.6: 文件预览增强（缩略图）(Thumbnail/Preview Enhancement)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **用户**,
I want **对可预览文件提供统一的 preview/thumbnail 能力**,
So that **在数据资源库/评论/交付物场景中有一致的预览体验。**

## Acceptance Criteria

1. **Given** 文件已通过 `FileStorageService` 上传
   **When** 访问 preview/thumbnail 接口
   **Then** 可返回可用的内联预览响应（图片/文本/部分文档按策略）

2. **Given** 图片类型文件（png/jpeg/gif/webp）
   **When** 访问 thumbnail 接口
   **Then** 缩略图按需生成并可访问（不要求权限控制）

## Tasks / Subtasks

- [ ] **Task 1: 增强 Thumbnail 生成能力** (AC: #2)
  - [ ] 1.1 安装图片处理库 `sharp`（用于生成缩略图）
  - [ ] 1.2 新增 `ThumbnailService`：接收 Buffer/路径 → 生成固定尺寸缩略图（建议 200x200）
  - [ ] 1.3 修改 `FileStorageService.upload()`：对图片类型自动生成缩略图，存储到 `thumbnails/{graphId}/{fileId}.webp`
  - [ ] 1.4 更新 `FileRecord` 写入：填充 `thumbnailPath` 字段

- [ ] **Task 2: 新增 Thumbnail API 端点** (AC: #2)
  - [ ] 2.1 新增 `GET /api/files/:id/thumbnail` 端点
  - [ ] 2.2 读取 `FileRecord.thumbnailPath` 返回缩略图；若不存在则降级返回原图或 404
  - [ ] 2.3 缩略图响应设置适当 Cache-Control（建议 `max-age=86400`）

- [ ] **Task 3: 增强 Preview 策略** (AC: #1)
  - [ ] 3.1 文本文件预览：对大文件截断返回（建议 100KB 限制 + 提示）
  - [ ] 3.2 PDF/文档预览：保持现有 inline 行为，前端负责渲染
  - [ ] 3.3 新增 `FileMetadataDto.thumbnailUrl` 字段，返回 `/api/files/{id}/thumbnail`

- [ ] **Task 4: 前端预览组件适配** (AC: #1, #2)
  - [ ] 4.1 数据资源库 `AssetCard`：使用 thumbnail 接口显示预览图
  - [ ] 4.2 评论附件预览：图片类型显示缩略图，点击查看原图
  - [ ] 4.3 审批交付物列表：显示文件类型图标或缩略图

- [ ] **Task 5: 单元测试与验证** (AC: #1, #2)
  - [ ] 5.1 新增 `ThumbnailService` 单元测试
  - [ ] 5.2 新增 `/api/files/:id/thumbnail` 接口测试
  - [ ] 5.3 验证现有 lint/test 不回归

---

## Dev Notes

### 🔥 核心目标

**防止 LLM 开发者犯的常见错误**：
- ❌ 使用 Node.js 原生 canvas/jimp 处理图片 → 性能差，改用 `sharp`
- ❌ 同步生成缩略图阻塞上传请求 → 可考虑异步生成或写入后台任务
- ❌ 未处理非图片类型调用 thumbnail 接口 → 降级返回原图或适当错误码
- ❌ 缩略图存储路径与原文件混淆 → 使用独立的 `thumbnails/` 目录

### 📁 现有实现分析（需增强）

| 模块                     | 位置                                                               | 现状                                             | 待增强                            |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------- |
| `FileStorageService`     | `apps/api/src/modules/file-storage/file-storage.service.ts`        | ✅ 有 `previewable` 字段和 `isPreviewable()` 方法 | 生成缩略图、填充 thumbnailPath    |
| `FileStorageController`  | `apps/api/src/modules/file-storage/file-storage.controller.ts`     | ✅ 有 `/api/files/:id/preview` 端点               | 新增 `/thumbnail` 端点            |
| `FileRecord` 模型        | `packages/database/prisma/schema.prisma`                           | ✅ 有 `thumbnailPath` 字段（当前未使用）          | 上传时自动填充                    |
| `PREVIEWABLE_MIME_TYPES` | `apps/api/src/modules/file-storage/constants/previewable-types.ts` | ✅ 支持 images/PDF/text                           | 可能需要区分 thumbnail 可生成类型 |

### 🏗️ Story 10.4/10.5 已创建的基础设施

**`FileStorageService` 已提供的 API**：

| 方法                             | 参数                                                                                 | 返回值             | 说明                  |
| -------------------------------- | ------------------------------------------------------------------------------------ | ------------------ | --------------------- |
| `upload(file, graphId, options)` | `file: Multer.File`, `graphId: string`, `options?: {ownerType, ownerId, uploadedBy}` | `FileMetadataDto`  | 上传并持久化元数据    |
| `download(fileId)`               | `fileId: string`                                                                     | `{buffer, record}` | 下载文件内容 + 记录   |
| `delete(fileId)`                 | `fileId: string`                                                                     | `void`             | 删除磁盘 + 数据库记录 |
| `getMetadata(fileId)`            | `fileId: string`                                                                     | `FileMetadataDto`  | 仅获取元数据          |
| `isPreviewable(mimeType)`        | `mimeType: string`                                                                   | `boolean`          | 判断是否可预览        |

**`FileRecord` 数据模型**：

```prisma
model FileRecord {
  id            String         @id @default(uuid())
  graphId       String
  originalName  String
  storedName    String
  mimeType      String
  size          Int
  storagePath   String
  storageType   StorageType    @default(LOCAL)
  thumbnailPath String?        // ← 本 Story 需填充
  previewable   Boolean        @default(false)
  ownerType     FileOwnerType?
  ownerId       String?
  uploadedBy    String?
  createdAt     DateTime       @default(now())
  deletedAt     DateTime?
}
```

**当前可预览 MIME 类型**：

```typescript
export const PREVIEWABLE_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
]);
```

### ⚠️ 关键实现细节

#### 1. ThumbnailService 示例

```typescript
// apps/api/src/modules/file-storage/thumbnail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ThumbnailOptions {
    width?: number;
    height?: number;
    format?: 'webp' | 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: ThumbnailOptions = {
    width: 200,
    height: 200,
    format: 'webp',
};

@Injectable()
export class ThumbnailService {
    private readonly logger = new Logger(ThumbnailService.name);

    // 可生成缩略图的 MIME 类型
    private readonly THUMBNAIL_SUPPORTED = new Set([
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
    ]);

    canGenerateThumbnail(mimeType: string): boolean {
        return this.THUMBNAIL_SUPPORTED.has(mimeType);
    }

    async generate(buffer: Buffer, options: ThumbnailOptions = {}): Promise<Buffer> {
        const { width, height, format } = { ...DEFAULT_OPTIONS, ...options };
        
        return sharp(buffer)
            .resize(width, height, {
                fit: 'cover',      // 裁剪填充
                position: 'center',
            })
            .toFormat(format, { quality: 80 })
            .toBuffer();
    }
}
```

#### 2. FileStorageService 增强示例

```typescript
// 在 upload() 方法中增加缩略图生成
async upload(file: Express.Multer.File, graphId: string, options?: UploadOptions): Promise<FileMetadataDto> {
    // ... 现有逻辑 ...

    let thumbnailPath: string | undefined;
    
    // 对图片类型生成缩略图
    if (this.thumbnailService.canGenerateThumbnail(file.mimetype)) {
        try {
            const thumbBuffer = await this.thumbnailService.generate(file.buffer);
            thumbnailPath = `thumbnails/${graphId}/${fileId}.webp`;
            await this.storageAdapter.write(thumbnailPath, thumbBuffer);
        } catch (error) {
            // 缩略图生成失败不应阻塞上传
            this.logger.warn(`Failed to generate thumbnail: ${error}`);
        }
    }

    // 创建数据库记录时包含 thumbnailPath
    record = await this.repository.create({
        // ... 现有字段 ...
        thumbnailPath,
    });
}
```

#### 3. 新增 Thumbnail 端点示例

```typescript
// FileStorageController 新增端点
@Get(':id/thumbnail')
async thumbnail(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const record = await this.fileStorageService.getMetadata(id);
    
    // 如果有缩略图，返回缩略图
    if (record.thumbnailPath) {
        const buffer = await this.storageAdapter.read(record.thumbnailPath);
        res.set({
            'Content-Type': 'image/webp',
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'public, max-age=86400',
        });
        return res.send(buffer);
    }
    
    // 降级：对图片返回原图，其他返回 404
    if (record.previewable && record.mimeType.startsWith('image/')) {
        const { buffer } = await this.fileStorageService.download(id);
        res.set({
            'Content-Type': record.mimeType,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'public, max-age=86400',
        });
        return res.send(buffer);
    }
    
    throw new NotFoundException('Thumbnail not available');
}
```

### 🔗 前端调用方清单

| 功能         | 位置                                                      | 当前状态               | 待适配                             |
| ------------ | --------------------------------------------------------- | ---------------------- | ---------------------------------- |
| 数据资源卡片 | `apps/web/features/data-library/components/AssetCard.tsx` | 使用 `storagePath` URL | 切换到 `/api/files/{id}/thumbnail` |
| 评论附件预览 | `apps/web/components/Comments/AttachmentPreview.tsx`      | 显示原图               | 图片用 thumbnail，点击查看原图     |
| 审批交付物   | `apps/web/components/approval/DeliverablesList.tsx`       | 文件名 + 图标          | 可选：显示缩略图                   |

### 🧪 验证命令

```bash
# 安装 sharp（若未安装）
cd apps/api && pnpm add sharp
cd apps/api && pnpm add -D @types/sharp

# Lint 检查
pnpm --filter @cdm/api lint

# 单元测试
pnpm --filter @cdm/api test

# 手动验证：上传图片后获取缩略图
curl -X POST 'http://localhost:3001/api/files/upload?graphId=xxx' \
  -F 'file=@test.png'
# 记录返回的 fileId

curl -o thumb.webp 'http://localhost:3001/api/files/{fileId}/thumbnail'
```

### References

- [Source: docs/epics.md#Story-10.6] - Story 定义
- [Source: docs/sprint-artifacts/10-5-migrate-callers-to-file-storage.md] - 前置 Story 实现
- [Source: apps/api/src/modules/file-storage/file-storage.service.ts] - FileStorageService 主入口
- [Source: apps/api/src/modules/file-storage/file-storage.controller.ts] - `/api/files/*` 端点
- [Source: apps/api/src/modules/file-storage/constants/previewable-types.ts] - 可预览 MIME 类型
- [Source: packages/database/prisma/schema.prisma#FileRecord] - FileRecord 模型（含 thumbnailPath）
- [Source: docs/project-context.md] - 项目规范与约束

---

## Previous Story Intelligence

### Story 10.5 完成情况

- ✅ `FileStorageModule` 已创建并注册
- ✅ `FileRecord` 表已迁移（含 `thumbnailPath` 字段，当前未使用）
- ✅ `FileStorageService` 提供 upload/download/delete/getMetadata API
- ✅ 存储路径格式为 `uploads/{graphId}/{fileId}.{ext}`
- ✅ DataAsset / CommentAttachment / Deliverable 均已迁移到 FileStorageService

**关键学习**：
- DB 失败时需回滚已写入的磁盘文件
- `graphId` 必须有效（外键约束）
- 上传/删除需要 `x-user-id` header（生产环境）
- 错误信息需包含原始错误以便调试

### Git 历史参考

- `f96037b` - Story 10.5: Migrate Callers to Unified FileStorageService
- `2d58eef` - Story 10.4: Unified File Storage Foundation

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
```

### Manual Verification

| 检查项         | 操作                            | 预期结果                                                            |
| -------------- | ------------------------------- | ------------------------------------------------------------------- |
| 图片缩略图生成 | 上传 png/jpeg/gif/webp 图片     | `FileRecord.thumbnailPath` 自动填充；缩略图文件存在于 `thumbnails/` |
| 缩略图获取     | GET `/api/files/{id}/thumbnail` | 返回 webp 格式缩略图，Content-Type: image/webp                      |
| 非图片降级     | 上传 PDF 后请求 thumbnail       | 返回 404 或适当错误                                                 |
| 预览接口       | GET `/api/files/{id}/preview`   | 图片/PDF/文本正常 inline 显示                                       |
| 前端数据资源库 | 打开 Data Library Drawer        | AssetCard 显示缩略图（对图片类型）                                  |

---

## Risk & Rollback

| 风险                          | 概率 | 影响 | 缓解                                           |
| ----------------------------- | ---- | ---- | ---------------------------------------------- |
| sharp 安装问题（原生依赖）    | 🟡 中 | 🟡 中 | 先在开发环境验证；Docker 环境需确保 sharp 兼容 |
| 缩略图生成阻塞上传            | 🟢 低 | 🟡 中 | 异步生成或后台任务；失败不阻塞上传主流程       |
| 缩略图存储占用空间            | 🟢 低 | 🟢 低 | 固定 200x200 + webp 压缩，单张约 5-20KB        |
| 前端未正确使用 thumbnail 接口 | 🟢 低 | 🟡 中 | 降级返回原图；明确 API 文档                    |

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

