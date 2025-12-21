/**
 * Story 2.4: Task Dispatch & Feedback
 * Unit Tests for TaskService (dispatchTask & feedbackTask)
 * [AI-Review][HIGH-1] Created to address missing test coverage
 */

import {
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { TaskService } from '../task.service';
import { NodeTaskRepository } from '../../repositories/node-task.repository';
import { NotificationService } from '../../../notification/notification.service';

// Mock task data aligned with Prisma schema
interface MockNodeTask {
    nodeId: string;
    status: string;
    assigneeId: string | null;
    ownerId: string | null;
    assignmentStatus: string;
    rejectionReason: string | null;
    dispatchedAt: Date | null;
    feedbackAt: Date | null;
    node: { id: string; label: string };
}

describe('TaskService', () => {
    let service: TaskService;
    let mockTaskRepo: jest.Mocked<NodeTaskRepository>;
    let mockNotificationService: jest.Mocked<NotificationService>;

    const mockTask: MockNodeTask = {
        nodeId: 'task-1',
        status: 'todo',
        assigneeId: 'assignee-1',
        ownerId: 'owner-1',
        assignmentStatus: 'idle',
        rejectionReason: null,
        dispatchedAt: null,
        feedbackAt: null,
        node: { id: 'task-1', label: 'Test Task' },
    };

    beforeEach(() => {
        // Create mock repository
        mockTaskRepo = {
            findByNodeId: jest.fn(),
            update: jest.fn(),
            upsert: jest.fn(),
        } as unknown as jest.Mocked<NodeTaskRepository>;

        // Create mock notification service
        mockNotificationService = {
            createAndNotify: jest.fn(),
        } as unknown as jest.Mocked<NotificationService>;

        // Instantiate service with mocks
        service = new TaskService(mockTaskRepo, mockNotificationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('dispatchTask', () => {
        it('should dispatch task successfully when idle with assignee', async () => {
            const idleTask = { ...mockTask, assignmentStatus: 'idle' };
            const updatedTask = { ...idleTask, assignmentStatus: 'dispatched' };

            mockTaskRepo.findByNodeId.mockResolvedValue(idleTask);
            mockTaskRepo.update.mockResolvedValue(updatedTask);
            mockNotificationService.createAndNotify.mockResolvedValue(null);

            const result = await service.dispatchTask('task-1', 'owner-1');

            expect(mockTaskRepo.findByNodeId).toHaveBeenCalledWith('task-1');
            expect(mockTaskRepo.update).toHaveBeenCalledWith('task-1', {
                assignmentStatus: 'dispatched',
                ownerId: 'owner-1',
                dispatchedAt: expect.any(Date),
                rejectionReason: null,
            });
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledWith({
                recipientId: 'assignee-1',
                type: 'TASK_DISPATCH',
                title: '您有新任务待确认',
                content: {
                    taskId: 'task-1',
                    taskName: 'Test Task',
                    action: 'dispatch',
                    senderName: 'owner-1',
                },
                refNodeId: 'task-1',
            });
            expect(result).toEqual(updatedTask);
        });

        it('should allow re-dispatch when previously rejected', async () => {
            const rejectedTask = {
                ...mockTask,
                assignmentStatus: 'rejected',
                rejectionReason: 'Not my responsibility',
            };
            const updatedTask = { ...rejectedTask, assignmentStatus: 'dispatched' };

            mockTaskRepo.findByNodeId.mockResolvedValue(rejectedTask);
            mockTaskRepo.update.mockResolvedValue(updatedTask);
            mockNotificationService.createAndNotify.mockResolvedValue(null);

            const result = await service.dispatchTask('task-1', 'owner-1');

            expect(result.assignmentStatus).toBe('dispatched');
        });

        it('should throw NotFoundException when task does not exist', async () => {
            mockTaskRepo.findByNodeId.mockResolvedValue(null);

            await expect(service.dispatchTask('non-existent', 'owner-1')).rejects.toThrow(
                NotFoundException
            );
        });

        it('should throw BadRequestException when task is already dispatched', async () => {
            const dispatchedTask = { ...mockTask, assignmentStatus: 'dispatched' };
            mockTaskRepo.findByNodeId.mockResolvedValue(dispatchedTask);

            await expect(service.dispatchTask('task-1', 'owner-1')).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw BadRequestException when task is already accepted', async () => {
            const acceptedTask = { ...mockTask, assignmentStatus: 'accepted' };
            mockTaskRepo.findByNodeId.mockResolvedValue(acceptedTask);

            await expect(service.dispatchTask('task-1', 'owner-1')).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw BadRequestException when task has no assignee', async () => {
            const noAssigneeTask = { ...mockTask, assigneeId: null };
            mockTaskRepo.findByNodeId.mockResolvedValue(noAssigneeTask);

            await expect(service.dispatchTask('task-1', 'owner-1')).rejects.toThrow(
                BadRequestException
            );
        });
    });

    describe('feedbackTask', () => {
        const dispatchedTask: MockNodeTask = {
            ...mockTask,
            assignmentStatus: 'dispatched',
            ownerId: 'owner-1',
        };

        describe('accept action', () => {
            it('should accept task successfully', async () => {
                const updatedTask = { ...dispatchedTask, assignmentStatus: 'accepted', status: 'todo' };

                mockTaskRepo.findByNodeId.mockResolvedValue(dispatchedTask);
                mockTaskRepo.update.mockResolvedValue(updatedTask);
                mockNotificationService.createAndNotify.mockResolvedValue(null);

                const result = await service.feedbackTask('task-1', 'assignee-1', 'accept');

                expect(mockTaskRepo.update).toHaveBeenCalledWith('task-1', {
                    assignmentStatus: 'accepted',
                    feedbackAt: expect.any(Date),
                    status: 'todo',
                });
                expect(mockNotificationService.createAndNotify).toHaveBeenCalledWith({
                    recipientId: 'owner-1',
                    type: 'TASK_ACCEPTED',
                    title: '任务已被接收',
                    content: {
                        taskId: 'task-1',
                        taskName: 'Test Task',
                        action: 'accept',
                        senderName: 'assignee-1',
                    },
                    refNodeId: 'task-1',
                });
                expect(result.assignmentStatus).toBe('accepted');
            });
        });

        describe('reject action', () => {
            it('should reject task with reason successfully', async () => {
                const updatedTask = {
                    ...dispatchedTask,
                    assignmentStatus: 'rejected',
                    rejectionReason: 'Not in my scope',
                };

                mockTaskRepo.findByNodeId.mockResolvedValue(dispatchedTask);
                mockTaskRepo.update.mockResolvedValue(updatedTask);
                mockNotificationService.createAndNotify.mockResolvedValue(null);

                const result = await service.feedbackTask(
                    'task-1',
                    'assignee-1',
                    'reject',
                    'Not in my scope'
                );

                expect(mockTaskRepo.update).toHaveBeenCalledWith('task-1', {
                    assignmentStatus: 'rejected',
                    feedbackAt: expect.any(Date),
                    rejectionReason: 'Not in my scope',
                });
                expect(mockNotificationService.createAndNotify).toHaveBeenCalledWith({
                    recipientId: 'owner-1',
                    type: 'TASK_REJECTED',
                    title: '任务被驳回',
                    content: {
                        taskId: 'task-1',
                        taskName: 'Test Task',
                        action: 'reject',
                        senderName: 'assignee-1',
                        reason: 'Not in my scope',
                    },
                    refNodeId: 'task-1',
                });
                expect(result.assignmentStatus).toBe('rejected');
            });

            it('should throw BadRequestException when reject without reason', async () => {
                mockTaskRepo.findByNodeId.mockResolvedValue(dispatchedTask);

                await expect(
                    service.feedbackTask('task-1', 'assignee-1', 'reject')
                ).rejects.toThrow(BadRequestException);
            });
        });

        describe('error cases', () => {
            it('should throw NotFoundException when task does not exist', async () => {
                mockTaskRepo.findByNodeId.mockResolvedValue(null);

                await expect(
                    service.feedbackTask('non-existent', 'assignee-1', 'accept')
                ).rejects.toThrow(NotFoundException);
            });

            it('should throw BadRequestException when task is not dispatched', async () => {
                const idleTask = { ...mockTask, assignmentStatus: 'idle' };
                mockTaskRepo.findByNodeId.mockResolvedValue(idleTask);

                await expect(
                    service.feedbackTask('task-1', 'assignee-1', 'accept')
                ).rejects.toThrow(BadRequestException);
            });

            it('should throw ForbiddenException when user is not the assignee', async () => {
                mockTaskRepo.findByNodeId.mockResolvedValue(dispatchedTask);

                await expect(
                    service.feedbackTask('task-1', 'other-user', 'accept')
                ).rejects.toThrow(ForbiddenException);
            });
        });

        it('should not send notification when task has no owner', async () => {
            const noOwnerTask = { ...dispatchedTask, ownerId: null };
            const updatedTask = { ...noOwnerTask, assignmentStatus: 'accepted' };

            mockTaskRepo.findByNodeId.mockResolvedValue(noOwnerTask);
            mockTaskRepo.update.mockResolvedValue(updatedTask);

            await service.feedbackTask('task-1', 'assignee-1', 'accept');

            expect(mockNotificationService.createAndNotify).not.toHaveBeenCalled();
        });
    });
});
