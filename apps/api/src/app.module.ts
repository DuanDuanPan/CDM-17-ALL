import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollabModule } from './modules/collab';
import { NodesModule } from './modules/nodes'; // Story 2.1
import { DemoSeedService } from './demo/demo-seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CollabModule,
    NodesModule, // Story 2.1: Node type management
  ],
  controllers: [AppController],
  providers: [AppService, DemoSeedService],
})
export class AppModule { }

