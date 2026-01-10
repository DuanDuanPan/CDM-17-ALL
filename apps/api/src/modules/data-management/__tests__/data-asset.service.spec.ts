/**
 * Story 9.1: Data Library (数据资源库)
 * Unit tests for DataAssetService
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataAssetService } from '../data-asset.service';

describe('DataAssetService', () => {
  const assetRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdWithFolder: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const folderRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByGraphWithAssetCount: jest.fn(),
    hasAssets: jest.fn(),
    hasChildren: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const linkRepo = {
    findByNodeAndAsset: jest.fn(),
    create: jest.fn(),
    findByNode: jest.fn(),
    findByNodeIds: jest.fn(),
    deleteByNodeAndAsset: jest.fn(),
  };

  let service: DataAssetService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DataAssetService(assetRepo as any, folderRepo as any, linkRepo as any);
  });

  it('findMany: forwards filters to repository (including date range)', async () => {
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
      storagePath: null,
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

    assetRepo.findMany.mockResolvedValueOnce({ assets: [prismaAsset], total: 1 });

    const result = await service.findMany({
      graphId: 'graph-1',
      search: '卫星',
      format: 'STEP',
      createdAfter: '2026-01-01',
      createdBefore: '2026-12-31',
      page: 2,
      pageSize: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(assetRepo.findMany).toHaveBeenCalledWith(
      'graph-1',
      expect.objectContaining({
        search: '卫星',
        format: 'STEP',
        createdAfter: '2026-01-01',
        createdBefore: '2026-12-31',
        page: 2,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    );

    expect(result.total).toBe(1);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.totalPages).toBe(1);
    expect(result.assets[0]).toEqual(
      expect.objectContaining({
        id: 'asset-1',
        name: '卫星总体结构',
        format: 'STEP',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        folder: expect.objectContaining({
          id: 'folder-1',
          name: '结构设计',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }),
      })
    );
  });

  it('getAsset: throws NotFoundException when asset does not exist', async () => {
    assetRepo.findByIdWithFolder.mockResolvedValueOnce(null);
    await expect(service.getAsset('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createAsset: applies defaults for format/version/tags', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const created = {
      id: 'asset-1',
      name: 'Test',
      description: null,
      format: 'OTHER',
      fileSize: null,
      storagePath: null,
      thumbnail: null,
      version: 'v1.0.0',
      tags: [],
      graphId: 'graph-1',
      folderId: null,
      creatorId: null,
      secretLevel: 'internal',
      createdAt: now,
      updatedAt: now,
    };

    assetRepo.create.mockResolvedValueOnce(created);

    const result = await service.createAsset({
      name: 'Test',
      graphId: 'graph-1',
    });

    expect(assetRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test',
        graph: { connect: { id: 'graph-1' } },
        format: 'OTHER',
        version: 'v1.0.0',
        tags: [],
        secretLevel: 'internal',
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'asset-1',
        name: 'Test',
        format: 'OTHER',
        version: 'v1.0.0',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
    );
  });

  it('updateAsset: supports folder disconnect when folderId is null', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const existing = {
      id: 'asset-1',
      name: 'Test',
      description: null,
      format: 'OTHER',
      fileSize: null,
      storagePath: null,
      thumbnail: null,
      version: 'v1.0.0',
      tags: [],
      graphId: 'graph-1',
      folderId: 'folder-1',
      creatorId: null,
      secretLevel: 'internal',
      createdAt: now,
      updatedAt: now,
    };

    const updated = { ...existing, folderId: null };
    const updatedWithFolder = { ...updated, folder: null };

    assetRepo.findById.mockResolvedValueOnce(existing);
    assetRepo.update.mockResolvedValueOnce(updated);
    assetRepo.findByIdWithFolder.mockResolvedValueOnce(updatedWithFolder);

    const result = await service.updateAsset('asset-1', { folderId: null });

    expect(assetRepo.update).toHaveBeenCalledWith(
      'asset-1',
      expect.objectContaining({
        folder: { disconnect: true },
      })
    );
    expect(result.folder).toBeNull();
  });

  it('linkNodeToAsset: throws ConflictException when link exists', async () => {
    linkRepo.findByNodeAndAsset.mockResolvedValueOnce({ id: 'link-1' });

    await expect(
      service.linkNodeToAsset({ nodeId: 'node-1', assetId: 'asset-1' })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('unlinkNodeFromAsset: throws NotFoundException when link does not exist', async () => {
    linkRepo.deleteByNodeAndAsset.mockResolvedValueOnce(null);

    await expect(
      service.unlinkNodeFromAsset('node-1', 'asset-1')
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getNodeAssetsByNodes: returns deduplicated assets', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const assetA = {
      id: 'asset-a',
      name: 'Asset A',
      description: null,
      format: 'OTHER',
      fileSize: null,
      storagePath: null,
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

    linkRepo.findByNodeIds.mockResolvedValueOnce([
      { id: 'l1', nodeId: 'n1', assetId: 'asset-a', asset: assetA },
      { id: 'l2', nodeId: 'n2', assetId: 'asset-a', asset: assetA },
    ]);

    const result = await service.getNodeAssetsByNodes(['n1', 'n2']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('asset-a');
  });

  it('updateFolder: throws BadRequestException when no fields provided', async () => {
    folderRepo.findById.mockResolvedValueOnce({ id: 'folder-1' });

    await expect(service.updateFolder('folder-1', {} as any)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('deleteFolder: blocks deleting non-empty folder (assets)', async () => {
    folderRepo.findById.mockResolvedValueOnce({ id: 'folder-1' });
    folderRepo.hasAssets.mockResolvedValueOnce(true);

    await expect(service.deleteFolder('folder-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteFolder: blocks deleting folder with children', async () => {
    folderRepo.findById.mockResolvedValueOnce({ id: 'folder-1' });
    folderRepo.hasAssets.mockResolvedValueOnce(false);
    folderRepo.hasChildren.mockResolvedValueOnce(true);

    await expect(service.deleteFolder('folder-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
