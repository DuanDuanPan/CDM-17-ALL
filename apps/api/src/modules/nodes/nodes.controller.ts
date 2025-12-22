/**
 * Story 2.1: Nodes Controller
 * Story 2.5: Extended with search, tags, and archive endpoints
 * Story 2.7: Added hard delete endpoint
 * REST API endpoints for node operations with polymorphic type support
 * [AI-Review][MEDIUM-2] Fixed: Added explicit return types
 */

import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, UsePipes } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { TaskService } from './services/task.service';
import {
  NodeResponse,
  NodeTypeChangeResponse,
  UpdateNodePropsSchema,
  SearchQuerySchema,
  TagUpdateSchema,
  SearchResponse,
  type SearchQueryDto,
  PopularTagsResponse,
} from '@cdm/types';
import {
  CreateNodeDto,
  UpdateNodeDto,
  UpdateNodeTypeDto,
  UpdateNodePropsDto,
  FeedbackTaskDto,
  TagUpdateRequestDto,
} from './nodes.request.dto';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';

// [AI-Review-2][HIGH-2] Fixed: Removed 'api/' prefix (global prefix already set in main.ts)
@Controller('nodes')
export class NodesController {
  constructor(
    private readonly nodesService: NodesService,
    private readonly taskService: TaskService
  ) { }

  // ============================
  // Story 2.5: Search Endpoints
  // ============================

  /**
   * Search nodes across all graphs
   * GET /api/nodes/search?q=keyword&tags=tag1,tag2&includeArchived=false
   * Story 2.5 AC#1.2, AC#3.1
   */
  @Get('search')
  @UsePipes(new ZodValidationPipe(SearchQuerySchema))
  async searchNodes(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.nodesService.search(query);
  }

  /**
   * List archived nodes
   * GET /api/nodes/archived?graphId=xxx
   * Story 2.5 AC#4.3
   */
  @Get('archived')
  async listArchivedNodes(@Query('graphId') graphId?: string): Promise<SearchResponse> {
    return this.nodesService.listArchived(graphId);
  }

  // ============================
  // Existing CRUD Endpoints
  // ============================

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

  // ============================
  // Story 2.5: Tags Endpoints
  // ============================

  /**
   * Update node tags
   * PATCH /api/nodes/:id/tags
   * Story 2.5 AC#2.1, AC#2.3
   */
  @Patch(':id/tags')
  @UsePipes(new ZodValidationPipe(TagUpdateSchema))
  async updateNodeTags(@Param('id') id: string, @Body() dto: TagUpdateRequestDto): Promise<NodeResponse> {
    return this.nodesService.updateTags(id, dto.tags);
  }

  // ============================
  // Story 2.5: Archive Endpoints
  // ============================

  /**
   * Archive node (soft delete)
   * POST /api/nodes/:id:archive
   * Story 2.5 AC#4.1, AC#4.2
   */
  @Post(':id\\:archive')
  async archiveNode(@Param('id') id: string): Promise<NodeResponse> {
    return this.nodesService.archive(id);
  }

  /**
   * Unarchive node (restore)
   * POST /api/nodes/:id:unarchive
   * Story 2.5 AC#4.3
   */
  @Post(':id\\:unarchive')
  async unarchiveNode(@Param('id') id: string): Promise<NodeResponse> {
    return this.nodesService.unarchive(id);
  }

  /**
   * Permanently delete node
   * DELETE /api/nodes/:id
   * Story 2.7: Hard delete (cannot be undone)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNode(@Param('id') id: string): Promise<{ success: boolean; deletedCount: number }> {
    return this.nodesService.hardDelete(id);
  }

  // ============================
  // Story 2.4: Task Dispatch Endpoints
  // ============================

  /**
   * Dispatch task to assignee
   * POST /api/nodes/:id:dispatch?userId=xxx
   * Story 2.4 AC#1
   */
  @Post(':id\\:dispatch')
  async dispatchTask(
    @Param('id') nodeId: string,
    @Query('userId') userId?: string
  ) {
    const dispatchingUserId = userId || 'test1';
    return this.taskService.dispatchTask(nodeId, dispatchingUserId);
  }

  /**
   * Accept or reject dispatched task
   * POST /api/nodes/:id:feedback?userId=xxx
   * Story 2.4 AC#2, AC#3
   * [AI-Review][MEDIUM-5] Fixed: Using FeedbackTaskDto for proper validation
   */
  @Post(':id\\:feedback')
  async feedbackTask(
    @Param('id') nodeId: string,
    @Body() body: FeedbackTaskDto,
    @Query('userId') userId?: string
  ) {
    const feedbackUserId = userId || 'test1';
    return this.taskService.feedbackTask(nodeId, feedbackUserId, body.action, body.reason);
  }
}

// ============================
// Tags Controller (separate controller for /api/tags endpoints)
// ============================

@Controller('tags')
export class TagsController {
  constructor(private readonly nodesService: NodesService) { }

  /**
   * Get popular tags
   * GET /api/tags/popular?graphId=xxx
   * Story 2.5: Helper for tag suggestions
   */
  @Get('popular')
  async getPopularTags(@Query('graphId') graphId?: string): Promise<PopularTagsResponse> {
    return this.nodesService.getPopularTags(graphId);
  }
}
