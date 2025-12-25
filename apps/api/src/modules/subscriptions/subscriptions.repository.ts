/**
 * Story 4.4: Watch & Subscription
 * Subscription Repository - Data access layer for subscriptions
 */

import { Injectable } from '@nestjs/common';
import { prisma, type Subscription } from '@cdm/database';

@Injectable()
export class SubscriptionRepository {
  /**
   * Create a new subscription
   */
  async create(data: {
    userId: string;
    nodeId: string;
    mindmapId: string;
  }): Promise<Subscription> {
    return prisma.subscription.create({
      data: {
        userId: data.userId,
        nodeId: data.nodeId,
        mindmapId: data.mindmapId,
      },
    });
  }

  /**
   * Delete a subscription
   */
  async delete(userId: string, nodeId: string): Promise<Subscription | null> {
    try {
      return await prisma.subscription.delete({
        where: {
          userId_nodeId: {
            userId,
            nodeId,
          },
        },
      });
    } catch {
      // Record not found
      return null;
    }
  }

  /**
   * Find subscription by userId and nodeId
   */
  async findByUserAndNode(
    userId: string,
    nodeId: string
  ): Promise<Subscription | null> {
    return prisma.subscription.findUnique({
      where: {
        userId_nodeId: {
          userId,
          nodeId,
        },
      },
    });
  }

  /**
   * Check if user is subscribed to a node
   */
  async isSubscribed(userId: string, nodeId: string): Promise<boolean> {
    const subscription = await this.findByUserAndNode(userId, nodeId);
    return subscription !== null;
  }

  /**
   * Get all subscribers for a node
   */
  async findSubscribersByNode(nodeId: string): Promise<Subscription[]> {
    return prisma.subscription.findMany({
      where: { nodeId },
    });
  }

  /**
   * Get all subscribers for a mindmap (for bulk notifications)
   */
  async findSubscribersByMindmap(mindmapId: string): Promise<Subscription[]> {
    return prisma.subscription.findMany({
      where: { mindmapId },
    });
  }

  /**
   * Get all subscriptions for a user
   */
  async findByUser(userId: string): Promise<Subscription[]> {
    return prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Count subscriptions for a user
   */
  async countByUser(userId: string): Promise<number> {
    return prisma.subscription.count({
      where: { userId },
    });
  }
}
