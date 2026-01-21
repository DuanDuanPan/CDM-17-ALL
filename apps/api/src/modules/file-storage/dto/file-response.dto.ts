/**
 * Story 10.4: File Response DTO
 */

import type { StorageType } from '@cdm/database';

export class FileResponseDto {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
    storageType: StorageType;
    previewable: boolean;
    createdAt: Date;
}
