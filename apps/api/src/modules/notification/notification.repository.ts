/**
 * Story 2.4: Task Dispatch & Feedback
 * Story 4.5: Smart Notification Center
 * Notification Repository - Data access layer for notifications
 * [AI-Review][MEDIUM-1] Fixed: Proper TypeScript types instead of 'any'
 */

import { Injectable } from '@nestjs/common';
import { prisma, type Notification, type Prisma } from '@cdm/database';
import type { CreateNotificationDto, NotificationListQuery, NotificationType, NotificationPriority } from '@cdm/types';
import { getNotificationPriority } from '@cdm/types';

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

  /**
   * Story 4.5: Find notifications with pagination and filtering
   */
  async findPaginated(
    recipientId: string,
    query: NotificationListQuery
  ): Promise<Notification[]> {
    const { page = 1, limit = 50, isRead, unreadOnly, priority } = query;
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const skip = (safePage - 1) * safeLimit;

    // Build where clause
    const where: Prisma.NotificationWhereInput = { recipientId };

    // Handle isRead and unreadOnly (unreadOnly takes precedence)
    if (unreadOnly === true) {
      where.isRead = false;
    } else if (isRead !== undefined) {
      where.isRead = isRead;
    }

    // Filter by priority requires filtering notification types
    if (priority) {
      const typesForPriority = this.getTypesForPriority(priority);
      where.type = { in: typesForPriority };
    }

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    });
  }

  /**
   * Story 4.5: Count notifications grouped by priority
   */
  async countByPriority(
    recipientId: string
  ): Promise<{ total: number; high: number; normal: number; low: number }> {
    // Get all notifications for the user
    const notifications = await prisma.notification.findMany({
      where: { recipientId },
      select: { type: true },
    });

    let high = 0;
    let normal = 0;
    let low = 0;

    for (const n of notifications) {
      const priority = getNotificationPriority(n.type as NotificationType);
      if (priority === 'HIGH') high++;
      else if (priority === 'NORMAL') normal++;
      else low++;
    }

    return {
      total: notifications.length,
      high,
      normal,
      low,
    };
  }

  /**
   * Get notification types that match a given priority
   */
  private getTypesForPriority(priority: NotificationPriority): string[] {
    const allTypes: NotificationType[] = [
      'TASK_DISPATCH',
      'TASK_ACCEPTED',
      'TASK_REJECTED',
      'APPROVAL_REQUESTED',
      'APPROVAL_APPROVED',
      'APPROVAL_REJECTED',
      'MENTION',
      'WATCH_UPDATE',
    ];

    return allTypes.filter(type => getNotificationPriority(type) === priority);
  }
}
