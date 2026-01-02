# Tech-Spec: Story 5.1 - 模板库与实例化 (Template Library)

**Created:** 2026-01-01
**Status:** Ready for Development
**Story:** 5.1
**Epic:** 5 - 知识复用与智能辅助 (Knowledge Intelligence)

---

## Overview

### Problem Statement

当前系统缺乏模板机制,用户每次创建新脑图都需要从零开始构建结构。这导致:

1. **效率低下**: 重复性工作,无法复用既有最佳实践
2. **标准化缺失**: 同类项目结构不一致,难以沉淀组织知识
3. **上手门槛高**: 新用户不知道从何开始,缺乏结构参考

### Solution

实现模板库功能,提供:

1. **系统预置模板**: 敏捷研发、故障复盘、系统架构等常用模板
2. **模板预览**: 查看模板结构、元数据、密级要求
3. **一键实例化**: 从模板快速创建新脑图,自动填充结构和属性
4. **密级继承**: 模板预设的密级自动应用到新脑图

### Scope

**In Scope:**
- 模板数据模型设计 (Prisma)
- 模板后端 Plugin (NestJS)
- 模板列表/预览/实例化前端组件
- 系统预置模板种子数据
- 与现有新建文件流程集成

**Out of Scope:**
- 用户自定义模板创建 (待 Story 5.2 子树片段功能)
- 模板市场/共享 (后续迭代)
- 模板版本控制 UI (仅实现后端逻辑)
- 模板导入/导出

---

## Context for Development

### Codebase Patterns

#### 1. Plugin 结构模式

遵循现有 Plugin 组织方式 (参考 `plugin-comments`):

```
packages/plugins/plugin-template/
├── src/
│   ├── index.ts                    # 根导出
│   └── server/
│       ├── index.ts                # Server module 导出
│       └── templates/
│           ├── templates.module.ts
│           ├── templates.controller.ts
│           ├── templates.service.ts
│           ├── templates.repository.ts
│           └── index.ts
├── package.json
└── tsconfig.json
```

#### 2. Repository Pattern

参考 `plugin-comments/src/server/comments/comments.repository.ts`:

```typescript
@Injectable()
export class CommentsRepository {
    async create(data: CreateData): Promise<Entity> {
        return prisma.model.create({
            data: { ... },
            include: { ... },
        });
    }
    
    async findById(id: string): Promise<Entity | null> {
        return prisma.model.findUnique({
            where: { id },
            include: { ... },
        });
    }
}
```

#### 3. Hook-First 前端模式

参考 `hooks/useKnowledge.ts` 和 `hooks/useProductSearch.ts`:

```typescript
export function useTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const fetchTemplates = useCallback(async (options?: QueryOptions) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/templates?${params}`);
            // ...
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);
    
    return { templates, loading, error, fetchTemplates };
}
```

#### 4. Dialog 组件模式

参考 `components/Knowledge/KnowledgeSearchDialog.tsx`:

```typescript
interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (item: ItemType) => void;
}

export function SearchDialog({ open, onOpenChange, onSelect }: DialogProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <Command>
                    <CommandInput ... />
                    <CommandList>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem key={item.id} onSelect={() => onSelect(item)}>
                                    ...
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
}
```

### Files to Reference

| File | Purpose |
|------|---------|
| `packages/plugins/plugin-comments/src/server/index.ts` | Plugin server module 导出模式 |
| `packages/plugins/plugin-comments/src/server/comments/comments.repository.ts` | Repository 实现模式 |
| `packages/plugins/plugin-comments/src/server/comments/comments.service.ts` | Service 层实现模式 |
| `packages/plugins/plugin-comments/src/server/comments/comments.module.ts` | NestJS Module 配置 |
| `packages/database/prisma/schema.prisma` | 现有数据模型参考 |
| `packages/types/src/index.ts` | 类型导出模式 |
| `apps/web/hooks/useKnowledge.ts` | Hook 实现模式 |
| `apps/web/components/Knowledge/KnowledgeSearchDialog.tsx` | Dialog 组件模式 |
| `apps/web/components/ProductLibrary/ProductSearchDialog.tsx` | 复杂搜索 Dialog 模式 |

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **模板存储** | JSON 字段 (structure) | 灵活的节点结构,易于扩展 |
| **分类系统** | 独立表 TemplateCategory | 支持动态分类管理 |
| **版本控制** | status 字段枚举 | 简单的 draft/published/deprecated 流转 |
| **缩略图** | 静态上传 (storagePath) | 首版简化,后续可自动生成 |
| **实例化** | Server-side 转换 | 保证数据一致性,处理 ID 生成 |

---

## Implementation Plan

### Phase 1: 数据模型与后端基础

#### Task 1.1: Prisma Schema 扩展

**文件:** `packages/database/prisma/schema.prisma`

```prisma
// Story 5.1: Template Library

