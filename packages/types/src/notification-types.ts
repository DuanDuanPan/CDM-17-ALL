/**
 * Story 2.4: Task Dispatch & Feedback
 * Notification types and schemas for real-time task communication
 */

import { z } from 'zod';

// Notification Type Enum
export type NotificationType = 'TASK_DISPATCH' | 'TASK_ACCEPTED' | 'TASK_REJECTED';

// Notification Content (JSON payload)
export interface NotificationContent {
  taskId: string;
  taskName: string;
  action: 'dispatch' | 'accept' | 'reject';
  senderName: string;
  reason?: string; // 仅 reject 时有值
}

// Notification Entity
export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  content: NotificationContent;
  refNodeId?: string;
  isRead: boolean;
  createdAt: string;
}

// Zod Schema for API validation
export const NotificationSchema = z.object({
  type: z.enum(['TASK_DISPATCH', 'TASK_ACCEPTED', 'TASK_REJECTED']),
  title: z.string(),
  content: z.object({
    taskId: z.string(),
    taskName: z.string(),
    action: z.enum(['dispatch', 'accept', 'reject']),
    senderName: z.string(),
    reason: z.string().optional(),
  }),
  refNodeId: z.string().optional(),
});

// DTOs for API requests

export interface CreateNotificationDto {
  recipientId: string;
  type: NotificationType;
  title: string;
  content: NotificationContent;
  refNodeId?: string;
}

export interface MarkNotificationReadDto {
  id: string;
}

export interface NotificationListQuery {
  isRead?: boolean;
}
