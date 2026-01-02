/**
 * Story 5.1: Template Library
 * Unit tests for useTemplates hook
 * Tests template library state management and API calls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplates } from '@/hooks/useTemplates';

// Mock the API module
vi.mock('@/lib/api/templates', () => ({
    fetchTemplates: vi.fn(),
    fetchTemplateCategories: vi.fn(),
    fetchTemplate: vi.fn(),
    instantiateTemplate: vi.fn(),
}));

import {
    fetchTemplates,
    fetchTemplateCategories,
    fetchTemplate,
    instantiateTemplate,
} from '@/lib/api/templates';

describe('useTemplates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('initial state', () => {
        // TC-HOOK-1: useTemplates initializes with empty state
        it('TC-HOOK-1: initializes with empty templates and loading=false', () => {
            const { result } = renderHook(() => useTemplates());

            expect(result.current.templates).toEqual([]);
            expect(result.current.categories).toEqual([]);
            expect(result.current.selectedTemplate).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.isLoadingTemplate).toBe(false);
            expect(result.current.isInstantiating).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('loadTemplates', () => {
        // TC-HOOK-2: fetchTemplates updates templates state
        it('TC-HOOK-2: updates templates after successful fetch', async () => {
            const mockTemplates = [
                { id: '1', name: 'Template 1', description: 'Desc 1', usageCount: 10 },
                { id: '2', name: 'Template 2', description: 'Desc 2', usageCount: 5 },
            ];
            vi.mocked(fetchTemplates).mockResolvedValue(mockTemplates);

            const { result } = renderHook(() => useTemplates());

            await act(async () => {
                await result.current.loadTemplates();
            });

            expect(result.current.templates).toEqual(mockTemplates);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        // TC-HOOK-3: fetchTemplates sets error on failure
        it('TC-HOOK-3: sets error state on fetch failure', async () => {
            vi.mocked(fetchTemplates).mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useTemplates());

            await act(async () => {
                await result.current.loadTemplates();
            });

            expect(result.current.error).toBe('Network error');
            expect(result.current.templates).toEqual([]);
            expect(result.current.isLoading).toBe(false);
        });

        // TC-HOOK-4: fetchTemplates supports categoryId and search
        it('TC-HOOK-4: passes query parameters to fetch', async () => {
            vi.mocked(fetchTemplates).mockResolvedValue([]);

            const { result } = renderHook(() => useTemplates());

            await act(async () => {
                await result.current.loadTemplates({
                    categoryId: 'cat-1',
                    search: 'agile',
                });
            });

            expect(fetchTemplates).toHaveBeenCalledWith({
                categoryId: 'cat-1',
                search: 'agile',
            });
        });

        it('sets isLoading during fetch', async () => {
            let resolvePromise!: () => void;
            vi.mocked(fetchTemplates).mockImplementation(
                () => new Promise((resolve) => {
                    resolvePromise = () => resolve([]);
                })
            );

            const { result } = renderHook(() => useTemplates());

            act(() => {
                result.current.loadTemplates();
            });

            // Should be loading while promise is pending
            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolvePromise();
            });

            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('loadCategories', () => {
        it('updates categories after successful fetch', async () => {
            const mockCategories = [
                { id: 'cat-1', name: '项目管理', sortOrder: 1 },
                { id: 'cat-2', name: '技术设计', sortOrder: 2 },
            ];
            vi.mocked(fetchTemplateCategories).mockResolvedValue(mockCategories);

            const { result } = renderHook(() => useTemplates());

            await act(async () => {
                await result.current.loadCategories();
            });

            expect(result.current.categories).toEqual(mockCategories);
        });

        it('does not set error on category fetch failure (non-critical)', async () => {
            vi.mocked(fetchTemplateCategories).mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useTemplates());

            await act(async () => {
                await result.current.loadCategories();
            });

            // Categories are non-critical, so error should not be set
            expect(result.current.error).toBeNull();
        });
    });

    describe('loadTemplate', () => {
        // TC-HOOK-5: useTemplatePreview fetches template details
        it('TC-HOOK-5: fetches template details and updates selectedTemplate', async () => {
            const mockTemplate = {
                id: 'tpl-1',
                name: 'Test Template',
                status: 'PUBLISHED',
                structure: { rootNode: { label: 'Root' } },
            };
            vi.mocked(fetchTemplate).mockResolvedValue(mockTemplate);

            const { result } = renderHook(() => useTemplates());

            await act(async () => {
                await result.current.loadTemplate('tpl-1');
            });

            expect(result.current.selectedTemplate).toEqual(mockTemplate);
            expect(result.current.isLoadingTemplate).toBe(false);
        });

        it('returns the loaded template', async () => {
            const mockTemplate = {
                id: 'tpl-1',
                name: 'Test Template',
            };
            vi.mocked(fetchTemplate).mockResolvedValue(mockTemplate);

            const { result } = renderHook(() => useTemplates());

            let returnedTemplate: unknown;
            await act(async () => {
                returnedTemplate = await result.current.loadTemplate('tpl-1');
            });

            expect(returnedTemplate).toEqual(mockTemplate);
        });

        it('returns null and sets error on failure', async () => {
            vi.mocked(fetchTemplate).mockRejectedValue(new Error('Not found'));

            const { result } = renderHook(() => useTemplates());

            let returnedTemplate: unknown;
            await act(async () => {
                returnedTemplate = await result.current.loadTemplate('missing');
            });

            expect(returnedTemplate).toBeNull();
            expect(result.current.error).toBe('Not found');
        });
    });

    describe('instantiate', () => {
        // TC-HOOK-6: useInstantiateTemplate returns graphId on success
        it('TC-HOOK-6: returns graphId and graphName on successful instantiation', async () => {
            const mockResponse = {
                graphId: 'graph-123',
                graphName: 'My Graph',
                nodeCount: 5,
            };
            vi.mocked(instantiateTemplate).mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useTemplates());

            let response: unknown;
            await act(async () => {
                response = await result.current.instantiate('tpl-1', 'user-1');
            });

            expect(response).toEqual(mockResponse);
            expect(result.current.isInstantiating).toBe(false);
        });

        it('passes custom name to API', async () => {
            vi.mocked(instantiateTemplate).mockResolvedValue({
                graphId: 'graph-123',
                graphName: 'Custom Name',
                nodeCount: 3,
            });

            const { result } = renderHook(() => useTemplates());

            await act(async () => {
                await result.current.instantiate('tpl-1', 'user-1', { name: 'Custom Name' });
            });

            expect(instantiateTemplate).toHaveBeenCalledWith(
                'tpl-1',
                'user-1',
                { name: 'Custom Name' }
            );
        });

        it('sets error and throws on instantiation failure', async () => {
            vi.mocked(instantiateTemplate).mockRejectedValue(new Error('Failed to create'));

            const { result } = renderHook(() => useTemplates());

            let thrown: unknown;
            await act(async () => {
                try {
                    await result.current.instantiate('tpl-1', 'user-1');
                } catch (err) {
                    thrown = err;
                }
            });

            expect(thrown).toBeInstanceOf(Error);
            expect((thrown as Error).message).toBe('Failed to create');
            expect(result.current.error).toBe('Failed to create');
            expect(result.current.isInstantiating).toBe(false);
        });

        it('sets isInstantiating during API call', async () => {
            let resolvePromise!: () => void;
            vi.mocked(instantiateTemplate).mockImplementation(
                () => new Promise((resolve) => {
                    resolvePromise = () => resolve({
                        graphId: 'graph-123',
                        graphName: 'Test',
                        nodeCount: 1,
                    });
                })
            );

            const { result } = renderHook(() => useTemplates());

            act(() => {
                result.current.instantiate('tpl-1', 'user-1');
            });

            expect(result.current.isInstantiating).toBe(true);

            await act(async () => {
                resolvePromise();
            });

            expect(result.current.isInstantiating).toBe(false);
        });
    });

    describe('clearSelectedTemplate', () => {
        it('clears the selected template', async () => {
            const mockTemplate = { id: 'tpl-1', name: 'Test' };
            vi.mocked(fetchTemplate).mockResolvedValue(mockTemplate);

            const { result } = renderHook(() => useTemplates());

            await act(async () => {
                await result.current.loadTemplate('tpl-1');
            });

            expect(result.current.selectedTemplate).not.toBeNull();

            act(() => {
                result.current.clearSelectedTemplate();
            });

            expect(result.current.selectedTemplate).toBeNull();
        });
    });

    describe('clearError', () => {
        it('clears the error state', async () => {
            vi.mocked(fetchTemplates).mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useTemplates());

            await act(async () => {
                await result.current.loadTemplates();
            });

            expect(result.current.error).not.toBeNull();

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });
});
