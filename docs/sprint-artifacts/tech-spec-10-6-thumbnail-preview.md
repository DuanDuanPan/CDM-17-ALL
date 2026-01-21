# Tech-Spec: Story 10.6 - 文件预览增强（缩略图）

**Created:** 2026-01-21
**Status:** Ready for Development

---

## Overview

### Problem Statement

当前 `FileStorageService` 虽然提供了统一的文件上传/下载能力，但缺乏缩略图生成功能：
- **数据资源库**：`AssetCard` 无法显示文件预览图，用户体验差
- **评论附件**：图片附件只能看到文件名，无法快速预览内容
- **审批交付物**：文件列表只有图标，缺乏可视化

`FileRecord` 模型虽然已有 `thumbnailPath` 字段，但从未被使用。

### Solution

为图片类型文件自动生成缩略图，通过新的 `/api/files/:id/thumbnail` 端点提供访问，在前端各场景中统一使用缩略图预览。

**核心变更：**
1. 新增 `ThumbnailService` 使用 `sharp` 库生成 200×200 webp 缩略图
2. 在 `FileStorageService.upload()` 中对图片类型自动生成缩略图
3. 新增 `GET /api/files/:id/thumbnail` 端点
4. 前端 `AssetCard` / 附件预览 / 交付物列表适配

### Scope (In/Out)

**In Scope:**
- ✅ 图片类型 (png/jpeg/gif/webp) 缩略图生成
- ✅ 新增 `/thumbnail` API 端点
- ✅ `FileMetadataDto` 增加 `thumbnailUrl` 字段
- ✅ 前端数据资源库 AssetCard 使用缩略图

**Out of Scope:**
- ❌ PDF/Office 文档缩略图（需服务端渲染，复杂度高）
- ❌ 视频缩略图（需 ffmpeg）
- ❌ 3D 模型缩略图（需 three.js 服务端渲染）
- ❌ 权限控制（与 AC 一致：不要求权限控制）

---

## Context for Development

### Codebase Patterns

#### 1. NestJS Module 结构

```
apps/api/src/modules/file-storage/
├── __tests__/
│   └── file-storage.service.spec.ts    # Jest + @nestjs/testing
├── adapters/
│   ├── local-storage.adapter.ts        # 本地磁盘实现
│   └── storage-adapter.interface.ts    # StorageAdapter 接口
├── constants/
│   └── previewable-types.ts            # PREVIEWABLE_MIME_TYPES
├── dto/
│   ├── file-response.dto.ts
│   └── upload-file.dto.ts
├── guards/
│   └── file-storage-auth.guard.ts
├── constants.ts                         # MAX_FILE_SIZE 等
├── file-storage.controller.ts
├── file-storage.module.ts
├── file-storage.repository.ts
└── file-storage.service.ts
```

#### 2. StorageAdapter 抽象

```typescript
// adapters/storage-adapter.interface.ts
export interface StorageAdapter {
    write(storagePath: string, buffer: Buffer, options?: WriteOptions): Promise<void>;
    read(storagePath: string): Promise<Buffer>;
    delete(storagePath: string): Promise<boolean>;
    exists(storagePath: string): Promise<boolean>;
}
```

**关键点：** 缩略图存储应复用 `StorageAdapter`，路径前缀改为 `thumbnails/{graphId}/{fileId}.webp`。

#### 3. Repository Pattern

```typescript
// file-storage.repository.ts
export interface CreateFileRecordDto {
    // ... 已有字段
    thumbnailPath?: string;  // ← 已支持，只需在 create 时传入
}
```

#### 4. 测试模式

```typescript
// Jest mock 结构
const mockStorageAdapter: jest.Mocked<StorageAdapter> = {
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue(Buffer.from('test content')),
    // ...
};

const module = await Test.createTestingModule({
    providers: [
        FileStorageService,
        { provide: STORAGE_ADAPTER, useValue: mockStorageAdapter },
        // ...
    ],
}).compile();
```

### Files to Reference

