/**
 * Story 9.1: Data Library (数据资源库)
 * Story 9.5: Data Upload & Node Linking
 * Story 10.5: Migrated to FileStorageService
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
import { FileOwnerType } from '../file-storage/constants';
import { DataAssetRepository } from './data-asset.repository';
import { DataFolderService } from './data-folder.service';
import { NodeDataLinkService } from './node-data-link.service';
import { FileStorageService } from '../file-storage/file-storage.service';
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

/**
 * Story 10.5: FileRecord owner type for data assets
 * Uses shared constant for type safety
 */
const DATA_ASSET_OWNER_TYPE = FileOwnerType.DATA_ASSET;

@Injectable()
export class DataAssetService {
  private readonly logger = new Logger(DataAssetService.name);

  constructor(
    private readonly assetRepo: DataAssetRepository,
    private readonly folderService: DataFolderService,
    private readonly linkService: NodeDataLinkService,
    private readonly fileStorageService: FileStorageService
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
   * Story 10.5: Migrated to FileStorageService
   * AC#1: Upload file, create DataAsset with graphId, fileSize, storagePath
   * AC#2: Auto-detect format from file extension
   * 
   * Storage contract (Story 10.5):
   * - DB stores FileRecord.id (fileId) in DataAsset.storagePath
   * - API returns `/api/files/{fileId}` for frontend backward compatibility
   */
  async uploadAsset(
    file: Express.Multer.File,
    graphId: string,
    folderId?: string
  ): Promise<DataAsset> {
    // Create asset record first to get ID for ownerId
    // storagePath is temporarily null, will be updated after file upload
    const format = getDataAssetFormatFromFilename(file.originalname);

    const asset = await this.assetRepo.create({
      name: file.originalname, // Will be overwritten after upload with decoded name
      format,
      fileSize: file.size,
      storagePath: '', // Placeholder, will update after upload
      version: 'v1.0.0',
      tags: [],
      graph: { connect: { id: graphId } },
      folder: folderId ? { connect: { id: folderId } } : undefined,
      secretLevel: 'internal',
    });

    let uploadedFileId: string | null = null;
    try {
      // Upload file via FileStorageService
      const uploaded = await this.fileStorageService.upload(file, graphId, {
        ownerType: DATA_ASSET_OWNER_TYPE,
        ownerId: asset.id,
      });
      uploadedFileId = uploaded.id;

      // Update asset with correct storagePath (fileId) and decoded name
      const updatedAsset = await this.assetRepo.update(asset.id, {
        storagePath: uploaded.id, // Store fileId, not URL
        name: uploaded.originalName, // Use decoded UTF-8 filename
      });

      this.logger.log(
        `Uploaded data asset: ${asset.id} (${uploaded.originalName}), format: ${format}, size: ${file.size}`
      );

      // Return with storagePath mapped to accessible URL for frontend
      return this.toSimpleAssetResponse(updatedAsset);
    } catch (error) {
      // Rollback: delete asset record; if file was already uploaded, delete it too (best-effort)
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to upload file, rolling back asset: ${asset.id}. Cause: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (uploadedFileId) {
        try {
          await this.fileStorageService.delete(uploadedFileId);
        } catch (cleanupError) {
          // Don't mask original failure; log and continue rollback.
          if (!(cleanupError instanceof NotFoundException)) {
            this.logger.warn(`Rollback: failed to delete uploaded file ${uploadedFileId}: ${String(cleanupError)}`);
          }
        }
      }

      await this.assetRepo.hardDelete(asset.id);
      throw new InternalServerErrorException(`Failed to upload data asset: ${errorMessage}`);
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
   * Story 10.5: Uses FileStorageService.delete()
   */
  async hardDeleteAsset(id: string): Promise<void> {
    const existing = await this.assetRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Data asset ${id} not found`);
    }

    // Unlink from all nodes first, then delete file, then delete record.
    await this.linkService.deleteLinksByAsset(id);

    // Story 10.5: storagePath now stores fileId directly
    const fileId = existing.storagePath;
    if (fileId) {
      try {
        await this.fileStorageService.delete(fileId);
      } catch (error) {
        // Log but don't fail if file already deleted or not found
        if (!(error instanceof NotFoundException)) {
          this.logger.warn(`Failed to delete file ${fileId}: ${String(error)}`);
        }
      }
    }

    await this.assetRepo.hardDelete(id);
    this.logger.log(`Hard deleted data asset: ${id}`);
  }

  /**
   * Empty trash for a graph (permanent delete all soft-deleted assets)
   * Story 10.5: Uses FileStorageService.delete()
   */
  async emptyTrash(graphId: string): Promise<{ deletedCount: number }> {
    const deleted = await this.assetRepo.findDeleted(graphId);

    // Best-effort physical file cleanup
    for (const asset of deleted) {
      // Story 10.5: storagePath now stores fileId directly
      const fileId = asset.storagePath;
      if (fileId) {
        try {
          await this.fileStorageService.delete(fileId);
        } catch (error) {
          if (!(error instanceof NotFoundException)) {
            this.logger.warn(`Failed to delete file ${fileId}: ${String(error)}`);
          }
        }
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
    // Story 10.6: For IMAGE format with storagePath, use FileStorageService thumbnail endpoint
    let thumbnail = asset.thumbnail;
    if (asset.format === 'IMAGE' && asset.storagePath && !thumbnail) {
      thumbnail = `/api/files/${asset.storagePath}/thumbnail`;
    }

    return {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      format: asset.format,
      fileSize: asset.fileSize,
      // Story 10.5: Map storagePath (fileId) to accessible URL for frontend
      storagePath: asset.storagePath ? `/api/files/${asset.storagePath}` : null,
      thumbnail,
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
    // Story 10.6: For IMAGE format with storagePath, use FileStorageService thumbnail endpoint
    let thumbnail = asset.thumbnail;
    if (asset.format === 'IMAGE' && asset.storagePath && !thumbnail) {
      thumbnail = `/api/files/${asset.storagePath}/thumbnail`;
    }

    return {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      format: asset.format,
      fileSize: asset.fileSize,
      // Story 10.5: Map storagePath (fileId) to accessible URL for frontend
      storagePath: asset.storagePath ? `/api/files/${asset.storagePath}` : null,
      thumbnail,
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
}
