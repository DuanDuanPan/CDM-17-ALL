import { Graph, Node, Edge, Cell } from '@antv/x6';
import * as Y from 'yjs';
import { LayoutMode, NodeData, EdgeData } from '@cdm/types';

/**
 * Node data structure stored in Yjs
 * Synced coordinates and business data
 */
export interface YjsNodeData {
    id: string;
    x: number;
    y: number;
    label: string;
    type: 'root' | 'topic' | 'subtopic';
    parentId?: string;
    collapsed?: boolean;
    order?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Edge data structure stored in Yjs
 */
export interface YjsEdgeData {
    id: string;
    source: string;
    target: string;
    type: 'hierarchical' | 'reference';
}

/**
 * Yjs document meta structure
 */
export interface YjsMetaData {
    layoutMode: LayoutMode;
    rootId?: string;
}

/**
 * GraphSyncManager - Bidirectional X6 ↔ Yjs Synchronization
 *
 * Responsibilities:
 * - Local → Remote: X6 graph events → Yjs updates
 * - Remote → Local: Yjs observe → X6 graph updates
 * - Layout Mode sync via meta map
 * - Loop prevention with isRemoteUpdate flag
 *
 * Story 1.4: Real-time Collaboration Engine
 */
export class GraphSyncManager {
    private graph: Graph | null = null;
    private yDoc: Y.Doc | null = null;
    private yNodes: Y.Map<YjsNodeData> | null = null;
    private yEdges: Y.Map<YjsEdgeData> | null = null;
    private yMeta: Y.Map<unknown> | null = null;

    // Flag to prevent sync loops
    private isRemoteUpdate = false;

    // Event handler references for cleanup
    private boundHandlers: {
        nodeAdded?: (args: { node: Node }) => void;
        nodeRemoved?: (args: { node: Node }) => void;
        cellRemoved?: (args: { cell: Cell }) => void;
        nodePositionChange?: (args: { node: Node }) => void;
        nodePositionChangeContinuous?: (args: { node: Node }) => void;
        nodeDataChange?: (args: { node: Node }) => void;
        edgeAdded?: (args: { edge: Edge }) => void;
        edgeRemoved?: (args: { edge: Edge }) => void;
    } = {};

    // Layout mode change callback
    private onLayoutModeChange?: (mode: LayoutMode) => void;

    /**
     * Initialize sync manager with X6 graph and Yjs document
     */
    initialize(
        graph: Graph,
        yDoc: Y.Doc,
        onLayoutModeChange?: (mode: LayoutMode) => void
    ): void {
        this.graph = graph;
        this.yDoc = yDoc;
        this.onLayoutModeChange = onLayoutModeChange;

        // Initialize Yjs shared types
        this.yNodes = yDoc.getMap<YjsNodeData>('nodes');
        this.yEdges = yDoc.getMap<YjsEdgeData>('edges');
        this.yMeta = yDoc.getMap<unknown>('meta');

        // Setup bidirectional sync
        this.setupLocalToRemoteSync();
        this.setupRemoteToLocalSync();

        console.log('[GraphSyncManager] Initialized');
    }

    /**
     * Cleanup and disconnect sync manager
     */
    destroy(): void {
        this.removeLocalListeners();
        this.removeRemoteListeners();

        this.graph = null;
        this.yDoc = null;
        this.yNodes = null;
        this.yEdges = null;
        this.yMeta = null;

        console.log('[GraphSyncManager] Destroyed');
    }

