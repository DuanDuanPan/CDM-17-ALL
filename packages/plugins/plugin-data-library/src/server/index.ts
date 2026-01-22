/**
 * Plugin Data Library - Server Entry Point
 * Story 10.8: data-management 插件化迁移
 * 
 * This module provides the backend (NestJS) module for the data library plugin.
 * Handles data asset management, folders, and node-asset links.
 * 
 * @module @cdm/plugin-data-library/server
 */

import { Module, DynamicModule } from '@nestjs/common';
import { DataLibraryModule } from './data-library/data-library.module';

// Re-export modules
export { DataLibraryModule, DataLibraryModuleOptions } from './data-library/data-library.module';

// Re-export services
export { DataAssetService } from './data-library/data-asset.service';
export { DataFolderService } from './data-library/data-folder.service';
export { NodeDataLinkService } from './data-library/node-data-link.service';

// Re-export repositories
export { DataAssetRepository } from './data-library/data-asset.repository';
export { DataFolderRepository } from './data-library/data-folder.repository';
export { NodeDataLinkRepository } from './data-library/node-data-link.repository';

// Re-export injection tokens and interfaces
export { FILE_STORAGE_SERVICE, IFileStorageService, FileUploadResult } from './data-library/interfaces';

/**
 * Options for configuring the DataLibraryServerModule
 */
export interface DataLibraryServerModuleOptions {
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

/**
 * DataLibraryServerModule
 * 
 * The main server module for the data library plugin.
 * 
 * @example
 * ```typescript
 * // In apps/api/src/app.module.ts
 * import { DataLibraryServerModule } from '@cdm/plugin-data-library/server';
 * import { FileStorageModule } from './modules/file-storage/file-storage.module';
 * import { FileStorageService } from './modules/file-storage/file-storage.service';
 * 
 * @Module({
 *   imports: [
 *     FileStorageModule,
 *     DataLibraryServerModule.forRoot({
 *       imports: [FileStorageModule],
 *       fileStorageServiceClass: FileStorageService,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class DataLibraryServerModule {
    /**
     * Register the DataLibraryServerModule with dynamic configuration
     */
    static forRoot(options: DataLibraryServerModuleOptions): DynamicModule {
        return {
            module: DataLibraryServerModule,
            imports: [
                DataLibraryModule.forRoot({
                    imports: options.imports,
                    fileStorageServiceClass: options.fileStorageServiceClass,
                }),
            ],
            exports: [DataLibraryModule],
        };
    }
}
