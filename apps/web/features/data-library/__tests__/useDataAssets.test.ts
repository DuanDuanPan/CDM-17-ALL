/**
 * Story 9.1: Data Library - useDataAssets Hook Tests
 * Tests the TanStack Query-based data fetching hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useDataAssets } from '../hooks/useDataAssets';
import * as apiModule from '../api/data-assets';
import type { DataAssetListResponse, DataAssetWithFolder } from '@cdm/types';

// Mock the API module
vi.mock('../api/data-assets', () => ({
  fetchDataAssets: vi.fn(),
}));

// Create wrapper with fresh QueryClient for each test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

// Mock data
const mockAsset: DataAssetWithFolder = {
  id: 'asset-1',
  name: 'Satellite CAD Model',
  description: null,
  format: 'STEP',
  fileSize: 1024000,
  storagePath: '/cad/satellite-model.step',
  thumbnail: null,
  version: 'v1.0.0',
  graphId: 'graph-1',
  folderId: 'folder-1',
  creatorId: null,
  secretLevel: 'internal',
  folder: {
    id: 'folder-1',
    name: 'CAD Models',
    description: null,
    graphId: 'graph-1',
    parentId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  tags: ['satellite', 'structural'],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockResponse: DataAssetListResponse = {
  assets: [mockAsset],
  total: 1,
  page: 1,
  pageSize: 50,
  totalPages: 1,
};

describe('useDataAssets', () => {
  const mockFetchDataAssets = vi.mocked(apiModule.fetchDataAssets);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('basic functionality', () => {
    it('should fetch assets when enabled', async () => {
      mockFetchDataAssets.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () => useDataAssets({ graphId: 'graph-1' }),
        { wrapper: createWrapper() }
      );

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.assets).toEqual([mockAsset]);
      expect(result.current.total).toBe(1);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when disabled', async () => {
      const { result } = renderHook(
        () => useDataAssets({ graphId: 'graph-1', enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.assets).toEqual([]);
      expect(mockFetchDataAssets).not.toHaveBeenCalled();
    });

    it('should not fetch when graphId is empty', async () => {
      const { result } = renderHook(
        () => useDataAssets({ graphId: '' }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.assets).toEqual([]);
      expect(mockFetchDataAssets).not.toHaveBeenCalled();
    });
  });

  describe('filtering', () => {
    it('should include search parameter in query', async () => {
      mockFetchDataAssets.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () => useDataAssets({ graphId: 'graph-1', search: 'satellite' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchDataAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          graphId: 'graph-1',
          search: 'satellite',
        })
      );
    });

    it('should include format filter in query', async () => {
      mockFetchDataAssets.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () => useDataAssets({ graphId: 'graph-1', format: 'STEP' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchDataAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          graphId: 'graph-1',
          format: 'STEP',
        })
      );
    });

    it('should include folderId filter in query', async () => {
      mockFetchDataAssets.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () => useDataAssets({ graphId: 'graph-1', folderId: 'folder-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchDataAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          graphId: 'graph-1',
          folderId: 'folder-1',
        })
      );
    });
  });

  describe('pagination', () => {
    it('should include pagination parameters in query', async () => {
      mockFetchDataAssets.mockResolvedValueOnce({
        ...mockResponse,
        page: 2,
        totalPages: 5,
      });

      const { result } = renderHook(
        () => useDataAssets({ graphId: 'graph-1', page: 2, pageSize: 20 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchDataAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          graphId: 'graph-1',
          page: 2,
          pageSize: 20,
        })
      );
      expect(result.current.page).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle fetch error', async () => {
      mockFetchDataAssets.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () => useDataAssets({ graphId: 'graph-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.assets).toEqual([]);
    });
  });

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      mockFetchDataAssets.mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useDataAssets({ graphId: 'graph-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
