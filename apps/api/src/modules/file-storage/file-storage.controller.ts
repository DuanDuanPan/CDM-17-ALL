/**
 * Story 10.4: File Storage Controller
 * Unified API endpoints for file upload/download/preview/delete
 */

import {
    Controller,
    Delete,
    Get,
    Headers,
    MaxFileSizeValidator,
    NotFoundException,
    Param,
    ParseFilePipe,
    Post,
    Query,
    Res,
    UploadedFile,
    UseInterceptors,
    UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileStorageService } from './file-storage.service';
import { FileResponseDto } from './dto/file-response.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileStorageAuthGuard } from './guards/file-storage-auth.guard';
import { FileService } from '../file/file.service';
import { isPreviewableMimeType } from './constants/previewable-types';

// Max file size: 10MB (memory upload)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('files')
export class FileStorageController {
    constructor(
        private readonly fileStorageService: FileStorageService,
        private readonly legacyFileService: FileService,
    ) { }

    private async resolveFileForDownload(id: string): Promise<{
        buffer: Buffer;
        mimeType: string;
        originalName: string;
    }> {
        try {
            const { buffer, record } = await this.fileStorageService.download(id);
            return { buffer, mimeType: record.mimeType, originalName: record.originalName };
        } catch (error) {
            if (error instanceof NotFoundException) {
                const { buffer, metadata } = await this.legacyFileService.getFile(id);
                return { buffer, mimeType: metadata.mimeType, originalName: metadata.originalName };
            }
            throw error;
        }
    }

    private async resolveFileMetadata(id: string): Promise<FileResponseDto> {
        try {
            return await this.fileStorageService.getMetadata(id);
        } catch (error) {
            if (!(error instanceof NotFoundException)) {
                throw error;
            }

            const legacy = this.legacyFileService.getFileMetadata(id);
            if (legacy) {
                return {
                    id: legacy.id,
                    originalName: legacy.originalName,
                    mimeType: legacy.mimeType,
                    size: legacy.size,
                    storagePath: `legacy/${legacy.id}`,
                    storageType: 'LOCAL',
                    previewable: isPreviewableMimeType(legacy.mimeType),
                    createdAt: new Date(legacy.uploadedAt),
                };
            }

            // Fallback: derive metadata from disk scan
            const { metadata } = await this.legacyFileService.getFile(id);
            return {
                id: metadata.id,
                originalName: metadata.originalName,
                mimeType: metadata.mimeType,
                size: metadata.size,
                storagePath: `legacy/${metadata.id}`,
                storageType: 'LOCAL',
                previewable: isPreviewableMimeType(metadata.mimeType),
                createdAt: new Date(metadata.uploadedAt),
            };
        }
    }

    /**
     * POST /api/files/upload
     * Upload a file with required graphId parameter
     */
    @Post('upload')
    @UseGuards(FileStorageAuthGuard)
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: MAX_FILE_SIZE },
    }))
    async upload(
        @UploadedFile(
            new ParseFilePipe({
                validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
                fileIsRequired: true,
            }),
        )
        file: Express.Multer.File,
        @Query() query: UploadFileDto,
        @Headers('x-user-id') userId?: string,
    ): Promise<FileResponseDto> {
        return this.fileStorageService.upload(file, query.graphId, {
            ownerType: query.ownerType,
            ownerId: query.ownerId,
            uploadedBy: userId,
        });
    }

    /**
     * GET /api/files/:id
     * Backward-compatible download (attachment)
     */
    @Get(':id')
    async downloadCompat(@Param('id') id: string, @Res() res: Response): Promise<void> {
        const { buffer, mimeType, originalName } = await this.resolveFileForDownload(id);

        const encodedFilename = encodeURIComponent(originalName);

        res.set({
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
            'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
        });

        res.send(buffer);
    }

    /**
     * GET /api/files/:id/download
     * Download file with Content-Disposition: attachment
     */
    @Get(':id/download')
    async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
        const { buffer, mimeType, originalName } = await this.resolveFileForDownload(id);
        const encodedFilename = encodeURIComponent(originalName);

        res.set({
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
            'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
        });

        res.send(buffer);
    }

    /**
     * GET /api/files/:id/preview
     * Inline preview with Content-Disposition: inline
     */
    @Get(':id/preview')
    async preview(@Param('id') id: string, @Res() res: Response): Promise<void> {
        const { buffer, mimeType, originalName } = await this.resolveFileForDownload(id);
        const encodedFilename = encodeURIComponent(originalName);

        res.set({
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
            'Content-Disposition': `inline; filename*=UTF-8''${encodedFilename}`,
        });

        res.send(buffer);
    }

    /**
     * GET /api/files/:id/metadata
     * Get file metadata without downloading content
     */
    @Get(':id/metadata')
    async getMetadata(@Param('id') id: string): Promise<FileResponseDto> {
        return this.resolveFileMetadata(id);
    }

    /**
     * DELETE /api/files/:id
     * Delete a file (soft delete in DB, remove from storage)
     */
    @Delete(':id')
    @UseGuards(FileStorageAuthGuard)
    async deleteFile(@Param('id') id: string): Promise<{ deleted: boolean }> {
        try {
            await this.fileStorageService.delete(id);
        } catch (error) {
            if (error instanceof NotFoundException) {
                await this.legacyFileService.deleteFile(id);
            } else {
                throw error;
            }
        }
        return { deleted: true };
    }
}
