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
});

