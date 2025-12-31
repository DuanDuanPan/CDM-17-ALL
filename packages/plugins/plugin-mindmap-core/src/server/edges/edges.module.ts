/**
 * Story 2.2: Edges Module (Plugin Version)
 * Story 7.5: Migrated to plugin-mindmap-core
 * 
 * Provides edge management with dependency support and cycle detection.
 */

import { Module, DynamicModule } from '@nestjs/common';
import { EdgesController } from './edges.controller';
import { EdgesService } from './edges.service';
import { EdgeRepository } from './repositories/edge.repository';

/**
 * Options for configuring the EdgesModule
 */
export interface EdgesModuleOptions {
  /** Modules to import */
  imports?: any[];
}

@Module({})
export class EdgesModule {
  /**
   * Register the EdgesModule with dynamic imports
   */
  static forRoot(options: EdgesModuleOptions = {}): DynamicModule {
    return {
      module: EdgesModule,
      imports: options.imports ?? [],
      controllers: [EdgesController],
      providers: [EdgesService, EdgeRepository],
      exports: [EdgesService, EdgeRepository],
    };
  }

  /**
   * Register EdgesModule as a feature module
   */
  static register(): DynamicModule {
    return this.forRoot();
  }
}
