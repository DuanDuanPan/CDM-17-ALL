/**
 * Story 4.3: Contextual Comments & Mentions
 * CommentCountStore - Global store for unread comment counts
 * 
 * This store is used because X6 graph nodes (MindNode) are rendered via portals
 * outside the React tree, so they cannot access React Context.
 * 
 * This provides a simple pub/sub mechanism to share unread counts globally.
 */

// Store state
let unreadCounts: Record<string, number> = {};
const subscribers = new Set<() => void>();

/**
 * Get unread count for a specific node
 */
export function getUnreadCount(nodeId: string): number {
    return unreadCounts[nodeId] || 0;
}

/**
 * Get all unread counts
 */
export function getAllUnreadCounts(): Record<string, number> {
    return { ...unreadCounts };
}

/**
 * Set all unread counts (called from useCommentCount hook)
 */
export function setUnreadCounts(counts: Record<string, number>): void {
    unreadCounts = counts;
    // Notify all subscribers
    subscribers.forEach(callback => callback());
}

/**
 * Clear all unread counts
 */
export function clearUnreadCounts(): void {
    unreadCounts = {};
    subscribers.forEach(callback => callback());
}

/**
 * Subscribe to changes
 * Returns unsubscribe function
 */
export function subscribe(callback: () => void): () => void {
    subscribers.add(callback);
    return () => {
        subscribers.delete(callback);
    };
}

/**
 * React hook to use in MindNode components (works outside Context)
 */
export function useCommentCountStore(nodeId: string): number {
    // For SSR safety, use client-only import pattern
    if (typeof window === 'undefined') {
        return 0;
    }

    // We use a simple approach: MindNode doesn't need to re-render for count changes
    // because the page.tsx Provider already re-renders GraphComponent when counts change
    // which triggers MindNode re-render through X6's data change mechanism
    return getUnreadCount(nodeId);
}
