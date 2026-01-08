/**
 * Story 8.4: Unit tests for useOutlineData hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOutlineData } from '../../components/graph/hooks/useOutlineData';
import type { Graph } from '@antv/x6';

// Mock X6 Graph and Node
type MockNode = {
    id: string;
    isNode: () => boolean;
    getData: () => Record<string, unknown>;
    setData: ReturnType<typeof vi.fn>;
};

type MockEdge = {
    id: string;
    getData: () => Record<string, unknown>;
    getSourceCellId: () => string | null;
    getTargetCellId: () => string | null;
};

function createMockGraph() {
    const nodes = new Map<string, MockNode>();
    const edges = new Map<string, MockEdge>();
    const eventListeners = new Map<string, Set<() => void>>();

    const createMockNode = (id: string, data: Record<string, unknown> = {}): MockNode => ({
        id,
        isNode: () => true,
        getData: () => data,
        setData: vi.fn((newData: Record<string, unknown>) => {
            Object.assign(data, newData);
        }),
    });

    const createMockEdge = (
        source: string,
        target: string,
        kind: 'hierarchical' | 'dependency' = 'hierarchical'
    ): MockEdge => ({
        id: `${source}-${target}`,
        getData: () => ({ metadata: { kind } }),
        getSourceCellId: () => source,
        getTargetCellId: () => target,
    });

    const graph = {
        getCellById: vi.fn((id: string) => nodes.get(id) || null),
        getNodes: vi.fn(() => Array.from(nodes.values())),
        getOutgoingEdges: vi.fn((cell: MockNode | string) => {
            const id = typeof cell === 'string' ? cell : cell.id;
            return Array.from(edges.values()).filter((edge) => edge.getSourceCellId() === id);
        }),
        getIncomingEdges: vi.fn((cell: MockNode | string) => {
            const id = typeof cell === 'string' ? cell : cell.id;
            return Array.from(edges.values()).filter((edge) => edge.getTargetCellId() === id);
        }),
        addEdge: vi.fn((options: { source: { cell: string }; target: { cell: string } }) => {
            const edge = createMockEdge(options.source.cell, options.target.cell);
            edges.set(edge.id, edge);
            return edge;
        }),
        removeEdge: vi.fn((edgeId: string) => {
            edges.delete(edgeId);
        }),
        batchUpdate: vi.fn((fn: () => void) => fn()),
        on: vi.fn((event: string, handler: () => void) => {
            if (!eventListeners.has(event)) {
                eventListeners.set(event, new Set());
            }
            eventListeners.get(event)!.add(handler);
        }),
        off: vi.fn((event: string, handler: () => void) => {
            eventListeners.get(event)?.delete(handler);
        }),
    };

    return {
        graph: graph as unknown as Graph,
        nodes,
        edges,
        eventListeners,
        addNode: (id: string, data: Record<string, unknown> = {}) => {
            const node = createMockNode(id, data);
            nodes.set(id, node);
            return node;
        },
        addEdge: (
            source: string,
            target: string,
            kind: 'hierarchical' | 'dependency' = 'hierarchical'
        ) => {
            const edge = createMockEdge(source, target, kind);
            edges.set(edge.id, edge);
            return edge;
        },
        emit: (event: string) => {
            eventListeners.get(event)?.forEach((handler) => handler());
        },
    };
}

describe('useOutlineData', () => {
    let mockGraph: ReturnType<typeof createMockGraph>;

    beforeEach(() => {
        mockGraph = createMockGraph();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('outlineData - tree building', () => {
        it('should return empty array when graph is not ready', () => {
            const { result } = renderHook(() =>
                useOutlineData({ graph: null, isReady: false })
            );

            expect(result.current.outlineData).toEqual([]);
        });

        it('should return empty array for empty graph', () => {
            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.outlineData).toEqual([]);
        });

        it('should build tree with single root node', () => {
            mockGraph.addNode('root', { label: 'Root Node', type: 'topic' });

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.outlineData).toHaveLength(1);
            expect(result.current.outlineData[0]).toMatchObject({
                id: 'root',
                label: 'Root Node',
                type: 'topic',
                depth: 0,
                hasChildren: false,
                children: [],
            });
        });

        it('should build tree with parent-child hierarchy', () => {
            mockGraph.addNode('parent', { label: 'Parent', mindmapType: 'topic' });
            mockGraph.addNode('child', { label: 'Child', mindmapType: 'subtopic', nodeType: 'TASK' });
            mockGraph.addEdge('parent', 'child');

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.outlineData).toHaveLength(1);
            const parent = result.current.outlineData[0];
            expect(parent.id).toBe('parent');
            expect(parent.hasChildren).toBe(true);
            expect(parent.children).toHaveLength(1);
            expect(parent.children[0]).toMatchObject({
                id: 'child',
                label: 'Child',
                type: 'subtopic',
                nodeType: 'TASK',
                depth: 1,
            });
        });

        it('should build multi-level nested tree correctly', () => {
            mockGraph.addNode('root', { label: 'Root', order: 0 });
            mockGraph.addNode('child1', { label: 'Child 1', order: 0 });
            mockGraph.addNode('child2', { label: 'Child 2', order: 1 });
            mockGraph.addNode('grandchild', { label: 'Grandchild', order: 0 });
            mockGraph.addEdge('root', 'child1');
            mockGraph.addEdge('root', 'child2');
            mockGraph.addEdge('child1', 'grandchild');

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            const root = result.current.outlineData[0];
            expect(root.children).toHaveLength(2);
            expect(root.children[0].id).toBe('child1');
            expect(root.children[0].depth).toBe(1);
            expect(root.children[0].children).toHaveLength(1);
            expect(root.children[0].children[0].id).toBe('grandchild');
            expect(root.children[0].children[0].depth).toBe(2);
        });

        it('should sort children by order field', () => {
            mockGraph.addNode('parent', { label: 'Parent' });
            mockGraph.addNode('c', { label: 'C', order: 2 });
            mockGraph.addNode('a', { label: 'A', order: 0 });
            mockGraph.addNode('b', { label: 'B', order: 1 });
            mockGraph.addEdge('parent', 'c');
            mockGraph.addEdge('parent', 'a');
            mockGraph.addEdge('parent', 'b');

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            const parent = result.current.outlineData[0];
            expect(parent.children.map((c) => c.id)).toEqual(['a', 'b', 'c']);
        });

        it('should use default label for nodes without label', () => {
            mockGraph.addNode('node-1', {});

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.outlineData[0].label).toBe('Untitled');
        });

        it('should skip dependency edges when building tree', () => {
            mockGraph.addNode('parent', { label: 'Parent' });
            mockGraph.addNode('child', { label: 'Child' });
            mockGraph.addNode('dependency', { label: 'Dependency' });
            mockGraph.addEdge('parent', 'child', 'hierarchical');
            mockGraph.addEdge('parent', 'dependency', 'dependency');

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            // dependency node should be at root level
            expect(result.current.outlineData).toHaveLength(2);
            const parent = result.current.outlineData.find((n) => n.id === 'parent');
            expect(parent?.children).toHaveLength(1);
            expect(parent?.children[0].id).toBe('child');
        });
    });

    describe('refresh', () => {
        it('should trigger re-computation of outline data', () => {
            mockGraph.addNode('node-1', { label: 'Initial' });

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.outlineData[0].label).toBe('Initial');

            // Modify node data
            const nodeData = mockGraph.nodes.get('node-1')?.getData();
            if (nodeData) {
                nodeData.label = 'Updated';
            }

            // Refresh
            act(() => {
                result.current.refresh();
            });

            expect(result.current.outlineData[0].label).toBe('Updated');
        });
    });

    describe('reorderNode', () => {
        it('should move node to new parent', () => {
            mockGraph.addNode('parent1', { label: 'Parent 1' });
            mockGraph.addNode('parent2', { label: 'Parent 2' });
            mockGraph.addNode('child', { label: 'Child' });
            mockGraph.addEdge('parent1', 'child');

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.reorderNode('child', 'parent2', 0);
            });

            // Check that old edge was removed
            expect(mockGraph.graph.removeEdge).toHaveBeenCalled();
            // Check that new edge was added
            expect(mockGraph.graph.addEdge).toHaveBeenCalledWith(
                expect.objectContaining({
                    source: { cell: 'parent2' },
                    target: { cell: 'child' },
                })
            );
        });

        it('should reorder siblings based on siblingIndex', () => {
            mockGraph.addNode('parent', { label: 'Parent' });
            mockGraph.addNode('a', { label: 'A', order: 0 });
            mockGraph.addNode('b', { label: 'B', order: 1 });
            mockGraph.addNode('c', { label: 'C', order: 2 });
            mockGraph.addEdge('parent', 'a');
            mockGraph.addEdge('parent', 'b');
            mockGraph.addEdge('parent', 'c');

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                // Move 'c' to be the first child (index 0)
                result.current.reorderNode('c', 'parent', 0);
            });

            expect(mockGraph.nodes.get('c')?.getData().order).toBe(0);
            expect(mockGraph.nodes.get('a')?.getData().order).toBe(1);
            expect(mockGraph.nodes.get('b')?.getData().order).toBe(2);
        });

        it('should update node parentId data', () => {
            mockGraph.addNode('parent', { label: 'Parent' });
            const child = mockGraph.addNode('child', { label: 'Child', parentId: undefined });

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.reorderNode('child', 'parent', 0);
            });

            expect(child.setData).toHaveBeenCalledWith(
                expect.objectContaining({ parentId: 'parent' })
            );
        });

        it('should not throw when graph is not ready', () => {
            const { result } = renderHook(() =>
                useOutlineData({ graph: null, isReady: false })
            );

            expect(() => {
                act(() => {
                    result.current.reorderNode('any', 'parent', 0);
                });
            }).not.toThrow();
        });
    });

    describe('graph event listeners', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should refresh on node:added event', () => {
            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.outlineData).toHaveLength(0);

            // Add a node after hook is mounted
            mockGraph.addNode('new-node', { label: 'New' });
            act(() => {
                mockGraph.emit('node:added');
                // Advance timer to trigger debounced refresh
                vi.advanceTimersByTime(100);
            });

            expect(result.current.outlineData).toHaveLength(1);
        });

        it('should refresh on edge:added event', () => {
            mockGraph.addNode('parent', { label: 'Parent' });
            mockGraph.addNode('child', { label: 'Child' });

            const { result } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            // Initially two root nodes
            expect(result.current.outlineData).toHaveLength(2);

            mockGraph.addEdge('parent', 'child');
            act(() => {
                mockGraph.emit('edge:added');
                // Advance timer to trigger debounced refresh
                vi.advanceTimersByTime(100);
            });

            // After edge added, should be one root with a child
            expect(result.current.outlineData).toHaveLength(1);
            expect(result.current.outlineData[0].children).toHaveLength(1);
        });

        it('should register and cleanup event listeners', () => {
            const { unmount } = renderHook(() =>
                useOutlineData({ graph: mockGraph.graph, isReady: true })
            );

            expect(mockGraph.graph.on).toHaveBeenCalledWith('node:added', expect.any(Function));
            expect(mockGraph.graph.on).toHaveBeenCalledWith('node:removed', expect.any(Function));
            expect(mockGraph.graph.on).toHaveBeenCalledWith('edge:added', expect.any(Function));
            expect(mockGraph.graph.on).toHaveBeenCalledWith('edge:removed', expect.any(Function));
            expect(mockGraph.graph.on).toHaveBeenCalledWith('node:change:data', expect.any(Function));

            unmount();

            expect(mockGraph.graph.off).toHaveBeenCalledTimes(5);
        });
    });

    describe('when graph is not ready', () => {
        it('should return empty outline data', () => {
            const { result } = renderHook(() =>
                useOutlineData({ graph: null, isReady: false })
            );

            expect(result.current.outlineData).toEqual([]);
        });

        it('should not throw when calling actions', () => {
            const { result } = renderHook(() =>
                useOutlineData({ graph: null, isReady: false })
            );

            expect(() => {
                act(() => {
                    result.current.refresh();
                    result.current.reorderNode('any', 'parent', 0);
                });
            }).not.toThrow();
        });
    });
});
