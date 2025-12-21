/**
 * Story 2.4: Task Dispatch & Feedback
 * Notification Module - Encapsulates notification functionality
 */

import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { NotificationGateway } from './notification.gateway';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