| 文件                                                                       | 用途                                                 |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `apps/api/src/modules/file-storage/file-storage.service.ts`                | 主要修改：注入 ThumbnailService，upload 时生成缩略图 |
| `apps/api/src/modules/file-storage/file-storage.controller.ts`             | 新增 `/thumbnail` 端点                               |
| `apps/api/src/modules/file-storage/file-storage.repository.ts`             | 无需修改，已支持 thumbnailPath                       |
| `apps/api/src/modules/file-storage/constants/previewable-types.ts`         | 可能新增 THUMBNAIL_SUPPORTED_TYPES                   |
| `apps/api/src/modules/file-storage/__tests__/file-storage.service.spec.ts` | 新增缩略图测试用例                                   |
| `packages/database/prisma/schema.prisma`                                   | 无需修改，FileRecord.thumbnailPath 已存在            |

### Technical Decisions

| 决策       | 选择                                 | 理由                                        |
| ---------- | ------------------------------------ | ------------------------------------------- |
| 图片处理库 | `sharp`                              | 性能最佳，libvips C 实现，支持 WebAssembly  |
| 缩略图格式 | WebP                                 | 体积小（比 JPEG 约减 25-30%），浏览器兼容好 |
| 缩略图尺寸 | 200×200 cover                        | 满足卡片预览需求，平衡质量与体积            |
| 生成时机   | 上传时同步                           | 简单可靠；文件小时延迟可接受（<100ms）      |
| 存储路径   | `thumbnails/{graphId}/{fileId}.webp` | 与原文件隔离，便于清理                      |
| 降级策略   | 无缩略图时返回原图或 404             | 避免前端 broken image                       |

---

## Implementation Plan

### Tasks

#### Task 1: 安装 sharp 依赖

```bash
cd apps/api
pnpm add sharp
pnpm add -D @types/sharp
```

#### Task 2: 新增 ThumbnailService

**文件：** `apps/api/src/modules/file-storage/thumbnail.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ThumbnailOptions {
    width?: number;
    height?: number;
    format?: 'webp' | 'jpeg' | 'png';
    quality?: number;
}

@Injectable()
export class ThumbnailService {
    private readonly logger = new Logger(ThumbnailService.name);

    private readonly THUMBNAIL_SUPPORTED = new Set([
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
    ]);

    canGenerate(mimeType: string): boolean {
        return this.THUMBNAIL_SUPPORTED.has(mimeType);
    }

    async generate(
        buffer: Buffer,
        options: ThumbnailOptions = {},
    ): Promise<Buffer> {
        const { width = 200, height = 200, format = 'webp', quality = 80 } = options;

        return sharp(buffer)
            .resize(width, height, { fit: 'cover', position: 'center' })
            .toFormat(format, { quality })
            .toBuffer();
    }
}
```

#### Task 3: 修改 FileStorageService.upload()

**位置：** 在文件写入后、数据库记录创建前

```typescript
// 1. 注入 ThumbnailService
constructor(
    // ... existing
    private readonly thumbnailService: ThumbnailService,
) {}

// 2. 在 upload() 中生成缩略图
async upload(file: Express.Multer.File, graphId: string, options?: UploadOptions) {
    // ... existing validation & file write ...

    // 生成缩略图（图片类型）
    let thumbnailPath: string | undefined;
    if (this.thumbnailService.canGenerate(file.mimetype)) {
        try {
            const thumbBuffer = await this.thumbnailService.generate(file.buffer);
            thumbnailPath = `thumbnails/${trimmedGraphId}/${fileId}.webp`;
            await this.storageAdapter.write(thumbnailPath, thumbBuffer);
        } catch (error) {
            this.logger.warn(`Thumbnail generation failed: ${String(error)}`);
            // 不阻塞上传主流程
        }
    }

    // 创建数据库记录
    record = await this.repository.create({
        // ... existing fields
        thumbnailPath,
    });
}
```

#### Task 4: 修改 FileMetadataDto 增加 thumbnailUrl

```typescript
export interface FileMetadataDto {
    // ... existing
    thumbnailUrl?: string;  // 新增：`/api/files/{id}/thumbnail` 或 null
}

// 在 toDto 映射时
return {
    // ... existing
    thumbnailUrl: record.thumbnailPath ? `/api/files/${record.id}/thumbnail` : undefined,
};
```

#### Task 5: 新增 Controller 端点

