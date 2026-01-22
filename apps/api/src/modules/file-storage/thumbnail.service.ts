/**
 * Story 10.6: Thumbnail Service
 * Generates thumbnails for image files using sharp library
 */

import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ThumbnailOptions {
    width?: number;
    height?: number;
    format?: 'webp' | 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
    width: 200,
    height: 200,
    format: 'webp',
};

/**
 * MIME types that can have thumbnails generated
 */
export const THUMBNAIL_SUPPORTED_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
]);

/**
 * Check if a MIME type supports thumbnail generation
 */
export function canGenerateThumbnail(mimeType: string): boolean {
    return THUMBNAIL_SUPPORTED_TYPES.has(mimeType);
}

@Injectable()
export class ThumbnailService {
    private readonly logger = new Logger(ThumbnailService.name);

    /**
     * Check if the given MIME type supports thumbnail generation
     */
    canGenerateThumbnail(mimeType: string): boolean {
        return canGenerateThumbnail(mimeType);
    }

    /**
     * Generate a thumbnail from an image buffer
     * @param buffer - Original image buffer
     * @param options - Thumbnail generation options
     * @returns Thumbnail buffer (default: webp format)
     */
    async generate(buffer: Buffer, options: ThumbnailOptions = {}): Promise<Buffer> {
        const { width, height, format } = { ...DEFAULT_OPTIONS, ...options };

        try {
            const thumbnailBuffer = await sharp(buffer)
                .resize(width, height, {
                    fit: 'cover',      // Crop to fill the dimensions
                    position: 'center',
                })
                .toFormat(format, { quality: 80 })
                .toBuffer();

            this.logger.debug(`Generated ${format} thumbnail: ${width}x${height}`);
            return thumbnailBuffer;
        } catch (error) {
            this.logger.error(`Failed to generate thumbnail: ${String(error)}`);
            throw error;
        }
    }
}
