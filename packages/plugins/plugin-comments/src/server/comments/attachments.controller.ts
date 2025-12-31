/**
 * Story 4.3+: Comment Attachments
 * Attachments Controller - File upload, download, delete endpoints
 * Story 7.1: Refactored to use AttachmentsRepository
 * NOTE: Fine-grained permission control deferred to future story
 */

import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Headers,
    Res,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    BadRequestException,
    NotFoundException,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync, createReadStream } from 'fs';
import { randomBytes } from 'crypto';
import { AttachmentsRepository } from './attachments.repository';

// Configuration
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'comments');
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

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage configuration
const storage = diskStorage({
    destination: (
        _req: Express.Request,
        _file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
    ) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void
    ) => {
        // Generate unique filename: timestamp + random + original extension
        const uniqueId = `${Date.now()}-${randomBytes(8).toString('hex')}`;
        const ext = extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
    },
});

// File filter for validation
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

@Controller('comments/attachments')
export class AttachmentsController {
    constructor(
        private readonly attachmentsRepository: AttachmentsRepository,
    ) {}

    /**
     * Upload a file attachment
     * POST /comments/attachments/upload
     * Returns the attachment ID for use when creating a comment
     */
    @Post('upload')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(
        FileInterceptor('file', {
            storage,
            fileFilter,
            limits: { fileSize: MAX_FILE_SIZE },
        })
    )
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Headers('x-user-id') userId?: string
    ) {
        if (!userId) {
            throw new UnauthorizedException('User ID required');
        }

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Decode UTF-8 filename (Multer may return Latin-1 encoded string)
        let decodedFileName = file.originalname;
        try {
            // Try to decode if it looks like corrupted UTF-8
            decodedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        } catch {
            // If decoding fails, use original
            decodedFileName = file.originalname;
        }

        // Create attachment record (pending association with comment)
        // Story 7.1: Refactored to use AttachmentsRepository
        const attachment = await this.attachmentsRepository.create({
            fileName: decodedFileName,
            fileSize: file.size,
            mimeType: file.mimetype,
            storagePath: file.filename, // Just the filename, not full path
            uploaderId: userId,
            // commentId is undefined by default - will be set when comment is created
        });

        return {
            id: attachment.id,
            fileName: attachment.fileName,
            fileSize: attachment.fileSize,
            mimeType: attachment.mimeType,
            url: `/api/comments/attachments/${attachment.id}`,
        };
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

        // Story 7.1: Refactored to use AttachmentsRepository
        const attachment = await this.attachmentsRepository.findById(id);

        if (!attachment) {
            throw new NotFoundException('Attachment not found');
        }

        // TODO: Add fine-grained permission control in future story
        // Current behavior: any authenticated user can download any attachment

        const filePath = join(UPLOAD_DIR, attachment.storagePath);
        if (!existsSync(filePath)) {
            throw new NotFoundException('File not found on disk');
        }

        // Set appropriate headers
        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('Content-Length', attachment.fileSize);

        // For images, allow inline display; for others, force download
        const isImage = attachment.mimeType.startsWith('image/');
        const disposition = isImage ? 'inline' : 'attachment';
        res.setHeader(
            'Content-Disposition',
            `${disposition}; filename="${encodeURIComponent(attachment.fileName)}"`
        );

        // Stream the file
        const fileStream = createReadStream(filePath);
        fileStream.pipe(res);
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

        // Story 7.1: Refactored to use AttachmentsRepository
        const attachment = await this.attachmentsRepository.findById(id);

        if (!attachment) {
            throw new NotFoundException('Attachment not found');
        }

        // Only uploader can delete
        if (attachment.uploaderId !== userId) {
            throw new UnauthorizedException('只有上传者可以删除附件');
        }

        // Delete file from disk
        const filePath = join(UPLOAD_DIR, attachment.storagePath);
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }

        // Delete database record
        // Story 7.1: Refactored to use AttachmentsRepository
        await this.attachmentsRepository.delete(id);

        return { success: true };
    }
}
