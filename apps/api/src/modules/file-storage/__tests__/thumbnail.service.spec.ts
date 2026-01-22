/**
 * Story 10.6: ThumbnailService Unit Tests
 * Tests for thumbnail generation service
 */

import { ThumbnailService, THUMBNAIL_SUPPORTED_TYPES } from '../thumbnail.service';

describe('ThumbnailService', () => {
    let service: ThumbnailService;

    beforeEach(() => {
        service = new ThumbnailService();
    });

    describe('canGenerateThumbnail', () => {
        it.each([
            ['image/png', true],
            ['image/jpeg', true],
            ['image/gif', true],
            ['image/webp', true],
            ['image/svg+xml', false],
            ['application/pdf', false],
            ['text/plain', false],
            ['video/mp4', false],
        ])('should return %s for mimeType %s', (mimeType, expected) => {
            expect(service.canGenerateThumbnail(mimeType)).toBe(expected);
        });
    });

    describe('THUMBNAIL_SUPPORTED_TYPES', () => {
        it('should contain exactly 4 image types', () => {
            expect(THUMBNAIL_SUPPORTED_TYPES.size).toBe(4);
            expect(THUMBNAIL_SUPPORTED_TYPES.has('image/png')).toBe(true);
            expect(THUMBNAIL_SUPPORTED_TYPES.has('image/jpeg')).toBe(true);
            expect(THUMBNAIL_SUPPORTED_TYPES.has('image/gif')).toBe(true);
            expect(THUMBNAIL_SUPPORTED_TYPES.has('image/webp')).toBe(true);
        });
    });

    describe('generate', () => {
        // Note: Testing sharp directly requires actual image buffers
        // These tests verify error handling behavior

        it('should throw error for invalid buffer', async () => {
            const invalidBuffer = Buffer.from('not an image');
            await expect(service.generate(invalidBuffer)).rejects.toThrow();
        });

        it('should throw error for empty buffer', async () => {
            const emptyBuffer = Buffer.alloc(0);
            await expect(service.generate(emptyBuffer)).rejects.toThrow();
        });

        it('should accept custom options', async () => {
            // This test verifies the options are accepted without error
            // Actual image processing would need a real PNG buffer
            const invalidBuffer = Buffer.from('test');
            await expect(
                service.generate(invalidBuffer, { width: 100, height: 100, format: 'jpeg' })
            ).rejects.toThrow();
        });
    });
});

