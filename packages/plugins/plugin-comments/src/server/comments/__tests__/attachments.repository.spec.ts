/**
 * Story 7.1: Backend Repository Pattern Refactor
 * Unit tests for AttachmentsRepository
 */

import { AttachmentsRepository, AttachmentCreateData } from '../attachments.repository';

// Mock Prisma
jest.mock('@cdm/database', () => ({
  prisma: {
    commentAttachment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from '@cdm/database';

describe('AttachmentsRepository', () => {
  let repository: AttachmentsRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new AttachmentsRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an attachment with all fields', async () => {
      const createData: AttachmentCreateData = {
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storagePath: '/uploads/test.pdf',
        uploaderId: 'user-1',
        commentId: 'comment-1',
      };

      const expectedAttachment = {
        id: 'attachment-1',
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.commentAttachment.create as jest.Mock).mockResolvedValue(expectedAttachment);

      const result = await repository.create(createData);

      expect(mockPrisma.commentAttachment.create).toHaveBeenCalledWith({
        data: {
          fileName: createData.fileName,
          fileSize: createData.fileSize,
          mimeType: createData.mimeType,
          storagePath: createData.storagePath,
          uploaderId: createData.uploaderId,
          commentId: createData.commentId,
        },
      });
      expect(result).toEqual(expectedAttachment);
    });

    it('should create an orphaned attachment (no commentId)', async () => {
      const createData: AttachmentCreateData = {
        fileName: 'orphan.png',
        fileSize: 2048,
        mimeType: 'image/png',
        storagePath: '/uploads/orphan.png',
        uploaderId: 'user-2',
      };

      const expectedAttachment = {
        id: 'attachment-2',
        ...createData,
        commentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.commentAttachment.create as jest.Mock).mockResolvedValue(expectedAttachment);

      const result = await repository.create(createData);

      expect(mockPrisma.commentAttachment.create).toHaveBeenCalledWith({
        data: {
          fileName: createData.fileName,
          fileSize: createData.fileSize,
          mimeType: createData.mimeType,
          storagePath: createData.storagePath,
          uploaderId: createData.uploaderId,
          commentId: null,
        },
      });
      expect(result.commentId).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return attachment when found', async () => {
      const expectedAttachment = {
        id: 'attachment-1',
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storagePath: '/uploads/test.pdf',
        uploaderId: 'user-1',
        commentId: 'comment-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.commentAttachment.findUnique as jest.Mock).mockResolvedValue(expectedAttachment);

      const result = await repository.findById('attachment-1');

      expect(mockPrisma.commentAttachment.findUnique).toHaveBeenCalledWith({
        where: { id: 'attachment-1' },
      });
      expect(result).toEqual(expectedAttachment);
    });

    it('should return null when attachment not found', async () => {
      (mockPrisma.commentAttachment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(mockPrisma.commentAttachment.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete attachment by id', async () => {
      (mockPrisma.commentAttachment.delete as jest.Mock).mockResolvedValue({});

      await repository.delete('attachment-1');

      expect(mockPrisma.commentAttachment.delete).toHaveBeenCalledWith({
        where: { id: 'attachment-1' },
      });
    });
  });

  describe('findByCommentId', () => {
    it('should return attachments for a comment', async () => {
      const expectedAttachments = [
        { id: 'attachment-1', commentId: 'comment-1', fileName: 'file1.pdf' },
        { id: 'attachment-2', commentId: 'comment-1', fileName: 'file2.png' },
      ];

      (mockPrisma.commentAttachment.findMany as jest.Mock).mockResolvedValue(expectedAttachments);

      const result = await repository.findByCommentId('comment-1');

      expect(mockPrisma.commentAttachment.findMany).toHaveBeenCalledWith({
        where: { commentId: 'comment-1' },
      });
      expect(result).toEqual(expectedAttachments);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no attachments found', async () => {
      (mockPrisma.commentAttachment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByCommentId('comment-without-attachments');

      expect(result).toEqual([]);
    });
  });

  describe('associateWithComment', () => {
    it('should associate attachment with a comment', async () => {
      const updatedAttachment = {
        id: 'attachment-1',
        commentId: 'comment-1',
        fileName: 'test.pdf',
      };

      (mockPrisma.commentAttachment.update as jest.Mock).mockResolvedValue(updatedAttachment);

      const result = await repository.associateWithComment('attachment-1', 'comment-1');

      expect(mockPrisma.commentAttachment.update).toHaveBeenCalledWith({
        where: { id: 'attachment-1' },
        data: { commentId: 'comment-1' },
      });
      expect(result.commentId).toBe('comment-1');
    });
  });

  describe('associateBatchWithComment', () => {
    it('should batch associate orphaned attachments owned by the uploader', async () => {
      const attachmentIds = ['attachment-1', 'attachment-2'];
      const uploaderId = 'user-1';
      const commentId = 'comment-1';

      (mockPrisma.commentAttachment.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await repository.associateBatchWithComment(
        attachmentIds,
        commentId,
        uploaderId,
      );

      expect(mockPrisma.commentAttachment.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: attachmentIds },
          uploaderId,
          commentId: null,
        },
        data: { commentId },
      });
      expect(result).toEqual({ count: 2 });
    });

    it('should return count 0 when nothing matches', async () => {
      (mockPrisma.commentAttachment.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await repository.associateBatchWithComment(
        ['missing-1'],
        'comment-1',
        'user-1',
      );

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('findOrphaned', () => {
    it('should find all orphaned attachments', async () => {
      const orphanedAttachments = [
        { id: 'attachment-1', commentId: null, fileName: 'orphan1.pdf' },
        { id: 'attachment-2', commentId: null, fileName: 'orphan2.png' },
      ];

      (mockPrisma.commentAttachment.findMany as jest.Mock).mockResolvedValue(orphanedAttachments);

      const result = await repository.findOrphaned();

      expect(mockPrisma.commentAttachment.findMany).toHaveBeenCalledWith({
        where: { commentId: null },
      });
      expect(result).toEqual(orphanedAttachments);
    });

    it('should find orphaned attachments older than specified date', async () => {
      const cutoffDate = new Date('2025-01-01');
      const orphanedAttachments = [
        { id: 'attachment-1', commentId: null, createdAt: new Date('2024-12-01') },
      ];

      (mockPrisma.commentAttachment.findMany as jest.Mock).mockResolvedValue(orphanedAttachments);

      const result = await repository.findOrphaned(cutoffDate);

      expect(mockPrisma.commentAttachment.findMany).toHaveBeenCalledWith({
        where: {
          commentId: null,
          createdAt: { lt: cutoffDate },
        },
      });
      expect(result).toEqual(orphanedAttachments);
    });
  });
});
