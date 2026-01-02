/**
 * Story 5.1: Template Library
 * Templates Module - NestJS module definition
 *
 * External dependencies (DemoSeedService) are injected by kernel.
 */

import { Module, DynamicModule } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService, DEMO_SEED_SERVICE } from './templates.service';
import { TemplatesRepository } from './templates.repository';

/**
 * Options for configuring the TemplatesModule
 */
export interface TemplatesModuleOptions {
    /**
     * Modules to import (e.g., DemoModule)
     * These are infrastructure modules provided by the kernel
     */
    imports?: any[];
    /**
     * Provider for DemoSeedService (required for template instantiation)
     */
    demoSeedServiceProvider?: any;
}

@Module({})
export class TemplatesModule {
    /**
     * Register the TemplatesModule with dynamic imports
     * This allows the kernel to inject infrastructure modules
     */
    static forRoot(options: TemplatesModuleOptions = {}): DynamicModule {
        const providers: any[] = [TemplatesService, TemplatesRepository];

        // Add DemoSeedService provider if provided
        if (options.demoSeedServiceProvider) {
            providers.push({
                provide: DEMO_SEED_SERVICE,
                useExisting: options.demoSeedServiceProvider,
            });
        }

        return {
            module: TemplatesModule,
            imports: options.imports ?? [],
            controllers: [TemplatesController],
            providers,
            exports: [TemplatesService, TemplatesRepository],
        };
    }

    /**
     * Register TemplatesModule as a feature module without external dependencies
     */
    static register(): DynamicModule {
        return this.forRoot();
    }
}
