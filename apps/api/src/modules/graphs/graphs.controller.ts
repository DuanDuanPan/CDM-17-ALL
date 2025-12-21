import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { GraphsService, GraphResponse, GraphListResponse } from './graphs.service';

/**
 * Graph管理控制器
 * 
 * API端点：
 * - POST   /api/graphs          创建新图谱
 * - GET    /api/graphs          获取用户的图谱列表
 * - GET    /api/graphs/:id      获取单个图谱
 * - PATCH  /api/graphs/:id      更新图谱
 * - DELETE /api/graphs/:id      删除图谱
 */
@Controller('graphs')
export class GraphsController {
    constructor(private readonly graphsService: GraphsService) { }

    /**
     * 创建新图谱
     * POST /api/graphs?userId=test1
     * Body: { name?: string }
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: { name?: string },
        @Query('userId') userId: string = 'test1',
    ): Promise<GraphResponse> {
        return this.graphsService.create({
            userId,
            name: body.name,
        });
    }

    /**
     * 获取用户的图谱列表
     * GET /api/graphs?userId=test1
     */
    @Get()
    async findAll(@Query('userId') userId: string = 'test1'): Promise<GraphListResponse[]> {
        return this.graphsService.findByUser(userId);
    }

    /**
     * 获取单个图谱
     * GET /api/graphs/:id
     */
    @Get(':id')
    async findOne(@Param('id') id: string): Promise<GraphResponse> {
        return this.graphsService.findOne(id);
    }

    /**
     * 更新图谱
     * PATCH /api/graphs/:id?userId=test1
     * Body: { name?: string }
     */
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() body: { name?: string },
        @Query('userId') userId: string = 'test1',
    ): Promise<GraphResponse> {
        return this.graphsService.update(id, userId, body);
    }

    /**
     * 删除图谱
     * DELETE /api/graphs/:id?userId=test1
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async remove(
        @Param('id') id: string,
        @Query('userId') userId: string = 'test1',
    ): Promise<{ message: string; id: string }> {
        return this.graphsService.remove(id, userId);
    }
}
