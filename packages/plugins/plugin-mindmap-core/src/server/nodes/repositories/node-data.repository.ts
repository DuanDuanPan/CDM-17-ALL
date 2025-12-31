import { Injectable } from '@nestjs/common';
import { prisma } from '@cdm/database';

@Injectable()
export class NodeDataRepository {
  async upsert(
    nodeId: string,
    data: { dataType?: string | null; version?: string | null; secretLevel?: string | null; storagePath?: string | null }
  ) {
    return prisma.nodeData.upsert({
      where: { nodeId },
      create: { nodeId, ...data },
      update: data,
    });
  }
}
