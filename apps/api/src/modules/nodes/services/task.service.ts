import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskProps } from '@cdm/types';
import { NodeTaskRepository } from '../repositories/node-task.repository';
import { NotificationService } from '../../notification/notification.service';

@Injectable()
export class TaskService {
  constructor(
    private readonly taskRepo: NodeTaskRepository,
    private readonly notificationService: NotificationService
  ) {}

  async initialize(nodeId: string) {
    return this.taskRepo.upsert(nodeId, { status: 'todo', priority: 'medium' });
  }

  async upsertProps(nodeId: string, props: TaskProps) {
    const data = {
      status: props.status || 'todo',
      assigneeId: props.assigneeId || null,
      dueDate: props.dueDate ? new Date(props.dueDate) : null,
      startDate: props.startDate ? new Date(props.startDate) : null,
      customStage: props.customStage || null,
      progress: typeof props.progress === 'number' ? props.progress : null,
      priority: props.priority || 'medium',
    };
    return this.taskRepo.upsert(nodeId, data);
  }

  /**
   * Story 2.4: Dispatch task to assignee
   * @param nodeId - Node ID of the task
   * @param ownerId - User ID of the task owner/dispatcher
   */
  async dispatchTask(nodeId: string, ownerId: string) {
    // 1. 前置条件检查
    const task = await this.taskRepo.findByNodeId(nodeId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (!['idle', 'rejected'].includes(task.assignmentStatus)) {
      throw new BadRequestException(
        'Task can only be dispatched when idle or rejected'
      );
    }
    if (!task.assigneeId) {
      throw new BadRequestException('Task must have an assignee before dispatch');
    }

    // 2. 更新状态
    const updated = await this.taskRepo.update(nodeId, {
      assignmentStatus: 'dispatched',
      ownerId,
      dispatchedAt: new Date(),
      rejectionReason: null, // 清除之前的驳回理由
    });

    // 3. 创建通知
    await this.notificationService.createAndNotify({
      recipientId: task.assigneeId,
      type: 'TASK_DISPATCH',
      title: '您有新任务待确认',
      content: {
        taskId: nodeId,
        taskName: task.node.label,
        action: 'dispatch',
        senderName: ownerId,
      },
      refNodeId: nodeId,
    });

    // 4. TODO: 审计日志 (delayed to future story)
    // await this.auditService.log('TASK_DISPATCHED', nodeId, ownerId, { assigneeId: task.assigneeId });

    return updated;
  }

  /**
   * Story 2.4: Assignee feedback (accept/reject) on dispatched task
   * @param nodeId - Node ID of the task
   * @param userId - User ID of the assignee
   * @param action - 'accept' or 'reject'
   * @param reason - Rejection reason (required if action is 'reject')
   */
  async feedbackTask(
    nodeId: string,
    userId: string,
    action: 'accept' | 'reject',
    reason?: string
  ) {
    // 1. 前置条件检查
    const task = await this.taskRepo.findByNodeId(nodeId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.assignmentStatus !== 'dispatched') {
      throw new BadRequestException('Task is not in dispatched state');
    }
    if (task.assigneeId !== userId) {
      throw new ForbiddenException('Only the assignee can accept or reject');
    }
    if (action === 'reject' && !reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    // 2. 更新状态
    const updateData: any = {
      assignmentStatus: action === 'accept' ? 'accepted' : 'rejected',
      feedbackAt: new Date(),
    };
    if (action === 'accept') {
      updateData.status = 'todo'; // 接收后进入待办状态
    }
    if (action === 'reject') {
      updateData.rejectionReason = reason;
    }

    const updated = await this.taskRepo.update(nodeId, updateData);

    // 3. 通知 Owner
    if (task.ownerId) {
      await this.notificationService.createAndNotify({
        recipientId: task.ownerId,
        type: action === 'accept' ? 'TASK_ACCEPTED' : 'TASK_REJECTED',
        title: action === 'accept' ? '任务已被接收' : '任务被驳回',
        content: {
          taskId: nodeId,
          taskName: task.node.label,
          action,
          senderName: userId,
          ...(reason && { reason }),
        },
        refNodeId: nodeId,
      });
    }

    // 4. TODO: 审计日志 (delayed to future story)
    // await this.auditService.log(
    //   action === 'accept' ? 'TASK_ACCEPTED' : 'TASK_REJECTED',
    //   nodeId,
    //   userId,
    //   { reason }
    // );

    return updated;
  }
}
