/**
 * Story 4.3: Contextual Comments & Mentions
 * Story 7.5: Migrated to plugin-comments
 * 
 * Comments Module - NestJS module definition.
 * External dependencies (NotificationModule, UsersModule) are injected by kernel.
 */

import { Module, DynamicModule } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { AttachmentsController } from './attachments.controller';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './comments.repository';
import { AttachmentsRepository } from './attachments.repository';
import { CommentsGateway } from './comments.gateway';

/**
 * Options for configuring the CommentsModule
 */
export interface CommentsModuleOptions {
    /** 
     * Modules to import (e.g., NotificationModule, UsersModule)
     * These are infrastructure modules provided by the kernel
     */
    imports?: any[];
}

@Module({})
export class CommentsModule {
    /**
     * Register the CommentsModule with dynamic imports
     * This allows the kernel to inject infrastructure modules
     */
    static forRoot(options: CommentsModuleOptions = {}): DynamicModule {
        return {
            module: CommentsModule,
            imports: options.imports ?? [],
            controllers: [CommentsController, AttachmentsController],
            providers: [
                CommentsService,
                CommentsRepository,
                AttachmentsRepository,
                CommentsGateway,
            ],
            exports: [CommentsService],
        };
    }

    /**
     * Register CommentsModule as a feature module without external dependencies
     */
    static register(): DynamicModule {
        return this.forRoot();
    }
}
