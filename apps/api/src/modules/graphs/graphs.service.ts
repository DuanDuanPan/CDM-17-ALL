import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@cdm/database';
import { DemoSeedService } from '../../demo/demo-seed.service';

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
        ownerId?: string;
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
 */
@Injectable()
export class GraphsService {
    private readonly logger = new Logger(GraphsService.name);

    constructor(private readonly demoSeedService: DemoSeedService) { }

    /**
     * 创建新图谱
     * 自动处理用户和项目的初始化
     */
    async create(dto: CreateGraphDto): Promise<GraphResponse> {
        const { userId, name = '新建图谱' } = dto;

        // 获取或创建用户的默认项目
        const projectId = await this.demoSeedService.getOrCreateDefaultProject(userId);

        // 创建图谱
        const graph = await prisma.graph.create({
            data: {
                name,
                projectId,
                data: {},
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true,
                    },
                },
            },
        });

        this.logger.log(`Created graph ${graph.id} for user ${userId}`);
        return graph as GraphResponse;
    }

    /**
     * 获取用户的所有图谱
     */
    async findByUser(userId: string): Promise<GraphListResponse[]> {
        // 确保用户存在（但不创建项目，只在创建图谱时创建）
        await this.demoSeedService.ensureUser(userId);

        const graphs = await prisma.graph.findMany({
            where: {
                project: {
                    ownerId: userId,
                },
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        nodes: true,
                        edges: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return graphs as GraphListResponse[];
    }

    /**
     * 获取单个图谱详情
     */
    async findOne(id: string): Promise<GraphResponse> {
        const graph = await prisma.graph.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true,
                    },
                },
            },
        });

        if (!graph) {
            throw new NotFoundException(`Graph ${id} not found`);
        }

        return graph as GraphResponse;
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

        const updated = await prisma.graph.update({
            where: { id },
            data: {
                name: data.name,
                updatedAt: new Date(),
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true,
                    },
                },
            },
        });

        return updated as GraphResponse;
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

        await prisma.graph.delete({ where: { id } });
        this.logger.log(`Deleted graph ${id}`);
        return { message: 'Graph deleted successfully', id };
    }

    /**
     * 检查图谱是否存在
     */
    async exists(id: string): Promise<boolean> {
        const count = await prisma.graph.count({ where: { id } });
        return count > 0;
    }
}
