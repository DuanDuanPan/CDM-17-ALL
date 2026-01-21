/**
 * Story 10.4: Local Disk Storage Adapter
 * Implements StorageAdapter for local filesystem storage with path safety checks
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageAdapter, WriteOptions } from './storage-adapter.interface';

@Injectable()
export class LocalDiskAdapter implements StorageAdapter {
    private readonly logger = new Logger(LocalDiskAdapter.name);
    private readonly baseDir: string;

    constructor() {
        // Base directory for all uploads, organized by graphId
        this.baseDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
        this.ensureBaseDir();
    }

    /**
     * Ensure base upload directory exists
     */
    private async ensureBaseDir(): Promise<void> {
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
            this.logger.log(`Upload directory ready: ${this.baseDir}`);
        } catch (error) {
            this.logger.error(`Failed to create upload directory: ${error}`);
        }
    }

    /**
     * Sanitize path component to prevent directory traversal attacks
     * @param component - Path component (e.g., graphId, filename)
     * @returns Sanitized component safe for path construction
     * @throws Error if component contains traversal attempts
     */
    private sanitizePath(component: string): string {
        // Remove any path separators and parent directory references
        const sanitized = component
            .replace(/\.\./g, '') // Remove parent directory traversal
            .replace(/[/\\]/g, '') // Remove path separators
            .split('').filter(c => c.charCodeAt(0) >= 32).join(''); // Remove control characters

        if (!sanitized || sanitized !== component) {
            throw new Error(`Invalid path component: ${component}`);
        }

        return sanitized;
    }

    /**
     * Build safe absolute path from relative storage path
     * @param storagePath - Relative path (e.g., "graphId/fileId.ext")
     * @returns Absolute path within baseDir
     */
    private buildSafePath(storagePath: string): string {
        // Split path and sanitize each component
        const components = storagePath.split('/').filter(Boolean);
        const sanitizedComponents = components.map((c) => this.sanitizePath(c));
        const absolutePath = path.join(this.baseDir, ...sanitizedComponents);

        // Verify result is still within baseDir (belt and suspenders)
        const normalizedBase = path.resolve(this.baseDir);
        const normalizedTarget = path.resolve(absolutePath);
        const basePrefix = normalizedBase.endsWith(path.sep)
            ? normalizedBase
            : normalizedBase + path.sep;

        if (!normalizedTarget.startsWith(basePrefix)) {
            throw new Error(`Path traversal detected: ${storagePath}`);
        }

        return absolutePath;
    }

    async write(storagePath: string, buffer: Buffer, options?: WriteOptions): Promise<void> {
        const absolutePath = this.buildSafePath(storagePath);

        // Ensure parent directory exists
        if (options?.createDir !== false) {
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        }

        await fs.writeFile(absolutePath, buffer);
        this.logger.debug(`Written file: ${storagePath}`);
    }

    async read(storagePath: string): Promise<Buffer> {
        const absolutePath = this.buildSafePath(storagePath);

        try {
            return await fs.readFile(absolutePath);
        } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new NotFoundException(`File not found: ${storagePath}`);
            }
            throw error;
        }
    }

    async delete(storagePath: string): Promise<boolean> {
        const absolutePath = this.buildSafePath(storagePath);

        try {
            await fs.unlink(absolutePath);
            this.logger.debug(`Deleted file: ${storagePath}`);
            return true;
        } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    async exists(storagePath: string): Promise<boolean> {
        const absolutePath = this.buildSafePath(storagePath);

        try {
            await fs.access(absolutePath);
            return true;
        } catch {
            return false;
        }
    }
}
