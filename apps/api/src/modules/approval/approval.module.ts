/**
 * Story 4.1: Approval Driven Workflow
 * Approval Module - Encapsulates approval workflow functionality
 */

import { Module, forwardRef } from '@nestjs/common';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { ApprovalRepository } from './approval.repository';
import { ApprovalListener } from './approval.listener';
import { NotificationModule } from '../notification/notification.module';
import { NodesModule } from '../nodes';
import { CollabModule } from '../collab/collab.module';

@Module({
    imports: [
        NotificationModule,
        forwardRef(() => NodesModule), // Avoid circular dependency
        CollabModule, // Story 4.1 FIX-3: For Yjs real-time sync
    ],
    controllers: [ApprovalController],
    providers: [ApprovalService, ApprovalRepository, ApprovalListener],
    exports: [ApprovalService],
})
export class ApprovalModule { }
