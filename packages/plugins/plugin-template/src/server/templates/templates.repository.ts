/**
 * Story 5.1: Template Library
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
} from '@cdm/types';

@Injectable()
export class TemplatesRepository {
    /**
     * Find all published templates with optional filtering
     */
    async findAll(options?: TemplateQueryOptions): Promise<TemplateListItem[]> {
        const { categoryId, search, status, limit = 50, offset = 0 } = options || {};

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
}
