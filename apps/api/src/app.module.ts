/**
 * App Module - Microkernel Configuration
 * Story 7.5: Plugin Migration
 * Story 10.5: Removed legacy FileModule, unified file storage
 *
 * Kernel responsibilities:
 * - Load plugin server modules
 * - Provide infrastructure and global guards
 * - Expose kernel services to plugins via injection tokens
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter'; // Story 4.1
import { MindmapCoreServerModule } from '@cdm/plugin-mindmap-core/server';
import { WorkflowApprovalServerModule } from '@cdm/plugin-workflow-approval/server';
import { CommentsServerModule } from '@cdm/plugin-comments/server';
import { SubscriptionsServerModule } from '@cdm/plugin-subscriptions/server'; // Story 10.7
import { TemplatesServerModule } from '@cdm/plugin-template/server'; // Story 5.1
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphsModule } from './modules/graphs/graphs.module'; // Dynamic Graph ID
import { DemoSeedService } from './demo/demo-seed.service'; // Story 5.1: For template instantiation
import { ProductLibraryModule } from './modules/product-library'; // Story 2.7
import { KnowledgeLibraryModule } from './modules/knowledge-library'; // Story 2.8
import { NotificationModule } from './modules/notification/notification.module'; // Story 10.7: For plugin-subscriptions
import { NotificationService } from './modules/notification/notification.service'; // Story 10.7: For injection token
import { DataManagementModule } from './modules/data-management'; // Story 9.1: Data Library
import { PluginKernelModule } from './modules/plugin-kernel/plugin-kernel.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module'; // Story 10.4: Unified File Storage
import { FileStorageService } from './modules/file-storage/file-storage.service'; // Story 10.5: For injection token

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(), // Story 4.1: Event Bus for approval workflow
    GraphsModule, // Dynamic Graph ID management
    ProductLibraryModule, // Story 2.7: Mock product library for PBS nodes
    KnowledgeLibraryModule, // Story 2.8: Mock knowledge library for Task nodes
    NotificationModule, // Story 10.7: Needed by SubscriptionsServerModule
    DataManagementModule, // Story 9.1: Data Library (Story 10.5: uses FileStorageModule)
    FileStorageModule, // Story 10.4: Unified File Storage

    // Story 7.5: Kernel → plugin infrastructure contracts (global)
    PluginKernelModule,

    // Story 7.5: Plugin server modules
    MindmapCoreServerModule.register(),
    WorkflowApprovalServerModule.register(),
    // Story 10.5: CommentsServerModule with FileStorageModule for attachments
    CommentsServerModule.forRoot({
      imports: [FileStorageModule],
      fileStorageServiceClass: FileStorageService,
    }),

    // Story 10.7: Subscriptions Plugin
    SubscriptionsServerModule.forRoot({
      imports: [NotificationModule],
      notificationServiceClass: NotificationService,
    }),

    // Story 5.1: Template Library Plugin
    TemplatesServerModule.forRoot({
      imports: [GraphsModule],
      demoSeedServiceProvider: DemoSeedService,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
