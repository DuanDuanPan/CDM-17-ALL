import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataAssetWithFolder, NodeDataLinkWithAsset } from '@cdm/types';
import { LinkedAssetsSection } from '@/components/PropertyPanel/LinkedAssetsSection';
import {
  fetchNodeAssetLinks,
  deleteNodeAssetLink,
  createNodeAssetLink,
} from '@/features/data-library/api/data-assets';

const addToastMock = vi.fn();

vi.mock('@cdm/ui', async () => {
  const actual = await vi.importActual<typeof import('@cdm/ui')>('@cdm/ui');
  return {
    ...actual,
    useToast: () => ({ toasts: [], addToast: addToastMock, removeToast: vi.fn() }),
  };
});

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

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function createAsset(overrides?: Partial<DataAssetWithFolder>): DataAssetWithFolder {
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
    folder: null,
    ...(overrides || {}),
  };
}

function createLink(overrides?: Partial<NodeDataLinkWithAsset>): NodeDataLinkWithAsset {
  return {
    id: 'link-1',
    nodeId: 'node-1',
    assetId: 'asset-1',
    linkType: 'reference',
    note: null,
    createdAt: new Date().toISOString(),
    asset: createAsset(),
    ...(overrides || {}),
  };
}

describe('LinkedAssetsSection', () => {
  const fetchNodeAssetLinksMock = vi.mocked(fetchNodeAssetLinks);
  const deleteNodeAssetLinkMock = vi.mocked(deleteNodeAssetLink);
  const createNodeAssetLinkMock = vi.mocked(createNodeAssetLink);

  beforeEach(() => {
    vi.clearAllMocks();
    addToastMock.mockClear();
    createNodeAssetLinkMock.mockResolvedValue({ success: true } as never);
  });

  it('renders linked assets list', async () => {
    fetchNodeAssetLinksMock.mockResolvedValueOnce({
      links: [
        createLink({
          id: 'link-a',
          assetId: 'asset-a',
          linkType: 'input',
          asset: createAsset({ id: 'asset-a', name: 'A.step', format: 'STEP' }),
        }),
      ],
    } as never);

    const { findByText } = renderWithClient(<LinkedAssetsSection nodeId="node-1" />);
    expect(await findByText('A.step')).toBeTruthy();
  });

  it('shows asset name and format', async () => {
    fetchNodeAssetLinksMock.mockResolvedValueOnce({
      links: [
        createLink({
          id: 'link-a',
          assetId: 'asset-a',
          asset: createAsset({ id: 'asset-a', name: 'A.step', format: 'STEP' }),
        }),
      ],
    } as never);

    const { findByText } = renderWithClient(<LinkedAssetsSection nodeId="node-1" />);

    expect(await findByText('A.step')).toBeTruthy();
    expect(await findByText('STEP')).toBeTruthy();
  });

  it('shows link type badge (INPUT/OUTPUT/REFERENCE)', async () => {
    fetchNodeAssetLinksMock.mockResolvedValueOnce({
      links: [
        createLink({
          id: 'link-in',
          assetId: 'asset-in',
          linkType: 'input',
          asset: createAsset({ id: 'asset-in', name: 'In.step', format: 'STEP' }),
        }),
        createLink({
          id: 'link-ref',
          assetId: 'asset-ref',
          linkType: 'reference',
          asset: createAsset({ id: 'asset-ref', name: 'Ref.pdf', format: 'PDF' }),
        }),
      ],
    } as never);

    const { findByText, getAllByTestId } = renderWithClient(<LinkedAssetsSection nodeId="node-1" />);

    await findByText('In.step');
    await findByText('Ref.pdf');

    const badges = getAllByTestId('link-type-badge').map((el) => el.textContent);
    expect(badges).toContain('INPUT');
    expect(badges).toContain('REFERENCE');
  });

  it('calls onPreview when preview button clicked', async () => {
    const link = createLink({
      id: 'link-a',
      assetId: 'asset-a',
      linkType: 'reference',
      asset: createAsset({ id: 'asset-a', name: 'A.step', format: 'STEP' }),
    });

    fetchNodeAssetLinksMock.mockResolvedValueOnce({ links: [link] } as never);

    const onPreview = vi.fn();
    const user = userEvent.setup();

    const { findByText, getByTestId } = renderWithClient(
      <LinkedAssetsSection nodeId="node-1" onPreview={onPreview} />
    );

    await findByText('A.step');

    await user.click(getByTestId('asset-preview-button'));
    expect(onPreview).toHaveBeenCalledWith(link);
  });

  it('calls unlink API when unlink button clicked', async () => {
    const linkA = createLink({
      id: 'link-a',
      nodeId: 'node-1',
      assetId: 'asset-a',
      linkType: 'reference',
      asset: createAsset({ id: 'asset-a', name: 'A.step', format: 'STEP' }),
    });

    const linkB = createLink({
      id: 'link-b',
      nodeId: 'node-1',
      assetId: 'asset-b',
      linkType: 'output',
      asset: createAsset({ id: 'asset-b', name: 'B.pdf', format: 'PDF' }),
    });

    fetchNodeAssetLinksMock
      .mockResolvedValueOnce({ links: [linkA, linkB] } as never)
      .mockResolvedValueOnce({ links: [linkB] } as never);

    deleteNodeAssetLinkMock.mockResolvedValue({ success: true } as never);

    const user = userEvent.setup();

    const { findByText, getAllByTestId, queryByText } = renderWithClient(
      <LinkedAssetsSection nodeId="node-1" />
    );

    await findByText('A.step');
    await findByText('B.pdf');

    const unlinkButtons = getAllByTestId('asset-unlink-button');
    const unlinkA = unlinkButtons[0]!;

    await user.click(unlinkA);

    await waitFor(() => {
      expect(deleteNodeAssetLinkMock).toHaveBeenCalledWith('node-1', 'asset-a');
    });

    await waitFor(() => {
      expect(queryByText('A.step')).toBeNull();
      expect(queryByText('B.pdf')).toBeTruthy();
    });
  });
});
