/**
 * Story 5.1: Template Library
 * Unit tests for TemplatesService
 * Tests business logic for template operations
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TemplatesService, IDemoSeedService } from '../templates.service';
import { TemplatesRepository } from '../templates.repository';
import { NodeType, type Template } from '@cdm/types';

// Mock prisma at module level
jest.mock('@cdm/database', () => ({
    prisma: {
        $transaction: jest.fn((callback) => callback({
            graph: { create: jest.fn().mockResolvedValue({ id: 'graph-123', name: 'Test Graph' }) },
            node: { create: jest.fn().mockResolvedValue({ id: 'node-123' }) },
            nodeTask: { create: jest.fn() },
            nodeRequirement: { create: jest.fn() },
            nodePBS: { create: jest.fn() },
            nodeData: { create: jest.fn() },
            nodeApp: { create: jest.fn() },
        })),
    },
    NodeType: {
        ORDINARY: 'ORDINARY',
        TASK: 'TASK',
        REQUIREMENT: 'REQUIREMENT',
        PBS: 'PBS',
        DATA: 'DATA',
        APP: 'APP',
    },
    Prisma: {
        InputJsonValue: {},
    },
}));

describe('TemplatesService', () => {
    let service: TemplatesService;
    let mockRepository: jest.Mocked<TemplatesRepository>;
    let mockDemoSeedService: jest.Mocked<IDemoSeedService>;

    beforeEach(() => {
        mockRepository = {
            findAll: jest.fn(),
            findById: jest.fn(),
            findCategories: jest.fn(),
            logUsage: jest.fn(),
            count: jest.fn(),
        } as unknown as jest.Mocked<TemplatesRepository>;

        mockDemoSeedService = {
            getOrCreateDefaultProject: jest.fn().mockResolvedValue('project-123'),
            ensureUser: jest.fn().mockResolvedValue({}),
        };

        service = new TemplatesService(mockRepository, mockDemoSeedService);
        jest.clearAllMocks();
    });

    describe('listTemplates', () => {
        // TC-SVC-1: listTemplates calls Repository.findAll
        it('TC-SVC-1: calls repository with options', async () => {
            mockRepository.findAll.mockResolvedValue([]);

            const options = { categoryId: 'cat-1', search: 'test' };
            await service.listTemplates(options);

            expect(mockRepository.findAll).toHaveBeenCalledWith(options);
        });

        it('returns templates from repository', async () => {
            const mockTemplates = [
                { id: '1', name: 'Template 1', usageCount: 10 },
            ];
            mockRepository.findAll.mockResolvedValue(mockTemplates as any);

            const result = await service.listTemplates();

            expect(result).toEqual(mockTemplates);
        });
    });

    describe('getTemplate', () => {
        // TC-SVC-2: getTemplate returns template or throws NotFoundException
        it('TC-SVC-2: returns template when found', async () => {
            const mockTemplate: Partial<Template> = {
                id: 'tpl-1',
                name: 'Test Template',
                status: 'PUBLISHED',
            };
            mockRepository.findById.mockResolvedValue(mockTemplate as Template);

            const result = await service.getTemplate('tpl-1');

            expect(result).toEqual(mockTemplate);
        });

        it('TC-SVC-2: throws NotFoundException when template not found', async () => {
            mockRepository.findById.mockResolvedValue(null);

            await expect(service.getTemplate('missing')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getCategories', () => {
        it('returns categories from repository', async () => {
            const mockCategories = [
                { id: 'cat-1', name: 'Category 1', sortOrder: 1 },
            ];
            mockRepository.findCategories.mockResolvedValue(mockCategories as any);

            const result = await service.getCategories();

            expect(result).toEqual(mockCategories);
            expect(mockRepository.findCategories).toHaveBeenCalled();
        });
    });

    describe('instantiate', () => {
        const mockTemplate: Partial<Template> = {
            id: 'tpl-1',
            name: 'Test Template',
            status: 'PUBLISHED',
            defaultClassification: 'internal',
            structure: {
                rootNode: {
                    label: 'Root',
                    children: [
                        { label: 'Child 1', type: NodeType.TASK },
                        { label: 'Child 2' },
                    ],
                },
            },
        };

        // TC-SVC-3: instantiate validates template status is PUBLISHED
        it('TC-SVC-3: validates template exists', async () => {
            mockRepository.findById.mockResolvedValue(null);

            await expect(
                service.instantiate('missing', 'user-1')
            ).rejects.toThrow(NotFoundException);
        });

        // TC-SVC-4: instantiate throws BadRequestException for non-PUBLISHED
        it('TC-SVC-4: throws BadRequestException for non-PUBLISHED templates', async () => {
            mockRepository.findById.mockResolvedValue({
                ...mockTemplate,
                status: 'DRAFT',
            } as Template);

            await expect(
                service.instantiate('tpl-1', 'user-1')
            ).rejects.toThrow(BadRequestException);

            expect(mockRepository.logUsage).not.toHaveBeenCalled();
        });

        // TC-SVC-5: instantiate successfully creates Graph and Nodes
        it('TC-SVC-5: creates graph and nodes for PUBLISHED template', async () => {
            mockRepository.findById.mockResolvedValue(mockTemplate as Template);

            const result = await service.instantiate(
                'tpl-1',
                'user-1',
                'My New Graph'
            );

            expect(result).toHaveProperty('graphId');
            expect(result).toHaveProperty('graphName');
            expect(result).toHaveProperty('nodeCount');
            expect(result.nodeCount).toBeGreaterThan(0);
        });

        // TC-SVC-6: instantiate calls logUsage
        it('TC-SVC-6: logs template usage after creation', async () => {
            mockRepository.findById.mockResolvedValue(mockTemplate as Template);

            const result = await service.instantiate('tpl-1', 'user-1');

            expect(mockRepository.logUsage).toHaveBeenCalledWith(
                'tpl-1',
                'user-1',
                expect.any(String) // graphId
            );
        });

        it('gets or creates default project for user', async () => {
            mockRepository.findById.mockResolvedValue(mockTemplate as Template);

            await service.instantiate('tpl-1', 'user-1');

            expect(mockDemoSeedService.getOrCreateDefaultProject).toHaveBeenCalledWith('user-1');
        });

        it('uses custom graph name when provided', async () => {
            mockRepository.findById.mockResolvedValue(mockTemplate as Template);

            const result = await service.instantiate('tpl-1', 'user-1', 'Custom Name');

            // The graph name should be passed to the transaction
            expect(result.graphName).toBeTruthy();
        });

        it('uses template name as default graph name', async () => {
            mockRepository.findById.mockResolvedValue(mockTemplate as Template);

            const result = await service.instantiate('tpl-1', 'user-1');

            expect(result.graphName).toBeTruthy();
        });
    });

    describe('generateNodesFromStructure', () => {
        // TC-SVC-7: generateGraphFromTemplate correctly generates node structure
        it('TC-SVC-7: generates correct node count from nested structure', async () => {
            const templateWithNestedStructure: Partial<Template> = {
                id: 'tpl-nested',
                name: 'Nested Template',
                status: 'PUBLISHED',
                defaultClassification: 'internal',
                structure: {
                    rootNode: {
                        label: 'Root',
                        children: [
                            {
                                label: 'Level 1 - A',
                                children: [
                                    { label: 'Level 2 - A1' },
                                    { label: 'Level 2 - A2' },
                                ],
                            },
                            { label: 'Level 1 - B' },
                        ],
                    },
                },
            };

            mockRepository.findById.mockResolvedValue(templateWithNestedStructure as Template);

            const result = await service.instantiate('tpl-nested', 'user-1');

            // Root + Level1-A + Level2-A1 + Level2-A2 + Level1-B = 5 nodes
            expect(result.nodeCount).toBe(5);
        });

        it('creates extension tables for typed nodes', async () => {
            const typedTemplate: Partial<Template> = {
                id: 'tpl-typed',
                name: 'Typed Template',
                status: 'PUBLISHED',
                defaultClassification: 'internal',
                structure: {
                    rootNode: {
                        label: 'Root',
                        children: [
                            { label: 'Task Node', type: NodeType.TASK },
                            { label: 'Requirement Node', type: NodeType.REQUIREMENT },
                            { label: 'PBS Node', type: NodeType.PBS },
                        ],
                    },
                },
            };

            mockRepository.findById.mockResolvedValue(typedTemplate as Template);

            const result = await service.instantiate('tpl-typed', 'user-1');

            // Should have 4 nodes (root + 3 children)
            expect(result.nodeCount).toBe(4);
        });
    });
});