enum TemplateStatus {
  DRAFT
  PUBLISHED
  DEPRECATED
}

model TemplateCategory {
  id          String   @id @default(cuid())
  name        String   @unique
  icon        String?  // Lucide icon name
  sortOrder   Int      @default(0)
  
  templates   Template[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Template {
  id          String         @id @default(cuid())
  name        String
  description String?        @db.Text
  thumbnail   String?        // Storage path for preview image
  
  // Template structure (JSON format)
  // { rootNode: { label, type?, metadata?, children: [...] } }
  structure   Json
  
  // Default settings
  defaultClassification String  @default("internal") // public, internal, confidential, secret
  requiredFields       Json?    // Array of required field names
  
  // Version control
  status      TemplateStatus @default(DRAFT)
  version     Int            @default(1)
  
  // Relations
  categoryId  String?
  category    TemplateCategory? @relation(fields: [categoryId], references: [id])
  
  creatorId   String?
  
  // Usage tracking
  usageCount  Int            @default(0)
  
  // Audit
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  
  usageLogs   TemplateUsageLog[]
  
  @@index([status])
  @@index([categoryId])
}

model TemplateUsageLog {
  id          String   @id @default(cuid())
  
  templateId  String
  template    Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  userId      String
  graphId     String   // Created graph ID
  
  createdAt   DateTime @default(now())
  
  @@index([templateId])
  @@index([userId])
}
```

#### Task 1.2: 类型定义

**文件:** `packages/types/src/template-types.ts`

```typescript
/**
 * Story 5.1: Template Library Types
 */

export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED';

export interface TemplateCategory {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
}

export interface TemplateNode {
  label: string;
  type?: 'ORDINARY' | 'TASK' | 'REQUIREMENT' | 'PBS' | 'DATA' | 'APP';
  metadata?: Record<string, unknown>;
  children?: TemplateNode[];
}

export interface TemplateStructure {
  rootNode: TemplateNode;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  structure: TemplateStructure;
  defaultClassification: string;
  requiredFields?: string[];
  status: TemplateStatus;
  version: number;
  categoryId?: string;
  category?: TemplateCategory;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListItem {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  categoryId?: string;
  categoryName?: string;
  usageCount: number;
  defaultClassification: string;
}

export interface CreateFromTemplateRequest {
  templateId: string;
  projectId: string;
  name?: string; // Override graph name
}

export interface CreateFromTemplateResponse {
  graphId: string;
  graphName: string;
}

export interface TemplateQueryOptions {
  categoryId?: string;
  search?: string;
  status?: TemplateStatus;
  limit?: number;
  cursor?: string;
}
```

**更新导出:** `packages/types/src/index.ts`

```typescript
// Story 5.1: Template Library
export * from './template-types';
```

#### Task 1.3: 运行数据库迁移

```bash
cd packages/database
pnpm prisma migrate dev --name add_template_models
pnpm prisma generate
```

### Phase 2: 后端 Plugin 开发

#### Task 2.1: Plugin 结构初始化

**创建目录结构:**

```
packages/plugins/plugin-template/
├── src/
│   ├── index.ts
│   └── server/
│       ├── index.ts
│       └── templates/
│           ├── index.ts
│           ├── templates.module.ts
│           ├── templates.controller.ts
│           ├── templates.service.ts
│           └── templates.repository.ts
├── package.json
└── tsconfig.json
```

**文件:** `packages/plugins/plugin-template/package.json`

```json
{
  "name": "@cdm/plugin-template",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./server": {
      "import": "./dist/server/index.js",
      "require": "./dist/server/index.js",
      "types": "./dist/server/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@cdm/database": "workspace:*",
    "@cdm/types": "workspace:*",
    "@nestjs/common": "^11.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

#### Task 2.2: Repository 实现

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.repository.ts`

```typescript
/**
 * Story 5.1: Template Library
 * Templates Repository - Database access layer
 */

import { Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@cdm/database';
import type { Template, TemplateCategory, TemplateListItem, TemplateQueryOptions } from '@cdm/types';

@Injectable()
export class TemplatesRepository {
    private readonly categorySelect = {
        id: true,
        name: true,
        icon: true,
        sortOrder: true,
    } as const;

    /**
     * Find all published templates with optional filtering
     */
    async findAll(options?: TemplateQueryOptions): Promise<TemplateListItem[]> {
        const where: Prisma.TemplateWhereInput = {
            status: options?.status || 'PUBLISHED',
        };

        if (options?.categoryId) {
            where.categoryId = options.categoryId;
        }

        if (options?.search) {
            where.OR = [
                { name: { contains: options.search, mode: 'insensitive' } },
                { description: { contains: options.search, mode: 'insensitive' } },
            ];
        }

        const templates = await prisma.template.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                thumbnail: true,
                categoryId: true,
                category: { select: { name: true } },
                usageCount: true,
                defaultClassification: true,
            },
            orderBy: [
                { usageCount: 'desc' },
                { name: 'asc' },
            ],
            take: options?.limit || 50,
            ...(options?.cursor && {
                cursor: { id: options.cursor },
                skip: 1,
            }),
        });

        return templates.map((t) => ({
            ...t,
            categoryName: t.category?.name,
            category: undefined,
        }));
    }

    /**
     * Find a single template by ID with full structure
     */
    async findById(id: string): Promise<Template | null> {
        const template = await prisma.template.findUnique({
            where: { id },
            include: {
                category: { select: this.categorySelect },
            },
        });

        if (!template) return null;

        return {
            ...template,
            structure: template.structure as Template['structure'],
            requiredFields: template.requiredFields as string[] | undefined,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
        };
    }

    /**
     * Find all categories
     */
    async findCategories(): Promise<TemplateCategory[]> {
        return prisma.templateCategory.findMany({
            orderBy: { sortOrder: 'asc' },
        });
    }

    /**
     * Increment usage count and log usage
     */
    async logUsage(templateId: string, userId: string, graphId: string): Promise<void> {
        await prisma.$transaction([
            prisma.template.update({
                where: { id: templateId },
                data: { usageCount: { increment: 1 } },
            }),
            prisma.templateUsageLog.create({
                data: {
                    templateId,
                    userId,
                    graphId,
                },
            }),
        ]);
    }

    /**
     * Create a new template (admin only)
     */
    async create(data: Prisma.TemplateCreateInput): Promise<Template> {
        const template = await prisma.template.create({
            data,
            include: {
                category: { select: this.categorySelect },
            },
        });

        return {
            ...template,
            structure: template.structure as Template['structure'],
            requiredFields: template.requiredFields as string[] | undefined,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
        };
    }
}
```

#### Task 2.3: Service 实现

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.service.ts`

```typescript
/**
 * Story 5.1: Template Library
 * Templates Service - Business logic
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { prisma } from '@cdm/database';
import type {
    Template,
    TemplateCategory,
    TemplateListItem,
    TemplateQueryOptions,
    TemplateNode,
    CreateFromTemplateResponse,
} from '@cdm/types';
import { TemplatesRepository } from './templates.repository';

@Injectable()
export class TemplatesService {
    private readonly logger = new Logger(TemplatesService.name);

    constructor(private readonly repo: TemplatesRepository) {}

    /**
     * Get all published templates
     */
    async listTemplates(options?: TemplateQueryOptions): Promise<TemplateListItem[]> {
        return this.repo.findAll(options);
    }

    /**
     * Get template by ID with full structure
     */
    async getTemplate(id: string): Promise<Template> {
        const template = await this.repo.findById(id);
        if (!template) {
            throw new NotFoundException(`Template ${id} not found`);
        }
        return template;
    }

    /**
     * Get all categories
     */
    async getCategories(): Promise<TemplateCategory[]> {
        return this.repo.findCategories();
    }

    /**
     * Create a new graph from template
     */
    async instantiate(
        templateId: string,
        projectId: string,
        userId: string,
        graphName?: string
    ): Promise<CreateFromTemplateResponse> {
        // 1. Get template
        const template = await this.getTemplate(templateId);

        if (template.status !== 'PUBLISHED') {
            throw new BadRequestException('Cannot instantiate non-published template');
        }

        // 2. Generate new graph with nodes from template structure
        const { graph, nodes } = this.generateGraphFromTemplate(
            template,
            projectId,
            graphName
        );

        // 3. Create graph and nodes in transaction
        const createdGraph = await prisma.$transaction(async (tx) => {
            const newGraph = await tx.graph.create({
                data: {
                    name: graph.name,
                    projectId,
                    data: {},
                },
            });

            // Create nodes with generated IDs
            for (const node of nodes) {
                await tx.node.create({
                    data: {
                        ...node,
                        graphId: newGraph.id,
                    },
                });
            }

            return newGraph;
        });

        // 4. Log usage
        await this.repo.logUsage(templateId, userId, createdGraph.id);

        this.logger.log(`Template ${templateId} instantiated as graph ${createdGraph.id}`);

        return {
            graphId: createdGraph.id,
            graphName: createdGraph.name,
        };
    }

    /**
     * Generate graph and nodes from template structure
     */
    private generateGraphFromTemplate(
        template: Template,
        projectId: string,
        graphName?: string
    ): { graph: { name: string }; nodes: Array<Omit<any, 'graphId'>> } {
        const nodes: Array<any> = [];
        const now = new Date();

        // Generate unique CUIDs for nodes
        const generateId = () => {
            // Simple CUID-like generation for example
            return `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        };

        // Recursive function to process template nodes
        const processNode = (
            templateNode: TemplateNode,
            parentId: string | null,
            x: number,
            y: number,
            depth: number
        ): string => {
            const nodeId = generateId();

            nodes.push({
                id: nodeId,
                label: templateNode.label,
                type: templateNode.type || 'ORDINARY',
                x,
                y,
                width: 120,
                height: 40,
                parentId,
                metadata: templateNode.metadata || {},
                tags: [],
                isArchived: false,
                createdAt: now,
                updatedAt: now,
            });

            // Process children
            if (templateNode.children && templateNode.children.length > 0) {
                const childSpacing = 60;
                const childX = x + 180;
                let childY = y - ((templateNode.children.length - 1) * childSpacing) / 2;

                for (const child of templateNode.children) {
                    processNode(child, nodeId, childX, childY, depth + 1);
                    childY += childSpacing;
                }
            }

            return nodeId;
        };

        // Process root node
        processNode(template.structure.rootNode, null, 100, 300, 0);

        return {
            graph: {
                name: graphName || template.name,
            },
            nodes,
        };
    }
}
```

#### Task 2.4: Controller 实现

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.controller.ts`

