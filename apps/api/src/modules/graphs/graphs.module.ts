import { Module } from '@nestjs/common';
import { GraphsController } from './graphs.controller';
import { GraphsService } from './graphs.service';
import { GraphRepository } from './graph.repository';
import { DemoSeedService } from '../../demo/demo-seed.service';

/**
 * Graphs模块
 * 提供图谱管理功能，包括CRUD操作
 * Story 7.1: Added GraphRepository for Repository pattern compliance
 */
@Module({
    controllers: [GraphsController],
    providers: [GraphsService, GraphRepository, DemoSeedService],
    exports: [GraphsService, GraphRepository, DemoSeedService],
})
export class GraphsModule { }
