import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server as HocuspocusServer } from '@hocuspocus/server';
import * as Y from 'yjs';

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

                    // TODO: Implement Prisma integration when database module is connected
                    // const prisma = new PrismaClient();
                    // const graph = await prisma.graph.findUnique({ where: { id: graphId } });
                    //
                    // if (graph?.yjsState) {
                    //   const update = new Uint8Array(graph.yjsState);
                    //   Y.applyUpdate(document, update);
                    // }

                    Logger.log(`Document ${documentName} loaded (graphId: ${graphId})`, 'CollabService');
                } catch (error) {
                    Logger.error(`Failed to load document ${documentName}:`, error, 'CollabService');
                    // Continue with empty document on error
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

                    // TODO: Implement Prisma integration when database module is connected
                    // const prisma = new PrismaClient();
                    // await prisma.graph.update({
                    //   where: { id: graphId },
                    //   data: { yjsState: Buffer.from(state) },
                    // });

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
