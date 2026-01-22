import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { NodeDataLinkService } from '../node-data-link.service';

describe('NodeDataLinkService', () => {
  const linkRepo = {
    findByNodeAndAsset: jest.fn(),
    create: jest.fn(),
    findByNode: jest.fn(),
    findByNodeIds: jest.fn(),
    deleteByNodeAndAsset: jest.fn(),
    getNodeGraphId: jest.fn(),
    getAssetGraphId: jest.fn(),
  };

  let service: NodeDataLinkService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NodeDataLinkService(linkRepo as any);
  });

  it('linkNodeToAsset: throws NotFoundException when node does not exist', async () => {
    linkRepo.getNodeGraphId.mockResolvedValueOnce(null);
    linkRepo.getAssetGraphId.mockResolvedValueOnce('graph-1');

    await expect(
      service.linkNodeToAsset({ nodeId: 'missing-node', assetId: 'asset-1' })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('linkNodeToAsset: throws NotFoundException when asset does not exist', async () => {
    linkRepo.getNodeGraphId.mockResolvedValueOnce('graph-1');
    linkRepo.getAssetGraphId.mockResolvedValueOnce(null);

    await expect(
      service.linkNodeToAsset({ nodeId: 'node-1', assetId: 'missing-asset' })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('linkNodeToAsset: blocks cross-graph linking', async () => {
    linkRepo.getNodeGraphId.mockResolvedValueOnce('graph-1');
    linkRepo.getAssetGraphId.mockResolvedValueOnce('graph-2');

    await expect(
      service.linkNodeToAsset({ nodeId: 'node-1', assetId: 'asset-1' })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('linkNodeToAsset: throws ConflictException when link already exists', async () => {
    linkRepo.getNodeGraphId.mockResolvedValueOnce('graph-1');
    linkRepo.getAssetGraphId.mockResolvedValueOnce('graph-1');
    linkRepo.findByNodeAndAsset.mockResolvedValueOnce({ id: 'link-1' });

    await expect(
      service.linkNodeToAsset({ nodeId: 'node-1', assetId: 'asset-1' })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('linkNodeToAsset: creates link with default linkType=reference', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    linkRepo.getNodeGraphId.mockResolvedValueOnce('graph-1');
    linkRepo.getAssetGraphId.mockResolvedValueOnce('graph-1');
    linkRepo.findByNodeAndAsset.mockResolvedValueOnce(null);
    linkRepo.create.mockResolvedValueOnce({
      id: 'link-1',
      nodeId: 'node-1',
      assetId: 'asset-1',
      linkType: 'reference',
      note: null,
      createdAt: now,
    });

    const result = await service.linkNodeToAsset({ nodeId: 'node-1', assetId: 'asset-1' });

    expect(linkRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        node: { connect: { id: 'node-1' } },
        asset: { connect: { id: 'asset-1' } },
        linkType: 'reference',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'link-1',
        nodeId: 'node-1',
        assetId: 'asset-1',
        linkType: 'reference',
        createdAt: now.toISOString(),
      })
    );
  });

  it('unlinkNodeFromAsset: throws NotFoundException when link does not exist', async () => {
    linkRepo.deleteByNodeAndAsset.mockResolvedValueOnce(null);
    await expect(service.unlinkNodeFromAsset('node-1', 'asset-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  /**
   * Story 10.8 Code Review: Test storagePath URL transformation
   */
  it('getNodeAssets: transforms storagePath to /api/files URL', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const folder = {
      id: 'folder-1',
      name: '结构设计',
      description: null,
      parentId: null,
      graphId: 'graph-1',
      createdAt: now,
      updatedAt: now,
    };
    const prismaAsset = {
      id: 'asset-1',
      name: '卫星总体结构',
      description: null,
      format: 'STEP',
      fileSize: 123,
      storagePath: 'file-abc-123', // DB stores fileId
      thumbnail: null,
      version: 'v1.0.0',
      tags: ['卫星'],
      graphId: 'graph-1',
      folderId: 'folder-1',
      creatorId: null,
      secretLevel: 'internal',
      createdAt: now,
      updatedAt: now,
      folder,
    };

    linkRepo.findByNode.mockResolvedValueOnce([{ asset: prismaAsset }]);

    const result = await service.getNodeAssets('node-1');

    expect(result).toHaveLength(1);
    // Story 10.8 Code Review: API returns URL, not fileId
    expect(result[0].storagePath).toBe('/api/files/file-abc-123');
  });

  /**
   * Story 10.8 Code Review: Test IMAGE thumbnail auto-generation
   */
  it('getNodeAssets: auto-generates thumbnail URL for IMAGE format', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const prismaAsset = {
      id: 'asset-img',
      name: 'satellite.png',
      description: null,
      format: 'IMAGE',
      fileSize: 5000,
      storagePath: 'file-img-123',
      thumbnail: null, // No explicit thumbnail
      version: 'v1.0.0',
      tags: [],
      graphId: 'graph-1',
      folderId: null,
      creatorId: null,
      secretLevel: 'internal',
      createdAt: now,
      updatedAt: now,
      folder: null,
    };

    linkRepo.findByNode.mockResolvedValueOnce([{ asset: prismaAsset }]);

    const result = await service.getNodeAssets('node-1');

    expect(result).toHaveLength(1);
    expect(result[0].storagePath).toBe('/api/files/file-img-123');
    // Story 10.8 Code Review: IMAGE format auto-generates thumbnail
    expect(result[0].thumbnail).toBe('/api/files/file-img-123/thumbnail');
  });

  it('getNodeAssets: returns null storagePath when asset has no file', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const prismaAsset = {
      id: 'asset-no-file',
      name: 'Empty Asset',
      description: null,
      format: 'OTHER',
      fileSize: null,
      storagePath: null, // No file uploaded
      thumbnail: null,
      version: 'v1.0.0',
      tags: [],
      graphId: 'graph-1',
      folderId: null,
      creatorId: null,
      secretLevel: 'internal',
      createdAt: now,
      updatedAt: now,
      folder: null,
    };

    linkRepo.findByNode.mockResolvedValueOnce([{ asset: prismaAsset }]);

    const result = await service.getNodeAssets('node-1');

    expect(result).toHaveLength(1);
    expect(result[0].storagePath).toBeNull();
    expect(result[0].thumbnail).toBeNull();
  });
});

