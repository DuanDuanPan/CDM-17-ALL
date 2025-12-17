import { Node } from '@antv/x6';

/**
 * Sort nodes: right-to-left (X descending), top-to-bottom (Y ascending)
 *
 * Sorting priority:
 * 1. X coordinate (descending) - rightmost nodes come first
 * 2. Y coordinate (ascending) - topmost nodes come first
 * 3. Node ID (alphabetical) - stable sort fallback
 *
 * This sorting logic ensures that:
 * - Nodes positioned further to the right appear first in the hierarchy
 * - Among nodes at the same X position, higher nodes (smaller Y) appear first
 * - Nodes at identical positions are sorted by ID for deterministic ordering
 *
 * @param a First node to compare
 * @param b Second node to compare
 * @returns Negative if a should come first, positive if b should come first, 0 if equal
 */
export function sortNodesRightToLeftTopToBottom(a: Node, b: Node): number {
    const posA = a.getPosition();
    const posB = b.getPosition();

    // Primary: X descending (right to left)
    if (posA.x !== posB.x) {
        return posB.x - posA.x;
    }

    // Secondary: Y ascending (top to bottom)
    if (posA.y !== posB.y) {
        return posA.y - posB.y;
    }

    // Tertiary: ID for stable sort
    return a.id.localeCompare(b.id);
}

/**
 * Generic position-based comparator for objects with x, y coordinates
 * Useful for sorting data objects before they become X6 nodes
 *
 * @param a First position object
 * @param b Second position object
 * @returns Negative if a should come first, positive if b should come first, 0 if equal
 */
export function sortPositionsRightToLeftTopToBottom(
    a: { x: number; y: number; id?: string },
    b: { x: number; y: number; id?: string }
): number {
    // Primary: X descending (right to left)
    if (a.x !== b.x) {
        return b.x - a.x;
    }

    // Secondary: Y ascending (top to bottom)
    if (a.y !== b.y) {
        return a.y - b.y;
    }

    // Tertiary: ID for stable sort (if available)
    if (a.id && b.id) {
        return a.id.localeCompare(b.id);
    }

    return 0;
}
