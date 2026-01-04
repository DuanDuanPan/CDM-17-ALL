/**
 * Story 5.1: Template Library
 * Story 5.2: Subtree Template Save & Reuse
 * Unit tests for TemplatesRepository
 * Tests database access layer for templates
 */

import { TemplatesRepository } from '../templates.repository';
import { prisma, TemplateStatus } from '@cdm/database';

// Mock prisma
jest.mock('@cdm/database', () => ({
    prisma: {
        template: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            create: jest.fn(), // Story 5.2
        },
        templateCategory: {
            findMany: jest.fn(),
        },
        templateUsageLog: {
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    },
    TemplateStatus: {
        DRAFT: 'DRAFT',
        PUBLISHED: 'PUBLISHED',
        DEPRECATED: 'DEPRECATED',
    },
}));

describe('TemplatesRepository', () => {
    let repository: TemplatesRepository;
    const mockPrisma = prisma as jest.Mocked<typeof prisma>;

    beforeEach(() => {
        repository = new TemplatesRepository();
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        const mockTemplates = [
            {
                id: 'tpl-1',
                name: '敏捷研发管理',
                description: '适用于敏捷开发团队',
                thumbnail: null,
                defaultClassification: 'internal',
                usageCount: 42,
                version: 1,
                categoryId: 'cat-pm',
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01'),
                category: { name: '项目管理', icon: 'Kanban' },
            },
        ];

        // TC-REPO-1: findAll returns PUBLISHED templates by default
        it('TC-REPO-1: returns only PUBLISHED templates by default', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue(mockTemplates);

            await repository.findAll();

            expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: TemplateStatus.PUBLISHED,
                    }),
                })
            );
        });

        // TC-REPO-2: findAll supports categoryId filtering
        it('TC-REPO-2: filters by categoryId', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repository.findAll({ categoryId: 'cat-pm' });

            expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        categoryId: 'cat-pm',
                    }),
                })
            );
        });

        // TC-REPO-3: findAll supports search keyword matching
        it('TC-REPO-3: filters by search keyword in name and description', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repository.findAll({ search: 'agile' });

            expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { name: { contains: 'agile', mode: 'insensitive' } },
                            { description: { contains: 'agile', mode: 'insensitive' } },
                        ],
                    }),
                })
            );
        });

        it('transforms template data to TemplateListItem format', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue(mockTemplates);

            const result = await repository.findAll();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 'tpl-1',
                name: '敏捷研发管理',
                description: '适用于敏捷开发团队',
                thumbnail: null,
                defaultClassification: 'internal',
                usageCount: 42,
                version: 1,
                categoryId: 'cat-pm',
                categoryName: '项目管理',
                categoryIcon: 'Kanban',
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
            });
        });

        it('applies pagination with limit and offset', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repository.findAll({ limit: 10, offset: 20 });

            expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 10,
                    skip: 20,
                })
            );
        });

        it('orders results by usageCount desc, then name asc', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repository.findAll();

            expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
                })
            );
        });
    });

    describe('findById', () => {
        const mockTemplate = {
            id: 'tpl-1',
            name: '敏捷研发管理',
            description: '适用于敏捷开发团队',
            thumbnail: null,
            structure: { rootNode: { label: 'Root', children: [] } },
            defaultClassification: 'internal',
            requiredFields: ['executor'],
            status: 'PUBLISHED',
            version: 1,
            categoryId: 'cat-pm',
            creatorId: 'user-1',
            usageCount: 42,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
            category: {
                id: 'cat-pm',
                name: '项目管理',
                icon: 'Kanban',
                sortOrder: 1,
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01'),
            },
        };

        // TC-REPO-4: findById returns complete template structure
        it('TC-REPO-4: returns complete template with structure', async () => {
            (mockPrisma.template.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

            const result = await repository.findById('tpl-1');

            expect(mockPrisma.template.findUnique).toHaveBeenCalledWith({
                where: { id: 'tpl-1' },
                include: { category: true },
            });

            expect(result).not.toBeNull();
            expect(result?.structure).toEqual({ rootNode: { label: 'Root', children: [] } });
            expect(result?.category?.name).toBe('项目管理');
        });

        // TC-REPO-5: findById returns null when not found
        it('TC-REPO-5: returns null when template not found', async () => {
            (mockPrisma.template.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await repository.findById('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('findCategories', () => {
        const mockCategories = [
            { id: 'cat-pm', name: '项目管理', icon: 'Kanban', sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
            { id: 'cat-tech', name: '技术设计', icon: 'Code', sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
        ];

        it('returns all categories ordered by sortOrder', async () => {
            (mockPrisma.templateCategory.findMany as jest.Mock).mockResolvedValue(mockCategories);

            const result = await repository.findCategories();

            expect(mockPrisma.templateCategory.findMany).toHaveBeenCalledWith({
                orderBy: { sortOrder: 'asc' },
            });
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('项目管理');
        });
    });

    describe('logUsage', () => {
        // TC-REPO-6: logUsage increments usageCount and creates log
        it('TC-REPO-6: increments usageCount and creates usage log', async () => {
            (mockPrisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);
            (mockPrisma.templateUsageLog.create as jest.Mock).mockResolvedValue({});
            (mockPrisma.template.update as jest.Mock).mockResolvedValue({});

            await repository.logUsage('tpl-1', 'user-1', 'graph-1');

            expect(mockPrisma.$transaction).toHaveBeenCalledWith([
                expect.any(Promise), // templateUsageLog.create
                expect.any(Promise), // template.update
            ]);
        });
    });

    describe('count', () => {
        it('returns count of templates matching query', async () => {
            (mockPrisma.template.count as jest.Mock).mockResolvedValue(5);

            const result = await repository.count({ categoryId: 'cat-pm' });

            expect(mockPrisma.template.count).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    status: TemplateStatus.PUBLISHED,
                    categoryId: 'cat-pm',
                }),
            });
            expect(result).toBe(5);
        });
    });

    /**
     * Story 5.2: create and visibility tests
     */
    describe('create (Story 5.2)', () => {
        const mockStructure = {
            rootNode: {
                label: 'Root',
                _tempId: 'temp_root',
                children: [{ label: 'Child', _tempId: 'temp_child' }],
            },
        };

        const mockCreatedTemplate = {
            id: 'tpl-new-1',
            name: 'New Template',
            description: 'Test description',
            structure: mockStructure,
            creatorId: 'user-1',
            isPublic: true,
            status: 'PUBLISHED',
            version: 1,
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // TC-5.2-REPO-1: create inserts new template
        it('TC-5.2-REPO-1: creates a new template with required fields', async () => {
            (mockPrisma.template.create as jest.Mock).mockResolvedValue(mockCreatedTemplate);

            const result = await repository.create({
                name: 'New Template',
                description: 'Test description',
                structure: mockStructure,
                creatorId: 'user-1',
                isPublic: true,
            });

            expect(mockPrisma.template.create).toHaveBeenCalled();
            const callArgs = (mockPrisma.template.create as jest.Mock).mock.calls[0][0];
            expect(callArgs.data.name).toBe('New Template');
            expect(callArgs.data.description).toBe('Test description');
            expect(callArgs.data.creatorId).toBe('user-1');
            expect(callArgs.data.isPublic).toBe(true);
            expect(callArgs.data.status).toBe('PUBLISHED');
            expect(result.id).toBe('tpl-new-1');
        });

        // TC-5.2-REPO-2: create with categoryId
        it('TC-5.2-REPO-2: creates template with categoryId', async () => {
            (mockPrisma.template.create as jest.Mock).mockResolvedValue({
                ...mockCreatedTemplate,
                categoryId: 'cat-pm',
            });

            await repository.create({
                name: 'New Template',
                structure: mockStructure,
                creatorId: 'user-1',
                categoryId: 'cat-pm',
                isPublic: true,
            });

            expect(mockPrisma.template.create).toHaveBeenCalled();
            const callArgs = (mockPrisma.template.create as jest.Mock).mock.calls[0][0];
            expect(callArgs.data.categoryId).toBe('cat-pm');
        });
    });

    describe('findAll visibility filtering (Story 5.2)', () => {
        // TC-5.2-REPO-3: findAll with userId includes private templates of user
        it('TC-5.2-REPO-3: includes user private templates when userId provided', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repository.findAll({ userId: 'user-1' });

            expect(mockPrisma.template.findMany).toHaveBeenCalled();
            const callArgs = (mockPrisma.template.findMany as jest.Mock).mock.calls[0][0];
            // When userId is provided, should have OR condition for public OR owned by user
            expect(callArgs.where.OR).toBeDefined();
            expect(callArgs.where.OR).toContainEqual({ isPublic: true });
            expect(callArgs.where.OR).toContainEqual({ creatorId: 'user-1' });
        });

        // TC-5.2-REPO-4: findAll with mine=true returns only user's templates
        it('TC-5.2-REPO-4: returns only user templates when mine=true', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repository.findAll({ userId: 'user-1', mine: true });

            expect(mockPrisma.template.findMany).toHaveBeenCalled();
            const callArgs = (mockPrisma.template.findMany as jest.Mock).mock.calls[0][0];
            // When mine=true, should filter by creatorId only
            expect(callArgs.where.creatorId).toBe('user-1');
        });

        // TC-5.2-REPO-5: findAll without userId returns only public templates
        it('TC-5.2-REPO-5: returns only public templates when no userId', async () => {
            (mockPrisma.template.findMany as jest.Mock).mockResolvedValue([]);

            await repository.findAll({});

            expect(mockPrisma.template.findMany).toHaveBeenCalled();
            const callArgs = (mockPrisma.template.findMany as jest.Mock).mock.calls[0][0];
            // Without userId, should only return public templates
            expect(callArgs.where.isPublic).toBe(true);
        });
    });
});
