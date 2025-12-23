/**
 * Story 4.1: Approval Driven Workflow
 * Users Module - User management for approval workflow
 */

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
