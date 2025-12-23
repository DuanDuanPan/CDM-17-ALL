import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import { GraphSyncManager, YjsNodeData, YjsEdgeData } from '../../features/collab/GraphSyncManager';

// Mock X6 Graph
const createMockGraph = () => {
    const eventHandlers: Record<string, Function[]> = {};
    const nodes = new Map<string, any>();
    const edges = new Map<string, any>();

    return {
        on: vi.fn((event: string, handler: Function) => {
            if (!eventHandlers[event]) eventHandlers[event] = [];
            eventHandlers[event].push(handler);
        }),
        off: vi.fn((event: string, handler: Function) => {
            if (eventHandlers[event]) {
                eventHandlers[event] = eventHandlers[event].filter(h => h !== handler);
            }
        }),
        getNodes: vi.fn(() => Array.from(nodes.values())),
        getCellById: vi.fn((id: string) => nodes.get(id) || edges.get(id) || null),
        addNode: vi.fn((config: any) => {
            const node = {
                id: config.id,
                isNode: () => true,
                isEdge: () => false,
                getPosition: () => ({ x: config.x, y: config.y }),
                setPosition: vi.fn(),
                getData: () => config.data || {},
                setData: vi.fn(),
            };
            nodes.set(config.id, node);
            return node;
        }),
        addEdge: vi.fn((config: any) => {
            const edge = {
                id: config.id,
                isNode: () => false,
                isEdge: () => true,
                getSourceCellId: () => config.source,
                getTargetCellId: () => config.target,
                getData: () => config.data || {},
            };
            edges.set(config.id, edge);
            return edge;
        }),
        removeCell: vi.fn((cell: any) => {
            nodes.delete(cell.id);
            edges.delete(cell.id);
        }),
        // Story 2.7: Mock getConnectedEdges for archive visibility handling
        getConnectedEdges: vi.fn(() => []),
        _eventHandlers: eventHandlers,
        _nodes: nodes,
        _edges: edges,
    };
};

// Helper to create a mock Node
const createMockNode = (id: string, x: number, y: number, data: any = {}) => ({
    id,
    isNode: () => true,
    isEdge: () => false,
    getPosition: () => ({ x, y }),
    setPosition: vi.fn(),
    getData: () => data,
    setData: vi.fn(),
    // Story 2.7: Visibility methods for archive support
    show: vi.fn(),
    hide: vi.fn(),
    isVisible: () => true,
});

// Helper to create a mock Edge
const createMockEdge = (id: string, source: string, target: string, data: any = {}) => ({
    id,
    isNode: () => false,
    isEdge: () => true,
    getSourceCellId: () => source,
    getTargetCellId: () => target,
    getData: () => data,
});

