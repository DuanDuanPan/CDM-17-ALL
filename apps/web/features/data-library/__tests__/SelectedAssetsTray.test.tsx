import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GraphProvider } from '@/contexts';
import type { DataAssetFormat } from '@cdm/types';
import { DataLibraryBindingProvider, useDataLibraryBinding } from '../contexts';
import { SelectedAssetsTray } from '../components/binding/SelectedAssetsTray';
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

function Harness({ onCloseDrawer }: { onCloseDrawer: () => void }) {
  const { openForBinding, toggleAssetSelection } = useDataLibraryBinding();
  return (
    <div>
      <button type="button" onClick={() => openForBinding({ nodeId: 'node-1' })}>
        open
      </button>
      <button
        type="button"
        onClick={() =>
          toggleAssetSelection({
            id: 'asset-1',
            name: 'Asset 1',
            format: 'PDF' as DataAssetFormat,
          })
        }
      >
        select-asset-1
      </button>
      <SelectedAssetsTray onCloseDrawer={onCloseDrawer} />
    </div>
  );
}

describe('SelectedAssetsTray', () => {
  const createNodeAssetLinksBatchMock = vi.mocked(createNodeAssetLinksBatch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('binds selected assets and closes drawer on success', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const onCloseDrawer = vi.fn();
    createNodeAssetLinksBatchMock.mockResolvedValueOnce({ created: 1, skipped: 0 });

    const graphMock = {
      on: vi.fn(),
      off: vi.fn(),
      getCellById: (id: string) => (id === 'node-1' ? { id, isNode: () => true } : null),
    } as any;

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          GraphProvider,
          { graph: graphMock, graphId: 'graph-1' },
          createElement(DataLibraryBindingProvider, null, createElement(Harness, { onCloseDrawer }))
        )
      )
    );

    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('selected-assets-tray')).toBeDefined();

    const confirmButton = screen.getByTestId('tray-confirm') as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: 'select-asset-1' }));
    await waitFor(() => expect((screen.getByTestId('tray-confirm') as HTMLButtonElement).disabled).toBe(false));

    await user.click(screen.getByTestId('tray-confirm'));

    await waitFor(() => expect(createNodeAssetLinksBatchMock).toHaveBeenCalledTimes(1));
    expect(createNodeAssetLinksBatchMock).toHaveBeenCalledWith({
      nodeId: 'node-1',
      assetIds: ['asset-1'],
      linkType: 'reference',
    });

    await waitFor(() => expect(onCloseDrawer).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByTestId('selected-assets-tray')).toBeNull());
  });

  it('keeps selection for retry on failure', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const onCloseDrawer = vi.fn();
    createNodeAssetLinksBatchMock.mockRejectedValueOnce(new Error('boom'));

    const graphMock = {
      on: vi.fn(),
      off: vi.fn(),
      getCellById: (id: string) => (id === 'node-1' ? { id, isNode: () => true } : null),
    } as any;

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          GraphProvider,
          { graph: graphMock, graphId: 'graph-1' },
          createElement(DataLibraryBindingProvider, null, createElement(Harness, { onCloseDrawer }))
        )
      )
    );

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'select-asset-1' }));

    await user.click(screen.getByTestId('tray-confirm'));

    await waitFor(() => expect(createNodeAssetLinksBatchMock).toHaveBeenCalledTimes(1));
    expect(onCloseDrawer).not.toHaveBeenCalled();
    expect(screen.getByTestId('selected-assets-tray')).toBeDefined();
    expect(screen.getByTestId('tray-confirm')).toBeDefined();
  });

  it('defaults to reference link type', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const onCloseDrawer = vi.fn();
    createNodeAssetLinksBatchMock.mockResolvedValueOnce({ created: 1, skipped: 0 });

    const graphMock = {
      on: vi.fn(),
      off: vi.fn(),
      getCellById: (id: string) => (id === 'node-1' ? { id, isNode: () => true } : null),
    } as any;

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          GraphProvider,
          { graph: graphMock, graphId: 'graph-1' },
          createElement(DataLibraryBindingProvider, null, createElement(Harness, { onCloseDrawer }))
        )
      )
    );

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'select-asset-1' }));

    // Verify reference is selected by default
    const referenceButton = screen.getByTestId('link-type-reference');
    expect(referenceButton.getAttribute('aria-checked')).toBe('true');

    await user.click(screen.getByTestId('tray-confirm'));

    await waitFor(() => expect(createNodeAssetLinksBatchMock).toHaveBeenCalledWith({
      nodeId: 'node-1',
      assetIds: ['asset-1'],
      linkType: 'reference',
    }));
  });

  it('allows selecting input link type before binding', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const onCloseDrawer = vi.fn();
    createNodeAssetLinksBatchMock.mockResolvedValueOnce({ created: 1, skipped: 0 });

    const graphMock = {
      on: vi.fn(),
      off: vi.fn(),
      getCellById: (id: string) => (id === 'node-1' ? { id, isNode: () => true } : null),
    } as any;

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          GraphProvider,
          { graph: graphMock, graphId: 'graph-1' },
          createElement(DataLibraryBindingProvider, null, createElement(Harness, { onCloseDrawer }))
        )
      )
    );

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'select-asset-1' }));

    // Switch to input type
    await user.click(screen.getByTestId('link-type-input'));
    expect(screen.getByTestId('link-type-input').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('link-type-reference').getAttribute('aria-checked')).toBe('false');

    await user.click(screen.getByTestId('tray-confirm'));

    await waitFor(() => expect(createNodeAssetLinksBatchMock).toHaveBeenCalledWith({
      nodeId: 'node-1',
      assetIds: ['asset-1'],
      linkType: 'input',
    }));
  });

  it('allows selecting output link type before binding', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const onCloseDrawer = vi.fn();
    createNodeAssetLinksBatchMock.mockResolvedValueOnce({ created: 1, skipped: 0 });

    const graphMock = {
      on: vi.fn(),
      off: vi.fn(),
      getCellById: (id: string) => (id === 'node-1' ? { id, isNode: () => true } : null),
    } as any;

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          GraphProvider,
          { graph: graphMock, graphId: 'graph-1' },
          createElement(DataLibraryBindingProvider, null, createElement(Harness, { onCloseDrawer }))
        )
      )
    );

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'select-asset-1' }));

    // Switch to output type
    await user.click(screen.getByTestId('link-type-output'));
    expect(screen.getByTestId('link-type-output').getAttribute('aria-checked')).toBe('true');

    await user.click(screen.getByTestId('tray-confirm'));

    await waitFor(() => expect(createNodeAssetLinksBatchMock).toHaveBeenCalledWith({
      nodeId: 'node-1',
      assetIds: ['asset-1'],
      linkType: 'output',
    }));
  });
});

