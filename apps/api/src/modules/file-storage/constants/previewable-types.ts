/**
 * Story 10.4: Shared previewable MIME type constants
 * Used by both FileStorageService and FileStorageController
 */

/**
 * MIME types that can be previewed inline in browser (Content-Disposition: inline)
 */
export const PREVIEWABLE_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
]);

/**
 * Check if a MIME type is previewable
 */
export function isPreviewableMimeType(mimeType: string): boolean {
    return PREVIEWABLE_MIME_TYPES.has(mimeType);
}
