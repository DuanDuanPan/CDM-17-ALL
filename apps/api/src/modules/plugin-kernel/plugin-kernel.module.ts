/**
 * PluginKernelModule
 *
 * Story 7.5: Kernel Purification
 * Provides kernel → plugin infrastructure contracts via injection tokens.
 *
 * This module is intentionally "thin": it only adapts existing kernel services
 * (NotificationService, UsersService, CollabService, AppExecutorService) to the
 * string-based tokens used inside plugin packages.
 */

import { Global, Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { CollabModule } from '../collab';
import { CollabService } from '../collab/collab.service';
import { AppLibraryModule } from '../app-library';
import { AppExecutorService } from '../app-library/app-executor.service';
import { KernelPluginManagerService } from './kernel-plugin-manager.service';

/**
 * Story 7.5: Plugin infrastructure tokens.
 * Keep these strings aligned with plugin packages.
 */
const NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE';
const USERS_SERVICE = 'USERS_SERVICE';
const COLLAB_SERVICE = 'COLLAB_SERVICE';
const APP_EXECUTOR_SERVICE = 'APP_EXECUTOR_SERVICE';

@Global()
@Module({
  imports: [NotificationModule, UsersModule, CollabModule, AppLibraryModule],
  providers: [
    KernelPluginManagerService,
    { provide: NOTIFICATION_SERVICE, useExisting: NotificationService },
    { provide: USERS_SERVICE, useExisting: UsersService },
    { provide: COLLAB_SERVICE, useExisting: CollabService },
    { provide: APP_EXECUTOR_SERVICE, useExisting: AppExecutorService },
  ],
  exports: [
    KernelPluginManagerService,
    NOTIFICATION_SERVICE,
    USERS_SERVICE,
    COLLAB_SERVICE,
    APP_EXECUTOR_SERVICE,
  ],
})
export class PluginKernelModule {}
