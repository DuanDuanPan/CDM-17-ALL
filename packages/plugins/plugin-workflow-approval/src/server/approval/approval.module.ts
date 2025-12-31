/**
 * Story 4.1: Approval Driven Workflow
 * Story 7.5: Migrated to plugin-workflow-approval
 * 
 * Approval Module - Encapsulates approval workflow functionality.
 * External dependencies (NotificationModule, NodesModule, CollabModule) are injected by kernel.
 */

import { Module, DynamicModule } from '@nestjs/common';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { ApprovalRepository } from './approval.repository';
import { ApprovalListener } from './approval.listener';

/**
 * Options for configuring the ApprovalModule
 */
export interface ApprovalModuleOptions {
    /** 
     * Modules to import (e.g., NotificationModule, NodesModule, CollabModule)
     * These are infrastructure modules provided by the kernel
     */
    imports?: any[];
}

@Module({})
export class ApprovalModule {
    /**
     * Register the ApprovalModule with dynamic imports
     * This allows the kernel to inject infrastructure modules
     */
    static forRoot(options: ApprovalModuleOptions = {}): DynamicModule {
        return {
            module: ApprovalModule,
            imports: options.imports ?? [],
            controllers: [ApprovalController],
            providers: [ApprovalService, ApprovalRepository, ApprovalListener],
            exports: [ApprovalService],
        };
    }

    /**
     * Register ApprovalModule as a feature module without external dependencies
     */
    static register(): DynamicModule {
        return this.forRoot();
    }
}
