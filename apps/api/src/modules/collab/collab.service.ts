import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server as HocuspocusServer } from '@hocuspocus/server';
import * as Y from 'yjs';
import { prisma } from '@cdm/database';
import { NodeType } from '@cdm/types';

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

    constructor(private readonly configService: ConfigService) { }

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
            async onLoadDocument({ documentName, document }) {
                Logger.log(`Loading document: ${documentName}`, 'CollabService');

                try {
                    // documentName format: "graph:<graphId>"
                    const graphId = documentName.replace('graph:', '');

                    // 1. Try to load yjsState from graph table
                    const graph = await prisma.graph.findUnique({
                        where: { id: graphId },
                        include: {
                            nodes: {
                                include: {
                                    taskProps: true,
                                    requirementProps: true,
                                    pbsProps: true,
                                    dataProps: true,
                                }
                            },
                            edges: true,
                        }
                    });

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
                                    const props = node.taskProps || node.requirementProps || node.pbsProps || node.dataProps || {};
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
                                        createdAt: node.createdAt.toISOString(),
                                        updatedAt: node.updatedAt.toISOString(),
                                        metadata: (node.metadata as any) || {},
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
                                        metadata: (edge.metadata as any) || {},
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
                                yEdges.forEach((edgeData: any) => {
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
                            if (graph.data && (graph.data as any).layoutMode) {
                                yMeta.set('layoutMode', (graph.data as any).layoutMode);
                            }
                        });

                        // Count generated edges for logging
                        let edgeCount = 0;
                        yEdges.forEach(() => edgeCount++);
                        Logger.log(`Initialized ${graph.nodes?.length || 0} nodes and ${edgeCount} edges from relational DB`, 'CollabService');
                    }

                } catch (error) {
                    Logger.error(`Failed to load document ${documentName}:`, error, 'CollabService');
                    // Continue with empty document on error - Yjs handles this gracefully
                }
            },

            /**
             * onStoreDocument: Persist Yjs state to database
             *
             * Called periodically (debounced) when document changes.
             * Saves the binary Yjs state to PostgreSQL Graph.yjsState field.
             */
            async onStoreDocument({ documentName, document }) {
                Logger.log(`Storing document: ${documentName}`, 'CollabService');

                try {
                    // documentName format: "graph:<graphId>"
                    const graphId = documentName.replace('graph:', '');
                    const state = Y.encodeStateAsUpdate(document);

                    await prisma.graph.update({
                        where: { id: graphId },
                        data: { yjsState: Buffer.from(state) },
                    });

                    Logger.log(
                        `Document ${documentName} stored (graphId: ${graphId}, size: ${state.byteLength} bytes)`,
                        'CollabService',
                    );
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
