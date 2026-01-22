/**
 * Story 10.8: data-management 插件化迁移
 * Data Library Module - Dynamic module for data asset management
 * 
 * Uses forRoot() pattern to receive FileStorageService via DI token.
 * Migrated from apps/api/src/modules/data-management/data-management.module.ts
 */

import { Module, DynamicModule } from '@nestjs/common';
import { DataAssetController } from './data-asset.controller';
import { DataAssetService } from './data-asset.service';
import { DataFolderService } from './data-folder.service';
import { NodeDataLinkService } from './node-data-link.service';
import { DataAssetRepository } from './data-asset.repository';
import { DataFolderRepository } from './data-folder.repository';
import { NodeDataLinkRepository } from './node-data-link.repository';
import { DataLibrarySeedService } from './mock-data';
import { DataManagementAuthGuard } from './guards/data-management-auth.guard';
import { FILE_STORAGE_SERVICE } from './interfaces';

/**
 * Options for configuring the DataLibraryModule
 */
export interface DataLibraryModuleOptions {
    /** 
     * Modules to import (e.g., FileStorageModule)
     */
    imports?: any[];
    /**
     * FileStorageService class for injection token alias
     * Required for file upload/delete operations
     */
    fileStorageServiceClass: any;
}

@Module({})
export class DataLibraryModule {
    /**
     * Register the DataLibraryModule with dynamic configuration
     * 
     * @example
     * ```typescript
     * DataLibraryModule.forRoot({
     *   imports: [FileStorageModule],
     *   fileStorageServiceClass: FileStorageService,
     * })
     * ```
     */
    static forRoot(options: DataLibraryModuleOptions): DynamicModule {
        return {
            module: DataLibraryModule,
            imports: options.imports ?? [],
            controllers: [DataAssetController],
            providers: [
                // Services
                DataAssetService,
                DataFolderService,
                NodeDataLinkService,
                // Repositories
                DataAssetRepository,
                DataFolderRepository,
                NodeDataLinkRepository,
                // Utils
                DataLibrarySeedService,
                DataManagementAuthGuard,
                // Bind FILE_STORAGE_SERVICE token to the provided class
                { provide: FILE_STORAGE_SERVICE, useExisting: options.fileStorageServiceClass },
            ],
            exports: [DataAssetService, DataFolderService, NodeDataLinkService],
        };
    }
}
