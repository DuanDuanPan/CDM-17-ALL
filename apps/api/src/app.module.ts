import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter'; // Story 4.1
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollabModule } from './modules/collab';
import { NodesModule } from './modules/nodes'; // Story 2.1
import { EdgesModule } from './modules/edges'; // Story 2.2
import { NotificationModule } from './modules/notification/notification.module'; // Story 2.4
import { GraphsModule } from './modules/graphs/graphs.module'; // Dynamic Graph ID
import { ProductLibraryModule } from './modules/product-library'; // Story 2.7
import { KnowledgeLibraryModule } from './modules/knowledge-library'; // Story 2.8
import { AppLibraryModule } from './modules/app-library'; // Story 2.9
import { ApprovalModule } from './modules/approval'; // Story 4.1
import { UsersModule } from './modules/users'; // Story 4.1
import { FileModule } from './modules/file/file.module'; // Story 4.1: FIX-11

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(), // Story 4.1: Event Bus for approval workflow
    CollabModule,
    NodesModule, // Story 2.1: Node type management
    EdgesModule, // Story 2.2: Edge management with dependency support
    NotificationModule, // Story 2.4: Task dispatch & feedback notifications
    GraphsModule, // Dynamic Graph ID management
    ProductLibraryModule, // Story 2.7: Mock product library for PBS nodes
    KnowledgeLibraryModule, // Story 2.8: Mock knowledge library for Task nodes
    AppLibraryModule, // Story 2.9: APP node library and execution services
    ApprovalModule, // Story 4.1: Approval driven workflow
    UsersModule, // Story 4.1: User selector API
    FileModule, // Story 4.1: FIX-11 - File upload for deliverables
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

