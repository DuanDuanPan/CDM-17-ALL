import { Injectable } from '@nestjs/common';
import { prisma } from '@cdm/database';

@Injectable()
export class NodeTaskRepository {
  async upsert(nodeId: string, data: { status?: string; assigneeId?: string | null; dueDate?: Date | null; priority?: string | null }) {
    return prisma.nodeTask.upsert({
      where: { nodeId },
      create: { nodeId, ...data },
      update: data,
    });
  }
}
