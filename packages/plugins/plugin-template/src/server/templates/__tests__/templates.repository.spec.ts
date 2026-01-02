/**
 * Story 5.1: Template Library
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
});
