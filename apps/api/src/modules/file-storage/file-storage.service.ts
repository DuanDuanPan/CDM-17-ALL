/**
 * Story 10.4: File Storage Service
 * Business logic layer for unified file upload/download/preview/delete operations
 */

import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import * as path from 'path';
import type { FileOwnerType, FileRecord, StorageType } from '@cdm/database';
import { STORAGE_ADAPTER, StorageAdapter } from './adapters/storage-adapter.interface';
import { FileStorageRepository } from './file-storage.repository';
import { GraphRepository } from '../graphs/graph.repository';
import { isPreviewableMimeType } from './constants/previewable-types';

export interface UploadOptions {
    ownerType?: FileOwnerType;
    ownerId?: string;
    uploadedBy?: string;
}

export interface FileMetadataDto {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
    storageType: StorageType;
    previewable: boolean;
    createdAt: Date;
}

@Injectable()
export class FileStorageService {
    private readonly logger = new Logger(FileStorageService.name);

    constructor(
        @Inject(STORAGE_ADAPTER)
        private readonly storageAdapter: StorageAdapter,
        private readonly repository: FileStorageRepository,
        private readonly graphRepository: GraphRepository,
    ) { }

    /**
     * Decode UTF-8 filename from Multer
     * Multer parses multipart form filenames as Latin-1 (ISO-8859-1),
     * but browsers send UTF-8 encoded filenames.
     */
    private decodeUtf8Filename(filename: string): string {
        try {
            return Buffer.from(filename, 'latin1').toString('utf8');
        } catch {
            return filename;
        }
    }

    /**
     * Determine if a file is previewable based on MIME type
     */
    private isPreviewable(mimeType: string): boolean {
        return isPreviewableMimeType(mimeType);
    }

    /**
     * Build storage path: {graphId}/{fileId}.{ext}
     */
    private buildStoragePath(graphId: string, fileId: string, originalName: string): string {
        const ext = path.extname(originalName);
        return `${graphId}/${fileId}${ext}`;
    }

    /**
     * Upload a file
     * @param file - Express.Multer.File from multipart upload
     * @param graphId - Required: Graph ID for file isolation
     * @param options - Optional owner info
     */
    async upload(
        file: Express.Multer.File,
        graphId: string,
        options?: UploadOptions,
    ): Promise<FileMetadataDto> {
        const trimmedGraphId = graphId?.trim();
        if (!trimmedGraphId) {
            throw new BadRequestException('graphId is required');
        }

        const graphExists = await this.graphRepository.exists(trimmedGraphId);
        if (!graphExists) {
            throw new BadRequestException(`graphId not found: ${trimmedGraphId}`);
        }

        const originalName = this.decodeUtf8Filename(file.originalname);
        const fileId = nanoid();
        const storagePath = this.buildStoragePath(trimmedGraphId, fileId, originalName);
        const previewable = this.isPreviewable(file.mimetype);

        // Write to storage adapter
        await this.storageAdapter.write(storagePath, file.buffer);

        let record: FileRecord;
        try {
            // Create database record via repository
            record = await this.repository.create({
                id: fileId,
                graphId: trimmedGraphId,
                originalName,
                storedName: `${fileId}${path.extname(originalName)}`,
                mimeType: file.mimetype,
                size: file.size,
                storagePath,
                storageType: 'LOCAL',
                previewable,
                ownerType: options?.ownerType,
                ownerId: options?.ownerId,
                uploadedBy: options?.uploadedBy,
            });
        } catch (error) {
            // Rollback: remove file from storage if DB write fails
            try {
                await this.storageAdapter.delete(storagePath);
            } catch (rollbackError) {
                this.logger.warn(
                    `Failed to rollback file after DB error: ${storagePath}: ${String(rollbackError)}`,
                );
            }
            throw error;
        }

        this.logger.log(`Uploaded file: ${originalName} -> ${storagePath}`);

        return {
            id: record.id,
            originalName: record.originalName,
            mimeType: record.mimeType,
            size: record.size,
            storagePath: record.storagePath,
            storageType: record.storageType,
            previewable: record.previewable,
            createdAt: record.createdAt,
        };
    }

    /**
     * Download a file (returns buffer and metadata)
     */
    async download(fileId: string): Promise<{ buffer: Buffer; record: FileRecord }> {
        const record = await this.repository.findByIdActive(fileId);
        if (!record) {
            throw new NotFoundException(`File not found: ${fileId}`);
        }

        try {
            const buffer = await this.storageAdapter.read(record.storagePath);
            return { buffer, record };
        } catch (error) {
            if (error instanceof NotFoundException) {
                // DB record exists but physical file is missing → inconsistency.
                throw new InternalServerErrorException(
                    `File content missing for record: ${fileId}`,
                );
            }
            throw error;
        }
    }

    /**
     * Get file metadata only
     */
    async getMetadata(fileId: string): Promise<FileMetadataDto> {
        const record = await this.repository.findByIdActive(fileId);
        if (!record) {
            throw new NotFoundException(`File not found: ${fileId}`);
        }

        return {
            id: record.id,
            originalName: record.originalName,
            mimeType: record.mimeType,
            size: record.size,
            storagePath: record.storagePath,
            storageType: record.storageType,
            previewable: record.previewable,
            createdAt: record.createdAt,
        };
    }

    /**
     * Delete a file (soft delete in DB, remove from storage)
     */
    async delete(fileId: string): Promise<void> {
        const record = await this.repository.findByIdActive(fileId);
        if (!record) {
            throw new NotFoundException(`File not found: ${fileId}`);
        }

        // Soft delete in database first, then delete physical file.
        // If physical delete fails, rollback deletedAt to keep record consistent.
        await this.repository.softDelete(fileId);
        try {
            await this.storageAdapter.delete(record.storagePath);
        } catch (error) {
            await this.repository.update(fileId, { deletedAt: null });
            throw error;
        }

        this.logger.log(`Deleted file: ${fileId}`);
    }

    /**
     * List files by graphId
     */
    async listByGraph(graphId: string): Promise<FileMetadataDto[]> {
        const records = await this.repository.findByGraphId(graphId);
        return records.map((r) => ({
            id: r.id,
            originalName: r.originalName,
            mimeType: r.mimeType,
            size: r.size,
            storagePath: r.storagePath,
            storageType: r.storageType,
            previewable: r.previewable,
            createdAt: r.createdAt,
        }));
    }

    /**
     * List files by owner
     */
    async listByOwner(ownerType: FileOwnerType, ownerId: string): Promise<FileMetadataDto[]> {
        const records = await this.repository.findByOwner(ownerType, ownerId);
        return records.map((r) => ({
            id: r.id,
            originalName: r.originalName,
            mimeType: r.mimeType,
            size: r.size,
            storagePath: r.storagePath,
            storageType: r.storageType,
            previewable: r.previewable,
            createdAt: r.createdAt,
        }));
    }
}