```typescript
/**
 * Story 5.1: Template Library
 * Templates Controller - API endpoints
 */

import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import type {
    Template,
    TemplateCategory,
    TemplateListItem,
    CreateFromTemplateRequest,
    CreateFromTemplateResponse,
} from '@cdm/types';

// DTOs for validation
class ListTemplatesQueryDto {
    categoryId?: string;
    search?: string;
    limit?: number;
}

class InstantiateTemplateDto {
    templateId!: string;
    projectId!: string;
    name?: string;
}

@Controller('templates')
export class TemplatesController {
    constructor(private readonly service: TemplatesService) {}

    /**
     * GET /api/templates
     * List all published templates
     */
    @Get()
    async listTemplates(
        @Query() query: ListTemplatesQueryDto
    ): Promise<{ templates: TemplateListItem[] }> {
        const templates = await this.service.listTemplates({
            categoryId: query.categoryId,
            search: query.search,
            limit: query.limit,
        });
        return { templates };
    }

    /**
     * GET /api/templates/categories
     * Get all template categories
     */
    @Get('categories')
    async getCategories(): Promise<{ categories: TemplateCategory[] }> {
        const categories = await this.service.getCategories();
        return { categories };
    }

    /**
     * GET /api/templates/:id
     * Get template by ID with full structure
     */
    @Get(':id')
    async getTemplate(@Param('id') id: string): Promise<{ template: Template }> {
        const template = await this.service.getTemplate(id);
        return { template };
    }

    /**
     * POST /api/templates/:id/instantiate
     * Create a new graph from template
     */
    @Post(':id/instantiate')
    @HttpCode(HttpStatus.CREATED)
    async instantiate(
        @Param('id') templateId: string,
        @Body() body: InstantiateTemplateDto
    ): Promise<CreateFromTemplateResponse> {
        // TODO: Extract userId from auth context
        const userId = 'mock-user-id';

        return this.service.instantiate(
            templateId,
            body.projectId,
            userId,
            body.name
        );
    }
}
```

