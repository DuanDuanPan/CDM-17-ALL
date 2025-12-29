/**
 * Story 2.1: Nodes Module
 * Story 2.5: Extended with TagsController for tag management
 * Provides node management functionality with polymorphic type support
 * Story 2.4: Added NotificationModule for task dispatch & feedback
 */

import { Module } from '@nestjs/common';
import { NodesController, TagsController } from './nodes.controller';
import { NodesService } from './nodes.service';
import { NodeRepository } from './repositories/node.repository';
import { NodeTaskRepository } from './repositories/node-task.repository';
import { NodeRequirementRepository } from './repositories/node-requirement.repository';
import { NodePBSRepository } from './repositories/node-pbs.repository';
import { NodeDataRepository } from './repositories/node-data.repository';
import { NodeAppRepository } from './repositories/node-app.repository'; // Story 2.9
import { TaskService } from './services/task.service';
import { RequirementService } from './services/requirement.service';
import { PBSService } from './services/pbs.service';
import { DataService } from './services/data.service';
import { AppService } from './services/app.service'; // Story 2.9
import { NotificationModule } from '../notification/notification.module';
import { AppLibraryModule } from '../app-library';

@Module({
  imports: [NotificationModule, AppLibraryModule], // Story 2.4: Import for task dispatch notifications
  controllers: [NodesController, TagsController], // Story 2.5: Added TagsController
  providers: [
    NodesService,
    NodeRepository,
    NodeTaskRepository,
    NodeRequirementRepository,
    NodePBSRepository,
    NodeDataRepository,
    NodeAppRepository, // Story 2.9
    TaskService,
    RequirementService,
    PBSService,
    DataService,
    AppService, // Story 2.9: APP node service
  ],
  exports: [NodesService, NodeRepository], // Story 7.1: Export NodeRepository for CollabModule
})
export class NodesModule { }
