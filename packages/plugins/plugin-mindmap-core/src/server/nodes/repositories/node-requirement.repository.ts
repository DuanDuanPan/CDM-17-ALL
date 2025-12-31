import { Injectable } from '@nestjs/common';
import { prisma } from '@cdm/database';

@Injectable()
export class NodeRequirementRepository {
  async upsert(nodeId: string, data: { reqType?: string | null; acceptanceCriteria?: string | null; priority?: string | null }) {
    return prisma.nodeRequirement.upsert({
      where: { nodeId },
      create: { nodeId, ...data },
      update: data,
    });
  }
}
