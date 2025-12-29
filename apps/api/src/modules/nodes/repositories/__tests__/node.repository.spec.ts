/**
 * Story 7.1: Backend Repository Pattern Refactor
 * Unit tests for NodeRepository (focus on upsertBatch and core methods)
 * Story 7.1 Fix: Updated to use $transaction mock for atomic upsertBatch
 */

import { NodeRepository, NodeUpsertBatchData } from '../node.repository';
import { NodeType } from '@cdm/types';

// Mock Prisma
// Story 7.1 Fix: Added $transaction mock for atomic upsertBatch
jest.mock('@cdm/database', () => ({
  prisma: {
    node: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));

import { prisma } from '@cdm/database';

describe('NodeRepository', () => {
  let repository: NodeRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new NodeRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find node by id', async () => {
      const expectedNode = {
        id: 'node-1',
        label: 'Test Node',
        graphId: 'graph-1',
        type: 'TASK',
      };

      (mockPrisma.node.findUnique as jest.Mock).mockResolvedValue(expectedNode);

      const result = await repository.findById('node-1');

      expect(mockPrisma.node.findUnique).toHaveBeenCalledWith({
        where: { id: 'node-1' },
      });
      expect(result).toEqual(expectedNode);
    });

    it('should return null when node not found', async () => {
      (mockPrisma.node.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdWithProps', () => {
    it('should find node with all props included', async () => {
      const expectedNode = {
        id: 'node-1',
        label: 'Task Node',
        type: 'TASK',
        taskProps: { status: 'in_progress', priority: 'high' },
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
        appProps: null,
      };

      (mockPrisma.node.findUnique as jest.Mock).mockResolvedValue(expectedNode);

      const result = await repository.findByIdWithProps('node-1');

      expect(mockPrisma.node.findUnique).toHaveBeenCalledWith({
        where: { id: 'node-1' },
        include: {
          taskProps: true,
          requirementProps: true,
          pbsProps: true,
          dataProps: true,
          appProps: true,
        },
      });
      expect(result?.taskProps).toEqual({ status: 'in_progress', priority: 'high' });
    });
  });

  describe('create', () => {
    it('should create node with required fields', async () => {
      const createData = {
        label: 'New Node',
        type: NodeType.TASK,
        graphId: 'graph-1',
        creatorName: 'Test User',
      };

      const expectedNode = {
        id: 'generated-id',
        ...createData,
        x: 0,
        y: 0,
        parentId: null,
        tags: [],
      };

      (mockPrisma.node.create as jest.Mock).mockResolvedValue(expectedNode);

      const result = await repository.create(createData);

      expect(mockPrisma.node.create).toHaveBeenCalledWith({
        data: {
          id: undefined,
          label: createData.label,
          description: undefined,
          type: createData.type,
          graphId: createData.graphId,
          parentId: null,
          x: 0,
          y: 0,
          creatorName: createData.creatorName,
          tags: [],
        },
      });
      expect(result).toEqual(expectedNode);
    });

    it('should create node with all optional fields', async () => {
      const createData = {
        id: 'custom-id',
        label: 'Custom Node',
        type: NodeType.PBS,
        graphId: 'graph-1',
        parentId: 'parent-node',
        x: 100,
        y: 200,
        creatorName: 'Test User',
        description: 'A test node',
        tags: ['tag1', 'tag2'],
      };

      const expectedNode = { ...createData };

      (mockPrisma.node.create as jest.Mock).mockResolvedValue(expectedNode);

      const result = await repository.create(createData);

      expect(mockPrisma.node.create).toHaveBeenCalledWith({
        data: {
          id: 'custom-id',
          label: createData.label,
          description: 'A test node',
          type: createData.type,
          graphId: createData.graphId,
          parentId: 'parent-node',
          x: 100,
          y: 200,
          creatorName: createData.creatorName,
          tags: ['tag1', 'tag2'],
        },
      });
      expect(result).toEqual(expectedNode);
    });
  });

  describe('update', () => {
    it('should update node with partial data', async () => {
      const updateData = { label: 'Updated Label' };
      const updatedNode = {
        id: 'node-1',
        label: 'Updated Label',
        type: 'TASK',
      };

      (mockPrisma.node.update as jest.Mock).mockResolvedValue(updatedNode);

      const result = await repository.update('node-1', updateData);

      expect(mockPrisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-1' },
        data: updateData,
      });
      expect(result.label).toBe('Updated Label');
    });
  });

  describe('delete', () => {
    it('should delete node by id', async () => {
      (mockPrisma.node.delete as jest.Mock).mockResolvedValue({});

      await repository.delete('node-1');

      expect(mockPrisma.node.delete).toHaveBeenCalledWith({
        where: { id: 'node-1' },
      });
    });
  });

  describe('upsertBatch', () => {
    it('should return empty array for empty input', async () => {
      const result = await repository.upsertBatch([]);

      expect(result).toEqual([]);
      // Story 7.1 Fix: $transaction should not be called for empty input
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should upsert single node using $transaction with correct params', async () => {
      const nodeData: NodeUpsertBatchData = {
        id: 'node-1',
        label: 'Test Node',
        graphId: 'graph-1',
        type: NodeType.TASK,
        x: 100,
        y: 200,
        width: 180,
        height: 40,
        parentId: null,
        creatorName: 'User 1',
        description: 'Test description',
        tags: ['tag1'],
        isArchived: false,
      };

      const expectedNode = { ...nodeData, createdAt: new Date(), updatedAt: new Date() };
      // Mock upsert to return a promise-like object
      const mockUpsertPromise = Promise.resolve(expectedNode);
      (mockPrisma.node.upsert as jest.Mock).mockReturnValue(mockUpsertPromise);
      // Story 7.1 Fix: Mock $transaction to return array of results
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([expectedNode]);

      const result = await repository.upsertBatch([nodeData]);

      // Verify upsert was called with correct parameters
      expect(mockPrisma.node.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.node.upsert).toHaveBeenCalledWith({
        where: { id: 'node-1' },
        create: {
          id: nodeData.id,
          label: nodeData.label,
          graphId: nodeData.graphId,
          type: nodeData.type,
          x: nodeData.x,
          y: nodeData.y,
          width: nodeData.width,
          height: nodeData.height,
          parentId: nodeData.parentId,
          creatorName: nodeData.creatorName,
          description: nodeData.description,
          tags: nodeData.tags,
          isArchived: nodeData.isArchived,
        },
        update: {
          label: nodeData.label,
          type: nodeData.type,
          x: nodeData.x,
          y: nodeData.y,
          width: nodeData.width,
          height: nodeData.height,
          parentId: nodeData.parentId,
          creatorName: nodeData.creatorName,
          description: nodeData.description,
          tags: nodeData.tags,
          isArchived: nodeData.isArchived,
        },
      });

      // Verify $transaction receives array with correct length
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith([mockUpsertPromise]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedNode);
    });

    it('should upsert multiple nodes atomically using $transaction', async () => {
      const nodes: NodeUpsertBatchData[] = [
        {
          id: 'node-1',
          label: 'Node 1',
          graphId: 'graph-1',
          type: NodeType.TASK,
          x: 0,
          y: 0,
          width: 180,
          height: 40,
          parentId: null,
          creatorName: 'User 1',
          description: null,
          tags: [],
          isArchived: false,
        },
        {
          id: 'node-2',
          label: 'Node 2',
          graphId: 'graph-1',
          type: NodeType.PBS,
          x: 100,
          y: 100,
          width: 200,
          height: 50,
          parentId: 'node-1',
          creatorName: 'User 2',
          description: 'Second node',
          tags: ['important'],
          isArchived: false,
        },
        {
          id: 'node-3',
          label: 'Node 3',
          graphId: 'graph-1',
          type: NodeType.REQUIREMENT,
          x: 200,
          y: 200,
          width: 180,
          height: 40,
          parentId: 'node-1',
          creatorName: 'User 1',
          description: null,
          tags: ['urgent', 'review'],
          isArchived: true,
        },
      ];

      // Story 7.1 Fix: Mock $transaction to return all nodes atomically
      const expectedResults = nodes.map((n) => ({ ...n, createdAt: new Date() }));
      // Mock upsert to return promise-like objects
      const mockUpsertPromises = expectedResults.map((r) => Promise.resolve(r));
      (mockPrisma.node.upsert as jest.Mock)
        .mockReturnValueOnce(mockUpsertPromises[0])
        .mockReturnValueOnce(mockUpsertPromises[1])
        .mockReturnValueOnce(mockUpsertPromises[2]);
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue(expectedResults);

      const result = await repository.upsertBatch(nodes);

      // Verify upsert was called 3 times with correct node IDs
      expect(mockPrisma.node.upsert).toHaveBeenCalledTimes(3);
      expect(mockPrisma.node.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
        where: { id: 'node-1' },
      }));
      expect(mockPrisma.node.upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: { id: 'node-2' },
      }));
      expect(mockPrisma.node.upsert).toHaveBeenNthCalledWith(3, expect.objectContaining({
        where: { id: 'node-3' },
      }));

      // Story 7.1 Fix: Single $transaction call for atomicity with 3 operations
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(mockUpsertPromises);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('node-1');
      expect(result[1].id).toBe('node-2');
      expect(result[2].id).toBe('node-3');
    });

    it('should handle archived nodes correctly', async () => {
      const archivedNode: NodeUpsertBatchData = {
        id: 'archived-node',
        label: 'Archived Node',
        graphId: 'graph-1',
        type: NodeType.DATA,
        x: 0,
        y: 0,
        width: 180,
        height: 40,
        parentId: null,
        creatorName: 'User 1',
        description: 'This is archived',
        tags: [],
        isArchived: true,
      };

      const expectedNode = { ...archivedNode };
      // Story 7.1 Fix: Mock $transaction
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([expectedNode]);

      const result = await repository.upsertBatch([archivedNode]);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result[0].isArchived).toBe(true);
    });

    it('should handle node with all supported types', async () => {
      const nodeTypes = [
        NodeType.TASK,
        NodeType.PBS,
        NodeType.REQUIREMENT,
        NodeType.DATA,
        NodeType.APP,
      ];

      const nodes: NodeUpsertBatchData[] = nodeTypes.map((type, index) => ({
        id: `node-${index}`,
        label: `Node ${type}`,
        graphId: 'graph-1',
        type,
        x: index * 100,
        y: 0,
        width: 180,
        height: 40,
        parentId: null,
        creatorName: 'User 1',
        description: null,
        tags: [],
        isArchived: false,
      }));

      // Story 7.1 Fix: Mock $transaction to return all nodes
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue(nodes);

      const result = await repository.upsertBatch(nodes);

      // Story 7.1 Fix: Verify atomic transaction
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(5);
      result.forEach((node, index) => {
        expect(node.type).toBe(nodeTypes[index]);
      });
    });
  });

  describe('search', () => {
    it('should search nodes with keyword', async () => {
      const searchResults = [
        { id: 'node-1', label: 'Test Node', graph: { id: 'g1', name: 'Graph 1' } },
      ];

      (mockPrisma.node.findMany as jest.Mock).mockResolvedValue(searchResults);
      (mockPrisma.node.count as jest.Mock).mockResolvedValue(1);

      const result = await repository.search({ q: 'test' });

      expect(mockPrisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isArchived: false,
            OR: [
              { label: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
      expect(result.results).toEqual(searchResults);
      expect(result.total).toBe(1);
    });

    it('should filter by tags', async () => {
      (mockPrisma.node.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.node.count as jest.Mock).mockResolvedValue(0);

      await repository.search({ tags: ['important', 'urgent'] });

      expect(mockPrisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ['important', 'urgent'] },
          }),
        }),
      );
    });
  });
});
