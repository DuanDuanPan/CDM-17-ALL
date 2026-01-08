import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NavigationCommand } from '../NavigationCommand';
import type { Graph, Node } from '@antv/x6';

// Mock X6 Graph and Node
// Story 8.6: Added getData() with optional order for new order-based sorting
const createMockNode = (id: string, position: { x: number; y: number }, order?: number) => ({
    id,
    getPosition: vi.fn().mockReturnValue(position),
    getData: vi.fn().mockReturnValue({ order }),
    isNode: () => true,
});

/**
 * Story 2.2: Edge structure now includes kind for filtering hierarchical vs dependency edges.
 * Default kind is 'hierarchical' for backward compatibility with existing tests.
 */
interface MockEdge {
    source: string;
    target: string;
    kind?: 'hierarchical' | 'dependency';
}

const createMockGraph = () => {
    const nodes: Map<string, ReturnType<typeof createMockNode>> = new Map();
    const edges: MockEdge[] = [];

    return {
        getCellById: vi.fn((id: string) => nodes.get(id) || null),
        getIncomingEdges: vi.fn((node: ReturnType<typeof createMockNode>) => {
            const incoming = edges.filter((e) => e.target === node.id);
            return incoming.map((e) => ({
                getSourceCellId: () => e.source,
                // Story 2.2: Add getData() for edge filtering - default to hierarchical
                getData: () => ({ metadata: { kind: e.kind || 'hierarchical' } }),
            }));
        }),
        getOutgoingEdges: vi.fn((node: ReturnType<typeof createMockNode>) => {
            const outgoing = edges.filter((e) => e.source === node.id);
            return outgoing.map((e) => ({
                getTargetCellId: () => e.target,
                // Story 2.2: Add getData() for edge filtering - default to hierarchical
                getData: () => ({ metadata: { kind: e.kind || 'hierarchical' } }),
            }));
        }),
        // Test helpers
        _addNode: (node: ReturnType<typeof createMockNode>) => nodes.set(node.id, node),
        _addEdge: (source: string, target: string, kind: 'hierarchical' | 'dependency' = 'hierarchical') =>
            edges.push({ source, target, kind }),
    };
};

