/**
 * Story 4.3: Contextual Comments & Mentions
 * CommentCountContext - Share unread comment counts with child components
 *
 * HIGH-5 Fix: Added context to share comment counts with MindNode components
 */

'use client';

import { createContext, useContext } from 'react';

export interface CommentCountContextType {
    /**
     * Map of nodeId -> unread comment count
     */
    unreadCounts: Record<string, number>;

    /**
     * Get unread count for a specific node
     */
    getUnreadCount: (nodeId: string) => number;

    /**
     * Refresh the unread counts
     */
    refresh: () => Promise<void>;
}

const defaultContext: CommentCountContextType = {
    unreadCounts: {},
    getUnreadCount: () => 0,
    refresh: async () => { },
};

export const CommentCountContext = createContext<CommentCountContextType>(defaultContext);

export function useCommentCountContext(): CommentCountContextType {
    return useContext(CommentCountContext);
}

export default CommentCountContext;
