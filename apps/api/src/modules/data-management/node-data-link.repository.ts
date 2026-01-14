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

    async getNodeGraphId(nodeId: string): Promise<string | null> {
        const node = await prisma.node.findUnique({
            where: { id: nodeId },
            select: { graphId: true },
        });

        return node?.graphId ?? null;
    }

    async getAssetGraphId(assetId: string): Promise<string | null> {
        const asset = await prisma.dataAsset.findFirst({
            where: { id: assetId, isDeleted: false },
            select: { graphId: true },
        });

        return asset?.graphId ?? null;
    }

    async getAssetsGraphIds(assetIds: string[]): Promise<Array<{ id: string; graphId: string }>> {
        if (assetIds.length === 0) return [];

        return prisma.dataAsset.findMany({
            where: { id: { in: assetIds }, isDeleted: false },
            select: { id: true, graphId: true },
        });
    }

    async createMany(data: Prisma.NodeDataLinkCreateManyInput[]): Promise<number> {
        if (data.length === 0) return 0;

        const result = await prisma.nodeDataLink.createMany({
            data,
            skipDuplicates: true,
        });

        return result.count;
    }

    /**
     * Find all links for a node with asset + folder info
     * Story 9.2: Updated to include folder info for PBS/Task views
     */
    async findByNode(nodeId: string): Promise<(NodeDataLink & { asset: DataAsset & { folder: DataFolder | null } })[]> {
        return prisma.nodeDataLink.findMany({
            where: { nodeId, asset: { isDeleted: false } },
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
            where: { nodeId: { in: nodeIds }, asset: { isDeleted: false } },
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
     * Count links for an asset
     */
    async countByAsset(assetId: string): Promise<number> {
        return prisma.nodeDataLink.count({
            where: { assetId },
        });
    }

    /**
     * Delete all links for an asset
     */
    async deleteManyByAsset(assetId: string): Promise<number> {
        const result = await prisma.nodeDataLink.deleteMany({
            where: { assetId },
        });

        return result.count;
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

    /**
     * Story 9.8 Task 7.0: Find links matching nodeIds AND assetIds
     * Used for batch unlink with undo capability
     */
    async findByNodeIdsAndAssetIds(
        nodeIds: string[],
        assetIds: string[]
    ): Promise<NodeDataLink[]> {
        if (nodeIds.length === 0 || assetIds.length === 0) return [];

        return prisma.nodeDataLink.findMany({
            where: {
                nodeId: { in: nodeIds },
                assetId: { in: assetIds },
            },
        });
    }

    /**
     * Story 9.8 Task 7.0: Delete links matching nodeIds AND assetIds (batch)
     */
    async deleteManyByNodeIdsAndAssetIds(
        nodeIds: string[],
        assetIds: string[]
    ): Promise<number> {
        if (nodeIds.length === 0 || assetIds.length === 0) return 0;

        const result = await prisma.nodeDataLink.deleteMany({
            where: {
                nodeId: { in: nodeIds },
                assetId: { in: assetIds },
            },
        });

        return result.count;
    }
}
