/**
 * Story 2.2: Edges Service
 * Business logic for edge operations with cycle detection and validation
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EdgeRepository, EdgeCreateData, EdgeUpdateData } from './repositories/edge.repository';
import { prisma } from '@cdm/database';
import { NodeType, type EdgeMetadata, type EdgeResponse } from '@cdm/types';

export interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath?: string[]; // Node IDs forming the cycle
  cyclePathLabels?: string[]; // Node labels for user-friendly display
}

@Injectable()
export class EdgesService {
  constructor(private readonly edgeRepository: EdgeRepository) {}

  /**
   * Create a new edge with validation
   * Story 2.2: Validates dependency edges for Task-to-Task and no cycles
   */
  async createEdge(data: EdgeCreateData): Promise<EdgeResponse> {
    const kind = data.kind ?? 'hierarchical';

    // Dependency edge validation
    if (kind === 'dependency') {
      // 1. Validate source and target are TASK nodes
      await this.validateTaskNodes(data.sourceId, data.targetId);

      // 2. Check for cycles (dependency edges only)
      const cycleResult = await this.detectCycleIfCreated(
        data.graphId,
        data.sourceId,
        data.targetId
      );

      if (cycleResult.hasCycle) {
        const pathStr = cycleResult.cyclePathLabels?.join(' → ')
          ?? cycleResult.cyclePath?.join(' → ')
          ?? '';
        throw new BadRequestException(
          `循环依赖检测! 创建此依赖会形成闭环: ${pathStr}`
        );
      }

      // 3. Validate dependencyType is provided
      if (!data.dependencyType) {
        throw new BadRequestException(
          "dependencyType is required for dependency edges"
        );
      }
    }

    const edge = await this.edgeRepository.create(data);
    return this.formatEdgeResponse(edge);
  }

  /**
   * Get edge by ID
   */
  async getEdge(edgeId: string): Promise<EdgeResponse> {
    const edge = await this.edgeRepository.findById(edgeId);
    if (!edge) {
      throw new NotFoundException(`Edge ${edgeId} not found`);
    }
    return this.formatEdgeResponse(edge);
  }

  /**
   * Update edge metadata
   */
  async updateEdge(edgeId: string, data: EdgeUpdateData): Promise<EdgeResponse> {
    const existingEdge = await this.edgeRepository.findById(edgeId);
    if (!existingEdge) {
      throw new NotFoundException(`Edge ${edgeId} not found`);
    }

    // If changing kind to dependency, validate
    if (data.kind === 'dependency') {
      // Validate source and target are TASK nodes
      await this.validateTaskNodes(existingEdge.sourceId, existingEdge.targetId);

      // Validate dependencyType is provided
      if (!data.dependencyType) {
        throw new BadRequestException(
          "dependencyType is required when changing to dependency edge"
        );
      }

      // Check for cycles with this edge now being a dependency
      const currentMetadata = existingEdge.metadata as EdgeMetadata | null;
      const isCurrentlyDependency = currentMetadata?.kind === 'dependency';

      // Only check for cycles if this edge wasn't already a dependency
      if (!isCurrentlyDependency) {
        const cycleResult = await this.detectCycleIfCreated(
          existingEdge.graphId,
          existingEdge.sourceId,
          existingEdge.targetId
        );

        if (cycleResult.hasCycle) {
          const pathStr = cycleResult.cyclePathLabels?.join(' → ')
            ?? cycleResult.cyclePath?.join(' → ')
            ?? '';
          throw new BadRequestException(
            `循环依赖检测! 将此边改为依赖边会形成闭环: ${pathStr}`
          );
        }
      }
    }

    const edge = await this.edgeRepository.update(edgeId, data);
    return this.formatEdgeResponse(edge);
  }

  /**
   * Delete an edge
   */
  async deleteEdge(edgeId: string): Promise<void> {
    const existingEdge = await this.edgeRepository.findById(edgeId);
    if (!existingEdge) {
      throw new NotFoundException(`Edge ${edgeId} not found`);
    }
    await this.edgeRepository.delete(edgeId);
  }

  /**
   * Get all edges for a graph
   */
  async getEdgesByGraphId(graphId: string): Promise<EdgeResponse[]> {
    const edges = await this.edgeRepository.findByGraphId(graphId);
    return edges.map((edge) => this.formatEdgeResponse(edge));
  }

  /**
   * Validate that both source and target nodes are TASK type
   * Story 2.2: Only TASK nodes can have dependency edges
   */
  private async validateTaskNodes(sourceId: string, targetId: string): Promise<void> {
    const [sourceNode, targetNode] = await Promise.all([
      prisma.node.findUnique({ where: { id: sourceId }, select: { id: true, type: true, label: true } }),
      prisma.node.findUnique({ where: { id: targetId }, select: { id: true, type: true, label: true } }),
    ]);

    if (!sourceNode) {
      throw new BadRequestException(`Source node ${sourceId} not found`);
    }
    if (!targetNode) {
      throw new BadRequestException(`Target node ${targetId} not found`);
    }

    if (sourceNode.type !== NodeType.TASK) {
      throw new BadRequestException(
        `Dependency edges can only connect TASK nodes. Source node "${sourceNode.label}" is type ${sourceNode.type}`
      );
    }
    if (targetNode.type !== NodeType.TASK) {
      throw new BadRequestException(
        `Dependency edges can only connect TASK nodes. Target node "${targetNode.label}" is type ${targetNode.type}`
      );
    }
  }

  /**
   * Detect if creating an edge would form a cycle
   * Story 2.2: Only traverses dependency edges for cycle detection
   *
   * Algorithm: DFS from target to see if we can reach source
   * If we can reach source from target following dependency edges, adding source->target creates a cycle
   */
  async detectCycleIfCreated(
    graphId: string,
    sourceId: string,
    targetId: string
  ): Promise<CycleDetectionResult> {
    // Self-loop check
    if (sourceId === targetId) {
      const node = await prisma.node.findUnique({
        where: { id: sourceId },
        select: { label: true },
      });
      const label = node?.label ?? sourceId;
      return {
        hasCycle: true,
        cyclePath: [sourceId, targetId],
        cyclePathLabels: [label, label],
      };
    }

    // Get all dependency edges in the graph
    const dependencyEdges = await this.edgeRepository.findDependencyEdgesByGraphId(graphId);

    // Build adjacency list for DFS (source -> [targets])
    const adjacencyList = new Map<string, string[]>();
    for (const edge of dependencyEdges) {
      const targets = adjacencyList.get(edge.sourceId) ?? [];
      targets.push(edge.targetId);
      adjacencyList.set(edge.sourceId, targets);
    }

    // DFS from target to see if we can reach source
    // If we can, adding source -> target would create a cycle
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (current: string): boolean => {
      if (current === sourceId) {
        // We found a path from target back to source, which means adding source->target creates a cycle
        path.push(current);
        return true;
      }

      if (visited.has(current)) {
        return false;
      }

      visited.add(current);
      path.push(current);

      const neighbors = adjacencyList.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    if (dfs(targetId)) {
      // Construct the cycle path: source -> target -> ... -> source
      const cyclePath = [sourceId, ...path.reverse()];

      // Fetch node labels for user-friendly error messages
      const nodeLabels = await prisma.node.findMany({
        where: { id: { in: cyclePath } },
        select: { id: true, label: true },
      });
      const labelMap = new Map(nodeLabels.map((n) => [n.id, n.label ?? n.id]));
      const cyclePathLabels = cyclePath.map((id) => labelMap.get(id) ?? id);

      return { hasCycle: true, cyclePath, cyclePathLabels };
    }

    return { hasCycle: false };
  }

  /**
   * Format edge for API response
   */
  private formatEdgeResponse(
    edge: {
      id: string;
      graphId: string;
      sourceId: string;
      targetId: string;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
    }
  ): EdgeResponse {
    const metadata = (edge.metadata as EdgeMetadata | null) ?? { kind: 'hierarchical' };

    return {
      id: edge.id,
      graphId: edge.graphId,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      kind: metadata.kind,
      dependencyType: metadata.dependencyType,
      createdAt: edge.createdAt.toISOString(),
      updatedAt: edge.updatedAt.toISOString(),
    };
  }
}
