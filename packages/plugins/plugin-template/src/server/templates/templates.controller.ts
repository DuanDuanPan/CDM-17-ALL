/**
 * Story 5.1: Template Library
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
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import {
    InstantiateTemplateBodyDto,
    InstantiateTemplateQueryDto,
    TemplatesListQueryDto,
} from './templates.request.dto';
import type {
    TemplatesListResponse,
    TemplateDetailResponse,
    CategoriesListResponse,
    CreateFromTemplateResponse,
} from '@cdm/types';

@Controller('templates')
export class TemplatesController {
    constructor(private readonly service: TemplatesService) {}

    /**
     * List all published templates
     * GET /templates?categoryId=xxx&search=xxx&limit=50&offset=0
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
    async getById(@Param('id') id: string): Promise<TemplateDetailResponse> {
        const template = await this.service.getTemplate(id);
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
