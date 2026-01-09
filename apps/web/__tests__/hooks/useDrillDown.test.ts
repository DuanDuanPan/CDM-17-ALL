'use client';

/**
 * Story 8.9: useDrillDown Hook Tests
 *
 * Tests cover:
 * - Initial state management
 * - Drill path operations (drillInto, drillUp, drillToPath, drillToRoot)
 * - canDrillInto logic (hierarchy vs dependency edges)
 * - Visibility filtering integration
 * - URL restoration on mount
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDrillDown } from '@/components/graph/hooks/useDrillDown';
import * as drillDownStore from '@/lib/drillDownStore';
import type { Graph, Node, Edge } from '@antv/x6';

// Mock drillDownStore
vi.mock('@/lib/drillDownStore', () => ({
    useDrillPath: vi.fn(() => []),
    pushPath: vi.fn(),
    popPath: vi.fn(),
    goToPath: vi.fn(),
    resetPath: vi.fn(),
    restoreFromUrl: vi.fn(),
    getCurrentRootId: vi.fn(() => null),
}));

// Mock graph factory
const createMockGraph = (
    nodes: Array<{ id: string; outEdges?: Array<{ targetId: string; edgeType?: string }> }>
) => {
    const nodeMap = new Map<string, Node>();
    const edgeMap = new Map<string, Edge[]>();

    nodes.forEach((nodeData) => {
        const mockNode = {
            id: nodeData.id,
            isNode: () => true,
            isEdge: () => false,
            show: vi.fn(),
            hide: vi.fn(),
            getData: () => ({}),
        } as unknown as Node;

        nodeMap.set(nodeData.id, mockNode);

        if (nodeData.outEdges) {
            const edges = nodeData.outEdges.map((e, idx) => ({
                id: `${nodeData.id}-${e.targetId}-${idx}`,
                isEdge: () => true,
                isNode: () => false,
                getData: () => ({
                    metadata: {
                        kind: e.edgeType === 'dependency' ? 'dependency' : 'hierarchical',
                    },
                }),
                getTargetCell: () => nodeMap.get(e.targetId) || null,
                getSourceCellId: () => nodeData.id,
                getTargetCellId: () => e.targetId,
                show: vi.fn(),
                hide: vi.fn(),
            }));
            edgeMap.set(nodeData.id, edges as unknown as Edge[]);
        }
    });

    const mockGraph = {
        getCellById: vi.fn((id: string) => nodeMap.get(id) || null),
        getOutgoingEdges: vi.fn((node: Node) => edgeMap.get(node.id) || []),
        getNodes: vi.fn(() => Array.from(nodeMap.values())),
        getEdges: vi.fn(() => {
            const allEdges: Edge[] = [];
            edgeMap.forEach((edges) => allEdges.push(...edges));
            return allEdges;
        }),
        batchUpdate: vi.fn((fn: () => void) => fn()),
        on: vi.fn(),
        off: vi.fn(),
        zoomToFit: vi.fn(),
        centerCell: vi.fn(),
    } as unknown as Graph;

    return mockGraph;
};

describe('useDrillDown', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ----------------------------------------------------------
    // Initial State Tests
    // ----------------------------------------------------------
    describe('Initial State', () => {
        it('returns default state when not in drill mode', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);

            const { result } = renderHook(() =>
                useDrillDown({ graph: null, isReady: false })
            );

            expect(result.current.drillPath).toEqual([]);
            expect(result.current.currentRootId).toBeNull();
            expect(result.current.isDrillMode).toBe(false);
        });

        it('reflects drill path from store', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue(['node1', 'node2']);

            const { result } = renderHook(() =>
                useDrillDown({ graph: null, isReady: false })
            );

            expect(result.current.drillPath).toEqual(['node1', 'node2']);
            expect(result.current.currentRootId).toBe('node2');
            expect(result.current.isDrillMode).toBe(true);
        });
    });

    // ----------------------------------------------------------
    // URL Restoration Tests
    // ----------------------------------------------------------
    describe('URL Restoration', () => {
        it('calls restoreFromUrl when graph becomes ready', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);

            const { rerender } = renderHook(
                ({ graph, isReady }) => useDrillDown({ graph, isReady }),
                {
                    initialProps: { graph: null, isReady: false },
                }
            );

            // Not called yet
            expect(drillDownStore.restoreFromUrl).not.toHaveBeenCalled();

            // Simulate graph becoming ready
            const mockGraph = createMockGraph([]);
            rerender({ graph: mockGraph, isReady: true });

            expect(drillDownStore.restoreFromUrl).toHaveBeenCalledTimes(1);
        });

        it('does not call restoreFromUrl multiple times', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);

            const mockGraph = createMockGraph([]);

            const { rerender } = renderHook(
                ({ graph, isReady }) => useDrillDown({ graph, isReady }),
                {
                    initialProps: { graph: mockGraph, isReady: true },
                }
            );

            expect(drillDownStore.restoreFromUrl).toHaveBeenCalledTimes(1);

            // Rerender with same props
            rerender({ graph: mockGraph, isReady: true });

            // Should not call again
            expect(drillDownStore.restoreFromUrl).toHaveBeenCalledTimes(1);
        });
    });

    // ----------------------------------------------------------
    // canDrillInto Tests
    // ----------------------------------------------------------
    describe('canDrillInto', () => {
        it('returns false when graph is null', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);

            const { result } = renderHook(() =>
                useDrillDown({ graph: null, isReady: false })
            );

            expect(result.current.canDrillInto('any-node')).toBe(false);
        });

        it('returns false when node does not exist', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);
            const mockGraph = createMockGraph([{ id: 'node1' }]);

            const { result } = renderHook(() =>
                useDrillDown({ graph: mockGraph, isReady: true })
            );

            expect(result.current.canDrillInto('non-existent')).toBe(false);
        });

        it('returns false when node has no children', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);
            const mockGraph = createMockGraph([{ id: 'node1', outEdges: [] }]);

            const { result } = renderHook(() =>
                useDrillDown({ graph: mockGraph, isReady: true })
            );

            expect(result.current.canDrillInto('node1')).toBe(false);
        });

        it('returns true when node has hierarchy children', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);
            const mockGraph = createMockGraph([
                { id: 'parent', outEdges: [{ targetId: 'child', edgeType: 'hierarchy' }] },
                { id: 'child' },
            ]);

            const { result } = renderHook(() =>
                useDrillDown({ graph: mockGraph, isReady: true })
            );

            expect(result.current.canDrillInto('parent')).toBe(true);
        });

        it('returns false when node only has dependency edges', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);
            const mockGraph = createMockGraph([
                { id: 'parent', outEdges: [{ targetId: 'dep', edgeType: 'dependency' }] },
                { id: 'dep' },
            ]);

            const { result } = renderHook(() =>
                useDrillDown({ graph: mockGraph, isReady: true })
            );

            expect(result.current.canDrillInto('parent')).toBe(false);
        });

        it('returns true when node has mixed edges with at least one hierarchy', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);
            const mockGraph = createMockGraph([
                {
                    id: 'parent',
                    outEdges: [
                        { targetId: 'dep', edgeType: 'dependency' },
                        { targetId: 'child', edgeType: 'hierarchy' },
                    ],
                },
                { id: 'dep' },
                { id: 'child' },
            ]);

            const { result } = renderHook(() =>
                useDrillDown({ graph: mockGraph, isReady: true })
            );

            expect(result.current.canDrillInto('parent')).toBe(true);
        });
    });

    // ----------------------------------------------------------
    // Navigation Action Tests
    // ----------------------------------------------------------
    describe('Navigation Actions', () => {
        it('drillInto calls pushPath for valid node', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);
            const mockGraph = createMockGraph([
                { id: 'parent', outEdges: [{ targetId: 'child' }] },
                { id: 'child' },
            ]);

            const { result } = renderHook(() =>
                useDrillDown({ graph: mockGraph, isReady: true })
            );

            act(() => {
                result.current.drillInto('parent');
            });

            expect(drillDownStore.pushPath).toHaveBeenCalledWith('parent');
        });

        it('drillInto does not call pushPath for node without children', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const mockGraph = createMockGraph([{ id: 'leaf', outEdges: [] }]);

            const { result } = renderHook(() =>
                useDrillDown({ graph: mockGraph, isReady: true })
            );

            act(() => {
                result.current.drillInto('leaf');
            });

            expect(drillDownStore.pushPath).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('drillUp calls popPath', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue(['node1']);

            const { result } = renderHook(() =>
                useDrillDown({ graph: null, isReady: false })
            );

            act(() => {
                result.current.drillUp();
            });

            expect(drillDownStore.popPath).toHaveBeenCalled();
        });

        it('drillToPath calls goToPath with correct path', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue(['node1', 'node2']);

            const { result } = renderHook(() =>
                useDrillDown({ graph: null, isReady: false })
            );

            act(() => {
                result.current.drillToPath(['node1']);
            });

            expect(drillDownStore.goToPath).toHaveBeenCalledWith(['node1']);
        });

        it('drillToRoot calls resetPath', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue(['node1']);

            const { result } = renderHook(() =>
                useDrillDown({ graph: null, isReady: false })
            );

            act(() => {
                result.current.drillToRoot();
            });

            expect(drillDownStore.resetPath).toHaveBeenCalled();
        });
    });

    // ----------------------------------------------------------
    // Memoization Tests
    // ----------------------------------------------------------
    describe('Memoization', () => {
        it('canDrillInto maintains referential equality when graph does not change', () => {
            vi.mocked(drillDownStore.useDrillPath).mockReturnValue([]);
            const mockGraph = createMockGraph([{ id: 'node1' }]);

            const { result, rerender } = renderHook(
                ({ graph }) => useDrillDown({ graph, isReady: true }),
                {
                    initialProps: { graph: mockGraph },
                }
            );

            const firstCanDrillInto = result.current.canDrillInto;

            rerender({ graph: mockGraph });

            expect(result.current.canDrillInto).toBe(firstCanDrillInto);
        });
    });
});
