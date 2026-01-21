/**
 * Story 10.1: GraphsService Repository Compliance
 * Refactored to use GraphRepository instead of direct Prisma calls
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DemoSeedService } from '../../demo/demo-seed.service';
import { GraphRepository } from './graph.repository';

export interface CreateGraphDto {
    userId: string;
    name?: string;
}

export interface GraphResponse {
    id: string;
    name: string;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
    projectId: string;
    project: {
        id: string;
        name: string;
        ownerId?: string | null;
    };
    _count?: {
        nodes: number;
        edges: number;
    };
}

export interface GraphListResponse extends GraphResponse {
    _count: {
        nodes: number;
        edges: number;
    };
}

/**
 * Graph管理服务
 * 提供图谱的CRUD操作，自动处理用户和项目的懒加载初始化
 * Story 10.1: Refactored to use GraphRepository (Repository Pattern compliance)
 */
@Injectable()
export class GraphsService {
    private readonly logger = new Logger(GraphsService.name);

    constructor(
        private readonly graphRepository: GraphRepository,
        private readonly demoSeedService: DemoSeedService,
    ) { }

    /**
     * 创建新图谱
     * 自动处理用户和项目的初始化
     */
    async create(dto: CreateGraphDto): Promise<GraphResponse> {
        const { userId, name = '新建图谱' } = dto;

        // 获取或创建用户的默认项目
        const projectId = await this.demoSeedService.getOrCreateDefaultProject(userId);

        // Story 10.1: Use GraphRepository.create() instead of direct prisma call
        const graph = await this.graphRepository.create({
            name,
            projectId,
        });

        this.logger.log(`Created graph ${graph.id} for user ${userId}`);
        return graph;
    }

    /**
     * 获取用户的所有图谱
     */
    async findByUser(userId: string): Promise<GraphListResponse[]> {
        // 确保用户存在（但不创建项目，只在创建图谱时创建）
        await this.demoSeedService.ensureUser(userId);

        // Story 10.1: Use GraphRepository.findByUserId() instead of direct prisma call
        const graphs = await this.graphRepository.findByUserId(userId);

        return graphs;
    }

    /**
     * 获取单个图谱详情
     */
    async findOne(id: string): Promise<GraphResponse> {
        // Story 10.1: Use GraphRepository.findOneWithProject() instead of direct prisma call
        const graph = await this.graphRepository.findOneWithProject(id);

        if (!graph) {
            throw new NotFoundException(`Graph ${id} not found`);
        }

        return graph;
    }

    /**
     * 更新图谱名称
     */
    async update(id: string, userId: string, data: { name?: string }): Promise<GraphResponse> {
        // 验证所有权
        const graph = await this.findOne(id);
        if (graph.project.ownerId !== userId) {
            throw new ForbiddenException('You do not own this graph');
        }

        // Story 10.1: Use GraphRepository.update() instead of direct prisma call
        const updated = await this.graphRepository.update(id, { name: data.name });

        return updated;
    }

    /**
     * 删除图谱
     */
    async remove(id: string, userId: string): Promise<{ message: string; id: string }> {
        // 验证所有权
        const graph = await this.findOne(id);
        if (graph.project.ownerId !== userId) {
            throw new ForbiddenException('You do not own this graph');
        }

        // Story 10.1: Use GraphRepository.delete() instead of direct prisma call
        await this.graphRepository.delete(id);
        this.logger.log(`Deleted graph ${id}`);
        return { message: 'Graph deleted successfully', id };
    }

    /**
     * 检查图谱是否存在
     */
    async exists(id: string): Promise<boolean> {
        // Story 10.1: Use existing GraphRepository.exists() method
        return this.graphRepository.exists(id);
    }
}
