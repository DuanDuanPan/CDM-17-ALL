import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server as HocuspocusServer } from '@hocuspocus/server';
import * as Y from 'yjs';
import { NodeType } from '@cdm/types';
import { prisma } from '@cdm/database';
import { GraphRepository } from '../graphs/graph.repository';

// Event constants for Collab module
export const COLLAB_EVENTS = {
    NODE_CHANGED: 'collab.node.changed',
} as const;

// Event payload for node changes detected via Yjs
export interface YjsNodeChangedEvent {
    nodeId: string;
    nodeName: string;
    mindmapId: string;
    changeType: 'update' | 'delete' | 'create';
}

/**
 * Story 7.5: Batch upsert data structure for CollabService node sync.
 * Kept local to CollabService to avoid kernel → business-module coupling.
 */
interface NodeUpsertBatchData {
    id: string;
    label: string;
    graphId: string;
    type: NodeType;
    x: number;
    y: number;
    width: number;
    height: number;
    parentId: string | null;
    creatorName: string;
    description: string | null;
    tags: string[];
    isArchived: boolean;
}

/**
 * CollabService - Real-time Collaboration Service
 *
 * Manages Hocuspocus WebSocket server for Yjs document synchronization.
 * Implements persistence to PostgreSQL via Prisma.
 *
 * Story 1.4: Real-time Collaboration Engine
 */