    /**
     * Setup Local → Remote sync
     * Listen to X6 events and propagate to Yjs
     */
    private setupLocalToRemoteSync(): void {
        if (!this.graph) return;

        // Node added
        this.boundHandlers.nodeAdded = ({ node }) => {
            if (this.isRemoteUpdate) return;
            this.syncNodeToYjs(node);
        };
        this.graph.on('node:added', this.boundHandlers.nodeAdded);

        // Node removed
        this.boundHandlers.nodeRemoved = ({ node }) => {
            if (this.isRemoteUpdate) return;
            this.removeNodeFromYjs(node.id);
        };
        this.graph.on('node:removed', this.boundHandlers.nodeRemoved);

        // Fallback: cell removed (covers cases where node:removed/edge:removed don't fire)
        this.boundHandlers.cellRemoved = ({ cell }) => {
            if (this.isRemoteUpdate) return;
            if (cell.isNode && cell.isNode()) {
                this.removeNodeFromYjs(cell.id);
            } else if (cell.isEdge && cell.isEdge()) {
                this.removeEdgeFromYjs(cell.id);
            }
        };
        this.graph.on('cell:removed', this.boundHandlers.cellRemoved);

        // Node position change (drag end in free mode)
        this.boundHandlers.nodePositionChange = ({ node }) => {
            if (this.isRemoteUpdate) return;
            this.syncNodePositionToYjs(node);
        };
        this.graph.on('node:moved', this.boundHandlers.nodePositionChange);

        // Node position change (continuous while dragging) - safety net for modes where node:moved may not fire
        this.boundHandlers.nodePositionChangeContinuous = ({ node }) => {
            if (this.isRemoteUpdate) return;
            this.syncNodePositionToYjs(node);
        };
        this.graph.on('node:change:position', this.boundHandlers.nodePositionChangeContinuous);

        // Node data change (label, metadata, etc.)
        this.boundHandlers.nodeDataChange = ({ node }) => {
            if (this.isRemoteUpdate) return;
            this.syncNodeToYjs(node);
        };
        this.graph.on('node:change:data', this.boundHandlers.nodeDataChange);

        // Edge added
        this.boundHandlers.edgeAdded = ({ edge }) => {
            if (this.isRemoteUpdate) return;
            this.syncEdgeToYjs(edge);
        };
        this.graph.on('edge:added', this.boundHandlers.edgeAdded);

        // Edge removed
        this.boundHandlers.edgeRemoved = ({ edge }) => {
            if (this.isRemoteUpdate) return;
            this.removeEdgeFromYjs(edge.id);
        };
        this.graph.on('edge:removed', this.boundHandlers.edgeRemoved);
    }

    /**
     * Setup Remote → Local sync
     * Listen to Yjs observe and propagate to X6
     */
    private setupRemoteToLocalSync(): void {
        if (!this.yNodes || !this.yEdges || !this.yMeta) return;

        // Observe node changes
        this.yNodes.observe((event) => {
            if (!this.graph) return;

            this.isRemoteUpdate = true;
            try {
                event.changes.keys.forEach((change, nodeId) => {
                    if (change.action === 'add' || change.action === 'update') {
                        const nodeData = this.yNodes?.get(nodeId);
                        if (nodeData) {
                            this.applyNodeToGraph(nodeData);
                        }
                    } else if (change.action === 'delete') {
                        this.removeNodeFromGraph(nodeId);
                    }
                });
            } finally {
                this.isRemoteUpdate = false;
            }
        });

        // Observe edge changes
        this.yEdges.observe((event) => {
            if (!this.graph) return;

            this.isRemoteUpdate = true;
            try {
                event.changes.keys.forEach((change, edgeId) => {
                    if (change.action === 'add' || change.action === 'update') {
                        const edgeData = this.yEdges?.get(edgeId);
                        if (edgeData) {
                            this.applyEdgeToGraph(edgeData);
                        }
                    } else if (change.action === 'delete') {
                        this.removeEdgeFromGraph(edgeId);
                    }
                });
            } finally {
                this.isRemoteUpdate = false;
            }
        });

        // Observe meta changes (layout mode, etc.)
        this.yMeta.observe((event) => {
            event.changes.keys.forEach((change, key) => {
                if (key === 'layoutMode' && (change.action === 'add' || change.action === 'update')) {
                    const layoutMode = this.yMeta?.get('layoutMode') as LayoutMode;
                    if (layoutMode && this.onLayoutModeChange) {
                        this.onLayoutModeChange(layoutMode);
                    }
                }
            });
        });
    }

