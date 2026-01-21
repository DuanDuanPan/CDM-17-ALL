/**
 * Story 10.4: File Storage Repository
 * Encapsulates FileRecord database operations following Repository pattern
 */

import { Injectable } from '@nestjs/common';
import { prisma } from '@cdm/database';
import type { FileOwnerType, FileRecord, Prisma, StorageType } from '@cdm/database';

export interface CreateFileRecordDto {
    id?: string;
    graphId: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    storagePath: string;
    storageType?: StorageType;
    thumbnailPath?: string;
    previewable?: boolean;
    ownerType?: FileOwnerType;
    ownerId?: string;
    uploadedBy?: string;
}

export interface FileQueryOptions {
    graphId?: string;
    ownerType?: FileOwnerType;
    ownerId?: string;
    includeDeleted?: boolean;
}

export type UpdateFileRecordDto = Prisma.FileRecordUpdateInput;

@Injectable()
export class FileStorageRepository {
    /**
     * Create a new file record
     */
    async create(data: CreateFileRecordDto): Promise<FileRecord> {
        return prisma.fileRecord.create({
            data: {
                ...(data.id ? { id: data.id } : {}),
                graphId: data.graphId,
                originalName: data.originalName,
                storedName: data.storedName,
                mimeType: data.mimeType,
                size: data.size,
                storagePath: data.storagePath,
                storageType: data.storageType ?? 'LOCAL',
                thumbnailPath: data.thumbnailPath,
                previewable: data.previewable ?? false,
                ownerType: data.ownerType,
                ownerId: data.ownerId,
                uploadedBy: data.uploadedBy,
            },
        });
    }

    /**
     * Find file record by ID
     */
    async findById(id: string): Promise<FileRecord | null> {
        return prisma.fileRecord.findUnique({
            where: { id },
        });
    }

    /**
     * Find file record by ID (non-deleted only)
     */
    async findByIdActive(id: string): Promise<FileRecord | null> {
        return prisma.fileRecord.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });
    }

    /**
     * Find files by graphId
     */
    async findByGraphId(graphId: string, options?: FileQueryOptions): Promise<FileRecord[]> {
        const where: Prisma.FileRecordWhereInput = { graphId };

        if (!options?.includeDeleted) {
            where.deletedAt = null;
        }
        if (options?.ownerType) {
            where.ownerType = options.ownerType;
        }
        if (options?.ownerId) {
            where.ownerId = options.ownerId;
        }

        return prisma.fileRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find files by owner (type + id)
     */
    async findByOwner(ownerType: FileOwnerType, ownerId: string): Promise<FileRecord[]> {
        return prisma.fileRecord.findMany({
            where: {
                ownerType,
                ownerId,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Soft delete a file record
     */
    async softDelete(id: string): Promise<FileRecord> {
        return prisma.fileRecord.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    /**
     * Hard delete a file record
     */
    async hardDelete(id: string): Promise<boolean> {
        try {
            await prisma.fileRecord.delete({
                where: { id },
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Update file record
     */
    async update(id: string, data: UpdateFileRecordDto): Promise<FileRecord> {
        return prisma.fileRecord.update({
            where: { id },
            data,
        });
    }
}
