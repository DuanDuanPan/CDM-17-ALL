import { Injectable } from '@nestjs/common';
import { prisma, type Node } from '@cdm/database';
import { NodeType, SearchQueryDto } from '@cdm/types';

export interface NodeCreateData {
  id?: string;
  label: string;
  type: NodeType;
  graphId: string;
  parentId?: string | null;
  x?: number;
  y?: number;
  creatorName: string;
  description?: string;
  tags?: string[];
}

// Story 2.5: Extended to support tags and archive updates
export interface NodeUpdateData {
  label?: string;
  description?: string;
  x?: number;
  y?: number;
  type?: NodeType;
  creatorName?: string;
  tags?: string[];
  isArchived?: boolean;
  archivedAt?: Date | null;
}

/**
 * Story 2.2: Added explicit return types to fix TypeScript portability issues
 * with Prisma client type inference.
 * Story 2.5: Extended to include tags, isArchived, archivedAt, description
 * Story 2.9: Added appProps for APP node type
 */
export interface NodeWithProps extends Node {
  taskProps: unknown | null;
  requirementProps: unknown | null;
  pbsProps: unknown | null;
  dataProps: unknown | null;
  appProps: unknown | null; // Story 2.9
}

// Story 2.5: Extended node with graph name for search results
// Story 2.9: Added appProps for APP node type
export interface NodeWithGraph extends Node {
  graph: { id: string; name: string };
  taskProps?: unknown | null;
  requirementProps?: unknown | null;
  pbsProps?: unknown | null;
  dataProps?: unknown | null;
  appProps?: unknown | null; // Story 2.9
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
        appProps: true, // Story 2.9
      },
    }) as Promise<NodeWithProps | null>;
  }

  async create(data: NodeCreateData): Promise<Node> {
    return prisma.node.create({
      data: {
        id: data.id,
        label: data.label,
        description: data.description,
        type: data.type,
        graphId: data.graphId,
        parentId: data.parentId ?? null,
        x: data.x ?? 0,
        y: data.y ?? 0,
        creatorName: data.creatorName,
        tags: data.tags ?? [],
      },
    });
  }

  async update(nodeId: string, data: NodeUpdateData): Promise<Node> {
    return prisma.node.update({
      where: { id: nodeId },
      data,
    });
  }

  /**
   * Story 2.7: Hard delete node (permanent removal)
   * Note: Prisma cascade will automatically delete related edges
   */
  async delete(nodeId: string): Promise<void> {
    await prisma.node.delete({
      where: { id: nodeId },
    });
  }

  /**
   * Story 2.5: Search nodes with keyword, tags, and archive filtering
   * @param query Search parameters
   * @returns Matching nodes with graph info and total count
   */
  async search(query: SearchQueryDto): Promise<{ results: NodeWithGraph[]; total: number }> {
    const { q, tags, includeArchived, graphId, nodeTypes, limit = 50, offset = 0 } = query;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // 1. Archive filter (default: exclude archived)
    if (!includeArchived) {
      where.isArchived = false;
    }

    // 2. Graph scope filter
    if (graphId) {
      where.graphId = graphId;
    }

    // 3. Node type filter
    if (nodeTypes && nodeTypes.length > 0) {
      where.type = { in: nodeTypes };
    }

    // 4. Tags filter (hasSome - matches any of the provided tags)
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // 5. Keyword search (ILIKE on label/description)
    if (q && q.trim()) {
      const keyword = q.trim();
      where.OR = [
        { label: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // Execute query with count
    const [results, total] = await Promise.all([
      prisma.node.findMany({
        where,
        include: { graph: { select: { id: true, name: true } } },
        orderBy: [{ updatedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.node.count({ where }),
    ]);

    return { results: results as NodeWithGraph[], total };
  }

  /**
   * Story 2.5: Find all archived nodes, optionally filtered by graph
   */
  async findArchived(graphId?: string): Promise<{ results: NodeWithGraph[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isArchived: true };
    if (graphId) {
      where.graphId = graphId;
    }

    const [results, total] = await Promise.all([
      prisma.node.findMany({
        where,
        include: { graph: { select: { id: true, name: true } } },
        orderBy: [{ archivedAt: 'desc' }],
      }),
      prisma.node.count({ where }),
    ]);

    return { results: results as NodeWithGraph[], total };
  }

  /**
   * Story 2.5: Get popular tags across all nodes in a graph or globally
   */
  async getPopularTags(graphId?: string, limit = 20): Promise<Array<{ tag: string; count: number }>> {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
    const result = graphId
      ? await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
          SELECT unnest(tags) as tag, COUNT(*) as count
          FROM "Node"
          WHERE "graphId" = ${graphId} AND "isArchived" = false
          GROUP BY tag
          ORDER BY count DESC
          LIMIT ${safeLimit}
        `
      : await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
          SELECT unnest(tags) as tag, COUNT(*) as count
          FROM "Node"
          WHERE "isArchived" = false
          GROUP BY tag
          ORDER BY count DESC
          LIMIT ${safeLimit}
        `;

    return result.map((r) => ({ tag: r.tag, count: Number(r.count) }));
  }
}
