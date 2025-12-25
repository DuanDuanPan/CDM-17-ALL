/**
 * Story 4.3: Contextual Comments & Mentions
 * useCommentCount Hook - Track unread comment counts per node
 */

import { useState, useEffect, useCallback } from 'react';
import { setUnreadCounts as setGlobalUnreadCounts } from '@/lib/commentCountStore';

export interface UseCommentCountOptions {
    mindmapId: string | null;
    userId: string;
    pollInterval?: number; // Default: 30 seconds
}

export interface UseCommentCountReturn {
    unreadCounts: Record<string, number>;
    getUnreadCount: (nodeId: string) => number;
    refresh: () => Promise<void>;
    isLoading: boolean;
}

export function useCommentCount({
    mindmapId,
    userId,
    pollInterval = 30000,
}: UseCommentCountOptions): UseCommentCountReturn {
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Fetch unread counts
    const fetchUnreadCounts = useCallback(async () => {
        if (!mindmapId) return;

        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/comments/unread?mindmapId=${encodeURIComponent(mindmapId)}`,
                {
                    headers: {
                        'x-user-id': userId,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setUnreadCounts(data);
                // Sync to global store for X6 portal components (MindNode)
                setGlobalUnreadCounts(data);
            }
        } catch (err) {
            console.error('[useCommentCount] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [mindmapId, userId]);

    // Get unread count for a specific node
    const getUnreadCount = useCallback(
        (nodeId: string): number => {
            return unreadCounts[nodeId] || 0;
        },
        [unreadCounts]
    );

    // Initial fetch and polling
    useEffect(() => {
        if (!mindmapId) return;

        fetchUnreadCounts();

        const intervalId = setInterval(fetchUnreadCounts, pollInterval);

        return () => {
            clearInterval(intervalId);
        };
    }, [mindmapId, fetchUnreadCounts, pollInterval]);

    return {
        unreadCounts,
        getUnreadCount,
        refresh: fetchUnreadCounts,
        isLoading,
    };
}
