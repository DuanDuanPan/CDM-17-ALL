/**
 * Story 5.1: Template Library
 * Story 5.2: Subtree Template Save & Reuse
 * Templates Controller - HTTP endpoints for template operations
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
    BadRequestException,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import {
    InstantiateTemplateBodyDto,
    InstantiateTemplateQueryDto,
    TemplatesListQueryDto,
    CreateTemplateQueryDto,
    CreateTemplateBodyDto,
    GetTemplateQueryDto,
} from './templates.request.dto';
import type {
    TemplatesListResponse,
    TemplateDetailResponse,
    CategoriesListResponse,
    CreateFromTemplateResponse,
    CreateTemplateResponse,
} from '@cdm/types';

@Controller('templates')
export class TemplatesController {
    constructor(private readonly service: TemplatesService) {}

    /**
     * Story 5.2: Create a new template from subtree
     * POST /templates?userId=xxx
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Query() query: CreateTemplateQueryDto,
        @Body() body: CreateTemplateBodyDto
    ): Promise<{ template: CreateTemplateResponse }> {
        if (!query.userId) {
            throw new BadRequestException('userId query parameter is required');
        }

        const template = await this.service.saveSubtreeAsTemplate({
            ...body,
            creatorId: query.userId,
        });

        return { template };
    }

    /**
     * List all published templates
     * GET /templates?categoryId=xxx&search=xxx&limit=50&offset=0
     * Story 5.2: Added userId/mine support for visibility filtering
     */
    @Get()
    async list(@Query() query: TemplatesListQueryDto): Promise<TemplatesListResponse> {
        const templates = await this.service.listTemplates(query);

        return { templates };
    }

    /**
     * Get all template categories
     * GET /templates/categories
     */
    @Get('categories')
    async getCategories(): Promise<CategoriesListResponse> {
        const categories = await this.service.getCategories();
        return { categories };
    }

    /**
     * Get a single template by ID
     * GET /templates/:id
     */
    @Get(':id')
    async getById(
        @Param('id') id: string,
        @Query() query: GetTemplateQueryDto
    ): Promise<TemplateDetailResponse> {
        const template = await this.service.getTemplate(id, query.userId);
        return { template };
    }

    /**
     * Instantiate a template to create a new graph
     * POST /templates/:id/instantiate?userId=xxx
     */
    @Post(':id/instantiate')
    @HttpCode(HttpStatus.CREATED)
    async instantiate(
        @Param('id') id: string,
        @Query() query: InstantiateTemplateQueryDto,
        @Body() body?: InstantiateTemplateBodyDto
    ): Promise<CreateFromTemplateResponse> {
        return this.service.instantiate(id, query.userId, body?.name);
    }
}
