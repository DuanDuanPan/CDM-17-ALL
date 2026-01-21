/**
 * Story 10.2: UsersService Repository 收敛
 * UsersRepository - Abstracts User data access from UsersService
 */

import { Injectable } from '@nestjs/common';
import { prisma, type Prisma } from '@cdm/database';

/**
 * Define select pattern for user basic info (reused across all methods)
 * Matches existing UsersService select pattern: { id, name, email }
 */
const userBasicSelect = {
    id: true,
    name: true,
    email: true,
} as const;

/**
 * UserBasicInfo type derived from Prisma select pattern
 * Ensures type safety and consistency with database schema
 */
export type UserBasicInfo = Prisma.UserGetPayload<{
    select: typeof userBasicSelect;
}>;

/**
 * Query options for findMany
 */
export interface FindManyOptions {
    limit?: number;
    offset?: number;
}

/**
 * Result type for findMany with pagination
 */
export interface FindManyResult {
    users: UserBasicInfo[];
    total: number;
}

@Injectable()
export class UsersRepository {
    /**
     * Find many users with pagination
     * Preserves Promise.all parallel pattern for efficiency
     * Behavior: Default limit=50, offset=0, orderBy name asc
     */
    async findMany(options: FindManyOptions = {}): Promise<FindManyResult> {
        const { limit = 50, offset = 0 } = options;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                take: limit,
                skip: offset,
                orderBy: { name: 'asc' },
                select: userBasicSelect,
            }),
            prisma.user.count(),
        ]);

        return { users, total };
    }

    /**
     * Search users by name or email
     * When keyword is empty, returns default list (limit items, orderBy name asc)
     * When keyword is provided, performs case-insensitive OR search on name/email
     * Behavior: Default limit=20, mode='insensitive', orderBy name asc
     */
    async search(keyword: string, limit = 20): Promise<UserBasicInfo[]> {
        const trimmedKeyword = keyword?.trim() || '';

        // If no search keyword, return default user list
        if (trimmedKeyword.length === 0) {
            return prisma.user.findMany({
                take: limit,
                orderBy: { name: 'asc' },
                select: userBasicSelect,
            });
        }

        // Search by name or email (case-insensitive)
        return prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: trimmedKeyword, mode: 'insensitive' } },
                    { email: { contains: trimmedKeyword, mode: 'insensitive' } },
                ],
            },
            take: limit,
            orderBy: { name: 'asc' },
            select: userBasicSelect,
        });
    }

    /**
     * Find single user by ID
     * Returns null if not found
     */
    async findById(id: string): Promise<UserBasicInfo | null> {
        return prisma.user.findUnique({
            where: { id },
            select: userBasicSelect,
        });
    }
}
