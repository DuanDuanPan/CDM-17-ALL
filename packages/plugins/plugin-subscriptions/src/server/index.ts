/**
 * Plugin Subscriptions - Server Entry Point
 * Story 10.7: subscriptions 插件化迁移
 * 
 * This module provides the backend (NestJS) module for the subscriptions plugin.
 * Handles node subscription/watch functionality with throttled notifications.
 * 
 * @module @cdm/plugin-subscriptions/server
 */

import { Module, DynamicModule } from '@nestjs/common';
import { SubscriptionModule } from './subscriptions/subscriptions.module';

// Re-export modules
export { SubscriptionModule, SubscriptionModuleOptions } from './subscriptions/subscriptions.module';

// Re-export services
export { SubscriptionService } from './subscriptions/subscriptions.service';

// Re-export repositories
export { SubscriptionRepository } from './subscriptions/subscriptions.repository';

// Re-export listener
export { SubscriptionListener, SUBSCRIPTION_EVENTS, NodeChangedEvent, THROTTLE_WINDOW_MS, MAX_CHANGED_NODES } from './subscriptions/subscription.listener';

// Re-export injection tokens and interfaces
export { NOTIFICATION_SERVICE, INotificationService } from './subscriptions/subscription.listener';

/**
 * Options for configuring the SubscriptionsServerModule
 */
export interface SubscriptionsServerModuleOptions {
    /** 
     * Modules to import (e.g., NotificationModule)
     */
    imports?: any[];
    /**
     * NotificationService class for injection token alias
     * Required for sending throttled WATCH_UPDATE notifications
     */
    notificationServiceClass: any;
}

/**
 * SubscriptionsServerModule
 * 
 * The main server module for the subscriptions plugin.
 * 
 * @example
 * ```typescript
 * // In apps/api/src/app.module.ts
 * import { SubscriptionsServerModule } from '@cdm/plugin-subscriptions/server';
 * import { NotificationModule } from './modules/notification/notification.module';
 * import { NotificationService } from './modules/notification/notification.service';
 * 
 * @Module({
 *   imports: [
 *     NotificationModule,
 *     SubscriptionsServerModule.forRoot({
 *       imports: [NotificationModule],
 *       notificationServiceClass: NotificationService,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class SubscriptionsServerModule {
    /**
     * Register the SubscriptionsServerModule with dynamic configuration
     */
    static forRoot(options: SubscriptionsServerModuleOptions): DynamicModule {
        return {
            module: SubscriptionsServerModule,
            imports: [
                SubscriptionModule.forRoot({
                    imports: options.imports,
                    notificationServiceClass: options.notificationServiceClass,
                }),
            ],
            exports: [SubscriptionModule],
        };
    }
}
