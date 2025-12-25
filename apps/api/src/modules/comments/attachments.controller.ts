/**
 * Story 4.3+: Comment Attachments
 * Attachments Controller - File upload, download, delete endpoints
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
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync, createReadStream } from 'fs';
import { prisma } from '@cdm/database';
import { randomBytes } from 'crypto';

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
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
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

        // Create attachment record (pending association with comment)
        const attachment = await prisma.commentAttachment.create({
            data: {
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                storagePath: file.filename, // Just the filename, not full path
                uploaderId: userId,
                commentId: 'pending', // Will be updated when comment is created
            },
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

        const attachment = await prisma.commentAttachment.findUnique({
            where: { id },
        });

        if (!attachment) {
            throw new NotFoundException('Attachment not found');
        }

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

        const attachment = await prisma.commentAttachment.findUnique({
            where: { id },
        });

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
        await prisma.commentAttachment.delete({
            where: { id },
        });

        return { success: true };
    }
}
