/**
 * Story 2.1: NodesService Unit Tests
 * Tests for repository-driven polymorphic node type management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NodeType } from '@cdm/types';
import { NodesService } from './nodes.service';
import { NodeRepository } from './repositories/node.repository';
import { TaskService } from './services/task.service';
import { RequirementService } from './services/requirement.service';
import { PBSService } from './services/pbs.service';
import { DataService } from './services/data.service';

describe('NodesService', () => {
  let service: NodesService;
  const mockNodeRepo = {
    findById: jest.fn(),
    findByIdWithProps: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const mockTaskService = { initialize: jest.fn(), upsertProps: jest.fn() };
  const mockRequirementService = { initialize: jest.fn(), upsertProps: jest.fn() };
  const mockPBSService = { initialize: jest.fn(), upsertProps: jest.fn() };
  const mockDataService = { initialize: jest.fn(), upsertProps: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        { provide: NodeRepository, useValue: mockNodeRepo },
        { provide: TaskService, useValue: mockTaskService },
        { provide: RequirementService, useValue: mockRequirementService },
        { provide: PBSService, useValue: mockPBSService },
        { provide: DataService, useValue: mockDataService },
      ],
    }).compile();

    service = module.get<NodesService>(NodesService);
    jest.clearAllMocks();
  });

  describe('createNode', () => {
    it('creates ordinary node with default creator name', async () => {
      const mockNode = {
        id: 'node-1',
        label: 'Test Node',
        type: NodeType.ORDINARY,
        graphId: 'graph-1',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        creatorName: 'Mock User',
        createdAt: new Date(),
        updatedAt: new Date(),
        taskProps: null,
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      };

      mockNodeRepo.create.mockResolvedValue(mockNode);
      mockNodeRepo.findByIdWithProps.mockResolvedValue(mockNode);

      const result = await service.createNode({
        label: 'Test Node',
        graphId: 'graph-1',
      });

      expect(mockNodeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Test Node',
          type: NodeType.ORDINARY,
          graphId: 'graph-1',
          creatorName: 'Mock User',
        })
      );
      expect(result.creator).toBe('Mock User');
    });
  });

  describe('getNodeWithProps', () => {
    it('returns task properties', async () => {
      const mockNode = {
        id: 'node-1',
        label: 'Task Node',
        type: NodeType.TASK,
        graphId: 'graph-1',
        x: 0,
        y: 0,
        width: 160,
        height: 50,
        creatorName: 'Mock User',
        createdAt: new Date(),
        updatedAt: new Date(),
        taskProps: { nodeId: 'node-1', status: 'in-progress', priority: 'high' },
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      };

      mockNodeRepo.findByIdWithProps.mockResolvedValue(mockNode);

      const result = await service.getNodeWithProps('node-1');

      expect(result.type).toBe(NodeType.TASK);
      expect(result.props).toMatchObject({ status: 'in-progress', priority: 'high' });
    });

    it('throws when node missing', async () => {
      mockNodeRepo.findByIdWithProps.mockResolvedValue(null);
      await expect(service.getNodeWithProps('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateNodeType', () => {
    it('updates type and initializes extension', async () => {
      const existing = {
        id: 'node-1',
        type: NodeType.ORDINARY,
      };
      const updated = {
        ...existing,
        type: NodeType.TASK,
        label: 'Test',
        graphId: 'graph-1',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        creatorName: 'Mock User',
        createdAt: new Date(),
        updatedAt: new Date(),
        taskProps: { nodeId: 'node-1', status: 'todo', priority: 'medium' },
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      };

      mockNodeRepo.findById.mockResolvedValue(existing);
      mockNodeRepo.update.mockResolvedValue(updated);
      mockNodeRepo.findByIdWithProps.mockResolvedValue(updated);

      const result = await service.updateNodeType('node-1', { type: NodeType.TASK });

      expect(mockTaskService.initialize).toHaveBeenCalledWith('node-1');
      expect(result.oldType).toBe(NodeType.ORDINARY);
      expect(result.newType).toBe(NodeType.TASK);
    });
  });

  describe('updateNodeProps', () => {
    it('rejects mismatched type', async () => {
      mockNodeRepo.findById.mockResolvedValue({ id: 'node-1', type: NodeType.TASK });
      await expect(
        service.updateNodeProps('node-1', { type: NodeType.PBS, props: { code: 'PBS-1' } })
      ).rejects.toThrow(BadRequestException);
    });

    it('updates task props when type matches', async () => {
      mockNodeRepo.findById.mockResolvedValue({ id: 'node-1', type: NodeType.TASK });
      mockNodeRepo.findByIdWithProps.mockResolvedValue({
        id: 'node-1',
        label: 'Task',
        type: NodeType.TASK,
        graphId: 'graph-1',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        creatorName: 'Mock User',
        createdAt: new Date(),
        updatedAt: new Date(),
        taskProps: { nodeId: 'node-1', status: 'done' },
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      });

      await service.updateNodeProps('node-1', {
        type: NodeType.TASK,
        props: { status: 'done' },
      });

      expect(mockTaskService.upsertProps).toHaveBeenCalled();
    });
  });

  describe('updateNode', () => {
    it('updates basic fields', async () => {
      mockNodeRepo.update.mockResolvedValue({ id: 'node-1' });
      mockNodeRepo.findByIdWithProps.mockResolvedValue({
        id: 'node-1',
        label: 'Updated',
        type: NodeType.ORDINARY,
        graphId: 'graph-1',
        x: 10,
        y: 20,
        width: 120,
        height: 40,
        creatorName: 'Mock User',
        createdAt: new Date(),
        updatedAt: new Date(),
        taskProps: null,
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
      });

      const result = await service.updateNode('node-1', { label: 'Updated', x: 10, y: 20 });

      expect(mockNodeRepo.update).toHaveBeenCalledWith('node-1', {
        label: 'Updated',
        x: 10,
        y: 20,
      });
      expect(result.label).toBe('Updated');
    });
  });
});
