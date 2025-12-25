/**
 * Story 4.4: Watch & Subscription
 * Types for subscription/watch functionality
 */

import { z } from 'zod';

// ===== Entity Types =====

export interface Subscription {
  id: string;
  userId: string;
  nodeId: string;
  mindmapId: string;
  createdAt: string;
}

// ===== DTO Types =====

export interface CreateSubscriptionDto {
  nodeId: string;
}

export interface DeleteSubscriptionDto {
  nodeId: string;
}

export interface CheckSubscriptionQuery {
  nodeId: string;
}

export interface CheckSubscriptionResponse {
  isSubscribed: boolean;
  subscriptionId?: string;
}

export interface SubscriptionListResponse {
  subscriptions: Subscription[];
  total: number;
}

// ===== Zod Schemas for Validation =====

export const CreateSubscriptionSchema = z.object({
  nodeId: z.string().min(1, 'nodeId is required'),
});

export const CheckSubscriptionQuerySchema = z.object({
  nodeId: z.string().min(1, 'nodeId is required'),
});

// Note: WatchNotificationContent is defined in notification-types.ts
// to keep all notification content types in one place
