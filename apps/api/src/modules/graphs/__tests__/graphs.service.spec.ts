/**
 * Story 10.1: GraphsService Unit Tests
 * Tests GraphsService with mocked GraphRepository and DemoSeedService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GraphsService } from '../graphs.service';
import { GraphRepository } from '../graph.repository';
import { DemoSeedService } from '../../../demo/demo-seed.service';

describe('GraphsService', () => {
    let service: GraphsService;
    let mockGraphRepository: jest.Mocked<GraphRepository>;
    let mockDemoSeedService: jest.Mocked<Pick<DemoSeedService, 'getOrCreateDefaultProject' | 'ensureUser'>>;

    // Mock data
    const mockUserId = 'user-123';
    const mockProjectId = 'project-456';
    const mockGraphId = 'graph-789';

    const mockGraphWithProject = {
        id: mockGraphId,
        name: 'Test Graph',
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: mockProjectId,
        yjsState: null,
        project: {
            id: mockProjectId,
            name: 'Test Project',
            ownerId: mockUserId,
        },
    };

    const mockGraphList = [
        {
            ...mockGraphWithProject,
            _count: { nodes: 5, edges: 3 },
        },
    ];

    beforeEach(async () => {
        // Create mocks with proper typing
        mockGraphRepository = {
            create: jest.fn(),
            findByUserId: jest.fn(),
            findOneWithProject: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn(),
            findById: jest.fn(),
            findGraphWithRelations: jest.fn(),
            updateYjsState: jest.fn(),
            upsertNodesBatch: jest.fn(),
        } as jest.Mocked<GraphRepository>;

        mockDemoSeedService = {
            getOrCreateDefaultProject: jest.fn(),
            ensureUser: jest.fn(),
        } as jest.Mocked<Pick<DemoSeedService, 'getOrCreateDefaultProject' | 'ensureUser'>>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GraphsService,
                { provide: GraphRepository, useValue: mockGraphRepository },
                { provide: DemoSeedService, useValue: mockDemoSeedService },
            ],
        }).compile();

        service = module.get<GraphsService>(GraphsService);
    });

    describe('create', () => {
        it('should create a graph using the repository', async () => {
            mockDemoSeedService.getOrCreateDefaultProject.mockResolvedValue(mockProjectId);
            mockGraphRepository.create.mockResolvedValue(mockGraphWithProject);

            const result = await service.create({ userId: mockUserId, name: 'New Graph' });

            expect(mockDemoSeedService.getOrCreateDefaultProject).toHaveBeenCalledWith(mockUserId);
            expect(mockGraphRepository.create).toHaveBeenCalledWith({
                name: 'New Graph',
                projectId: mockProjectId,
            });
            expect(result.id).toBe(mockGraphId);
        });

        it('should use default name if not provided', async () => {
            mockDemoSeedService.getOrCreateDefaultProject.mockResolvedValue(mockProjectId);
            mockGraphRepository.create.mockResolvedValue(mockGraphWithProject);

            await service.create({ userId: mockUserId });

            expect(mockGraphRepository.create).toHaveBeenCalledWith({
                name: '新建图谱',
                projectId: mockProjectId,
            });
        });
    });

    describe('findByUser', () => {
        it('should find graphs by user ID using the repository', async () => {
            mockDemoSeedService.ensureUser.mockResolvedValue({ id: mockUserId, email: 'test@test.com', name: 'Test User', createdAt: new Date(), updatedAt: new Date() } as never);
            mockGraphRepository.findByUserId.mockResolvedValue(mockGraphList);

            const result = await service.findByUser(mockUserId);

            expect(mockDemoSeedService.ensureUser).toHaveBeenCalledWith(mockUserId);
            expect(mockGraphRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
            expect(result).toHaveLength(1);
            expect(result[0]._count.nodes).toBe(5);
        });
    });

    describe('findOne', () => {
        it('should find a single graph using the repository', async () => {
            mockGraphRepository.findOneWithProject.mockResolvedValue(mockGraphWithProject);

            const result = await service.findOne(mockGraphId);

            expect(mockGraphRepository.findOneWithProject).toHaveBeenCalledWith(mockGraphId);
            expect(result.id).toBe(mockGraphId);
        });

        it('should throw NotFoundException when graph not found', async () => {
            mockGraphRepository.findOneWithProject.mockResolvedValue(null);

            await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update graph using the repository', async () => {
            const updatedGraph = { ...mockGraphWithProject, name: 'Updated Graph' };
            mockGraphRepository.findOneWithProject.mockResolvedValue(mockGraphWithProject);
            mockGraphRepository.update.mockResolvedValue(updatedGraph);

            const result = await service.update(mockGraphId, mockUserId, { name: 'Updated Graph' });

            expect(mockGraphRepository.update).toHaveBeenCalledWith(mockGraphId, { name: 'Updated Graph' });
            expect(result.name).toBe('Updated Graph');
        });

        it('should throw ForbiddenException when user does not own graph', async () => {
            mockGraphRepository.findOneWithProject.mockResolvedValue({
                ...mockGraphWithProject,
                project: { ...mockGraphWithProject.project, ownerId: 'other-user' },
            });

            await expect(service.update(mockGraphId, mockUserId, { name: 'New Name' })).rejects.toThrow(ForbiddenException);
        });
    });

    describe('remove', () => {
        it('should delete graph using the repository', async () => {
            mockGraphRepository.findOneWithProject.mockResolvedValue(mockGraphWithProject);
            mockGraphRepository.delete.mockResolvedValue(undefined);

            const result = await service.remove(mockGraphId, mockUserId);

            expect(mockGraphRepository.delete).toHaveBeenCalledWith(mockGraphId);
            expect(result.message).toBe('Graph deleted successfully');
        });

        it('should throw ForbiddenException when user does not own graph', async () => {
            mockGraphRepository.findOneWithProject.mockResolvedValue({
                ...mockGraphWithProject,
                project: { ...mockGraphWithProject.project, ownerId: 'other-user' },
            });

            await expect(service.remove(mockGraphId, mockUserId)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('exists', () => {
        it('should check graph existence using the repository', async () => {
            mockGraphRepository.exists.mockResolvedValue(true);

            const result = await service.exists(mockGraphId);

            expect(mockGraphRepository.exists).toHaveBeenCalledWith(mockGraphId);
            expect(result).toBe(true);
        });

        it('should return false when graph does not exist', async () => {
            mockGraphRepository.exists.mockResolvedValue(false);

            const result = await service.exists('non-existent');

            expect(result).toBe(false);
        });
    });
});
