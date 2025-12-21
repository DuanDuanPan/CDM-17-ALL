/**
 * Story 2.4: Task Dispatch & Feedback
 * Notification Repository - Data access layer for notifications
 * [AI-Review][MEDIUM-1] Fixed: Proper TypeScript types instead of 'any'
 */

import { Injectable } from '@nestjs/common';
import { prisma, type Notification, type Prisma } from '@cdm/database';
import type { CreateNotificationDto, NotificationContent } from '@cdm/types';

// Prisma BatchPayload type for updateMany operations
type BatchPayload = Prisma.BatchPayload;

@Injectable()
export class NotificationRepository {
  async create(data: CreateNotificationDto): Promise<Notification> {
    return prisma.notification.create({
      data: {
        recipientId: data.recipientId,
        type: data.type,
        title: data.title,
        content: data.content as unknown as Prisma.InputJsonValue,
        refNodeId: data.refNodeId,
      },
    });
  }

  async findByRecipient(recipientId: string, query: { isRead?: boolean }): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        recipientId,
        ...(query.isRead !== undefined && { isRead: query.isRead }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(recipientId: string): Promise<BatchPayload> {
    return prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true },
    });
  }

  async countUnread(recipientId: string): Promise<number> {
    return prisma.notification.count({
      where: { recipientId, isRead: false },
    });
  }
}
