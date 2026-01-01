/**
 * Story 2.4: Task Dispatch & Feedback
 * Story 4.5: Smart Notification Center
 * Notification Controller - REST API for notifications
 */

import { Controller, Get, Patch, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { NotificationService } from './notification.service';
import type { NotificationPriority } from '@cdm/types';

function parseBoolean(value?: string): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function parsePositiveInt(value?: string): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parsePriority(value?: string): NotificationPriority | undefined {
  if (value === 'HIGH' || value === 'NORMAL' || value === 'LOW') return value;
  return undefined;
}

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) { }

  /**
   * GET /api/notifications - 获取通知列表
   * Query params (Story 4.5 extended):
   *   - userId: string (required for dev, will be replaced by @CurrentUser after Clerk)
   *   - isRead: true|false (optional, backward compatible)
   *   - page: number (optional, default 1)
   *   - limit: number (optional, default 50)
   *   - unreadOnly: true|false (optional)
   *   - priority: HIGH|NORMAL|LOW (optional)
   */
  @Get()
  async list(
    @Query('userId') userId: string,
    @Query('isRead') isRead?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('priority') priority?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<unknown[]> {
    // Disable caching to ensure fresh data
    res?.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res?.setHeader('Pragma', 'no-cache');
    res?.setHeader('Expires', '0');

    // Use userId from query param, fallback to test1 for development
    const recipientId = userId || 'test1';

    // Story 4.5: Use new listPaginated with extended query params
    return this.notificationService.listPaginated(recipientId, {
      isRead: parseBoolean(isRead),
      page: parsePositiveInt(page),
      limit: parsePositiveInt(limit),
      unreadOnly: parseBoolean(unreadOnly),
      priority: parsePriority(priority),
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
   * Story 4.5: GET /api/notifications/count - 获取按优先级分组的计数
   * Query params: userId (required for dev)
   * Returns: { total, high, normal, low }
   */
  @Get('count')
  async count(
    @Query('userId') userId: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<{ total: number; high: number; normal: number; low: number }> {
    // Disable caching to ensure fresh data
    res?.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res?.setHeader('Pragma', 'no-cache');
    res?.setHeader('Expires', '0');

    const recipientId = userId || 'test1';
    return this.notificationService.getCountByPriority(recipientId);
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
