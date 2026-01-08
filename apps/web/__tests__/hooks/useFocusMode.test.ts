/**
 * Story 8.5: Unit tests for useFocusMode hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusMode } from '../../components/graph/hooks/useFocusMode';
import { isDependencyEdge } from '@/lib/edgeValidation';
import type { Graph } from '@antv/x6';

// Mock X6 NodeView (runtime import) for Vitest environment
vi.mock('@antv/x6', () => ({
    NodeView: class { },
}));

// Mock isDependencyEdge
vi.mock('@/lib/edgeValidation', () => ({
    isDependencyEdge: vi.fn(() => false),
}));

// Mock Node type
type MockNode = {
    id: string;
    isNode: () => boolean;
    getData: () => Record<string, unknown>;
    setData: ReturnType<typeof vi.fn>;
    attr: ReturnType<typeof vi.fn>;
    getAttrByPath: ReturnType<typeof vi.fn>;
};

// Mock Edge type
type MockEdge = {
    id: string;
    isEdge: () => boolean;
    getSourceCellId: () => string;
    getTargetCellId: () => string;
    attr: ReturnType<typeof vi.fn>;
    getAttrByPath: ReturnType<typeof vi.fn>;
};

function createMockGraph(structure: {
    nodes: Array<{ id: string; parentId?: string }>;
    edges?: Array<{ source: string; target: string; hasGlow?: boolean }>;
    selectedCellIds?: string[];
}) {
    const nodeMap = new Map<string, MockNode>();
    const edgeList: MockEdge[] = [];
    const selectedIds = new Set<string>(structure.selectedCellIds ?? []);

    // Create mock nodes
    structure.nodes.forEach(({ id, parentId }) => {
        const data: Record<string, unknown> = { parentId };
        nodeMap.set(id, {
            id,
            isNode: () => true,
            getData: () => data,
            setData: vi.fn((next: Record<string, unknown>) => {
                Object.assign(data, next);
            }),
            attr: vi.fn(),
            getAttrByPath: vi.fn(() => true), // Assume React Shape (has 'fo')
        });
    });

    // Create mock edges (hierarchical edges based on parentId)
    structure.nodes.forEach(({ id, parentId }) => {
        if (parentId) {
            const hasGlow = true;
            edgeList.push({
                id: `edge-${parentId}-${id}`,
                isEdge: () => true,
                getSourceCellId: () => parentId,
                getTargetCellId: () => id,
                attr: vi.fn(),
                getAttrByPath: vi.fn((path: string) => (path === 'glow' ? (hasGlow ? true : undefined) : true)),
            });
        }
    });

    // Add any additional custom edges
    structure.edges?.forEach(({ source, target, hasGlow = true }) => {
        edgeList.push({
            id: `edge-${source}-${target}`,
            isEdge: () => true,
            getSourceCellId: () => source,
            getTargetCellId: () => target,
            attr: vi.fn(),
            getAttrByPath: vi.fn((path: string) => (path === 'glow' ? (hasGlow ? true : undefined) : true)),
        });
    });

    const graph = {
        getCellById: vi.fn((id: string) => {
            const node = nodeMap.get(id);
            if (node) return node;
            const edge = edgeList.find((e) => e.id === id);
            return edge || null;
        }),
        getNodes: vi.fn(() => Array.from(nodeMap.values())),
        getEdges: vi.fn(() => edgeList),
        getOutgoingEdges: vi.fn((node: MockNode) =>
            edgeList.filter((e) => e.getSourceCellId() === node.id)
        ),
        getIncomingEdges: vi.fn((node: MockNode) =>
            edgeList.filter((e) => e.getTargetCellId() === node.id)
        ),
        batchUpdate: vi.fn((fn: () => void) => fn()),
        isSelected: vi.fn((cell: { id: string }) => selectedIds.has(cell.id)),
    };

    return {
        graph: graph as unknown as Graph,
        nodeMap,
        edgeList,
    };
}

describe('useFocusMode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isDependencyEdge).mockReturnValue(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with focus mode disabled', () => {
            const { graph } = createMockGraph({ nodes: [{ id: 'root' }] });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: null })
            );

            expect(result.current.isFocusMode).toBe(false);
            expect(result.current.focusLevel).toBe(1);
        });

        it('should not activate when graph is not ready', () => {
            const { graph } = createMockGraph({ nodes: [{ id: 'root' }] });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: false, selectedNodeId: 'root' })
            );

            act(() => {
                result.current.toggleFocusMode();
            });

            expect(result.current.isFocusMode).toBe(false);
        });
    });

    describe('AC1: F key toggle (via toggleFocusMode)', () => {
        it('should activate focus mode when node is selected', () => {
            const { graph } = createMockGraph({
                nodes: [
                    { id: 'root' },
                    { id: 'child1', parentId: 'root' },
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'root' })
            );

            act(() => {
                result.current.toggleFocusMode();
            });

            expect(result.current.isFocusMode).toBe(true);
        });

        it('should deactivate focus mode on second toggle', () => {
            const { graph } = createMockGraph({ nodes: [{ id: 'root' }] });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'root' })
            );

            act(() => {
                result.current.toggleFocusMode();
            });
            expect(result.current.isFocusMode).toBe(true);

            act(() => {
                result.current.toggleFocusMode();
            });
            expect(result.current.isFocusMode).toBe(false);
        });
    });

    describe('AC2: Blank click exit (via exitFocusMode)', () => {
        it('should exit focus mode', () => {
            const { graph } = createMockGraph({ nodes: [{ id: 'root' }] });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'root' })
            );

            act(() => {
                result.current.toggleFocusMode();
            });
            expect(result.current.isFocusMode).toBe(true);

            act(() => {
                result.current.exitFocusMode();
            });
            expect(result.current.isFocusMode).toBe(false);
        });
    });

    describe('AC3: Focus level configuration', () => {
        it('should allow setting focus level 1-3', () => {
            const { graph } = createMockGraph({ nodes: [{ id: 'root' }] });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'root' })
            );

            expect(result.current.focusLevel).toBe(1);

            act(() => {
                result.current.setFocusLevel(2);
            });
            expect(result.current.focusLevel).toBe(2);

            act(() => {
                result.current.setFocusLevel(3);
            });
            expect(result.current.focusLevel).toBe(3);
        });

        it('should reapply focus when level changes while active', () => {
            // Tree: root → child1 → grandchild1, root → child2
            // At level 1 (child1 selected): child1, root, grandchild1, child2 (sibling)
            // At level 2: same + root's siblings (none), child2's children (none)
            // Need a deeper tree to test level change properly
            const { graph, nodeMap } = createMockGraph({
                nodes: [
                    { id: 'root' },
                    { id: 'child1', parentId: 'root' },
                    { id: 'grandchild1', parentId: 'child1' },
                    { id: 'great-grandchild1', parentId: 'grandchild1' },
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'child1' })
            );

            // Activate focus mode at level 1
            act(() => {
                result.current.toggleFocusMode();
            });

            // At level 1: great-grandchild1 should be dimmed (too far)
            let ggcCalls = nodeMap.get('great-grandchild1')!.attr.mock.calls;
            let lastGGCCall = ggcCalls[ggcCalls.length - 1];
            expect(lastGGCCall).toEqual(['fo/opacity', 0.2]); // Dimmed at level 1

            // Change to level 2 - should include grandchildren (great-grandchild1)
            act(() => {
                result.current.setFocusLevel(2);
            });

            // At level 2: great-grandchild1 should now be focused
            ggcCalls = nodeMap.get('great-grandchild1')!.attr.mock.calls;
            lastGGCCall = ggcCalls[ggcCalls.length - 1];
            expect(lastGGCCall).toEqual(['fo/opacity', 1]); // Focused at level 2
        });
    });

    describe('AC5: Edge cases', () => {
        it('should not activate when no node is selected', () => {
            const { graph } = createMockGraph({ nodes: [{ id: 'root' }] });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: null })
            );

            act(() => {
                result.current.toggleFocusMode();
            });

            expect(result.current.isFocusMode).toBe(false);
        });

        it('should exit focus mode when selection is cleared', () => {
            const { graph } = createMockGraph({ nodes: [{ id: 'root' }] });
            const { result, rerender } = renderHook(
                ({ selectedNodeId }) =>
                    useFocusMode({ graph, isReady: true, selectedNodeId }),
                { initialProps: { selectedNodeId: 'root' as string | null } }
            );

            // Activate focus mode
            act(() => {
                result.current.toggleFocusMode();
            });
            expect(result.current.isFocusMode).toBe(true);

            // Clear selection
            rerender({ selectedNodeId: null });

            // Focus mode should be exited
            expect(result.current.isFocusMode).toBe(false);
        });
    });

    describe('Related node calculation', () => {
        it('should include parent, children, and siblings at level 1', () => {
            const { graph, nodeMap } = createMockGraph({
                nodes: [
                    { id: 'root' },
                    { id: 'child1', parentId: 'root' },
                    { id: 'child2', parentId: 'root' },
                    { id: 'grandchild1', parentId: 'child1' },
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'child1' })
            );

            act(() => {
                result.current.toggleFocusMode();
            });

            // At level 1: focal (child1) + parent (root) + children (grandchild1) + sibling (child2)
            // All should have full opacity
            const child1Calls = nodeMap.get('child1')!.attr.mock.calls;
            const lastChild1Call = child1Calls[child1Calls.length - 1];
            expect(lastChild1Call).toEqual(['fo/opacity', 1]); // FOCUSED_OPACITY
        });
    });

    describe('Opacity application', () => {
        it('should apply dimmed opacity to unrelated nodes', () => {
            const { graph, nodeMap } = createMockGraph({
                nodes: [
                    { id: 'root' },
                    { id: 'child1', parentId: 'root' },
                    { id: 'unrelated' }, // No parent, not connected
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'child1' })
            );

            act(() => {
                result.current.toggleFocusMode();
            });

            // Unrelated node should have dimmed opacity (0.2)
            const unrelatedCalls = nodeMap.get('unrelated')!.attr.mock.calls;
            const lastUnrelatedCall = unrelatedCalls[unrelatedCalls.length - 1];
            expect(lastUnrelatedCall).toEqual(['fo/opacity', 0.2]); // DIMMED_OPACITY
        });

        it('should restore all opacity on exit', () => {
            const { graph, nodeMap } = createMockGraph({
                nodes: [{ id: 'root' }, { id: 'child1', parentId: 'root' }],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'root' })
            );

            // Activate and then exit
            act(() => {
                result.current.toggleFocusMode();
            });
            act(() => {
                result.current.exitFocusMode();
            });

            // All nodes should be restored to full opacity
            const child1Calls = nodeMap.get('child1')!.attr.mock.calls;
            const lastCall = child1Calls[child1Calls.length - 1];
            expect(lastCall).toEqual(['fo/opacity', 1]); // FOCUSED_OPACITY restored
        });
    });

    describe('AC3: Level 2/3 semantic coverage', () => {
        it('should include parent siblings (uncle/aunt) at level 2', () => {
            // Tree structure:
            //       grandparent
            //      /          \
            //   parent       uncle
            //     |
            //   focal
            const { graph, nodeMap } = createMockGraph({
                nodes: [
                    { id: 'grandparent' },
                    { id: 'parent', parentId: 'grandparent' },
                    { id: 'uncle', parentId: 'grandparent' }, // parent's sibling
                    { id: 'focal', parentId: 'parent' },
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'focal' })
            );

            // Set level 2 before activating
            act(() => {
                result.current.setFocusLevel(2);
            });

            act(() => {
                result.current.toggleFocusMode();
            });

            // At level 2: focal + parent + grandparent + uncle (parent's sibling)
            // Uncle should be FOCUSED (included in level 2)
            const uncleCalls = nodeMap.get('uncle')!.attr.mock.calls;
            const lastUncleCall = uncleCalls[uncleCalls.length - 1];
            expect(lastUncleCall).toEqual(['fo/opacity', 1]); // Uncle should be focused at level 2
        });

        it('should include grandchildren at level 2', () => {
            // Tree structure:
            //     focal
            //       |
            //     child
            //       |
            //   grandchild
            const { graph, nodeMap } = createMockGraph({
                nodes: [
                    { id: 'focal' },
                    { id: 'child', parentId: 'focal' },
                    { id: 'grandchild', parentId: 'child' },
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'focal' })
            );

            // At level 1, grandchild should be dimmed
            act(() => {
                result.current.toggleFocusMode();
            });

            let grandchildCalls = nodeMap.get('grandchild')!.attr.mock.calls;
            let lastGrandchildCall = grandchildCalls[grandchildCalls.length - 1];
            expect(lastGrandchildCall).toEqual(['fo/opacity', 0.2]); // Dimmed at level 1

            // Switch to level 2 - grandchild should now be focused
            act(() => {
                result.current.setFocusLevel(2);
            });

            grandchildCalls = nodeMap.get('grandchild')!.attr.mock.calls;
            lastGrandchildCall = grandchildCalls[grandchildCalls.length - 1];
            expect(lastGrandchildCall).toEqual(['fo/opacity', 1]); // Focused at level 2
        });

        it('should expand 3 levels at level 3', () => {
            // Tree structure:
            //  focal → child → grandchild → great-grandchild
            const { graph, nodeMap } = createMockGraph({
                nodes: [
                    { id: 'focal' },
                    { id: 'child', parentId: 'focal' },
                    { id: 'grandchild', parentId: 'child' },
                    { id: 'great-grandchild', parentId: 'grandchild' },
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'focal' })
            );

            // Set level 3
            act(() => {
                result.current.setFocusLevel(3);
            });

            act(() => {
                result.current.toggleFocusMode();
            });

            // At level 3: focal + child + grandchild + great-grandchild
            const greatGrandchildCalls = nodeMap.get('great-grandchild')!.attr.mock.calls;
            const lastCall = greatGrandchildCalls[greatGrandchildCalls.length - 1];
            expect(lastCall).toEqual(['fo/opacity', 1]); // Focused at level 3
        });
    });

    describe('AC4: Edge transparency', () => {
        it('should set focused edges to full opacity', () => {
            const { graph, edgeList } = createMockGraph({
                nodes: [
                    { id: 'root' },
                    { id: 'child1', parentId: 'root' },
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'child1' })
            );

            act(() => {
                result.current.toggleFocusMode();
            });

            // Edge between root and child1 should be focused (both in range)
            const edge = edgeList.find((e) => e.getSourceCellId() === 'root' && e.getTargetCellId() === 'child1');
            expect(edge).toBeDefined();

            const edgeCalls = edge!.attr.mock.calls;
            // Find the line/strokeOpacity call
            const strokeOpacityCall = edgeCalls.find((call: unknown[]) => call[0] === 'line/strokeOpacity');
            expect(strokeOpacityCall).toBeDefined();
            expect(strokeOpacityCall![1]).toBe(1); // FOCUSED_OPACITY
        });

        it('should dim hierarchical edges when one endpoint is out of range', () => {
            // Tree: root -> child1 -> grandchild1
            // Focus on root at level 1, grandchild1 is out of range, so edge(child1->grandchild1) should be dimmed.
            const { graph, edgeList } = createMockGraph({
                nodes: [
                    { id: 'root' },
                    { id: 'child1', parentId: 'root' },
                    { id: 'grandchild1', parentId: 'child1' },
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'root' })
            );

            act(() => {
                result.current.toggleFocusMode();
            });

            const outOfRangeEdge = edgeList.find(
                (e) => e.getSourceCellId() === 'child1' && e.getTargetCellId() === 'grandchild1'
            );
            expect(outOfRangeEdge).toBeDefined();

            const edgeCalls = outOfRangeEdge!.attr.mock.calls;
            const lineOpacityCalls = edgeCalls.filter((call: unknown[]) => call[0] === 'line/strokeOpacity');
            const glowOpacityCalls = edgeCalls.filter((call: unknown[]) => call[0] === 'glow/strokeOpacity');

            expect(lineOpacityCalls[lineOpacityCalls.length - 1]?.[1]).toBe(0.2);
            expect(glowOpacityCalls[glowOpacityCalls.length - 1]?.[1]).toBe(0.2);
        });

        it('should dim non-glow dependency edges via line/opacity', () => {
            const { graph, edgeList } = createMockGraph({
                nodes: [{ id: 'root' }, { id: 'child1', parentId: 'root' }, { id: 'unrelated' }],
                edges: [{ source: 'child1', target: 'unrelated', hasGlow: false }],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'root' })
            );

            vi.mocked(isDependencyEdge).mockImplementation((edge) => {
                return Boolean((edge as { id?: string }).id?.includes('edge-child1-unrelated'));
            });

            act(() => {
                result.current.toggleFocusMode();
            });

            const dependencyEdge = edgeList.find(
                (e) => e.getSourceCellId() === 'child1' && e.getTargetCellId() === 'unrelated'
            );
            expect(dependencyEdge).toBeDefined();

            const edgeCalls = dependencyEdge!.attr.mock.calls;
            const opacityCalls = edgeCalls.filter((call: unknown[]) => call[0] === 'line/opacity');
            expect(opacityCalls[opacityCalls.length - 1]?.[1]).toBe(0.2);
        });

        it('should restore glow opacity to original value on exit', () => {
            const { graph, edgeList } = createMockGraph({
                nodes: [
                    { id: 'root' },
                    { id: 'child1', parentId: 'root' },
                ],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'child1' })
            );

            // Activate and exit
            act(() => {
                result.current.toggleFocusMode();
            });
            act(() => {
                result.current.exitFocusMode();
            });

            // Check glow opacity is restored to 0.35 (HIERARCHICAL_EDGE_GLOW_OPACITY)
            const edge = edgeList.find((e) => e.getSourceCellId() === 'root');
            expect(edge).toBeDefined();

            const edgeCalls = edge!.attr.mock.calls;
            // Find the last glow/strokeOpacity call
            const glowCalls = edgeCalls.filter((call: unknown[]) => call[0] === 'glow/strokeOpacity');
            const lastGlowCall = glowCalls[glowCalls.length - 1];
            expect(lastGlowCall).toBeDefined();
            expect(lastGlowCall![1]).toBe(0.35); // HIERARCHICAL_EDGE_GLOW_OPACITY
        });

        it('should preserve selected hierarchical edge glow opacity on exit', () => {
            const { graph, edgeList } = createMockGraph({
                nodes: [
                    { id: 'root' },
                    { id: 'child1', parentId: 'root' },
                ],
                selectedCellIds: ['edge-root-child1'],
            });
            const { result } = renderHook(() =>
                useFocusMode({ graph, isReady: true, selectedNodeId: 'child1' })
            );

            act(() => {
                result.current.toggleFocusMode();
            });
            act(() => {
                result.current.exitFocusMode();
            });

            const edge = edgeList.find((e) => e.id === 'edge-root-child1');
            expect(edge).toBeDefined();

            const edgeCalls = edge!.attr.mock.calls;
            const glowCalls = edgeCalls.filter((call: unknown[]) => call[0] === 'glow/strokeOpacity');
            const lastGlowCall = glowCalls[glowCalls.length - 1];
            expect(lastGlowCall).toBeDefined();
            expect(lastGlowCall![1]).toBe(0.55);
        });
    });
});
