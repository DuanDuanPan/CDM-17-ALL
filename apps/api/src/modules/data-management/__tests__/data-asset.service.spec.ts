/**
 * Story 9.1 & 9.5: Data Library / Upload
 * Unit tests for DataAssetService (Repository + delegated services mocked)
 */

import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

  const folderService = {
    createFolder: jest.fn(),
    getFolderTree: jest.fn(),
    updateFolder: jest.fn(),
    deleteFolder: jest.fn(),
    toFolderResponse: jest.fn(),
  };

  const linkService = {
    linkNodeToAsset: jest.fn(),
    getNodeAssets: jest.fn(),
    getNodeAssetsByNodes: jest.fn(),
    getNodeAssetLinks: jest.fn(),
    unlinkNodeFromAsset: jest.fn(),
  };

  const fileService = {
    storeFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  let service: DataAssetService;

  beforeEach(() => {
    jest.clearAllMocks();

    folderService.toFolderResponse.mockImplementation((folder: any) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parentId: folder.parentId,
      graphId: folder.graphId,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    }));

    service = new DataAssetService(
      assetRepo as any,
      folderService as any,
      linkService as any,
      fileService as any
    );
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

  it('uploadAsset: creates asset with detected format and /api/files storagePath', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    fileService.storeFile.mockResolvedValueOnce({
      id: 'file-1',
      originalName: 'test.vtk',
      mimeType: 'application/octet-stream',
      size: 10,
      uploadedAt: now.toISOString(),
    });

    assetRepo.create.mockResolvedValueOnce({
      id: 'asset-1',
      name: 'test.vtk',
      description: null,
      format: 'OTHER',
      fileSize: 10,
      storagePath: '/api/files/file-1',
      thumbnail: null,
      version: 'v1.0.0',
      tags: [],
      graphId: 'graph-1',
      folderId: null,
      creatorId: null,
      secretLevel: 'internal',
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.uploadAsset(
      {
        originalname: 'test.vtk',
        size: 10,
        buffer: Buffer.from('x'),
      } as any,
      'graph-1'
    );

    expect(fileService.storeFile).toHaveBeenCalled();
    expect(assetRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test.vtk',
        format: 'OTHER',
        fileSize: 10,
        storagePath: '/api/files/file-1',
        graph: { connect: { id: 'graph-1' } },
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'asset-1',
        name: 'test.vtk',
        format: 'OTHER',
        storagePath: '/api/files/file-1',
      })
    );
  });

  it('uploadAsset: rolls back stored file when db create fails', async () => {
    fileService.storeFile.mockResolvedValueOnce({
      id: 'file-rollback',
      originalName: 'fail.pdf',
      mimeType: 'application/pdf',
      size: 10,
      uploadedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    });
    assetRepo.create.mockRejectedValueOnce(new Error('db down'));

    await expect(
      service.uploadAsset(
        { originalname: 'fail.pdf', size: 10, buffer: Buffer.from('x') } as any,
        'graph-1'
      )
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(fileService.deleteFile).toHaveBeenCalledWith('file-rollback');
  });
});

