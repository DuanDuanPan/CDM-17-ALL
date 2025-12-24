import { Injectable } from '@nestjs/common';
import { prisma, type Prisma, type NodeTask } from '@cdm/database';

const NODE_TASK_WITH_NODE_INCLUDE = {
  node: true,
} as const;

type NodeTaskWithNode = Prisma.NodeTaskGetPayload<{ include: typeof NODE_TASK_WITH_NODE_INCLUDE }>;

@Injectable()
export class NodeTaskRepository {
  async upsert(
    nodeId: string,
    data: {
      status?: string;
      assigneeId?: string | null;
      dueDate?: Date | null;
      startDate?: Date | null;
      customStage?: string | null;
      progress?: number | null;
      priority?: string | null;
      knowledgeRefs?: Prisma.InputJsonValue | Prisma.NullTypes.DbNull;
    }
  ) {
    return prisma.nodeTask.upsert({
      where: { nodeId },
      create: { nodeId, ...data },
      update: data,
    });
  }

  // Story 2.4: Additional methods for task dispatch & feedback
  async findByNodeId(
    nodeId: string
  ): Promise<NodeTaskWithNode | null> {
    return prisma.nodeTask.findUnique({
      where: { nodeId },
      include: NODE_TASK_WITH_NODE_INCLUDE,
    });
  }

  async update(
    nodeId: string,
    data: {
      assignmentStatus?: string;
      ownerId?: string | null;
      rejectionReason?: string | null;
      dispatchedAt?: Date | null;
      feedbackAt?: Date | null;
      status?: string;
    }
  ): Promise<NodeTask> {
    return prisma.nodeTask.update({
      where: { nodeId },
      data,
    });
  }
}
