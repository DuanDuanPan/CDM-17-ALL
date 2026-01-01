/**
 * Story 4.4: Watch & Subscription
 * Story 4.5: Smart Notification Center - Noise Aggregation
 * Subscription Listener - Listens for node changes and triggers notifications
 *
 * This listener hooks into node change events and notifies subscribers.
 * Uses event-driven architecture with throttling to prevent notification spam.
 *
 * HIGH priority notifications (MENTION, APPROVAL_*) bypass this throttling -
 * they are handled directly by their respective services via NotificationService.createAndNotify().
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

/**
 * Story 4.5: Configurable throttle window
 * - Default: 5 minutes for production (5 * 60 * 1000 = 300000ms)
 * - Can be overridden via NOTIFICATION_THROTTLE_MS environment variable
 * - Dev/tests can use shorter values (e.g., 5000ms = 5 seconds)
 */
const DEFAULT_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
const parsedThrottleMs = Number.parseInt(process.env.NOTIFICATION_THROTTLE_MS ?? '', 10);
export const THROTTLE_WINDOW_MS =
  Number.isFinite(parsedThrottleMs) && parsedThrottleMs > 0 ? parsedThrottleMs : DEFAULT_THROTTLE_MS;

/**
 * Story 4.5: Maximum number of node names to buffer per throttle key
 * Prevents memory blowup during batch operations while preserving total count
 */
export const MAX_CHANGED_NODES = 100;

type ThrottleState = {
  pendingChanges: number;
  changedNodes: Set<string>;
  firstNodeId: string;
  firstNodeName: string;
  actorIds: Set<string>;
};

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

  // Throttle map: recipientId:mindmapId -> aggregated state (debounced within window)
  private throttleMap = new Map<string, ThrottleState>();

  // [MEDIUM FIX] Timer map for OnModuleDestroy cleanup
  private timerMap = new Map<string, NodeJS.Timeout>();

  private readonly THROTTLE_INTERVAL = THROTTLE_WINDOW_MS;

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
   * Process notification with 5-minute throttling (AC#1)
   * Debounce within the window and emit one summarized notification per recipientId + mindmapId
   */
  private async processThrottledNotification(
    recipientId: string,
    event: NodeChangedEvent,
  ): Promise<void> {
    const throttleKey = `${recipientId}:${event.mindmapId}`;

    const existing = this.throttleMap.get(throttleKey);
    const throttleState: ThrottleState = existing || {
      pendingChanges: 0,
      changedNodes: new Set<string>(),
      firstNodeId: event.nodeId,
      firstNodeName: event.nodeName,
      actorIds: new Set<string>(),
    };

    throttleState.pendingChanges++;

    if (event.userId) {
      throttleState.actorIds.add(event.userId);
    }

    // Story 4.5: Cap changedNodes to MAX_CHANGED_NODES to prevent memory blowup
    // The total count (pendingChanges) is still preserved for accurate reporting
    if (throttleState.changedNodes.size < MAX_CHANGED_NODES) {
      throttleState.changedNodes.add(event.nodeName);
    }

    this.throttleMap.set(throttleKey, throttleState);

    // Debounce: reset timer on every change within the window.
    const existingTimer = this.timerMap.get(throttleKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timerMap.delete(throttleKey);
    }

    const timer = setTimeout(() => {
      this.timerMap.delete(throttleKey);
      this.flushPendingNotification(throttleKey).catch((error) => {
        this.logger.error(`Failed to flush pending notification for ${throttleKey}: ${error}`);
      });
    }, this.THROTTLE_INTERVAL);

    this.timerMap.set(throttleKey, timer);
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

    // Clear state after flushing (next batch will create a fresh throttle state)
    this.throttleMap.delete(throttleKey);
  }

  /**
   * Send WATCH_UPDATE notification to a recipient
   */
  private async sendWatchNotification(
    recipientId: string,
    mindmapId: string,
    state: ThrottleState,
  ): Promise<void> {
    const changedNodeNames = Array.from(state.changedNodes);
    const changeCount = state.pendingChanges;

    // Story 4.5: Summary templates (AC#1)
    let actorLabel = '多人';
    if (state.actorIds.size === 1) {
      const [actorId] = Array.from(state.actorIds);
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { name: true },
      });
      actorLabel = actor?.name || '某人';
    }

    const message = `${actorLabel}修改了 ${changeCount} 个节点`;

    const firstNodeName = state.firstNodeName || changedNodeNames[0] || '未知节点';
    const firstNodeId = state.firstNodeId;

    const content: WatchNotificationContent = {
      mindmapId,
      nodeId: firstNodeId,
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
        refNodeId: firstNodeId || undefined,
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
