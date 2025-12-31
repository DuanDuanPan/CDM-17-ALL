/**
 * Plugin Workflow Approval - Server Entry Point
 * Story 7.5: Plugin Migration
 * 
 * This module provides the backend (NestJS) module for the approval workflow plugin.
 * 
 * @module @cdm/plugin-workflow-approval/server
 */

import { Module, DynamicModule } from '@nestjs/common';
import { ApprovalModule, ApprovalModuleOptions } from './approval/approval.module';

// Re-export modules
export { ApprovalModule, ApprovalModuleOptions } from './approval/approval.module';

// Re-export services
export { ApprovalService, APPROVAL_EVENTS } from './approval/approval.service';

// Re-export injection tokens
export {
    NOTIFICATION_SERVICE,
    COLLAB_SERVICE,
    INotificationService,
    ICollabService,
} from './approval/approval.listener';

// Re-export repositories
export { ApprovalRepository } from './approval/approval.repository';

/**
 * Options for configuring the WorkflowApprovalServerModule
 */
export interface WorkflowApprovalServerModuleOptions {
    /** Modules to import (e.g., NotificationModule, NodesModule, CollabModule) */
    imports?: any[];
}

/**
 * WorkflowApprovalServerModule
 * 
 * The main server module for the workflow approval plugin.
 * 
 * @example
 * ```typescript
 * // In apps/api/src/app.module.ts
 * import { WorkflowApprovalServerModule } from '@cdm/plugin-workflow-approval/server';
 * 
 * @Module({
 *   imports: [
 *     WorkflowApprovalServerModule.forRoot({
 *       imports: [NotificationModule, NodesModule, CollabModule],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class WorkflowApprovalServerModule {
    /**
     * Register the WorkflowApprovalServerModule with dynamic configuration
     */
    static forRoot(options: WorkflowApprovalServerModuleOptions = {}): DynamicModule {
        return {
            module: WorkflowApprovalServerModule,
            imports: [
                ApprovalModule.forRoot({ imports: options.imports }),
            ],
            exports: [ApprovalModule],
        };
    }

    /**
     * Register with default configuration (no external dependencies)
     */
    static register(): DynamicModule {
        return this.forRoot();
    }
}
