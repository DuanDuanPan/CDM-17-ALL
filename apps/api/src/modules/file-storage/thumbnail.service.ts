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


@Injectable()
export class ThumbnailService {
    private readonly logger = new Logger(ThumbnailService.name);

    /**
     * Check if the given MIME type supports thumbnail generation
     */
    canGenerateThumbnail(mimeType: string): boolean {
        return THUMBNAIL_SUPPORTED_TYPES.has(mimeType);
    }

    /**
     * Generate a thumbnail from an image buffer or local file path
     * @param input - Original image buffer or local file path
     * @param options - Thumbnail generation options
     * @returns Thumbnail buffer (default: webp format)
     */
    async generate(input: Buffer | string, options: ThumbnailOptions = {}): Promise<Buffer> {
        const { width, height, format } = { ...DEFAULT_OPTIONS, ...options };

        try {
            const thumbnailBuffer = await sharp(input)
                .rotate()
                .resize(width, height, {
                    fit: 'cover',      // Crop to fill the dimensions
                    position: 'center',
                    withoutEnlargement: true,
                })
                .toFormat(format, { quality: 80 })
                .toBuffer();

            this.logger.debug(`Generated ${format} thumbnail: ${width}x${height}`);
            return thumbnailBuffer;
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Failed to generate thumbnail: ${error.message}`, error.stack);
            } else {
                this.logger.error(`Failed to generate thumbnail: ${String(error)}`);
            }
            throw error;
        }
    }
}
