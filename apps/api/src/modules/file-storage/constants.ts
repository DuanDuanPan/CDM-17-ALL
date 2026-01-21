/**
 * Story 10.5: Shared File Storage Constants
 * Extracted from file-storage.controller.ts and attachments.controller.ts
 * to avoid magic number duplication.
 */

/**
 * Maximum file size for uploads (10MB)
 * Used by both FileStorageController and AttachmentsController
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * File owner types for FileRecord
 * Matches Prisma enum FileOwnerType
 */
export const FileOwnerType = {
    DELIVERABLE: 'DELIVERABLE',
    DATA_ASSET: 'DATA_ASSET',
    ATTACHMENT: 'ATTACHMENT',
} as const;

export type FileOwnerType = typeof FileOwnerType[keyof typeof FileOwnerType];
