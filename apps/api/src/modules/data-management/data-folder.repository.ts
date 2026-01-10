/**
 * Story 9.1 & 9.2: DataFolder Repository
 * Extracted from data-asset.repository.ts to meet 300 LOC limit (GR-2)
 */

import { Injectable } from '@nestjs/common';
import { prisma, type DataFolder, type Prisma } from '@cdm/database';

@Injectable()
export class DataFolderRepository {
    /**
     * Create a new folder
     */
    async create(data: Prisma.DataFolderCreateInput): Promise<DataFolder> {
        return prisma.dataFolder.create({
            data,
        });
    }

    /**
     * Find a folder by ID
     */
    async findById(id: string): Promise<DataFolder | null> {
        return prisma.dataFolder.findUnique({
            where: { id },
        });
    }

    /**
     * Find all folders for a graph (flat list)
     */
    async findByGraph(graphId: string): Promise<DataFolder[]> {
        return prisma.dataFolder.findMany({
            where: { graphId },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Find folders with asset count
     */
    async findByGraphWithAssetCount(graphId: string): Promise<(DataFolder & { _count: { assets: number } })[]> {
        return prisma.dataFolder.findMany({
            where: { graphId },
            include: {
                _count: {
                    select: { assets: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Update a folder
     */
    async update(id: string, data: Prisma.DataFolderUpdateInput): Promise<DataFolder> {
        return prisma.dataFolder.update({
            where: { id },
            data,
        });
    }

    /**
     * Story 9.2: Check if folder has assets (for delete validation)
     */
    async hasAssets(id: string): Promise<boolean> {
        const count = await prisma.dataAsset.count({
            where: { folderId: id },
        });
        return count > 0;
    }

    /**
     * Story 9.2: Check if folder has child folders
     */
    async hasChildren(id: string): Promise<boolean> {
        const count = await prisma.dataFolder.count({
            where: { parentId: id },
        });
        return count > 0;
    }

    /**
     * Delete a folder
     */
    async delete(id: string): Promise<DataFolder> {
        return prisma.dataFolder.delete({
            where: { id },
        });
    }
}
