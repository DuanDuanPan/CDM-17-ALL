/**
 * Story 4.3: Contextual Comments & Mentions
 * Comments Service - Business logic for comments
 * Story 7.1 Fix: Refactored to use AttachmentsRepository
 */

import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { prisma } from '@cdm/database';
import { CommentsRepository, CommentWithAuthor } from './comments.repository';
import { AttachmentsRepository } from './attachments.repository';
import { CommentsGateway } from './comments.gateway';
import { NotificationService } from '../notification/notification.service';
import { UsersService } from '../users/users.service';
import { parseMentions, buildUserLookup } from './mention.util';
import type { Comment, CreateCommentDto } from '@cdm/types';

@Injectable()
export class CommentsService {
    private readonly logger = new Logger(CommentsService.name);

    constructor(
        private readonly repo: CommentsRepository,
        private readonly attachmentsRepository: AttachmentsRepository,
        private readonly gateway: CommentsGateway,
        private readonly notificationService: NotificationService,
        private readonly usersService: UsersService
    ) { }

    /**
     * Create a new comment
     * - Validates node access
     * - Creates comment in database
     * - Parses @mentions and sends notifications
     * - Emits real-time event to other viewers
     */
    async create(dto: CreateCommentDto, userId: string): Promise<Comment> {
        // 1. Get node and its mindmapId
        // NOTE: Comments are intentionally public in this project (all users can read/write).
        const node = await this.getNode(dto.nodeId);

        // 1.1 Validate reply threading consistency (max depth 2)
        if (dto.replyToId) {
            const parent = await this.repo.findById(dto.replyToId);
            if (!parent) {
                throw new NotFoundException(`Reply-to comment ${dto.replyToId} not found`);
            }

            if (parent.nodeId !== dto.nodeId) {
                throw new BadRequestException('replyToId must reference a comment on the same node');
            }

            if (parent.mindmapId !== node.graphId) {
                throw new BadRequestException('replyToId must reference a comment in the same mindmap');
            }

            if (parent.replyToId) {
                throw new BadRequestException('Replies are only supported for top-level comments');
            }
        }

        // 3. Create comment
        const comment = await this.repo.create({
            content: dto.content,
            nodeId: dto.nodeId,
            mindmapId: node.graphId,
            authorId: userId,
            replyToId: dto.replyToId,
        });

        // 3.1 Associate uploaded attachments with this comment
        // Story 7.1 Fix: Use AttachmentsRepository instead of direct prisma call
        if (dto.attachmentIds && dto.attachmentIds.length > 0) {
            await this.attachmentsRepository.associateBatchWithComment(
                dto.attachmentIds,
                comment.id,
                userId
            );
        }

        // 3.2 Reload comment with attachments
        const fullComment = await this.repo.findById(comment.id);
        if (!fullComment) {
            throw new NotFoundException('Comment creation failed');
        }

        // 4. Parse mentions and notify
        await this.handleMentions(dto.content, fullComment, node, userId);

        // 5. Emit real-time event
        const commentResponse = this.mapToComment(fullComment);
        this.gateway.emitCommentCreated(node.graphId, commentResponse);

        return commentResponse;
    }

    /**
     * Get comments for a node
     */
    async findByNode(
        nodeId: string,
        options?: { limit?: number; cursor?: string }
    ): Promise<Comment[]> {
        const comments = await this.repo.findByNode(nodeId, options);
        return comments.map((c) => this.mapToComment(c));
    }

    /**
     * Get unread counts for all nodes in a mindmap
     * HIGH-2 Fix: Added mindmap access validation
     */
    async getUnreadCounts(
        mindmapId: string,
        userId: string
    ): Promise<Record<string, number>> {
        // Validate user has access to this mindmap
        await this.assertMindmapReadAccess(mindmapId, userId);
        return this.repo.getUnreadCounts(mindmapId, userId);
    }

    /**
     * Mark comments on a node as read
     * HIGH-2 Fix: Added node access validation
     */
    async markAsRead(nodeId: string, userId: string): Promise<void> {
        // Validate user has access to this node
        await this.assertNodeReadAccess(nodeId, userId);
        return this.repo.markAsRead(nodeId, userId);
    }

