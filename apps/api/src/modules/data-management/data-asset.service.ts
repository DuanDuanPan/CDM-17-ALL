/**
 * Story 9.1: Data Library (数据资源库)
 * Story 9.5: Data Upload & Node Linking
 * Data Asset Service - Business logic for data assets
 *
 * GR-2 Compliance: Folder and Link services extracted to separate files
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataAssetRepository } from './data-asset.repository';
import { DataFolderService } from './data-folder.service';
import { NodeDataLinkService } from './node-data-link.service';
import { FileService } from '../file/file.service';
import { getDataAssetFormatFromFilename } from './utils/format-detection';
import type {
  DataAsset as PrismaDataAsset,
  DataFolder as PrismaDataFolder,
} from '@cdm/database';
import type {
  CreateDataAssetDto,
  UpdateDataAssetDto,
  DataAssetQueryDto,
  DataAssetListResponse,
  DataAssetWithFolder,
  DataFolder,
  DataFolderTreeNode,
  CreateDataFolderDto,
  CreateNodeDataLinkDto,
  NodeDataLink,
  DataAsset,
  NodeDataLinkWithAsset,
} from '@cdm/types';
import type { CreateNodeDataLinksBatchDto, UpdateDataFolderDto } from './dto';

@Injectable()
export class DataAssetService {
  private readonly logger = new Logger(DataAssetService.name);

  constructor(
    private readonly assetRepo: DataAssetRepository,
    private readonly folderService: DataFolderService,
    private readonly linkService: NodeDataLinkService,
    private readonly fileService: FileService
  ) { }

  // ========================================
  // Data Asset Operations
  // ========================================

  /**
   * Create a new data asset
   */
  async createAsset(dto: CreateDataAssetDto): Promise<DataAsset> {
    const asset = await this.assetRepo.create({
      name: dto.name,
      description: dto.description,
      format: dto.format || 'OTHER',
      fileSize: dto.fileSize,
      storagePath: dto.storagePath,
      thumbnail: dto.thumbnail,
      version: dto.version || 'v1.0.0',
      tags: dto.tags || [],
      graph: { connect: { id: dto.graphId } },
      folder: dto.folderId ? { connect: { id: dto.folderId } } : undefined,
      secretLevel: dto.secretLevel || 'internal',
    });

    this.logger.log(`Created data asset: ${asset.id} (${asset.name})`);
    return this.toSimpleAssetResponse(asset);
  }

  /**
   * Story 9.5: Upload a file and create data asset
   * AC#1: Upload file, create DataAsset with graphId, fileSize, storagePath
   * AC#2: Auto-detect format from file extension
   * GR-1.1.6: Rollback on DB failure - delete uploaded file
   */
  async uploadAsset(
    file: Express.Multer.File,
    graphId: string,
    folderId?: string
  ): Promise<DataAsset> {
    // Store file using FileService (handles UTF-8 filename decoding)
    const storedFile = await this.fileService.storeFile(file);

    // Use decoded filename from storedFile for format detection and asset name
    const decodedFileName = storedFile.originalName;

    // Auto-detect format from filename (AC#2)
    const format = getDataAssetFormatFromFilename(decodedFileName);

    // Build storagePath as accessible URL
    const storagePath = `/api/files/${storedFile.id}`;

    try {
      // Create DataAsset record with properly decoded filename
      const asset = await this.assetRepo.create({
        name: decodedFileName,
        format,
        fileSize: file.size,
        storagePath,
        version: 'v1.0.0',
        tags: [],
        graph: { connect: { id: graphId } },
        folder: folderId ? { connect: { id: folderId } } : undefined,
        secretLevel: 'internal',
      });

      this.logger.log(
        `Uploaded data asset: ${asset.id} (${asset.name}), format: ${format}, size: ${file.size}`
      );
      return this.toSimpleAssetResponse(asset);
    } catch (error) {
      // Rollback: delete uploaded file if DB creation fails (GR-1.1.6)
      this.logger.error(`Failed to create asset record, rolling back file: ${storedFile.id}`);
      await this.fileService.deleteFile(storedFile.id);
      throw new InternalServerErrorException('Failed to create data asset');
    }
  }

  /**
   * Get a data asset by ID
   */
  async getAsset(id: string): Promise<DataAssetWithFolder> {
    const asset = await this.assetRepo.findByIdWithFolder(id);
    if (!asset) {
      throw new NotFoundException(`Data asset ${id} not found`);
    }

    return this.toAssetResponse(asset);
  }

  /**
   * List data assets with filtering and pagination
   * AC#3: Supports name/type/date filtering
   */
  async findMany(query: DataAssetQueryDto): Promise<DataAssetListResponse> {
    const { graphId, page = 1, pageSize = 50, ...filters } = query;

    const { assets, total } = await this.assetRepo.findMany(graphId, {
      ...filters,
      page,
      pageSize,
    });

    return {
      assets: assets.map((a) => this.toAssetResponse(a)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update a data asset
   */
  async updateAsset(id: string, dto: UpdateDataAssetDto): Promise<DataAssetWithFolder> {
    const existing = await this.assetRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Data asset ${id} not found`);
    }

    // Build folder connection based on dto
    let folderUpdate: { connect?: { id: string }; disconnect?: boolean } | undefined = undefined;
    if (dto.folderId !== undefined) {
      if (dto.folderId === null || dto.folderId === '') {
        folderUpdate = { disconnect: true };
      } else {
        folderUpdate = { connect: { id: dto.folderId } };
      }
    }

    const updated = await this.assetRepo.update(id, {
      name: dto.name,
      description: dto.description,
      format: dto.format,
      tags: dto.tags,
      folder: folderUpdate,
      secretLevel: dto.secretLevel,
    });

    const withFolder = await this.assetRepo.findByIdWithFolder(updated.id);
    this.logger.log(`Updated data asset: ${id}`);
    return this.toAssetResponse(withFolder!);
  }

  /**
   * Delete a data asset
   */
  async deleteAsset(id: string): Promise<void> {
    await this.softDeleteAsset(id);
  }

  /**
   * Soft delete a data asset (move to trash)
   */
  async softDeleteAsset(id: string): Promise<void> {
    const existing = await this.assetRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Data asset ${id} not found`);
    }

    await this.assetRepo.softDelete(id);
    this.logger.log(`Soft deleted data asset: ${id}`);
  }

  /**
   * Soft delete multiple data assets (move to trash)
   */
  async softDeleteAssets(ids: string[]): Promise<{ deletedCount: number }> {
    const deletedCount = await this.assetRepo.softDeleteBatch(ids);
    this.logger.log(`Soft deleted ${deletedCount} data asset(s)`);
    return { deletedCount };
  }

  /**
   * Restore a soft-deleted data asset
   */
  async restoreAsset(id: string): Promise<DataAssetWithFolder> {
    const existing = await this.assetRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Data asset ${id} not found`);
    }

    await this.assetRepo.restore(id);
    const restored = await this.assetRepo.findByIdWithFolder(id);
    this.logger.log(`Restored data asset: ${id}`);
    return this.toAssetResponse(restored!);
  }

  /**
   * Get trash assets for a graph
   */
  async getTrash(graphId: string): Promise<{ assets: Array<DataAssetWithFolder & { linkedNodeCount: number }> }> {
    const deleted = await this.assetRepo.findDeleted(graphId);
    return {
      assets: deleted.map((asset) => ({
        ...this.toAssetResponse(asset),
        linkedNodeCount: asset._count.nodeLinks,
      })),
    };
  }

  /**
   * Hard delete a data asset (permanent) - removes links and physical file
   */
  async hardDeleteAsset(id: string): Promise<void> {
    const existing = await this.assetRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Data asset ${id} not found`);
    }

    // Unlink from all nodes first (explicitly), then delete file, then delete record.
    await this.linkService.deleteLinksByAsset(id);

    const fileId = this.extractFileIdFromStoragePath(existing.storagePath);
    if (fileId) {
      await this.fileService.deleteFile(fileId);
    }

    await this.assetRepo.hardDelete(id);
    this.logger.log(`Hard deleted data asset: ${id}`);
  }

  /**
   * Empty trash for a graph (permanent delete all soft-deleted assets)
   */
  async emptyTrash(graphId: string): Promise<{ deletedCount: number }> {
    const deleted = await this.assetRepo.findDeleted(graphId);

    // Best-effort physical file cleanup
    for (const asset of deleted) {
      const fileId = this.extractFileIdFromStoragePath(asset.storagePath);
      if (fileId) {
        await this.fileService.deleteFile(fileId);
      }
    }

    const deletedCount = await this.assetRepo.emptyTrash(graphId);
    this.logger.log(`Emptied trash: ${graphId}, deleted ${deletedCount} data asset(s)`);
    return { deletedCount };
  }

  // ========================================
  // Folder Operations (delegated)
  // ========================================

  async createFolder(dto: CreateDataFolderDto): Promise<DataFolder> {
    return this.folderService.createFolder(dto);
  }

  async getFolderTree(graphId: string): Promise<DataFolderTreeNode[]> {
    return this.folderService.getFolderTree(graphId);
  }

  async updateFolder(id: string, data: UpdateDataFolderDto): Promise<DataFolder> {
    return this.folderService.updateFolder(id, data);
  }

  async deleteFolder(id: string): Promise<void> {
    return this.folderService.deleteFolder(id);
  }

  // ========================================
  // Node-Asset Link Operations (delegated)
  // ========================================

  async linkNodeToAsset(dto: CreateNodeDataLinkDto): Promise<NodeDataLink> {
    return this.linkService.linkNodeToAsset(dto);
  }

  async linkNodeToAssetsBatch(dto: CreateNodeDataLinksBatchDto): Promise<{ created: number; skipped: number }> {
    return this.linkService.linkNodeToAssetsBatch(dto);
  }

  async getNodeAssets(nodeId: string): Promise<DataAssetWithFolder[]> {
    return this.linkService.getNodeAssets(nodeId);
  }

  async getNodeAssetsByNodes(nodeIds: string[]): Promise<DataAssetWithFolder[]> {
    return this.linkService.getNodeAssetsByNodes(nodeIds);
  }

  /**
   * Story 9.5: Get links with asset details for node property panel
   * AC#4: Delegates to NodeDataLinkService
   */
  async getNodeAssetLinks(nodeId: string): Promise<NodeDataLinkWithAsset[]> {
    return this.linkService.getNodeAssetLinks(nodeId);
  }

  async unlinkNodeFromAsset(nodeId: string, assetId: string): Promise<void> {
    return this.linkService.unlinkNodeFromAsset(nodeId, assetId);
  }

  /**
   * Story 9.8 Task 4.0: Get links with details for multiple nodes (batch)
   * Returns nodeId + asset + linkType for each link
   */
  async getNodeAssetLinksByNodes(nodeIds: string[]): Promise<NodeDataLinkWithAsset[]> {
    return this.linkService.getNodeAssetLinksByNodes(nodeIds);
  }

  /**
   * Story 9.8 Task 7.0: Batch unlink nodes from assets
   * Only removes NodeDataLink records, does NOT delete assets
   * Returns unlinked items for undo capability
   */
  async unlinkNodesByAssets(
    nodeIds: string[],
    assetIds: string[]
  ): Promise<Array<{ nodeId: string; assetId: string; linkType: string }>> {
    return this.linkService.unlinkNodesByAssets(nodeIds, assetIds);
  }

  // ========================================
  // Helper Methods
  // ========================================

  private toAssetResponse(asset: PrismaDataAsset & { folder?: PrismaDataFolder | null }): DataAssetWithFolder {
    return {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      format: asset.format,
      fileSize: asset.fileSize,
      storagePath: asset.storagePath,
      thumbnail: asset.thumbnail,
      version: asset.version,
      tags: asset.tags,
      graphId: asset.graphId,
      folderId: asset.folderId,
      creatorId: asset.creatorId,
      secretLevel: asset.secretLevel as 'public' | 'internal' | 'confidential' | 'secret',
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
      folder: asset.folder ? this.folderService.toFolderResponse(asset.folder) : null,
    };
  }

  private toSimpleAssetResponse(asset: PrismaDataAsset): DataAsset {
    return {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      format: asset.format,
      fileSize: asset.fileSize,
      storagePath: asset.storagePath,
      thumbnail: asset.thumbnail,
      version: asset.version,
      tags: asset.tags,
      graphId: asset.graphId,
      folderId: asset.folderId,
      creatorId: asset.creatorId,
      secretLevel: asset.secretLevel as 'public' | 'internal' | 'confidential' | 'secret',
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  private extractFileIdFromStoragePath(storagePath?: string | null): string | null {
    if (!storagePath) return null;

    try {
      const url = new URL(storagePath, 'http://localhost');
      const match = url.pathname.match(/\/api\/files\/([^/]+)$/);
      if (match) return match[1] ?? null;
    } catch {
      // Ignore URL parsing errors; fallback to regex below.
    }

    const match = storagePath.match(/\/api\/files\/([^/?#]+)/);
    return match ? (match[1] ?? null) : null;
  }
}
