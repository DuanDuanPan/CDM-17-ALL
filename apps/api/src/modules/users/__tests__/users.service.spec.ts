/**
 * Story 10.2: UsersService Repository 收敛
 * Unit tests for UsersService with mocked UsersRepository
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';

describe('UsersService', () => {
    let service: UsersService;
    let mockUsersRepository: jest.Mocked<UsersRepository>;

    // Mock data
    const mockUsers = [
        { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
        { id: 'user-2', name: 'Bob', email: 'bob@test.com' },
    ];

    beforeEach(async () => {
        // Create mocks with proper typing
        mockUsersRepository = {
            findMany: jest.fn(),
            search: jest.fn(),
            findById: jest.fn(),
        } as jest.Mocked<UsersRepository>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: UsersRepository, useValue: mockUsersRepository },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    describe('list', () => {
        it('should delegate to repository.findMany with pagination options', async () => {
            mockUsersRepository.findMany.mockResolvedValue({
                users: mockUsers,
                total: 10,
            });

            const result = await service.list({ limit: 10, offset: 5 });

            expect(mockUsersRepository.findMany).toHaveBeenCalledWith({
                limit: 10,
                offset: 5,
            });
            expect(result.users).toEqual(mockUsers);
            expect(result.total).toBe(10);
        });

        it('should use default limit=50 and offset=0', async () => {
            mockUsersRepository.findMany.mockResolvedValue({
                users: [],
                total: 0,
            });

            await service.list();

            expect(mockUsersRepository.findMany).toHaveBeenCalledWith({
                limit: 50,
                offset: 0,
            });
        });

        it('should pass through the repository result unchanged', async () => {
            const expectedResult = { users: mockUsers, total: 100 };
            mockUsersRepository.findMany.mockResolvedValue(expectedResult);

            const result = await service.list({});

            expect(result).toEqual(expectedResult);
        });
    });

    describe('search', () => {
        it('should delegate to repository.search with query and limit', async () => {
            mockUsersRepository.search.mockResolvedValue(mockUsers);

            const result = await service.search('test', 15);

            expect(mockUsersRepository.search).toHaveBeenCalledWith('test', 15);
            expect(result).toEqual(mockUsers);
        });

        it('should use default limit=20', async () => {
            mockUsersRepository.search.mockResolvedValue([]);

            await service.search('keyword');

            expect(mockUsersRepository.search).toHaveBeenCalledWith('keyword', 20);
        });

        it('should handle empty search query', async () => {
            mockUsersRepository.search.mockResolvedValue(mockUsers);

            const result = await service.search('', 20);

            expect(mockUsersRepository.search).toHaveBeenCalledWith('', 20);
            expect(result).toEqual(mockUsers);
        });
    });

    describe('findById', () => {
        it('should delegate to repository.findById', async () => {
            const mockUser = mockUsers[0];
            mockUsersRepository.findById.mockResolvedValue(mockUser);

            const result = await service.findById('user-1');

            expect(mockUsersRepository.findById).toHaveBeenCalledWith('user-1');
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            mockUsersRepository.findById.mockResolvedValue(null);

            const result = await service.findById('non-existent');

            expect(mockUsersRepository.findById).toHaveBeenCalledWith('non-existent');
            expect(result).toBeNull();
        });
    });
});
