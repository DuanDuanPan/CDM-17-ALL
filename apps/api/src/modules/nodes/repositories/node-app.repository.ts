/**
 * Story 2.9: APP Node Repository
 * Handles persistence for APP node type-specific properties
 */

import { Injectable } from '@nestjs/common';
import { prisma, type NodeApp, type Prisma } from '@cdm/database';

// Story 2.9: Extended APP data type with JSON fields support
type NodeAppData = {
  appSourceType?: string | null;
  appPath?: string | null;
  appUrl?: string | null;
  libraryAppId?: string | null;
  libraryAppName?: string | null;
  // Support InputJsonValue for data, DbNull for clearing, undefined for no-update
  inputs?: Prisma.InputJsonValue | Prisma.NullTypes.DbNull;
  outputs?: Prisma.InputJsonValue | Prisma.NullTypes.DbNull;
  executionStatus?: string | null;
  lastExecutedAt?: Date | null;
  errorMessage?: string | null;
};

@Injectable()
export class NodeAppRepository {
  async upsert(nodeId: string, data: NodeAppData): Promise<NodeApp> {
    return prisma.nodeApp.upsert({
      where: { nodeId },
      create: {
        nodeId,
        appSourceType: data.appSourceType ?? 'library',
        appPath: data.appPath,
        appUrl: data.appUrl,
        libraryAppId: data.libraryAppId,
        libraryAppName: data.libraryAppName,
        inputs: data.inputs,
        outputs: data.outputs,
        executionStatus: data.executionStatus ?? 'idle',
        lastExecutedAt: data.lastExecutedAt,
        errorMessage: data.errorMessage,
      },
      update: {
        appSourceType: data.appSourceType,
        appPath: data.appPath,
        appUrl: data.appUrl,
        libraryAppId: data.libraryAppId,
        libraryAppName: data.libraryAppName,
        inputs: data.inputs,
        outputs: data.outputs,
        executionStatus: data.executionStatus,
        lastExecutedAt: data.lastExecutedAt,
        errorMessage: data.errorMessage,
      },
    });
  }

  async findByNodeId(nodeId: string): Promise<NodeApp | null> {
    return prisma.nodeApp.findUnique({
      where: { nodeId },
    });
  }
}
