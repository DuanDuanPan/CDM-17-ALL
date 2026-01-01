/**
 * Story 2.4: Task Dispatch & Feedback
 * Story 4.1: Approval Workflow
 * Story 4.5: Smart Notification Center
 * Notification types and schemas for real-time task communication
 */

import { z } from 'zod';

// Notification Type Enum
// Story 4.1: Added approval workflow notification types
// Story 4.3: Added MENTION notification type
// Story 4.4: Added WATCH_UPDATE notification type
export type NotificationType =
  | 'TASK_DISPATCH'
  | 'TASK_ACCEPTED'
  | 'TASK_REJECTED'
  | 'APPROVAL_REQUESTED'   // Story 4.1: New
  | 'APPROVAL_APPROVED'    // Story 4.1: New
  | 'APPROVAL_REJECTED'    // Story 4.1: New
  | 'MENTION'              // Story 4.3: Contextual Comments
  | 'WATCH_UPDATE';        // Story 4.4: Watch & Subscription

// Story 4.5: Notification Priority Levels
export type NotificationPriority = 'HIGH' | 'NORMAL' | 'LOW';

/**
 * Story 4.5: Get notification priority based on type
 * HIGH: @mentions, approval requests/results - immediate attention needed
 * NORMAL: Task assignments and responses - standard workflow items
 * LOW: Watch/subscription updates - noise-reduced, aggregated notifications
 */
export function getNotificationPriority(type: NotificationType): NotificationPriority {
  switch (type) {
    // HIGH priority: Require immediate attention
    case 'MENTION':
    case 'APPROVAL_REQUESTED':
    case 'APPROVAL_APPROVED':
    case 'APPROVAL_REJECTED':
      return 'HIGH';

    // NORMAL priority: Standard workflow notifications
    case 'TASK_DISPATCH':
    case 'TASK_ACCEPTED':
    case 'TASK_REJECTED':
      return 'NORMAL';

    // LOW priority: Aggregated/throttled notifications
    case 'WATCH_UPDATE':
      return 'LOW';

    default:
      return 'NORMAL';
  }
}

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

// Story 4.3: Mention Notification Content
export interface MentionNotificationContent {
  commentId: string;
  nodeId: string;
  nodeName: string;
  preview: string;      // First 100 chars of comment
  senderName: string;
  mindmapId: string;
}

// Story 4.4: Watch Notification Content
export interface WatchNotificationContent {
  mindmapId: string;
  nodeId: string;
  nodeName: string;
  message: string;         // Summary message: "节点A 等 3 个节点发生变更"
  changeCount: number;     // Number of aggregated changes
  changedNodes: string[];  // Node names that changed
}

// Union type for all notification content types
export type NotificationContent = TaskNotificationContent | ApprovalNotificationContent | MentionNotificationContent | WatchNotificationContent;

// Notification Entity
// Story 4.5: Added optional priority field (computed from type, not stored in DB)
export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  content: NotificationContent;
  refNodeId?: string;
  isRead: boolean;
  createdAt: string;
  priority?: NotificationPriority; // Story 4.5: Computed field, not persisted
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

// Story 4.3: Mention Notification Content Schema
export const MentionNotificationContentSchema = z.object({
  commentId: z.string(),
  nodeId: z.string(),
  nodeName: z.string(),
  preview: z.string(),
  senderName: z.string(),
  mindmapId: z.string(),
});

// Story 4.4: Watch Notification Content Schema
export const WatchNotificationContentSchema = z.object({
  mindmapId: z.string(),
  nodeId: z.string(),
  nodeName: z.string(),
  message: z.string(),
  changeCount: z.number(),
  changedNodes: z.array(z.string()),
});

export const NotificationContentSchema = z.union([
  TaskNotificationContentSchema,
  ApprovalNotificationContentSchema,
  MentionNotificationContentSchema,
  WatchNotificationContentSchema,
]);

export const NotificationSchema = z.object({
  type: z.enum([
    'TASK_DISPATCH',
    'TASK_ACCEPTED',
    'TASK_REJECTED',
    'APPROVAL_REQUESTED',
    'APPROVAL_APPROVED',
    'APPROVAL_REJECTED',
    'MENTION',
    'WATCH_UPDATE',       // Story 4.4: Watch & Subscription
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

// Story 4.5: Extended query parameters for filtering and pagination
export interface NotificationListQuery {
  isRead?: boolean;           // Backward compatibility
  page?: number;              // Story 4.5: Pagination page (1-based)
  limit?: number;             // Story 4.5: Page size (default 50)
  unreadOnly?: boolean;       // Story 4.5: Filter to unread only
  priority?: NotificationPriority; // Story 4.5: Filter by priority level
}
