/**
 * Story 7.1: Backend Repository Pattern Refactor
 * Unit tests for GraphRepository
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mocks */

import { GraphRepository } from '../graph.repository';

// Mock Prisma
jest.mock('@cdm/database', () => ({
  prisma: {
    graph: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '@cdm/database';

describe('GraphRepository', () => {
  let repository: GraphRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new GraphRepository();
    jest.clearAllMocks();
  });

  describe('findGraphWithRelations', () => {
    it('should find graph with all related nodes and edges', async () => {
      const expectedGraph = {
        id: 'graph-1',
        title: 'Test Graph',
        yjsState: Buffer.from('test'),
        nodes: [
          {
            id: 'node-1',
            label: 'Node 1',
            graphId: 'graph-1',
            type: 'TASK',
            taskProps: { status: 'todo' },
            requirementProps: null,
            pbsProps: null,
            dataProps: null,
            appProps: null,
          },
          {
            id: 'node-2',
            label: 'Node 2',
            graphId: 'graph-1',
            type: 'PBS',
            taskProps: null,
            requirementProps: null,
            pbsProps: { level: 1 },
            dataProps: null,
            appProps: null,
          },
        ],
        edges: [
          { id: 'edge-1', sourceId: 'node-1', targetId: 'node-2' },
        ],
      };

      (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue(expectedGraph);

      const result = await repository.findGraphWithRelations('graph-1');

      expect(mockPrisma.graph.findUnique).toHaveBeenCalledWith({
        where: { id: 'graph-1' },
        include: {
          nodes: {
            include: {
              taskProps: true,
              requirementProps: true,
              pbsProps: true,
              dataProps: true,
              appProps: true,
            },
          },
          edges: true,
        },
      });
      expect(result).toEqual(expectedGraph);
      expect(result?.nodes.length).toBe(2);
      expect(result?.edges.length).toBe(1);
    });

    it('should return null when graph not found', async () => {
      (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findGraphWithRelations('non-existent');

      expect(mockPrisma.graph.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        include: {
          nodes: {
            include: {
              taskProps: true,
              requirementProps: true,
              pbsProps: true,
              dataProps: true,
              appProps: true,
            },
          },
          edges: true,
        },
      });
      expect(result).toBeNull();
    });

    it('should return graph with empty nodes and edges', async () => {
      const emptyGraph = {
        id: 'graph-empty',
        title: 'Empty Graph',
        yjsState: null,
        nodes: [],
        edges: [],
      };

      (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue(emptyGraph);

      const result = await repository.findGraphWithRelations('graph-empty');

      expect(result).toEqual(emptyGraph);
      expect(result?.nodes).toEqual([]);
      expect(result?.edges).toEqual([]);
    });
  });

  describe('updateYjsState', () => {
    it('should update graph yjs state with buffer', async () => {
      const yjsState = Buffer.from([1, 2, 3, 4, 5]);
      const updatedGraph = {
        id: 'graph-1',
        title: 'Test Graph',
        yjsState: yjsState,
        updatedAt: new Date(),
      };

      (mockPrisma.graph.update as jest.Mock).mockResolvedValue(updatedGraph);

      const result = await repository.updateYjsState('graph-1', yjsState);

      expect(mockPrisma.graph.update).toHaveBeenCalledWith({
        where: { id: 'graph-1' },
        data: { yjsState: yjsState },
      });
      expect(result).toEqual(updatedGraph);
      expect(result.yjsState).toEqual(yjsState);
    });

    it('should handle large yjs state buffer', async () => {
      // Simulate a large Yjs document (100KB)
      const largeBuffer = Buffer.alloc(100 * 1024, 'x');
      const updatedGraph = {
        id: 'graph-large',
        title: 'Large Graph',
        yjsState: largeBuffer,
        updatedAt: new Date(),
      };

      (mockPrisma.graph.update as jest.Mock).mockResolvedValue(updatedGraph);

      const result = await repository.updateYjsState('graph-large', largeBuffer);

      expect(mockPrisma.graph.update).toHaveBeenCalledWith({
        where: { id: 'graph-large' },
        data: { yjsState: largeBuffer },
      });
      expect(result.yjsState?.length).toBe(100 * 1024);
    });
  });

  describe('findById', () => {
    it('should find graph by id', async () => {
      const expectedGraph = {
        id: 'graph-1',
        title: 'Test Graph',
        yjsState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue(expectedGraph);

      const result = await repository.findById('graph-1');

      expect(mockPrisma.graph.findUnique).toHaveBeenCalledWith({
        where: { id: 'graph-1' },
      });
      expect(result).toEqual(expectedGraph);
    });

    it('should return null when graph not found', async () => {
      (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true when graph exists', async () => {
      (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue({ id: 'graph-1' });

      const result = await repository.exists('graph-1');

      expect(mockPrisma.graph.findUnique).toHaveBeenCalledWith({
        where: { id: 'graph-1' },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it('should return false when graph does not exist', async () => {
      (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.exists('non-existent');

      expect(result).toBe(false);
    });
  });
});
