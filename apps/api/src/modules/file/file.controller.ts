/**
 * Story 4.1: FIX-11 - File Upload Controller
 * REST endpoints for file upload and download
 */

import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseInterceptors,
    UploadedFile,
    Res,
    ParseFilePipe,
    MaxFileSizeValidator,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileService, FileMetadata } from './file.service';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types for deliverables
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-rar-compressed',
];

@Controller('files')
export class FileController {
    constructor(private readonly fileService: FileService) {}

    /**
     * POST /files/upload
     * Upload a file for deliverables
     */
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: MAX_FILE_SIZE },
    }))
    async uploadFile(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
                ],
                fileIsRequired: true,
            }),
        )
        file: Express.Multer.File,
    ): Promise<FileMetadata> {
        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
            );
        }

        return this.fileService.storeFile(file);
    }

    /**
     * GET /files/:fileId
     * Download a file by ID
     */
    @Get(':fileId')
    async downloadFile(
        @Param('fileId') fileId: string,
        @Res() res: Response,
    ): Promise<void> {
        const { buffer, metadata } = await this.fileService.getFile(fileId);

        res.set({
            'Content-Type': metadata.mimeType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(metadata.originalName)}"`,
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    }

    /**
     * GET /files/:fileId/metadata
     * Get file metadata without downloading
     */
    @Get(':fileId/metadata')
    async getFileMetadata(
        @Param('fileId') fileId: string,
    ): Promise<FileMetadata> {
        const metadata = this.fileService.getFileMetadata(fileId);
        if (!metadata) {
            // Try to get from disk
            const { metadata: diskMetadata } = await this.fileService.getFile(fileId);
            return {
                id: diskMetadata.id,
                originalName: diskMetadata.originalName,
                mimeType: diskMetadata.mimeType,
                size: diskMetadata.size,
                uploadedAt: diskMetadata.uploadedAt,
            };
        }
        return metadata;
    }

    /**
     * DELETE /files/:fileId
     * Delete a file by ID
     */
    @Delete(':fileId')
    async deleteFile(
        @Param('fileId') fileId: string,
    ): Promise<{ success: boolean }> {
        await this.fileService.deleteFile(fileId);
        return { success: true };
    }
}
