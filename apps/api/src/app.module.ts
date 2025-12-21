import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollabModule } from './modules/collab';
import { NodesModule } from './modules/nodes'; // Story 2.1
import { EdgesModule } from './modules/edges'; // Story 2.2
import { NotificationModule } from './modules/notification/notification.module'; // Story 2.4
import { DemoSeedService } from './demo/demo-seed.service';

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
  ],
  controllers: [AppController],
  providers: [AppService, DemoSeedService],
})
export class AppModule { }

