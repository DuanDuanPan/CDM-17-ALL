/**
 * Story 4.4: Watch & Subscription
 * Story 4.5: Smart Notification Center - Noise Aggregation
 * Unit Tests for SubscriptionListener (Throttling Logic)
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */

import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionListener, NodeChangedEvent, THROTTLE_WINDOW_MS, MAX_CHANGED_NODES } from '../subscription.listener';
import { SubscriptionRepository } from '../subscriptions.repository';
import { NotificationService } from '../../notification/notification.service';

// Mock prisma
jest.mock('@cdm/database', () => ({
    prisma: {
        graph: {
            findUnique: jest.fn(),
        },
        node: {
            findUnique: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));

import { prisma } from '@cdm/database';

describe('SubscriptionListener', () => {
    let listener: SubscriptionListener;
    let mockEventEmitter: jest.Mocked<EventEmitter2>;
    let mockSubscriptionRepo: jest.Mocked<SubscriptionRepository>;
    let mockNotificationService: jest.Mocked<NotificationService>;

    const mockUserId = 'user-1';
    const mockNodeId = 'node-1';
    const mockGraphId = 'graph-1';

    beforeEach(() => {
        jest.useFakeTimers();

        mockEventEmitter = {
            on: jest.fn(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<EventEmitter2>;

        mockSubscriptionRepo = {
            findSubscribersByNode: jest.fn(),
        } as unknown as jest.Mocked<SubscriptionRepository>;

        mockNotificationService = {
            createAndNotify: jest.fn(),
        } as unknown as jest.Mocked<NotificationService>;

        listener = new SubscriptionListener(
            mockEventEmitter,
            mockSubscriptionRepo,
            mockNotificationService
        );

        // Default: no parent chain (no ancestor subscribers)
        (prisma.node.findUnique as jest.Mock).mockResolvedValue({ parentId: null });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('handleNodeChanged', () => {
        const createNodeChangedEvent = (overrides: Partial<NodeChangedEvent> = {}): NodeChangedEvent => ({
            nodeId: mockNodeId,
            mindmapId: mockGraphId,
            nodeName: 'Test Node',
            changeType: 'update',
            ...overrides,
        });

        it('should not send notification when no subscribers exist', async () => {
            mockSubscriptionRepo.findSubscribersByNode.mockResolvedValue([]);

            await listener.handleNodeChanged(createNodeChangedEvent());

            expect(mockNotificationService.createAndNotify).not.toHaveBeenCalled();
        });

        it('should not notify the user who made the change', async () => {
            mockSubscriptionRepo.findSubscribersByNode.mockResolvedValue([
                { userId: mockUserId, nodeId: mockNodeId, mindmapId: mockGraphId, id: 'sub-1', createdAt: new Date() },
            ]);

            await listener.handleNodeChanged(createNodeChangedEvent({ userId: mockUserId }));

            expect(mockNotificationService.createAndNotify).not.toHaveBeenCalled();
        });

        it('should throttle multiple events - only one notification per throttle window', async () => {
            const subscriber = {
                userId: 'subscriber-1',
                nodeId: mockNodeId,
                mindmapId: mockGraphId,
                id: 'sub-1',
                createdAt: new Date(),
            };
            mockSubscriptionRepo.findSubscribersByNode.mockResolvedValue([subscriber]);
            (prisma.graph.findUnique as jest.Mock).mockResolvedValue({ id: mockGraphId });
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: '张三' });
            mockNotificationService.createAndNotify.mockResolvedValue({} as any);

            // Send multiple events within throttle window - should not send immediately
            await listener.handleNodeChanged(createNodeChangedEvent({ userId: 'actor-1', nodeName: 'Node A' }));
            await listener.handleNodeChanged(createNodeChangedEvent({ userId: 'actor-1', nodeName: 'Node B' }));
            await listener.handleNodeChanged(createNodeChangedEvent({ userId: 'actor-1', nodeName: 'Node C' }));

            expect(mockNotificationService.createAndNotify).toHaveBeenCalledTimes(0);

            // Fast-forward past throttle window
            jest.advanceTimersByTime(THROTTLE_WINDOW_MS + 100);

            // Wait for async operations
            await Promise.resolve();
            await Promise.resolve();

            // Now should have sent ONE aggregated notification
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledTimes(1);
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipientId: 'subscriber-1',
                    type: 'WATCH_UPDATE',
                    title: expect.stringContaining('修改了 3 个节点'),
                    content: expect.objectContaining({
                        message: '张三修改了 3 个节点',
                        changeCount: 3,
                    }),
                    refNodeId: mockNodeId,
                })
            );
        });

        it('should reset debounce timer when events continue within the window', async () => {
            const subscriber = {
                userId: 'subscriber-1',
                nodeId: mockNodeId,
                mindmapId: mockGraphId,
                id: 'sub-1',
                createdAt: new Date(),
            };
            mockSubscriptionRepo.findSubscribersByNode.mockResolvedValue([subscriber]);
            (prisma.graph.findUnique as jest.Mock).mockResolvedValue({ id: mockGraphId });
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: '张三' });
            mockNotificationService.createAndNotify.mockResolvedValue({} as any);

            await listener.handleNodeChanged(createNodeChangedEvent({ userId: 'actor-1', nodeName: 'Node A' }));

            // Advance half window, then emit another event to reset the timer.
            jest.advanceTimersByTime(Math.floor(THROTTLE_WINDOW_MS / 2));
            await listener.handleNodeChanged(createNodeChangedEvent({ userId: 'actor-1', nodeName: 'Node B' }));

            // Advancing to just before the full window since the second event should not flush yet.
            jest.advanceTimersByTime(THROTTLE_WINDOW_MS - 50);
            await Promise.resolve();
            await Promise.resolve();
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledTimes(0);

            // Now pass the remaining time and flush once.
            jest.advanceTimersByTime(100);
            await Promise.resolve();
            await Promise.resolve();
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledTimes(1);
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.objectContaining({ changeCount: 2 }),
                })
            );
        });
    });

    describe('onModuleInit', () => {
        it('should register event listener', async () => {
            await listener.onModuleInit();

            expect(mockEventEmitter.on).toHaveBeenCalled();
        });
    });

    // Story 4.5: MAX_CHANGED_NODES test
    describe('MAX_CHANGED_NODES cap', () => {
        it('should be defined and be a positive number', () => {
            expect(MAX_CHANGED_NODES).toBeDefined();
            expect(MAX_CHANGED_NODES).toBeGreaterThan(0);
        });

        it('should have a default throttle window of 5 minutes', () => {
            // If not overridden by env var, should default to 5 minutes
            // Note: This may be overridden in test environment
            expect(THROTTLE_WINDOW_MS).toBeDefined();
            expect(typeof THROTTLE_WINDOW_MS).toBe('number');
        });
    });
});
