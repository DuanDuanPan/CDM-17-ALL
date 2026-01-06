import { Graph, Node, Edge, Cell } from '@antv/x6';
import * as Y from 'yjs';
import { LayoutMode, NodeType, TaskProps, RequirementProps, PBSProps, DataProps, EdgeMetadata, type ApprovalPipeline, type Deliverable } from '@cdm/types';
import { syncLogger as logger } from '@/lib/logger';
import { VERTICAL_SHARED_TRUNK_ROUTER } from '@/lib/edgeRoutingConstants';
import { HIERARCHICAL_EDGE_ATTRS } from '@/lib/edgeStyles';
import { HIERARCHICAL_EDGE_SHAPE } from '@/lib/edgeShapes';

/**
 * Node data structure stored in Yjs
 * Synced coordinates and business data
 * Story 2.1: Extended with type-specific properties
 */
export interface YjsNodeData {
    id: string;
    x: number;
    y: number;
    label: string;
    createdAt?: string;
    updatedAt?: string;
    creator?: string;
    // Mindmap structure type (root/topic/subtopic)
    mindmapType?: 'root' | 'topic' | 'subtopic';
    /** @deprecated legacy field - use mindmapType */
    type?: 'root' | 'topic' | 'subtopic';
    parentId?: string;
    collapsed?: boolean;
    order?: number;
    metadata?: Record<string, unknown>;

    // Story 2.1: Type-specific properties (Full Sync Strategy - 方案A)
    nodeType?: NodeType;  // Semantic node type (TASK, REQUIREMENT, PBS, DATA, ORDINARY)
    props?: TaskProps | RequirementProps | PBSProps | DataProps | Record<string, never>;

    // Story 2.5: Tags and Archive fields
    tags?: string[];
    isArchived?: boolean;
    archivedAt?: string | null;

    // Story 4.1: Approval data sync
    approval?: ApprovalPipeline;

    // Story 7.2: Deliverables sync for multi-browser collaboration
    deliverables?: Deliverable[];
}

/**
 * Edge data structure stored in Yjs
 * Story 2.2: Extended with edge metadata (kind, dependencyType)
 */
export interface YjsEdgeData {
    id: string;
    source: string;
    target: string;
    /** @deprecated Use metadata.kind instead */
    type: 'hierarchical' | 'reference';
    // Story 2.2: Edge metadata for polymorphic edges
    metadata?: EdgeMetadata;
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

// Origin marker for local UI transactions - used to distinguish from remote sync
const LOCAL_ORIGIN = 'graph-sync-local';

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
        edgeDataChange?: (args: { edge: Edge }) => void;
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

        logger.info('Initialized');
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

        logger.info('Destroyed');
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

