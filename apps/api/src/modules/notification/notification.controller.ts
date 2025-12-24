/**
 * Story 2.4: Task Dispatch & Feedback
 * Notification Controller - REST API for notifications
 */

import { Controller, Get, Patch, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) { }

  /**
   * GET /api/notifications - 获取通知列表
   * Query params:
   *   - userId: string (required for dev, will be replaced by @CurrentUser after Clerk)
   *   - isRead: true|false (optional)
   */
  @Get()
  async list(
    @Query('userId') userId: string,
    @Query('isRead') isRead?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<unknown[]> {
    // Disable caching to ensure fresh data
    res?.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res?.setHeader('Pragma', 'no-cache');
    res?.setHeader('Expires', '0');

    // Use userId from query param, fallback to test1 for development
    const recipientId = userId || 'test1';
    return this.notificationService.list(recipientId, {
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
    });
  }

  /**
   * GET /api/notifications/unread-count - 获取未读数量
   * Query params: userId (required for dev)
   */
  @Get('unread-count')
  async unreadCount(
    @Query('userId') userId: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<{ count: number }> {
    // Disable caching to ensure fresh data
    res?.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res?.setHeader('Pragma', 'no-cache');
    res?.setHeader('Expires', '0');

    const recipientId = userId || 'test1';
    const count = await this.notificationService.getUnreadCount(recipientId);
    return { count };
  }

  /**
   * PATCH /api/notifications/:id:markRead - 标记单条已读
   */
  @Patch(':id\\:markRead')
  async markRead(@Param('id') id: string): Promise<unknown> {
    return this.notificationService.markAsRead(id);
  }

  /**
   * PATCH /api/notifications:markAllRead - 标记全部已读
   * Query params: userId (required for dev)
   */
  @Patch('markAllRead')
  async markAllRead(@Query('userId') userId: string): Promise<unknown> {
    const recipientId = userId || 'test1';
    return this.notificationService.markAllAsRead(recipientId);
  }
}
