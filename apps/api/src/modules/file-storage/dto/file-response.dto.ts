/**
 * Story 10.4: File Response DTO
 * Story 10.6: Added thumbnailUrl field and Swagger decorators
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { StorageType } from '@cdm/database';

export class FileResponseDto {
    @ApiProperty({ description: 'Unique file identifier' })
    id: string;

    @ApiProperty({ description: 'Original filename uploaded by user' })
    originalName: string;

    @ApiProperty({ description: 'MIME type of the file', example: 'image/png' })
    mimeType: string;

    @ApiProperty({ description: 'File size in bytes' })
    size: number;

    @ApiProperty({ description: 'Storage path relative to upload root' })
    storagePath: string;

    @ApiProperty({ description: 'Storage type (LOCAL or S3)', enum: ['LOCAL', 'S3'] })
    storageType: StorageType;

    @ApiProperty({ description: 'Whether the file can be previewed inline' })
    previewable: boolean;

    @ApiPropertyOptional({ description: 'Thumbnail URL for image files', example: '/api/files/{id}/thumbnail' })
    thumbnailUrl?: string;

    @ApiProperty({ description: 'File creation timestamp' })
    createdAt: Date;
}

