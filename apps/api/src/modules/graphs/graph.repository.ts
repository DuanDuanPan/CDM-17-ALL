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
        },
      }),
    );

    await prisma.$transaction(upsertOperations);
  }
}
