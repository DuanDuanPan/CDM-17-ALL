/**
 * Story 10.7: subscriptions 插件化迁移
 * Unit Tests for SubscriptionRepository
 * 
 * Created during Code Review Round 2 to improve test coverage
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */

import { SubscriptionRepository } from '../subscriptions.repository';

// Mock prisma
jest.mock('@cdm/database', () => ({
    prisma: {
        subscription: {
            create: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

import { prisma } from '@cdm/database';

describe('SubscriptionRepository', () => {
    let repository: SubscriptionRepository;

    const mockUserId = 'user-1';
    const mockNodeId = 'node-1';
    const mockGraphId = 'graph-1';

    const mockSubscription = {
        id: 'sub-1',
        userId: mockUserId,
        nodeId: mockNodeId,
        mindmapId: mockGraphId,
        createdAt: new Date(),
    };

    beforeEach(() => {
        repository = new SubscriptionRepository();
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a new subscription', async () => {
            (prisma.subscription.create as jest.Mock).mockResolvedValue(mockSubscription);

            const result = await repository.create({
                userId: mockUserId,
                nodeId: mockNodeId,
                mindmapId: mockGraphId,
            });

            expect(result).toEqual(mockSubscription);
            expect(prisma.subscription.create).toHaveBeenCalledWith({
                data: {
                    userId: mockUserId,
                    nodeId: mockNodeId,
                    mindmapId: mockGraphId,
                },
            });
        });
    });

    describe('delete', () => {
        it('should delete a subscription and return it', async () => {
            (prisma.subscription.delete as jest.Mock).mockResolvedValue(mockSubscription);

            const result = await repository.delete(mockUserId, mockNodeId);

            expect(result).toEqual(mockSubscription);
            expect(prisma.subscription.delete).toHaveBeenCalledWith({
                where: {
                    userId_nodeId: {
                        userId: mockUserId,
                        nodeId: mockNodeId,
                    },
                },
            });
        });

        it('should return null if subscription not found', async () => {
            (prisma.subscription.delete as jest.Mock).mockRejectedValue(new Error('Record not found'));

            const result = await repository.delete(mockUserId, mockNodeId);

            expect(result).toBeNull();
        });
    });

    describe('findByUserAndNode', () => {
        it('should find subscription by userId and nodeId', async () => {
            (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(mockSubscription);

            const result = await repository.findByUserAndNode(mockUserId, mockNodeId);

            expect(result).toEqual(mockSubscription);
            expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
                where: {
                    userId_nodeId: {
                        userId: mockUserId,
                        nodeId: mockNodeId,
                    },
                },
            });
        });

        it('should return null if not found', async () => {
            (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await repository.findByUserAndNode(mockUserId, mockNodeId);

            expect(result).toBeNull();
        });
    });

    describe('isSubscribed', () => {
        it('should return true when subscription exists', async () => {
            (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(mockSubscription);

            const result = await repository.isSubscribed(mockUserId, mockNodeId);

            expect(result).toBe(true);
        });

        it('should return false when subscription does not exist', async () => {
            (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await repository.isSubscribed(mockUserId, mockNodeId);

            expect(result).toBe(false);
        });
    });

    describe('findSubscribersByNode', () => {
        it('should find all subscribers for a node', async () => {
            const mockSubscriptions = [
                mockSubscription,
                { ...mockSubscription, id: 'sub-2', userId: 'user-2' },
            ];
            (prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

            const result = await repository.findSubscribersByNode(mockNodeId);

            expect(result).toEqual(mockSubscriptions);
            expect(prisma.subscription.findMany).toHaveBeenCalledWith({
                where: { nodeId: mockNodeId },
            });
        });
    });

    describe('findSubscribersByNodes', () => {
        it('should find subscribers for multiple nodes', async () => {
            const mockSubscriptions = [mockSubscription];
            (prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

            const result = await repository.findSubscribersByNodes(['node-1', 'node-2']);

            expect(result).toEqual(mockSubscriptions);
            expect(prisma.subscription.findMany).toHaveBeenCalledWith({
                where: { nodeId: { in: ['node-1', 'node-2'] } },
            });
        });

        it('should return empty array for empty nodeIds', async () => {
            const result = await repository.findSubscribersByNodes([]);

            expect(result).toEqual([]);
            expect(prisma.subscription.findMany).not.toHaveBeenCalled();
        });
    });

    describe('findSubscribersByMindmap', () => {
        it('should find all subscribers for a mindmap', async () => {
            const mockSubscriptions = [mockSubscription];
            (prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

            const result = await repository.findSubscribersByMindmap(mockGraphId);

            expect(result).toEqual(mockSubscriptions);
            expect(prisma.subscription.findMany).toHaveBeenCalledWith({
                where: { mindmapId: mockGraphId },
            });
        });
    });

    describe('findByUser', () => {
        it('should find all subscriptions for a user', async () => {
            const mockSubscriptions = [mockSubscription];
            (prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

            const result = await repository.findByUser(mockUserId);

            expect(result).toEqual(mockSubscriptions);
            expect(prisma.subscription.findMany).toHaveBeenCalledWith({
                where: { userId: mockUserId },
                orderBy: { createdAt: 'desc' },
            });
        });
    });

    describe('countByUser', () => {
        it('should count subscriptions for a user', async () => {
            (prisma.subscription.count as jest.Mock).mockResolvedValue(5);

            const result = await repository.countByUser(mockUserId);

            expect(result).toBe(5);
            expect(prisma.subscription.count).toHaveBeenCalledWith({
                where: { userId: mockUserId },
            });
        });
    });
});
