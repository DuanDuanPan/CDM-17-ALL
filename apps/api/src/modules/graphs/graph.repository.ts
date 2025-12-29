/**
 * Story 7.1: Backend Repository Pattern Refactor
 * GraphRepository - Abstracts Graph data access from CollabService
 */

import { Injectable } from '@nestjs/common';
import { prisma, type Graph, type Node, type Edge } from '@cdm/database';

/**
 * Graph with all relations needed for Yjs document loading
 */
export interface GraphWithRelations extends Graph {
  nodes: Array<
    Node & {
      taskProps: unknown | null;
      requirementProps: unknown | null;
      pbsProps: unknown | null;
      dataProps: unknown | null;
      appProps: unknown | null;
    }
  >;
  edges: Edge[];
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
    }) as Promise<GraphWithRelations | null>;
  }

  /**
   * Update Yjs binary state for a graph
   * Used by CollabService.onStoreDocument (replaces line 319)
   * Note: Prisma Bytes type accepts Buffer (Node.js Uint8Array subclass)
   */
  async updateYjsState(graphId: string, yjsState: Buffer): Promise<Graph> {
    return prisma.graph.update({
      where: { id: graphId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { yjsState: yjsState as any },
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
}
