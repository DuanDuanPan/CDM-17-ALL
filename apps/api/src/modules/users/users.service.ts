/**
 * Story 10.2: UsersService Repository 收敛
 * Users Service - Business logic for user queries
 * Refactored to use Repository pattern - no direct prisma imports
 */

import { Injectable } from '@nestjs/common';
import { UsersRepository, type UserBasicInfo } from './users.repository';

/**
 * UserSearchResult type alias for backward compatibility
 * Points to UserBasicInfo from repository
 */
export type UserSearchResult = UserBasicInfo;

export interface UserListQuery {
    search?: string;
    limit?: number;
    offset?: number;
}

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) { }

    /**
     * List all users with optional pagination
     * Delegates to UsersRepository.findMany()
     */
    async list(query: UserListQuery = {}): Promise<{ users: UserSearchResult[]; total: number }> {
        const { limit = 50, offset = 0 } = query;
        return this.usersRepository.findMany({ limit, offset });
    }

    /**
     * Search users by name or email
     * Returns default list when query is empty
     * Delegates to UsersRepository.search()
     */
    async search(q: string, limit = 20): Promise<UserSearchResult[]> {
        return this.usersRepository.search(q, limit);
    }

    /**
     * Get user by ID
     * Delegates to UsersRepository.findById()
     */
    async findById(id: string): Promise<UserSearchResult | null> {
        return this.usersRepository.findById(id);
    }
}
