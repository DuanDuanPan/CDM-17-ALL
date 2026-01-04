/**
 * Story 5.1: Template Library
 * Story 5.2: Subtree Template Save & Reuse
 * Templates Repository - Database access layer for templates
 */

import { Injectable } from '@nestjs/common';
import { prisma, Prisma, TemplateStatus } from '@cdm/database';
import type {
    TemplateListItem,
    Template,
    TemplateCategory,
    TemplateQueryOptions,
    TemplateStructure,
    CreateTemplateRequest,
} from '@cdm/types';

@Injectable()
export class TemplatesRepository {
    /**
     * Find all published templates with optional filtering
     * Story 5.2: Added userId/mine support for visibility control
     */
    async findAll(options?: TemplateQueryOptions): Promise<TemplateListItem[]> {
        const { categoryId, search, status, limit = 50, offset = 0, userId, mine } = options || {};

        // Build where clause
        const where: Prisma.TemplateWhereInput = {
            status: (status as TemplateStatus) || TemplateStatus.PUBLISHED,
        };

        if (categoryId) {
            where.categoryId = categoryId;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Story 5.2: Visibility filtering
        if (mine && userId) {
            // Filter to only user's own templates
            where.creatorId = userId;
        } else if (userId) {
            // Show public templates OR user's own private templates
            where.OR = where.OR
                ? [
                      ...where.OR.map((cond) => ({ ...cond, isPublic: true })),
                      ...where.OR.map((cond) => ({ ...cond, creatorId: userId })),
                  ]
                : [{ isPublic: true }, { creatorId: userId }];
        } else {
            // No userId provided: only show public templates
            where.isPublic = true;
        }

        const templates = await prisma.template.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                thumbnail: true,
                defaultClassification: true,
                usageCount: true,
                version: true,
                categoryId: true,
                creatorId: true, // Story 5.2
                isPublic: true, // Story 5.2
                createdAt: true,
                updatedAt: true,
                category: {
                    select: {
                        name: true,
                        icon: true,
                    },
                },
            },
            orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
            take: limit,
            skip: offset,
        });

        return templates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            thumbnail: t.thumbnail,
            defaultClassification: t.defaultClassification,
            usageCount: t.usageCount,
            version: t.version,
            categoryId: t.categoryId,
            categoryName: t.category?.name || null,
            categoryIcon: t.category?.icon || null,
            creatorId: t.creatorId, // Story 5.2
            isPublic: t.isPublic, // Story 5.2
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
        }));
    }

    /**
     * Find a template by ID with full structure
     */
    async findById(id: string): Promise<Template | null> {
        const template = await prisma.template.findUnique({
            where: { id },
            include: {
                category: true,
            },
        });

        if (!template) {
            return null;
        }

        return {
            id: template.id,
            name: template.name,
            description: template.description,
            thumbnail: template.thumbnail,
            structure: template.structure as unknown as TemplateStructure,
            defaultClassification: template.defaultClassification,
            requiredFields: template.requiredFields as string[] | null,
            status: template.status,
            version: template.version,
            categoryId: template.categoryId,
            category: template.category
                ? {
                      id: template.category.id,
                      name: template.category.name,
                      icon: template.category.icon,
                      sortOrder: template.category.sortOrder,
                      createdAt: template.category.createdAt.toISOString(),
                      updatedAt: template.category.updatedAt.toISOString(),
                  }
                : null,
            creatorId: template.creatorId,
            usageCount: template.usageCount,
            isPublic: template.isPublic, // Story 5.2
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
        };
    }

    /**
     * Find all template categories
     */
    async findCategories(): Promise<TemplateCategory[]> {
        const categories = await prisma.templateCategory.findMany({
            orderBy: { sortOrder: 'asc' },
        });

        return categories.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            sortOrder: c.sortOrder,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        }));
    }

    /**
     * Log template usage and increment usage count
     */
    async logUsage(templateId: string, userId: string, graphId: string): Promise<void> {
        await prisma.$transaction([
            // Create usage log
            prisma.templateUsageLog.create({
                data: {
                    templateId,
                    userId,
                    graphId,
                },
            }),
            // Increment usage count
            prisma.template.update({
                where: { id: templateId },
                data: {
                    usageCount: { increment: 1 },
                },
            }),
        ]);
    }

    /**
     * Get total count of templates matching query
     */
    async count(options?: TemplateQueryOptions): Promise<number> {
        const { categoryId, search, status } = options || {};

        const where: Prisma.TemplateWhereInput = {
            status: (status as TemplateStatus) || TemplateStatus.PUBLISHED,
        };

        if (categoryId) {
            where.categoryId = categoryId;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        return prisma.template.count({ where });
    }

    /**
     * Story 5.2: Create a new template from subtree
     */
    async create(
        data: CreateTemplateRequest & { creatorId: string }
    ): Promise<Template> {
        const template = await prisma.template.create({
            data: {
                name: data.name,
                description: data.description || null,
                categoryId: data.categoryId || null,
                structure: data.structure as unknown as Prisma.InputJsonValue,
                defaultClassification: data.defaultClassification || 'internal',
                creatorId: data.creatorId,
                isPublic: data.isPublic ?? true,
                status: TemplateStatus.PUBLISHED,
                usageCount: 0,
                version: 1,
            },
            include: {
                category: true,
            },
        });

        return {
            id: template.id,
            name: template.name,
            description: template.description,
            thumbnail: template.thumbnail,
            structure: template.structure as unknown as TemplateStructure,
            defaultClassification: template.defaultClassification,
            requiredFields: template.requiredFields as string[] | null,
            status: template.status,
            version: template.version,
            categoryId: template.categoryId,
            category: template.category
                ? {
                      id: template.category.id,
                      name: template.category.name,
                      icon: template.category.icon,
                      sortOrder: template.category.sortOrder,
                      createdAt: template.category.createdAt.toISOString(),
                      updatedAt: template.category.updatedAt.toISOString(),
                  }
                : null,
            creatorId: template.creatorId,
            usageCount: template.usageCount,
            isPublic: template.isPublic,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
        };
    }

    /**
     * Story 5.3: Find template by ID for deletion (lightweight query)
     * Returns only fields needed for authorization check
     */
    async findByIdForDelete(id: string): Promise<{ id: string; creatorId: string | null } | null> {
        return prisma.template.findUnique({
            where: { id },
            select: { id: true, creatorId: true },
        });
    }

    /**
     * Story 5.3: Delete a template by ID
     * Note: TemplateUsageLog entries are cascade-deleted via Prisma schema
     */
    async delete(id: string): Promise<void> {
        await prisma.template.delete({
            where: { id },
        });
    }
}
