/**
 * Story 4.4: Watch & Subscription
 * Unit Tests for SubscriptionService
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */

import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubscriptionService } from '../subscriptions.service';
import { SubscriptionRepository } from '../subscriptions.repository';

// Mock prisma
jest.mock('@cdm/database', () => ({
    prisma: {
        node: {
            findUnique: jest.fn(),
        },
    },
}));

import { prisma } from '@cdm/database';

describe('SubscriptionService', () => {
    let service: SubscriptionService;
    let mockRepository: jest.Mocked<SubscriptionRepository>;

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
        mockRepository = {
            create: jest.fn(),
            findByUserAndNode: jest.fn(),
            findByUser: jest.fn(),
            countByUser: jest.fn(),
            delete: jest.fn(),
            findSubscribersByNode: jest.fn(),
            findSubscribersByMindmap: jest.fn(),
        } as unknown as jest.Mocked<SubscriptionRepository>;

        service = new SubscriptionService(mockRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('subscribe', () => {
        it('should subscribe to a node successfully', async () => {
            (prisma.node.findUnique as jest.Mock).mockResolvedValue({
                id: mockNodeId,
                graphId: mockGraphId,
                label: 'Test Node',
            });
            mockRepository.findByUserAndNode.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(mockSubscription);

            const result = await service.subscribe(mockUserId, mockNodeId);

            expect(result).toEqual(mockSubscription);
            expect(mockRepository.create).toHaveBeenCalledWith({
                userId: mockUserId,
                nodeId: mockNodeId,
                mindmapId: mockGraphId,
            });
        });

        it('should throw NotFoundException when node not found', async () => {
            (prisma.node.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.subscribe(mockUserId, mockNodeId)).rejects.toThrow(
                NotFoundException
            );
        });

        it('should throw ConflictException when already subscribed', async () => {
            (prisma.node.findUnique as jest.Mock).mockResolvedValue({
                id: mockNodeId,
                graphId: mockGraphId,
                label: 'Test Node',
            });
            mockRepository.findByUserAndNode.mockResolvedValue(mockSubscription);

            await expect(service.subscribe(mockUserId, mockNodeId)).rejects.toThrow(
                ConflictException
            );
        });
    });

    describe('unsubscribe', () => {
        it('should unsubscribe from a node successfully', async () => {
            mockRepository.delete.mockResolvedValue(mockSubscription as any);

            await expect(
                service.unsubscribe(mockUserId, mockNodeId)
            ).resolves.not.toThrow();
            expect(mockRepository.delete).toHaveBeenCalledWith(mockUserId, mockNodeId);
        });

        it('should throw NotFoundException when subscription not found', async () => {
            mockRepository.delete.mockResolvedValue(null);

            await expect(service.unsubscribe(mockUserId, mockNodeId)).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('checkSubscription', () => {
        it('should return isSubscribed: true when subscribed', async () => {
            mockRepository.findByUserAndNode.mockResolvedValue(mockSubscription);

            const result = await service.checkSubscription(mockUserId, mockNodeId);

            expect(result).toEqual({
                isSubscribed: true,
                subscriptionId: 'sub-1',
            });
        });

        it('should return isSubscribed: false when not subscribed', async () => {
            mockRepository.findByUserAndNode.mockResolvedValue(null);

            const result = await service.checkSubscription(mockUserId, mockNodeId);

            expect(result).toEqual({
                isSubscribed: false,
                subscriptionId: undefined,
            });
        });
    });

    describe('listUserSubscriptions', () => {
        it('should return list of subscriptions for a user', async () => {
            mockRepository.findByUser.mockResolvedValue([mockSubscription]);
            mockRepository.countByUser.mockResolvedValue(1);

            const result = await service.listUserSubscriptions(mockUserId);

            expect(result.total).toBe(1);
            expect(result.subscriptions).toHaveLength(1);
            expect(result.subscriptions[0].id).toBe('sub-1');
        });
    });

    describe('getNodeSubscribers', () => {
        it('should return list of subscriber user IDs', async () => {
            mockRepository.findSubscribersByNode.mockResolvedValue([
                { userId: 'user-1', nodeId: mockNodeId, mindmapId: mockGraphId, id: 'sub-1', createdAt: new Date() },
                { userId: 'user-2', nodeId: mockNodeId, mindmapId: mockGraphId, id: 'sub-2', createdAt: new Date() },
            ]);

            const result = await service.getNodeSubscribers(mockNodeId);

            expect(result).toEqual(['user-1', 'user-2']);
        });
    });

    describe('getMindmapSubscribers', () => {
        it('should return deduplicated list of subscriber user IDs', async () => {
            mockRepository.findSubscribersByMindmap.mockResolvedValue([
                { userId: 'user-1', nodeId: 'node-1', mindmapId: mockGraphId, id: 'sub-1', createdAt: new Date() },
                { userId: 'user-1', nodeId: 'node-2', mindmapId: mockGraphId, id: 'sub-2', createdAt: new Date() },
                { userId: 'user-2', nodeId: 'node-3', mindmapId: mockGraphId, id: 'sub-3', createdAt: new Date() },
            ]);

            const result = await service.getMindmapSubscribers(mockGraphId);

            expect(result).toEqual(['user-1', 'user-2']);
        });
    });
});
