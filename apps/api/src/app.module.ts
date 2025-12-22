import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollabModule } from './modules/collab';
import { NodesModule } from './modules/nodes'; // Story 2.1
import { EdgesModule } from './modules/edges'; // Story 2.2
import { NotificationModule } from './modules/notification/notification.module'; // Story 2.4
import { GraphsModule } from './modules/graphs/graphs.module'; // Dynamic Graph ID
import { ProductLibraryModule } from './modules/product-library'; // Story 2.7
import { KnowledgeLibraryModule } from './modules/knowledge-library'; // Story 2.8

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CollabModule,
    NodesModule, // Story 2.1: Node type management
    EdgesModule, // Story 2.2: Edge management with dependency support
    NotificationModule, // Story 2.4: Task dispatch & feedback notifications
    GraphsModule, // Dynamic Graph ID management
    ProductLibraryModule, // Story 2.7: Mock product library for PBS nodes
    KnowledgeLibraryModule, // Story 2.8: Mock knowledge library for Task nodes
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

