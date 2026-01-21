/**
 * Story 10.4: Storage Adapter Interface
 * Defines the contract for file storage backends (local disk, S3, MinIO, etc.)
 */

export interface WriteOptions {
    createDir?: boolean;
}

export interface StorageAdapter {
    /**
     * Write data to storage
     * @param storagePath - Relative path within storage (e.g., "graphId/fileId.ext")
     * @param buffer - File content as Buffer
     * @param options - Optional write settings
     */
    write(storagePath: string, buffer: Buffer, options?: WriteOptions): Promise<void>;

    /**
     * Read data from storage
     * @param storagePath - Relative path within storage
     * @returns File content as Buffer
     * @throws NotFoundException if file doesn't exist
     */
    read(storagePath: string): Promise<Buffer>;

    /**
     * Delete file from storage
     * @param storagePath - Relative path within storage
     * @returns true if deleted, false if not found
     */
    delete(storagePath: string): Promise<boolean>;

    /**
     * Check if file exists in storage
     * @param storagePath - Relative path within storage
     */
    exists(storagePath: string): Promise<boolean>;
}

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');
