/**
 * Story 2.1: NodesService Unit Tests
 * Tests for polymorphic node type management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NodeType } from '@cdm/types';

// Mock @cdm/database module before imports
const mockPrisma = {
  node: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  nodeTask: {
    upsert: jest.fn(),
  },
  nodeRequirement: {
    upsert: jest.fn(),
  },
  nodePBS: {
    upsert: jest.fn(),
  },
  nodeData: {
    upsert: jest.fn(),
  },
};

jest.mock('@cdm/database', () => ({
  prisma: mockPrisma,
}));

import { NodesService } from './nodes.service';

describe('NodesService', () => {
  let service: NodesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NodesService],
    }).compile();

    service = module.get<NodesService>(NodesService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createNode', () => {
    it('should create an ordinary node by default', async () => {
      const mockNode = {
        id: 'node-1',
        label: 'Test Node',
        type: NodeType.ORDINARY,
        graphId: 'graph-1',
        x: 0,
        y: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.node.create.mockResolvedValue(mockNode);
      mockPrisma.node.findUnique.mockResolvedValue({
        ...mockNode,
        taskProps: null,
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      });

      const result = await service.createNode({
        label: 'Test Node',
        graphId: 'graph-1',
      });

      expect(mockPrisma.node.create).toHaveBeenCalledWith({
        data: {
          label: 'Test Node',
          type: NodeType.ORDINARY,
          graphId: 'graph-1',
          parentId: undefined,
          x: 0,
          y: 0,
        },
      });
      expect(result.id).toBe('node-1');
      expect(result.type).toBe(NodeType.ORDINARY);
    });

    it('should create a task node and initialize extension table', async () => {
      const mockNode = {
        id: 'node-2',
        label: 'Task Node',
        type: NodeType.TASK,
        graphId: 'graph-1',
        x: 0,
        y: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.node.create.mockResolvedValue(mockNode);
      mockPrisma.nodeTask.upsert.mockResolvedValue({
        nodeId: 'node-2',
        status: 'todo',
        priority: 'medium',
      });
      mockPrisma.node.findUnique.mockResolvedValue({
        ...mockNode,
        taskProps: { nodeId: 'node-2', status: 'todo', priority: 'medium' },
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      });

      const result = await service.createNode({
        label: 'Task Node',
        type: NodeType.TASK,
        graphId: 'graph-1',
      });

      expect(mockPrisma.node.create).toHaveBeenCalled();
      expect(mockPrisma.nodeTask.upsert).toHaveBeenCalledWith({
        where: { nodeId: 'node-2' },
        create: { nodeId: 'node-2', status: 'todo', priority: 'medium' },
        update: {},
      });
      expect(result.type).toBe(NodeType.TASK);
      expect(result.props).toEqual({ nodeId: 'node-2', status: 'todo', priority: 'medium' });
    });
  });

  describe('getNodeWithProps', () => {
    it('should return node with task properties', async () => {
      const mockNode = {
        id: 'node-1',
        label: 'Task Node',
        type: NodeType.TASK,
        graphId: 'graph-1',
        x: 0,
        y: 0,
        width: 160,
        height: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        taskProps: {
          nodeId: 'node-1',
          status: 'in-progress',
          priority: 'high',
          assigneeId: 'user-1',
        },
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      };

      mockPrisma.node.findUnique.mockResolvedValue(mockNode);

      const result = await service.getNodeWithProps('node-1');

      expect(result.id).toBe('node-1');
      expect(result.type).toBe(NodeType.TASK);
      expect(result.props).toEqual({
        nodeId: 'node-1',
        status: 'in-progress',
        priority: 'high',
        assigneeId: 'user-1',
      });
    });

    it('should throw NotFoundException if node does not exist', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);

      await expect(service.getNodeWithProps('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateNodeType', () => {
    it('should update node type and initialize new extension table', async () => {
      const existingNode = {
        id: 'node-1',
        label: 'Test Node',
        type: NodeType.ORDINARY,
        graphId: 'graph-1',
        x: 0,
        y: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedNode = {
        ...existingNode,
        type: NodeType.TASK,
      };

      mockPrisma.node.findUnique.mockResolvedValue(existingNode);
      mockPrisma.node.update.mockResolvedValue(updatedNode);
      mockPrisma.nodeTask.upsert.mockResolvedValue({
        nodeId: 'node-1',
        status: 'todo',
        priority: 'medium',
      });

      const result = await service.updateNodeType('node-1', { type: NodeType.TASK });

      expect(mockPrisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-1' },
        data: { type: NodeType.TASK },
      });
      expect(mockPrisma.nodeTask.upsert).toHaveBeenCalled();
      expect(result.oldType).toBe(NodeType.ORDINARY);
      expect(result.newType).toBe(NodeType.TASK);
    });

    it('should throw NotFoundException for non-existent node', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNodeType('non-existent', { type: NodeType.TASK })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateNodeProps', () => {
    it('should update task properties', async () => {
      const mockNode = {
        id: 'node-1',
        label: 'Task Node',
        type: NodeType.TASK,
        graphId: 'graph-1',
        x: 0,
        y: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const taskProps = {
        status: 'done' as const,
        priority: 'high' as const,
        assigneeId: 'user-1',
        dueDate: '2024-12-31T00:00:00.000Z',
      };
      const expectedTaskData = {
        status: 'done' as const,
        priority: 'high' as const,
        assigneeId: 'user-1',
        dueDate: new Date('2024-12-31T00:00:00.000Z'),
      };

      mockPrisma.node.findUnique.mockResolvedValue({
        ...mockNode,
        taskProps: { nodeId: 'node-1', ...taskProps },
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      });
      mockPrisma.nodeTask.upsert.mockResolvedValue({
        nodeId: 'node-1',
        ...taskProps,
      });

      const result = await service.updateNodeProps('node-1', {
        type: NodeType.TASK,
        props: taskProps,
      });

      expect(mockPrisma.nodeTask.upsert).toHaveBeenNthCalledWith(1, {
        where: { nodeId: 'node-1' },
        create: { nodeId: 'node-1', status: 'todo', priority: 'medium' },
        update: {},
      });
      expect(mockPrisma.nodeTask.upsert).toHaveBeenNthCalledWith(2, {
        where: { nodeId: 'node-1' },
        create: { nodeId: 'node-1', ...expectedTaskData },
        update: expectedTaskData,
      });
      expect(result.props).toMatchObject(taskProps);
    });

    it('should update requirement properties', async () => {
      const mockNode = {
        id: 'node-2',
        label: 'Requirement Node',
        type: NodeType.REQUIREMENT,
        graphId: 'graph-1',
        x: 0,
        y: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const reqProps = {
        reqType: 'functional',
        acceptanceCriteria: 'Test criteria',
        priority: 'must' as const,
      };

      mockPrisma.node.findUnique.mockResolvedValue({
        ...mockNode,
        taskProps: null,
        requirementProps: { nodeId: 'node-2', ...reqProps },
        pbsProps: null,
        dataProps: null,
      });
      mockPrisma.nodeRequirement.upsert.mockResolvedValue({
        nodeId: 'node-2',
        ...reqProps,
      });

      const result = await service.updateNodeProps('node-2', {
        type: NodeType.REQUIREMENT,
        props: reqProps as any,
      });

      expect(mockPrisma.nodeRequirement.upsert).toHaveBeenCalledWith({
        where: { nodeId: 'node-2' },
        create: { nodeId: 'node-2', ...reqProps },
        update: reqProps,
      });
      expect(result.props).toMatchObject(reqProps);
    });

    it('should throw NotFoundException for non-existent node', async () => {
      mockPrisma.node.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNodeProps('non-existent', {
          type: NodeType.TASK,
          props: { status: 'done' as const },
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateNode', () => {
    it('should update basic node properties', async () => {
      const mockNode = {
        id: 'node-1',
        label: 'Updated Node',
        type: NodeType.ORDINARY,
        graphId: 'graph-1',
        x: 100,
        y: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.node.update.mockResolvedValue(mockNode);
      mockPrisma.node.findUnique.mockResolvedValue({
        ...mockNode,
        taskProps: null,
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      });

      const result = await service.updateNode('node-1', {
        label: 'Updated Node',
        x: 100,
        y: 200,
      });

      expect(mockPrisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-1' },
        data: {
          label: 'Updated Node',
          x: 100,
          y: 200,
        },
      });
      expect(result.label).toBe('Updated Node');
    });
  });
});
