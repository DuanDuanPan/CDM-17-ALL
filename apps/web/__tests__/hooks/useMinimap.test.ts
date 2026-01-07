/**
 * Story 8.2: Unit tests for useMinimap hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMinimap } from '../../components/graph/hooks/useMinimap';
import type { Graph } from '@antv/x6';

// Mock X6 NodeView (runtime import) for Vitest environment
vi.mock('@antv/x6', () => ({
    NodeView: class { },
    MiniMap: vi.fn().mockImplementation(() => ({
        dispose: vi.fn(),
    })),
}));

// Mock Node type
type MockNode = {
    id: string;
    isNode: () => boolean;
    getData: () => Record<string, unknown>;
    setData: ReturnType<typeof vi.fn>;
};

function createMockGraph(nodeCount = 10) {
    const nodes = new Map<string, MockNode>();

    // Create mock nodes
    for (let i = 0; i < nodeCount; i++) {
        const id = `node-${i}`;
        let data: Record<string, unknown> = {};
        nodes.set(id, {
            id,
            isNode: () => true,
            getData: vi.fn(() => data),
            setData: vi.fn((next: Record<string, unknown>, options?: { overwrite?: boolean }) => {
                if (options?.overwrite) {
                    data = next;
                } else {
                    data = { ...data, ...next };
                }
            }),
        });
    }

    const graph = {
        getCellById: vi.fn((id: string) => nodes.get(id) || null),
        getNodes: vi.fn(() => Array.from(nodes.values())),
        getPlugin: vi.fn(() => null),
        use: vi.fn(),
        batchUpdate: vi.fn((fn: () => void) => fn()),
    };

    return {
        graph: graph as unknown as Graph,
        nodes,
    };
}

describe('useMinimap', () => {
    let mockGraph: ReturnType<typeof createMockGraph>;
    let containerRef: { current: HTMLDivElement | null };

    beforeEach(() => {
        vi.useFakeTimers();
        mockGraph = createMockGraph();
        containerRef = { current: document.createElement('div') };
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('initialization', () => {
        it('should initialize with enabled=true by default', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                })
            );

            expect(result.current.isEnabled).toBe(true);
        });

        it('should respect enabled=false option', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                    enabled: false,
                })
            );

            expect(result.current.isEnabled).toBe(false);
        });

        it('should not initialize when graph is null', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: null,
                    isReady: false,
                    containerRef,
                })
            );

            expect(result.current.isEnabled).toBe(true);
            expect(mockGraph.graph.use).not.toHaveBeenCalled();
        });

        it('should not initialize when container is null', () => {
            containerRef.current = null;

            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                })
            );

            expect(result.current.isEnabled).toBe(true);
        });
    });

    describe('performance guard', () => {
        it('should disable minimap when node count exceeds maxNodes', () => {
            const largeGraph = createMockGraph(1500);

            const { result } = renderHook(() =>
                useMinimap({
                    graph: largeGraph.graph,
                    isReady: true,
                    containerRef,
                    maxNodes: 1000,
                })
            );

            expect(result.current.isDisabledForPerformance).toBe(true);
        });

        it('should enable minimap when node count is below maxNodes', () => {
            const smallGraph = createMockGraph(500);

            const { result } = renderHook(() =>
                useMinimap({
                    graph: smallGraph.graph,
                    isReady: true,
                    containerRef,
                    maxNodes: 1000,
                })
            );

            expect(result.current.isDisabledForPerformance).toBe(false);
        });

        it('should use default maxNodes of 1000', () => {
            const largeGraph = createMockGraph(1000);

            const { result } = renderHook(() =>
                useMinimap({
                    graph: largeGraph.graph,
                    isReady: true,
                    containerRef,
                })
            );

            // Exactly 1000 nodes should trigger the guard
            expect(result.current.isDisabledForPerformance).toBe(true);
        });
    });

    describe('show/hide/toggle', () => {
        it('should toggle visibility', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                    enabled: true,
                })
            );

            expect(result.current.isEnabled).toBe(true);

            act(() => {
                result.current.toggle();
            });

            expect(result.current.isEnabled).toBe(false);

            act(() => {
                result.current.toggle();
            });

            expect(result.current.isEnabled).toBe(true);
        });

        it('should show minimap', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                    enabled: false,
                })
            );

            expect(result.current.isEnabled).toBe(false);

            act(() => {
                result.current.show();
            });

            expect(result.current.isEnabled).toBe(true);
        });

        it('should hide minimap', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                    enabled: true,
                })
            );

            expect(result.current.isEnabled).toBe(true);

            act(() => {
                result.current.hide();
            });

            expect(result.current.isEnabled).toBe(false);
        });
    });

    describe('highlightNodes', () => {
        it('should highlight selected nodes', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                })
            );

            act(() => {
                result.current.highlightNodes(['node-0', 'node-1'], 'selected');
            });
            act(() => {
                vi.runAllTimers();
            });

            const node0 = mockGraph.nodes.get('node-0');
            const node1 = mockGraph.nodes.get('node-1');

            expect(node0?.setData).toHaveBeenCalledWith(
                expect.objectContaining({
                    _minimapHighlight: expect.objectContaining({ selected: true }),
                }),
                expect.objectContaining({ overwrite: true })
            );
            expect(node1?.setData).toHaveBeenCalledWith(
                expect.objectContaining({
                    _minimapHighlight: expect.objectContaining({ selected: true }),
                }),
                expect.objectContaining({ overwrite: true })
            );
        });

        it('should highlight search match nodes', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                })
            );

            act(() => {
                result.current.highlightNodes(['node-2', 'node-3'], 'search');
            });
            act(() => {
                vi.runAllTimers();
            });

            const node2 = mockGraph.nodes.get('node-2');
            const node3 = mockGraph.nodes.get('node-3');

            expect(node2?.setData).toHaveBeenCalledWith(
                expect.objectContaining({
                    _minimapHighlight: expect.objectContaining({ search: true }),
                }),
                expect.objectContaining({ overwrite: true })
            );
            expect(node3?.setData).toHaveBeenCalledWith(
                expect.objectContaining({
                    _minimapHighlight: expect.objectContaining({ search: true }),
                }),
                expect.objectContaining({ overwrite: true })
            );
        });

        it('should not highlight non-existent nodes', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                })
            );

            // Should not throw
            expect(() => {
                act(() => {
                    result.current.highlightNodes(['non-existent-node'], 'selected');
                });
            }).not.toThrow();
        });
    });

    describe('clearHighlights', () => {
        it('should clear selected highlights', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                })
            );

            // Add highlights first
            act(() => {
                result.current.highlightNodes(['node-0'], 'selected');
            });
            act(() => {
                vi.runAllTimers();
            });

            // Clear selected highlights
            act(() => {
                result.current.clearHighlights('selected');
            });

            // Verify highlight removed
            const node0 = mockGraph.nodes.get('node-0');
            expect(node0?.getData()._minimapHighlight).toBeUndefined();
        });

        it('should clear all highlights when type is not specified', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: mockGraph.graph,
                    isReady: true,
                    containerRef,
                })
            );

            // Add both types of highlights
            act(() => {
                result.current.highlightNodes(['node-0'], 'selected');
                result.current.highlightNodes(['node-1'], 'search');
            });
            act(() => {
                vi.runAllTimers();
            });

            // Clear all highlights
            act(() => {
                result.current.clearHighlights();
            });

            const node0 = mockGraph.nodes.get('node-0');
            const node1 = mockGraph.nodes.get('node-1');
            expect(node0?.getData()._minimapHighlight).toBeUndefined();
            expect(node1?.getData()._minimapHighlight).toBeUndefined();
        });
    });

    describe('when graph is not ready', () => {
        it('should return safe defaults', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: null,
                    isReady: false,
                    containerRef,
                })
            );

            expect(result.current.isEnabled).toBe(true);
            expect(result.current.isDisabledForPerformance).toBe(false);
        });

        it('should not throw when calling actions', () => {
            const { result } = renderHook(() =>
                useMinimap({
                    graph: null,
                    isReady: false,
                    containerRef,
                })
            );

            expect(() => {
                act(() => {
                    result.current.show();
                    result.current.hide();
                    result.current.toggle();
                    result.current.highlightNodes(['any'], 'selected');
                    result.current.clearHighlights();
                });
            }).not.toThrow();
        });
    });
});
