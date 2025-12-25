/**
 * Story 4.4: Watch & Subscription
 * Subscription Module - Encapsulates subscription functionality
 *
 * Uses event-driven architecture with @nestjs/event-emitter:
 * - CollabService emits COLLAB_EVENTS.NODE_CHANGED on Yjs updates
 * - SubscriptionListener handles events and sends throttled notifications
 */

import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscriptions.controller';
import { SubscriptionService } from './subscriptions.service';
import { SubscriptionRepository } from './subscriptions.repository';
import { SubscriptionListener } from './subscription.listener';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionRepository, SubscriptionListener],
  exports: [SubscriptionService, SubscriptionRepository, SubscriptionListener],
})
export class SubscriptionModule {}
