/**
 * Story 2.1: Node Service with polymorphic type support
 * Handles node CRUD operations and type-specific property management
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DataProps,
  NodeResponse,
  NodeType,
  NodeTypeChangeResponse,
  NodeProps,
  PBSProps,
  RequirementProps,
  TaskProps,
} from '@cdm/types';
import {
  CreateNodeDto,
  UpdateNodeDto,
  UpdateNodeTypeDto,
  UpdateNodePropsDto,
} from './nodes.request.dto';
import { NodeRepository, NodeUpdateData } from './repositories/node.repository';
import { TaskService } from './services/task.service';
import { RequirementService } from './services/requirement.service';
import { PBSService } from './services/pbs.service';
import { DataService } from './services/data.service';

const DEFAULT_CREATOR_NAME = 'Mock User';

@Injectable()
export class NodesService {
  constructor(
    private readonly nodeRepo: NodeRepository,
    private readonly taskService: TaskService,
    private readonly requirementService: RequirementService,
    private readonly pbsService: PBSService,
    private readonly dataService: DataService
  ) {}

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
      case NodeType.ORDINARY:
      default:
        props = {};
        break;
    }

    return {
      id: node.id,
      label: node.label,
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
      type: dto.type || NodeType.ORDINARY,
      graphId: dto.graphId,
      parentId: dto.parentId,
      x: dto.x ?? 0,
      y: dto.y ?? 0,
      creatorName: dto.creatorName || DEFAULT_CREATOR_NAME,
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
    if (dto.x !== undefined) updateData.x = dto.x;
    if (dto.y !== undefined) updateData.y = dto.y;

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
      case NodeType.ORDINARY:
      default:
        break;
    }
  }
}