#### Task 2.5: Module 配置

**文件:** `packages/plugins/plugin-template/src/server/templates/templates.module.ts`

```typescript
/**
 * Story 5.1: Template Library
 * Templates Module - NestJS module configuration
 */

import { Module, DynamicModule } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { TemplatesRepository } from './templates.repository';

export interface TemplatesModuleOptions {
    imports?: any[];
}

@Module({})
export class TemplatesModule {
    static forRoot(options: TemplatesModuleOptions = {}): DynamicModule {
        return {
            module: TemplatesModule,
            imports: options.imports || [],
            controllers: [TemplatesController],
            providers: [TemplatesService, TemplatesRepository],
            exports: [TemplatesService, TemplatesRepository],
        };
    }

    static register(): DynamicModule {
        return this.forRoot();
    }
}
```

**文件:** `packages/plugins/plugin-template/src/server/index.ts`

```typescript
/**
 * Plugin Template - Server Entry Point
 * Story 5.1: Template Library
 */

import { Module, DynamicModule } from '@nestjs/common';
import { TemplatesModule, TemplatesModuleOptions } from './templates/templates.module';

export { TemplatesModule, TemplatesModuleOptions } from './templates/templates.module';
export { TemplatesService } from './templates/templates.service';
export { TemplatesRepository } from './templates/templates.repository';

export interface TemplatesServerModuleOptions {
    imports?: any[];
}

@Module({})
export class TemplatesServerModule {
    static forRoot(options: TemplatesServerModuleOptions = {}): DynamicModule {
        return {
            module: TemplatesServerModule,
            imports: [TemplatesModule.forRoot({ imports: options.imports })],
            exports: [TemplatesModule],
        };
    }

    static register(): DynamicModule {
        return this.forRoot();
    }
}
```

