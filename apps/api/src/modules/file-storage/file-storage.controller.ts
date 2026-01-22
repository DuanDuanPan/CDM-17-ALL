/**
 * Story 10.4: File Storage Controller
 * Unified API endpoints for file upload/download/preview/delete
 *
 * Story 10.5: Removed legacy FileService fallback - all file operations
 * now go through FileStorageService only. Historical files are not preserved
 * per Epic 10 constraints.
 *
 * Story 10.6: Added thumbnail endpoint for image previews
 */

import {
    Controller,
    Delete,
    Get,
    Headers,
    MaxFileSizeValidator,
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
import { MAX_FILE_SIZE } from './constants';

@Controller('files')
export class FileStorageController {
    constructor(
        private readonly fileStorageService: FileStorageService,
    ) { }

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
        const { buffer, record } = await this.fileStorageService.download(id);
        const encodedFilename = encodeURIComponent(record.originalName);

        res.set({
            'Content-Type': record.mimeType,
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
        const { buffer, record } = await this.fileStorageService.download(id);
        const encodedFilename = encodeURIComponent(record.originalName);

        res.set({
            'Content-Type': record.mimeType,
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
        const { buffer, record } = await this.fileStorageService.download(id);
        const encodedFilename = encodeURIComponent(record.originalName);

        res.set({
            'Content-Type': record.mimeType,
            'Content-Length': buffer.length.toString(),
            'Content-Disposition': `inline; filename*=UTF-8''${encodedFilename}`,
        });

        res.send(buffer);
    }

    /**
     * Story 10.6: GET /api/files/:id/thumbnail
     * Returns thumbnail for images, or falls back to original image
     * Non-image files return 404
     */
    @Get(':id/thumbnail')
    async thumbnail(@Param('id') id: string, @Res() res: Response): Promise<void> {
        const result = await this.fileStorageService.getThumbnail(id);

        if (!result) {
            res.status(404).json({ message: 'Thumbnail not available for this file type' });
            return;
        }

        res.set({
            'Content-Type': result.mimeType,
            'Content-Length': result.buffer.length.toString(),
            'Cache-Control': 'public, max-age=86400',  // 24 hours
        });

        res.send(result.buffer);
    }

    /**
     * GET /api/files/:id/metadata
     * Get file metadata without downloading content
     */
    @Get(':id/metadata')
    async getMetadata(@Param('id') id: string): Promise<FileResponseDto> {
        return this.fileStorageService.getMetadata(id);
    }

    /**
     * DELETE /api/files/:id
     * Delete a file (soft delete in DB, remove from storage)
     */
    @Delete(':id')
    @UseGuards(FileStorageAuthGuard)
    async deleteFile(@Param('id') id: string): Promise<{ deleted: boolean }> {
        await this.fileStorageService.delete(id);
        return { deleted: true };
    }
}