    /**
     * Remove local event listeners
     */
    private removeLocalListeners(): void {
        if (!this.graph) return;

        if (this.boundHandlers.nodeAdded) {
            this.graph.off('node:added', this.boundHandlers.nodeAdded);
        }
        if (this.boundHandlers.nodeRemoved) {
            this.graph.off('node:removed', this.boundHandlers.nodeRemoved);
        }
        if (this.boundHandlers.cellRemoved) {
            this.graph.off('cell:removed', this.boundHandlers.cellRemoved);
        }
        if (this.boundHandlers.nodePositionChange) {
            this.graph.off('node:moved', this.boundHandlers.nodePositionChange);
        }
        if (this.boundHandlers.nodePositionChangeContinuous) {
            this.graph.off('node:change:position', this.boundHandlers.nodePositionChangeContinuous);
        }
        if (this.boundHandlers.nodeDataChange) {
            this.graph.off('node:change:data', this.boundHandlers.nodeDataChange);
        }
        if (this.boundHandlers.edgeAdded) {
            this.graph.off('edge:added', this.boundHandlers.edgeAdded);
        }
        if (this.boundHandlers.edgeRemoved) {
            this.graph.off('edge:removed', this.boundHandlers.edgeRemoved);
        }

        this.boundHandlers = {};
    }

    /**
     * Remove remote observers
     * Note: Yjs observers are cleaned up when document is destroyed
     */
    private removeRemoteListeners(): void {
        // Yjs observers are automatically cleaned up on destroy
    }

    // ========== Local → Remote Sync Methods ==========

    /**
     * Sync a node to Yjs
     */
    private syncNodeToYjs(node: Node): void {
        if (!this.yNodes || !this.yDoc) return;

        const position = node.getPosition();
        const data = node.getData() || {};

        const yjsNodeData: YjsNodeData = {
            id: node.id,
            x: position.x,
            y: position.y,
            label: data.label || '',
            type: data.type || 'topic',
            parentId: data.parentId,
            collapsed: data.collapsed,
            order: data.order,
            metadata: data.metadata,
        };

        this.yDoc.transact(() => {
            this.yNodes?.set(node.id, yjsNodeData);
        });
    }

    /**
     * Sync node position only (optimized for drag)
     */
    private syncNodePositionToYjs(node: Node): void {
        if (!this.yNodes || !this.yDoc) return;

        const existing = this.yNodes.get(node.id);
        if (!existing) return;

        const position = node.getPosition();

        this.yDoc.transact(() => {
            this.yNodes?.set(node.id, {
                ...existing,
                x: position.x,
                y: position.y,
            });
        });
    }

    /**
     * Remove a node from Yjs
     */
    private removeNodeFromYjs(nodeId: string): void {
        if (!this.yNodes || !this.yDoc) return;

        this.yDoc.transact(() => {
            this.yNodes?.delete(nodeId);
        });
        console.log('[GraphSyncManager] Removed node from Yjs:', nodeId);
    }

    /**
     * Sync an edge to Yjs
     */
    private syncEdgeToYjs(edge: Edge): void {
        if (!this.yEdges || !this.yDoc) return;

        const source = edge.getSourceCellId();
        const target = edge.getTargetCellId();

        if (!source || !target) return;

        const yjsEdgeData: YjsEdgeData = {
            id: edge.id,
            source,
            target,
            type: (edge.getData()?.type as 'hierarchical' | 'reference') || 'hierarchical',
        };

        this.yDoc.transact(() => {
            this.yEdges?.set(edge.id, yjsEdgeData);
        });
    }

    /**
     * Remove an edge from Yjs
     */
    private removeEdgeFromYjs(edgeId: string): void {
        if (!this.yEdges || !this.yDoc) return;

        this.yDoc.transact(() => {
            this.yEdges?.delete(edgeId);
        });
        console.log('[GraphSyncManager] Removed edge from Yjs:', edgeId);
    }

    // ========== Remote → Local Sync Methods ==========

    /**
     * Apply node data from Yjs to X6 graph
     */
    private applyNodeToGraph(data: YjsNodeData): void {
        if (!this.graph) return;

        const existingCell = this.graph.getCellById(data.id);

        if (existingCell && existingCell.isNode()) {
            // Update existing node - now we know it's a Node
            const existingNode = existingCell as Node;
            // Update position and data; isRemoteUpdate guard prevents echo loops.
            existingNode.setPosition(data.x, data.y);
            existingNode.setData({
                label: data.label,
                type: data.type,
                parentId: data.parentId,
                collapsed: data.collapsed,
                order: data.order,
                metadata: data.metadata,
            });
            console.log('[GraphSyncManager] Updated existing node:', data.id, 'label:', data.label);
        } else if (!existingCell) {
            // Add new node with mind-node shape for proper rendering
            this.graph.addNode({
                shape: 'mind-node', // Critical: use mind-node shape for proper React component rendering
                id: data.id,
                x: data.x,
                y: data.y,
                width: 120,
                height: 50,
                data: {
                    label: data.label,
                    type: data.type,
                    parentId: data.parentId,
                    collapsed: data.collapsed,
                    order: data.order,
                    metadata: data.metadata,
                },
            });
            console.log('[GraphSyncManager] Added new node:', data.id, 'label:', data.label);
        }
    }

