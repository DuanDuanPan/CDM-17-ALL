import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBatchAssetBinding } from '../hooks/useBatchAssetBinding';
import { createNodeAssetLinksBatch } from '../api/data-assets';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('../api/data-assets', async () => {
  const actual = await vi.importActual<typeof import('../api/data-assets')>('../api/data-assets');
  return {
    ...actual,
    createNodeAssetLinksBatch: vi.fn(),
  };
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useBatchAssetBinding', () => {
  const createNodeAssetLinksBatchMock = vi.mocked(createNodeAssetLinksBatch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bindAssets calls batch endpoint and invalidates node links query', async () => {
    createNodeAssetLinksBatchMock.mockResolvedValueOnce({ created: 2, skipped: 1 });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBatchAssetBinding(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.bindAssets({
        nodeId: 'node-1',
        assetIds: ['asset-1', 'asset-2'],
        linkType: 'reference',
      });
    });

    expect(createNodeAssetLinksBatchMock).toHaveBeenCalledWith({
      nodeId: 'node-1',
      assetIds: ['asset-1', 'asset-2'],
      linkType: 'reference',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['node-asset-links', 'node-1'] });
  });

  it('shows error toast on failure', async () => {
    createNodeAssetLinksBatchMock.mockRejectedValueOnce(new Error('boom'));

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBatchAssetBinding(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.bindAssets({
          nodeId: 'node-1',
          assetIds: ['asset-1'],
        })
      ).rejects.toThrow('boom');
    });
  });
});
