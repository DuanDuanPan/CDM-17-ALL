/**
 * Story 2.1: Nodes Module
 * Provides node management functionality with polymorphic type support
 */

import { Module } from '@nestjs/common';
import { NodesController } from './nodes.controller';
import { NodesService } from './nodes.service';

@Module({
  controllers: [NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}
