/**
 * Story 9.1 & 9.5: Data Library / Upload
 * Story 10.5: Migrated to FileStorageService
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
    softDelete: jest.fn(),
    softDeleteBatch: jest.fn(),
    restore: jest.fn(),
    findDeleted: jest.fn(),
    hardDelete: jest.fn(),
    emptyTrash: jest.fn(),
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
    deleteLinksByAsset: jest.fn(),
  };

  // Story 10.5: FileStorageService mock (replaces FileService)
  const fileStorageService = {
    upload: jest.fn(),
    delete: jest.fn(),
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
      fileStorageService as any
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
      storagePath: 'file-1', // Story 10.5: DB stores fileId
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
    // Story 10.5: API returns URL, not fileId
    expect(result.assets[0]).toEqual(
      expect.objectContaining({
        id: 'asset-1',
        name: '卫星总体结构',
        format: 'STEP',
        storagePath: '/api/files/file-1', // API returns URL
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

  /**
   * Story 10.5: Updated upload test for FileStorageService
   * - Service now uses FileStorageService.upload() with graphId
   * - DB stores fileId in storagePath, not URL
   * - API returns /api/files/{fileId} for frontend compatibility
   */
  it('uploadAsset: creates asset with detected format and fileId storagePath', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    // Step 1: Create asset first (storagePath placeholder)
    const createdAsset = {
      id: 'asset-1',
      name: 'test.vtk',
      description: null,
      format: 'VTK',
      fileSize: 10,
      storagePath: '', // Placeholder before upload
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
    assetRepo.create.mockResolvedValueOnce(createdAsset);

    // Step 2: FileStorageService.upload returns file metadata
    fileStorageService.upload.mockResolvedValueOnce({
      id: 'file-1',
      originalName: 'test.vtk',
      mimeType: 'application/octet-stream',
      size: 10,
    });

    // Step 3: Update asset with fileId
    const updatedAsset = {
      ...createdAsset,
      storagePath: 'file-1', // DB stores fileId
      name: 'test.vtk',
    };
    assetRepo.update.mockResolvedValueOnce(updatedAsset);

    const result = await service.uploadAsset(
      {
        originalname: 'test.vtk',
        size: 10,
        buffer: Buffer.from('x'),
        mimetype: 'application/octet-stream',
      } as any,
      'graph-1'
    );

    // Verify FileStorageService.upload was called with graphId
    expect(fileStorageService.upload).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'test.vtk' }),
      'graph-1',
      expect.objectContaining({
        ownerType: 'DATA_ASSET',
        ownerId: 'asset-1',
      })
    );

    // Verify asset update with fileId
    expect(assetRepo.update).toHaveBeenCalledWith(
      'asset-1',
      expect.objectContaining({
        storagePath: 'file-1',
      })
    );

    // Story 10.5: API returns URL for frontend
    expect(result).toEqual(
      expect.objectContaining({
        id: 'asset-1',
        name: 'test.vtk',
        format: 'VTK',
        storagePath: '/api/files/file-1', // API returns URL
      })
    );
  });

  /**
   * Story 10.5: Updated rollback test for FileStorageService
   */
  it('uploadAsset: rolls back asset record when file upload fails', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    // Create asset succeeds
    const createdAsset = {
      id: 'asset-rollback',
      name: 'fail.pdf',
      description: null,
      format: 'PDF',
      fileSize: 10,
      storagePath: '',
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
    assetRepo.create.mockResolvedValueOnce(createdAsset);

    // File upload fails
    fileStorageService.upload.mockRejectedValueOnce(new Error('storage down'));
    assetRepo.hardDelete.mockResolvedValueOnce(undefined);

    await expect(
      service.uploadAsset(
        { originalname: 'fail.pdf', size: 10, buffer: Buffer.from('x'), mimetype: 'application/pdf' } as any,
        'graph-1'
      )
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    // Story 10.5: Rollback deletes asset record (not file, since upload failed)
    expect(assetRepo.hardDelete).toHaveBeenCalledWith('asset-rollback');
  });

  it('uploadAsset: rolls back uploaded file when asset update fails after upload', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    const createdAsset = {
      id: 'asset-update-fails',
      name: 'test.vtk',
      description: null,
      format: 'VTK',
      fileSize: 10,
      storagePath: '',
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
    assetRepo.create.mockResolvedValueOnce(createdAsset);

    fileStorageService.upload.mockResolvedValueOnce({
      id: 'file-orphan',
      originalName: 'test.vtk',
      mimeType: 'application/octet-stream',
      size: 10,
    });

    assetRepo.update.mockRejectedValueOnce(new Error('db down'));
    fileStorageService.delete.mockResolvedValueOnce(undefined);
    assetRepo.hardDelete.mockResolvedValueOnce(undefined);

    await expect(
      service.uploadAsset(
        { originalname: 'test.vtk', size: 10, buffer: Buffer.from('x'), mimetype: 'application/octet-stream' } as any,
        'graph-1',
      )
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(fileStorageService.delete).toHaveBeenCalledWith('file-orphan');
    expect(assetRepo.hardDelete).toHaveBeenCalledWith('asset-update-fails');
  });

  it('softDeleteAsset: sets isDeleted and deletedAt via repository', async () => {
    assetRepo.findById.mockResolvedValueOnce({ id: 'asset-1' });
    assetRepo.softDelete.mockResolvedValueOnce({ id: 'asset-1' });

    await service.softDeleteAsset('asset-1');

    expect(assetRepo.softDelete).toHaveBeenCalledWith('asset-1');
  });

  it('restoreAsset: clears deleted fields and returns asset with folder', async () => {
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

    assetRepo.findById.mockResolvedValueOnce({ id: 'asset-1' });
    assetRepo.restore.mockResolvedValueOnce({ id: 'asset-1' });
    assetRepo.findByIdWithFolder.mockResolvedValueOnce({
      id: 'asset-1',
      name: '卫星总体结构',
      description: null,
      format: 'STEP',
      fileSize: 123,
      storagePath: 'file-1', // Story 10.5: DB stores fileId
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
    });

    const result = await service.restoreAsset('asset-1');

    expect(assetRepo.restore).toHaveBeenCalledWith('asset-1');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'asset-1',
        name: '卫星总体结构',
        storagePath: '/api/files/file-1', // API returns URL
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        folder: expect.objectContaining({ id: 'folder-1' }),
      })
    );
  });

  /**
   * Story 10.5: Updated hardDeleteAsset test
   * - storagePath now stores fileId directly (no URL parsing needed)
   * - Uses FileStorageService.delete()
   */
  it('hardDeleteAsset: unlinks, deletes physical file, and deletes record', async () => {
    assetRepo.findById.mockResolvedValueOnce({ id: 'asset-1', storagePath: 'file-1' }); // fileId, not URL
    linkService.deleteLinksByAsset.mockResolvedValueOnce(1);
    fileStorageService.delete.mockResolvedValueOnce(undefined);
    assetRepo.hardDelete.mockResolvedValueOnce({ id: 'asset-1' });

    await service.hardDeleteAsset('asset-1');

    expect(linkService.deleteLinksByAsset).toHaveBeenCalledWith('asset-1');
    expect(fileStorageService.delete).toHaveBeenCalledWith('file-1');
    expect(assetRepo.hardDelete).toHaveBeenCalledWith('asset-1');
  });

  /**
   * Story 10.5: Updated emptyTrash test
   * - storagePath now stores fileId directly
   * - Uses FileStorageService.delete()
   */
  it('emptyTrash: best-effort deletes files then deletes db records', async () => {
    assetRepo.findDeleted.mockResolvedValueOnce([
      { id: 'asset-1', storagePath: 'file-1' }, // fileId, not URL
      { id: 'asset-2', storagePath: null },
    ]);
    fileStorageService.delete.mockResolvedValueOnce(undefined);
    assetRepo.emptyTrash.mockResolvedValueOnce(2);

    const result = await service.emptyTrash('graph-1');

    expect(fileStorageService.delete).toHaveBeenCalledWith('file-1');
    expect(assetRepo.emptyTrash).toHaveBeenCalledWith('graph-1');
    expect(result).toEqual({ deletedCount: 2 });
  });
});
