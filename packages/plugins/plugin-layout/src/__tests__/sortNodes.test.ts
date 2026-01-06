import { describe, it, expect, vi } from 'vitest';
import {
    sortNodesRightToLeftTopToBottom,
    sortPositionsRightToLeftTopToBottom,
    sortNodesLeftToRightTopToBottom,
    sortPositionsLeftToRightTopToBottom,
} from '../utils/sortNodes';

/**
 * Unit tests for node sorting utilities
 * Sorting rule: right-to-left (X descending), top-to-bottom (Y ascending)
 */
describe('sortNodesRightToLeftTopToBottom', () => {
    // Helper to create a mock X6 Node
    const createMockNode = (id: string, x: number, y: number, data: Record<string, unknown> = {}) => ({
        id,
        getPosition: vi.fn(() => ({ x, y })),
        getData: vi.fn(() => data),
    });

    describe('Explicit order (from node data)', () => {
        it('should prioritize lower order value first when both nodes have order', () => {
            const nodeA = createMockNode('a', 0, 0, { order: 2 });
            const nodeB = createMockNode('b', 999, 999, { order: 1 });

            // Order takes precedence over position
            expect(sortNodesRightToLeftTopToBottom(nodeA as any, nodeB as any)).toBeGreaterThan(0);
            expect(sortNodesRightToLeftTopToBottom(nodeB as any, nodeA as any)).toBeLessThan(0);
        });

        it('should prioritize nodes with order over nodes without order', () => {
            const nodeWithOrder = createMockNode('ordered', 0, 0, { order: 1 });
            const nodeWithoutOrder = createMockNode('unordered', 999, 999);

            expect(sortNodesRightToLeftTopToBottom(nodeWithOrder as any, nodeWithoutOrder as any)).toBeLessThan(0);
            expect(sortNodesRightToLeftTopToBottom(nodeWithoutOrder as any, nodeWithOrder as any)).toBeGreaterThan(0);
        });
    });

    describe('Primary sort: X coordinate (descending)', () => {
        it('should sort rightmost node first', () => {
            const nodeA = createMockNode('a', 100, 50);
            const nodeB = createMockNode('b', 200, 50);

            // B (x=200) should come before A (x=100)
            expect(sortNodesRightToLeftTopToBottom(nodeA as any, nodeB as any)).toBeGreaterThan(0);
            expect(sortNodesRightToLeftTopToBottom(nodeB as any, nodeA as any)).toBeLessThan(0);
        });

        it('should handle nodes at same X with different Y', () => {
            const nodeA = createMockNode('a', 100, 50);
            const nodeB = createMockNode('b', 100, 100);

            // A (y=50) should come before B (y=100) - top to bottom
            expect(sortNodesRightToLeftTopToBottom(nodeA as any, nodeB as any)).toBeLessThan(0);
            expect(sortNodesRightToLeftTopToBottom(nodeB as any, nodeA as any)).toBeGreaterThan(0);
        });
    });

    describe('Secondary sort: Y coordinate (ascending)', () => {
        it('should sort topmost node first when X is equal', () => {
            const nodeTop = createMockNode('top', 100, 10);
            const nodeBottom = createMockNode('bottom', 100, 200);

            expect(sortNodesRightToLeftTopToBottom(nodeTop as any, nodeBottom as any)).toBeLessThan(0);
            expect(sortNodesRightToLeftTopToBottom(nodeBottom as any, nodeTop as any)).toBeGreaterThan(0);
        });
    });

    describe('Tertiary sort: ID (alphabetical)', () => {
        it('should sort by ID when X and Y are equal', () => {
            const nodeA = createMockNode('alpha', 100, 50);
            const nodeB = createMockNode('beta', 100, 50);

            // 'alpha' < 'beta' alphabetically
            expect(sortNodesRightToLeftTopToBottom(nodeA as any, nodeB as any)).toBeLessThan(0);
            expect(sortNodesRightToLeftTopToBottom(nodeB as any, nodeA as any)).toBeGreaterThan(0);
        });

        it('should return 0 for identical nodes', () => {
            const node = createMockNode('same', 100, 50);
            expect(sortNodesRightToLeftTopToBottom(node as any, node as any)).toBe(0);
        });
    });

    describe('Complex sorting scenarios', () => {
        it('should correctly sort an array of nodes', () => {
            const nodes = [
                createMockNode('c', 100, 100), // Middle X, Bottom Y
                createMockNode('a', 200, 50),  // Right X, Top Y (should be first)
                createMockNode('b', 100, 50),  // Middle X, Top Y
                createMockNode('d', 50, 50),   // Left X, Top Y (should be last)
            ];

            const sorted = [...nodes].sort((a, b) =>
                sortNodesRightToLeftTopToBottom(a as any, b as any)
            );

            // Expected order: a (rightmost), b (middle X, top Y), c (middle X, bottom Y), d (leftmost)
            expect(sorted.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd']);
        });

        it('should handle negative coordinates', () => {
            const nodeA = createMockNode('a', -100, -50);
            const nodeB = createMockNode('b', -50, -50);

            // B (x=-50) is more to the right than A (x=-100)
            expect(sortNodesRightToLeftTopToBottom(nodeA as any, nodeB as any)).toBeGreaterThan(0);
        });

        it('should handle zero coordinates', () => {
            const nodeOrigin = createMockNode('origin', 0, 0);
            const nodePositive = createMockNode('positive', 100, 100);

            // positive (x=100) should come before origin (x=0)
            expect(sortNodesRightToLeftTopToBottom(nodeOrigin as any, nodePositive as any)).toBeGreaterThan(0);
        });
    });
});

describe('sortPositionsRightToLeftTopToBottom', () => {
    describe('Primary sort: X coordinate (descending)', () => {
        it('should sort rightmost position first', () => {
            const posA = { id: 'a', x: 100, y: 50 };
            const posB = { id: 'b', x: 200, y: 50 };

            expect(sortPositionsRightToLeftTopToBottom(posA, posB)).toBeGreaterThan(0);
            expect(sortPositionsRightToLeftTopToBottom(posB, posA)).toBeLessThan(0);
        });
    });

    describe('Secondary sort: Y coordinate (ascending)', () => {
        it('should sort topmost position first when X is equal', () => {
            const posTop = { id: 'top', x: 100, y: 10 };
            const posBottom = { id: 'bottom', x: 100, y: 200 };

            expect(sortPositionsRightToLeftTopToBottom(posTop, posBottom)).toBeLessThan(0);
        });
    });

    describe('Tertiary sort: ID', () => {
        it('should sort by ID when X and Y are equal', () => {
            const posA = { id: 'alpha', x: 100, y: 50 };
            const posB = { id: 'beta', x: 100, y: 50 };

            expect(sortPositionsRightToLeftTopToBottom(posA, posB)).toBeLessThan(0);
        });

        it('should return 0 when no ID is provided and positions are equal', () => {
            const posA = { x: 100, y: 50 };
            const posB = { x: 100, y: 50 };

            expect(sortPositionsRightToLeftTopToBottom(posA, posB)).toBe(0);
        });
    });

    describe('Array sorting', () => {
        it('should correctly sort an array of positions', () => {
            const positions = [
                { id: 'd', x: 50, y: 50 },
                { id: 'a', x: 200, y: 50 },
                { id: 'c', x: 100, y: 100 },
                { id: 'b', x: 100, y: 50 },
            ];

            const sorted = [...positions].sort(sortPositionsRightToLeftTopToBottom);

            expect(sorted.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
        });
    });
});

describe('sortNodesLeftToRightTopToBottom', () => {
    const createMockNode = (id: string, x: number, y: number, data: Record<string, unknown> = {}) => ({
        id,
        getPosition: vi.fn(() => ({ x, y })),
        getData: vi.fn(() => data),
    });

    it('should sort leftmost node first', () => {
        const nodeA = createMockNode('a', 100, 50);
        const nodeB = createMockNode('b', 200, 50);
        expect(sortNodesLeftToRightTopToBottom(nodeA as any, nodeB as any)).toBeLessThan(0);
        expect(sortNodesLeftToRightTopToBottom(nodeB as any, nodeA as any)).toBeGreaterThan(0);
    });

    it('should prioritize explicit order before position', () => {
        const nodeA = createMockNode('a', 0, 0, { order: 2 });
        const nodeB = createMockNode('b', 999, 999, { order: 1 });
        expect(sortNodesLeftToRightTopToBottom(nodeA as any, nodeB as any)).toBeGreaterThan(0);
        expect(sortNodesLeftToRightTopToBottom(nodeB as any, nodeA as any)).toBeLessThan(0);
    });
});

describe('sortPositionsLeftToRightTopToBottom', () => {
    it('should sort leftmost position first', () => {
        const a = { x: 0, y: 0, id: 'a' };
        const b = { x: 10, y: 0, id: 'b' };
        expect(sortPositionsLeftToRightTopToBottom(a, b)).toBeLessThan(0);
        expect(sortPositionsLeftToRightTopToBottom(b, a)).toBeGreaterThan(0);
    });

    it('should sort by Y when X is equal', () => {
        const a = { x: 0, y: 0, id: 'a' };
        const b = { x: 0, y: 10, id: 'b' };
        expect(sortPositionsLeftToRightTopToBottom(a, b)).toBeLessThan(0);
        expect(sortPositionsLeftToRightTopToBottom(b, a)).toBeGreaterThan(0);
    });
});
