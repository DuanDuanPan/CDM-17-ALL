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
import { AppService } from './services/app.service'; // Story 2.9
import { APP_EXECUTOR_SERVICE } from './nodes.service';

describe('NodesService', () => {
  let service: NodesService;
  const mockNodeRepo = {
    findById: jest.fn(),
    findByIdWithProps: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    search: jest.fn(),   // Story 2.7: Added for hardDelete tests
    delete: jest.fn(),   // Story 2.7: Added for hardDelete tests
  };
  const mockTaskService = { initialize: jest.fn(), upsertProps: jest.fn() };
  const mockRequirementService = { initialize: jest.fn(), upsertProps: jest.fn() };
  const mockPBSService = { initialize: jest.fn(), upsertProps: jest.fn() };
  const mockDataService = { initialize: jest.fn(), upsertProps: jest.fn() };
  const mockAppService = { initialize: jest.fn(), upsertProps: jest.fn(), getProps: jest.fn() }; // Story 2.9
  const mockAppExecutor = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        { provide: NodeRepository, useValue: mockNodeRepo },
        { provide: TaskService, useValue: mockTaskService },
        { provide: RequirementService, useValue: mockRequirementService },
        { provide: PBSService, useValue: mockPBSService },
        { provide: DataService, useValue: mockDataService },
        { provide: AppService, useValue: mockAppService }, // Story 2.9
        { provide: APP_EXECUTOR_SERVICE, useValue: mockAppExecutor },
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
        appProps: null, // Story 2.9
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
        appProps: null, // Story 2.9
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
        appProps: null, // Story 2.9
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
        appProps: null, // Story 2.9
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
        appProps: null, // Story 2.9
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

  // ============================
  // Story 2.7: Hard Delete Tests
  // ============================
  describe('hardDelete', () => {
    it('throws when node not found', async () => {
      mockNodeRepo.findById.mockResolvedValue(null);
      await expect(service.hardDelete('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes single node without children', async () => {
      const mockNode = { id: 'node-1', graphId: 'graph-1' };
      mockNodeRepo.findById.mockResolvedValue(mockNode);
      mockNodeRepo.search.mockResolvedValue({ results: [], total: 0 });
      mockNodeRepo.delete = jest.fn().mockResolvedValue(undefined);

      const result = await service.hardDelete('node-1');

      expect(mockNodeRepo.delete).toHaveBeenCalledWith('node-1');
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
    });

    it('deletes node with all descendants', async () => {
      const mockNode = { id: 'parent-1', graphId: 'graph-1' };
      const mockChildren = [
        { id: 'child-1', parentId: 'parent-1', graphId: 'graph-1', graph: { id: 'graph-1', name: 'Test' } },
        { id: 'child-2', parentId: 'parent-1', graphId: 'graph-1', graph: { id: 'graph-1', name: 'Test' } },
      ];
      const mockGrandchildren = [
        { id: 'grandchild-1', parentId: 'child-1', graphId: 'graph-1', graph: { id: 'graph-1', name: 'Test' } },
      ];

      mockNodeRepo.findById.mockResolvedValue(mockNode);
      // First call returns children of parent-1, second call for child-1 returns grandchild, others return empty
      mockNodeRepo.search
        .mockResolvedValueOnce({ results: [...mockChildren, ...mockGrandchildren], total: 3 })
        .mockResolvedValueOnce({ results: [...mockChildren, ...mockGrandchildren], total: 3 })
        .mockResolvedValueOnce({ results: [...mockChildren, ...mockGrandchildren], total: 3 })
        .mockResolvedValueOnce({ results: [...mockChildren, ...mockGrandchildren], total: 3 });
      mockNodeRepo.delete = jest.fn().mockResolvedValue(undefined);

      const result = await service.hardDelete('parent-1');

      expect(result.success).toBe(true);
      // Should delete parent + 2 children + 1 grandchild = 4 nodes
      expect(result.deletedCount).toBeGreaterThanOrEqual(1);
      expect(mockNodeRepo.delete).toHaveBeenCalled();
    });
  });

  // ============================
  // Story 2.9: APP Node Tests
  // ============================
  describe('APP Node Type (Story 2.9)', () => {
    it('initializes APP extension when type changes to APP', async () => {
      const existing = {
        id: 'node-1',
        type: NodeType.ORDINARY,
      };
      const updated = {
        ...existing,
        type: NodeType.APP,
        label: 'App Node',
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
        appProps: { nodeId: 'node-1', appSourceType: 'library', executionStatus: 'idle' },
      };

      mockNodeRepo.findById.mockResolvedValue(existing);
      mockNodeRepo.update.mockResolvedValue(updated);
      mockNodeRepo.findByIdWithProps.mockResolvedValue(updated);

      const result = await service.updateNodeType('node-1', { type: NodeType.APP });

      expect(mockAppService.initialize).toHaveBeenCalledWith('node-1');
      expect(result.oldType).toBe(NodeType.ORDINARY);
      expect(result.newType).toBe(NodeType.APP);
    });

    it('returns APP props when getting node with props', async () => {
      const mockAppNode = {
        id: 'node-1',
        label: 'Industrial App',
        type: NodeType.APP,
        graphId: 'graph-1',
        x: 100,
        y: 200,
        width: 120,
        height: 50,
        creatorName: 'Mock User',
        createdAt: new Date(),
        updatedAt: new Date(),
        taskProps: null,
        requirementProps: null,
        pbsProps: null,
        dataProps: null,
        appProps: {
          nodeId: 'node-1',
          appSourceType: 'library',
          libraryAppId: 'app-001',
          libraryAppName: 'CFD Solver',
          executionStatus: 'success',
          inputs: [{ id: 'i1', key: 'mesh', type: 'file', label: 'Mesh File' }],
          outputs: [{ id: 'o1', key: 'result', type: 'file', label: 'Result' }],
        },
      };

      mockNodeRepo.findByIdWithProps.mockResolvedValue(mockAppNode);

      const result = await service.getNodeWithProps('node-1');

      expect(result.type).toBe(NodeType.APP);
      expect(result.props).toMatchObject({
        appSourceType: 'library',
        libraryAppId: 'app-001',
        libraryAppName: 'CFD Solver',
        executionStatus: 'success',
      });
    });

    it('upserts APP props correctly', async () => {
      mockNodeRepo.findById.mockResolvedValue({
        id: 'node-1',
        type: NodeType.APP,
      });
      mockNodeRepo.findByIdWithProps.mockResolvedValue({
        id: 'node-1',
        label: 'App Node',
        type: NodeType.APP,
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
        appProps: {
          nodeId: 'node-1',
          appSourceType: 'library',
          libraryAppId: 'app-002',
          executionStatus: 'running',
        },
      });

      await service.updateNodeProps('node-1', {
        type: NodeType.APP,
        props: {
          appSourceType: 'library',
          libraryAppId: 'app-002',
          executionStatus: 'running',
        },
      });

      expect(mockAppService.upsertProps).toHaveBeenCalled();
    });
  });
});
