/**
 * Story 9.1: Data Library (数据资源库)
 * Data Asset Repository - Data access layer for data assets
 * 
 * GR-2 Compliance: Repository classes extracted to separate files
 */

import { Injectable } from '@nestjs/common';
import { prisma, type DataAsset, type DataFolder, type Prisma } from '@cdm/database';
import type { DataAssetQueryDto, DataAssetFormat } from '@cdm/types';

// Re-export for backward compatibility
export { DataFolderRepository } from './data-folder.repository';
export { NodeDataLinkRepository } from './node-data-link.repository';

function parseDateBoundary(value: string, boundary: 'start' | 'end'): Date {
  // If the input is date-only (YYYY-MM-DD), treat it as UTC day boundary.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = boundary === 'start' ? '00:00:00.000' : '23:59:59.999';
    return new Date(`${value}T${time}Z`);
  }

  return new Date(value);
}

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
        where.createdAt.gte = parseDateBoundary(createdAfter, 'start');
      }
      if (createdBefore) {
        where.createdAt.lte = parseDateBoundary(createdBefore, 'end');
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