describe('GraphSyncManager', () => {
    let syncManager: GraphSyncManager;
    let mockGraph: ReturnType<typeof createMockGraph>;
    let yDoc: Y.Doc;

    const waitForMicrotask = async () => new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
        syncManager = new GraphSyncManager();
        mockGraph = createMockGraph();
        yDoc = new Y.Doc();
    });

    afterEach(() => {
        syncManager.destroy();
        yDoc.destroy();
    });

    describe('initialization', () => {
        it('should initialize with graph and yDoc', () => {
            syncManager.initialize(mockGraph as any, yDoc);

            // Verify event listeners were added
            expect(mockGraph.on).toHaveBeenCalledWith('node:added', expect.any(Function));
            expect(mockGraph.on).toHaveBeenCalledWith('node:removed', expect.any(Function));
            expect(mockGraph.on).toHaveBeenCalledWith('node:moved', expect.any(Function));
            expect(mockGraph.on).toHaveBeenCalledWith('edge:added', expect.any(Function));
            expect(mockGraph.on).toHaveBeenCalledWith('edge:removed', expect.any(Function));
        });

        it('should create yjs shared types', () => {
            syncManager.initialize(mockGraph as any, yDoc);

            const yNodes = yDoc.getMap('nodes');
            const yEdges = yDoc.getMap('edges');
            const yMeta = yDoc.getMap('meta');

            expect(yNodes).toBeDefined();
            expect(yEdges).toBeDefined();
            expect(yMeta).toBeDefined();
        });
    });

    describe('Local → Remote sync', () => {
        it('should sync node to yjs when added locally', () => {
            syncManager.initialize(mockGraph as any, yDoc);

            const yNodes = yDoc.getMap<YjsNodeData>('nodes');

            // Simulate the sync by directly calling the method via trigger
            const mockNode = createMockNode('node-1', 100, 200, {
                label: 'Test Node',
                type: 'topic',
                parentId: 'root',
            });

            // Trigger the node:added event manually
            const addHandler = mockGraph._eventHandlers['node:added']?.[0];
            if (addHandler) {
                addHandler({ node: mockNode });
            }

            // Check yjs state
            const yjsNode = yNodes.get('node-1');
            expect(yjsNode).toBeDefined();
            expect(yjsNode?.x).toBe(100);
            expect(yjsNode?.y).toBe(200);
            expect(yjsNode?.label).toBe('Test Node');
            expect(yjsNode?.mindmapType).toBe('topic');
        });

        it('should remove node from yjs when removed locally', () => {
            syncManager.initialize(mockGraph as any, yDoc);

            const yNodes = yDoc.getMap<YjsNodeData>('nodes');

            // First add a node
            yDoc.transact(() => {
                yNodes.set('node-1', {
                    id: 'node-1',
                    x: 100,
                    y: 200,
                    label: 'Test',
                    mindmapType: 'topic',
                });
            });

            expect(yNodes.get('node-1')).toBeDefined();

            // Trigger the node:removed event
            const mockNode = createMockNode('node-1', 100, 200);
            const removeHandler = mockGraph._eventHandlers['node:removed']?.[0];
            if (removeHandler) {
                removeHandler({ node: mockNode });
            }

            expect(yNodes.get('node-1')).toBeUndefined();
        });
    });

    describe('Remote → Local sync', () => {
        it('should ignore local UI yjs node changes with LOCAL_ORIGIN (no local echo apply)', async () => {
            syncManager.initialize(mockGraph as any, yDoc);

            const yNodes = yDoc.getMap<YjsNodeData>('nodes');

            // Transactions with LOCAL_ORIGIN (simulating local UI operations) should be ignored.
            // This uses the same origin marker as GraphSyncManager's internal transact calls.
            yDoc.transact(() => {
                yNodes.set('local-node-1', {
                    id: 'local-node-1',
                    x: 10,
                    y: 20,
                    label: 'Local Node',
                    mindmapType: 'topic',
                });
            }, 'graph-sync-local'); // LOCAL_ORIGIN marker

            await waitForMicrotask();

            expect(mockGraph.addNode).not.toHaveBeenCalled();
        });

        it('should add node to graph when added remotely (via applyUpdate)', async () => {
            syncManager.initialize(mockGraph as any, yDoc);

            // Simulate remote update by applying an update from another doc (transaction.local = false)
            const remoteDoc = new Y.Doc();
            const remoteNodes = remoteDoc.getMap<YjsNodeData>('nodes');
            remoteDoc.transact(() => {
                remoteNodes.set('remote-node-1', {
                    id: 'remote-node-1',
                    x: 300,
                    y: 400,
                    label: 'Remote Node',
                    mindmapType: 'subtopic',
                });
            });
            Y.applyUpdate(yDoc, Y.encodeStateAsUpdate(remoteDoc));

            // Wait for observer to fire
            await waitForMicrotask();

            // Check graph.addNode was called
            expect(mockGraph.addNode).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'remote-node-1',
                    x: 300,
                    y: 400,
                    data: expect.objectContaining({
                        label: 'Remote Node',
                        type: 'subtopic',
                    }),
                })
            );
        });

        it('should update existing node position when changed remotely (via applyUpdate)', async () => {
            syncManager.initialize(mockGraph as any, yDoc);

            // First add a node to the graph's internal map
            const existingNode = createMockNode('existing-node', 100, 100, { label: 'Test' });
            mockGraph._nodes.set('existing-node', existingNode);
            // Apply remote update for the node
            const remoteDoc = new Y.Doc();
            const remoteNodes = remoteDoc.getMap<YjsNodeData>('nodes');
            remoteDoc.transact(() => {
                remoteNodes.set('existing-node', {
                    id: 'existing-node',
                    x: 500,
                    y: 600,
                    label: 'Updated',
                    mindmapType: 'topic',
                });
            });
            Y.applyUpdate(yDoc, Y.encodeStateAsUpdate(remoteDoc));

            // Wait for observer to fire
            await waitForMicrotask();

            // Check setPosition was called (without silent:true - loop prevention is handled by isRemoteUpdate flag)
            expect(existingNode.setPosition).toHaveBeenCalledWith(500, 600);
        });
    });

    describe('Layout mode sync', () => {
        it('should sync layout mode to yjs', () => {
            syncManager.initialize(mockGraph as any, yDoc);

            const yMeta = yDoc.getMap('meta');

            syncManager.setLayoutMode('logic');

            expect(yMeta.get('layoutMode')).toBe('logic');
        });

        it('should call onLayoutModeChange callback when mode changes in yjs', async () => {
            const onLayoutModeChange = vi.fn();
            syncManager.initialize(mockGraph as any, yDoc, onLayoutModeChange);

            const yMeta = yDoc.getMap('meta');

            // Change layout mode externally
            yDoc.transact(() => {
                yMeta.set('layoutMode', 'free');
            });

            // Wait for observer to fire
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(onLayoutModeChange).toHaveBeenCalledWith('free');
        });

        it('should get current layout mode', () => {
            syncManager.initialize(mockGraph as any, yDoc);

            const yMeta = yDoc.getMap('meta');
            yDoc.transact(() => {
                yMeta.set('layoutMode', 'mindmap');
            });

            expect(syncManager.getLayoutMode()).toBe('mindmap');
        });
    });

    describe('Bulk sync', () => {
        it('should sync all nodes to yjs', () => {
            syncManager.initialize(mockGraph as any, yDoc);

            // Add nodes to mock graph
            const node1 = createMockNode('bulk-1', 100, 200, { label: 'Node 1', type: 'root' });
            const node2 = createMockNode('bulk-2', 300, 400, { label: 'Node 2', type: 'topic' });
            mockGraph._nodes.set('bulk-1', node1);
            mockGraph._nodes.set('bulk-2', node2);

            syncManager.syncAllNodesToYjs();

            const yNodes = yDoc.getMap<YjsNodeData>('nodes');
            expect(yNodes.get('bulk-1')).toBeDefined();
            expect(yNodes.get('bulk-2')).toBeDefined();
        });
    });

    describe('Cleanup', () => {
        it('should remove event listeners on destroy', () => {
            syncManager.initialize(mockGraph as any, yDoc);
            syncManager.destroy();

            expect(mockGraph.off).toHaveBeenCalled();
        });
    });
});
