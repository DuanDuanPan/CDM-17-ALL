import { Injectable } from '@nestjs/common';
import { prisma } from '@cdm/database';

@Injectable()
export class NodePBSRepository {
  async upsert(nodeId: string, data: { code?: string | null; version?: string | null; ownerId?: string | null }) {
    return prisma.nodePBS.upsert({
      where: { nodeId },
      create: { nodeId, ...data },
      update: data,
    });
  }
}
