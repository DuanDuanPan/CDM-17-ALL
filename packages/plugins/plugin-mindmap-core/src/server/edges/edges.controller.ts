/**
 * Story 2.2: Edges Controller
 * REST API endpoints for edge operations with dependency support
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EdgesService } from './edges.service';
import { CreateEdgeDto, UpdateEdgeDto } from './edges.request.dto';
import type { EdgeResponse } from '@cdm/types';

@Controller('edges')
export class EdgesController {
  constructor(private readonly edgesService: EdgesService) {}

  /**
   * Create a new edge
   * POST /api/edges
   *
   * Story 2.2: Validates dependency edges for:
   * - Task-to-Task nodes only
   * - No cycles in dependency graph
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEdge(@Body() dto: CreateEdgeDto): Promise<EdgeResponse> {
    return this.edgesService.createEdge(dto);
  }

  /**
   * Get edge by ID
   * GET /api/edges/:id
   */
  @Get(':id')
  async getEdge(@Param('id') id: string): Promise<EdgeResponse> {
    return this.edgesService.getEdge(id);
  }

  /**
   * Get all edges for a graph
   * GET /api/edges?graphId=xxx
   */
  @Get()
  async getEdgesByGraph(@Query('graphId') graphId: string): Promise<EdgeResponse[]> {
    if (!graphId) {
      return [];
    }
    return this.edgesService.getEdgesByGraphId(graphId);
  }

  /**
   * Update edge metadata
   * PATCH /api/edges/:id
   *
   * Story 2.2: Validates when changing to dependency:
   * - Both nodes must be TASK type
   * - No cycles would be created
   */
  @Patch(':id')
  async updateEdge(
    @Param('id') id: string,
    @Body() dto: UpdateEdgeDto
  ): Promise<EdgeResponse> {
    return this.edgesService.updateEdge(id, dto);
  }

  /**
   * Delete an edge
   * DELETE /api/edges/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEdge(@Param('id') id: string): Promise<void> {
    return this.edgesService.deleteEdge(id);
  }
}