        // Story 2.2: Edge data change (metadata, dependencyType)
        this.boundHandlers.edgeDataChange = ({ edge }) => {
            if (this.isRemoteUpdate) return;
            // Bugfix: Defer sync to ensure X6 data is fully updated before reading
            setTimeout(() => {
                this.syncEdgeToYjs(edge);
            }, 0);
        };
        this.graph.on('edge:change:data', this.boundHandlers.edgeDataChange);
    }

    /**
     * Setup Remote → Local sync
     * Listen to Yjs observe and propagate to X6
     */
    private setupRemoteToLocalSync(): void {
        if (!this.yNodes || !this.yEdges || !this.yMeta) return;

        // Observe node changes
        this.yNodes.observe((event) => {
            if (!this.graph) {
                logger.warn('yNodes.observe: graph is null, skipping');
                return;
            }
            // Important: Ignore transactions originating from local UI.
            // Local → Remote sync already originates from X6 graph events.
            // Re-applying local Yjs changes back into X6 causes data overwrite and can wipe UI-only fields
            // (e.g. `isEditing`, `isSelected`), breaking keyboard edit mode.
            // Note: We check origin instead of transaction.local because Hocuspocus Provider may
            // apply remote updates in a way that still appears as "local" transaction internally.
            if (event.transaction.origin === LOCAL_ORIGIN) {
                logger.debug('yNodes.observe: skipping local UI transaction');
                return;
            }

            logger.debug('yNodes.observe: processing remote transaction', {
                changesCount: event.changes.keys.size,
                origin: event.transaction.origin,
            });

            this.isRemoteUpdate = true;
            try {
                event.changes.keys.forEach((change, nodeId) => {
                    logger.debug('yNodes.observe: processing change', { nodeId, action: change.action });
                    if (change.action === 'add' || change.action === 'update') {
                        const nodeData = this.yNodes?.get(nodeId);
                        if (nodeData) {
                            this.applyNodeToGraph(nodeData);
                        }
                    } else if (change.action === 'delete') {
                        logger.info('yNodes.observe: REMOTE DELETE detected', { nodeId });
                        this.removeNodeFromGraph(nodeId);
                    }
                });
            } finally {
                this.isRemoteUpdate = false;
            }
        });

        // Observe edge changes
        this.yEdges.observe((event) => {
            if (!this.graph) {
                logger.warn('yEdges.observe: graph is null, skipping');
                return;
            }
            // Same as nodes: ignore local UI transactions to prevent redundant apply + potential overwrite.
            if (event.transaction.origin === LOCAL_ORIGIN) {
                logger.debug('yEdges.observe: skipping local UI transaction');
                return;
            }

            logger.debug('yEdges.observe: processing remote transaction', {
                changesCount: event.changes.keys.size,
            });

            this.isRemoteUpdate = true;
            try {
                event.changes.keys.forEach((change, edgeId) => {
                    logger.debug('yEdges.observe: processing change', { edgeId, action: change.action });
                    if (change.action === 'add' || change.action === 'update') {
                        const edgeData = this.yEdges?.get(edgeId);
                        if (edgeData) {
                            this.applyEdgeToGraph(edgeData);
                        }
                    } else if (change.action === 'delete') {
                        logger.info('yEdges.observe: REMOTE DELETE detected', { edgeId });
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
        if (this.boundHandlers.edgeDataChange) {
            this.graph.off('edge:change:data', this.boundHandlers.edgeDataChange);
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
     * Story 2.1: Now includes type-specific properties
     */
    private syncNodeToYjs(node: Node): void {
        if (!this.yNodes || !this.yDoc) return;

        const position = node.getPosition();
        const data = node.getData() || {};
        const mindmapType = (data.type as 'root' | 'topic' | 'subtopic') || 'topic';

        const yjsNodeData: YjsNodeData = {
            id: node.id,
            x: position.x,
            y: position.y,
            label: data.label || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            creator: data.creator,
            mindmapType,
            parentId: data.parentId,
            collapsed: data.collapsed,
            order: data.order,
            metadata: data.metadata,
            // Story 2.1: Sync semantic node type and properties
            nodeType: data.nodeType as NodeType,
            props: data.props,
            // Story 2.5: Sync tags and archive fields
            tags: Array.isArray(data.tags) ? data.tags : undefined,
            isArchived: typeof data.isArchived === 'boolean' ? data.isArchived : undefined,
            archivedAt: data.archivedAt !== undefined ? data.archivedAt : undefined,
            // Story 4.1: Sync approval data
            approval: data.approval as ApprovalPipeline | undefined,
            // Story 7.2: Sync deliverables for multi-browser collaboration
            deliverables: Array.isArray(data.deliverables) ? data.deliverables as Deliverable[] : undefined,
        };

        this.yDoc.transact(() => {
            this.yNodes?.set(node.id, yjsNodeData);
        }, LOCAL_ORIGIN);
    }

    /**
     * Sync node position only (optimized for drag)
     * [AI-Review-2][MEDIUM-4] Fixed: Only use mindmapType, remove deprecated type field
     */
    private syncNodePositionToYjs(node: Node): void {
        if (!this.yNodes || !this.yDoc) return;

        const existing = this.yNodes.get(node.id);
        if (!existing) return;

        const position = node.getPosition();
        // Use mindmapType only, fallback to existing value or 'topic'
        const mindmapType = existing.mindmapType ?? 'topic';

        this.yDoc.transact(() => {
            this.yNodes?.set(node.id, {
                ...existing,
                x: position.x,
                y: position.y,
                mindmapType,
            });
        }, LOCAL_ORIGIN);
    }

    /**
     * Remove a node from Yjs
     */
    private removeNodeFromYjs(nodeId: string): void {
        if (!this.yNodes || !this.yDoc) return;

        this.yDoc.transact(() => {
            this.yNodes?.delete(nodeId);
        }, LOCAL_ORIGIN);
        logger.debug('Removed node from Yjs', { nodeId });
    }

    /**
     * Sync an edge to Yjs
     * Story 2.2: Now includes edge metadata (kind, dependencyType)
     */
    private syncEdgeToYjs(edge: Edge): void {
        if (!this.yEdges || !this.yDoc) return;

        const source = edge.getSourceCellId();
        const target = edge.getTargetCellId();

        if (!source || !target) return;

        const edgeData = edge.getData() || {};
        // Story 2.2: Extract edge metadata from edge data
        const metadata: EdgeMetadata = edgeData.metadata || { kind: 'hierarchical' };

        const yjsEdgeData: YjsEdgeData = {
            id: edge.id,
            source,
            target,
            type: (edgeData.type as 'hierarchical' | 'reference') || 'hierarchical',
            // Story 2.2: Include edge metadata for polymorphic edges
            metadata,
        };

        this.yDoc.transact(() => {
            this.yEdges?.set(edge.id, yjsEdgeData);
        }, LOCAL_ORIGIN);
    }

    /**
     * Remove an edge from Yjs
     */
    private removeEdgeFromYjs(edgeId: string): void {
        if (!this.yEdges || !this.yDoc) return;

        this.yDoc.transact(() => {
            this.yEdges?.delete(edgeId);
        }, LOCAL_ORIGIN);
        logger.debug('Removed edge from Yjs', { edgeId });
    }

    // ========== Remote → Local Sync Methods ==========

    /**
     * Apply node data from Yjs to X6 graph
     * Story 2.1: Now applies type-specific properties
     * Story 2.7: Now handles visibility based on isArchived state
     */
    private applyNodeToGraph(data: YjsNodeData): void {
        if (!this.graph) return;

        const existingCell = this.graph.getCellById(data.id);
        // [AI-Review-2][MEDIUM-4] Fixed: Only use mindmapType, remove deprecated type fallback
        const mindmapType = data.mindmapType ?? 'topic';

        if (existingCell && existingCell.isNode()) {
            // Update existing node - now we know it's a Node
            const existingNode = existingCell as Node;
            const existingData = existingNode.getData() || {};
            // Preserve local-only UI state when applying remote updates.
            // Remote Yjs node data intentionally excludes ephemeral UI flags (e.g. isEditing/isSelected),
            // but overwriting X6 node data without them would abruptly exit edit mode during collaboration.
            const localUiState = {
                isEditing: existingData.isEditing,
                isSelected: existingData.isSelected,
                isConnectionSource: existingData.isConnectionSource,
                _batchId: existingData._batchId,
            };
            // Update position and data; isRemoteUpdate guard prevents echo loops.
            existingNode.setPosition(data.x, data.y);
            existingNode.setData({
                ...localUiState,
                label: data.label,
                type: mindmapType,
                parentId: data.parentId,
                collapsed: data.collapsed,
                order: data.order,
                metadata: data.metadata,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                creator: data.creator,
                // Story 2.1: Apply semantic node type and properties
                nodeType: data.nodeType,
                props: data.props,
                // Story 2.5: Apply tags and archive fields
                tags: data.tags,
                isArchived: data.isArchived,
                archivedAt: data.archivedAt,
                // Story 4.1: Apply approval data
                approval: data.approval,
                // Story 7.2: Apply deliverables for multi-browser collaboration
                deliverables: data.deliverables,
            }, { overwrite: true });

            // Story 2.7: Handle visibility based on isArchived state (multi-client sync)
            if (data.isArchived) {
                existingNode.hide();
                // Also hide connected edges
                const edges = this.graph.getConnectedEdges(existingNode);
                edges?.forEach(edge => edge.hide());
            } else {
                // When unarchiving, show the node
                existingNode.show();
                // Show connected edges only if BOTH endpoints are visible
                const edges = this.graph.getConnectedEdges(existingNode);
                edges?.forEach(edge => {
                    const source = edge.getSourceCell();
                    const target = edge.getTargetCell();
                    if (source?.isVisible() && target?.isVisible()) {
                        edge.show();
                    }
                });
            }

            logger.debug('Updated existing node', { id: data.id, mindmapType, nodeType: data.nodeType, isArchived: data.isArchived, approval: data.approval?.status });
        } else if (!existingCell) {
            // Add new node with mind-node shape for proper rendering
            // Story 2.7: Check if node should be visible based on archive status
            const shouldBeVisible = !data.isArchived;

            const newNode = this.graph.addNode({
                shape: 'mind-node', // Critical: use mind-node shape for proper React component rendering
                id: data.id,
                x: data.x,
                y: data.y,
                width: 120,
                height: 50,
                visible: shouldBeVisible, // Story 2.7: Set initial visibility
                data: {
                    label: data.label,
                    type: mindmapType,
                    parentId: data.parentId,
                    collapsed: data.collapsed,
                    order: data.order,
                    metadata: data.metadata,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    creator: data.creator,
                    // Story 2.1: Apply semantic node type and properties
                    nodeType: data.nodeType,
                    props: data.props,
                    // Story 2.5: Apply tags and archive fields
                    tags: data.tags,
                    isArchived: data.isArchived,
                    archivedAt: data.archivedAt,
                    // Story 4.1: Apply approval data
                    approval: data.approval,
                    // Story 7.2: Apply deliverables for multi-browser collaboration
                    deliverables: data.deliverables,
                },
            });

            // Story 2.7: Ensure visibility is set correctly after creation
            if (!shouldBeVisible) {
                newNode.hide();
            }

            logger.debug('Added new node', { id: data.id, mindmapType, nodeType: data.nodeType, isArchived: data.isArchived, approval: data.approval?.status });
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
            logger.debug('Removed node from graph', { nodeId });
        }
    }

    /**
     * Apply edge data from Yjs to X6 graph
     * Story 2.2: Now applies edge metadata and uses appropriate styling
     */
    private applyEdgeToGraph(data: YjsEdgeData): void {
        if (!this.graph) return;

        const existingEdge = this.graph.getCellById(data.id);
        // Story 2.2: Determine edge kind from metadata or fall back to legacy type
        const edgeKind = data.metadata?.kind || (data.type === 'reference' ? 'dependency' : 'hierarchical');
        const isDependency = edgeKind === 'dependency';

        // Story 2.2: Different styling for dependency edges vs hierarchical edges
        const dependencyType = data.metadata?.dependencyType || 'FS';
        const edgeAttrs = isDependency
            ? {
                line: {
                    stroke: '#9ca3af', // Gray-400 for dependency edges (per design spec)
                    strokeWidth: 2,
                    strokeDasharray: '5 5', // Dashed line for dependency
                    sourceMarker: {
                        name: 'circle',
                        r: 4,
                        stroke: '#9ca3af',
                        fill: '#fff',
                    },
                    targetMarker: {
                        name: 'classic',
                        size: 8,
                        stroke: '#9ca3af',
                        fill: '#9ca3af',
                    },
                },
            }
            : HIERARCHICAL_EDGE_ATTRS;

        const layoutMode = this.getLayoutMode() ?? 'mindmap';
        // Only Logic layout is a strict top-to-bottom tree that benefits from a shared-trunk router
        // and fixed anchors. Free mode preserves the current spatial arrangement, so forcing a
        // vertical router there will make edges look "wrong" when nodes are arranged horizontally.
        const useVerticalRouter = layoutMode === 'logic';
        const hierarchicalSource = useVerticalRouter
            ? { cell: data.source, anchor: { name: 'bottom' } }
            : { cell: data.source };
        const hierarchicalTarget = useVerticalRouter
            ? { cell: data.target, anchor: { name: 'top' } }
            : { cell: data.target };
        const hierarchicalRouter = useVerticalRouter ? { name: VERTICAL_SHARED_TRUNK_ROUTER } : undefined;
        const hierarchicalConnector = useVerticalRouter
            ? { name: 'rounded', args: { radius: 8 } }
            : { name: 'smooth' };

        // Story 2.2: Labels for dependency edges showing type (FS/SS/FF/SF)
        const edgeLabels = isDependency
            ? [
                {
                    attrs: {
                        label: {
                            text: dependencyType,
                            fill: '#6b7280',
                            fontSize: 10,
                            fontWeight: 'bold',
                        },
                        body: {
                            fill: '#f3f4f6',
                            stroke: '#9ca3af',
                            strokeWidth: 1,
                            rx: 4,
                            ry: 4,
                        },
                    },
                    position: 0.5,
                },
            ]
            : [];

        if (!existingEdge) {
            // Add new edge with proper styling based on edge kind
            this.graph.addEdge({
                id: data.id,
                ...(isDependency ? {} : { shape: HIERARCHICAL_EDGE_SHAPE }),
                source: isDependency ? data.source : hierarchicalSource,
                target: isDependency ? data.target : hierarchicalTarget,
                data: {
                    type: data.type,
                    // Story 2.2: Include metadata in edge data
                    metadata: data.metadata || { kind: 'hierarchical' },
                },
                // Story 2.2: Apply Router and Connector based on edge kind
                // Dependency: Manhattan router + Rounded connector
                // Hierarchical: Shared-trunk router + Rounded connector
                router: isDependency ? {
                    name: 'manhattan',
                    args: {
                        padding: 20,
                        startDirections: ['right', 'left', 'top', 'bottom'],
                        endDirections: ['right', 'left', 'top', 'bottom'],
                    }
                } : hierarchicalRouter,
                connector: isDependency ? {
                    name: 'rounded',
                    args: { radius: 10 }
                } : hierarchicalConnector,
                attrs: edgeAttrs,
                labels: edgeLabels,
            });
            logger.debug('Added edge', { id: data.id, source: data.source, target: data.target, kind: edgeKind });
        } else if (existingEdge.isEdge()) {
            // Story 2.2: Update existing edge metadata
            const edge = existingEdge as Edge;
            if (!isDependency) {
                edge.prop('shape', HIERARCHICAL_EDGE_SHAPE);
            }
            edge.setData({
                type: data.type,
                metadata: data.metadata || { kind: 'hierarchical' },
            });
            edge.setAttrs(edgeAttrs);

            // Story 2.2: Update labels for dependency type changes
            if (isDependency) {
                edge.setLabels(edgeLabels);
            }

            // Sync Router and Connector for existing edges
            if (isDependency) {
                edge.setRouter({
                    name: 'manhattan',
                    args: {
                        padding: 20,
                        startDirections: ['right', 'left', 'top', 'bottom'],
                        endDirections: ['right', 'left', 'top', 'bottom'],
                    }
                });
                edge.setConnector({ name: 'rounded', args: { radius: 10 } });
            } else {
                if (useVerticalRouter) {
                    edge.setRouter({ name: VERTICAL_SHARED_TRUNK_ROUTER });
                    edge.setConnector({ name: 'rounded', args: { radius: 8 } });
                    edge.setSource(hierarchicalSource);
                    edge.setTarget(hierarchicalTarget);
                } else {
                    edge.removeRouter();
                    edge.setConnector({ name: 'smooth' });
                    edge.setSource(hierarchicalSource);
                    edge.setTarget(hierarchicalTarget);
                }
                // Clear labels for hierarchical edges if they had any
                edge.setLabels([]);
            }

            logger.debug('Updated edge', { id: data.id, kind: edgeKind });
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
            logger.debug('Removed edge from graph', { edgeId });
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
        }, LOCAL_ORIGIN);
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
     * Story 2.1: Now includes type-specific properties
     */
    syncAllNodesToYjs(): void {
        if (!this.graph || !this.yNodes || !this.yDoc) return;

        const nodes = this.graph.getNodes();

        this.yDoc.transact(() => {
            nodes.forEach((node) => {
                const position = node.getPosition();
                const data = node.getData() || {};
                const mindmapType = (data.type as 'root' | 'topic' | 'subtopic') || 'topic';

                const yjsNodeData: YjsNodeData = {
                    id: node.id,
                    x: position.x,
                    y: position.y,
                    label: data.label || '',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    mindmapType,
                    parentId: data.parentId,
                    collapsed: data.collapsed,
                    order: data.order,
                    metadata: data.metadata,
                    // Story 2.1: Sync semantic node type and properties
                    nodeType: data.nodeType as NodeType,
                    props: data.props,
                    // Story 2.5: Sync tags and archive fields
                    tags: Array.isArray(data.tags) ? data.tags : undefined,
                    isArchived: typeof data.isArchived === 'boolean' ? data.isArchived : undefined,
                    archivedAt: data.archivedAt !== undefined ? data.archivedAt : undefined,
                    // Story 4.1: Sync approval data
                    approval: data.approval as ApprovalPipeline | undefined,
                };

                this.yNodes?.set(node.id, yjsNodeData);
            });
        }, LOCAL_ORIGIN);
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
