/**
 * Story 9.1: Data Library (数据资源库)
 * Data Asset Service - Business logic for data assets
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  DataAssetRepository,
  DataFolderRepository,
  NodeDataLinkRepository,
} from './data-asset.repository';
import type {
  DataAsset as PrismaDataAsset,
  DataFolder as PrismaDataFolder,
  NodeDataLink as PrismaNodeDataLink,
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
} from '@cdm/types';

@Injectable()
export class DataAssetService {
  private readonly logger = new Logger(DataAssetService.name);

  constructor(
    private readonly assetRepo: DataAssetRepository,
    private readonly folderRepo: DataFolderRepository,
    private readonly linkRepo: NodeDataLinkRepository
  ) {}

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
  // Folder Operations
  // ========================================

  /**
   * Create a new folder
   */
  async createFolder(dto: CreateDataFolderDto): Promise<DataFolder> {
    const folder = await this.folderRepo.create({
      name: dto.name,
      description: dto.description,
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
      graph: { connect: { id: dto.graphId } },
    });

    this.logger.log(`Created folder: ${folder.id} (${folder.name})`);
    return this.toFolderResponse(folder);
  }

  /**
   * Get folder tree for a graph
   */
  async getFolderTree(graphId: string): Promise<DataFolderTreeNode[]> {
    const folders = await this.folderRepo.findByGraphWithAssetCount(graphId);

    // Build tree structure
    const folderMap = new Map<string, DataFolderTreeNode>();
    const rootFolders: DataFolderTreeNode[] = [];

    // First pass: create all folder nodes
    for (const folder of folders) {
      const node: DataFolderTreeNode = {
        ...this.toFolderResponse(folder),
        children: [],
        assetCount: folder._count.assets,
      };
      folderMap.set(folder.id, node);
    }

    // Second pass: build hierarchy
    for (const folder of folders) {
      const node = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        folderMap.get(folder.parentId)!.children!.push(node);
      } else {
        rootFolders.push(node);
      }
    }

    return rootFolders;
  }

  /**
   * Delete a folder
   */
  async deleteFolder(id: string): Promise<void> {
    const existing = await this.folderRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Folder ${id} not found`);
    }

    await this.folderRepo.delete(id);
    this.logger.log(`Deleted folder: ${id}`);
  }

  // ========================================
  // Node-Asset Link Operations
  // ========================================

  /**
   * Link a node to a data asset
   */
  async linkNodeToAsset(dto: CreateNodeDataLinkDto): Promise<NodeDataLink> {
    // Check if link already exists
    const existing = await this.linkRepo.findByNodeAndAsset(dto.nodeId, dto.assetId);
    if (existing) {
      throw new ConflictException('Link already exists');
    }

    const link = await this.linkRepo.create({
      node: { connect: { id: dto.nodeId } },
      asset: { connect: { id: dto.assetId } },
      linkType: dto.linkType || 'reference',
      note: dto.note,
    });

    this.logger.log(`Linked node ${dto.nodeId} to asset ${dto.assetId}`);
    return this.toLinkResponse(link);
  }

  /**
   * Get all assets linked to a node
   */
  async getNodeAssets(nodeId: string): Promise<DataAssetWithFolder[]> {
    const links = await this.linkRepo.findByNode(nodeId);
    return links.map((link) => this.toAssetResponse(link.asset as PrismaDataAsset & { folder: PrismaDataFolder | null }));
  }

  /**
   * Unlink a node from a data asset
   */
  async unlinkNodeFromAsset(nodeId: string, assetId: string): Promise<void> {
    const deleted = await this.linkRepo.deleteByNodeAndAsset(nodeId, assetId);
    if (!deleted) {
      throw new NotFoundException('Link not found');
    }

    this.logger.log(`Unlinked node ${nodeId} from asset ${assetId}`);
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
      folder: asset.folder ? this.toFolderResponse(asset.folder) : null,
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

  private toFolderResponse(folder: PrismaDataFolder): DataFolder {
    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parentId: folder.parentId,
      graphId: folder.graphId,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }

  private toLinkResponse(link: PrismaNodeDataLink): NodeDataLink {
    return {
      id: link.id,
      nodeId: link.nodeId,
      assetId: link.assetId,
      linkType: link.linkType as 'reference' | 'attachment' | 'source',
      note: link.note,
      createdAt: link.createdAt.toISOString(),
    };
  }
}
