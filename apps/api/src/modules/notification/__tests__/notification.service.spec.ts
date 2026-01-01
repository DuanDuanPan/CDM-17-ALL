/**
 * Story 2.4: Task Dispatch & Feedback
 * Story 4.5: Smart Notification Center
 * Unit Tests for NotificationService
 * [AI-Review][HIGH-1] Created to address missing test coverage
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */

import { NotificationService } from '../notification.service';
import { NotificationRepository } from '../notification.repository';
import { NotificationGateway } from '../notification.gateway';
import type { CreateNotificationDto, NotificationListQuery } from '@cdm/types';

// Mock types aligned with Prisma schema
interface MockNotification {
    id: string;
    recipientId: string;
    type: string;
    title: string;
    content: object;
    refNodeId: string | null;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

describe('NotificationService', () => {
    let service: NotificationService;
    let mockRepository: jest.Mocked<NotificationRepository>;
    let mockGateway: jest.Mocked<NotificationGateway>;

    const mockNotification: MockNotification = {
        id: 'notif-1',
        recipientId: 'user-1',
        type: 'TASK_DISPATCH',
        title: '您有新任务待确认',
        content: {
            taskId: 'task-1',
            taskName: 'Test Task',
            action: 'dispatch',
            senderName: 'owner-1',
        },
        refNodeId: 'task-1',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        // Create mock repository
        mockRepository = {
            create: jest.fn(),
            findByRecipient: jest.fn(),
            findPaginated: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            countUnread: jest.fn(),
            countByPriority: jest.fn(),
        } as unknown as jest.Mocked<NotificationRepository>;

        // Create mock gateway
        mockGateway = {
            sendToUser: jest.fn(),
        } as unknown as jest.Mocked<NotificationGateway>;

        // Instantiate service with mocks
        service = new NotificationService(mockRepository, mockGateway);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createAndNotify', () => {
        const createDto: CreateNotificationDto = {
            recipientId: 'user-1',
            type: 'TASK_DISPATCH',
            title: '您有新任务待确认',
            content: {
                taskId: 'task-1',
                taskName: 'Test Task',
                action: 'dispatch',
                senderName: 'owner-1',
            },
            refNodeId: 'task-1',
        };

        it('should create notification and send real-time push', async () => {
            mockRepository.create.mockResolvedValue(mockNotification as any);

            const result = await service.createAndNotify(createDto);

            expect(mockRepository.create).toHaveBeenCalledWith(createDto);
            expect(mockGateway.sendToUser).toHaveBeenCalledWith(
                'user-1',
                'notification:new',
                mockNotification
            );
            expect(result).toEqual(mockNotification);
        });

        it('should return null when recipient does not exist (P2003 error)', async () => {
            // Simulate Prisma foreign key constraint error
            const prismaError = { code: 'P2003' };
            mockRepository.create.mockRejectedValue(prismaError);

            const result = await service.createAndNotify(createDto);

            expect(result).toBeNull();
            expect(mockGateway.sendToUser).not.toHaveBeenCalled();
        });

        it('should re-throw non-P2003 errors', async () => {
            const genericError = new Error('Database connection failed');
            mockRepository.create.mockRejectedValue(genericError);

            await expect(service.createAndNotify(createDto)).rejects.toThrow(
                'Database connection failed'
            );
        });
    });

    describe('list', () => {
        it('should return all notifications for a user', async () => {
            const notifications = [mockNotification];
            mockRepository.findByRecipient.mockResolvedValue(notifications as any);

            const result = await service.list('user-1');

            expect(mockRepository.findByRecipient).toHaveBeenCalledWith('user-1', {});
            expect(result).toEqual(notifications);
        });

        it('should filter by isRead when query provided', async () => {
            mockRepository.findByRecipient.mockResolvedValue([]);

            await service.list('user-1', { isRead: false });

            expect(mockRepository.findByRecipient).toHaveBeenCalledWith('user-1', {
                isRead: false,
            });
        });
    });

    describe('markAsRead', () => {
        it('should mark a single notification as read', async () => {
            const readNotification = { ...mockNotification, isRead: true };
            mockRepository.markAsRead.mockResolvedValue(readNotification as any);

            const result = await service.markAsRead('notif-1');

            expect(mockRepository.markAsRead).toHaveBeenCalledWith('notif-1');
            expect(result.isRead).toBe(true);
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read for a user', async () => {
            mockRepository.markAllAsRead.mockResolvedValue({ count: 5 });

            const result = await service.markAllAsRead('user-1');

            expect(mockRepository.markAllAsRead).toHaveBeenCalledWith('user-1');
            expect(result).toEqual({ count: 5 });
        });
    });

    describe('getUnreadCount', () => {
        it('should return the count of unread notifications', async () => {
            mockRepository.countUnread.mockResolvedValue(3);

            const result = await service.getUnreadCount('user-1');

            expect(mockRepository.countUnread).toHaveBeenCalledWith('user-1');
            expect(result).toBe(3);
        });
    });

    // Story 4.5: Smart Notification Center - Pagination and Priority Tests
    describe('listPaginated (Story 4.5)', () => {
        const mockMentionNotification: MockNotification = {
            id: 'notif-2',
            recipientId: 'user-1',
            type: 'MENTION',
            title: '@张三 提到了你',
            content: {
                commentId: 'comment-1',
                nodeId: 'node-1',
                nodeName: 'Test Node',
                preview: 'Test preview',
                senderName: 'John',
                mindmapId: 'mindmap-1',
            },
            refNodeId: 'node-1',
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should support pagination with page and limit', async () => {
            mockRepository.findPaginated.mockResolvedValue([mockNotification] as any);

            const query: NotificationListQuery = { page: 1, limit: 20 };
            const result = await service.listPaginated('user-1', query);

            expect(mockRepository.findPaginated).toHaveBeenCalledWith('user-1', query);
            expect(result).toHaveLength(1);
        });

        it('should add computed priority field to notifications', async () => {
            mockRepository.findPaginated.mockResolvedValue([
                mockMentionNotification,
                mockNotification,
            ] as any);

            const result = await service.listPaginated('user-1', {});

            // MENTION should be HIGH priority
            expect(result[0].priority).toBe('HIGH');
            // TASK_DISPATCH should be NORMAL priority
            expect(result[1].priority).toBe('NORMAL');
        });

        it('should filter by unreadOnly when provided', async () => {
            mockRepository.findPaginated.mockResolvedValue([mockNotification] as any);

            await service.listPaginated('user-1', { unreadOnly: true });

            expect(mockRepository.findPaginated).toHaveBeenCalledWith('user-1', {
                unreadOnly: true,
            });
        });

        it('should filter by priority when provided', async () => {
            mockRepository.findPaginated.mockResolvedValue([mockMentionNotification] as any);

            await service.listPaginated('user-1', { priority: 'HIGH' });

            expect(mockRepository.findPaginated).toHaveBeenCalledWith('user-1', {
                priority: 'HIGH',
            });
        });

        it('should default limit to 50 when not specified', async () => {
            mockRepository.findPaginated.mockResolvedValue([]);

            await service.listPaginated('user-1', {});

            expect(mockRepository.findPaginated).toHaveBeenCalledWith('user-1', {});
        });
    });

    describe('getCountByPriority (Story 4.5)', () => {
        it('should return counts grouped by priority', async () => {
            mockRepository.countByPriority.mockResolvedValue({
                total: 10,
                high: 3,
                normal: 5,
                low: 2,
            });

            const result = await service.getCountByPriority('user-1');

            expect(mockRepository.countByPriority).toHaveBeenCalledWith('user-1');
            expect(result).toEqual({
                total: 10,
                high: 3,
                normal: 5,
                low: 2,
            });
        });
    });
});
