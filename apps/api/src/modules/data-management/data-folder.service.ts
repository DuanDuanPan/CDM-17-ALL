/**
 * Story 9.1 & 9.2: DataFolder Service
 * Extracted from data-asset.service.ts to meet 300 LOC limit (GR-2)
 * Handles folder operations: create, get tree, update, delete
 */

import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { DataFolderRepository } from './data-folder.repository';
import type { DataFolder as PrismaDataFolder } from '@cdm/database';
import type {
    DataFolder,
    DataFolderTreeNode,
    CreateDataFolderDto,
} from '@cdm/types';
import type { UpdateDataFolderDto } from './dto';

@Injectable()
export class DataFolderService {
    private readonly logger = new Logger(DataFolderService.name);

    constructor(private readonly folderRepo: DataFolderRepository) { }

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
     * Story 9.2: Update/rename a folder
     */
    async updateFolder(id: string, data: UpdateDataFolderDto): Promise<DataFolder> {
        const existing = await this.folderRepo.findById(id);
        if (!existing) {
            throw new NotFoundException(`Folder ${id} not found`);
        }

        if (data.name === undefined && data.description === undefined) {
            throw new BadRequestException('No update fields provided');
        }

        const updated = await this.folderRepo.update(id, data);
        this.logger.log(`Updated folder: ${id}`);
        return this.toFolderResponse(updated);
    }

    /**
     * Delete a folder
     * Story 9.2: Enhanced with non-empty folder validation
     */
    async deleteFolder(id: string): Promise<void> {
        const existing = await this.folderRepo.findById(id);
        if (!existing) {
            throw new NotFoundException(`Folder ${id} not found`);
        }

        // Story 9.2 AC3: Check if folder has assets
        const hasAssets = await this.folderRepo.hasAssets(id);
        if (hasAssets) {
            throw new BadRequestException({
                code: 'FOLDER_NOT_EMPTY',
                message: '无法删除非空文件夹，请先移除文件夹内的资产',
            });
        }

        // Check if folder has child folders
        const hasChildren = await this.folderRepo.hasChildren(id);
        if (hasChildren) {
            throw new BadRequestException({
                code: 'FOLDER_HAS_CHILDREN',
                message: '无法删除包含子文件夹的文件夹，请先删除子文件夹',
            });
        }

        await this.folderRepo.delete(id);
        this.logger.log(`Deleted folder: ${id}`);
    }

    toFolderResponse(folder: PrismaDataFolder): DataFolder {
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
}
