/**
 * Story 4.3: Contextual Comments & Mentions
 * Types and schemas for comment functionality
 */

import { z } from 'zod';

// ====================
// Comment Interfaces
// ====================

/**
 * Author information included with comments
 */
export interface CommentAuthor {
    id: string;
    name: string;
    avatarUrl?: string;
}

/**
 * Attachment on a comment (Story 4.3+)
 */
export interface CommentAttachment {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string;        // Download/preview URL
    createdAt: string;
}

/**
 * Comment entity representing a single comment
 */
export interface Comment {
    id: string;
    content: string;
    nodeId: string;
    mindmapId: string;
    authorId: string;
    author?: CommentAuthor;  // Hydrated on fetch
    replyToId?: string | null;
    replies?: Comment[];
    attachments?: CommentAttachment[];  // Story 4.3+: File attachments
    createdAt: string;
    updatedAt: string;
}

/**
 * Socket event payload for real-time comment updates
 */
export interface CommentEvent {
    action: 'created' | 'updated' | 'deleted';
    comment: Comment;
    roomId: string;
}

// ====================
// DTOs (Data Transfer Objects)
// ====================

/**
 * Create a new comment
 */
export const CreateCommentSchema = z.object({
    content: z.string().min(1, 'Comment cannot be empty').max(10000, 'Comment too long'),
    nodeId: z.string().min(1, 'Node ID required'),
    replyToId: z.string().optional(),
    attachmentIds: z.array(z.string()).max(5).optional(),  // Story 4.3+: Up to 5 attachments
});

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

/**
 * Update an existing comment
 */
export const UpdateCommentSchema = z.object({
    content: z.string().min(1).max(10000),
});

export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>;

/**
 * Query parameters for fetching comments
 */
export interface CommentQueryParams {
    nodeId: string;
    limit?: number;
    cursor?: string;  // Cursor-based pagination
}

/**
 * Response for paginated comment list
 */
export interface CommentListResponse {
    comments: Comment[];
    nextCursor?: string;
    hasMore: boolean;
}

/**
 * Unread comment counts by node
 */
export type UnreadCommentCounts = Record<string, number>;

// ====================
// Socket.io Event Types
// ====================

/**
 * Socket event names for comments
 */
export const COMMENT_SOCKET_EVENTS = {
    CREATED: 'comment.created',
    UPDATED: 'comment.updated',
    DELETED: 'comment.deleted',
} as const;

/**
 * Payload for deleted comment event
 */
export interface CommentDeletedPayload {
    commentId: string;
    nodeId: string;
}
