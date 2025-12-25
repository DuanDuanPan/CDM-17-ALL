/**
 * Story 4.3: Contextual Comments & Mentions
 * Comments Module - NestJS module definition
 */

import { Module, forwardRef } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { AttachmentsController } from './attachments.controller';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './comments.repository';
import { CommentsGateway } from './comments.gateway';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        forwardRef(() => NotificationModule),
        UsersModule,
    ],
    controllers: [CommentsController, AttachmentsController],
    providers: [
        CommentsService,
        CommentsRepository,
        CommentsGateway,
    ],
    exports: [CommentsService],
})
export class CommentsModule { }

