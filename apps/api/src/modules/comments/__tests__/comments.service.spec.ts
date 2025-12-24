/**
 * Story 4.3: Contextual Comments & Mentions
 * Unit tests for CommentsService (access control + threading validation)
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mocks */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentsService } from '../comments.service';

// Mock Prisma
jest.mock('@cdm/database', () => ({
    prisma: {
        node: {
            findUnique: jest.fn(),
        },
        graph: {
            findUnique: jest.fn(),
        },
    },
}));

import { prisma } from '@cdm/database';

describe('CommentsService', () => {
    let service: CommentsService;

    const mockRepo = {
        create: jest.fn(),
        findByNode: jest.fn(),
        findById: jest.fn(),
        delete: jest.fn(),
        getUnreadCounts: jest.fn(),
        markAsRead: jest.fn(),
        getCommentCount: jest.fn(),
    };

    const mockGateway = {
        emitCommentCreated: jest.fn(),
        emitCommentUpdated: jest.fn(),
        emitCommentDeleted: jest.fn(),
    };

    const mockNotificationService = {
        createAndNotify: jest.fn(),
    };

    const mockUsersService = {
        list: jest.fn(),
    };

    const mockPrisma = prisma as jest.Mocked<typeof prisma>;

    beforeEach(() => {
        service = new CommentsService(
            mockRepo as any,
            mockGateway as any,
            mockNotificationService as any,
            mockUsersService as any
        );
        jest.clearAllMocks();
    });

    describe('assertNodeReadAccess', () => {
        it('throws NotFoundException when node not found', async () => {
            (mockPrisma.node.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.assertNodeReadAccess('node-1', 'user-1')).rejects.toThrow(
                NotFoundException
            );
        });

        it('throws ForbiddenException when user is not project owner', async () => {
            (mockPrisma.node.findUnique as jest.Mock).mockResolvedValue({
                id: 'node-1',
                graph: { project: { ownerId: 'owner-1' } },
            });

            await expect(service.assertNodeReadAccess('node-1', 'user-2')).rejects.toThrow(
                ForbiddenException
            );
        });

        it('passes when user is project owner', async () => {
            (mockPrisma.node.findUnique as jest.Mock).mockResolvedValue({
                id: 'node-1',
                graph: { project: { ownerId: 'user-1' } },
            });

            await expect(service.assertNodeReadAccess('node-1', 'user-1')).resolves.toBeUndefined();
        });
    });

    describe('assertMindmapReadAccess', () => {
        it('throws NotFoundException when mindmap not found', async () => {
            (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.assertMindmapReadAccess('graph-1', 'user-1')
            ).rejects.toThrow(NotFoundException);
        });

        it('throws ForbiddenException when user is not project owner', async () => {
            (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue({
                id: 'graph-1',
                project: { ownerId: 'owner-1' },
            });

            await expect(
                service.assertMindmapReadAccess('graph-1', 'user-2')
            ).rejects.toThrow(ForbiddenException);
        });

        it('passes when user is project owner', async () => {
            (mockPrisma.graph.findUnique as jest.Mock).mockResolvedValue({
                id: 'graph-1',
                project: { ownerId: 'user-1' },
            });

            await expect(
                service.assertMindmapReadAccess('graph-1', 'user-1')
            ).resolves.toBeUndefined();
        });
    });

    describe('create', () => {
        beforeEach(() => {
            (mockPrisma.node.findUnique as jest.Mock).mockImplementation(async (args: any) => {
                if (args?.include) {
                    // assertNodeReadAccess()
                    return {
                        id: 'node-1',
                        graph: { project: { ownerId: 'user-1' } },
                    };
                }
                // getNode()
                return {
                    id: 'node-1',
                    label: 'Node 1',
                    graphId: 'graph-1',
                };
            });
        });

        it('throws NotFoundException when replyTo comment does not exist', async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                service.create(
                    { content: 'Hello', nodeId: 'node-1', replyToId: 'missing' },
                    'user-1'
                )
            ).rejects.toThrow(NotFoundException);

            expect(mockRepo.create).not.toHaveBeenCalled();
        });

        it('throws BadRequestException when replyTo references another node', async () => {
            mockRepo.findById.mockResolvedValue({
                id: 'comment-1',
                nodeId: 'node-2',
                mindmapId: 'graph-1',
                replyToId: null,
            });

            await expect(
                service.create(
                    { content: 'Hello', nodeId: 'node-1', replyToId: 'comment-1' },
                    'user-1'
                )
            ).rejects.toThrow(BadRequestException);

            expect(mockRepo.create).not.toHaveBeenCalled();
        });

        it('throws BadRequestException when replyTo references another mindmap', async () => {
            mockRepo.findById.mockResolvedValue({
                id: 'comment-1',
                nodeId: 'node-1',
                mindmapId: 'graph-2',
                replyToId: null,
            });

            await expect(
                service.create(
                    { content: 'Hello', nodeId: 'node-1', replyToId: 'comment-1' },
                    'user-1'
                )
            ).rejects.toThrow(BadRequestException);

            expect(mockRepo.create).not.toHaveBeenCalled();
        });

        it('throws BadRequestException when replying to a reply (max depth 2)', async () => {
            mockRepo.findById.mockResolvedValue({
                id: 'comment-1',
                nodeId: 'node-1',
                mindmapId: 'graph-1',
                replyToId: 'top-level-comment',
            });

            await expect(
                service.create(
                    { content: 'Hello', nodeId: 'node-1', replyToId: 'comment-1' },
                    'user-1'
                )
            ).rejects.toThrow(BadRequestException);

            expect(mockRepo.create).not.toHaveBeenCalled();
        });
    });
});

