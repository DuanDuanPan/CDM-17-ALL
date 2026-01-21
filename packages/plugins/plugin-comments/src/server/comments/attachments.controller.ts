/**
 * Story 4.3+: Comment Attachments
 * Story 7.1: Refactored to use AttachmentsRepository
 * Story 10.5: Migrated to FileStorageService
 * 
 * Attachments Controller - File upload, download, delete endpoints
 * NOTE: Fine-grained permission control deferred to future story
 */

import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Query,
    Headers,
    Res,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException,
    UseInterceptors,
    UploadedFile,
    Inject,
    Optional,
    Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AttachmentsRepository } from './attachments.repository';

// Story 10.5: FileStorageService injection token and interface
// Matches the interface from file-storage.service.ts
export const FILE_STORAGE_SERVICE = 'FILE_STORAGE_SERVICE';

export interface IFileStorageService {
    upload(file: Express.Multer.File, graphId: string, options?: {
        ownerType?: string;
        ownerId?: string;
        uploadedBy?: string;
    }): Promise<{
        id: string;
        originalName: string;
        mimeType: string;
        size: number;
    }>;
    download(fileId: string): Promise<{ buffer: Buffer; record: { originalName: string; mimeType: string; size: number } }>;
    delete(fileId: string): Promise<void>;
}

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
];

// File filter for validation (custom error type for Multer)
const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void
) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new BadRequestException(`不支持的文件类型: ${file.mimetype}`), false);
    }
};

// Story 10.5: FileRecord owner type for attachments
const ATTACHMENT_OWNER_TYPE = 'ATTACHMENT';

@Controller('comments/attachments')
export class AttachmentsController {
    private readonly logger = new Logger(AttachmentsController.name);

    constructor(
        private readonly attachmentsRepository: AttachmentsRepository,
        @Optional() @Inject(FILE_STORAGE_SERVICE)
        private readonly fileStorageService?: IFileStorageService,
    ) { }

    /**
     * Upload a file attachment
     * POST /comments/attachments/upload?graphId=xxx
     * Story 10.5: graphId is now required for file storage isolation
     */
    @Post('upload')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(), // Story 10.5: Use memoryStorage for FileStorageService
            fileFilter,
            limits: { fileSize: MAX_FILE_SIZE },
        })
    )
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Query('graphId') graphId: string,
        @Headers('x-user-id') userId?: string
    ) {
        if (!userId) {
            throw new UnauthorizedException('User ID required');
        }

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Story 10.5: graphId is required for FileStorageService
        if (!graphId?.trim()) {
            throw new BadRequestException('graphId is required');
        }

        // Check if FileStorageService is available
        if (!this.fileStorageService) {
            throw new InternalServerErrorException(
                'FileStorageService not configured. Did you forget to pass FileStorageModule to CommentsServerModule.forRoot()?'
            );
        }
        const fileStorageService = this.fileStorageService;

        // Decode UTF-8 filename (Multer may return Latin-1 encoded string)
        let decodedFileName = file.originalname;
        try {
            decodedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        } catch {
            decodedFileName = file.originalname;
        }

        // Story 10.5: Create attachment record first to get ID for ownerId
        const attachment = await this.attachmentsRepository.create({
            fileName: decodedFileName,
            fileSize: file.size,
            mimeType: file.mimetype,
            storagePath: '', // Placeholder, will update after upload
            uploaderId: userId,
        });

        let uploadedFileId: string | null = null;
        try {
            // Upload file via FileStorageService
            const uploaded = await fileStorageService.upload(file, graphId.trim(), {
                ownerType: ATTACHMENT_OWNER_TYPE,
                ownerId: attachment.id,
                uploadedBy: userId,
            });
            uploadedFileId = uploaded.id;

            // Update attachment with fileId as storagePath
            await this.attachmentsRepository.update(attachment.id, {
                storagePath: uploaded.id, // Store fileId, not path
                fileName: uploaded.originalName, // Use decoded name from FileStorageService
            });

            return {
                id: attachment.id,
                fileName: uploaded.originalName,
                fileSize: file.size,
                mimeType: file.mimetype,
                url: `/api/comments/attachments/${attachment.id}`,
            };
        } catch (error) {
            // Rollback: delete attachment record; if file was already uploaded, delete it too (best-effort)
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to upload attachment. Cause: ${errorMessage}`);
            if (uploadedFileId) {
                try {
                    await fileStorageService.delete(uploadedFileId);
                } catch (cleanupError) {
                    if (!(cleanupError instanceof NotFoundException)) {
                        this.logger.warn(`Rollback: failed to delete uploaded file ${uploadedFileId}: ${String(cleanupError)}`);
                    }
                }
            }
            await this.attachmentsRepository.delete(attachment.id);
            throw new InternalServerErrorException(`Failed to upload attachment: ${errorMessage}`);
        }
    }

    /**
     * Download or preview an attachment
     * GET /comments/attachments/:id
     * NOTE: Fine-grained permission control deferred to future story
     */
    @Get(':id')
    async download(
        @Param('id') id: string,
        @Res() res: Response,
        @Headers('x-user-id') userId?: string
    ) {
        if (!userId) {
            throw new UnauthorizedException('User ID required');
        }

        const attachment = await this.attachmentsRepository.findById(id);

        if (!attachment) {
            throw new NotFoundException('Attachment not found');
        }

        // Story 10.5: storagePath now stores fileId
        if (!this.fileStorageService) {
            throw new InternalServerErrorException('FileStorageService not configured');
        }

        const { buffer, record } = await this.fileStorageService.download(attachment.storagePath);

        // Set appropriate headers
        res.setHeader('Content-Type', record.mimeType);
        res.setHeader('Content-Length', buffer.length);

        // For images, allow inline display; for others, force download
        const isImage = record.mimeType.startsWith('image/');
        const disposition = isImage ? 'inline' : 'attachment';
        const encodedFilename = encodeURIComponent(record.originalName);
        res.setHeader(
            'Content-Disposition',
            `${disposition}; filename*=UTF-8''${encodedFilename}`
        );

        res.send(buffer);
    }

    /**
     * Delete an attachment
     * DELETE /comments/attachments/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(
        @Param('id') id: string,
        @Headers('x-user-id') userId?: string
    ) {
        if (!userId) {
            throw new UnauthorizedException('User ID required');
        }

        const attachment = await this.attachmentsRepository.findById(id);

        if (!attachment) {
            throw new NotFoundException('Attachment not found');
        }

        // Only uploader can delete
        if (attachment.uploaderId !== userId) {
            throw new UnauthorizedException('只有上传者可以删除附件');
        }

        // Story 10.5: Delete file via FileStorageService
        if (this.fileStorageService && attachment.storagePath) {
            try {
                await this.fileStorageService.delete(attachment.storagePath);
            } catch (error) {
                // Log but don't fail if file already deleted
                if (!(error instanceof NotFoundException)) {
                    this.logger.warn(`Failed to delete file ${attachment.storagePath}: ${String(error)}`);
                }
            }
        }

        // Delete database record
        await this.attachmentsRepository.delete(id);

        return { success: true };
    }
}
