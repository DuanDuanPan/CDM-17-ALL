/**
 * Story 7.5: API Service Unit Tests
 * Tests for centralized API services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import { searchUsers, fetchUserById } from '../users';
import { fetchArchivedNodes, batchUnarchiveNodes, batchDeleteNodes } from '../archive';
import { fetchAppLibraryEntries, fetchAppCategories, executeApp } from '../app-library';
import { searchKnowledgeResources } from '../knowledge';
import { markCommentsAsRead, downloadAttachment } from '../comments';

describe('Users API', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('searchUsers', () => {
        it('should search users with query', async () => {
            const mockUsers = [
                { id: '1', name: 'John Doe', email: 'john@example.com' },
                { id: '2', name: 'Jane Doe', email: 'jane@example.com' },
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ users: mockUsers }),
            });

            const result = await searchUsers('doe');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/users/search?q=doe&limit=20')
            );
            expect(result).toEqual(mockUsers);
        });

        it('should return empty array on error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await searchUsers('test');

            expect(result).toEqual([]);
        });

        it('should support custom limit', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ users: [] }),
            });

            await searchUsers('test', 10);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('limit=10')
            );
        });
    });

    describe('fetchUserById', () => {
        it('should fetch user by ID', async () => {
            const mockUser = { id: '1', name: 'John', email: 'john@example.com' };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser,
            });

            const result = await fetchUserById('1');

            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/users/1'));
            expect(result).toEqual(mockUser);
        });

        it('should return null for 404', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            const result = await fetchUserById('nonexistent');

            expect(result).toBeNull();
        });
    });
});

describe('Archive API', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('fetchArchivedNodes', () => {
        it('should fetch archived nodes', async () => {
            const mockNodes = [{ id: '1', label: 'Test Node' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ results: mockNodes }),
            });

            const result = await fetchArchivedNodes();

            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/nodes/archived'));
            expect(result).toEqual(mockNodes);
        });

        it('should filter by graphId', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ results: [] }),
            });

            await fetchArchivedNodes({ graphId: 'graph-123' });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('graphId=graph-123')
            );
        });
    });

    describe('batchUnarchiveNodes', () => {
        it('should unarchive multiple nodes', async () => {
            mockFetch.mockResolvedValue({ ok: true });

            await batchUnarchiveNodes(['node-1', 'node-2']);

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/nodes/node-1:unarchive'),
                { method: 'POST' }
            );
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/nodes/node-2:unarchive'),
                { method: 'POST' }
            );
        });
    });

    describe('batchDeleteNodes', () => {
        it('should delete multiple nodes', async () => {
            mockFetch.mockResolvedValue({ ok: true });

            await batchDeleteNodes(['node-1', 'node-2']);

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/nodes/node-1'),
                { method: 'DELETE' }
            );
        });
    });
});

describe('App Library API', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('fetchAppLibraryEntries', () => {
        it('should fetch entries without query', async () => {
            const mockEntries = [{ id: '1', name: 'Test App' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockEntries,
            });

            const result = await fetchAppLibraryEntries();

            expect(mockFetch).toHaveBeenCalledWith('/api/app-library?');
            expect(result).toEqual(mockEntries);
        });

        it('should fetch entries with query', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });

            await fetchAppLibraryEntries('satellite');

            expect(mockFetch).toHaveBeenCalledWith('/api/app-library?q=satellite');
        });
    });

    describe('fetchAppCategories', () => {
        it('should fetch categories', async () => {
            const mockCategories = ['Category A', 'Category B'];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCategories,
            });

            const result = await fetchAppCategories();

            expect(mockFetch).toHaveBeenCalledWith('/api/app-library/categories');
            expect(result).toEqual(mockCategories);
        });
    });

    describe('executeApp', () => {
        it('should execute app and return result', async () => {
            const mockResult = {
                outputs: [{ name: 'result', value: 'success' }],
                executedAt: '2024-01-01T00:00:00Z',
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResult,
            });

            const result = await executeApp('node-1', {
                appSourceType: 'library',
                appPath: null,
                appUrl: null,
                libraryAppId: 'app-1',
                libraryAppName: 'Test App',
                inputs: [],
                outputs: [],
            });

            expect(mockFetch).toHaveBeenCalledWith('/api/nodes/node-1/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: expect.any(String),
            });
            expect(result).toEqual(mockResult);
        });
    });
});

describe('Knowledge API', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        // Mock window.location for URL building
        Object.defineProperty(window, 'location', {
            value: { origin: 'http://localhost:3000' },
            writable: true,
        });
    });

    describe('searchKnowledgeResources', () => {
        it('should search knowledge resources', async () => {
            const mockResults = [{ id: '1', title: 'Test Doc', type: 'document' }];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResults,
            });

            const result = await searchKnowledgeResources('test');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('knowledge-library')
            );
            expect(result).toEqual(mockResults);
        });
    });
});

describe('Comments API', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('markCommentsAsRead', () => {
        it('should mark comments as read', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true });

            await markCommentsAsRead('node-1', 'user-1');

            expect(mockFetch).toHaveBeenCalledWith('/api/comments/node-1/read', {
                method: 'POST',
                headers: { 'x-user-id': 'user-1' },
            });
        });

        it('should throw on error', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

            await expect(markCommentsAsRead('node-1', 'user-1')).rejects.toThrow();
        });
    });

    describe('downloadAttachment', () => {
        it('should download attachment', async () => {
            const mockBlob = new Blob(['test'], { type: 'text/plain' });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                blob: async () => mockBlob,
            });

            const result = await downloadAttachment('/api/files/123', 'user-1');

            expect(mockFetch).toHaveBeenCalledWith('/api/files/123', {
                headers: { 'x-user-id': 'user-1' },
            });
            expect(result).toEqual(mockBlob);
        });

        it('should throw on download error', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

            await expect(downloadAttachment('/api/files/invalid', 'user-1')).rejects.toThrow(
                'Download failed: 404'
            );
        });
    });
});
