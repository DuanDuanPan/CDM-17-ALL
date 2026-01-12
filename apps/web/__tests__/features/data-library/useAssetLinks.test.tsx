import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssetLinks } from '@/features/data-library/hooks/useAssetLinks';
import {
  fetchNodeAssetLinks,
  createNodeAssetLink,
  deleteNodeAssetLink,
} from '@/features/data-library/api/data-assets';

vi.mock('@/features/data-library/api/data-assets', () => ({
  fetchNodeAssetLinks: vi.fn(),
  createNodeAssetLink: vi.fn(),
  deleteNodeAssetLink: vi.fn(),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAssetLinks', () => {
  const fetchNodeAssetLinksMock = vi.mocked(fetchNodeAssetLinks);
  const createNodeAssetLinkMock = vi.mocked(createNodeAssetLink);
  const deleteNodeAssetLinkMock = vi.mocked(deleteNodeAssetLink);

  beforeEach(() => {
    vi.clearAllMocks();
    fetchNodeAssetLinksMock.mockResolvedValue({ links: [] } as never);
  });

  it('initializes with idle state', () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useAssetLinks({ nodeId: 'node-1', enabled: false }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isLinking).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.links).toEqual([]);
  });

  it('linkAsset creates association successfully', async () => {
    createNodeAssetLinkMock.mockResolvedValue({ success: true } as never);

    const onLinkSuccess = vi.fn();
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useAssetLinks({ nodeId: 'node-1', enabled: false, onLinkSuccess }),
      { wrapper: createWrapper(queryClient) }
    );

    let ok = false;
    await act(async () => {
      ok = await result.current.linkAsset('asset-1', 'input');
    });

    expect(ok).toBe(true);
    expect(createNodeAssetLinkMock).toHaveBeenCalledWith({
      nodeId: 'node-1',
      assetId: 'asset-1',
      linkType: 'input',
      note: undefined,
    });
    expect(onLinkSuccess).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['node-asset-links', 'node-1'] });
  });

  it('linkAsset handles API error', async () => {
    createNodeAssetLinkMock.mockRejectedValue(new Error('boom'));

    const onError = vi.fn();
    const queryClient = createTestQueryClient();

    const { result } = renderHook(
      () => useAssetLinks({ nodeId: 'node-1', enabled: false, onError }),
      { wrapper: createWrapper(queryClient) }
    );

    let ok = true;
    await act(async () => {
      ok = await result.current.linkAsset('asset-1', 'reference');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('boom');
    expect(onError).toHaveBeenCalledWith('boom');
  });

  it('unlinkAsset removes association successfully', async () => {
    deleteNodeAssetLinkMock.mockResolvedValue({ success: true } as never);

    const onUnlinkSuccess = vi.fn();
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useAssetLinks({ nodeId: 'node-1', enabled: false, onUnlinkSuccess }),
      { wrapper: createWrapper(queryClient) }
    );

    let ok = false;
    await act(async () => {
      ok = await result.current.unlinkAsset('asset-1');
    });

    expect(ok).toBe(true);
    expect(deleteNodeAssetLinkMock).toHaveBeenCalledWith('node-1', 'asset-1');
    expect(onUnlinkSuccess).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['node-asset-links', 'node-1'] });
  });

  it('sets isLinking to true during operation', async () => {
    let resolveLink: ((value: unknown) => void) | null = null;
    createNodeAssetLinkMock.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveLink = resolve;
      }) as never;
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useAssetLinks({ nodeId: 'node-1', enabled: false }),
      { wrapper: createWrapper(queryClient) }
    );

    act(() => {
      void result.current.linkAsset('asset-1', 'reference');
    });

    await waitFor(() => {
      expect(result.current.isLinking).toBe(true);
    });

    resolveLink?.({ success: true });

    await waitFor(() => {
      expect(result.current.isLinking).toBe(false);
    });
  });
});

