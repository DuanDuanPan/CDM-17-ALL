/**
 * Story 7.1: Backend Repository Pattern Refactor
 * GraphRepository - Abstracts Graph data access from CollabService
 */

import { Injectable } from '@nestjs/common';
import { prisma, type Graph } from '@cdm/database';
import type { Prisma } from '@cdm/database';
import { NodeType } from '@cdm/types';

/**
 * Story 7.5 Fix: Batch upsert data structure for CollabService node sync
 * Kept in GraphRepository to maintain kernel isolation from business plugins
 */
export interface NodeUpsertBatchData {
  id: string;
  label: string;
  graphId: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId: string | null;
  creatorName: string;
  description: string | null;
  tags: string[];
  isArchived: boolean;
  order: number; // Story 8.6: Sibling node order
}


export type GraphWithRelations = Prisma.GraphGetPayload<{
  include: {
    nodes: {
      include: {
        taskProps: true;
        requirementProps: true;
        pbsProps: true;
        dataProps: true;
        appProps: true;
      };
    };
    edges: true;
  };
}>;

/**
 * Story 10.1: Type definitions for GraphsService refactoring
 */
// Include pattern for create/update/findOne operations (with ownerId for permission checks)
const PROJECT_SELECT_WITH_OWNER = {
  id: true,
  name: true,
  ownerId: true,
} as const;

// Include pattern for list operations (without ownerId)
const PROJECT_SELECT_PUBLIC = {
  id: true,
  name: true,
} as const;

// Graph with project including ownerId (for create/update/findOne)
export type GraphWithProjectOwner = Prisma.GraphGetPayload<{
  include: {
    project: {
      select: typeof PROJECT_SELECT_WITH_OWNER;
    };
  };
}>;

// Graph with project and counts (for list operations)
export type GraphWithProjectAndCount = Prisma.GraphGetPayload<{
  include: {
    project: {
      select: typeof PROJECT_SELECT_PUBLIC;
    };
    _count: {
      select: { nodes: true; edges: true };
    };
  };
}>;

/**
 * Story 10.1: Create graph input data
 */
export interface CreateGraphData {
  name: string;
  projectId: string;
}

/**
 * Story 10.1: Update graph input data
 */
export interface UpdateGraphData {
  name?: string;
}

@Injectable()
export class GraphRepository {
  /**
   * Find graph with all related nodes (including props) and edges
   * Used by CollabService.onLoadDocument (replaces line 107)
   */
  async findGraphWithRelations(
    graphId: string,
  ): Promise<GraphWithRelations | null> {
    return prisma.graph.findUnique({
      where: { id: graphId },
      include: {
        nodes: {
          include: {
            taskProps: true,
            requirementProps: true,
            pbsProps: true,
            dataProps: true,
            appProps: true,
          },
        },
        edges: true,
      },
    });
  }

  /**
   * Update Yjs binary state for a graph
   * Used by CollabService.onStoreDocument (replaces line 319)
   * Story 7.1 Fix: Changed Buffer to Uint8Array for Prisma Bytes compatibility
   * (TypeScript 5.6+ has stricter Buffer/Uint8Array type checking)
   */
  async updateYjsState(graphId: string, yjsState: Uint8Array): Promise<Graph> {
    return prisma.graph.update({
      where: { id: graphId },
      data: { yjsState: Buffer.from(yjsState) },
    });
  }

  /**
   * Find graph by ID (basic)
   */
  async findById(graphId: string): Promise<Graph | null> {
    return prisma.graph.findUnique({
      where: { id: graphId },
    });
  }

  /**
   * Check if graph exists
   */
  async exists(graphId: string): Promise<boolean> {
    const graph = await prisma.graph.findUnique({
      where: { id: graphId },
      select: { id: true },
    });
    return graph !== null;
  }

  // ============================================================
  // Story 10.1: New CRUD methods for GraphsService refactoring
  // ============================================================

  /**
   * Story 10.1: Create a new graph with project include
   * Used by GraphsService.create()
   */
  async create(data: CreateGraphData): Promise<GraphWithProjectOwner> {
    return prisma.graph.create({
      data: {
        name: data.name,
        projectId: data.projectId,
        data: {},
      },
      include: {
        project: {
          select: PROJECT_SELECT_WITH_OWNER,
        },
      },
    });
  }

  /**
   * Story 10.1: Find graphs by user ID with counts
   * Used by GraphsService.findByUser()
   * Returns graphs ordered by updatedAt desc
   */
  async findByUserId(userId: string): Promise<GraphWithProjectAndCount[]> {
    return prisma.graph.findMany({
      where: {
        project: {
          ownerId: userId,
        },
      },
      include: {
        project: {
          select: PROJECT_SELECT_PUBLIC,
        },
        _count: {
          select: {
            nodes: true,
            edges: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Story 10.1: Find single graph with project including ownerId
   * Used by GraphsService.findOne() and for permission checks in update/remove
   */
  async findOneWithProject(graphId: string): Promise<GraphWithProjectOwner | null> {
    return prisma.graph.findUnique({
      where: { id: graphId },
      include: {
        project: {
          select: PROJECT_SELECT_WITH_OWNER,
        },
      },
    });
  }

  /**
   * Story 10.1: Update graph with project include
   * Used by GraphsService.update()
   * Story 10.1 Fix: Only update fields that are defined (prevent undefined → null)
   */
  async update(graphId: string, data: UpdateGraphData): Promise<GraphWithProjectOwner> {
    return prisma.graph.update({
      where: { id: graphId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        updatedAt: new Date(),
      },
      include: {
        project: {
          select: PROJECT_SELECT_WITH_OWNER,
        },
      },
    });
  }

  /**
   * Story 10.1: Delete graph
   * Used by GraphsService.remove()
   */
  async delete(graphId: string): Promise<void> {
    await prisma.graph.delete({ where: { id: graphId } });
  }

  /**
   * Story 7.5 Fix: Batch upsert nodes from Yjs sync
   * Used by CollabService.onStoreDocument to sync nodes to relational DB
   * Encapsulates Prisma calls to maintain Repository pattern compliance
   * @param nodes Array of node data to upsert
   */
  async upsertNodesBatch(nodes: NodeUpsertBatchData[]): Promise<void> {
    if (nodes.length === 0) {
      return;
    }

    const upsertOperations = nodes.map((node) =>
      prisma.node.upsert({
        where: { id: node.id },
        create: {
          id: node.id,
          label: node.label,
          graphId: node.graphId,
          type: node.type,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          parentId: node.parentId,
          creatorName: node.creatorName,
          description: node.description,
          tags: node.tags,
          isArchived: node.isArchived,
          order: node.order, // Story 8.6
        },
        update: {
          label: node.label,
          type: node.type,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          parentId: node.parentId,
          creatorName: node.creatorName,
          description: node.description,
          tags: node.tags,
          isArchived: node.isArchived,
          order: node.order, // Story 8.6
        },
      }),
    );

    await prisma.$transaction(upsertOperations);
  }
}
