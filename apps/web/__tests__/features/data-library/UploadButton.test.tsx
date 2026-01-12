import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataAsset } from '@cdm/types';
import { UploadButton } from '@/features/data-library/components/UploadButton';
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

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
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

describe('UploadButton', () => {
  const uploadDataAssetMock = vi.mocked(uploadDataAsset);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload button', () => {
    const { getByTestId } = renderWithClient(<UploadButton graphId="graph-1" />);
    const button = getByTestId('upload-button');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('上传');
  });

  it('opens file dialog on click', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    const { getByTestId } = renderWithClient(<UploadButton graphId="graph-1" />);
    await fireEvent.click(getByTestId('upload-button'));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('shows loading state during upload', async () => {
    let resolveUpload: ((value: { success: boolean; asset: ReturnType<typeof createTestAsset> }) => void) | null = null;

    uploadDataAssetMock.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveUpload = resolve as unknown as typeof resolveUpload;
      }) as unknown as ReturnType<typeof uploadDataAsset>;
    });

    const onUploadComplete = vi.fn();
    const { getByTestId } = renderWithClient(
      <UploadButton graphId="graph-1" onUploadComplete={onUploadComplete} />
    );

    const input = getByTestId('file-input') as HTMLInputElement;
    const file = new File(['hello'], 'Test.step', { type: 'application/octet-stream' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(getByTestId('upload-button')).toHaveProperty('disabled', true);
      expect(getByTestId('upload-button').textContent).toContain('上传中');
    });

    resolveUpload?.({ success: true, asset: createTestAsset() });

    await waitFor(() => {
      expect(getByTestId('upload-button')).toHaveProperty('disabled', false);
    });
  });

  it('calls onUploadComplete when upload succeeds', async () => {
    uploadDataAssetMock.mockResolvedValue({ success: true, asset: createTestAsset() } as never);

    const onUploadComplete = vi.fn();
    const { getByTestId } = renderWithClient(
      <UploadButton graphId="graph-1" onUploadComplete={onUploadComplete} />
    );

    const input = getByTestId('file-input') as HTMLInputElement;
    const file = new File(['hello'], 'Test.step', { type: 'application/octet-stream' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadDataAssetMock).toHaveBeenCalledWith(file, 'graph-1', undefined);
      expect(onUploadComplete).toHaveBeenCalledTimes(1);
    });
  });
});
