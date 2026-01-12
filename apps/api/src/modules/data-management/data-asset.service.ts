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
import type { UpdateDataFolderDto } from './dto';

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
    // Store file using FileService
    const storedFile = await this.fileService.storeFile(file);

    // Auto-detect format from filename (AC#2)
    const format = getDataAssetFormatFromFilename(file.originalname);

    // Build storagePath as accessible URL
    const storagePath = `/api/files/${storedFile.id}`;

    try {
      // Create DataAsset record
      const asset = await this.assetRepo.create({
        name: file.originalname,
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
    const existing = await this.assetRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Data asset ${id} not found`);
    }

    await this.assetRepo.delete(id);
    this.logger.log(`Deleted data asset: ${id}`);
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
}
