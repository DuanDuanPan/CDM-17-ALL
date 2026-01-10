/**
 * Story 9.1: Data Library (数据资源库)
 * Data Asset Repository - Data access layer for data assets
 */

import { Injectable } from '@nestjs/common';
import { prisma, type DataAsset, type DataFolder, type NodeDataLink, type Prisma } from '@cdm/database';
import type { DataAssetQueryDto, DataAssetFormat } from '@cdm/types';

@Injectable()
export class DataAssetRepository {
  /**
   * Create a new data asset
   */
  async create(data: Prisma.DataAssetCreateInput): Promise<DataAsset> {
    return prisma.dataAsset.create({
      data,
    });
  }

  /**
   * Find a data asset by ID
   */
  async findById(id: string): Promise<DataAsset | null> {
    return prisma.dataAsset.findUnique({
      where: { id },
    });
  }

  /**
   * Find data asset with folder info
   */
  async findByIdWithFolder(id: string): Promise<(DataAsset & { folder: DataFolder | null }) | null> {
    return prisma.dataAsset.findUnique({
      where: { id },
      include: { folder: true },
    });
  }

  /**
   * Find many data assets with filtering, pagination, and sorting
   */
  async findMany(
    graphId: string,
    options?: Omit<DataAssetQueryDto, 'graphId'>
  ): Promise<{ assets: (DataAsset & { folder: DataFolder | null })[]; total: number }> {
    const {
      search,
      format,
      folderId,
      tags,
      createdAfter,
      createdBefore,
      page = 1,
      pageSize = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options || {};

    // Build where clause
    const where: Prisma.DataAssetWhereInput = {
      graphId,
    };

    // Search by name (case-insensitive)
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Filter by format
    if (format) {
      where.format = format as DataAssetFormat;
    }

    // Filter by folder (null means root)
    if (folderId !== undefined) {
      where.folderId = folderId === '' ? null : folderId;
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags,
      };
    }

    // Filter by date range
    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore);
      }
    }

    // Build orderBy clause
    const orderBy: Prisma.DataAssetOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute query with pagination
    const [assets, total] = await Promise.all([
      prisma.dataAsset.findMany({
        where,
        include: { folder: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.dataAsset.count({ where }),
    ]);

    return { assets, total };
  }

  /**
   * Update a data asset
   */
  async update(id: string, data: Prisma.DataAssetUpdateInput): Promise<DataAsset> {
    return prisma.dataAsset.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a data asset
   */
  async delete(id: string): Promise<DataAsset> {
    return prisma.dataAsset.delete({
      where: { id },
    });
  }

  /**
   * Count assets by format for a graph
   */
  async countByFormat(graphId: string): Promise<{ format: string; count: number }[]> {
    const result = await prisma.dataAsset.groupBy({
      by: ['format'],
      where: { graphId },
      _count: { format: true },
    });

    return result.map((r) => ({
      format: r.format,
      count: r._count.format,
    }));
  }
}

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
   * Delete a folder
   */
  async delete(id: string): Promise<DataFolder> {
    return prisma.dataFolder.delete({
      where: { id },
    });
  }
}

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
   * Find all links for a node
   */
  async findByNode(nodeId: string): Promise<(NodeDataLink & { asset: DataAsset })[]> {
    return prisma.nodeDataLink.findMany({
      where: { nodeId },
      include: { asset: true },
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