### Phase 3: 前端实现

#### Task 3.1: Hook 实现

**文件:** `apps/web/hooks/useTemplates.ts`

```typescript
/**
 * Story 5.1: Template Library
 * useTemplates hook - Template fetching and state management
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
    Template,
    TemplateCategory,
    TemplateListItem,
    TemplateQueryOptions,
    CreateFromTemplateResponse,
} from '@cdm/types';

interface UseTemplatesReturn {
    templates: TemplateListItem[];
    categories: TemplateCategory[];
    loading: boolean;
    error: string | null;
    fetchTemplates: (options?: TemplateQueryOptions) => Promise<void>;
    fetchCategories: () => Promise<void>;
}

export function useTemplates(): UseTemplatesReturn {
    const [templates, setTemplates] = useState<TemplateListItem[]>([]);
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async (options?: TemplateQueryOptions) => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (options?.categoryId) params.set('categoryId', options.categoryId);
            if (options?.search) params.set('search', options.search);
            if (options?.limit) params.set('limit', String(options.limit));

            const response = await fetch(`/api/templates?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch templates');
            }

            const data = await response.json();
            setTemplates(data.templates);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch('/api/templates/categories');
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }

            const data = await response.json();
            setCategories(data.categories);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    }, []);

    return {
        templates,
        categories,
        loading,
        error,
        fetchTemplates,
        fetchCategories,
    };
}

interface UseTemplatePreviewReturn {
    template: Template | null;
    loading: boolean;
    error: string | null;
    fetchTemplate: (id: string) => Promise<void>;
}

