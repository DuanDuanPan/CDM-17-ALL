/**
 * Story 10.7: subscriptions 插件化迁移
 * Subscription Module - Encapsulates subscription functionality
 *
 * Uses event-driven architecture with @nestjs/event-emitter:
 * - CollabService emits 'collab.node.changed' on Yjs updates
 * - SubscriptionListener handles events and sends throttled notifications
 * 
 * Migrated from apps/api/src/modules/subscriptions/subscriptions.module.ts
 * 
 * KEY CHANGES for plugin migration:
 * - Static module → DynamicModule with forRoot()
 * - NotificationModule import → injected via notificationServiceClass
 * - NOTIFICATION_SERVICE token binding via useExisting
 */

import { Module, DynamicModule } from '@nestjs/common';
import { SubscriptionController } from './subscriptions.controller';
import { SubscriptionService } from './subscriptions.service';
import { SubscriptionRepository } from './subscriptions.repository';
import { SubscriptionListener, NOTIFICATION_SERVICE } from './subscription.listener';

/**
 * Options for configuring the SubscriptionModule
 */
export interface SubscriptionModuleOptions {
    /** 
     * Modules to import (e.g., NotificationModule for the NotificationService)
     */
    imports?: any[];
    /**
     * NotificationService class for injection token alias
     * Required for sending throttled WATCH_UPDATE notifications
     */
    notificationServiceClass: any;
}

@Module({})
export class SubscriptionModule {
    /**
     * Register the SubscriptionModule with dynamic configuration
     * 
     * @example
     * ```typescript
     * SubscriptionModule.forRoot({
     *   imports: [NotificationModule],
     *   notificationServiceClass: NotificationService,
     * })
     * ```
     */
    static forRoot(options: SubscriptionModuleOptions): DynamicModule {
        return {
            module: SubscriptionModule,
            imports: options.imports ?? [],
            controllers: [SubscriptionController],
            providers: [
                SubscriptionService,
                SubscriptionRepository,
                SubscriptionListener,
                // Bind NOTIFICATION_SERVICE token to the provided class
                { provide: NOTIFICATION_SERVICE, useExisting: options.notificationServiceClass },
            ],
            exports: [SubscriptionService, SubscriptionRepository, SubscriptionListener],
        };
    }
}
