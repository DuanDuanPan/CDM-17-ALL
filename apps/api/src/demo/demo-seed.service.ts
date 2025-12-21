import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@cdm/database';

/**
 * 用户和项目懒加载服务
 * 
 * 改进说明：
 * - 移除 OnModuleInit 自动种子数据逻辑
 * - 改为按需创建用户和项目
 * - 用户首次创建图谱时自动初始化
 */
@Injectable()
export class DemoSeedService {
  private readonly logger = new Logger(DemoSeedService.name);

  /**
   * 确保用户存在，如不存在则创建
   * @param userId 用户ID
   * @returns 用户信息
   */
  async ensureUser(userId: string) {
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@example.com`,
        name: `User ${userId}`,
      },
    });
    this.logger.log(`User ${userId} ready`);
    return user;
  }

  /**
   * 获取或创建用户的默认项目
   * 每个用户只有一个默认项目，首次创建图谱时自动初始化
   * 
   * @param userId 用户ID
   * @returns 项目ID
   */
  async getOrCreateDefaultProject(userId: string): Promise<string> {
    // 确保用户存在
    await this.ensureUser(userId);

    // 查找用户的第一个项目（作为默认项目）
    let project = await prisma.project.findFirst({
      where: { ownerId: userId },
    });

    // 如果不存在，创建默认项目
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: `${userId}的工作空间`,
          ownerId: userId,
        },
      });
      this.logger.log(`Created default project for user ${userId}: ${project.id}`);
    }

    return project.id;
  }

  /**
   * 获取用户信息（如不存在返回null）
   */
  async getUser(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }
}
