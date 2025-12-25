/**
 * Story 4.4: Watch & Subscription
 * SubscriptionStore - Global store for subscription state
 *
 * Similar pattern to commentCountStore.ts, used because X6 graph nodes
 * are rendered via portals outside the React tree (cannot access Context).
 */

// Store state: Set of subscribed node IDs for the current user
let subscribedNodeIds: Set<string> = new Set();
const subscribers = new Set<() => void>();

/**
 * Check if a node is subscribed by the current user
 */
export function isSubscribed(nodeId: string): boolean {
    return subscribedNodeIds.has(nodeId);
}

/**
 * Get all subscribed node IDs
 */
export function getSubscribedNodeIds(): Set<string> {
    return new Set(subscribedNodeIds);
}

/**
 * Set the subscribed node IDs (called from GraphComponent on load)
 */
export function setSubscriptions(nodeIds: string[]): void {
    subscribedNodeIds = new Set(nodeIds);
    notifySubscribers();
}

/**
 * Add a subscription (optimistic update)
 */
export function addSubscription(nodeId: string): void {
    subscribedNodeIds.add(nodeId);
    notifySubscribers();
}

/**
 * Remove a subscription (optimistic update)
 */
export function removeSubscription(nodeId: string): void {
    subscribedNodeIds.delete(nodeId);
    notifySubscribers();
}

/**
 * Clear all subscriptions
 */
export function clearSubscriptions(): void {
    subscribedNodeIds.clear();
    notifySubscribers();
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
 * Notify all subscribers of state change
 */
function notifySubscribers(): void {
    subscribers.forEach((callback) => callback());
}
