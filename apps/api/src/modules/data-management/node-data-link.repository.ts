/**
 * Story 9.1 & 9.2: NodeDataLink Repository
 * Extracted from data-asset.repository.ts to meet 300 LOC limit (GR-2)
 */

import { Injectable } from '@nestjs/common';
import { prisma, type DataAsset, type DataFolder, type NodeDataLink, type Prisma } from '@cdm/database';

@Injectable()
export class NodeDataLinkRepository {
    /**
     * Create a link between node and asset
     */
    async create(data: Prisma.NodeDataLinkCreateInput): Promise<NodeDataLink> {
        return prisma.nodeDataLink.create({
            data,
        });
    }

    /**
     * Find link by node and asset
     */
    async findByNodeAndAsset(nodeId: string, assetId: string): Promise<NodeDataLink | null> {
        return prisma.nodeDataLink.findUnique({
            where: {
                nodeId_assetId: { nodeId, assetId },
            },
        });
    }

    /**
     * Find all links for a node with asset + folder info
     * Story 9.2: Updated to include folder info for PBS/Task views
     */
    async findByNode(nodeId: string): Promise<(NodeDataLink & { asset: DataAsset & { folder: DataFolder | null } })[]> {
        return prisma.nodeDataLink.findMany({
            where: { nodeId },
            include: {
                asset: {
                    include: { folder: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Story 9.2: Find all links for multiple nodes (batch query)
     * Used for PBS "include sub-nodes" and Task batch asset queries
     */
    async findByNodeIds(nodeIds: string[]): Promise<(NodeDataLink & { asset: DataAsset & { folder: DataFolder | null } })[]> {
        if (nodeIds.length === 0) return [];

        return prisma.nodeDataLink.findMany({
            where: { nodeId: { in: nodeIds } },
            include: {
                asset: {
                    include: { folder: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find all links for an asset
     */
    async findByAsset(assetId: string): Promise<NodeDataLink[]> {
        return prisma.nodeDataLink.findMany({
            where: { assetId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Delete a link
     */
    async delete(id: string): Promise<NodeDataLink> {
        return prisma.nodeDataLink.delete({
            where: { id },
        });
    }

    /**
     * Delete link by node and asset
     */
    async deleteByNodeAndAsset(nodeId: string, assetId: string): Promise<NodeDataLink | null> {
        try {
            return await prisma.nodeDataLink.delete({
                where: {
                    nodeId_assetId: { nodeId, assetId },
                },
            });
        } catch {
            return null;
        }
    }
}
