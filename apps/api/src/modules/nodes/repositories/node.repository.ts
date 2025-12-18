import { Injectable } from '@nestjs/common';
import { prisma } from '@cdm/database';
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

@Injectable()
export class NodeRepository {
  async findById(nodeId: string) {
    return prisma.node.findUnique({ where: { id: nodeId } });
  }

  async findByIdWithProps(nodeId: string) {
    return prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        taskProps: true,
        requirementProps: true,
        pbsProps: true,
        dataProps: true,
      },
    });
  }

  async create(data: NodeCreateData) {
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

  async update(nodeId: string, data: NodeUpdateData) {
    return prisma.node.update({
      where: { id: nodeId },
      data,
    });
  }
}
