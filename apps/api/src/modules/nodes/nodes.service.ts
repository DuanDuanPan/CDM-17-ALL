/**
 * Story 2.1: Node Service with polymorphic type support
 * Story 2.5: Extended with search, tags, and archive functionality
 * Handles node CRUD operations and type-specific property management
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AppProps, // Story 2.9
  type ApprovalPipeline,
  DataProps,
  NodeResponse,
  NodeType,
  NodeTypeChangeResponse,
  NodeProps,
  PBSProps,
  RequirementProps,
  TaskProps,
  SearchQueryDto,
  SearchResponse,
  SearchResultItem,
  PopularTagsResponse,
} from '@cdm/types';
import {
  CreateNodeDto,
  UpdateNodeDto,
  UpdateNodeTypeDto,
  UpdateNodePropsDto,
  ExecuteAppNodeDto,
} from './nodes.request.dto';
import { NodeRepository, NodeUpdateData, NodeWithGraph } from './repositories/node.repository';
import { TaskService } from './services/task.service';
import { RequirementService } from './services/requirement.service';
import { PBSService } from './services/pbs.service';
import { DataService } from './services/data.service';
import { AppService } from './services/app.service'; // Story 2.9
import { AppExecutorService } from '../app-library/app-executor.service';

const DEFAULT_CREATOR_NAME = 'Mock User';

@Injectable()
export class NodesService {
  constructor(
    private readonly nodeRepo: NodeRepository,
    private readonly taskService: TaskService,
    private readonly requirementService: RequirementService,
    private readonly pbsService: PBSService,
    private readonly dataService: DataService,
    private readonly appService: AppService, // Story 2.9
    private readonly appExecutor: AppExecutorService,
  ) { }

  private normalizeTags(tags: string[]): string[] {
    return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  }

  /**
   * Update node type and initialize corresponding extension table
   * Story 2.1 AC#2, AC#4
   */
  async updateNodeType(nodeId: string, dto: UpdateNodeTypeDto): Promise<NodeTypeChangeResponse> {
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const oldType = node.type as unknown as NodeType;
    const newType = dto.type;

    await this.nodeRepo.update(nodeId, { type: newType });
    await this.initializeExtensionTable(nodeId, newType);

    const nodeResponse = await this.getNodeWithProps(nodeId);
    return {
      ...nodeResponse,
      oldType,
      newType,
    };
  }

  /**
   * Update node properties (polymorphic based on type)
   * Story 2.1 AC#8
   */
  async updateNodeProps(nodeId: string, dto: UpdateNodePropsDto): Promise<NodeResponse> {
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const nodeType = node.type as unknown as NodeType;
    if (dto.type !== nodeType) {
      throw new BadRequestException(`Node type mismatch: expected ${nodeType}, received ${dto.type}`);
    }

    await this.initializeExtensionTable(nodeId, dto.type);
    await this.upsertPropsByType(nodeId, dto.type, dto.props);

    return this.getNodeWithProps(nodeId);
  }

  /**
   * Execute APP node and return mock outputs
   * Story 2.9 AC4.1, AC4.2
   */
  async executeAppNode(nodeId: string, dto: ExecuteAppNodeDto) {
    const node = await this.nodeRepo.findByIdWithProps(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }
    if ((node.type as unknown as NodeType) !== NodeType.APP) {
      throw new BadRequestException(`Node ${nodeId} is not an APP node`);
    }

    if (dto.appSourceType === 'local' && !dto.appPath) {
      throw new BadRequestException('未配置本地应用路径');
    }
    if (dto.appSourceType === 'remote' && !dto.appUrl) {
      throw new BadRequestException('未配置远程服务 URL');
    }
    if (dto.appSourceType === 'library' && !dto.libraryAppId) {
      throw new BadRequestException('未选择应用库应用');
    }

    const existingProps = (node.appProps || {}) as AppProps;
    const appProps: AppProps = {
      ...existingProps,
      appSourceType: dto.appSourceType ?? existingProps.appSourceType,
      appPath: dto.appPath ?? existingProps.appPath ?? null,
      appUrl: dto.appUrl ?? existingProps.appUrl ?? null,
      libraryAppId: dto.libraryAppId ?? existingProps.libraryAppId ?? null,
      libraryAppName: dto.libraryAppName ?? existingProps.libraryAppName ?? null,
      inputs: dto.inputs ?? existingProps.inputs ?? [],
      outputs: dto.outputs ?? existingProps.outputs ?? [],
    };

    return this.appExecutor.execute(nodeId, appProps);
  }

  /**
   * Get node with its type-specific properties
   * Story 2.1 AC#6, AC#7, AC#8
   */
  async getNodeWithProps(nodeId: string): Promise<NodeResponse> {
    const node = await this.nodeRepo.findByIdWithProps(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    let props = {};
    switch (node.type as unknown as NodeType) {
      case NodeType.TASK:
        props = node.taskProps || {};
        break;
      case NodeType.REQUIREMENT:
        props = node.requirementProps || {};
        break;
      case NodeType.PBS:
        props = node.pbsProps || {};
        break;
      case NodeType.DATA:
        props = node.dataProps || {};
        break;
      case NodeType.APP: // Story 2.9
        props = node.appProps || {};
        break;
      case NodeType.ORDINARY:
      default:
        props = {};
        break;
    }

    return {
      id: node.id,
      label: node.label,
      description: (node as { description?: string }).description,
      type: node.type as unknown as NodeType,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      graphId: node.graphId,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
      creator: (node as { creatorName?: string }).creatorName || DEFAULT_CREATOR_NAME,
      props,
      approval: (node as { approval?: unknown }).approval as ApprovalPipeline | null,
      // Story 2.5: Tags & Archive support
      tags: (node as { tags?: string[] }).tags ?? [],
      isArchived: (node as { isArchived?: boolean }).isArchived ?? false,
      archivedAt: (node as { archivedAt?: Date | null }).archivedAt?.toISOString() ?? null,
    };
  }

  /**
   * Create a new node
   * Story 2.1: Support creating nodes with specific types
   */
  async createNode(dto: CreateNodeDto): Promise<NodeResponse> {
    const node = await this.nodeRepo.create({
      id: dto.id,
      label: dto.label,
      description: dto.description,
      type: dto.type || NodeType.ORDINARY,
      graphId: dto.graphId,
      parentId: dto.parentId,
      x: dto.x ?? 0,
      y: dto.y ?? 0,
      creatorName: dto.creatorName || DEFAULT_CREATOR_NAME,
      tags: dto.tags ? this.normalizeTags(dto.tags) : undefined,
    });

    if (node.type !== NodeType.ORDINARY) {
      await this.initializeExtensionTable(node.id, node.type as NodeType);
    }

    return this.getNodeWithProps(node.id);
  }

  /**
   * Update node basic properties
   */
  async updateNode(nodeId: string, dto: UpdateNodeDto): Promise<NodeResponse> {
    const updateData: NodeUpdateData = {};
    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.x !== undefined) updateData.x = dto.x;
    if (dto.y !== undefined) updateData.y = dto.y;
    if (dto.tags !== undefined) updateData.tags = this.normalizeTags(dto.tags);

    if (dto.isArchived !== undefined) {
      updateData.isArchived = dto.isArchived;
      updateData.archivedAt = dto.isArchived ? new Date() : null;
    }

    if (dto.type !== undefined) {
      await this.updateNodeType(nodeId, { type: dto.type });
    }

    if (Object.keys(updateData).length > 0) {
      await this.nodeRepo.update(nodeId, updateData);
    }

    if (dto.props !== undefined && dto.type !== undefined) {
      return this.updateNodeProps(nodeId, { type: dto.type, props: dto.props });
    }

    return this.getNodeWithProps(nodeId);
  }

  private async initializeExtensionTable(nodeId: string, type: NodeType) {
    switch (type) {
      case NodeType.TASK:
        await this.taskService.initialize(nodeId);
        break;
      case NodeType.REQUIREMENT:
        await this.requirementService.initialize(nodeId);
        break;
      case NodeType.PBS:
        await this.pbsService.initialize(nodeId);
        break;
      case NodeType.DATA:
        await this.dataService.initialize(nodeId);
        break;
      case NodeType.APP: // Story 2.9
        await this.appService.initialize(nodeId);
        break;
      case NodeType.ORDINARY:
      default:
        break;
    }
  }

  private async upsertPropsByType(nodeId: string, type: NodeType, props: NodeProps) {
    switch (type) {
      case NodeType.TASK:
        await this.taskService.upsertProps(nodeId, props as TaskProps);
        break;
      case NodeType.REQUIREMENT:
        await this.requirementService.upsertProps(nodeId, props as RequirementProps);
        break;
      case NodeType.PBS:
        await this.pbsService.upsertProps(nodeId, props as PBSProps);
        break;
      case NodeType.DATA:
        await this.dataService.upsertProps(nodeId, props as DataProps);
        break;
      case NodeType.APP: // Story 2.9
        await this.appService.upsertProps(nodeId, props as AppProps);
        break;
      case NodeType.ORDINARY:
      default:
        break;
    }
  }

  // ============================
  // Story 2.5: Search & Tag Methods
  // ============================

  /**
   * Search nodes across all graphs
   * Story 2.5 AC#1.2, AC#3.1
   */
  async search(query: SearchQueryDto): Promise<SearchResponse> {
    const { results: nodes, total } = await this.nodeRepo.search(query);

    // Transform to SearchResultItem
    const results: SearchResultItem[] = nodes.map((node) => ({
      id: node.id,
      label: node.label,
      description: (node as { description?: string }).description,
      type: node.type as unknown as NodeType,
      tags: (node as { tags?: string[] }).tags ?? [],
      isArchived: (node as { isArchived?: boolean }).isArchived ?? false,
      graphId: node.graphId,
      graphName: node.graph.name,
      x: node.x,
      y: node.y,
      matchType: this.determineMatchType(node, query),
      matchHighlight: this.createHighlight(node, query.q),
      archivedAt: (node as { archivedAt?: Date | null }).archivedAt?.toISOString() ?? null,
    }));

    return {
      results,
      total,
      hasMore: (query.offset || 0) + results.length < total,
      query,
    };
  }

  /**
   * Update node tags
   * Story 2.5 AC#2.1, AC#2.3
   */
  async updateTags(nodeId: string, tags: string[]): Promise<NodeResponse> {
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const normalizedTags = this.normalizeTags(tags);

    await this.nodeRepo.update(nodeId, { tags: normalizedTags });
    return this.getNodeWithProps(nodeId);
  }

  /**
   * Archive node (soft delete)
   * Story 2.5 AC#4.1, AC#4.2
   */
  async archive(nodeId: string): Promise<NodeResponse> {
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    await this.nodeRepo.update(nodeId, {
      isArchived: true,
      archivedAt: new Date(),
    });
    return this.getNodeWithProps(nodeId);
  }

  /**
   * Unarchive node (restore from archive)
   * Story 2.5 AC#4.3
   */
  async unarchive(nodeId: string): Promise<NodeResponse> {
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    await this.nodeRepo.update(nodeId, {
      isArchived: false,
      archivedAt: null,
    });
    return this.getNodeWithProps(nodeId);
  }

  /**
   * Permanently delete node and its children
   * Story 2.7: Hard delete (cannot be undone)
   * @param nodeId - Node ID to delete
   * @returns Success status
   */
  async hardDelete(nodeId: string): Promise<{ success: boolean; deletedCount: number }> {
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    // Recursively collect all descendant IDs
    const getAllDescendantIds = async (parentId: string): Promise<string[]> => {
      const { results: children } = await this.nodeRepo.search({
        graphId: node.graphId,
        includeArchived: true,
      });

      const directChildren = children.filter(c => c.parentId === parentId);
      const descendantIds: string[] = [];

      for (const child of directChildren) {
        descendantIds.push(child.id);
        const grandchildren = await getAllDescendantIds(child.id);
        descendantIds.push(...grandchildren);
      }

      return descendantIds;
    };

    // Get all nodes to delete (node + descendants)
    const descendantIds = await getAllDescendantIds(nodeId);
    const allNodeIds = [nodeId, ...descendantIds];

    // Delete all nodes (Prisma cascade will handle edges)
    for (const id of allNodeIds.reverse()) {
      await this.nodeRepo.delete(id);
    }

    return { success: true, deletedCount: allNodeIds.length };
  }

  /**
   * List archived nodes
   * Story 2.5 AC#4.3
   */
  async listArchived(graphId?: string): Promise<SearchResponse> {
    const { results: nodes, total } = await this.nodeRepo.findArchived(graphId);

    const results: SearchResultItem[] = nodes.map((node) => ({
      id: node.id,
      label: node.label,
      description: (node as { description?: string }).description,
      type: node.type as unknown as NodeType,
      tags: (node as { tags?: string[] }).tags ?? [],
      isArchived: true,
      graphId: node.graphId,
      graphName: node.graph.name,
      x: node.x,
      y: node.y,
      matchType: 'label' as const,
      archivedAt: (node as { archivedAt?: Date | null }).archivedAt?.toISOString() ?? null,
    }));

    return {
      results,
      total,
      hasMore: false,
      query: { includeArchived: true, graphId },
    };
  }

  /**
   * Get popular tags
   * Story 2.5: Helper for tag suggestions
   */
  async getPopularTags(graphId?: string): Promise<PopularTagsResponse> {
    const tagData = await this.nodeRepo.getPopularTags(graphId);
    return {
      tags: tagData.map((t) => ({ name: t.tag, count: t.count })),
    };
  }

  // ============================
  // Private Helpers for Search
  // ============================

  private determineMatchType(
    node: NodeWithGraph,
    query: SearchQueryDto
  ): 'label' | 'description' | 'tag' {
    const nodeTags = (node as { tags?: string[] }).tags ?? [];
    if (query.tags?.some((t) => nodeTags.includes(t))) {
      return 'tag';
    }
    if (query.q && node.label.toLowerCase().includes(query.q.toLowerCase())) {
      return 'label';
    }
    return 'description';
  }

  private createHighlight(
    node: NodeWithGraph,
    keyword?: string
  ): string | undefined {
    if (!keyword) return undefined;
    const lowerKeyword = keyword.toLowerCase();
    const lowerLabel = node.label.toLowerCase();
    if (lowerLabel.includes(lowerKeyword)) {
      return node.label; // Full label for now
    }
    const description = (node as { description?: string }).description;
    return description?.substring(0, 100);
  }
}
