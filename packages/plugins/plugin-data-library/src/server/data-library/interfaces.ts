/**
 * Story 10.8: data-management 插件化迁移
 * File Storage Service Interface and Injection Token
 * 
 * This interface defines the contract for file storage operations
 * that the plugin needs from the kernel's FileStorageService.
 * 
 * Using dependency inversion: plugin defines interface,
 * kernel provides implementation via DI token.
 */

import type { FileOwnerType } from '@cdm/database';

/**
 * Injection token for FileStorageService
 */
export const FILE_STORAGE_SERVICE = 'FILE_STORAGE_SERVICE';

/**
 * Result of a file upload operation
 */
export interface FileUploadResult {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
}

/**
 * Options for file upload
 */
export interface FileUploadOptions {
    ownerType?: FileOwnerType;
    ownerId?: string;
    uploadedBy?: string;
}

/**
 * Interface for file storage operations
 * Implemented by FileStorageService in apps/api
 */
export interface IFileStorageService {
    /**
     * Upload a file
     * @param file - Express.Multer.File from multipart upload
     * @param graphId - Required: Graph ID for file isolation
     * @param options - Optional owner info
     * @returns Upload result with file ID and metadata
     */
    upload(
        file: Express.Multer.File,
        graphId: string,
        options?: FileUploadOptions,
    ): Promise<FileUploadResult>;

    /**
     * Delete a file
     * @param fileId - File ID to delete
     */
    delete(fileId: string): Promise<void>;
}
