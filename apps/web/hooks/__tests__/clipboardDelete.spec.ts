/**
 * Story 7.4: Clipboard Delete Handler Tests
 * Tests for softDeleteNodes and hardDeleteNodes functions
 * 
 * Test Cases:
 * - TC-Delete-1: Soft delete marks nodes as archived
 * - TC-Delete-2: Soft delete includes all descendants
 * - TC-Delete-3: Root node protection
 * - TC-Delete-4: X6 visibility update
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';
import type { Node, Graph, Cell } from '@antv/x6';

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        warning: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock API calls
vi.mock('@/lib/api/nodes', () => ({
    archiveNode: vi.fn().mockResolvedValue({}),
}));

// Import after mocks
import { softDeleteNodes, hardDeleteNodes } from '../clipboard/clipboardDelete';
import { toast } from 'sonner';

// Helper to create mock node
function createMockNode(id: string): Node {
    return {
        id,
        isNode: () => true,
    } as unknown as Node;
}

// Helper to create mock graph
function createMockGraph(nodeIds: string[]): Graph {
    const cells = new Map<string, Cell>();
    nodeIds.forEach(id => {
        const cell = {
            id,
            setVisible: vi.fn(),
        } as unknown as Cell;
        cells.set(id, cell);
    });

    return {
        getCellById: (id: string) => cells.get(id),
        getConnectedEdges: () => [],
        cleanSelection: vi.fn(),
    } as unknown as Graph;
}

describe('softDeleteNodes', () => {
    let yDoc: Y.Doc;
    let yNodes: Y.Map<unknown>;

    beforeEach(() => {
        yDoc = new Y.Doc();
        yNodes = yDoc.getMap('nodes');
        vi.clearAllMocks();
    });

    describe('TC-Delete-1: Soft delete marks nodes as archived', () => {
        it('should mark single node as archived in Yjs', () => {
            yNodes.set('node1', {
                id: 'node1',
                label: 'Node 1',
                isArchived: false,
            });

            const graph = createMockGraph(['node1']);
            const selectedNodes = [createMockNode('node1')];
            const clearSelection = vi.fn();

            softDeleteNodes({
                graph,
                yDoc,
                undoManager: null,
                selectedNodes,
                clearSelection,
            });

            const node = yNodes.get('node1') as Record<string, unknown>;
            expect(node.isArchived).toBe(true);
            expect(node.archivedAt).toBeDefined();
            expect(clearSelection).toHaveBeenCalled();
        });

        it('should mark multiple selected nodes as archived', () => {
            yNodes.set('node1', { id: 'node1', label: 'Node 1', isArchived: false });
            yNodes.set('node2', { id: 'node2', label: 'Node 2', isArchived: false });

            const graph = createMockGraph(['node1', 'node2']);
            const selectedNodes = [createMockNode('node1'), createMockNode('node2')];

            softDeleteNodes({
                graph,
                yDoc,
                undoManager: null,
                selectedNodes,
                clearSelection: vi.fn(),
            });

            const node1 = yNodes.get('node1') as Record<string, unknown>;
            const node2 = yNodes.get('node2') as Record<string, unknown>;
            expect(node1.isArchived).toBe(true);
            expect(node2.isArchived).toBe(true);
        });
    });

    describe('TC-Delete-2: Soft delete includes all descendants', () => {
        it('should archive parent and all children', () => {
            yNodes.set('parent', { id: 'parent', label: 'Parent', isArchived: false });
            yNodes.set('child1', { id: 'child1', label: 'Child 1', parentId: 'parent', isArchived: false });
            yNodes.set('child2', { id: 'child2', label: 'Child 2', parentId: 'parent', isArchived: false });

            const graph = createMockGraph(['parent', 'child1', 'child2']);
            const selectedNodes = [createMockNode('parent')];

            softDeleteNodes({
                graph,
                yDoc,
                undoManager: null,
                selectedNodes,
                clearSelection: vi.fn(),
            });

            expect((yNodes.get('parent') as Record<string, unknown>).isArchived).toBe(true);
            expect((yNodes.get('child1') as Record<string, unknown>).isArchived).toBe(true);
            expect((yNodes.get('child2') as Record<string, unknown>).isArchived).toBe(true);
        });

        it('should archive grandchildren recursively', () => {
            yNodes.set('root', { id: 'root', label: 'Root', isArchived: false });
            yNodes.set('child', { id: 'child', label: 'Child', parentId: 'root', isArchived: false });
            yNodes.set('grandchild', { id: 'grandchild', label: 'Grandchild', parentId: 'child', isArchived: false });

            const graph = createMockGraph(['root', 'child', 'grandchild']);
            const selectedNodes = [createMockNode('root')];

            softDeleteNodes({
                graph,
                yDoc,
                undoManager: null,
                selectedNodes,
                clearSelection: vi.fn(),
            });

            expect((yNodes.get('root') as Record<string, unknown>).isArchived).toBe(true);
            expect((yNodes.get('child') as Record<string, unknown>).isArchived).toBe(true);
            expect((yNodes.get('grandchild') as Record<string, unknown>).isArchived).toBe(true);
        });
    });

    describe('TC-Delete-3: Root node protection', () => {
        it('should prevent deletion of center-node', () => {
            yNodes.set('center-node', { id: 'center-node', label: 'Root', isArchived: false });

            const graph = createMockGraph(['center-node']);
            const selectedNodes = [createMockNode('center-node')];

            softDeleteNodes({
                graph,
                yDoc,
                undoManager: null,
                selectedNodes,
                clearSelection: vi.fn(),
            });

            const node = yNodes.get('center-node') as Record<string, unknown>;
            expect(node.isArchived).toBe(false);
            expect(toast.warning).toHaveBeenCalledWith('无法删除根节点');
        });
    });

    describe('TC-Delete-4: Edge cases', () => {
        it('should do nothing for empty selection', () => {
            yNodes.set('node1', { id: 'node1', label: 'Node 1', isArchived: false });

            const graph = createMockGraph(['node1']);
            const clearSelection = vi.fn();

            softDeleteNodes({
                graph,
                yDoc,
                undoManager: null,
                selectedNodes: [],
                clearSelection,
            });

            const node = yNodes.get('node1') as Record<string, unknown>;
            expect(node.isArchived).toBe(false);
            expect(clearSelection).not.toHaveBeenCalled();
        });
    });
});

describe('hardDeleteNodes', () => {
    let yDoc: Y.Doc;
    let yNodes: Y.Map<unknown>;

    beforeEach(() => {
        yDoc = new Y.Doc();
        yNodes = yDoc.getMap('nodes');
        vi.clearAllMocks();
    });

    describe('TC-HardDelete-1: Confirmation dialog', () => {
        it('should call showConfirm with correct message', () => {
            yNodes.set('node1', { id: 'node1', label: 'Node 1' });

            const graph = createMockGraph(['node1']);
            const showConfirm = vi.fn();

            hardDeleteNodes({
                graph,
                yDoc,
                undoManager: null,
                selectedNodes: [createMockNode('node1')],
                clearSelection: vi.fn(),
                showConfirm,
            });

            expect(showConfirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: '确认永久删除',
                    variant: 'danger',
                })
            );
        });

        it('should include descendant count in message when deleting parent', () => {
            yNodes.set('parent', { id: 'parent', label: 'Parent' });
            yNodes.set('child', { id: 'child', label: 'Child', parentId: 'parent' });

            const graph = createMockGraph(['parent', 'child']);
            const showConfirm = vi.fn();

            hardDeleteNodes({
                graph,
                yDoc,
                undoManager: null,
                selectedNodes: [createMockNode('parent')],
                clearSelection: vi.fn(),
                showConfirm,
            });

            expect(showConfirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    description: expect.stringContaining('1 个子节点'),
                })
            );
        });
    });

    describe('TC-HardDelete-2: Root node protection', () => {
        it('should prevent hard deletion of center-node', () => {
            yNodes.set('center-node', { id: 'center-node', label: 'Root' });

            const graph = createMockGraph(['center-node']);
            const showConfirm = vi.fn();

            hardDeleteNodes({
                graph,
                yDoc,
                undoManager: null,
                selectedNodes: [createMockNode('center-node')],
                clearSelection: vi.fn(),
                showConfirm,
            });

            expect(showConfirm).not.toHaveBeenCalled();
            expect(toast.warning).toHaveBeenCalledWith('无法删除根节点');
        });
    });
});
