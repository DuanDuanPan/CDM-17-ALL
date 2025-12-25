/**
 * Story 4.4: Watch & Subscription
 * Subscription Service - Business logic for subscriptions
 */

import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionRepository } from './subscriptions.repository';
import { prisma, type Subscription } from '@cdm/database';
import type {
  CheckSubscriptionResponse,
  SubscriptionListResponse,
} from '@cdm/types';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  /**
   * Subscribe to a node
   * AC#1: User can subscribe to a node via context menu
   */
  async subscribe(userId: string, nodeId: string): Promise<Subscription> {
    // Verify node exists and get its mindmapId
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, graphId: true, label: true },
    });

    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    // Check if already subscribed
    const existing = await this.subscriptionRepo.findByUserAndNode(
      userId,
      nodeId
    );
    if (existing) {
      throw new ConflictException('Already subscribed to this node');
    }

    // Create subscription
    const subscription = await this.subscriptionRepo.create({
      userId,
      nodeId,
      mindmapId: node.graphId,
    });

    this.logger.log(
      `User ${userId} subscribed to node ${nodeId} (${node.label})`
    );

    return subscription;
  }

  /**
   * Unsubscribe from a node
   * AC#3: User can unsubscribe via notification or context menu
   */
  async unsubscribe(userId: string, nodeId: string): Promise<void> {
    const deleted = await this.subscriptionRepo.delete(userId, nodeId);

    if (!deleted) {
      throw new NotFoundException('Subscription not found');
    }

    this.logger.log(`User ${userId} unsubscribed from node ${nodeId}`);
  }

  /**
   * Check if user is subscribed to a node
   * Used by frontend to show watch/unwatch toggle state
   */
  async checkSubscription(
    userId: string,
    nodeId: string
  ): Promise<CheckSubscriptionResponse> {
    const subscription = await this.subscriptionRepo.findByUserAndNode(
      userId,
      nodeId
    );

    return {
      isSubscribed: subscription !== null,
      subscriptionId: subscription?.id,
    };
  }

  /**
   * Get all subscriptions for a user
   */
  async listUserSubscriptions(
    userId: string
  ): Promise<SubscriptionListResponse> {
    const subscriptions = await this.subscriptionRepo.findByUser(userId);
    const total = await this.subscriptionRepo.countByUser(userId);

    return {
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        userId: s.userId,
        nodeId: s.nodeId,
        mindmapId: s.mindmapId,
        createdAt: s.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Get all subscribers for a node
   * Used by notification system to send updates
   */
  async getNodeSubscribers(nodeId: string): Promise<string[]> {
    const subscriptions =
      await this.subscriptionRepo.findSubscribersByNode(nodeId);
    return subscriptions.map((s) => s.userId);
  }

  /**
   * Get all subscribers for a mindmap
   * Used for bulk notifications when multiple nodes change
   */
  async getMindmapSubscribers(mindmapId: string): Promise<string[]> {
    const subscriptions =
      await this.subscriptionRepo.findSubscribersByMindmap(mindmapId);
    // Deduplicate user IDs
    return [...new Set(subscriptions.map((s) => s.userId))];
  }
}