export function useTemplatePreview(): UseTemplatePreviewReturn {
    const [template, setTemplate] = useState<Template | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplate = useCallback(async (id: string) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/templates/${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch template');
            }

            const data = await response.json();
            setTemplate(data.template);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    return { template, loading, error, fetchTemplate };
}

interface UseInstantiateTemplateReturn {
    instantiate: (templateId: string, projectId: string, name?: string) => Promise<CreateFromTemplateResponse>;
    loading: boolean;
    error: string | null;
}

export function useInstantiateTemplate(): UseInstantiateTemplateReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const instantiate = useCallback(
        async (templateId: string, projectId: string, name?: string): Promise<CreateFromTemplateResponse> => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/templates/${templateId}/instantiate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, name }),
                });

                if (!response.ok) {
                    throw new Error('Failed to create from template');
                }

                return await response.json();
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                setError(message);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return { instantiate, loading, error };
}
```

#### Task 3.2: Dialog 组件

**文件:** `apps/web/components/Template/TemplateLibraryDialog.tsx`

```typescript
'use client';

/**
 * Story 5.1: Template Library Dialog
 * Modal for browsing and selecting templates
 */

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search,
    FileTemplate,
    Loader2,
    ChevronRight,
    Shield,
} from 'lucide-react';
import { useTemplates, useInstantiateTemplate } from '@/hooks/useTemplates';
import type { TemplateListItem, TemplateCategory } from '@cdm/types';
import { TemplatePreviewPanel } from './TemplatePreviewPanel';
import { toast } from 'sonner';

interface TemplateLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    onCreated: (graphId: string) => void;
}

