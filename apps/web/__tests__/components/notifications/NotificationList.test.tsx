/**
 * Story 4.5: Smart Notification Center
 * Unit tests for NotificationList component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationList } from '@/components/notifications/NotificationList';
import type { Notification } from '@cdm/types';

// Mock date-fns to control time-based grouping
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    isToday: vi.fn((date: Date) => {
      const now = new Date();
      return date.toDateString() === now.toDateString();
    }),
    isYesterday: vi.fn((date: Date) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return date.toDateString() === yesterday.toDateString();
    }),
  };
});

describe('NotificationList', () => {
  const mockOnMarkAsRead = vi.fn().mockResolvedValue(undefined);
  const mockOnMarkAllAsRead = vi.fn().mockResolvedValue(undefined);
  const mockOnRefresh = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockOnUnsubscribe = vi.fn().mockResolvedValue(undefined);

  const createNotification = (overrides: Partial<Notification> = {}): Notification => {
    const type = overrides.type ?? 'TASK_DISPATCH';
    const base: Notification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      type,
      title: 'Test Notification',
      recipientId: 'user-1',
      isRead: false,
      createdAt: new Date().toISOString(),
      content: (() => {
        if (type === 'MENTION') {
          return {
            commentId: 'comment-1',
            nodeId: 'node-1',
            nodeName: 'Test Node',
            preview: 'Test preview',
            senderName: 'Test User',
            mindmapId: 'mindmap-1',
          };
        }

        if (type === 'WATCH_UPDATE') {
          return {
            mindmapId: 'mindmap-1',
            nodeId: 'node-1',
            nodeName: 'Test Node',
            message: 'Node changed',
            changeCount: 1,
            changedNodes: ['Test Node'],
          };
        }

        return {
          taskId: 'task-1',
          taskName: 'Test Task',
          action: 'dispatch',
          senderName: 'Test User',
        };
      })(),
    };

    return {
      ...base,
      ...overrides,
      type,
      content: overrides.content ?? base.content,
    };
  };

  const defaultProps = {
    notifications: [],
    isLoading: false,
    onMarkAsRead: mockOnMarkAsRead,
    onMarkAllAsRead: mockOnMarkAllAsRead,
    onRefresh: mockOnRefresh,
    onClose: mockOnClose,
    onNavigate: mockOnNavigate,
    onUnsubscribe: mockOnUnsubscribe,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filter Tabs (Story 4.5)', () => {
    it('should render three filter tabs: 全部, 高优先级, 未读', () => {
      render(<NotificationList {...defaultProps} />);

      expect(screen.getByRole('button', { name: '全部' })).toBeTruthy();
      expect(screen.getByRole('button', { name: /高优先级/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: '未读' })).toBeTruthy();
    });

    it('should filter by HIGH priority when clicking 高优先级 tab', () => {
      const notifications: Notification[] = [
        createNotification({ id: 'n1', type: 'MENTION', title: 'Mention (HIGH)' }),
        createNotification({ id: 'n2', type: 'TASK_DISPATCH', title: 'Task (NORMAL)' }),
        createNotification({ id: 'n3', type: 'WATCH_UPDATE', title: 'Watch (LOW)' }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      // All should be visible initially
      expect(screen.getByText('Mention (HIGH)')).toBeTruthy();
      expect(screen.getByText('Task (NORMAL)')).toBeTruthy();

      // Click high priority tab
      fireEvent.click(screen.getByRole('button', { name: /高优先级/ }));

      // Only MENTION (HIGH) should be visible
      expect(screen.getByText('Mention (HIGH)')).toBeTruthy();
      expect(screen.queryByText('Task (NORMAL)')).toBeNull();
    });

    it('should filter by unread when clicking 未读 tab', () => {
      const notifications: Notification[] = [
        createNotification({ id: 'n1', title: 'Unread 1', isRead: false }),
        createNotification({ id: 'n2', title: 'Read 1', isRead: true }),
        createNotification({ id: 'n3', title: 'Unread 2', isRead: false }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      // Click unread tab
      fireEvent.click(screen.getByRole('button', { name: '未读' }));

      // Only unread should be visible
      expect(screen.getByText('Unread 1')).toBeTruthy();
      expect(screen.getByText('Unread 2')).toBeTruthy();
      expect(screen.queryByText('Read 1')).toBeNull();
    });

    it('should show high priority count badge', () => {
      const notifications: Notification[] = [
        createNotification({ id: 'n1', type: 'MENTION' }),
        createNotification({ id: 'n2', type: 'APPROVAL_REQUESTED' }),
        createNotification({ id: 'n3', type: 'TASK_DISPATCH' }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      // Should show count of 2 (MENTION + APPROVAL_REQUESTED are HIGH priority)
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  describe('Time Grouping (Story 4.5)', () => {
    it('should group notifications by time buckets', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const earlier = new Date(now);
      earlier.setDate(earlier.getDate() - 5);

      const notifications: Notification[] = [
        createNotification({ id: 'n1', title: 'Today Notif', createdAt: now.toISOString() }),
        createNotification({ id: 'n2', title: 'Yesterday Notif', createdAt: yesterday.toISOString() }),
        createNotification({ id: 'n3', title: 'Earlier Notif', createdAt: earlier.toISOString() }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      expect(screen.getByText('今天')).toBeTruthy();
      expect(screen.getByText('昨天')).toBeTruthy();
      expect(screen.getByText('更早')).toBeTruthy();
    });
  });

  describe('Priority Styling (Story 4.5)', () => {
    it('should apply red styling for HIGH priority unread notifications', () => {
      const notifications: Notification[] = [
        createNotification({ id: 'n1', type: 'MENTION', title: 'Mention Notif', isRead: false }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      // Find the notification button - it should have red styling classes
      const notificationButton = screen.getByRole('button', { name: /Mention Notif/i });
      expect(notificationButton.className).toContain('bg-red-50/70');
      expect(notificationButton.className).toContain('border-l-red-500');
    });

    it('should apply amber styling for LOW priority (WATCH_UPDATE) unread notifications', () => {
      const notifications: Notification[] = [
        createNotification({
          id: 'n1',
          type: 'WATCH_UPDATE',
          title: 'Watch Update',
          isRead: false,
        }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      const notificationButton = screen.getByRole('button', { name: /Watch Update/i });
      expect(notificationButton.className).toContain('bg-amber-50/50');
    });

    it('should not apply priority styling for read notifications', () => {
      const notifications: Notification[] = [
        createNotification({ id: 'n1', type: 'MENTION', title: 'Read Mention', isRead: true }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      const notificationButton = screen.getByRole('button', { name: /Read Mention/i });
      expect(notificationButton.className).not.toContain('bg-red-50/70');
      expect(notificationButton.className).not.toContain('bg-amber-50/50');
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no notifications', () => {
      render(<NotificationList {...defaultProps} notifications={[]} />);

      expect(screen.getByText('暂无通知')).toBeTruthy();
    });

    it('should show loading state', () => {
      render(<NotificationList {...defaultProps} isLoading={true} />);

      expect(screen.getByText('加载中...')).toBeTruthy();
    });

    it('should show empty state for filtered results', () => {
      const notifications: Notification[] = [
        createNotification({ id: 'n1', type: 'TASK_DISPATCH', isRead: false }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      // Click high priority tab - no HIGH priority notifications exist
      fireEvent.click(screen.getByRole('button', { name: /高优先级/ }));

      expect(screen.getByText('暂无高优先级通知')).toBeTruthy();
    });
  });

  describe('Header Actions', () => {
    it('should call onMarkAllAsRead when clicking 全部已读', async () => {
      const notifications: Notification[] = [
        createNotification({ id: 'n1', isRead: false }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      fireEvent.click(screen.getByRole('button', { name: /全部已读/ }));

      expect(mockOnMarkAllAsRead).toHaveBeenCalledTimes(1);
    });

    it('should call onRefresh when clicking refresh button', async () => {
      render(<NotificationList {...defaultProps} notifications={[createNotification()]} />);

      const refreshButton = screen.getByTitle('刷新');
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking close button', () => {
      render(<NotificationList {...defaultProps} notifications={[createNotification()]} />);

      const closeButton = screen.getByTitle('关闭');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Notification Item Interactions', () => {
    it('should mark as read and navigate when clicking a notification', () => {
      const notifications: Notification[] = [
        createNotification({ id: 'n1', refNodeId: 'node-123', isRead: false }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      const notificationItem = screen.getByRole('button', { name: /Test Notification/i });
      fireEvent.click(notificationItem);

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('n1');
      expect(mockOnNavigate).toHaveBeenCalledWith('node-123');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show unsubscribe button for WATCH_UPDATE notifications', () => {
      const notifications: Notification[] = [
        createNotification({
          id: 'n1',
          type: 'WATCH_UPDATE',
          title: 'Watch Update',
        }),
      ];

      render(<NotificationList {...defaultProps} notifications={notifications} />);

      expect(screen.getByRole('button', { name: '取消关注' })).toBeTruthy();
    });
  });
});