@Injectable()
export class CollabService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CollabService.name);
    private hocuspocus: HocuspocusServer | null = null;

    // Story 4.4 [PERF FIX]: Track previous node states to detect actual changes
    // Key: graphId:nodeId, Value: hash of node state (label + relevant props)
    private previousNodeStates = new Map<string, string>();

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        private readonly graphRepository: GraphRepository,
    ) { }

    async onModuleInit() {
        await this.initializeHocuspocusServer();
    }

    async onModuleDestroy() {
        if (this.hocuspocus) {
            this.logger.log('Shutting down Hocuspocus server...');
            await this.hocuspocus.destroy();
            this.hocuspocus = null;
        }
    }

    /**
     * Initialize the Hocuspocus WebSocket server
     *
     * Configuration:
     * - Port: COLLAB_WS_PORT env var (default: 1234)
     * - Authentication via onConnect hook
     * - Persistence via onLoadDocument / onStoreDocument hooks
     */
    private async initializeHocuspocusServer(): Promise<void> {
        const port = this.configService.get<number>('COLLAB_WS_PORT', 1234);

        this.hocuspocus = new HocuspocusServer({
            port,
            name: 'cdm-collab-server',

            /**
             * onConnect: Authentication hook
             * Verifies Clerk token passed via connection context
             *
             * TODO: Implement actual Clerk token verification when Clerk is integrated
             * For now, accepts all connections for development
             */
            async onConnect({ documentName, requestParameters }) {
                // Extract token from URL parameters (passed via HocuspocusProvider)
                const token = requestParameters?.get('token');

                // TODO: Verify Clerk token here
                // For development, log connection and allow
                Logger.log(
                    `User connected to document: ${documentName} (token: ${token ? 'present' : 'none'})`,
                    'CollabService',
                );

                // Return truthy to allow connection
                return true;
            },

            /**
             * onLoadDocument: Load persisted Yjs state from database
             *
             * Called when a document is first opened by any client.
             * Retrieves the binary Yjs state from PostgreSQL Graph.yjsState field.
             */
            onLoadDocument: async ({ documentName, document }) => {
                Logger.log(`Loading document: ${documentName}`, 'CollabService');

                try {
                    // documentName format: "graph:<graphId>"
                    const graphId = documentName.replace('graph:', '');

                    // 1. Try to load yjsState from graph table
                    // Story 7.1: Refactored to use GraphRepository
                    const graph = await this.graphRepository.findGraphWithRelations(graphId);

                    if (!graph) {
                        Logger.warn(`Graph ${graphId} not found in database`, 'CollabService');
                        return;
                    }

                    // 2. If yjsState exists, load it
                    if (graph.yjsState && graph.yjsState.length > 0) {
                        const update = new Uint8Array(graph.yjsState);
                        Y.applyUpdate(document, update);
                        Logger.log(`Document ${documentName} loaded from DB (graphId: ${graphId})`, 'CollabService');
                    } else {
                        // 3. Fallback: Initialize Yjs from Relational Data (Nodes/Edges tables)
                        // This handles cases where data was created via API/Seeds but Yjs state is empty
                        Logger.log(`Initializing Yjs document from Relational Data for ${graphId}`, 'CollabService');

                        const yNodes = document.getMap('nodes');
                        const yEdges = document.getMap('edges');
                        const yMeta = document.getMap('meta');

                        document.transact(() => {
                            // Sync Nodes
                            if (graph.nodes) {
                                for (const node of graph.nodes) {
                                    // Story 7.1 Fix: Added appProps to prevent APP node data loss
                                    const props = node.taskProps || node.requirementProps || node.pbsProps || node.dataProps || node.appProps || {};
                                    const yNode = {
                                        id: node.id,
                                        x: node.x,
                                        y: node.y,
                                        label: node.label,
                                        parentId: node.parentId,
                                        width: node.width,
                                        height: node.height,
                                        nodeType: node.type as NodeType,
                                        props: props,
                                        tags: node.tags,
                                        isArchived: node.isArchived,
                                        archivedAt: node.archivedAt ? node.archivedAt.toISOString() : null,
                                        // Story 4.1: Include approval data in initial load
                                        approval: node.approval as unknown,
                                        createdAt: node.createdAt.toISOString(),
                                        updatedAt: node.updatedAt.toISOString(),
                                        metadata: (node.metadata as Record<string, unknown>) || {},
                                        mindmapType: 'topic', // Default to topic
                                    };
                                    yNodes.set(node.id, yNode);
                                }
                            }

                            // Sync Edges from database
                            if (graph.edges) {
                                for (const edge of graph.edges) {
                                    const yEdge = {
                                        id: edge.id,
                                        source: edge.sourceId,
                                        target: edge.targetId,
                                        type: edge.type,
                                        metadata: (edge.metadata as Record<string, unknown>) || {},
                                    };
                                    yEdges.set(edge.id, yEdge);
                                }
                            }

                            // CRITICAL FIX: Auto-generate hierarchical edges based on parentId
                            // When Edge table is empty but nodes have parentId relationships,
                            // we need to create the edges for X6 to render parent-child lines
                            if (graph.nodes) {
                                const existingEdgePairs = new Set<string>();

                                // Collect existing edges (source->target pairs)
                                yEdges.forEach((edgeData: { source: string; target: string }) => {
                                    existingEdgePairs.add(`${edgeData.source}->${edgeData.target}`);
                                });

                                // Generate edges for parentId relationships that don't have edges
                                for (const node of graph.nodes) {
                                    if (node.parentId) {
                                        const edgePair = `${node.parentId}->${node.id}`;

                                        // Only create if edge doesn't already exist
                                        if (!existingEdgePairs.has(edgePair)) {
                                            const generatedEdgeId = `edge-${node.parentId}-${node.id}`;
                                            const yEdge = {
                                                id: generatedEdgeId,
                                                source: node.parentId,
                                                target: node.id,
                                                type: 'hierarchical',
                                                metadata: { kind: 'hierarchical' },
                                            };
                                            yEdges.set(generatedEdgeId, yEdge);
                                            existingEdgePairs.add(edgePair);
                                        }
                                    }
                                }
                            }

                            // Sync Meta
                            const graphData = graph.data as Record<string, unknown> | null;
                            if (graphData && graphData.layoutMode) {
                                yMeta.set('layoutMode', graphData.layoutMode);
                            }
                        });

                        // Count generated edges for logging
                        let edgeCount = 0;
                        yEdges.forEach(() => edgeCount++);
                        Logger.log(`Initialized ${graph.nodes?.length || 0} nodes and ${edgeCount} edges from relational DB`, 'CollabService');
                    }

                    // Story 4.1: Merge approval state from relational DB into Yjs
                    // When yjsState was persisted before approval fields existed (or when approval changed while the doc was closed),
                    // the stored Yjs snapshot may miss the latest approval pipeline. DB is authoritative for approval.
                    if (graph.nodes && graph.nodes.length > 0) {
                        const yNodes = document.getMap<Record<string, unknown>>('nodes');
                        document.transact(() => {
                            for (const node of graph.nodes) {
                                const existing = yNodes.get(node.id);
                                if (!existing || typeof existing !== 'object') continue;
                                yNodes.set(node.id, {
                                    ...(existing as Record<string, unknown>),
                                    approval: node.approval as unknown,
                                });
                            }
                        });
                    }
                } catch (error) {
                    Logger.error(`Failed to load document ${documentName}:`, error, 'CollabService');
                    // Continue with empty document on error - Yjs handles this gracefully
                }
            },

            /**
             * Story 4.4: onChange hook to detect node changes and emit events
             * Called on every document update for subscription notifications
             * 
             * [PERF FIX]: Only emit events for nodes that actually changed
             * by comparing with previous state, preventing N events per update
             */
            onChange: async ({ documentName, document }) => {
                try {
                    // documentName format: "graph:<graphId>"
                    const graphId = documentName.replace('graph:', '');

                    // Get the nodes map to track changes
                    const yNodes = document.getMap<Record<string, unknown>>('nodes');

                    // Track which nodes actually changed
                    yNodes.forEach((nodeData, nodeId) => {
                        if (nodeData && typeof nodeData === 'object') {
                            // Create a simple hash of the node's relevant properties
                            const nodeName = (nodeData as { label?: string }).label || 'Unknown';
                            const metadata = JSON.stringify((nodeData as { metadata?: unknown }).metadata || {});
                            const props = JSON.stringify((nodeData as { props?: unknown }).props || {});
                            const currentHash = `${nodeName}|${metadata}|${props}`;

                            const stateKey = `${graphId}:${nodeId}`;
                            const previousHash = this.previousNodeStates.get(stateKey);

                            // Only emit if node actually changed
                            if (previousHash !== currentHash) {
                                this.previousNodeStates.set(stateKey, currentHash);

                                // Skip initial state population (first time seeing this node)
                                if (previousHash !== undefined) {
                                    const event: YjsNodeChangedEvent = {
                                        nodeId,
                                        nodeName,
                                        mindmapId: graphId,
                                        changeType: 'update',
                                    };
                                    this.eventEmitter.emit(COLLAB_EVENTS.NODE_CHANGED, event);
                                    Logger.debug(`Node changed: ${nodeId} (${nodeName})`, 'CollabService');
                                }
                            }
                        }
                    });
                } catch (error) {
                    Logger.debug(`Error in onChange hook: ${error}`, 'CollabService');
                }
            },

            /**
             * onStoreDocument: Persist Yjs state to database
             *
             * Called periodically (debounced) when document changes.
             * Saves the binary Yjs state to PostgreSQL Graph.yjsState field.
             * 
             * Story 4.4 FIX: Also sync nodes to Node table for subscription feature
             */
            onStoreDocument: async ({ documentName, document }) => {
                Logger.log(`Storing document: ${documentName}`, 'CollabService');

                try {
                    // documentName format: "graph:<graphId>"
                    const graphId = documentName.replace('graph:', '');
                    const state = Y.encodeStateAsUpdate(document);

                    // 1. Save Yjs binary state to Graph table
                    // Story 7.1: Refactored to use GraphRepository
                    // Story 7.1 Fix: Pass Uint8Array directly (from Y.encodeStateAsUpdate)
                    await this.graphRepository.updateYjsState(graphId, state);

                    Logger.log(
                        `Document ${documentName} stored (graphId: ${graphId}, size: ${state.byteLength} bytes)`,
                        'CollabService',
                    );

                    // 2. Story 4.4 FIX: Sync nodes from Yjs to Node table
                    // This ensures nodes exist in relational DB for subscription feature
                    const yNodes = document.getMap<Record<string, unknown>>('nodes');
                    const nodeUpdates: NodeUpsertBatchData[] = [];

                    yNodes.forEach((nodeData, nodeId) => {
                        if (nodeData && typeof nodeData === 'object') {
                            nodeUpdates.push({
                                id: nodeId,
                                label: (nodeData as { label?: string }).label || 'Untitled',
                                graphId,
                                type: ((nodeData as { nodeType?: string }).nodeType || 'ORDINARY') as NodeType,
                                x: (nodeData as { x?: number }).x || 0,
                                y: (nodeData as { y?: number }).y || 0,
                                width: (nodeData as { width?: number }).width || 120,
                                height: (nodeData as { height?: number }).height || 40,
                                parentId: (nodeData as { parentId?: string | null }).parentId || null,
                                creatorName: (nodeData as { creatorName?: string | null }).creatorName || 'Mock User',
                                description: (nodeData as { description?: string | null }).description || null,
                                tags: (nodeData as { tags?: string[] }).tags || [],
                                isArchived: (nodeData as { isArchived?: boolean }).isArchived || false,
                            });
                        }
                    });

                    if (nodeUpdates.length > 0) {
                        const upsertOperations = nodeUpdates.map((node) =>
                            prisma.node.upsert({
                                where: { id: node.id },
                                create: {
                                    id: node.id,
                                    label: node.label,
                                    graphId: node.graphId,
                                    type: node.type,
                                    x: node.x,
                                    y: node.y,
                                    width: node.width,
                                    height: node.height,
                                    parentId: node.parentId,
                                    creatorName: node.creatorName,
                                    description: node.description,
                                    tags: node.tags,
                                    isArchived: node.isArchived,
                                },
                                update: {
                                    label: node.label,
                                    type: node.type,
                                    x: node.x,
                                    y: node.y,
                                    width: node.width,
                                    height: node.height,
                                    parentId: node.parentId,
                                    creatorName: node.creatorName,
                                    description: node.description,
                                    tags: node.tags,
                                    isArchived: node.isArchived,
                                },
                            }),
                        );

                        await prisma.$transaction(upsertOperations);
                        Logger.log(
                            `Synced ${nodeUpdates.length} nodes to Node table for graph ${graphId}`,
                            'CollabService',
                        );
                    }
                } catch (error) {
                    Logger.error(`Failed to store document ${documentName}:`, error, 'CollabService');
                }
            },

            /**
             * onDisconnect: Cleanup on client disconnect
             */
            async onDisconnect({ documentName, clientsCount }) {
                Logger.log(
                    `Client disconnected from ${documentName} (remaining clients: ${clientsCount})`,
                    'CollabService',
                );
            },
        });

        // Actually start the WebSocket server
        await this.hocuspocus.listen();

        this.logger.log(`Hocuspocus server started on port ${port}`);
    }

    /**
     * Get the Hocuspocus server instance
     * Useful for attaching to existing HTTP server if needed
     */
    getServer(): HocuspocusServer | null {
        return this.hocuspocus;
    }

    /**
     * Get WebSocket port configuration
     */
    getPort(): number {
        return this.configService.get<number>('COLLAB_WS_PORT', 1234);
    }
}
