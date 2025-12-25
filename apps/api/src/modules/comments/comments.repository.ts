/**
 * Story 4.3: Contextual Comments & Mentions
 * Comments Repository - Database access layer for comments
 */

import { Injectable } from '@nestjs/common';
import { prisma, type Comment } from '@cdm/database';

export interface CommentWithAuthor extends Comment {
    author: {
        id: string;
        name: string | null;
        email: string;
    };
    attachments?: {
        id: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        storagePath: string;
        createdAt: Date;
    }[];
    replies?: CommentWithAuthor[];
}

export interface CreateCommentData {
    content: string;
    nodeId: string;
    mindmapId: string;
    authorId: string;
    replyToId?: string;
}

export interface CommentQueryOptions {
    limit?: number;
    cursor?: string;
}

@Injectable()
export class CommentsRepository {
    private readonly authorSelect = {
        id: true,
        name: true,
        email: true,
    } as const;

    /**
     * Create a new comment
     */
    async create(data: CreateCommentData): Promise<CommentWithAuthor> {
        return prisma.comment.create({
            data: {
                content: data.content,
                nodeId: data.nodeId,
                mindmapId: data.mindmapId,
                authorId: data.authorId,
                replyToId: data.replyToId,
            },
            include: {
                author: { select: this.authorSelect },
                attachments: true,
            },
        });
    }

    /**
     * Find comments for a specific node (top-level only, with replies)
     */
    async findByNode(
        nodeId: string,
        options?: CommentQueryOptions
    ): Promise<CommentWithAuthor[]> {
        const limit = options?.limit ?? 50;

        return prisma.comment.findMany({
            where: {
                nodeId,
                replyToId: null, // Top-level comments only
            },
            include: {
                author: { select: this.authorSelect },
                attachments: true,
                replies: {
                    include: {
                        author: { select: this.authorSelect },
                        attachments: true,
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            ...(options?.cursor && {
                cursor: { id: options.cursor },
                skip: 1,
            }),
        });
    }

    /**
     * Find a single comment by ID
     */
    async findById(id: string): Promise<CommentWithAuthor | null> {
        return prisma.comment.findUnique({
            where: { id },
            include: {
                author: { select: this.authorSelect },
                attachments: true,
            },
        });
    }

    /**
     * Delete a comment by ID
     */
    async delete(id: string): Promise<Comment> {
        return prisma.comment.delete({
            where: { id },
        });
    }

    /**
     * Get unread comment counts per node for a mindmap
     * Returns a map of nodeId -> unread count
     */
    async getUnreadCounts(
        mindmapId: string,
        userId: string
    ): Promise<Record<string, number>> {
        // Get all nodes with comments in this mindmap
        const nodesWithComments = await prisma.comment.groupBy({
            by: ['nodeId'],
            where: { mindmapId },
            _count: { id: true },
        });

        if (nodesWithComments.length === 0) {
            return {};
        }

        const nodeIds = nodesWithComments.map((n) => n.nodeId);

        // Get user's read timestamps for these nodes
        const readRecords = await prisma.commentRead.findMany({
            where: {
                userId,
                nodeId: { in: nodeIds },
            },
            select: {
                nodeId: true,
                lastReadAt: true,
            },
        });

        const readMap = new Map(readRecords.map((r) => [r.nodeId, r.lastReadAt]));
        const result: Record<string, number> = {};

        // Nodes never read: all comments are unread
        for (const nodeData of nodesWithComments) {
            if (!readMap.has(nodeData.nodeId)) {
                result[nodeData.nodeId] = nodeData._count.id;
            }
        }

        // Nodes with read record: count comments created after lastReadAt (single query)
        if (readRecords.length > 0) {
            const unreadGroups = await prisma.comment.groupBy({
                by: ['nodeId'],
                where: {
                    mindmapId,
                    OR: readRecords.map((r) => ({
                        nodeId: r.nodeId,
                        createdAt: { gt: r.lastReadAt },
                    })),
                },
                _count: { id: true },
            });

            for (const group of unreadGroups) {
                if (group._count.id > 0) {
                    result[group.nodeId] = group._count.id;
                }
            }
        }

        return result;
    }

    /**
     * Mark comments on a node as read for a user
     */
    async markAsRead(nodeId: string, userId: string): Promise<void> {
        await prisma.commentRead.upsert({
            where: {
                userId_nodeId: { userId, nodeId },
            },
            create: { userId, nodeId },
            update: { lastReadAt: new Date() },
        });
    }

    /**
     * Get total comment count for a node
     */
    async getCommentCount(nodeId: string): Promise<number> {
        return prisma.comment.count({
            where: { nodeId },
        });
    }
}
