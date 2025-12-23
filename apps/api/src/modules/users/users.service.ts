/**
 * Story 4.1: Approval Driven Workflow
 * Users Service - Business logic for user queries
 */

import { Injectable } from '@nestjs/common';
import { prisma, type User } from '@cdm/database';

export interface UserSearchResult {
    id: string;
    name: string | null;
    email: string;
}

export interface UserListQuery {
    search?: string;
    limit?: number;
    offset?: number;
}

@Injectable()
export class UsersService {
    /**
     * List all users with optional pagination
     */
    async list(query: UserListQuery = {}): Promise<{ users: UserSearchResult[]; total: number }> {
        const { limit = 50, offset = 0 } = query;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                take: limit,
                skip: offset,
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            }),
            prisma.user.count(),
        ]);

        return { users, total };
    }

    /**
     * Search users by name or email
     */
    async search(q: string, limit = 20): Promise<UserSearchResult[]> {
        if (!q || q.trim().length === 0) {
            return [];
        }

        const keyword = q.trim();

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: keyword, mode: 'insensitive' } },
                    { email: { contains: keyword, mode: 'insensitive' } },
                ],
            },
            take: limit,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        return users;
    }

    /**
     * Get user by ID
     */
    async findById(id: string): Promise<UserSearchResult | null> {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        return user;
    }
}
