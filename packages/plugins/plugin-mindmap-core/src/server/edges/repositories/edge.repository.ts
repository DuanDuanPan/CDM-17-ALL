/**
 * Story 2.2: Edge Repository
 * Data access layer for edge operations with cycle detection support
 */

import { Injectable } from '@nestjs/common';
import { prisma, type Edge } from '@cdm/database';
import type { EdgeKind, DependencyType, EdgeMetadata } from '@cdm/types';

export interface EdgeCreateData {
  id?: string;
  graphId: string;
  sourceId: string;
  targetId: string;
  kind?: EdgeKind;
  dependencyType?: DependencyType;
}

export interface EdgeUpdateData {
  kind?: EdgeKind;
  dependencyType?: DependencyType;
}

@Injectable()
export class EdgeRepository {
  /**
   * Find edge by ID
   */
  async findById(edgeId: string): Promise<Edge | null> {
    return prisma.edge.findUnique({ where: { id: edgeId } });
  }

  /**
   * Find all edges in a graph
   */
  async findByGraphId(graphId: string): Promise<Edge[]> {
    return prisma.edge.findMany({ where: { graphId } });
  }

  /**
   * Find all dependency edges in a graph (for cycle detection)
   */
  async findDependencyEdgesByGraphId(graphId: string): Promise<Edge[]> {
    const edges = await prisma.edge.findMany({
      where: { graphId },
    });

    // Filter to only dependency edges
    return edges.filter((edge) => {
      const metadata = edge.metadata as EdgeMetadata | null;
      return metadata?.kind === 'dependency';
    });
  }

  /**
   * Find edges by source node
   */
  async findBySourceId(sourceId: string): Promise<Edge[]> {
    return prisma.edge.findMany({ where: { sourceId } });
  }

  /**
   * Find edges by target node
   */
  async findByTargetId(targetId: string): Promise<Edge[]> {
    return prisma.edge.findMany({ where: { targetId } });
  }

  /**
   * Create a new edge
   */
  async create(data: EdgeCreateData): Promise<Edge> {
    const metadata: Record<string, string | undefined> = {
      kind: data.kind ?? 'hierarchical',
    };
    if (data.dependencyType) {
      metadata.dependencyType = data.dependencyType;
    }

    return prisma.edge.create({
      data: {
        id: data.id,
        graphId: data.graphId,
        sourceId: data.sourceId,
        targetId: data.targetId,
        type: data.kind ?? 'hierarchical', // Legacy field
        metadata,
      },
    });
  }

  /**
   * Update edge metadata
   */
  async update(edgeId: string, data: EdgeUpdateData): Promise<Edge> {
    // First get current edge to merge metadata
    const currentEdge = await this.findById(edgeId);
    if (!currentEdge) {
      throw new Error(`Edge ${edgeId} not found`);
    }

    const currentMetadata = (currentEdge.metadata as unknown as EdgeMetadata) ?? { kind: 'hierarchical' };
    const newMetadata: Record<string, string | undefined> = {
      kind: data.kind ?? currentMetadata.kind,
    };

    // Only add dependencyType if it's a dependency edge
    if (newMetadata.kind === 'dependency' && data.dependencyType) {
      newMetadata.dependencyType = data.dependencyType;
    } else if (newMetadata.kind === 'dependency' && currentMetadata.dependencyType) {
      // Keep existing dependencyType if not changing
      newMetadata.dependencyType = currentMetadata.dependencyType;
    }
    // If kind is hierarchical, don't add dependencyType

    return prisma.edge.update({
      where: { id: edgeId },
      data: {
        type: newMetadata.kind, // Legacy field
        metadata: newMetadata,
      },
    });
  }

  /**
   * Delete an edge
   */
  async delete(edgeId: string): Promise<Edge> {
    return prisma.edge.delete({ where: { id: edgeId } });
  }
}