```typescript
@Get(':id/thumbnail')
async thumbnail(
    @Param('id') id: string,
    @Res() res: Response,
): Promise<void> {
    const record = await this.fileStorageService.getMetadataWithThumbnail(id);

    if (record.thumbnailPath) {
        const buffer = await this.storageAdapter.read(record.thumbnailPath);
        res.set({
            'Content-Type': 'image/webp',
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'public, max-age=86400',  // 24h 缓存
        });
        return res.send(buffer);
    }

    // 降级：图片类型返回原图
    if (record.mimeType.startsWith('image/')) {
        const { buffer } = await this.fileStorageService.download(id);
        res.set({
            'Content-Type': record.mimeType,
            'Cache-Control': 'public, max-age=86400',
        });
        return res.send(buffer);
    }

    throw new NotFoundException('Thumbnail not available');
}
```

#### Task 6: 更新 FileStorageModule

```typescript
@Module({
    providers: [
        FileStorageService,
        FileStorageRepository,
        ThumbnailService,  // 新增
        // ...
    ],
    exports: [FileStorageService, ThumbnailService],
})
```

#### Task 7: 单元测试

**文件：** `apps/api/src/modules/file-storage/__tests__/thumbnail.service.spec.ts`

```typescript
describe('ThumbnailService', () => {
    it('should generate webp thumbnail for jpeg input');
    it('should return false for canGenerate with pdf');
    it('should handle corrupt image gracefully');
});
```

**更新：** `file-storage.service.spec.ts`

```typescript
describe('upload with thumbnail', () => {
    it('should generate thumbnail for image/png');
    it('should not generate thumbnail for text/plain');
    it('should continue upload even if thumbnail generation fails');
});
```

#### Task 8: 前端适配（可选，建议后续 Story）

- `apps/web/features/data-library/components/AssetCard.tsx`
- `apps/web/components/Comments/AttachmentPreview.tsx`

### Acceptance Criteria

- [x] **AC #1:** Given 文件已通过 FileStorageService 上传，When 访问 preview/thumbnail 接口，Then 可返回可用的内联预览响应

- [x] **AC #2:** Given 图片类型文件，When 访问 /api/files/:id/thumbnail，Then 缩略图按需生成并可访问

**验证方式：**
```bash
# 1. 上传图片
curl -X POST 'http://localhost:3001/api/files/upload?graphId=xxx' \
  -F 'file=@test.png' -H 'x-user-id: test'

# 2. 获取缩略图（应返回 image/webp）
curl -I 'http://localhost:3001/api/files/{fileId}/thumbnail'
# Content-Type: image/webp
# Cache-Control: public, max-age=86400
```

---

## Additional Context

### Dependencies

| 依赖           | 版本      | 用途                                  |
| -------------- | --------- | ------------------------------------- |
| `sharp`        | `^0.33.x` | 图片处理（resize, format conversion） |
| `@types/sharp` | `^0.33.x` | TypeScript 类型                       |

### Testing Strategy

```bash
# 1. 安装依赖后确保构建通过
pnpm --filter @cdm/api build

# 2. 运行现有测试不回归
pnpm --filter @cdm/api test

# 3. 新增测试
pnpm --filter @cdm/api test -- --testPathPattern=thumbnail

# 4. Lint 检查
pnpm --filter @cdm/api lint
```

### Notes

1. **sharp 原生依赖**：sharp 依赖 libvips C 库，在某些环境（Alpine Linux、Apple Silicon）可能需要额外配置。开发时建议用 `pnpm rebuild sharp` 确保编译。

2. **缩略图清理**：删除文件时应同时删除缩略图。需在 `FileStorageService.delete()` 中增加：
   ```typescript
   if (record.thumbnailPath) {
       await this.storageAdapter.delete(record.thumbnailPath);
   }
   ```

3. **SVG 处理**：SVG 本身是矢量格式，不需要生成缩略图。`image/svg+xml` 不在 THUMBNAIL_SUPPORTED 中。

4. **大文件图片**：sharp 默认有内存限制（~1GB）。超大图片可能失败，需捕获错误并降级。

---

**Recommended Next Step:** Run `/dev-story` with this tech-spec in fresh context.
