import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataAsset } from '@cdm/types';
import { useDataUpload } from '@/features/data-library/hooks/useDataUpload';
import { uploadDataAsset } from '@/features/data-library/api/data-assets';

vi.mock('@/features/data-library/api/data-assets', () => ({
  uploadDataAsset: vi.fn(),
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

function createTestAsset(overrides?: Partial<DataAsset>): DataAsset {
  return {
    id: 'asset-1',
    name: 'Test.step',
    description: null,
    format: 'STEP',
    fileSize: 123,
    storagePath: '/api/files/file-1',
    thumbnail: null,
    version: 'v1.0.0',
    tags: [],
    graphId: 'graph-1',
    folderId: null,
    creatorId: null,
    secretLevel: 'internal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(overrides || {}),
  };
}

describe('useDataUpload', () => {
  const uploadDataAssetMock = vi.mocked(uploadDataAsset);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle state', () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useDataUpload({ graphId: 'graph-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('sets isUploading to true during upload', async () => {
    let resolveUpload: ((value: { success: boolean; asset: DataAsset }) => void) | null = null;
    uploadDataAssetMock.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveUpload = resolve as unknown as typeof resolveUpload;
      }) as unknown as ReturnType<typeof uploadDataAsset>;
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useDataUpload({ graphId: 'graph-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    const file = new File(['hello'], 'Test.step', { type: 'application/octet-stream' });

    act(() => {
      void result.current.upload(file);
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(true);
    });

    resolveUpload?.({ success: true, asset: createTestAsset() });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
  });

  it('returns asset data on success', async () => {
    const asset = createTestAsset();
    uploadDataAssetMock.mockResolvedValue({ success: true, asset } as never);

    const onSuccess = vi.fn();
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useDataUpload({ graphId: 'graph-1', onSuccess }),
      { wrapper: createWrapper(queryClient) }
    );

    const file = new File(['hello'], 'Test.step', { type: 'application/octet-stream' });

    let returned: DataAsset | null = null;
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(returned).toEqual(asset);
    expect(onSuccess).toHaveBeenCalledWith(asset);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['data-assets', 'graph-1'] });
  });

  it('returns error on failure', async () => {
    uploadDataAssetMock.mockRejectedValue(new Error('boom'));

    const onError = vi.fn();
    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useDataUpload({ graphId: 'graph-1', onError }),
      { wrapper: createWrapper(queryClient) }
    );

    const file = new File(['hello'], 'Test.step', { type: 'application/octet-stream' });

    let returned: DataAsset | null = createTestAsset();
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(returned).toBe(null);
    expect(result.current.error).toBe('boom');
    expect(onError).toHaveBeenCalledWith('boom');
  });

  it('handles multiple file upload sequentially', async () => {
    uploadDataAssetMock.mockResolvedValue({ success: true, asset: createTestAsset() } as never);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useDataUpload({ graphId: 'graph-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    const fileA = new File(['a'], 'A.step', { type: 'application/octet-stream' });
    const fileB = new File(['b'], 'B.step', { type: 'application/octet-stream' });

    await act(async () => {
      await result.current.upload(fileA);
      await result.current.upload(fileB);
    });

    expect(uploadDataAssetMock).toHaveBeenCalledTimes(2);
    expect(uploadDataAssetMock).toHaveBeenNthCalledWith(1, fileA, 'graph-1', undefined);
    expect(uploadDataAssetMock).toHaveBeenNthCalledWith(2, fileB, 'graph-1', undefined);
    expect(result.current.isUploading).toBe(false);
  });
});

