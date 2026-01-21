/**
 * Story 7.1: Backend Repository Pattern Refactor
 * Unit tests for GraphRepository
 */

import { GraphRepository } from '../graph.repository';

// Mock Prisma
jest.mock('@cdm/database', () => ({
  prisma: {
    graph: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    // Story 7.1 Fix: Updated tests to use Uint8Array input (matches Y.encodeStateAsUpdate return type)
    it('should update graph yjs state with Uint8Array', async () => {
      // Input is Uint8Array (from Y.encodeStateAsUpdate)
      const yjsState = new Uint8Array([1, 2, 3, 4, 5]);
      // Expected buffer after internal conversion
      const expectedBuffer = Buffer.from(yjsState);
      const updatedGraph = {
        id: 'graph-1',
        title: 'Test Graph',
        yjsState: expectedBuffer,
        updatedAt: new Date(),
      };

      (mockPrisma.graph.update as jest.Mock).mockResolvedValue(updatedGraph);

      const result = await repository.updateYjsState('graph-1', yjsState);

      expect(mockPrisma.graph.update).toHaveBeenCalledWith({
        where: { id: 'graph-1' },
        data: { yjsState: expectedBuffer },
      });
      expect(result).toEqual(updatedGraph);
      expect(result.yjsState).toEqual(expectedBuffer);
    });

    it('should handle large yjs state Uint8Array', async () => {
      // Simulate a large Yjs document (100KB) as Uint8Array
      const largeArray = new Uint8Array(100 * 1024).fill(120); // 'x' = 120
      const expectedBuffer = Buffer.from(largeArray);
      const updatedGraph = {
        id: 'graph-large',
        title: 'Large Graph',
        yjsState: expectedBuffer,
        updatedAt: new Date(),
      };

      (mockPrisma.graph.update as jest.Mock).mockResolvedValue(updatedGraph);

      const result = await repository.updateYjsState('graph-large', largeArray);

      expect(mockPrisma.graph.update).toHaveBeenCalledWith({
        where: { id: 'graph-large' },
        data: { yjsState: expectedBuffer },
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

  describe('Story 10.1 CRUD methods', () => {
    it('create should create a graph with project include (ownerId)', async () => {
      const createdGraph = {
        id: 'graph-new',
        name: 'New Graph',
        projectId: 'project-1',
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        project: { id: 'project-1', name: 'Project 1', ownerId: 'user-1' },
      };

      (mockPrisma.graph.create as jest.Mock).mockResolvedValue(createdGraph);

      const result = await repository.create({ name: 'New Graph', projectId: 'project-1' });

      expect(mockPrisma.graph.create).toHaveBeenCalledWith({
        data: {
          name: 'New Graph',
          projectId: 'project-1',
          data: {},
        },
        include: {
          project: {
            select: { id: true, name: true, ownerId: true },
          },
        },
      });
      expect(result).toEqual(createdGraph);
    });

    it('findByUserId should return graphs ordered by updatedAt desc with counts', async () => {
      const graphs = [
        {
          id: 'graph-1',
          name: 'Graph 1',
          projectId: 'project-1',
          data: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          project: { id: 'project-1', name: 'Project 1' },
          _count: { nodes: 2, edges: 1 },
        },
      ];

      (mockPrisma.graph.findMany as jest.Mock).mockResolvedValue(graphs);

      const result = await repository.findByUserId('user-1');

      expect(mockPrisma.graph.findMany).toHaveBeenCalledWith({
        where: {
          project: {
            ownerId: 'user-1',
          },
        },
        include: {
          project: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              nodes: true,
              edges: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      expect(result).toEqual(graphs);
    });

    it('findOneWithProject should return graph with project include (ownerId)', async () => {
      const graph = {
        id: 'graph-1',
        name: 'Graph 1',
        projectId: 'project-1',
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        project: { id: 'project-1', name: 'Project 1', ownerId: 'user-1' },
      };

      (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue(graph);

      const result = await repository.findOneWithProject('graph-1');

      expect(mockPrisma.graph.findUnique).toHaveBeenCalledWith({
        where: { id: 'graph-1' },
        include: {
          project: {
            select: { id: true, name: true, ownerId: true },
          },
        },
      });
      expect(result).toEqual(graph);
    });

    it('update should update graph name and return project include (ownerId)', async () => {
      const updatedGraph = {
        id: 'graph-1',
        name: 'Updated Graph',
        projectId: 'project-1',
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        project: { id: 'project-1', name: 'Project 1', ownerId: 'user-1' },
      };

      (mockPrisma.graph.update as jest.Mock).mockResolvedValue(updatedGraph);

      const result = await repository.update('graph-1', { name: 'Updated Graph' });

      expect(mockPrisma.graph.update).toHaveBeenCalledWith({
        where: { id: 'graph-1' },
        data: {
          name: 'Updated Graph',
          updatedAt: expect.any(Date),
        },
        include: {
          project: {
            select: { id: true, name: true, ownerId: true },
          },
        },
      });
      expect(result).toEqual(updatedGraph);
    });

    it('delete should delete a graph by id', async () => {
      (mockPrisma.graph.delete as jest.Mock).mockResolvedValue({ id: 'graph-1' });

      await repository.delete('graph-1');

      expect(mockPrisma.graph.delete).toHaveBeenCalledWith({ where: { id: 'graph-1' } });
    });
  });
});
