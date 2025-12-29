/**
 * Story 7.1: Backend Repository Pattern Refactor
 * AttachmentsRepository - Database access layer for comment attachments
 */

import { Injectable } from '@nestjs/common';
import { prisma, type CommentAttachment } from '@cdm/database';

export interface AttachmentCreateData {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploaderId: string;
  commentId?: string;
}

@Injectable()
export class AttachmentsRepository {
  /**
   * Create a new attachment record
   * Used by AttachmentsController.upload (replaces line 117)
   */
  async create(data: AttachmentCreateData): Promise<CommentAttachment> {
    return prisma.commentAttachment.create({
      data: {
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        storagePath: data.storagePath,
        uploaderId: data.uploaderId,
        commentId: data.commentId ?? null,
      },
    });
  }

  /**
   * Find attachment by ID
   * Used by AttachmentsController.download and delete (replaces lines 151, 195)
   */
  async findById(id: string): Promise<CommentAttachment | null> {
    return prisma.commentAttachment.findUnique({
      where: { id },
    });
  }

  /**
   * Delete attachment record
   * Used by AttachmentsController.delete (replaces line 215)
   */
  async delete(id: string): Promise<void> {
    await prisma.commentAttachment.delete({
      where: { id },
    });
  }

  /**
   * Find attachments by comment ID
   */
  async findByCommentId(commentId: string): Promise<CommentAttachment[]> {
    return prisma.commentAttachment.findMany({
      where: { commentId },
    });
  }

  /**
   * Associate attachment with a comment
   */
  async associateWithComment(
    attachmentId: string,
    commentId: string,
  ): Promise<CommentAttachment> {
    return prisma.commentAttachment.update({
      where: { id: attachmentId },
      data: { commentId },
    });
  }

  /**
   * Story 7.1 Fix: Batch associate attachments with a comment
   * Used by CommentsService.create to link uploaded attachments
   * Only associates attachments that are:
   * 1. In the provided ID list
   * 2. Owned by the specified user
   * 3. Not already associated with another comment (orphaned)
   */
  async associateBatchWithComment(
    attachmentIds: string[],
    commentId: string,
    uploaderId: string,
  ): Promise<{ count: number }> {
    return prisma.commentAttachment.updateMany({
      where: {
        id: { in: attachmentIds },
        uploaderId: uploaderId,
        commentId: null, // Only associate pending (unassigned) attachments
      },
      data: {
        commentId: commentId,
      },
    });
  }

  /**
   * Find orphaned attachments (not associated with any comment)
   * Useful for cleanup jobs
   */
  async findOrphaned(olderThanDate?: Date): Promise<CommentAttachment[]> {
    return prisma.commentAttachment.findMany({
      where: {
        commentId: null,
        ...(olderThanDate && { createdAt: { lt: olderThanDate } }),
      },
    });
  }
}
