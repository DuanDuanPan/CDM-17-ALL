/**
 * Plugin Template - Server Entry Point
 * Story 5.1: Template Library
 *
 * This module provides the backend (NestJS) module for the template library plugin.
 * Includes template browsing, preview, and instantiation functionality.
 *
 * @module @cdm/plugin-template/server
 */

import { Module, DynamicModule } from '@nestjs/common';
import { TemplatesModule, TemplatesModuleOptions } from './templates/templates.module';

// Re-export modules
export { TemplatesModule, TemplatesModuleOptions } from './templates/templates.module';

// Re-export services
export { TemplatesService, DEMO_SEED_SERVICE, IDemoSeedService } from './templates/templates.service';

// Re-export repositories
export { TemplatesRepository } from './templates/templates.repository';

// Re-export controller
export { TemplatesController } from './templates/templates.controller';

/**
 * Options for configuring the TemplatesServerModule
 */
export interface TemplatesServerModuleOptions {
    /** Modules to import (e.g., DemoModule) */
    imports?: any[];
    /** Provider for DemoSeedService */
    demoSeedServiceProvider?: any;
}

/**
 * TemplatesServerModule
 *
 * The main server module for the template library plugin.
 *
 * @example
 * ```typescript
 * // In apps/api/src/app.module.ts
 * import { TemplatesServerModule } from '@cdm/plugin-template/server';
 * import { DemoSeedService } from './demo/demo-seed.service';
 *
 * @Module({
 *   imports: [
 *     TemplatesServerModule.forRoot({
 *       imports: [DemoModule],
 *       demoSeedServiceProvider: DemoSeedService,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class TemplatesServerModule {
    /**
     * Register the TemplatesServerModule with dynamic configuration
     */
    static forRoot(options: TemplatesServerModuleOptions = {}): DynamicModule {
        return {
            module: TemplatesServerModule,
            imports: [
                TemplatesModule.forRoot({
                    imports: options.imports,
                    demoSeedServiceProvider: options.demoSeedServiceProvider,
                }),
            ],
            exports: [TemplatesModule],
        };
    }

    /**
     * Register with default configuration (no external dependencies)
     */
    static register(): DynamicModule {
        return this.forRoot();
    }
}
