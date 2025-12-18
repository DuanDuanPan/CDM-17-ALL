import { Injectable } from '@nestjs/common';
import { TaskProps } from '@cdm/types';
import { NodeTaskRepository } from '../repositories/node-task.repository';

@Injectable()
export class TaskService {
  constructor(private readonly taskRepo: NodeTaskRepository) {}

  async initialize(nodeId: string) {
    return this.taskRepo.upsert(nodeId, { status: 'todo', priority: 'medium' });
  }

  async upsertProps(nodeId: string, props: TaskProps) {
    const data = {
      status: props.status || 'todo',
      assigneeId: props.assigneeId || null,
      dueDate: props.dueDate ? new Date(props.dueDate) : null,
      priority: props.priority || 'medium',
    };
    return this.taskRepo.upsert(nodeId, data);
  }
}
