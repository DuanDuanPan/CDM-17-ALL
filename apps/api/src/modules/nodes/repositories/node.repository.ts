import { Injectable } from '@nestjs/common';
import { prisma, type Node } from '@cdm/database';
import { NodeType } from '@cdm/types';

export interface NodeCreateData {
  id?: string;
  label: string;
  type: NodeType;
  graphId: string;
  parentId?: string | null;
  x?: number;
  y?: number;
  creatorName: string;
}

export interface NodeUpdateData {
  label?: string;
  x?: number;
  y?: number;
  type?: NodeType;
  creatorName?: string;
}

/**
 * Story 2.2: Added explicit return types to fix TypeScript portability issues
 * with Prisma client type inference.
 */
export interface NodeWithProps extends Node {
  taskProps: unknown | null;
  requirementProps: unknown | null;
  pbsProps: unknown | null;
  dataProps: unknown | null;
}

@Injectable()
export class NodeRepository {
  async findById(nodeId: string): Promise<Node | null> {
    return prisma.node.findUnique({ where: { id: nodeId } });
  }

  async findByIdWithProps(nodeId: string): Promise<NodeWithProps | null> {
    return prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        taskProps: true,
        requirementProps: true,
        pbsProps: true,
        dataProps: true,
      },
    }) as Promise<NodeWithProps | null>;
  }

  async create(data: NodeCreateData): Promise<Node> {
    return prisma.node.create({
      data: {
        id: data.id,
        label: data.label,
        type: data.type,
        graphId: data.graphId,
        parentId: data.parentId ?? null,
        x: data.x ?? 0,
        y: data.y ?? 0,
        creatorName: data.creatorName,
      },
    });
  }

  async update(nodeId: string, data: NodeUpdateData): Promise<Node> {
    return prisma.node.update({
      where: { id: nodeId },
      data,
    });
  }
}
