import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GraphProvider } from '@/contexts/GraphContext';
import { LinkAssetDialog } from '@/features/data-library/components/LinkAssetDialog';
import { createNodeAssetLink, fetchNodeAssetLinks } from '@/features/data-library/api/data-assets';
import { NodeType } from '@cdm/types';

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

function renderDialog(options: { onClose?: () => void; onSuccess?: () => void } = {}) {
  const queryClient = createTestQueryClient();

  const graph = {
    getNodes: () => [
      {
        id: 'node-task',
        getData: () => ({ nodeType: NodeType.TASK, label: 'Task A' }),
      },
      {
        id: 'node-data',
        getData: () => ({ nodeType: NodeType.DATA, label: 'Data B' }),
      },
      {
        id: 'node-pbs',
        getData: () => ({ nodeType: NodeType.PBS, label: 'PBS C' }),
      },
    ],
  } as any;

  return render(
    <QueryClientProvider client={queryClient}>
      <GraphProvider graph={graph} graphId="graph-1">
        <LinkAssetDialog
          assetId="asset-1"
          assetName="Test.step"
          onClose={options.onClose || vi.fn()}
          onSuccess={options.onSuccess}
        />
      </GraphProvider>
    </QueryClientProvider>
  );
}

describe('LinkAssetDialog', () => {
  const createNodeAssetLinkMock = vi.mocked(createNodeAssetLink);
  const fetchNodeAssetLinksMock = vi.mocked(fetchNodeAssetLinks);

  beforeEach(() => {
    vi.clearAllMocks();
    fetchNodeAssetLinksMock.mockResolvedValue({ links: [] } as never);
  });

  it('renders node selector', () => {
    const { getByTestId } = renderDialog();
    expect(getByTestId('node-selector')).toBeTruthy();
  });

  it('renders link type buttons', () => {
    const { getByRole } = renderDialog();
    expect(getByRole('button', { name: '输入 (Input)' })).toBeTruthy();
    expect(getByRole('button', { name: '参考 (Reference)' })).toBeTruthy();
    expect(getByRole('button', { name: '输出 (Output)' })).toBeTruthy();
  });

  it('disables confirm button when no node selected', () => {
    const { getByRole } = renderDialog();
    const confirm = getByRole('button', { name: '确认' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it('links selected node with selected link type and closes', async () => {
    createNodeAssetLinkMock.mockResolvedValue({
      success: true,
      link: { id: 'link-1', nodeId: 'node-task', assetId: 'asset-1', linkType: 'input', createdAt: new Date().toISOString() },
    } as never);

    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    const { getByRole, queryByText } = renderDialog({ onClose, onSuccess });

    // PBS node should not be selectable
    expect(queryByText('PBS C')).toBeNull();

    // Select node
    await user.click(getByRole('button', { name: /Task A/ }));

    // Select link type
    await user.click(getByRole('button', { name: '输入 (Input)' }));

    // Confirm
    await user.click(getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(createNodeAssetLinkMock).toHaveBeenCalledWith({
        nodeId: 'node-task',
        assetId: 'asset-1',
        linkType: 'input',
        note: undefined,
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('closes dialog on cancel', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { getByRole } = renderDialog({ onClose });

    await user.click(getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during linking', async () => {
    let resolveLink: ((value: unknown) => void) | null = null;
    createNodeAssetLinkMock.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveLink = resolve;
      }) as never;
    });

    const user = userEvent.setup();
    const { getByRole } = renderDialog();

    await user.click(getByRole('button', { name: /Task A/ }));
    await user.click(getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(getByRole('button', { name: /关联中/ })).toBeTruthy();
    });

    resolveLink?.({ success: true, link: { id: 'link-1', nodeId: 'node-task', assetId: 'asset-1', linkType: 'reference', createdAt: new Date().toISOString() } });

    await waitFor(() => {
      expect(getByRole('button', { name: '确认' })).toBeTruthy();
    });
  });
});
