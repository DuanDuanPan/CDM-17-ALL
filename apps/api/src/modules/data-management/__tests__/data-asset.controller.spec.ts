/**
 * Story 9.5: Data Upload & Node Linking
 * Unit tests for DataAssetController (service mocked)
 */

import { BadRequestException } from '@nestjs/common';
import { DataAssetController } from '../data-asset.controller';

describe('DataAssetController', () => {
  const service = {
    findMany: jest.fn(),
    createAsset: jest.fn(),
    uploadAsset: jest.fn(),
    getAsset: jest.fn(),
    updateAsset: jest.fn(),
    deleteAsset: jest.fn(),
    softDeleteAsset: jest.fn(),
    softDeleteAssets: jest.fn(),
    restoreAsset: jest.fn(),
    getTrash: jest.fn(),
    hardDeleteAsset: jest.fn(),
    emptyTrash: jest.fn(),
    getNodeAssets: jest.fn(),
    getNodeAssetLinks: jest.fn(),
    linkNodeToAsset: jest.fn(),
    linkNodeToAssetsBatch: jest.fn(),
    unlinkNodeFromAsset: jest.fn(),
    getNodeAssetsByNodes: jest.fn(),
    getFolderTree: jest.fn(),
    createFolder: jest.fn(),
    updateFolder: jest.fn(),
    deleteFolder: jest.fn(),
  };

  let controller: DataAssetController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DataAssetController(service as any);
  });

  it('list: forwards query params to service.findMany (tags + pagination)', async () => {
    service.findMany.mockResolvedValueOnce({ assets: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });

    await controller.list(
      'graph-1',
      'search',
      'STEP' as any,
      'folder-1',
      'a,b',
      '2026-01-01',
      '2026-12-31',
      undefined,
      '2',
      '10',
      'createdAt',
      'desc'
    );

    expect(service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        graphId: 'graph-1',
        search: 'search',
        format: 'STEP',
        folderId: 'folder-1',
        tags: ['a', 'b'],
        createdAfter: '2026-01-01',
        createdBefore: '2026-12-31',
        page: 2,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    );
  });

  it('upload: throws BadRequestException when graphId is missing', async () => {
    await expect(controller.upload({} as any, { graphId: '' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upload: calls service.uploadAsset and returns { success, asset }', async () => {
    const asset = { id: 'asset-1', name: 'file.step' };
    service.uploadAsset.mockResolvedValueOnce(asset);

    const res = await controller.upload({ originalname: 'file.step' } as any, { graphId: 'graph-1' } as any);

    expect(service.uploadAsset).toHaveBeenCalledWith(expect.any(Object), 'graph-1', undefined);
    expect(res).toEqual({ success: true, asset });
  });

  it('getLinksDetail: returns links from service.getNodeAssetLinks', async () => {
    const links = [{ id: 'link-1' }];
    service.getNodeAssetLinks.mockResolvedValueOnce(links);

    const res = await controller.getLinksDetail('node-1');

    expect(service.getNodeAssetLinks).toHaveBeenCalledWith('node-1');
    expect(res).toEqual({ links });
  });

  it('createLink: returns { success, link } from service.linkNodeToAsset', async () => {
    const link = { id: 'link-1', nodeId: 'node-1', assetId: 'asset-1', linkType: 'reference' };
    service.linkNodeToAsset.mockResolvedValueOnce(link);

    const res = await controller.createLink({ nodeId: 'node-1', assetId: 'asset-1', linkType: 'reference' } as any);

    expect(service.linkNodeToAsset).toHaveBeenCalledWith(expect.any(Object));
    expect(res).toEqual({ success: true, link });
  });

  it('destroyLink: calls service.unlinkNodeFromAsset and returns success', async () => {
    service.unlinkNodeFromAsset.mockResolvedValueOnce(undefined);

    const res = await controller.destroyLink('node-1', 'asset-1');

    expect(service.unlinkNodeFromAsset).toHaveBeenCalledWith('node-1', 'asset-1');
    expect(res).toEqual({ success: true });
  });

  it('getLinks: returns assets from service.getNodeAssets', async () => {
    const assets = [{ id: 'asset-1' }];
    service.getNodeAssets.mockResolvedValueOnce(assets);

    const res = await controller.getLinks('node-1');

    expect(service.getNodeAssets).toHaveBeenCalledWith('node-1');
    expect(res).toEqual({ assets });
  });

  it('destroy: calls service.deleteAsset and returns success', async () => {
    service.deleteAsset.mockResolvedValueOnce(undefined);

    const res = await controller.destroy('asset-1');

    expect(service.deleteAsset).toHaveBeenCalledWith('asset-1');
    expect(res).toEqual({ success: true });
  });

  it('softDelete: calls service.softDeleteAsset and returns success', async () => {
    service.softDeleteAsset.mockResolvedValueOnce(undefined);

    const res = await controller.softDelete('asset-1');

    expect(service.softDeleteAsset).toHaveBeenCalledWith('asset-1');
    expect(res).toEqual({ success: true });
  });

  it('softDeleteBatch: calls service.softDeleteAssets and returns deletedCount', async () => {
    service.softDeleteAssets.mockResolvedValueOnce({ deletedCount: 2 });

    const res = await controller.softDeleteBatch({ ids: ['a1', 'a2'] } as any);

    expect(service.softDeleteAssets).toHaveBeenCalledWith(['a1', 'a2']);
    expect(res).toEqual({ success: true, deletedCount: 2 });
  });

  it('restore: calls service.restoreAsset and returns asset', async () => {
    const asset = { id: 'asset-1', name: 'restored' };
    service.restoreAsset.mockResolvedValueOnce(asset);

    const res = await controller.restore('asset-1');

    expect(service.restoreAsset).toHaveBeenCalledWith('asset-1');
    expect(res).toEqual({ success: true, asset });
  });

  it('getTrash: returns service.getTrash result', async () => {
    const payload = { assets: [{ id: 'asset-1', linkedNodeCount: 1 }] };
    service.getTrash.mockResolvedValueOnce(payload);

    const res = await controller.getTrash('graph-1');

    expect(service.getTrash).toHaveBeenCalledWith('graph-1');
    expect(res).toEqual(payload);
  });

  it('hardDelete: calls service.hardDeleteAsset and returns success', async () => {
    service.hardDeleteAsset.mockResolvedValueOnce(undefined);

    const res = await controller.hardDelete('asset-1');

    expect(service.hardDeleteAsset).toHaveBeenCalledWith('asset-1');
    expect(res).toEqual({ success: true });
  });

  it('emptyTrash: calls service.emptyTrash and returns deletedCount', async () => {
    service.emptyTrash.mockResolvedValueOnce({ deletedCount: 3 });

    const res = await controller.emptyTrash('graph-1');

    expect(service.emptyTrash).toHaveBeenCalledWith('graph-1');
    expect(res).toEqual({ success: true, deletedCount: 3 });
  });

  // Story 9.10: Test for batch link creation endpoint (H4)
  it('createLinksBatch: calls service.linkNodeToAssetsBatch and returns created/skipped', async () => {
    service.linkNodeToAssetsBatch = jest.fn().mockResolvedValueOnce({ created: 2, skipped: 1 });

    const res = await controller.createLinksBatch({
      nodeId: 'node-1',
      assetIds: ['asset-1', 'asset-2', 'asset-3'],
      linkType: 'reference',
    } as any);

    expect(service.linkNodeToAssetsBatch).toHaveBeenCalledWith({
      nodeId: 'node-1',
      assetIds: ['asset-1', 'asset-2', 'asset-3'],
      linkType: 'reference',
    });
    expect(res).toEqual({ created: 2, skipped: 1 });
  });
});
