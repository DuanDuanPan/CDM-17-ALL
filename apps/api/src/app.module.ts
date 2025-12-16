import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollabModule } from './modules/collab';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CollabModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

