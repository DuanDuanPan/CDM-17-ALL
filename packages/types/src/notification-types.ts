/**
 * Story 2.4: Task Dispatch & Feedback
 * Story 4.1: Approval Workflow
 * Notification types and schemas for real-time task communication
 */

import { z } from 'zod';

// Notification Type Enum
// Story 4.1: Added approval workflow notification types
export type NotificationType =
  | 'TASK_DISPATCH'
  | 'TASK_ACCEPTED'
  | 'TASK_REJECTED'
  | 'APPROVAL_REQUESTED'   // Story 4.1: New
  | 'APPROVAL_APPROVED'    // Story 4.1: New
  | 'APPROVAL_REJECTED';   // Story 4.1: New

// Base Notification Content (JSON payload for task notifications)
export interface TaskNotificationContent {
  taskId: string;
  taskName: string;
  action: 'dispatch' | 'accept' | 'reject';
  senderName: string;
  reason?: string; // 仅 reject 时有值
}

// Story 4.1: Approval Notification Content
export interface ApprovalNotificationContent {
  nodeId: string;
  nodeName: string;
  action: 'approval_requested' | 'approval_approved' | 'approval_rejected';
  senderName: string;
  stepName?: string;        // Current approval step name
  stepIndex?: number;       // Current step index
  reason?: string;          // 仅 rejection 时有值
}

// Union type for all notification content types
export type NotificationContent = TaskNotificationContent | ApprovalNotificationContent;

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
// Story 4.1: Extended with approval notification types
export const TaskNotificationContentSchema = z.object({
  taskId: z.string(),
  taskName: z.string(),
  action: z.enum(['dispatch', 'accept', 'reject']),
  senderName: z.string(),
  reason: z.string().optional(),
});

export const ApprovalNotificationContentSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string(),
  action: z.enum(['approval_requested', 'approval_approved', 'approval_rejected']),
  senderName: z.string(),
  stepName: z.string().optional(),
  stepIndex: z.number().optional(),
  reason: z.string().optional(),
});

export const NotificationContentSchema = z.union([
  TaskNotificationContentSchema,
  ApprovalNotificationContentSchema,
]);

export const NotificationSchema = z.object({
  type: z.enum([
    'TASK_DISPATCH',
    'TASK_ACCEPTED',
    'TASK_REJECTED',
    'APPROVAL_REQUESTED',
    'APPROVAL_APPROVED',
    'APPROVAL_REJECTED',
  ]),
  title: z.string(),
  content: NotificationContentSchema,
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
