/**
 * Story 2.1: Node Service with polymorphic type support
 * Handles node CRUD operations and type-specific property management
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cdm/database';
import {
  NodeType,
  TaskProps,
  RequirementProps,
  PBSProps,
  DataProps,
  NodeProps,
  NodeResponse,
  NodeTypeChangeResponse,
} from '@cdm/types';
import {
  CreateNodeDto,
  UpdateNodeDto,
  UpdateNodeTypeDto,
  UpdateNodePropsDto,
} from './nodes.request.dto';

/**
 * [AI-Review][MEDIUM-1] Type-safe property mappers to replace 'as any' casts
 */

function mapTaskProps(props: NodeProps): Partial<{
  status: string;
  assigneeId: string | null;
  dueDate: Date | null;
  priority: string | null;
}> {
  const p = props as TaskProps;
  return {
    status: p.status || 'todo',
    assigneeId: p.assigneeId || null,
    dueDate: p.dueDate ? new Date(p.dueDate) : null,
    priority: p.priority || 'medium',
  };
}

function mapRequirementProps(props: NodeProps): Partial<{
  reqType: string | null;
  acceptanceCriteria: string | null;
  priority: string | null;
}> {
  const p = props as RequirementProps;
  return {
    reqType: p.reqType || null,
    acceptanceCriteria: p.acceptanceCriteria || null,
    priority: p.priority || 'medium',
  };
}

function mapPBSProps(props: NodeProps): Partial<{
  code: string | null;
  version: string | null;
  ownerId: string | null;
}> {
  const p = props as PBSProps;
  return {
    code: p.code || null,
    version: p.version || 'v1.0.0',
    ownerId: p.ownerId || null,
  };
}

function mapDataProps(props: NodeProps): Partial<{
  dataType: string | null;
  version: string | null;
  secretLevel: string | null;
  storagePath: string | null;
}> {
  const p = props as DataProps;
  return {
    dataType: p.dataType || 'document',
    version: p.version || 'v1.0.0',
    secretLevel: p.secretLevel || 'public',
    storagePath: p.storagePath || null,
  };
}

@Injectable()
export class NodesService {
  /**
   * Update node type and initialize corresponding extension table
   * Story 2.1 AC#2, AC#4
   * [AI-Review][MEDIUM-2] Added explicit return type
   */
  async updateNodeType(nodeId: string, dto: UpdateNodeTypeDto): Promise<NodeTypeChangeResponse> {
    // Check if node exists
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const oldType = node.type;
    const newType = dto.type;

    // Update node type
    const updatedNode = await prisma.node.update({
      where: { id: nodeId },
      data: { type: newType },
    });

    // Initialize extension table for new type
    await this.initializeExtensionTable(nodeId, newType);

    // [AI-Review][MEDIUM-2] Cast Prisma type to our NodeType for consistent return
    const nodeResponse = await this.getNodeWithProps(nodeId);
    return {
      ...nodeResponse,
      oldType: oldType as unknown as NodeType,
      newType: newType,
    };
  }

  /**
   * Update node properties (polymorphic based on type)
   * Story 2.1 AC#8
   * [AI-Review][MEDIUM-2] Added explicit return type
   */
  async updateNodeProps(nodeId: string, dto: UpdateNodePropsDto): Promise<NodeResponse> {
    // Verify node exists and get its type
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    // Ensure extension table exists
    await this.initializeExtensionTable(nodeId, dto.type);

    // Update type-specific properties using type-safe mappers
    // [AI-Review][MEDIUM-1] Fixed: Replaced 'as any' with type-safe mappers
    switch (dto.type) {
      case NodeType.TASK: {
        const taskData = mapTaskProps(dto.props);
        await prisma.nodeTask.upsert({
          where: { nodeId },
          create: { nodeId, ...taskData },
          update: taskData,
        });
        break;
      }

      case NodeType.REQUIREMENT: {
        const reqData = mapRequirementProps(dto.props);
        await prisma.nodeRequirement.upsert({
          where: { nodeId },
          create: { nodeId, ...reqData },
          update: reqData,
        });
        break;
      }

      case NodeType.PBS: {
        const pbsData = mapPBSProps(dto.props);
        await prisma.nodePBS.upsert({
          where: { nodeId },
          create: { nodeId, ...pbsData },
          update: pbsData,
        });
        break;
      }

      case NodeType.DATA: {
        const dataData = mapDataProps(dto.props);
        await prisma.nodeData.upsert({
          where: { nodeId },
          create: { nodeId, ...dataData },
          update: dataData,
        });
        break;
      }

      case NodeType.ORDINARY:
      default:
        // Ordinary nodes don't have extension properties
        break;
    }

    // Return node with properties
    return this.getNodeWithProps(nodeId);
  }

