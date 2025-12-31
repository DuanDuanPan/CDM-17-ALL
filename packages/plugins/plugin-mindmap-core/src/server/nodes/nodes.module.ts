/**
 * Story 2.1: Nodes Module (Plugin Version)
 * Story 2.5: Extended with TagsController for tag management
 * Story 7.5: Migrated to plugin-mindmap-core
 * 
 * Provides node management functionality with polymorphic type support.
 * This is the plugin version - external module dependencies are injected by the kernel.
 */

import { Module, DynamicModule } from '@nestjs/common';
import { NodesController, TagsController } from './nodes.controller';
import { NodesService } from './nodes.service';
import { NodeRepository } from './repositories/node.repository';
import { NodeTaskRepository } from './repositories/node-task.repository';
import { NodeRequirementRepository } from './repositories/node-requirement.repository';
import { NodePBSRepository } from './repositories/node-pbs.repository';
import { NodeDataRepository } from './repositories/node-data.repository';
import { NodeAppRepository } from './repositories/node-app.repository';
import { TaskService } from './services/task.service';
import { RequirementService } from './services/requirement.service';
import { PBSService } from './services/pbs.service';
import { DataService } from './services/data.service';
import { AppService } from './services/app.service';

/**
 * Options for configuring the NodesModule
 */
export interface NodesModuleOptions {
  /** Modules to import (e.g., NotificationModule, AppLibraryModule) */
  imports?: any[];
}

@Module({})
export class NodesModule {
  /**
   * Register the NodesModule with dynamic imports
   * This allows the kernel to inject infrastructure modules
   */
  static forRoot(options: NodesModuleOptions = {}): DynamicModule {
    return {
      module: NodesModule,
      imports: options.imports ?? [],
      controllers: [NodesController, TagsController],
      providers: [
        NodesService,
        NodeRepository,
        NodeTaskRepository,
        NodeRequirementRepository,
        NodePBSRepository,
        NodeDataRepository,
        NodeAppRepository,
        TaskService,
        RequirementService,
        PBSService,
        DataService,
        AppService,
      ],
      exports: [NodesService, NodeRepository],
    };
  }

  /**
   * Register NodesModule as a feature module without external dependencies
   * Used when importing as a simple NestJS module
   */
  static register(): DynamicModule {
    return this.forRoot();
  }
}
