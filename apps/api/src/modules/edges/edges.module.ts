/**
 * Story 2.2: Edges Module
 * Provides edge management with dependency support and cycle detection
 */

import { Module } from '@nestjs/common';
import { EdgesController } from './edges.controller';
import { EdgesService } from './edges.service';
import { EdgeRepository } from './repositories/edge.repository';

@Module({
  controllers: [EdgesController],
  providers: [EdgesService, EdgeRepository],
  exports: [EdgesService],
})
export class EdgesModule {}
