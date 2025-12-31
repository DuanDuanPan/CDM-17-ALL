/**
 * Plugin Mindmap Core - Server Entry Point
 * Story 7.5: Plugin Migration
 * 
 * This module provides the backend (NestJS) module for the mindmap core plugin.
 * It includes nodes and edges management functionality.
 * 
 * @module @cdm/plugin-mindmap-core/server
 */

import { Module, DynamicModule } from '@nestjs/common';
import { NodesModule, NodesModuleOptions } from './nodes/nodes.module';
import { EdgesModule } from './edges/edges.module';

// Re-export modules
export { NodesModule, NodesModuleOptions } from './nodes/nodes.module';
export { EdgesModule, EdgesModuleOptions } from './edges/edges.module';

// Re-export services
export { NodesService, APP_EXECUTOR_SERVICE, IAppExecutorService } from './nodes/nodes.service';
export { EdgesService } from './edges/edges.service';

// Re-export injection tokens from services
export { NOTIFICATION_SERVICE, INotificationService } from './nodes/services/task.service';

// Re-export repositories
export { NodeRepository } from './nodes/repositories/node.repository';
export { NodeTaskRepository } from './nodes/repositories/node-task.repository';
export { NodeRequirementRepository } from './nodes/repositories/node-requirement.repository';
export { NodePBSRepository } from './nodes/repositories/node-pbs.repository';
export { NodeDataRepository } from './nodes/repositories/node-data.repository';
export { NodeAppRepository } from './nodes/repositories/node-app.repository';
export { EdgeRepository } from './edges/repositories/edge.repository';

// Re-export DTOs
export * from './nodes/nodes.request.dto';
export * from './edges/edges.request.dto';

/**
 * Options for configuring the MindmapCoreServerModule
 */
export interface MindmapCoreServerModuleOptions {
    /** Modules to import for Nodes (e.g., NotificationModule, AppLibraryModule) */
    nodesImports?: any[];
    /** Modules to import for Edges */
    edgesImports?: any[];
    /** Global modules that should be available to all sub-modules */
    globalImports?: any[];
}

/**
 * MindmapCoreServerModule
 * 
 * The main server module for the mindmap core plugin.
 * Combines NodesModule and EdgesModule into a single plugin module.
 * 
 * @example
 * ```typescript
 * // In apps/api/src/app.module.ts
 * import { MindmapCoreServerModule } from '@cdm/plugin-mindmap-core/server';
 * 
 * @Module({
 *   imports: [
 *     MindmapCoreServerModule.forRoot({
 *       nodesImports: [NotificationModule, AppLibraryModule],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class MindmapCoreServerModule {
    /**
     * Register the MindmapCoreServerModule with dynamic configuration
     */
    static forRoot(options: MindmapCoreServerModuleOptions = {}): DynamicModule {
        const nodesImports = [
            ...(options.globalImports ?? []),
            ...(options.nodesImports ?? []),
        ];

        const edgesImports = [
            ...(options.globalImports ?? []),
            ...(options.edgesImports ?? []),
        ];

        return {
            module: MindmapCoreServerModule,
            imports: [
                NodesModule.forRoot({ imports: nodesImports }),
                EdgesModule.forRoot({ imports: edgesImports }),
            ],
            exports: [NodesModule, EdgesModule],
        };
    }

    /**
     * Register with default configuration (no external dependencies)
     */
    static register(): DynamicModule {
        return this.forRoot();
    }
}