  /**
   * Get node with its type-specific properties
   * Story 2.1 AC#6, AC#7, AC#8
   * [AI-Review][MEDIUM-2] Added explicit return type
   */
  async getNodeWithProps(nodeId: string): Promise<NodeResponse> {
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        taskProps: true,
        requirementProps: true,
        pbsProps: true,
        dataProps: true,
      },
    });

    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    // Extract type-specific properties
    let props = {};
    switch (node.type) {
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
    }

    // [AI-Review][MEDIUM-2] Cast Prisma type to our NodeType
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
      props,
    };
  }

  /**
   * Initialize extension table for a given node type
   * Story 2.1: Ensures extension record exists when type is set
   */
  private async initializeExtensionTable(nodeId: string, type: NodeType) {
    try {
      switch (type) {
        case NodeType.TASK:
          await prisma.nodeTask.upsert({
            where: { nodeId },
            create: { nodeId, status: 'todo', priority: 'medium' },
            update: {},
          });
          break;

        case NodeType.REQUIREMENT:
          await prisma.nodeRequirement.upsert({
            where: { nodeId },
            create: { nodeId, priority: 'medium' },
            update: {},
          });
          break;

        case NodeType.PBS:
          await prisma.nodePBS.upsert({
            where: { nodeId },
            create: { nodeId, version: 'v1.0.0' },
            update: {},
          });
          break;

        case NodeType.DATA:
          await prisma.nodeData.upsert({
            where: { nodeId },
            create: { nodeId, secretLevel: 'public' },
            update: {},
          });
          break;

        case NodeType.ORDINARY:
        default:
          // No extension table for ordinary nodes
          break;
      }
    } catch (error) {
      // [AI-Review][LOW-2] Improved error handling: only swallow P2002 (unique constraint) errors
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        // Record already exists, which is fine
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Create a new node
   * Story 2.1: Support creating nodes with specific types
   * [AI-Review][MEDIUM-2] Added explicit return type
   */
  async createNode(dto: CreateNodeDto): Promise<NodeResponse> {
    const node = await prisma.node.create({
      data: {
        label: dto.label,
        type: dto.type || NodeType.ORDINARY,
        graphId: dto.graphId,
        parentId: dto.parentId,
        x: dto.x || 0,
        y: dto.y || 0,
      },
    });

    // Initialize extension table if type is not ORDINARY
    if (node.type !== NodeType.ORDINARY) {
      await this.initializeExtensionTable(node.id, node.type as NodeType);
    }

    return this.getNodeWithProps(node.id);
  }

  /**
   * Update node basic properties
   * [AI-Review][MEDIUM-2] Added explicit return type
   */
  async updateNode(nodeId: string, dto: UpdateNodeDto): Promise<NodeResponse> {
    // [AI-Review-2][MEDIUM-1] Fixed: Use precise type instead of any
    const updateData: Partial<{ label: string; x: number; y: number }> = {};
    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.x !== undefined) updateData.x = dto.x;
    if (dto.y !== undefined) updateData.y = dto.y;

    // If type is being changed, handle it separately
    if (dto.type !== undefined) {
      await this.updateNodeType(nodeId, { type: dto.type });
    }

    // Update basic properties
    if (Object.keys(updateData).length > 0) {
      await prisma.node.update({
        where: { id: nodeId },
        data: updateData,
      });
    }

    // If props are being updated, handle them
    if (dto.props !== undefined && dto.type !== undefined) {
      return this.updateNodeProps(nodeId, { type: dto.type, props: dto.props });
    }

    return this.getNodeWithProps(nodeId);
  }
}
