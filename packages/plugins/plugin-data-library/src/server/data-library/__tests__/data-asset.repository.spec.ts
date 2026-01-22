/**
 * Story 9.5: Data Upload & Node Linking
 * Unit tests for DataAssetRepository (Prisma mocked)
 */

import { DataAssetRepository } from '../data-asset.repository';

jest.mock('@cdm/database', () => ({
  prisma: {
    dataAsset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from '@cdm/database';

describe('DataAssetRepository', () => {
  let repository: DataAssetRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new DataAssetRepository();
    jest.clearAllMocks();
  });

  it('create: calls prisma.dataAsset.create', async () => {
    (mockPrisma.dataAsset.create as jest.Mock).mockResolvedValueOnce({ id: 'asset-1' });
    const data = { name: 'A' } as any;

    await repository.create(data);

    expect(mockPrisma.dataAsset.create).toHaveBeenCalledWith({ data });
  });

  it('findById: calls prisma.dataAsset.findUnique with where.id', async () => {
    (mockPrisma.dataAsset.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'asset-1' });

    await repository.findById('asset-1');

    expect(mockPrisma.dataAsset.findUnique).toHaveBeenCalledWith({ where: { id: 'asset-1' } });
  });

  it('findByIdWithFolder: includes folder relation', async () => {
    (mockPrisma.dataAsset.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'asset-1', folder: null });

    await repository.findByIdWithFolder('asset-1');

    expect(mockPrisma.dataAsset.findUnique).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      include: { folder: true },
    });
  });

  it('findMany: builds filters and paginates', async () => {
    (mockPrisma.dataAsset.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'asset-1', folder: null }]);
    (mockPrisma.dataAsset.count as jest.Mock).mockResolvedValueOnce(1);

    await repository.findMany('graph-1', {
      search: 'sat',
      format: 'STEP' as any,
      folderId: '',
      tags: ['t1', 't2'],
      createdAfter: '2026-01-01',
      createdBefore: '2026-01-02',
      page: 2,
      pageSize: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as any);

    const args = (mockPrisma.dataAsset.findMany as jest.Mock).mock.calls[0]?.[0] as any;
    expect(args.where.graphId).toBe('graph-1');
    expect(args.where.isDeleted).toBe(false);
    expect(args.where.name).toEqual({ contains: 'sat', mode: 'insensitive' });
    expect(args.where.format).toBe('STEP');
    expect(args.where.folderId).toBeNull();
    expect(args.where.tags).toEqual({ hasEvery: ['t1', 't2'] });
    expect(args.where.createdAt.gte.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(args.where.createdAt.lte.toISOString()).toBe('2026-01-02T23:59:59.999Z');
    expect(args.include).toEqual({ folder: true });
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);

    expect(mockPrisma.dataAsset.count).toHaveBeenCalledWith({ where: args.where });
  });

  it("findMany: applies linkStatus='unlinked' (nodeLinks.none)", async () => {
    (mockPrisma.dataAsset.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'asset-1', folder: null }]);
    (mockPrisma.dataAsset.count as jest.Mock).mockResolvedValueOnce(1);

    await repository.findMany('graph-1', {
      linkStatus: 'unlinked',
    } as any);

    const args = (mockPrisma.dataAsset.findMany as jest.Mock).mock.calls[0]?.[0] as any;
    expect(args.where.graphId).toBe('graph-1');
    expect(args.where.isDeleted).toBe(false);
    expect(args.where.nodeLinks).toEqual({ none: {} });
  });

  it('update: calls prisma.dataAsset.update with where.id and data', async () => {
    (mockPrisma.dataAsset.update as jest.Mock).mockResolvedValueOnce({ id: 'asset-1' });
    const data = { description: 'd' } as any;

    await repository.update('asset-1', data);

    expect(mockPrisma.dataAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data,
    });
  });

  it('delete: calls prisma.dataAsset.delete with where.id', async () => {
    (mockPrisma.dataAsset.delete as jest.Mock).mockResolvedValueOnce({ id: 'asset-1' });

    await repository.delete('asset-1');

    expect(mockPrisma.dataAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-1' } });
  });

  it('softDelete: updates isDeleted=true and sets deletedAt', async () => {
    (mockPrisma.dataAsset.update as jest.Mock).mockResolvedValueOnce({ id: 'asset-1' });

    const deletedAt = new Date('2026-01-01T00:00:00.000Z');
    await repository.softDelete('asset-1', deletedAt);

    expect(mockPrisma.dataAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { isDeleted: true, deletedAt },
    });
  });

  it('softDeleteBatch: updateMany with ids + isDeleted=false and returns count', async () => {
    (mockPrisma.dataAsset.updateMany as jest.Mock).mockResolvedValueOnce({ count: 2 });

    const deletedAt = new Date('2026-01-01T00:00:00.000Z');
    const count = await repository.softDeleteBatch(['a1', 'a2'], deletedAt);

    expect(mockPrisma.dataAsset.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2'] }, isDeleted: false },
      data: { isDeleted: true, deletedAt },
    });
    expect(count).toBe(2);
  });

  it('restore: updates isDeleted=false and clears deletedAt', async () => {
    (mockPrisma.dataAsset.update as jest.Mock).mockResolvedValueOnce({ id: 'asset-1' });

    await repository.restore('asset-1');

    expect(mockPrisma.dataAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { isDeleted: false, deletedAt: null },
    });
  });

  it('findDeleted: queries isDeleted=true with folder + _count', async () => {
    (mockPrisma.dataAsset.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'asset-1', folder: null, _count: { nodeLinks: 1 } },
    ]);

    await repository.findDeleted('graph-1');

    expect(mockPrisma.dataAsset.findMany).toHaveBeenCalledWith({
      where: { graphId: 'graph-1', isDeleted: true },
      include: { folder: true, _count: { select: { nodeLinks: true } } },
      orderBy: { deletedAt: 'desc' },
    });
  });

  it('hardDelete: calls prisma.dataAsset.delete with where.id', async () => {
    (mockPrisma.dataAsset.delete as jest.Mock).mockResolvedValueOnce({ id: 'asset-1' });

    await repository.hardDelete('asset-1');

    expect(mockPrisma.dataAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-1' } });
  });

  it('emptyTrash: deleteMany with graphId + isDeleted=true and returns count', async () => {
    (mockPrisma.dataAsset.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 3 });

    const count = await repository.emptyTrash('graph-1');

    expect(mockPrisma.dataAsset.deleteMany).toHaveBeenCalledWith({
      where: { graphId: 'graph-1', isDeleted: true },
    });
    expect(count).toBe(3);
  });

  it('countByFormat: maps groupBy counts', async () => {
    (mockPrisma.dataAsset.groupBy as jest.Mock).mockResolvedValueOnce([
      { format: 'STEP', _count: { format: 2 } },
      { format: 'OTHER', _count: { format: 1 } },
    ]);

    const result = await repository.countByFormat('graph-1');

    expect(mockPrisma.dataAsset.groupBy).toHaveBeenCalledWith({
      by: ['format'],
      where: { graphId: 'graph-1', isDeleted: false },
      _count: { format: true },
    });
    expect(result).toEqual([
      { format: 'STEP', count: 2 },
      { format: 'OTHER', count: 1 },
    ]);
  });
});
