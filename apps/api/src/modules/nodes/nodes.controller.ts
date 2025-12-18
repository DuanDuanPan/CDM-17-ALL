/**
 * Story 2.1: Nodes Controller
 * REST API endpoints for node operations with polymorphic type support
 * [AI-Review][MEDIUM-2] Fixed: Added explicit return types
 */

import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus, UsePipes } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { NodeResponse, NodeTypeChangeResponse, UpdateNodePropsSchema } from '@cdm/types';
import {
  CreateNodeDto,
  UpdateNodeDto,
  UpdateNodeTypeDto,
  UpdateNodePropsDto,
} from './nodes.request.dto';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';

// [AI-Review-2][HIGH-2] Fixed: Removed 'api/' prefix (global prefix already set in main.ts)
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) { }

  /**
   * Create a new node
   * POST /api/nodes
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNode(@Body() dto: CreateNodeDto): Promise<NodeResponse> {
    return this.nodesService.createNode(dto);
  }

  /**
   * Get node with properties
   * GET /api/nodes/:id
   * Story 2.1 AC#6, AC#7
   */
  @Get(':id')
  async getNode(@Param('id') id: string): Promise<NodeResponse> {
    return this.nodesService.getNodeWithProps(id);
  }

  /**
   * Update node basic properties
   * PATCH /api/nodes/:id
   */
  @Patch(':id')
  async updateNode(@Param('id') id: string, @Body() dto: UpdateNodeDto): Promise<NodeResponse> {
    return this.nodesService.updateNode(id, dto);
  }

  /**
   * Update node type
   * PATCH /api/nodes/:id/type
   * Story 2.1 AC#2, AC#4
   */
  @Patch(':id/type')
  async updateNodeType(@Param('id') id: string, @Body() dto: UpdateNodeTypeDto): Promise<NodeTypeChangeResponse> {
    return this.nodesService.updateNodeType(id, dto);
  }

  /**
   * Update node properties (polymorphic)
   * PATCH /api/nodes/:id/properties
   * Story 2.1 AC#8
   */
  @Patch(':id/properties')
  @UsePipes(new ZodValidationPipe(UpdateNodePropsSchema))
  async updateNodeProperties(@Param('id') id: string, @Body() dto: UpdateNodePropsDto): Promise<NodeResponse> {
    return this.nodesService.updateNodeProps(id, dto);
  }
}
