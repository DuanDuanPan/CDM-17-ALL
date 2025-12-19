/**
 * Story 2.2: Edges Service Tests
 * Tests for edge operations and cycle detection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EdgesService, CycleDetectionResult } from './edges.service';
import { EdgeRepository } from './repositories/edge.repository';
import type { EdgeMetadata } from '@cdm/types';
import { NodeType } from '@cdm/types';

// Mock Prisma
jest.mock('@cdm/database', () => ({
  prisma: {
    node: {
      findUnique: jest.fn(),
    },
    edge: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from '@cdm/database';

describe('EdgesService', () => {
  let service: EdgesService;
  let edgeRepository: EdgeRepository;

  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EdgesService, EdgeRepository],
    }).compile();

    service = module.get<EdgesService>(EdgesService);
    edgeRepository = module.get<EdgeRepository>(EdgeRepository);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Cycle Detection', () => {
    const graphId = 'graph-1';

    it('should detect self-loop as a cycle', async () => {
      (mockPrisma.edge.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.detectCycleIfCreated(graphId, 'A', 'A');

      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toContain('A');
    });

    it('should detect simple A->B->A cycle', async () => {
      // Existing edge: B -> A (dependency)
      (mockPrisma.edge.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'edge-1',
          sourceId: 'B',
          targetId: 'A',
          metadata: { kind: 'dependency', dependencyType: 'FS' } as EdgeMetadata,
        },
      ]);

      // Try to create A -> B, which would form cycle A -> B -> A
      const result = await service.detectCycleIfCreated(graphId, 'A', 'B');

      expect(result.hasCycle).toBe(true);
    });

    it('should detect transitive A->B->C->A cycle', async () => {
      // Existing edges: B -> C, C -> A (dependency)
      (mockPrisma.edge.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'edge-1',
          sourceId: 'B',
          targetId: 'C',
          metadata: { kind: 'dependency', dependencyType: 'FS' } as EdgeMetadata,
        },
        {
          id: 'edge-2',
          sourceId: 'C',
          targetId: 'A',
          metadata: { kind: 'dependency', dependencyType: 'FS' } as EdgeMetadata,
        },
      ]);

      // Try to create A -> B, which would form cycle A -> B -> C -> A
      const result = await service.detectCycleIfCreated(graphId, 'A', 'B');

      expect(result.hasCycle).toBe(true);
    });

    it('should NOT detect cycle for valid DAG', async () => {
      // Existing edges: A -> B, B -> C (dependency)
      (mockPrisma.edge.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'edge-1',
          sourceId: 'A',
          targetId: 'B',
          metadata: { kind: 'dependency', dependencyType: 'FS' } as EdgeMetadata,
        },
        {
          id: 'edge-2',
          sourceId: 'B',
          targetId: 'C',
          metadata: { kind: 'dependency', dependencyType: 'FS' } as EdgeMetadata,
        },
      ]);

      // Try to create A -> C, which is valid (no cycle)
      const result = await service.detectCycleIfCreated(graphId, 'A', 'C');

      expect(result.hasCycle).toBe(false);
    });

    it('should NOT detect cycle for disconnected nodes', async () => {
      // Existing edge: A -> B (dependency)
      (mockPrisma.edge.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'edge-1',
          sourceId: 'A',
          targetId: 'B',
          metadata: { kind: 'dependency', dependencyType: 'FS' } as EdgeMetadata,
        },
      ]);

      // Try to create C -> D, which is valid (disconnected from A-B)
      const result = await service.detectCycleIfCreated(graphId, 'C', 'D');

      expect(result.hasCycle).toBe(false);
    });

    it('should ONLY traverse dependency edges for cycle detection', async () => {
      // Mix of edges: hierarchical A -> B, dependency B -> A
      (mockPrisma.edge.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'edge-1',
          sourceId: 'A',
          targetId: 'B',
          metadata: { kind: 'hierarchical' }, // Should be ignored
        },
        {
          id: 'edge-2',
          sourceId: 'B',
          targetId: 'C',
          metadata: { kind: 'dependency', dependencyType: 'FS' },
        },
      ]);

      // Try to create C -> A
      // If hierarchical were counted, this would be a cycle (C -> A -> B -> C)
      // But since we only traverse dependency edges, it's NOT a cycle
      const result = await service.detectCycleIfCreated(graphId, 'C', 'A');

      expect(result.hasCycle).toBe(false);
    });
  });

  describe('Task Node Validation', () => {
    it('should reject dependency edge between non-TASK nodes', async () => {
      // Mock nodes: Source is ORDINARY, Target is TASK
      (mockPrisma.node.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'node-1',
          type: NodeType.ORDINARY,
          label: 'Ordinary Node',
        })
        .mockResolvedValueOnce({
          id: 'node-2',
          type: NodeType.TASK,
          label: 'Task Node',
        });

      (mockPrisma.edge.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.createEdge({
          graphId: 'graph-1',
          sourceId: 'node-1',
          targetId: 'node-2',
          kind: 'dependency',
          dependencyType: 'FS',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow dependency edge between two TASK nodes', async () => {
      // Mock nodes: Both are TASK
      (mockPrisma.node.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'task-1',
          type: NodeType.TASK,
          label: 'Task 1',
        })
        .mockResolvedValueOnce({
          id: 'task-2',
          type: NodeType.TASK,
          label: 'Task 2',
        });

      // No existing edges
      (mockPrisma.edge.findMany as jest.Mock).mockResolvedValue([]);

      // Mock edge creation
      const mockEdge = {
        id: 'edge-1',
        graphId: 'graph-1',
        sourceId: 'task-1',
        targetId: 'task-2',
        type: 'dependency',
        metadata: { kind: 'dependency', dependencyType: 'FS' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockPrisma.edge.create as jest.Mock).mockResolvedValue(mockEdge);

      const result = await service.createEdge({
        graphId: 'graph-1',
        sourceId: 'task-1',
        targetId: 'task-2',
        kind: 'dependency',
        dependencyType: 'FS',
      });

      expect(result.kind).toBe('dependency');
      expect(result.dependencyType).toBe('FS');
    });

    it('should allow hierarchical edge between any node types', async () => {
      // Mock edge creation (no node validation needed for hierarchical)
      const mockEdge = {
        id: 'edge-1',
        graphId: 'graph-1',
        sourceId: 'node-1',
        targetId: 'node-2',
        type: 'hierarchical',
        metadata: { kind: 'hierarchical' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockPrisma.edge.create as jest.Mock).mockResolvedValue(mockEdge);

      const result = await service.createEdge({
        graphId: 'graph-1',
        sourceId: 'node-1',
        targetId: 'node-2',
        kind: 'hierarchical',
      });

      expect(result.kind).toBe('hierarchical');
      // No node validation should have been called for hierarchical
      expect(mockPrisma.node.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Dependency Type Validation', () => {
    it('should require dependencyType for dependency edges', async () => {
      // Mock nodes as TASK
      (mockPrisma.node.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'task-1', type: NodeType.TASK, label: 'Task 1' })
        .mockResolvedValueOnce({ id: 'task-2', type: NodeType.TASK, label: 'Task 2' });

      (mockPrisma.edge.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.createEdge({
          graphId: 'graph-1',
          sourceId: 'task-1',
          targetId: 'task-2',
          kind: 'dependency',
          // Missing dependencyType
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Edge CRUD Operations', () => {
    it('should get edge by ID', async () => {
      const mockEdge = {
        id: 'edge-1',
        graphId: 'graph-1',
        sourceId: 'node-1',
        targetId: 'node-2',
        type: 'dependency',
        metadata: { kind: 'dependency', dependencyType: 'FS' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockPrisma.edge.findUnique as jest.Mock).mockResolvedValue(mockEdge);

      const result = await service.getEdge('edge-1');

      expect(result.id).toBe('edge-1');
      expect(result.kind).toBe('dependency');
      expect(result.dependencyType).toBe('FS');
    });

    it('should throw NotFoundException for non-existent edge', async () => {
      (mockPrisma.edge.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getEdge('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should delete edge successfully', async () => {
      const mockEdge = {
        id: 'edge-1',
        graphId: 'graph-1',
        sourceId: 'node-1',
        targetId: 'node-2',
        metadata: { kind: 'hierarchical' },
      };
      (mockPrisma.edge.findUnique as jest.Mock).mockResolvedValue(mockEdge);
      (mockPrisma.edge.delete as jest.Mock).mockResolvedValue(mockEdge);

      await service.deleteEdge('edge-1');

      expect(mockPrisma.edge.delete).toHaveBeenCalledWith({ where: { id: 'edge-1' } });
    });
  });
});
