/**
 * Story 10.2: UsersService Repository 收敛
 * Unit tests for UsersRepository
 */

import { UsersRepository } from '../users.repository';

// Mock Prisma
jest.mock('@cdm/database', () => ({
    prisma: {
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
        },
    },
}));

import { prisma } from '@cdm/database';

describe('UsersRepository', () => {
    let repository: UsersRepository;
    const mockPrisma = prisma as jest.Mocked<typeof prisma>;

    beforeEach(() => {
        repository = new UsersRepository();
        jest.clearAllMocks();
    });

    describe('findMany', () => {
        it('should return users with pagination and total count', async () => {
            const mockUsers = [
                { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
                { id: 'user-2', name: 'Bob', email: 'bob@test.com' },
            ];

            (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
            (mockPrisma.user.count as jest.Mock).mockResolvedValue(10);

            const result = await repository.findMany({ limit: 2, offset: 0 });

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                take: 2,
                skip: 0,
                orderBy: { name: 'asc' },
                select: { id: true, name: true, email: true },
            });
            expect(mockPrisma.user.count).toHaveBeenCalled();
            expect(result.users).toEqual(mockUsers);
            expect(result.total).toBe(10);
        });

        it('should use default limit=50 and offset=0', async () => {
            (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.user.count as jest.Mock).mockResolvedValue(0);

            await repository.findMany();

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                take: 50,
                skip: 0,
                orderBy: { name: 'asc' },
                select: { id: true, name: true, email: true },
            });
        });

        it('should request findMany and count before awaiting results (Promise.all)', async () => {
            type BasicUser = { id: string; name: string | null; email: string };

            let resolveFindMany!: (value: BasicUser[]) => void;
            let resolveCount!: (value: number) => void;

            const findManyPromise = new Promise<BasicUser[]>((resolve) => {
                resolveFindMany = resolve;
            });
            const countPromise = new Promise<number>((resolve) => {
                resolveCount = resolve;
            });

            (mockPrisma.user.findMany as jest.Mock).mockReturnValue(findManyPromise);
            (mockPrisma.user.count as jest.Mock).mockReturnValue(countPromise);

            const pending = repository.findMany();

            expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
            expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);

            const users: BasicUser[] = [
                { id: 'user-1', name: 'Test', email: 'test@test.com' },
            ];
            resolveFindMany(users);
            resolveCount(1);

            await expect(pending).resolves.toEqual({ users, total: 1 });
        });
    });

    describe('search', () => {
        it('should return default list when keyword is empty', async () => {
            const mockUsers = [
                { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
            ];

            (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

            const result = await repository.search('', 20);

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                take: 20,
                orderBy: { name: 'asc' },
                select: { id: true, name: true, email: true },
            });
            expect(result).toEqual(mockUsers);
        });

        it('should return default list when keyword is whitespace only', async () => {
            (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

            await repository.search('   ', 10);

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                take: 10,
                orderBy: { name: 'asc' },
                select: { id: true, name: true, email: true },
            });
        });

        it('should search by name or email with case-insensitive OR filter', async () => {
            const mockUsers = [
                { id: 'user-1', name: 'Test User', email: 'test@test.com' },
            ];

            (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

            const result = await repository.search('test', 20);

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { name: { contains: 'test', mode: 'insensitive' } },
                        { email: { contains: 'test', mode: 'insensitive' } },
                    ],
                },
                take: 20,
                orderBy: { name: 'asc' },
                select: { id: true, name: true, email: true },
            });
            expect(result).toEqual(mockUsers);
        });

        it('should trim whitespace from keyword before searching', async () => {
            (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

            await repository.search('  hello  ', 20);

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { name: { contains: 'hello', mode: 'insensitive' } },
                        { email: { contains: 'hello', mode: 'insensitive' } },
                    ],
                },
                take: 20,
                orderBy: { name: 'asc' },
                select: { id: true, name: true, email: true },
            });
        });

        it('should use default limit=20', async () => {
            (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

            await repository.search('test');

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { name: { contains: 'test', mode: 'insensitive' } },
                        { email: { contains: 'test', mode: 'insensitive' } },
                    ],
                },
                take: 20,
                orderBy: { name: 'asc' },
                select: { id: true, name: true, email: true },
            });
        });
    });

    describe('findById', () => {
        it('should find user by id', async () => {
            const mockUser = { id: 'user-1', name: 'Test User', email: 'test@test.com' };

            (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await repository.findById('user-1');

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                select: { id: true, name: true, email: true },
            });
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await repository.findById('non-existent');

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'non-existent' },
                select: { id: true, name: true, email: true },
            });
            expect(result).toBeNull();
        });
    });
});
