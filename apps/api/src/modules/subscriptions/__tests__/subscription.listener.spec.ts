/**
 * Story 4.4: Watch & Subscription
 * Unit Tests for SubscriptionListener (Throttling Logic)
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */

import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionListener, NodeChangedEvent } from '../subscription.listener';
import { SubscriptionRepository } from '../subscriptions.repository';
import { NotificationService } from '../../notification/notification.service';

// Mock prisma
jest.mock('@cdm/database', () => ({
    prisma: {
        graph: {
            findUnique: jest.fn(),
        },
        node: {
            findFirst: jest.fn(),
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
            (prisma.node.findFirst as jest.Mock).mockResolvedValue({ id: mockNodeId });
            mockNotificationService.createAndNotify.mockResolvedValue({} as any);

            // Send first event - should trigger immediate notification (rising edge)
            await listener.handleNodeChanged(createNodeChangedEvent());

            // Notification should be sent immediately for first event
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledTimes(1);

            // Send more events within throttle window
            await listener.handleNodeChanged(createNodeChangedEvent({ nodeName: 'Node 2' }));
            await listener.handleNodeChanged(createNodeChangedEvent({ nodeName: 'Node 3' }));

            // Should still only be 1 notification (throttled)
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledTimes(1);

            // Fast-forward past throttle window (5 minutes)
            jest.advanceTimersByTime(5 * 60 * 1000 + 100);

            // Wait for async operations
            await Promise.resolve();
            await Promise.resolve();

            // Now should have sent aggregated notification
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledTimes(2);
        });

        it('should aggregate multiple changed nodes in notification message', async () => {
            const subscriber = {
                userId: 'subscriber-1',
                nodeId: mockNodeId,
                mindmapId: mockGraphId,
                id: 'sub-1',
                createdAt: new Date(),
            };
            mockSubscriptionRepo.findSubscribersByNode.mockResolvedValue([subscriber]);
            (prisma.graph.findUnique as jest.Mock).mockResolvedValue({ id: mockGraphId });
            (prisma.node.findFirst as jest.Mock).mockResolvedValue({ id: mockNodeId });
            mockNotificationService.createAndNotify.mockResolvedValue({} as any);

            // Send first event
            await listener.handleNodeChanged(createNodeChangedEvent({ nodeName: 'Node A' }));

            // Check notification contains correct node name
            expect(mockNotificationService.createAndNotify).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipientId: 'subscriber-1',
                    type: 'WATCH_UPDATE',
                    title: expect.stringContaining('Node A'),
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
});
