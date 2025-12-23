/**
 * Story 4.1: Approval Driven Workflow
 * Users Controller - REST endpoints for user queries
 */

import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { UsersService, UserSearchResult } from './users.service';

interface ListQuery {
    limit?: string;
    offset?: string;
}

interface SearchQuery {
    q?: string;
    limit?: string;
}

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    /**
     * GET /users
     * List all users with optional pagination
     */
    @Get()
    async list(@Query() query: ListQuery): Promise<{ users: UserSearchResult[]; total: number }> {
        const limit = query.limit ? parseInt(query.limit, 10) : 50;
        const offset = query.offset ? parseInt(query.offset, 10) : 0;

        return this.usersService.list({ limit, offset });
    }

    /**
     * GET /users/search?q=keyword
     * Search users by name or email
     */
    @Get('search')
    async search(@Query() query: SearchQuery): Promise<{ users: UserSearchResult[] }> {
        const limit = query.limit ? parseInt(query.limit, 10) : 20;
        const users = await this.usersService.search(query.q || '', limit);
        return { users };
    }

    /**
     * GET /users/:id
     * Get user by ID
     */
    @Get(':id')
    async findById(@Param('id') id: string): Promise<UserSearchResult> {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }
        return user;
    }
}