export function TemplateLibraryDialog({
    open,
    onOpenChange,
    projectId,
    onCreated,
}: TemplateLibraryDialogProps) {
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 300);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateListItem | null>(null);

    const { templates, categories, loading, fetchTemplates, fetchCategories } = useTemplates();
    const { instantiate, loading: instantiating } = useInstantiateTemplate();

    // Fetch templates and categories when dialog opens
    useEffect(() => {
        if (open) {
            fetchCategories();
            fetchTemplates();
        }
    }, [open, fetchCategories, fetchTemplates]);

    // Refetch when search or category changes
    useEffect(() => {
        if (open) {
            fetchTemplates({
                search: debouncedSearch || undefined,
                categoryId: selectedCategory || undefined,
            });
        }
    }, [open, debouncedSearch, selectedCategory, fetchTemplates]);

    const handleSelect = async () => {
        if (!selectedTemplate) return;

        try {
            const result = await instantiate(selectedTemplate.id, projectId);
            toast.success(`脑图「${result.graphName}」创建成功`);
            onCreated(result.graphId);
            onOpenChange(false);
        } catch (err) {
            toast.error('创建失败，请重试');
        }
    };

    const getClassificationColor = (level: string) => {
        switch (level) {
            case 'public': return 'bg-green-500';
            case 'internal': return 'bg-blue-500';
            case 'confidential': return 'bg-orange-500';
            case 'secret': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <FileTemplate className="h-5 w-5" />
                        从模板创建
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Template List */}
                    <div className="w-1/2 border-r flex flex-col">
                        {/* Search */}
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="搜索模板..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="px-4 py-2 flex gap-2 flex-wrap border-b">
                            <Button
                                size="sm"
                                variant={selectedCategory === null ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(null)}
                            >
                                全部
                            </Button>
                            {categories.map((cat) => (
                                <Button
                                    key={cat.id}
                                    size="sm"
                                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                    onClick={() => setSelectedCategory(cat.id)}
                                >
                                    {cat.name}
                                </Button>
                            ))}
                        </div>

                        {/* Template List */}
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-2">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-20 w-full" />
                                    ))
                                ) : templates.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        暂无模板
                                    </div>
                                ) : (
                                    templates.map((template) => (
                                        <div
                                            key={template.id}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-primary ${
                                                selectedTemplate?.id === template.id
                                                    ? 'border-primary bg-accent'
                                                    : ''
                                            }`}
                                            onClick={() => setSelectedTemplate(template)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-medium flex items-center gap-2">
                                                        {template.name}
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs ${getClassificationColor(
                                                                template.defaultClassification
                                                            )} text-white`}
                                                        >
                                                            <Shield className="h-3 w-3 mr-1" />
                                                            {template.defaultClassification}
                                                        </Badge>
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                        {template.description}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                        {template.categoryName && (
                                                            <span>{template.categoryName}</span>
                                                        )}
                                                        <span>使用 {template.usageCount} 次</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right: Preview */}
                    <div className="w-1/2 flex flex-col">
                        {selectedTemplate ? (
                            <TemplatePreviewPanel templateId={selectedTemplate.id} />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                选择模板查看预览
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button
                        onClick={handleSelect}
                        disabled={!selectedTemplate || instantiating}
                    >
                        {instantiating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        使用此模板
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
```

#### Task 3.3: 预览组件

**文件:** `apps/web/components/Template/TemplatePreviewPanel.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FolderTree, Shield } from 'lucide-react';
import { useTemplatePreview } from '@/hooks/useTemplates';
import type { TemplateNode } from '@cdm/types';

interface TemplatePreviewPanelProps {
    templateId: string;
}

export function TemplatePreviewPanel({ templateId }: TemplatePreviewPanelProps) {
    const { template, loading, fetchTemplate } = useTemplatePreview();

    useEffect(() => {
        fetchTemplate(templateId);
    }, [templateId, fetchTemplate]);

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    if (!template) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                加载失败
            </div>
        );
    }

    // Render tree structure preview
    const renderNode = (node: TemplateNode, depth: number = 0): React.ReactNode => (
        <div key={`${depth}-${node.label}`} className="ml-4">
            <div className="flex items-center gap-2 py-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm">{node.label}</span>
                {node.type && node.type !== 'ORDINARY' && (
                    <Badge variant="secondary" className="text-xs">
                        {node.type}
                    </Badge>
                )}
            </div>
            {node.children?.map((child, i) => renderNode(child, depth + 1))}
        </div>
    );

    return (
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h3 className="text-xl font-semibold">{template.name}</h3>
                    <p className="text-muted-foreground mt-2">{template.description}</p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>默认密级: {template.defaultClassification}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>使用 {template.usageCount} 次</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>版本 {template.version}</span>
                    </div>
                    {template.category && (
                        <div className="flex items-center gap-2">
                            <FolderTree className="h-4 w-4 text-muted-foreground" />
                            <span>{template.category.name}</span>
                        </div>
                    )}
                </div>

                {/* Required Fields */}
                {template.requiredFields && template.requiredFields.length > 0 && (
                    <div>
                        <h4 className="font-medium mb-2">必填字段</h4>
                        <div className="flex gap-2 flex-wrap">
                            {template.requiredFields.map((field) => (
                                <Badge key={field} variant="outline">
                                    {field}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Structure Preview */}
                <div>
                    <h4 className="font-medium mb-3">结构预览</h4>
                    <div className="border rounded-lg p-4 bg-muted/30">
                        {renderNode(template.structure.rootNode)}
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
```

### Phase 4: 种子数据

**文件:** `packages/database/prisma/seed-templates.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTemplates() {
    console.log('Seeding template categories...');

    const categories = await Promise.all([
        prisma.templateCategory.upsert({
            where: { name: '项目管理' },
            update: {},
            create: { name: '项目管理', icon: 'Kanban', sortOrder: 1 },
        }),
        prisma.templateCategory.upsert({
            where: { name: '问题分析' },
            update: {},
            create: { name: '问题分析', icon: 'Search', sortOrder: 2 },
        }),
        prisma.templateCategory.upsert({
            where: { name: '技术设计' },
            update: {},
            create: { name: '技术设计', icon: 'Code', sortOrder: 3 },
        }),
    ]);

    console.log('Seeding templates...');

    const templates = [
        {
            name: '敏捷研发管理',
            description: '适用于敏捷开发团队的项目管理模板，包含Sprint规划、用户故事、回顾等结构',
            categoryId: categories[0].id,
            structure: {
                rootNode: {
                    label: '项目名称',
                    children: [
                        {
                            label: 'Epic 1',
                            type: 'REQUIREMENT',
                            children: [
                                { label: 'Story 1.1', type: 'TASK' },
                                { label: 'Story 1.2', type: 'TASK' },
                            ],
                        },
                        {
                            label: 'Sprint Backlog',
                            children: [
                                { label: '待办事项', type: 'TASK' },
                            ],
                        },
                        {
                            label: '回顾记录',
                            children: [
                                { label: 'Sprint 1 回顾' },
                            ],
                        },
                    ],
                },
            },
            defaultClassification: 'internal',
            requiredFields: ['executor', 'dueDate'],
            status: 'PUBLISHED',
        },
        {
            name: '故障复盘',
            description: '用于故障分析和复盘的模板，帮助团队系统地记录和分析问题',
            categoryId: categories[1].id,
            structure: {
                rootNode: {
                    label: '故障复盘',
                    children: [
                        { label: '故障现象' },
                        { label: '影响范围' },
                        {
                            label: '根因分析',
                            children: [
                                { label: '直接原因' },
                                { label: '根本原因' },
                            ],
                        },
                        { label: '改进措施', type: 'TASK' },
                        { label: '跟踪验证', type: 'TASK' },
                    ],
                },
            },
            defaultClassification: 'internal',
            status: 'PUBLISHED',
        },
        {
            name: '系统架构设计',
            description: '软件系统架构设计模板，涵盖关键架构决策和组件分解',
            categoryId: categories[2].id,
            structure: {
                rootNode: {
                    label: '系统架构',
                    children: [
                        { label: '需求分析', type: 'REQUIREMENT' },
                        { label: '技术选型' },
                        {
                            label: '模块设计',
                            children: [
                                { label: '前端模块' },
                                { label: '后端模块' },
                                { label: '数据层' },
                            ],
                        },
                        { label: '部署架构' },
                        { label: '安全设计' },
                    ],
                },
            },
            defaultClassification: 'confidential',
            requiredFields: ['owner'],
            status: 'PUBLISHED',
        },
    ];

    for (const template of templates) {
        await prisma.template.upsert({
            where: { id: `seed-${template.name.replace(/\s/g, '-')}` },
            update: template,
            create: {
                id: `seed-${template.name.replace(/\s/g, '-')}`,
                ...template,
            },
        });
    }

    console.log('Template seeding complete!');
}

seedTemplates()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
```

---

## Acceptance Criteria

- [ ] **AC1**: 用户点击"新建文件"后可选择"从模板创建"，显示模板库列表
- [ ] **AC2**: 模板列表支持分类筛选和关键词搜索
- [ ] **AC3**: 选择模板后显示预览面板，包含结构、元数据、密级信息
- [ ] **AC4**: 点击"使用此模板"后成功创建新脑图并跳转
- [ ] **AC5**: 新脑图包含模板预置的节点结构
- [ ] **AC6**: 新脑图继承模板的默认密级

---

## Additional Context

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `@cdm/database` | workspace | Prisma 访问 |
| `@cdm/types` | workspace | 类型定义 |
| `@nestjs/common` | ^11.0.0 | NestJS 装饰器 |
| `use-debounce` | existing | 搜索防抖 |
| `sonner` | existing | Toast 通知 |

### Testing Strategy

1. **Repository 单元测试**
   - Mock Prisma client
   - 测试 CRUD 操作

2. **Service 单元测试**
   - Mock Repository
   - 测试实例化逻辑
   - 测试节点生成

3. **Controller 集成测试**
   - 测试 API 端点
   - 验证响应格式

4. **前端组件测试**
   - TemplateLibraryDialog 渲染
   - 搜索/筛选交互
   - 选择/确认流程

5. **E2E 测试**
   - 完整模板创建流程
   - 验证新脑图结构

### Notes

1. **Yjs 集成**: 首版实例化直接写入 DB，后续可优化为同时初始化 Yjs 状态
2. **缩略图**: 首版使用静态图片，后续可自动从结构生成
3. **权限**: 首版所有用户可见所有模板，后续可按密级过滤
4. **版本控制**: 后端支持 draft/published/deprecated，前端管理界面待后续迭代

---

**Tech-Spec Complete!**

Saved to: `docs/sprint-artifacts/tech-spec-5-1-template-library.md`

[a] Advanced Elicitation - refine further
[b] Begin Development (not recommended - fresh context better)
[d] Done - exit
[p] Party Mode - get feedback

**Recommended:** Run `dev-story docs/sprint-artifacts/5-1-template-library.md` in fresh context.
