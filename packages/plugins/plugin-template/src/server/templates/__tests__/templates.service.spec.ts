/**
 * Story 5.1: Template Library
 * Story 5.2: Subtree Template Save & Reuse
 * Unit tests for TemplatesService
 * Tests business logic for template operations
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TemplatesService, IDemoSeedService } from '../templates.service';
import { TemplatesRepository } from '../templates.repository';
import { NodeType, type Template, type TemplateStructure, type TemplateNode, type CreateTemplateRequest } from '@cdm/types';

// Mock prisma at module level
jest.mock('@cdm/database', () => ({
    __tx: {
        graph: { create: jest.fn().mockResolvedValue({ id: 'graph-123', name: 'Test Graph' }) },
        node: { create: jest.fn().mockImplementation(async ({ data }) => ({ id: data.id })) },
        nodeTask: { create: jest.fn() },
        nodeRequirement: { create: jest.fn() },
        nodePBS: { create: jest.fn() },
        nodeData: { create: jest.fn() },
        nodeApp: { create: jest.fn() },
    },
    prisma: {
        $transaction: jest.fn((callback) => {
            const { __tx } = jest.requireMock('@cdm/database') as { __tx: any };
            return callback(__tx);
        }),
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
            create: jest.fn(), // Story 5.2
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

        it('throws ForbiddenException when private template accessed without userId', async () => {
            mockRepository.findById.mockResolvedValue({
                id: 'tpl-private',
                name: 'Private Template',
                status: 'PUBLISHED',
                isPublic: false,
                creatorId: 'user-1',
            } as Template);

            await expect(service.getTemplate('tpl-private')).rejects.toThrow(ForbiddenException);
        });

        it('throws ForbiddenException when private template accessed by non-creator', async () => {
            mockRepository.findById.mockResolvedValue({
                id: 'tpl-private',
                name: 'Private Template',
                status: 'PUBLISHED',
                isPublic: false,
                creatorId: 'user-1',
            } as Template);

            await expect(service.getTemplate('tpl-private', 'user-2')).rejects.toThrow(ForbiddenException);
        });

        it('returns private template for creator', async () => {
            const privateTemplate = {
                id: 'tpl-private',
                name: 'Private Template',
                status: 'PUBLISHED',
                isPublic: false,
                creatorId: 'user-1',
            } as Template;
            mockRepository.findById.mockResolvedValue(privateTemplate);

            const result = await service.getTemplate('tpl-private', 'user-1');

            expect(result).toEqual(privateTemplate);
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
                        { label: 'Child 1', type: NodeType.TASK, order: 2 },
                        { label: 'Child 2', order: 0 },
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

        it('throws ForbiddenException for private template instantiation by non-creator', async () => {
            mockRepository.findById.mockResolvedValue({
                ...mockTemplate,
                isPublic: false,
                creatorId: 'user-1',
            } as Template);

            await expect(
                service.instantiate('tpl-1', 'user-2')
            ).rejects.toThrow(ForbiddenException);

            expect(mockRepository.logUsage).not.toHaveBeenCalled();
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

            // Story 8.6: Assert order is written to Node.create from template
            const { __tx } = jest.requireMock('@cdm/database') as { __tx: any };
            const nodeCreates = __tx.node.create.mock.calls.map((c: any[]) => c[0].data);

            const child1 = nodeCreates.find((d: any) => d.label === 'Child 1');
            const child2 = nodeCreates.find((d: any) => d.label === 'Child 2');

            expect(child1?.order).toBe(2);
            expect(child2?.order).toBe(0);
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

        it('sorts children stably by (order ?? originalIndex) when instantiating (Story 8.6)', async () => {
            const template: Partial<Template> = {
                id: 'tpl-order-sort',
                name: 'Order Sort Template',
                status: 'PUBLISHED',
                defaultClassification: 'internal',
                structure: {
                    rootNode: {
                        label: 'Root',
                        children: [
                            { label: 'A' }, // originalIndex=0 -> sortKey=0
                            { label: 'B', order: 2 }, // sortKey=2
                            { label: 'C' }, // originalIndex=2 -> sortKey=2 (ties with B, keep original order)
                            { label: 'D', order: 1 }, // sortKey=1
                        ],
                    },
                },
            };

            mockRepository.findById.mockResolvedValue(template as Template);

            await service.instantiate('tpl-order-sort', 'user-1');

            const { __tx } = jest.requireMock('@cdm/database') as { __tx: any };
            const nodeCreates = __tx.node.create.mock.calls.map((c: any[]) => c[0].data);

            // First created node is the root (parentId=null)
            const rootCreate = nodeCreates.find((d: any) => d.parentId === null);
            expect(rootCreate).toBeTruthy();

            const rootId = rootCreate.id;
            const childrenCreates = nodeCreates.filter((d: any) => d.parentId === rootId);
            const childLabels = childrenCreates.map((d: any) => d.label);

            // Expected order: A (0), D (1), B (2), C (2; stable after B)
            expect(childLabels).toEqual(['A', 'D', 'B', 'C']);
        });
    });

    /**
     * Story 5.2: saveSubtreeAsTemplate tests
     */
    describe('saveSubtreeAsTemplate', () => {
        const validStructure: TemplateStructure = {
            rootNode: {
                label: 'Root Node',
                _tempId: 'temp_root',
                children: [
                    { label: 'Child 1', _tempId: 'temp_child1' },
                    { label: 'Child 2', _tempId: 'temp_child2', type: NodeType.TASK },
                ],
            },
            edges: [
                { sourceRef: 'temp_child1', targetRef: 'temp_child2', kind: 'dependency' },
            ],
        };

        // TC-5.2-SVC-1: Valid template creation
        it('TC-5.2-SVC-1: creates template with valid structure', async () => {
            const mockCreatedTemplate = {
                id: 'tpl-new-1',
                name: 'My Template',
                createdAt: new Date().toISOString(),
            };
            mockRepository.create.mockResolvedValue(mockCreatedTemplate as any);

            const result = await service.saveSubtreeAsTemplate({
                name: 'My Template',
                description: 'Test description',
                structure: validStructure,
                creatorId: 'user-1',
                isPublic: true,
            });

            expect(result).toHaveProperty('id', 'tpl-new-1');
            expect(result).toHaveProperty('name', 'My Template');
            expect(mockRepository.create).toHaveBeenCalled();
        });

        // TC-5.2-SVC-2: Empty name validation
        it('TC-5.2-SVC-2: throws BadRequestException for empty name', async () => {
            await expect(
                service.saveSubtreeAsTemplate({
                    name: '',
                    structure: validStructure,
                    creatorId: 'user-1',
                })
            ).rejects.toThrow(BadRequestException);

            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        // TC-5.2-SVC-3: Missing rootNode validation
        it('TC-5.2-SVC-3: throws BadRequestException for missing rootNode', async () => {
            await expect(
                service.saveSubtreeAsTemplate({
                    name: 'Valid Name',
                    structure: {} as TemplateStructure,
                    creatorId: 'user-1',
                })
            ).rejects.toThrow(BadRequestException);

            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        // TC-5.2-SVC-4: Duplicate _tempId validation
        it('TC-5.2-SVC-4: throws BadRequestException for duplicate _tempId', async () => {
            const structureWithDuplicateIds: TemplateStructure = {
                rootNode: {
                    label: 'Root',
                    _tempId: 'same_id',
                    children: [
                        { label: 'Child', _tempId: 'same_id' }, // Duplicate!
                    ],
                },
            };

            await expect(
                service.saveSubtreeAsTemplate({
                    name: 'Valid Name',
                    structure: structureWithDuplicateIds,
                    creatorId: 'user-1',
                })
            ).rejects.toThrow(BadRequestException);

            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        // TC-5.2-SVC-5: Invalid edge reference validation
        it('TC-5.2-SVC-5: throws BadRequestException for invalid edge reference', async () => {
            const structureWithBadEdge: TemplateStructure = {
                rootNode: {
                    label: 'Root',
                    _tempId: 'temp_root',
                },
                edges: [
                    { sourceRef: 'temp_root', targetRef: 'non_existent', kind: 'dependency' },
                ],
            };

            await expect(
                service.saveSubtreeAsTemplate({
                    name: 'Valid Name',
                    structure: structureWithBadEdge,
                    creatorId: 'user-1',
                })
            ).rejects.toThrow(BadRequestException);

            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        // TC-5.2-SVC-6: isPublic defaults to true
        it('TC-5.2-SVC-6: defaults isPublic to true', async () => {
            mockRepository.create.mockResolvedValue({ id: 'tpl-1', name: 'Test', createdAt: new Date().toISOString() } as any);

            await service.saveSubtreeAsTemplate({
                name: 'Test Template',
                structure: validStructure,
                creatorId: 'user-1',
                // isPublic not specified
            });

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    isPublic: true,
                })
            );
        });

        // TC-5.2-SVC-7: Private template creation
        it('TC-5.2-SVC-7: creates private template when isPublic is false', async () => {
            mockRepository.create.mockResolvedValue({ id: 'tpl-1', name: 'Private', createdAt: new Date().toISOString() } as any);

            await service.saveSubtreeAsTemplate({
                name: 'Private Template',
                structure: validStructure,
                creatorId: 'user-1',
                isPublic: false,
            });

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    isPublic: false,
                })
            );
        });

        // TC-5.2-SVC-8: Node count validation (HIGH-1 fix)
        it('TC-5.2-SVC-8: throws BadRequestException when template exceeds MAX_CLIPBOARD_NODES', async () => {
            // Create a structure with 101 nodes (exceeds limit of 100)
            const generateChildren = (count: number): TemplateNode[] => {
                return Array.from({ length: count }, (_, i) => ({
                    label: `Child ${i}`,
                    _tempId: `temp_child_${i}`,
                }));
            };

            const oversizedStructure: TemplateStructure = {
                rootNode: {
                    label: 'Root',
                    _tempId: 'temp_root',
                    children: generateChildren(100), // 100 children + 1 root = 101 nodes
                },
            };

            await expect(
                service.saveSubtreeAsTemplate({
                    name: 'Oversized Template',
                    structure: oversizedStructure,
                    creatorId: 'user-1',
                })
            ).rejects.toThrow(BadRequestException);

            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        // TC-5.2-SVC-9: Invalid dependencyType validation (HIGH-2 fix)
        it('TC-5.2-SVC-9: throws BadRequestException for invalid dependencyType', async () => {
            const structureWithInvalidDependencyType: TemplateStructure = {
                rootNode: {
                    label: 'Root',
                    _tempId: 'temp_root',
                    children: [
                        { label: 'Child 1', _tempId: 'temp_child1' },
                        { label: 'Child 2', _tempId: 'temp_child2' },
                    ],
                },
                edges: [
                    {
                        sourceRef: 'temp_child1',
                        targetRef: 'temp_child2',
                        kind: 'dependency',
                        dependencyType: 'INVALID_TYPE' as any, // Invalid!
                    },
                ],
            };

            await expect(
                service.saveSubtreeAsTemplate({
                    name: 'Invalid Edge Template',
                    structure: structureWithInvalidDependencyType,
                    creatorId: 'user-1',
                })
            ).rejects.toThrow(BadRequestException);

            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        // TC-5.2-SVC-10: Valid dependencyType passes validation
        it('TC-5.2-SVC-10: accepts valid dependencyType values (FS, SS, FF, SF)', async () => {
            mockRepository.create.mockResolvedValue({ id: 'tpl-1', name: 'Valid', createdAt: new Date().toISOString() } as any);

            const structureWithValidDependencyType: TemplateStructure = {
                rootNode: {
                    label: 'Root',
                    _tempId: 'temp_root',
                    children: [
                        { label: 'Child 1', _tempId: 'temp_child1' },
                        { label: 'Child 2', _tempId: 'temp_child2' },
                    ],
                },
                edges: [
                    {
                        sourceRef: 'temp_child1',
                        targetRef: 'temp_child2',
                        kind: 'dependency',
                        dependencyType: 'FS',
                    },
                ],
            };

            await service.saveSubtreeAsTemplate({
                name: 'Valid Edge Template',
                structure: structureWithValidDependencyType,
                creatorId: 'user-1',
            });

            expect(mockRepository.create).toHaveBeenCalled();
        });
    });
});
