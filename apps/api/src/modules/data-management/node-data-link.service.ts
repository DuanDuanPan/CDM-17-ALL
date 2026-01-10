/**
 * Story 9.1 & 9.2: NodeDataLink Service
 * Extracted from data-asset.service.ts to meet 300 LOC limit (GR-2)
 * Handles node-asset link operations: create, query, delete
 */

import {
    Injectable,
    Logger,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { NodeDataLinkRepository } from './node-data-link.repository';
import type {
    DataAsset as PrismaDataAsset,
    DataFolder as PrismaDataFolder,
    NodeDataLink as PrismaNodeDataLink,
} from '@cdm/database';
import type {
    DataAssetWithFolder,
    DataFolder,
    CreateNodeDataLinkDto,
    NodeDataLink,
} from '@cdm/types';

@Injectable()
export class NodeDataLinkService {
    private readonly logger = new Logger(NodeDataLinkService.name);

    constructor(private readonly linkRepo: NodeDataLinkRepository) { }

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
        return links.map((link) => this.toAssetResponse(link.asset));
    }

    /**
     * Story 9.2: Get all assets linked to multiple nodes (batch query)
     * Used for PBS "include sub-nodes" and Task batch asset queries
     * Returns deduplicated assets
     */
    async getNodeAssetsByNodes(nodeIds: string[]): Promise<DataAssetWithFolder[]> {
        if (nodeIds.length === 0) return [];

        const links = await this.linkRepo.findByNodeIds(nodeIds);

        // Deduplicate by asset ID
        const assetMap = new Map<string, DataAssetWithFolder>();
        for (const link of links) {
            if (!assetMap.has(link.asset.id)) {
                assetMap.set(link.asset.id, this.toAssetResponse(link.asset));
            }
        }

        return Array.from(assetMap.values());
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
