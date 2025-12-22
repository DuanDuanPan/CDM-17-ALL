import { Injectable } from '@nestjs/common';
import { prisma, type NodePBS, type Prisma } from '@cdm/database';

// Story 2.7: Extended PBS data type with indicators and productRef
// HIGH-1 Fix: Support both JSON values and DbNull for clearing fields
type NodePBSData = {
  code?: string | null;
  version?: string | null;
  ownerId?: string | null;
  // Support InputJsonValue for data, DbNull for clearing, undefined for no-update
  indicators?: Prisma.InputJsonValue | Prisma.NullTypes.DbNull;
  productRef?: Prisma.InputJsonValue | Prisma.NullTypes.DbNull;
};

@Injectable()
export class NodePBSRepository {
  async upsert(nodeId: string, data: NodePBSData): Promise<NodePBS> {
    return prisma.nodePBS.upsert({
      where: { nodeId },
      create: { nodeId, ...data },
      update: data,
    });
  }
}


