/**
 * Story 4.4: Watch & Subscription
 * Subscription Listener - Listens for node changes and triggers notifications
 *
 * This listener hooks into node change events and notifies subscribers.
 * Uses event-driven architecture with throttling to prevent notification spam.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import { SubscriptionRepository } from './subscriptions.repository';
import { NotificationService } from '../notification/notification.service';
import { COLLAB_EVENTS, YjsNodeChangedEvent } from '../collab/collab.service';
import { prisma } from '@cdm/database';
import type { WatchNotificationContent } from '@cdm/types';

// Event names for subscription system
export const SUBSCRIPTION_EVENTS = {
  NODE_CHANGED: 'subscription.node.changed',
} as const;

// Event payload for node changes
export interface NodeChangedEvent {
  nodeId: string;
  mindmapId: string;
  nodeName: string;
  changeType: 'update' | 'delete' | 'create';
  changedFields?: string[];
  userId?: string; // User who made the change (to exclude from notification)
}

@Injectable()
export class SubscriptionListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionListener.name);

  // Throttle map: recipientId:mindmapId -> { lastNotified: timestamp, pendingChanges: count, changedNodes: Set }
  private throttleMap = new Map<string, { lastNotified: number; pendingChanges: number; changedNodes: Set<string> }>();

  // [MEDIUM FIX] Timer map for OnModuleDestroy cleanup
  private timerMap = new Map<string, NodeJS.Timeout>();

  // Throttle interval: 5 minutes in milliseconds (AC#2: 5分钟节流)
  private readonly THROTTLE_INTERVAL = 5 * 60 * 1000;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly notificationService: NotificationService,
  ) { }

  async onModuleInit() {
    // Listen for node change events (from REST API or other sources)
    this.eventEmitter.on(SUBSCRIPTION_EVENTS.NODE_CHANGED, (event: NodeChangedEvent) => {
      this.handleNodeChanged(event);
    });

    this.logger.log('SubscriptionListener initialized');
  }

  /**
   * [MEDIUM FIX] Clean up all timers on module destroy to prevent memory leaks
   */
  async onModuleDestroy() {
    this.logger.log('Cleaning up SubscriptionListener timers...');
    for (const timer of this.timerMap.values()) {
      clearTimeout(timer);
    }
    this.timerMap.clear();
    this.throttleMap.clear();
    this.logger.log('SubscriptionListener cleanup complete');
  }

  /**
   * Story 4.4: Listen for Yjs node changes from CollabService
   * This is the main entry point for real-time change detection
   */
  @OnEvent(COLLAB_EVENTS.NODE_CHANGED)
  async handleYjsNodeChanged(event: YjsNodeChangedEvent): Promise<void> {
    // Convert Yjs event to our internal format
    const nodeChangedEvent: NodeChangedEvent = {
      nodeId: event.nodeId,
      mindmapId: event.mindmapId,
      nodeName: event.nodeName,
      changeType: event.changeType,
    };
    await this.handleNodeChanged(nodeChangedEvent);
  }

  /**
   * Handle node change event
   * Implements AC#2: When subscribed node OR its child nodes changes, send WATCH_UPDATE notification
   */
  async handleNodeChanged(event: NodeChangedEvent): Promise<void> {
    this.logger.debug(`Node changed: ${event.nodeId} (${event.changeType})`);

    try {
      // Find all direct subscribers for this node
      const directSubscriptions = await this.subscriptionRepo.findSubscribersByNode(event.nodeId);

      // [AC#2 FIX] Also find subscribers of ancestor nodes (parent chain)
      // When a child node changes, parent node subscribers should also be notified
      const ancestorSubscriptions = await this.findAncestorSubscribers(event.nodeId, event.mindmapId);

      // Merge and deduplicate subscribers
      const allSubscriptions = [...directSubscriptions, ...ancestorSubscriptions];
      const uniqueUserIds = new Set(
        allSubscriptions
          .filter(sub => sub.userId !== event.userId) // Exclude change author
          .map(sub => sub.userId)
      );

      if (uniqueUserIds.size === 0) {
        this.logger.debug(`No subscribers for node ${event.nodeId} or its ancestors`);
        return;
      }

      // Apply throttling per recipient
      for (const recipientId of uniqueUserIds) {
        await this.processThrottledNotification(recipientId, event);
      }
    } catch (error) {
      this.logger.error(`Failed to process node change notification: ${error}`);
    }
  }

  /**
   * [AC#2] Find subscribers of all ancestor nodes (parent chain)
   * This ensures that users watching a parent branch are notified when children change
   */
  private async findAncestorSubscribers(
    nodeId: string,
    mindmapId: string
  ): Promise<{ userId: string; nodeId: string }[]> {
    const ancestorSubscribers: { userId: string; nodeId: string }[] = [];

    // Query parent chain from database
    let currentNodeId: string | null = nodeId;
    const maxDepth = 20; // Prevent infinite loops
    let depth = 0;

    while (currentNodeId && depth < maxDepth) {
      const nodeRecord: { parentId: string | null } | null = await prisma.node.findUnique({
        where: { id: currentNodeId },
        select: { parentId: true },
      });

      if (!nodeRecord?.parentId) break;

      // Get subscriptions for parent node
      const parentSubscriptions = await this.subscriptionRepo.findSubscribersByNode(nodeRecord.parentId);
      ancestorSubscribers.push(...parentSubscriptions.map(s => ({ userId: s.userId, nodeId: s.nodeId })));

      currentNodeId = nodeRecord.parentId;
      depth++;
    }

    return ancestorSubscribers;
  }

  /**
   * Process notification with 5-minute throttling (AC#2)
   * Aggregates multiple changes into a single notification
   */
  private async processThrottledNotification(
    recipientId: string,
    event: NodeChangedEvent,
  ): Promise<void> {
    const throttleKey = `${recipientId}:${event.mindmapId}`;
    const now = Date.now();

    const throttleState = this.throttleMap.get(throttleKey) || {
      lastNotified: 0,
      pendingChanges: 0,
      changedNodes: new Set<string>(),
    };

    throttleState.pendingChanges++;
    throttleState.changedNodes.add(event.nodeName);

    // Check if we should send notification now or wait
    if (now - throttleState.lastNotified >= this.THROTTLE_INTERVAL) {
      // Throttle window passed, send notification
      await this.sendWatchNotification(recipientId, event.mindmapId, throttleState);

      // Reset throttle state
      this.throttleMap.set(throttleKey, {
        lastNotified: now,
        pendingChanges: 0,
        changedNodes: new Set(),
      });
    } else {
      // Still in throttle window, just track the change
      this.throttleMap.set(throttleKey, throttleState);

      // Schedule a delayed notification if this is the first pending change
      if (throttleState.pendingChanges === 1) {
        const delay = this.THROTTLE_INTERVAL - (now - throttleState.lastNotified);
        // [MEDIUM FIX] Store timer reference for cleanup on module destroy
        const timer = setTimeout(() => {
          this.timerMap.delete(throttleKey);
          this.flushPendingNotification(throttleKey);
        }, delay);
        this.timerMap.set(throttleKey, timer);
      }
    }
  }

  /**
   * Flush pending notification after throttle window expires
   */
  private async flushPendingNotification(throttleKey: string): Promise<void> {
    const throttleState = this.throttleMap.get(throttleKey);
    if (!throttleState || throttleState.pendingChanges === 0) {
      return;
    }

    const [recipientId, mindmapId] = throttleKey.split(':');

    // Get mindmap info for the notification
    const mindmap = await prisma.graph.findUnique({
      where: { id: mindmapId },
      select: { id: true },
    });

    if (!mindmap) {
      this.throttleMap.delete(throttleKey);
      return;
    }

    await this.sendWatchNotification(recipientId, mindmapId, throttleState);

    // Reset throttle state
    this.throttleMap.set(throttleKey, {
      lastNotified: Date.now(),
      pendingChanges: 0,
      changedNodes: new Set(),
    });
  }

  /**
   * Send WATCH_UPDATE notification to a recipient
   */
  private async sendWatchNotification(
    recipientId: string,
    mindmapId: string,
    state: { pendingChanges: number; changedNodes: Set<string> },
  ): Promise<void> {
    const changedNodeNames = Array.from(state.changedNodes);
    const changeCount = state.pendingChanges;

    // Generate aggregated message (AC#2: aggregated summary)
    let message: string;
    if (changedNodeNames.length === 1) {
      message = `节点 "${changedNodeNames[0]}" 发生变更`;
    } else if (changedNodeNames.length <= 3) {
      message = `节点 ${changedNodeNames.map(n => `"${n}"`).join('、')} 发生变更`;
    } else {
      message = `节点 "${changedNodeNames[0]}" 等 ${changedNodeNames.length} 个节点发生变更`;
    }

    // Use the first changed node as reference
    const firstNodeName = changedNodeNames[0] || '未知节点';

    // Get first node ID for reference
    const firstNode = await prisma.node.findFirst({
      where: {
        graphId: mindmapId,
        label: firstNodeName,
      },
      select: { id: true },
    });

    const content: WatchNotificationContent = {
      mindmapId,
      nodeId: firstNode?.id || '',
      nodeName: firstNodeName,
      message,
      changeCount,
      changedNodes: changedNodeNames,
    };

    try {
      await this.notificationService.createAndNotify({
        recipientId,
        type: 'WATCH_UPDATE',
        title: `关注内容更新: ${message}`,
        content,
        refNodeId: firstNode?.id,
      });

      this.logger.log(`Sent WATCH_UPDATE notification to ${recipientId}: ${message}`);
    } catch (error) {
      this.logger.error(`Failed to send WATCH_UPDATE notification: ${error}`);
    }
  }

  /**
   * Emit node changed event (for use by other modules)
   */
  emitNodeChanged(event: NodeChangedEvent): void {
    this.eventEmitter.emit(SUBSCRIPTION_EVENTS.NODE_CHANGED, event);
  }
}
