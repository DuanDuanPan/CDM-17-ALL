/**
 * Story 9.8: Soft delete / Trash
 * Unit tests for DataFolderRepository (Prisma mocked)
 */

import { DataFolderRepository } from '../data-folder.repository';

jest.mock('@cdm/database', () => ({
  prisma: {
    dataFolder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    dataAsset: {
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@cdm/database';

describe('DataFolderRepository', () => {
  let repository: DataFolderRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new DataFolderRepository();
    jest.clearAllMocks();
  });

  it('findByGraphWithAssetCount: counts only non-deleted assets', async () => {
    (mockPrisma.dataFolder.findMany as jest.Mock).mockResolvedValueOnce([]);

    await repository.findByGraphWithAssetCount('graph-1');

    expect(mockPrisma.dataFolder.findMany).toHaveBeenCalledWith({
      where: { graphId: 'graph-1' },
      include: { _count: { select: { assets: { where: { isDeleted: false } } } } },
      orderBy: { name: 'asc' },
    });
  });

  it('hasAssets: ignores soft-deleted assets', async () => {
    (mockPrisma.dataAsset.count as jest.Mock).mockResolvedValueOnce(0);

    const hasAssets = await repository.hasAssets('folder-1');

    expect(mockPrisma.dataAsset.count).toHaveBeenCalledWith({
      where: { folderId: 'folder-1', isDeleted: false },
    });
    expect(hasAssets).toBe(false);
  });
});

