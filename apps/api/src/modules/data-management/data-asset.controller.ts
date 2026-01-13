/**
 * Story 9.1: Data Library (数据资源库)
 * Story 9.5: Data Upload & Node Linking
 * Data Asset Controller - REST API endpoints
 *
 * Follows NocoBase-inspired :action pattern:
 * - GET    /data-assets            → list
 * - POST   /data-assets            → create
 * - POST   /data-assets:upload     → upload file (multipart/form-data)
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
  Patch,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataAssetService } from './data-asset.service';
import { DataManagementAuthGuard } from './guards/data-management-auth.guard';
import {
  CreateDataAssetDto,
  UpdateDataAssetDto,
  CreateDataFolderDto,
  CreateNodeDataLinkDto,
  UpdateDataFolderDto,
	  LinksByNodesDto,
	  DestroyLinksByNodesDto,
	  UploadAssetDto,
	  SoftDeleteBatchDto,
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
  NodeDataLinkWithAsset,
} from '@cdm/types';

// Reuse the same default limit as FileController (10MB) to avoid OOM on memory storage uploads.
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILE_SIZE = (() => {
  const raw = process.env.DATA_ASSET_MAX_FILE_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILE_SIZE;
})();

@Controller()
@UseGuards(DataManagementAuthGuard)
export class DataAssetController {
  constructor(private readonly service: DataAssetService) { }

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
   * Story 9.5: POST /data-assets:upload - Upload a file and create data asset
   * AC#1: Upload file to server, create DataAsset with auto-detected format
   * AC#2: Auto-detect format from file extension (case-insensitive)
   */
  @Post('data-assets\\:upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
    })
  )
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
        fileIsRequired: true,
      })
    )
    file: Express.Multer.File,
    @Body() dto: UploadAssetDto
  ): Promise<CreateDataAssetResponse> {
    if (!dto.graphId) {
      throw new BadRequestException('graphId is required');
    }

    const asset = await this.service.uploadAsset(file, dto.graphId, dto.folderId);
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

  /**
   * PATCH /data-assets:soft-delete - Soft delete (move to trash)
   */
  @Patch('data-assets\\:soft-delete')
  @HttpCode(HttpStatus.OK)
  async softDelete(@Query('filterByTk') id: string): Promise<DataLibrarySuccessResponse> {
    await this.service.softDeleteAsset(id);
    return { success: true };
  }

  /**
   * PATCH /data-assets:soft-delete-batch - Batch soft delete (move to trash)
   */
  @Patch('data-assets\\:soft-delete-batch')
  @HttpCode(HttpStatus.OK)
  async softDeleteBatch(@Body() dto: SoftDeleteBatchDto): Promise<DataLibrarySuccessResponse & { deletedCount: number }> {
    const { deletedCount } = await this.service.softDeleteAssets(dto.ids);
    return { success: true, deletedCount };
  }

  /**
   * PATCH /data-assets:restore - Restore a soft-deleted asset
   */
  @Patch('data-assets\\:restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Query('filterByTk') id: string): Promise<DataLibrarySuccessResponse & { asset: DataAssetWithFolder }> {
    const asset = await this.service.restoreAsset(id);
    return { success: true, asset };
  }

  /**
   * GET /data-assets/trash - List soft-deleted assets (trash)
   */
  @Get('data-assets/trash')
  async getTrash(
    @Query('graphId') graphId: string
  ): Promise<{ assets: Array<DataAssetWithFolder & { linkedNodeCount: number }> }> {
    return this.service.getTrash(graphId);
  }

  /**
   * DELETE /data-assets:hard-delete - Hard delete a data asset (permanent)
   */
  @Delete('data-assets\\:hard-delete')
  @HttpCode(HttpStatus.OK)
  async hardDelete(@Query('filterByTk') id: string): Promise<DataLibrarySuccessResponse> {
    await this.service.hardDeleteAsset(id);
    return { success: true };
  }

  /**
   * DELETE /data-assets/trash:empty - Empty trash (permanent delete)
   */
  @Delete('data-assets/trash\\:empty')
  @HttpCode(HttpStatus.OK)
  async emptyTrash(@Query('graphId') graphId: string): Promise<DataLibrarySuccessResponse & { deletedCount: number }> {
    const { deletedCount } = await this.service.emptyTrash(graphId);
    return { success: true, deletedCount };
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
   * Returns only assets (for PBS/Task views)
   */
  @Get('data-assets/links')
  async getLinks(@Query('nodeId') nodeId: string): Promise<{ assets: DataAssetWithFolder[] }> {
    const assets = await this.service.getNodeAssets(nodeId);
    return { assets };
  }

  /**
   * Story 9.5: GET /data-assets/links:detail - Get links with asset details
   * AC#4: Returns links (including asset + linkType) for node property panel
   * Does NOT break existing GET /data-assets/links response structure
   */
  @Get('data-assets/links\\:detail')
  async getLinksDetail(@Query('nodeId') nodeId: string): Promise<{ links: NodeDataLinkWithAsset[] }> {
    const links = await this.service.getNodeAssetLinks(nodeId);
    return { links };
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

  /**
   * Story 9.8 Task 4.0: POST /data-assets/links:detailByNodes - Get link details for multiple nodes
   * Returns nodeId + asset + linkType for each link, used for:
   * - Multi-node asset union display
   * - Asset provenance tracking (which nodes link to this asset)
   */
  @Post('data-assets/links\\:detailByNodes')
  @HttpCode(HttpStatus.OK)
  async getLinksDetailByNodes(@Body() dto: LinksByNodesDto): Promise<{ links: NodeDataLinkWithAsset[] }> {
    const links = await this.service.getNodeAssetLinksByNodes(dto.nodeIds);
    return { links };
  }

  /**
   * Story 9.8 Task 7.0: POST /data-assets/links:destroyByNodes - Batch unlink nodes and assets
   * Only removes NodeDataLink records, does NOT delete the DataAsset entity
   * Returns the list of unlinked items for undo capability
   */
  @Post('data-assets/links\\:destroyByNodes')
  @HttpCode(HttpStatus.OK)
	  async destroyLinksByNodes(
	    @Body() dto: DestroyLinksByNodesDto
	  ): Promise<{ success: boolean; unlinked: Array<{ nodeId: string; assetId: string; linkType: string }> }> {
	    const unlinked = await this.service.unlinkNodesByAssets(dto.nodeIds, dto.assetIds);
	    return { success: true, unlinked };
	  }
}
