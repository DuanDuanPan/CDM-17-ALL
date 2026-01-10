/**
 * Story 9.1: Data Library (数据资源库)
 * Data Asset Controller - REST API endpoints
 *
 * Follows NocoBase-inspired :action pattern:
 * - GET    /data-assets            → list
 * - POST   /data-assets            → create
 * - GET    /data-assets:get        → get single (filterByTk=id)
 * - PUT    /data-assets:update     → update (filterByTk=id)
 * - DELETE /data-assets:destroy    → delete (filterByTk=id)
 *
 * NOTE: In Nest/Express routing, ":" is normally interpreted as a path param.
 * We must escape ":" to match the literal NocoBase-style routes.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { DataAssetService } from './data-asset.service';
import { DataManagementAuthGuard } from './guards/data-management-auth.guard';
import {
  CreateDataAssetDto,
  UpdateDataAssetDto,
  CreateDataFolderDto,
  CreateNodeDataLinkDto,
  UpdateDataFolderDto,
  LinksByNodesDto,
} from './dto';
import type {
  DataAssetQueryDto,
  DataAssetListResponse,
  DataAssetResponse,
  DataFolderTreeResponse,
  CreateDataAssetResponse,
  CreateNodeDataLinkResponse,
  DataLibrarySuccessResponse,
  DataAssetFormat,
  DataFolder,
  DataAssetWithFolder,
} from '@cdm/types';

@Controller()
@UseGuards(DataManagementAuthGuard)
export class DataAssetController {
  constructor(private readonly service: DataAssetService) {}

  // ========================================
  // Data Asset Endpoints
  // ========================================

  /**
   * GET /data-assets - List data assets with filtering and pagination
   * AC#3: Supports name/type/date filtering
   */
  @Get('data-assets')
  async list(
    @Query('graphId') graphId: string,
    @Query('search') search?: string,
    @Query('format') format?: DataAssetFormat,
    @Query('folderId') folderId?: string,
    @Query('tags') tags?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: 'name' | 'format' | 'createdAt' | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ): Promise<DataAssetListResponse> {
    const query: DataAssetQueryDto = {
      graphId,
      search,
      format,
      folderId,
      tags: tags ? tags.split(',') : undefined,
      createdAfter,
      createdBefore,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortOrder,
    };

    return this.service.findMany(query);
  }

  /**
   * POST /data-assets - Create a new data asset
   */
  @Post('data-assets')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDataAssetDto): Promise<CreateDataAssetResponse> {
    const asset = await this.service.createAsset(dto);
    return {
      success: true,
      asset,
    };
  }

  /**
   * GET /data-assets:get - Get a single data asset
   */
  @Get('data-assets\\:get')
  async get(@Query('filterByTk') id: string): Promise<DataAssetResponse> {
    const asset = await this.service.getAsset(id);
    return { asset };
  }

  /**
   * PUT /data-assets:update - Update a data asset
   */
  @Put('data-assets\\:update')
  async update(
    @Query('filterByTk') id: string,
    @Body() dto: UpdateDataAssetDto
  ): Promise<DataAssetResponse> {
    const asset = await this.service.updateAsset(id, dto);
    return { asset };
  }

  /**
   * DELETE /data-assets:destroy - Delete a data asset
   */
  @Delete('data-assets\\:destroy')
  @HttpCode(HttpStatus.OK)
  async destroy(@Query('filterByTk') id: string): Promise<DataLibrarySuccessResponse> {
    await this.service.deleteAsset(id);
    return { success: true };
  }

  // ========================================
  // Folder Endpoints
  // ========================================

  /**
   * GET /data-assets/folders - Get folder tree for a graph
   */
  @Get('data-assets/folders')
  async getFolders(@Query('graphId') graphId: string): Promise<DataFolderTreeResponse> {
    const folders = await this.service.getFolderTree(graphId);
    return { folders };
  }

  /**
   * POST /data-assets/folders - Create a new folder
   */
  @Post('data-assets/folders')
  @HttpCode(HttpStatus.CREATED)
  async createFolder(@Body() dto: CreateDataFolderDto): Promise<DataLibrarySuccessResponse & { folder: DataFolder }> {
    const folder = await this.service.createFolder(dto);
    return {
      success: true,
      folder,
    };
  }

  /**
   * Story 9.2: PUT /data-assets/folders:update - Update/rename a folder
   */
  @Put('data-assets/folders\\:update')
  async updateFolder(
    @Query('filterByTk') id: string,
    @Body() dto: UpdateDataFolderDto
  ): Promise<DataLibrarySuccessResponse & { folder: DataFolder }> {
    const folder = await this.service.updateFolder(id, dto);
    return {
      success: true,
      folder,
    };
  }

  /**
   * DELETE /data-assets/folders:destroy - Delete a folder
   * Story 9.2: Enhanced with non-empty folder validation
   */
  @Delete('data-assets/folders\\:destroy')
  @HttpCode(HttpStatus.OK)
  async destroyFolder(@Query('filterByTk') id: string): Promise<DataLibrarySuccessResponse> {
    await this.service.deleteFolder(id);
    return { success: true };
  }

  // ========================================
  // Node-Asset Link Endpoints
  // ========================================

  /**
   * GET /data-assets/links - Get assets linked to a node
   */
  @Get('data-assets/links')
  async getLinks(@Query('nodeId') nodeId: string): Promise<{ assets: DataAssetWithFolder[] }> {
    const assets = await this.service.getNodeAssets(nodeId);
    return { assets };
  }

  /**
   * Story 9.2: POST /data-assets/links:byNodes - Get assets linked to multiple nodes (batch)
   * Used for PBS "include sub-nodes" and Task batch asset queries
   */
  @Post('data-assets/links\\:byNodes')
  @HttpCode(HttpStatus.OK)
  async getLinksByNodes(@Body() dto: LinksByNodesDto): Promise<{ assets: DataAssetWithFolder[] }> {
    const assets = await this.service.getNodeAssetsByNodes(dto.nodeIds);
    return { assets };
  }

  /**
   * POST /data-assets/links - Link a node to an asset
   */
  @Post('data-assets/links')
  @HttpCode(HttpStatus.CREATED)
  async createLink(@Body() dto: CreateNodeDataLinkDto): Promise<CreateNodeDataLinkResponse> {
    const link = await this.service.linkNodeToAsset(dto);
    return {
      success: true,
      link,
    };
  }

  /**
   * DELETE /data-assets/links:destroy - Unlink a node from an asset
   */
  @Delete('data-assets/links\\:destroy')
  @HttpCode(HttpStatus.OK)
  async destroyLink(
    @Query('nodeId') nodeId: string,
    @Query('assetId') assetId: string
  ): Promise<DataLibrarySuccessResponse> {
    await this.service.unlinkNodeFromAsset(nodeId, assetId);
    return { success: true };
  }
}