describe('NavigationCommand', () => {
    let command: NavigationCommand;
    let graph: ReturnType<typeof createMockGraph>;

    beforeEach(() => {
        command = new NavigationCommand();
        graph = createMockGraph();
    });

    describe('getParent', () => {
        it('should return null for root node (no incoming edges)', () => {
            const rootNode = createMockNode('root', { x: 0, y: 0 });
            graph._addNode(rootNode);

            const parent = command.getParent(graph as unknown as Graph, rootNode as unknown as Node);
            expect(parent).toBeNull();
        });

        it('should return parent node for child node', () => {
            const parentNode = createMockNode('parent', { x: 0, y: 0 });
            const childNode = createMockNode('child', { x: 200, y: 0 });

            graph._addNode(parentNode);
            graph._addNode(childNode);
            graph._addEdge('parent', 'child');

            const parent = command.getParent(graph as unknown as Graph, childNode as unknown as Node);
            expect(parent).toBe(parentNode);
        });
    });

    describe('getChildren', () => {
        it('should return empty array for node without children', () => {
            const leafNode = createMockNode('leaf', { x: 0, y: 0 });
            graph._addNode(leafNode);

            const children = command.getChildren(graph as unknown as Graph, leafNode as unknown as Node);
            expect(children).toEqual([]);
        });

        it('should return children sorted by X position (vertical layout)', () => {
            const parentNode = createMockNode('parent', { x: 100, y: 0 });
            const child1 = createMockNode('child1', { x: 200, y: 100 }); // Right
            const child2 = createMockNode('child2', { x: 50, y: 100 });  // Left
            const child3 = createMockNode('child3', { x: 100, y: 100 }); // Middle

            graph._addNode(parentNode);
            graph._addNode(child1);
            graph._addNode(child2);
            graph._addNode(child3);
            graph._addEdge('parent', 'child1');
            graph._addEdge('parent', 'child2');
            graph._addEdge('parent', 'child3');

            const children = command.getChildren(graph as unknown as Graph, parentNode as unknown as Node);

            // Should be sorted by X: child2 (x=50), child3 (x=100), child1 (x=200)
            expect(children.map((c: any) => c.id)).toEqual(['child2', 'child3', 'child1']);
        });

        it('should prioritize explicit order over X position (Story 8.6)', () => {
            const parentNode = createMockNode('parent', { x: 0, y: 0 });
            const childA = createMockNode('childA', { x: 200, y: 100 }, 2);
            const childB = createMockNode('childB', { x: 50, y: 100 }, 0);
            const childC = createMockNode('childC', { x: 100, y: 100 }, 1);

            graph._addNode(parentNode);
            graph._addNode(childA);
            graph._addNode(childB);
            graph._addNode(childC);
            graph._addEdge('parent', 'childA');
            graph._addEdge('parent', 'childB');
            graph._addEdge('parent', 'childC');

            const children = command.getChildren(graph as unknown as Graph, parentNode as unknown as Node);

            // Should be sorted by order: childB (0), childC (1), childA (2) regardless of X
            expect(children.map((c: any) => c.id)).toEqual(['childB', 'childC', 'childA']);
        });
    });

    describe('getSiblings', () => {
        it('should return only self for root node', () => {
            const rootNode = createMockNode('root', { x: 0, y: 0 });
            graph._addNode(rootNode);

            const siblings = command.getSiblings(graph as unknown as Graph, rootNode as unknown as Node);
            expect(siblings).toEqual([rootNode]);
        });

        it('should return all siblings including self', () => {
            const parentNode = createMockNode('parent', { x: 0, y: 100 });
            const sibling1 = createMockNode('sibling1', { x: 200, y: 50 });
            const sibling2 = createMockNode('sibling2', { x: 200, y: 100 });
            const sibling3 = createMockNode('sibling3', { x: 200, y: 150 });

            graph._addNode(parentNode);
            graph._addNode(sibling1);
            graph._addNode(sibling2);
            graph._addNode(sibling3);
            graph._addEdge('parent', 'sibling1');
            graph._addEdge('parent', 'sibling2');
            graph._addEdge('parent', 'sibling3');

            const siblings = command.getSiblings(graph as unknown as Graph, sibling2 as unknown as Node);

            expect(siblings.map((s: any) => s.id)).toEqual(['sibling1', 'sibling2', 'sibling3']);
        });
    });

    describe('navigateUp', () => {
        it('should return parent node (vertical layout: parent is above)', () => {
            const parentNode = createMockNode('parent', { x: 100, y: 0 });
            const childNode = createMockNode('child', { x: 100, y: 100 });

            graph._addNode(parentNode);
            graph._addNode(childNode);
            graph._addEdge('parent', 'child');

            const result = command.navigateUp(graph as unknown as Graph, childNode as unknown as Node);
            expect(result).toBe(parentNode);
        });

        it('should return null for root node', () => {
            const rootNode = createMockNode('root', { x: 0, y: 0 });
            graph._addNode(rootNode);

            const result = command.navigateUp(graph as unknown as Graph, rootNode as unknown as Node);
            expect(result).toBeNull();
        });
    });

    describe('navigateDown', () => {
        it('should return first child (vertical layout: children are below)', () => {
            const parentNode = createMockNode('parent', { x: 100, y: 0 });
            const child1 = createMockNode('child1', { x: 150, y: 100 }); // Second by X
            const child2 = createMockNode('child2', { x: 50, y: 100 });  // First by X

            graph._addNode(parentNode);
            graph._addNode(child1);
            graph._addNode(child2);
            graph._addEdge('parent', 'child1');
            graph._addEdge('parent', 'child2');

            const result = command.navigateDown(graph as unknown as Graph, parentNode as unknown as Node);
            expect(result).toBe(child2); // First child by X position
        });

        it('should return null when no children', () => {
            const leafNode = createMockNode('leaf', { x: 0, y: 0 });
            graph._addNode(leafNode);

            const result = command.navigateDown(graph as unknown as Graph, leafNode as unknown as Node);
            expect(result).toBeNull();
        });
    });

    describe('navigateLeft', () => {
        it('should return previous sibling (vertical layout: siblings are horizontal)', () => {
            const parentNode = createMockNode('parent', { x: 100, y: 0 });
            const sibling1 = createMockNode('sibling1', { x: 50, y: 100 });  // Left (first)
            const sibling2 = createMockNode('sibling2', { x: 150, y: 100 }); // Right (second)

            graph._addNode(parentNode);
            graph._addNode(sibling1);
            graph._addNode(sibling2);
            graph._addEdge('parent', 'sibling1');
            graph._addEdge('parent', 'sibling2');

            const result = command.navigateLeft(graph as unknown as Graph, sibling2 as unknown as Node);
            expect(result).toBe(sibling1);
        });

        it('should return null when at first sibling', () => {
            const parentNode = createMockNode('parent', { x: 100, y: 0 });
            const sibling1 = createMockNode('sibling1', { x: 50, y: 100 });  // First
            const sibling2 = createMockNode('sibling2', { x: 150, y: 100 });

            graph._addNode(parentNode);
            graph._addNode(sibling1);
            graph._addNode(sibling2);
            graph._addEdge('parent', 'sibling1');
            graph._addEdge('parent', 'sibling2');

            const result = command.navigateLeft(graph as unknown as Graph, sibling1 as unknown as Node);
            expect(result).toBeNull();
        });
    });

    describe('navigateRight', () => {
        it('should return next sibling (vertical layout: siblings are horizontal)', () => {
            const parentNode = createMockNode('parent', { x: 100, y: 0 });
            const sibling1 = createMockNode('sibling1', { x: 50, y: 100 });  // First
            const sibling2 = createMockNode('sibling2', { x: 150, y: 100 }); // Second

            graph._addNode(parentNode);
            graph._addNode(sibling1);
            graph._addNode(sibling2);
            graph._addEdge('parent', 'sibling1');
            graph._addEdge('parent', 'sibling2');

            const result = command.navigateRight(graph as unknown as Graph, sibling1 as unknown as Node);
            expect(result).toBe(sibling2);
        });

        it('should return null when at last sibling', () => {
            const parentNode = createMockNode('parent', { x: 100, y: 0 });
            const sibling1 = createMockNode('sibling1', { x: 50, y: 100 });
            const sibling2 = createMockNode('sibling2', { x: 150, y: 100 }); // Last

            graph._addNode(parentNode);
            graph._addNode(sibling1);
            graph._addNode(sibling2);
            graph._addEdge('parent', 'sibling1');
            graph._addEdge('parent', 'sibling2');

            const result = command.navigateRight(graph as unknown as Graph, sibling2 as unknown as Node);
            expect(result).toBeNull();
        });
    });
});
