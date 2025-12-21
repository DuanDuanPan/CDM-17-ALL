import { Module } from '@nestjs/common';
import { GraphsController } from './graphs.controller';
import { GraphsService } from './graphs.service';
import { DemoSeedService } from '../../demo/demo-seed.service';

/**
 * Graphs模块
 * 提供图谱管理功能，包括CRUD操作
 */
@Module({
    controllers: [GraphsController],
    providers: [GraphsService, DemoSeedService],
    exports: [GraphsService],
})
export class GraphsModule { }
