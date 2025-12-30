/**
 * Story 7.5: Comments API Service
 * Centralized API calls for comment-related operations
 *
 * Refactoring:
 * - Extracted from CommentPanel.tsx mark-as-read fetch call (1 instance)
 * - Extracted from CommentItem.tsx attachment download (1 instance)
 */

/**
 * Mark all comments on a node as read for a user
 */
export async function markCommentsAsRead(
    nodeId: string,
    userId: string
): Promise<void> {
    try {
        const response = await fetch(`/api/comments/${nodeId}/read`, {
            method: 'POST',
            headers: { 'x-user-id': userId },
        });

        if (!response.ok) {
            throw new Error(`Failed to mark comments as read: ${response.status}`);
        }
    } catch (error) {
        console.error('[comments.api] Error marking as read:', error);
        throw error;
    }
}

/**
 * Download an attachment with authentication
 * Returns a Blob that can be used for display or download
 */
export async function downloadAttachment(
    url: string,
    userId: string
): Promise<Blob> {
    const response = await fetch(url, {
        headers: {
            'x-user-id': userId,
        },
    });

    if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
    }

    return await response.blob();
}

/**
 * Helper to trigger file download from blob
 */
export function triggerBlobDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Clean up blob URL after a delay
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Helper to open blob in new tab (for images)
 */
export function openBlobInNewTab(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Clean up blob URL after a delay
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}
