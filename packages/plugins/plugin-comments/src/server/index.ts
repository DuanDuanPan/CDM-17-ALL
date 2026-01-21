/**
 * Plugin Comments - Server Entry Point
 * Story 7.5: Plugin Migration
 * Story 10.5: FileStorageService integration via module import
 * 
 * This module provides the backend (NestJS) module for the comments plugin.
 * Includes contextual comments, mentions, and attachments functionality.
 * 
 * @module @cdm/plugin-comments/server
 */

import { Module, DynamicModule } from '@nestjs/common';
import { CommentsModule } from './comments/comments.module';

// Re-export modules
export { CommentsModule, CommentsModuleOptions } from './comments/comments.module';

// Re-export services
export { CommentsService } from './comments/comments.service';

// Re-export injection tokens
export {
    NOTIFICATION_SERVICE,
    USERS_SERVICE,
    INotificationService,
    IUsersService,
} from './comments/comments.service';

// Re-export repositories
export { CommentsRepository } from './comments/comments.repository';
export { AttachmentsRepository } from './comments/attachments.repository';

// Re-export gateway
export { CommentsGateway } from './comments/comments.gateway';

// Re-export file storage token
export { FILE_STORAGE_SERVICE, IFileStorageService } from './comments/attachments.controller';

/**
 * Options for configuring the CommentsServerModule
 */
export interface CommentsServerModuleOptions {
    /** 
     * Modules to import (e.g., FileStorageModule)
     * Story 10.5: When FileStorageModule is included, attachments will use unified storage
     */
    imports?: any[];
    /**
     * Story 10.5: FileStorageService class for injection token alias
     * Required when using FileStorageModule for attachment uploads
     */
    fileStorageServiceClass?: any;
}

/**
 * CommentsServerModule
 * 
 * The main server module for the comments plugin.
 * 
 * @example
 * ```typescript
 * // In apps/api/src/app.module.ts
 * import { CommentsServerModule } from '@cdm/plugin-comments/server';
 * import { FileStorageModule } from './modules/file-storage/file-storage.module';
 * import { FileStorageService } from './modules/file-storage/file-storage.service';
 * 
 * @Module({
 *   imports: [
 *     FileStorageModule,
 *     CommentsServerModule.forRoot({
 *       imports: [FileStorageModule],
 *       fileStorageServiceClass: FileStorageService,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class CommentsServerModule {
    /**
     * Register the CommentsServerModule with dynamic configuration
     */
    static forRoot(options: CommentsServerModuleOptions = {}): DynamicModule {
        return {
            module: CommentsServerModule,
            imports: [
                CommentsModule.forRoot({
                    imports: options.imports,
                    fileStorageServiceClass: options.fileStorageServiceClass,
                }),
            ],
            exports: [CommentsModule],
        };
    }

    /**
     * Register with default configuration (no external dependencies)
     */
    static register(): DynamicModule {
        return this.forRoot();
    }
}
