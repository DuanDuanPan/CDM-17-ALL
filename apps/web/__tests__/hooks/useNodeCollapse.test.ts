/**
 * Story 8.1: Unit tests for useNodeCollapse hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeCollapse } from '../../components/graph/hooks/useNodeCollapse';
import type { Graph } from '@antv/x6';

// Mock X6 Graph and Node
type MockNode = {
    id: string;
    isNode: () => boolean;
    getData: () => Record<string, unknown>;
    setData: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
    isVisible: () => boolean;
    getPosition: () => { x: number; y: number };
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

    const createMockNode = (id: string, data: Record<string, unknown> = {}): MockNode => ({
        id,
        isNode: () => true,
        getData: () => data,
        setData: vi.fn((newData: Record<string, unknown>) => {
            Object.assign(data, newData);
        }),
        show: vi.fn(),
        hide: vi.fn(),
        isVisible: () => true,
	        getPosition: () => ({ x: 0, y: 0 }),
	    });

    const createMockEdge = (source: string, target: string, kind: 'hierarchical' | 'dependency' = 'hierarchical'): MockEdge => ({
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
        getConnectedEdges: vi.fn(() => []),
        batchUpdate: vi.fn((fn: () => void) => fn()),
        on: vi.fn(),
        off: vi.fn(),
    };

    return {
        graph: graph as unknown as Graph,
        nodes,
        edges,
        addNode: (id: string, data: Record<string, unknown> = {}) => {
            const node = createMockNode(id, data);
            nodes.set(id, node);
            return node;
        },
        addEdge: (source: string, target: string, kind: 'hierarchical' | 'dependency' = 'hierarchical') => {
            edges.set(`${source}-${target}`, createMockEdge(source, target, kind));
            // Simulate mindmap parent-child relation via parentId for ancestor traversal
            const targetNode = nodes.get(target);
            if (targetNode) {
                const targetData = targetNode.getData();
                targetData['parentId'] = source;
            }
        },
    };
}

describe('useNodeCollapse', () => {
    let mockGraph: ReturnType<typeof createMockGraph>;

    beforeEach(() => {
        mockGraph = createMockGraph();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('isCollapsed', () => {
        it('should return false for non-collapsed node', () => {
            mockGraph.addNode('node-1', { collapsed: false });

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.isCollapsed('node-1')).toBe(false);
        });

        it('should return true for collapsed node', () => {
            mockGraph.addNode('node-1', { collapsed: true });

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.isCollapsed('node-1')).toBe(true);
        });

        it('should return false for non-existent node', () => {
            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.isCollapsed('non-existent')).toBe(false);
        });
    });

    describe('hasChildren', () => {
        it('should return false for node without children', () => {
            mockGraph.addNode('node-1');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.hasChildren('node-1')).toBe(false);
        });

        it('should return true for node with children', () => {
            mockGraph.addNode('parent');
            mockGraph.addNode('child');
            mockGraph.addEdge('parent', 'child');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.hasChildren('parent')).toBe(true);
        });
    });

    describe('getChildCount', () => {
        it('should return 0 for node without children', () => {
            mockGraph.addNode('node-1');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.getChildCount('node-1')).toBe(0);
        });

        it('should return correct count for node with children', () => {
            mockGraph.addNode('parent');
            mockGraph.addNode('child-1');
            mockGraph.addNode('child-2');
            mockGraph.addEdge('parent', 'child-1');
            mockGraph.addEdge('parent', 'child-2');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.getChildCount('parent')).toBe(2);
        });
    });

    describe('collapseNode', () => {
        it('should set collapsed to true and hide descendants', () => {
            const parent = mockGraph.addNode('parent', { collapsed: false });
            const child = mockGraph.addNode('child');
            mockGraph.addEdge('parent', 'child');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.collapseNode('parent');
            });

            expect(parent.setData).toHaveBeenCalledWith(expect.objectContaining({ collapsed: true }));
            expect(child.hide).toHaveBeenCalled();
        });

        it('should not collapse node without children', () => {
            const node = mockGraph.addNode('node-1', { collapsed: false });

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.collapseNode('node-1');
            });

            expect(node.setData).not.toHaveBeenCalled();
        });

        it('should not collapse already collapsed node', () => {
            const parent = mockGraph.addNode('parent', { collapsed: true });
            mockGraph.addNode('child');
            mockGraph.addEdge('parent', 'child');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.collapseNode('parent');
            });

            expect(parent.setData).not.toHaveBeenCalled();
        });
    });

    describe('expandNode', () => {
        it('should set collapsed to false for collapsed node', () => {
            const parent = mockGraph.addNode('parent', { collapsed: true });
            const child = mockGraph.addNode('child', { collapsed: false });
            mockGraph.addEdge('parent', 'child');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.expandNode('parent');
            });

            expect(parent.setData).toHaveBeenCalledWith(expect.objectContaining({ collapsed: false }));
            expect(child.show).toHaveBeenCalled();
        });

        it('should not expand already expanded node', () => {
            const node = mockGraph.addNode('node-1', { collapsed: false });

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.expandNode('node-1');
            });

            expect(node.setData).not.toHaveBeenCalled();
        });
    });

    describe('toggleCollapse', () => {
        it('should collapse expanded node', () => {
            const parent = mockGraph.addNode('parent', { collapsed: false });
            mockGraph.addNode('child');
            mockGraph.addEdge('parent', 'child');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.toggleCollapse('parent');
            });

            expect(parent.setData).toHaveBeenCalledWith(expect.objectContaining({ collapsed: true }));
        });

        it('should expand collapsed node', () => {
            const parent = mockGraph.addNode('parent', { collapsed: true });
            mockGraph.addNode('child');
            mockGraph.addEdge('parent', 'child');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.toggleCollapse('parent');
            });

            expect(parent.setData).toHaveBeenCalledWith(expect.objectContaining({ collapsed: false }));
        });
    });

    describe('collapseDescendants', () => {
        it('should collapse all descendants recursively', () => {
            const root = mockGraph.addNode('root', { collapsed: false });
            const child = mockGraph.addNode('child', { collapsed: false });
            const grandchild = mockGraph.addNode('grandchild', { collapsed: false });
            mockGraph.addEdge('root', 'child');
            mockGraph.addEdge('child', 'grandchild');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.collapseDescendants('root');
            });

            expect(root.setData).toHaveBeenCalledWith(expect.objectContaining({ collapsed: true }));
            expect(child.setData).toHaveBeenCalledWith(expect.objectContaining({ collapsed: true }));
        });
    });

    describe('expandPathToNode', () => {
        it('should expand all collapsed ancestors', () => {
            const root = mockGraph.addNode('root', { collapsed: true });
            const child = mockGraph.addNode('child', { collapsed: true });
            const target = mockGraph.addNode('target', { collapsed: false });
            mockGraph.addEdge('root', 'child');
            mockGraph.addEdge('child', 'target');

            const { result } = renderHook(() =>
                useNodeCollapse({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.expandPathToNode('target');
            });

            expect(root.setData).toHaveBeenCalledWith(expect.objectContaining({ collapsed: false }));
            expect(child.setData).toHaveBeenCalledWith(expect.objectContaining({ collapsed: false }));
        });
    });

    describe('when graph is not ready', () => {
        it('should return safe defaults', () => {
            const { result } = renderHook(() =>
                useNodeCollapse({ graph: null, isReady: false })
            );

            expect(result.current.isCollapsed('any')).toBe(false);
            expect(result.current.hasChildren('any')).toBe(false);
            expect(result.current.getChildCount('any')).toBe(0);
            expect(result.current.getHiddenDescendantCount('any')).toBe(0);
        });

        it('should not throw when calling actions', () => {
            const { result } = renderHook(() =>
                useNodeCollapse({ graph: null, isReady: false })
            );

            expect(() => {
                act(() => {
                    result.current.collapseNode('any');
                    result.current.expandNode('any');
                    result.current.toggleCollapse('any');
                    result.current.collapseDescendants('any');
                    result.current.expandPathToNode('any');
                });
            }).not.toThrow();
        });
    });
});
