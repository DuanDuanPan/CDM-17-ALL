/**
 * Story 10.2: UsersService Repository 收敛
 * Users Module - User management with Repository pattern
 */

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
    controllers: [UsersController],
    providers: [UsersRepository, UsersService],
    exports: [UsersRepository, UsersService],
})
export class UsersModule { }
