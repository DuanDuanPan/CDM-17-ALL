'use client';

/**
 * Story 7.5: Comment Actions Hook
 * Encapsulates comment-related actions that aren't in useComments
 * Pattern: Follows Story 7.2's useApproval hook structure
 *
 * Used by: CommentPanel (mark as read), CommentItem (download attachment)
 *
 * Note: This complements the existing useComments hook which handles
 * fetching/creating/deleting comments. This hook handles:
 * - Mark comments as read
 * - Download attachments
 */

import { useState, useCallback } from 'react';
import {
    markCommentsAsRead,
    downloadAttachment,
    triggerBlobDownload,
    openBlobInNewTab,
} from '@/lib/api/comments';

export interface UseCommentActionsReturn {
    // State
    isMarkingRead: boolean;
    isDownloading: boolean;
    error: string | null;

    // Actions
    markAsRead: (nodeId: string, userId: string) => Promise<void>;
    downloadFile: (url: string, userId: string, fileName: string) => Promise<void>;
    viewImage: (url: string, userId: string) => Promise<void>;
    clearError: () => void;
}

export function useCommentActions(): UseCommentActionsReturn {
    const [isMarkingRead, setIsMarkingRead] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mark comments as read
    const markAsRead = useCallback(async (nodeId: string, userId: string) => {
        setIsMarkingRead(true);
        setError(null);
        try {
            await markCommentsAsRead(nodeId, userId);
        } catch (err) {
            const message = err instanceof Error ? err.message : '标记已读失败';
            console.error('[useCommentActions] Mark as read failed:', err);
            setError(message);
            // Don't throw - this is non-critical
        } finally {
            setIsMarkingRead(false);
        }
    }, []);

    // Download file attachment
    const downloadFile = useCallback(async (
        url: string,
        userId: string,
        fileName: string
    ) => {
        setIsDownloading(true);
        setError(null);
        try {
            const blob = await downloadAttachment(url, userId);
            triggerBlobDownload(blob, fileName);
        } catch (err) {
            const message = err instanceof Error ? err.message : '下载失败';
            console.error('[useCommentActions] Download failed:', err);
            setError(message);
            throw err;
        } finally {
            setIsDownloading(false);
        }
    }, []);

    // View image in new tab
    const viewImage = useCallback(async (url: string, userId: string) => {
        setIsDownloading(true);
        setError(null);
        try {
            const blob = await downloadAttachment(url, userId);
            openBlobInNewTab(blob);
        } catch (err) {
            const message = err instanceof Error ? err.message : '加载图片失败';
            console.error('[useCommentActions] View image failed:', err);
            setError(message);
            throw err;
        } finally {
            setIsDownloading(false);
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isMarkingRead,
        isDownloading,
        error,
        markAsRead,
        downloadFile,
        viewImage,
        clearError,
    };
}

export default useCommentActions;