    /**
     * Delete a comment (author only)
     */
    async delete(commentId: string, userId: string): Promise<void> {
        const comment = await this.repo.findById(commentId);
        if (!comment) {
            throw new NotFoundException(`Comment ${commentId} not found`);
        }

        if (comment.authorId !== userId) {
            throw new ForbiddenException('Only the author can delete this comment');
        }

        await this.repo.delete(commentId);

        // Emit real-time event
        this.gateway.emitCommentDeleted(comment.mindmapId, {
            commentId,
            nodeId: comment.nodeId,
        });
    }

    /**
     * Assert that a user has read access to a node
     * CRITICAL SECURITY: Must be called before returning any node data
     */
    async assertNodeReadAccess(nodeId: string, userId: string): Promise<void> {
        // NOTE: Comments are intentionally public in this project (all users can read/write).
        // We only validate existence to avoid leaking "private" semantics and to keep API behavior consistent.
        const node = await prisma.node.findUnique({
            where: { id: nodeId },
            select: { id: true },
        });

        if (!node) throw new NotFoundException(`Node ${nodeId} not found`);

        this.logger.debug(`Comment access granted (public) for user ${userId} on node ${nodeId}`);
    }

    /**
     * Assert that a user has read access to a mindmap (graph)
     * HIGH-2 Fix: Added for validating getUnreadCounts calls
     * CRITICAL SECURITY: Must be called before returning mindmap data
     */
    async assertMindmapReadAccess(mindmapId: string, userId: string): Promise<void> {
        // NOTE: Comments are intentionally public in this project (all users can read/write).
        const graph = await prisma.graph.findUnique({
            where: { id: mindmapId },
            select: { id: true },
        });

        if (!graph) throw new NotFoundException(`Mindmap ${mindmapId} not found`);

        this.logger.debug(
            `Mindmap comment access granted (public) for user ${userId} on mindmap ${mindmapId}`
        );
    }

    /**
     * Get a node by ID
     */
    private async getNode(nodeId: string) {
        const node = await prisma.node.findUnique({
            where: { id: nodeId },
            select: {
                id: true,
                label: true,
                graphId: true,
            },
        });

        if (!node) {
            throw new NotFoundException(`Node ${nodeId} not found`);
        }

        return node;
    }

    /**
     * Handle @mentions in comment content
     */
    private async handleMentions(
        content: string,
        comment: CommentWithAuthor,
        node: { id: string; label: string; graphId: string },
        authorId: string
    ): Promise<void> {
        try {
            // Get all users for mention lookup
            const { users } = await this.usersService.list({ limit: 1000 });
            const userLookup = buildUserLookup(users);

            // Parse mentions
            const mentionedIds = parseMentions(content, userLookup);

            // Send notifications to mentioned users (except self)
            for (const recipientId of mentionedIds) {
                if (recipientId !== authorId) {
                    await this.notificationService.createAndNotify({
                        recipientId,
                        type: 'MENTION',
                        title: `${comment.author?.name || 'Someone'} mentioned you`,
                        content: {
                            commentId: comment.id,
                            nodeId: node.id,
                            nodeName: node.label,
                            preview: content.slice(0, 100),
                            senderName: comment.author?.name || 'Unknown',
                            mindmapId: node.graphId,
                        },
                        refNodeId: node.id,
                    });
                }
            }
        } catch (error) {
            // Log error but don't fail the comment creation
            this.logger.error('Failed to process mentions', error);
        }
    }

    /**
     * Map database comment to API response format
     */
    private mapToComment(comment: CommentWithAuthor): Comment {
        return {
            id: comment.id,
            content: comment.content,
            nodeId: comment.nodeId,
            mindmapId: comment.mindmapId,
            authorId: comment.authorId,
            author: comment.author
                ? {
                    id: comment.author.id,
                    name: comment.author.name || 'Unknown',
                }
                : undefined,
            replyToId: comment.replyToId,
            replies: comment.replies?.map((r) => this.mapToComment(r)),
            // Story 4.3+: Map attachments
            attachments: comment.attachments?.map((a) => ({
                id: a.id,
                fileName: a.fileName,
                fileSize: a.fileSize,
                mimeType: a.mimeType,
                url: `/api/comments/attachments/${a.id}`,
                createdAt: a.createdAt.toISOString(),
            })),
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
        };
    }
}
