/**
 * Story 4.1: FIX-11 - File Upload Service
 * Handles file storage and retrieval for deliverables
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredFile {
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    path: string;
}

export interface FileMetadata {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
}

@Injectable()
export class FileService {
    private readonly logger = new Logger(FileService.name);
    private readonly uploadDir: string;
    private readonly fileMetadata = new Map<string, StoredFile>();

    constructor() {
        // Use environment variable or default to 'uploads' in project root
        this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
        this.ensureUploadDir();
    }

    /**
     * Ensure upload directory exists
     */
    private ensureUploadDir(): void {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
            this.logger.log(`Created upload directory: ${this.uploadDir}`);
        }
    }

    /**
     * Store an uploaded file
     */
    async storeFile(file: Express.Multer.File): Promise<FileMetadata> {
        const fileId = nanoid();
        const ext = path.extname(file.originalname);
        const fileName = `${fileId}${ext}`;
        const filePath = path.join(this.uploadDir, fileName);

        // Write file to disk
        await fs.promises.writeFile(filePath, file.buffer);

        const storedFile: StoredFile = {
            id: fileId,
            originalName: file.originalname,
            fileName,
            mimeType: file.mimetype,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            path: filePath,
        };

        // Store metadata (in production, use database)
        this.fileMetadata.set(fileId, storedFile);

        this.logger.log(`Stored file: ${file.originalname} as ${fileName}`);

        return {
            id: fileId,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedAt: storedFile.uploadedAt,
        };
    }

    /**
     * Get file by ID
     */
    async getFile(fileId: string): Promise<{ buffer: Buffer; metadata: StoredFile }> {
        const metadata = this.fileMetadata.get(fileId);

        if (!metadata) {
            // Try to find file on disk by scanning (fallback for server restart)
            const files = await fs.promises.readdir(this.uploadDir);
            const matchingFile = files.find(f => f.startsWith(fileId));

            if (!matchingFile) {
                throw new NotFoundException(`File not found: ${fileId}`);
            }

            const filePath = path.join(this.uploadDir, matchingFile);
            const buffer = await fs.promises.readFile(filePath);
            const stats = await fs.promises.stat(filePath);

            return {
                buffer,
                metadata: {
                    id: fileId,
                    originalName: matchingFile,
                    fileName: matchingFile,
                    mimeType: 'application/octet-stream',
                    size: stats.size,
                    uploadedAt: stats.mtime.toISOString(),
                    path: filePath,
                },
            };
        }

        const buffer = await fs.promises.readFile(metadata.path);
        return { buffer, metadata };
    }

    /**
     * Delete file by ID
     */
    async deleteFile(fileId: string): Promise<void> {
        const metadata = this.fileMetadata.get(fileId);

        if (metadata) {
            try {
                await fs.promises.unlink(metadata.path);
                this.fileMetadata.delete(fileId);
                this.logger.log(`Deleted file: ${fileId}`);
            } catch (error) {
                this.logger.warn(`Failed to delete file ${fileId}: ${error}`);
            }
        } else {
            // Try to find and delete by scanning
            const files = await fs.promises.readdir(this.uploadDir);
            const matchingFile = files.find(f => f.startsWith(fileId));

            if (matchingFile) {
                const filePath = path.join(this.uploadDir, matchingFile);
                await fs.promises.unlink(filePath);
                this.logger.log(`Deleted file: ${fileId}`);
            }
        }
    }

    /**
     * Get file metadata only
     */
    getFileMetadata(fileId: string): FileMetadata | null {
        const stored = this.fileMetadata.get(fileId);
        if (!stored) return null;

        return {
            id: stored.id,
            originalName: stored.originalName,
            mimeType: stored.mimeType,
            size: stored.size,
            uploadedAt: stored.uploadedAt,
        };
    }
}
