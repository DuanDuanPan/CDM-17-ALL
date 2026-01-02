/**
 * App Module - Microkernel Configuration
 * Story 7.5: Plugin Migration
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
import { TemplatesServerModule } from '@cdm/plugin-template/server'; // Story 5.1
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphsModule } from './modules/graphs/graphs.module'; // Dynamic Graph ID
import { DemoSeedService } from './demo/demo-seed.service'; // Story 5.1: For template instantiation
import { ProductLibraryModule } from './modules/product-library'; // Story 2.7
import { KnowledgeLibraryModule } from './modules/knowledge-library'; // Story 2.8
import { FileModule } from './modules/file/file.module'; // Story 4.1: FIX-11
import { SubscriptionModule } from './modules/subscriptions/subscriptions.module'; // Story 4.4: Watch & Subscription
import { PluginKernelModule } from './modules/plugin-kernel/plugin-kernel.module';

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
    FileModule, // Story 4.1: FIX-11 - File upload for deliverables
    SubscriptionModule, // Story 4.4: Watch & Subscription

    // Story 7.5: Kernel → plugin infrastructure contracts (global)
    PluginKernelModule,

    // Story 7.5: Plugin server modules
    MindmapCoreServerModule.register(),
    WorkflowApprovalServerModule.register(),
    CommentsServerModule.register(),

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
