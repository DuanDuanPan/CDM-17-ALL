/**
 * Story 4.5: Smart Notification Center
 * Tests for notification priority types and query contract
 */
import { describe, it, expect } from 'vitest';
import {
  NotificationPriority,
  getNotificationPriority,
  NotificationListQuery,
  Notification,
} from '../src/notification-types';

describe('notification-types', () => {
  describe('NotificationPriority', () => {
    it('should define HIGH, NORMAL, and LOW priority levels', () => {
      const priorities: NotificationPriority[] = ['HIGH', 'NORMAL', 'LOW'];
      expect(priorities).toContain('HIGH');
      expect(priorities).toContain('NORMAL');
      expect(priorities).toContain('LOW');
    });
  });

  describe('getNotificationPriority', () => {
    it('should return HIGH for MENTION type', () => {
      expect(getNotificationPriority('MENTION')).toBe('HIGH');
    });

    it('should return HIGH for APPROVAL_REQUESTED type', () => {
      expect(getNotificationPriority('APPROVAL_REQUESTED')).toBe('HIGH');
    });

    it('should return HIGH for APPROVAL_APPROVED type', () => {
      expect(getNotificationPriority('APPROVAL_APPROVED')).toBe('HIGH');
    });

    it('should return HIGH for APPROVAL_REJECTED type', () => {
      expect(getNotificationPriority('APPROVAL_REJECTED')).toBe('HIGH');
    });

    it('should return NORMAL for TASK_DISPATCH type', () => {
      expect(getNotificationPriority('TASK_DISPATCH')).toBe('NORMAL');
    });

    it('should return NORMAL for TASK_ACCEPTED type', () => {
      expect(getNotificationPriority('TASK_ACCEPTED')).toBe('NORMAL');
    });

    it('should return NORMAL for TASK_REJECTED type', () => {
      expect(getNotificationPriority('TASK_REJECTED')).toBe('NORMAL');
    });

    it('should return LOW for WATCH_UPDATE type', () => {
      expect(getNotificationPriority('WATCH_UPDATE')).toBe('LOW');
    });
  });

  describe('NotificationListQuery', () => {
    it('should support optional page parameter', () => {
      const query: NotificationListQuery = { page: 1 };
      expect(query.page).toBe(1);
    });

    it('should support optional limit parameter', () => {
      const query: NotificationListQuery = { limit: 50 };
      expect(query.limit).toBe(50);
    });

    it('should support optional unreadOnly parameter', () => {
      const query: NotificationListQuery = { unreadOnly: true };
      expect(query.unreadOnly).toBe(true);
    });

    it('should support optional priority filter', () => {
      const query: NotificationListQuery = { priority: 'HIGH' };
      expect(query.priority).toBe('HIGH');
    });

    it('should maintain backward compatibility with isRead', () => {
      const query: NotificationListQuery = { isRead: false };
      expect(query.isRead).toBe(false);
    });

    it('should support combining multiple filters', () => {
      const query: NotificationListQuery = {
        page: 1,
        limit: 20,
        unreadOnly: true,
        priority: 'HIGH',
        isRead: false,
      };
      expect(query).toEqual({
        page: 1,
        limit: 20,
        unreadOnly: true,
        priority: 'HIGH',
        isRead: false,
      });
    });
  });

  describe('Notification interface', () => {
    it('should support optional priority field as computed property', () => {
      const notification: Notification = {
        id: 'test-1',
        recipientId: 'user-1',
        type: 'MENTION',
        title: 'You were mentioned',
        content: {
          commentId: 'comment-1',
          nodeId: 'node-1',
          nodeName: 'Test Node',
          preview: 'Test preview',
          senderName: 'John',
          mindmapId: 'mindmap-1',
        },
        isRead: false,
        createdAt: '2024-01-01T00:00:00Z',
        priority: 'HIGH', // Computed field
      };
      expect(notification.priority).toBe('HIGH');
    });

    it('should work without priority field for backward compatibility', () => {
      const notification: Notification = {
        id: 'test-2',
        recipientId: 'user-1',
        type: 'TASK_DISPATCH',
        title: 'New task assigned',
        content: {
          taskId: 'task-1',
          taskName: 'Test Task',
          action: 'dispatch',
          senderName: 'Jane',
        },
        isRead: false,
        createdAt: '2024-01-01T00:00:00Z',
      };
      expect(notification.priority).toBeUndefined();
    });
  });
});
