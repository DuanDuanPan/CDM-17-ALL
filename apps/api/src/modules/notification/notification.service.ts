/**
 * Story 2.4: Task Dispatch & Feedback
 * Story 4.5: Smart Notification Center
 * Notification Service - Business logic for notifications
 * [AI-Review][MEDIUM-1] Fixed: Proper TypeScript types instead of 'any'
 */

import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { NotificationGateway } from './notification.gateway';
import type { Notification, Prisma } from '@cdm/database';
import type { CreateNotificationDto, NotificationListQuery, NotificationType, NotificationPriority } from '@cdm/types';
import { getNotificationPriority } from '@cdm/types';

type BatchPayload = Prisma.BatchPayload;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private notificationRepo: NotificationRepository,
    private notificationGateway: NotificationGateway
  ) { }

  /**
   * Create notification and send real-time push
   * Gracefully handles cases where recipient doesn't exist (e.g., mock assigneeId in dev)
   */
  async createAndNotify(dto: CreateNotificationDto): Promise<Notification | null> {
    try {
      const notification = await this.notificationRepo.create(dto);

      // 实时推送通知
      this.notificationGateway.sendToUser(
        dto.recipientId,
        'notification:new',
        notification
      );

      return notification;
    } catch (error: unknown) {
      // Handle foreign key constraint error (user doesn't exist)
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2003') {
        this.logger.warn(
          `Notification skipped: recipient "${dto.recipientId}" not found in User table. ` +
          `This is expected in development with mock assignee IDs.`
        );
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * List notifications for a user
   */
  async list(recipientId: string, query?: { isRead?: boolean }): Promise<Notification[]> {
    return this.notificationRepo.findByRecipient(recipientId, query || {});
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.notificationRepo.markAsRead(id);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(recipientId: string): Promise<BatchPayload> {
    return this.notificationRepo.markAllAsRead(recipientId);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(recipientId: string): Promise<number> {
    return this.notificationRepo.countUnread(recipientId);
  }

  /**
   * Story 4.5: List notifications with pagination, filtering, and computed priority
   */
  async listPaginated(
    recipientId: string,
    query: NotificationListQuery
  ): Promise<(Notification & { priority: NotificationPriority })[]> {
    const notifications = await this.notificationRepo.findPaginated(recipientId, query);

    // Add computed priority field to each notification
    return notifications.map(notification => ({
      ...notification,
      priority: getNotificationPriority(notification.type as NotificationType),
    }));
  }

  /**
   * Story 4.5: Get notification counts grouped by priority
   */
  async getCountByPriority(
    recipientId: string
  ): Promise<{ total: number; high: number; normal: number; low: number }> {
    return this.notificationRepo.countByPriority(recipientId);
  }
}