    /**
     * Remove node from X6 graph
     */
    private removeNodeFromGraph(nodeId: string): void {
        if (!this.graph) return;

        const node = this.graph.getCellById(nodeId);
        if (node) {
            this.graph.removeCell(node);
            console.log('[GraphSyncManager] Removed node from graph:', nodeId);
        }
    }

    /**
     * Apply edge data from Yjs to X6 graph
     */
    private applyEdgeToGraph(data: YjsEdgeData): void {
        if (!this.graph) return;

        const existingEdge = this.graph.getCellById(data.id);

        if (!existingEdge) {
            // Add new edge with proper styling to match locally created edges
            this.graph.addEdge({
                id: data.id,
                source: data.source,
                target: data.target,
                data: { type: data.type },
                attrs: {
                    line: {
                        stroke: '#3b82f6',
                        strokeWidth: 2,
                        targetMarker: null,
                    },
                },
            });
            console.log('[GraphSyncManager] Added edge:', data.id, 'from', data.source, 'to', data.target);
        }
    }

    /**
     * Remove edge from X6 graph
     */
    private removeEdgeFromGraph(edgeId: string): void {
        if (!this.graph) return;

        const edge = this.graph.getCellById(edgeId);
        if (edge) {
            this.graph.removeCell(edge);
            console.log('[GraphSyncManager] Removed edge from graph:', edgeId);
        }
    }

    // ========== Layout Mode Sync ==========

    /**
     * Set layout mode (propagates to all collaborators)
     */
    setLayoutMode(mode: LayoutMode): void {
        if (!this.yMeta || !this.yDoc) return;

        this.yDoc.transact(() => {
            this.yMeta?.set('layoutMode', mode);
        });
    }

    /**
     * Get current layout mode from Yjs
     */
    getLayoutMode(): LayoutMode | null {
        return (this.yMeta?.get('layoutMode') as LayoutMode) || null;
    }

    // ========== Bulk Sync Methods ==========

    /**
     * Sync all nodes from X6 to Yjs (for layout recalculation)
     * Used when the initiating client calculates new layout positions
     */
    syncAllNodesToYjs(): void {
        if (!this.graph || !this.yNodes || !this.yDoc) return;

        const nodes = this.graph.getNodes();

        this.yDoc.transact(() => {
            nodes.forEach((node) => {
                const position = node.getPosition();
                const data = node.getData() || {};

                const yjsNodeData: YjsNodeData = {
                    id: node.id,
                    x: position.x,
                    y: position.y,
                    label: data.label || '',
                    type: data.type || 'topic',
                    parentId: data.parentId,
                    collapsed: data.collapsed,
                    order: data.order,
                    metadata: data.metadata,
                };

                this.yNodes?.set(node.id, yjsNodeData);
            });
        });
    }

    /**
     * Load initial state from Yjs to X6
     */
    loadInitialState(): void {
        if (!this.graph || !this.yNodes || !this.yEdges) return;

        this.isRemoteUpdate = true;
        try {
            // Load nodes
            this.yNodes.forEach((data) => {
                this.applyNodeToGraph(data);
            });

            // Load edges
            this.yEdges.forEach((data) => {
                this.applyEdgeToGraph(data);
            });

            // Load layout mode
            const layoutMode = this.getLayoutMode();
            if (layoutMode && this.onLayoutModeChange) {
                this.onLayoutModeChange(layoutMode);
            }
        } finally {
            this.isRemoteUpdate = false;
        }
    }
}

/**
 * Singleton instance for easy access
 */
export const graphSyncManager = new GraphSyncManager();
