/**
 * Story 4.3: Contextual Comments & Mentions
 * Story 7.5: Migrated to plugin-comments
 * Story 10.5: FileStorageService integration via module import
 * 
 * Comments Module - NestJS module definition.
 * External dependencies (FileStorageModule) are injected by kernel.
 */

import { Module, DynamicModule } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { AttachmentsController, FILE_STORAGE_SERVICE } from './attachments.controller';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './comments.repository';
import { AttachmentsRepository } from './attachments.repository';
import { CommentsGateway } from './comments.gateway';

/**
 * Options for configuring the CommentsModule
 */
export interface CommentsModuleOptions {
    /** 
     * Modules to import (e.g., FileStorageModule)
     * These are infrastructure modules provided by the kernel
     */
    imports?: any[];
    /**
     * Story 10.5: Optional FileStorageService class for injection
     * When FileStorageModule is imported, this will be automatically resolved
     */
    fileStorageServiceClass?: any;
}

@Module({})
export class CommentsModule {
    /**
     * Register the CommentsModule with dynamic imports
     * This allows the kernel to inject infrastructure modules (e.g., FileStorageModule)
     * 
     * Story 10.5: FileStorageService is injected via FILE_STORAGE_SERVICE token.
     * The FileStorageService class must be exported by one of the imported modules.
     */
    static forRoot(options: CommentsModuleOptions = {}): DynamicModule {
        const providers: any[] = [
            CommentsService,
            CommentsRepository,
            AttachmentsRepository,
            CommentsGateway,
        ];

        // Story 10.5: If fileStorageServiceClass is provided, create alias provider
        // Otherwise, try to resolve from imported modules using class reference
        if (options.fileStorageServiceClass) {
            providers.push({
                provide: FILE_STORAGE_SERVICE,
                useExisting: options.fileStorageServiceClass,
            });
        }
        // When FileStorageModule is imported, FileStorageService will be available
        // The AttachmentsController uses @Optional() so it won't fail if not available

        return {
            module: CommentsModule,
            imports: options.imports ?? [],
            controllers: [CommentsController, AttachmentsController],
            providers,
            exports: [CommentsService],
        };
    }

    /**
     * Register CommentsModule as a feature module without external dependencies
     * Note: Attachment upload will fail without FileStorageModule
     */
    static register(): DynamicModule {
        return {
            module: CommentsModule,
            controllers: [CommentsController, AttachmentsController],
            providers: [
                CommentsService,
                CommentsRepository,
                AttachmentsRepository,
                CommentsGateway,
                // No FILE_STORAGE_SERVICE - attachments will use @Optional() fallback
            ],
            exports: [CommentsService],
        };
    }
}
