/**
 * Story 7.4: Clipboard Paste Handler Tests
 * Tests for paste helper utilities
 * 
 * Test Cases from Story Requirements:
 * - TC-Paste-1: ID Regeneration
 * - TC-Paste-2: Hierarchy Restoration
 * - TC-Paste-3: Orphan Handling
 * - TC-Paste-4: Edge Reconstruction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { pasteFromClipboard } from '../clipboard/clipboardPaste';
import {
    getFallbackParentId,
    ensureHierarchicalEdges,
    createClipboardEdges,
    createParentChildEdges,
} from '../clipboard/pasteHelpers';
import type { Node, Graph } from '@antv/x6';
import type { ClipboardEdgeData } from '@cdm/types';
import { NodeType } from '@cdm/types';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
    },
}));

// Helper to create mock nodes
function createMockNode(id: string, options: { parentId?: string } = {}): Node {
    return {
        id,
        isNode: () => true,
        getData: () => ({
            parentId: options.parentId,
        }),
    } as unknown as Node;
}

// Helper to create mock graph
function createMockGraph(nodes: Node[]): Graph {
    const rootNode = nodes.find(n => !n.getData()?.parentId);
    return {
        getRootNodes: () => (rootNode ? [rootNode] : []),
        getNodes: () => nodes,
    } as unknown as Graph;
}

describe('Paste Helpers', () => {
    describe('getFallbackParentId', () => {
        describe('TC-Paste-3: Orphan Handling', () => {
            it('should return selected node as parent when one node is selected', () => {
                const selectedNode = createMockNode('selected');
                const graph = createMockGraph([selectedNode]);

                const result = getFallbackParentId(graph, [selectedNode]);

                expect(result).toBe('selected');
            });

            it('should return root node when no nodes are selected', () => {
                const rootNode = createMockNode('root');
                const graph = createMockGraph([rootNode]);

                const result = getFallbackParentId(graph, []);

                expect(result).toBe('root');
            });

            it('should return common ancestor when multiple nodes are selected', () => {
                const parentNode = createMockNode('parent');
                const child1 = createMockNode('child1', { parentId: 'parent' });
                const child2 = createMockNode('child2', { parentId: 'parent' });
                const graph = createMockGraph([parentNode, child1, child2]);

                const result = getFallbackParentId(graph, [child1, child2]);

                // Should return common parent
                expect(result).toBe('parent');
            });
        });
    });

    describe('ensureHierarchicalEdges', () => {
        let yDoc: Y.Doc;
        let yEdges: Y.Map<unknown>;

        beforeEach(() => {
            yDoc = new Y.Doc();
            yEdges = yDoc.getMap('edges');
        });

        describe('TC-Paste-2: Hierarchy Restoration', () => {
            it('should create hierarchical edges for parent-child relations', () => {
                const parentChildRelations = [
                    { parentId: 'parent1', childId: 'child1' },
                    { parentId: 'parent1', childId: 'child2' },
                ];

                yDoc.transact(() => {
                    ensureHierarchicalEdges(yEdges, parentChildRelations, 'test-graph');
                });

                expect(yEdges.size).toBe(2);

                const edges = Array.from(yEdges.values()) as Array<{ source: string; target: string }>;
                const edgePairs = edges.map(e => `${e.source}->${e.target}`);

                expect(edgePairs).toContain('parent1->child1');
                expect(edgePairs).toContain('parent1->child2');
            });

            it('should not create duplicate edges', () => {
                // Pre-existing edge
                yEdges.set('existing', {
                    id: 'existing',
                    source: 'parent1',
                    target: 'child1',
                    kind: 'hierarchical',
                });

                const parentChildRelations = [
                    { parentId: 'parent1', childId: 'child1' }, // Already exists
                    { parentId: 'parent1', childId: 'child2' }, // New
                ];

                yDoc.transact(() => {
                    ensureHierarchicalEdges(yEdges, parentChildRelations, 'test-graph');
                });

                // Should have original + 1 new
                expect(yEdges.size).toBe(2);
            });
        });
    });

    describe('createClipboardEdges', () => {
        let yDoc: Y.Doc;
        let yEdges: Y.Map<unknown>;

        beforeEach(() => {
            yDoc = new Y.Doc();
            yEdges = yDoc.getMap('edges');
        });

        describe('TC-Paste-4: Edge Reconstruction', () => {
            it('should recreate edges with new node IDs', () => {
                const clipboardEdges: ClipboardEdgeData[] = [
                    { sourceOriginalId: 'old-A', targetOriginalId: 'old-B', kind: 'hierarchical' },
                    { sourceOriginalId: 'old-B', targetOriginalId: 'old-C', kind: 'hierarchical' },
                ];

                const idMap = new Map([
                    ['old-A', 'new-A'],
                    ['old-B', 'new-B'],
                    ['old-C', 'new-C'],
                ]);

                const newEdgeIds: string[] = [];

                yDoc.transact(() => {
                    createClipboardEdges(yEdges, clipboardEdges, idMap, 'test-graph', newEdgeIds);
                });

                expect(newEdgeIds).toHaveLength(2);

                const edges = Array.from(yEdges.values()) as Array<{ source: string; target: string }>;
                const edgePairs = edges.map(e => `${e.source}->${e.target}`);

                expect(edgePairs).toContain('new-A->new-B');
                expect(edgePairs).toContain('new-B->new-C');
            });

            it('should preserve dependency edges with their types', () => {
                const clipboardEdges: ClipboardEdgeData[] = [
                    {
                        sourceOriginalId: 'old-A',
                        targetOriginalId: 'old-B',
                        kind: 'dependency',
                        dependencyType: 'FS', // Finish-to-Start dependency
                    },
                ];

                const idMap = new Map([
                    ['old-A', 'new-A'],
                    ['old-B', 'new-B'],
                ]);

                const newEdgeIds: string[] = [];

                yDoc.transact(() => {
                    createClipboardEdges(yEdges, clipboardEdges, idMap, 'test-graph', newEdgeIds);
                });

                const edge = yEdges.get(newEdgeIds[0]) as Record<string, unknown>;
                // Edge data is stored in metadata object
                const metadata = edge.metadata as Record<string, unknown>;
                expect(metadata.kind).toBe('dependency');
                expect(metadata.dependencyType).toBe('FS');
            });
        });
    });

    describe('createParentChildEdges', () => {
        let yDoc: Y.Doc;
        let yEdges: Y.Map<unknown>;

        beforeEach(() => {
            yDoc = new Y.Doc();
            yEdges = yDoc.getMap('edges');
        });

        describe('TC-Paste-2: Hierarchy Restoration (Parent-Child Edges)', () => {
            it('should create edges for orphan nodes attached to fallback parent', () => {
                // Paste context: nodes without original parents get attached to fallback
                const parentChildRelations = [
                    { parentId: 'fallback-parent', childId: 'orphan-1' },
                    { parentId: 'fallback-parent', childId: 'orphan-2' },
                ];

                const clipboardEdges: ClipboardEdgeData[] = []; // No edges in clipboard
                const idMap = new Map([
                    ['original-orphan-1', 'orphan-1'],
                    ['original-orphan-2', 'orphan-2'],
                ]);

                const newEdgeIds: string[] = [];

                yDoc.transact(() => {
                    createParentChildEdges(
                        yEdges,
                        parentChildRelations,
                        clipboardEdges,
                        idMap,
                        'test-graph',
                        newEdgeIds
                    );
                });

                expect(newEdgeIds).toHaveLength(2);

                const edges = Array.from(yEdges.values()) as Array<{ source: string; target: string }>;
                expect(edges.every(e => e.source === 'fallback-parent')).toBe(true);
            });
        });
    });
});

describe('ID Regeneration (TC-Paste-1)', () => {
    it('should write pasted nodes with regenerated IDs into Yjs', async () => {
        vi.useFakeTimers();

        const graph = {
            getGraphArea: () => ({ center: { x: 0, y: 0 } }),
            getNodes: () => [],
            getCellById: () => null,
            centerCell: () => undefined,
        } as unknown as Graph;

        const yDoc = new Y.Doc();

        const originalIds = ['node-1', 'node-2', 'node-3'];
        const clipboardPayload = {
            version: '1.0',
            source: 'cdm-17',
            timestamp: Date.now(),
            sourceGraphId: 'source-graph',
            nodes: originalIds.map((originalId, idx) => ({
                originalId,
                label: `Node ${idx + 1}`,
                type: NodeType.ORDINARY,
                x: idx * 10,
                y: idx * 20,
                width: 220,
                height: 40,
                metadata: {},
                tags: [],
            })),
            edges: [],
            layout: { minX: 0, minY: 0, width: 0, height: 0, center: { x: 0, y: 0 } },
        };

        Object.defineProperty(globalThis.navigator, 'clipboard', {
            value: {
                readText: vi.fn().mockResolvedValue(JSON.stringify(clipboardPayload)),
            },
            configurable: true,
        });

        const selectNodes = vi.fn();
        await pasteFromClipboard({
            graph,
            graphId: 'target-graph',
            yDoc,
            undoManager: null,
            selectedNodes: [] as unknown as Node[],
            selectNodes,
        });

        // Flush selection callback
        vi.runAllTimers();
        vi.useRealTimers();

        const yNodes = yDoc.getMap('nodes');
        expect(yNodes.size).toBe(originalIds.length);

        const newIds = Array.from(yNodes.keys());
        expect(new Set(newIds).size).toBe(originalIds.length);
        originalIds.forEach((originalId) => {
            expect(newIds).not.toContain(originalId);
        });

        newIds.forEach((newId) => {
            const node = yNodes.get(newId) as { id?: string } | undefined;
            expect(node?.id).toBe(newId);
        });
    });
});
