import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataAssetFormat } from '@cdm/types';
import { DataLibraryBindingProvider, useDataLibraryBinding } from '../contexts';

function Harness() {
  const {
    isBindingMode,
    targetNodeId,
    selectedAssetIds,
    selectedAssetsById,
    openForBinding,
    toggleAssetSelection,
    removeAsset,
    clearSelection,
    exitBindingMode,
  } = useDataLibraryBinding();

  return (
    <div>
      <div data-testid="isBindingMode">{String(isBindingMode)}</div>
      <div data-testid="targetNodeId">{targetNodeId ?? ''}</div>
      <div data-testid="selectedCount">{String(selectedAssetIds.size)}</div>
      <div data-testid="selectedByIdCount">{String(selectedAssetsById.size)}</div>

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
        toggle-asset-1
      </button>
      <button type="button" onClick={() => removeAsset('asset-1')}>
        remove-asset-1
      </button>
      <button type="button" onClick={() => clearSelection()}>
        clear
      </button>
      <button type="button" onClick={() => exitBindingMode()}>
        exit
      </button>
    </div>
  );
}

describe('DataLibraryBindingContext', () => {
  it('manages binding mode + selection state', async () => {
    const user = userEvent.setup();

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(DataLibraryBindingProvider, null, createElement(Harness))
      )
    );

    expect(screen.getByTestId('isBindingMode').textContent).toBe('false');
    expect(screen.getByTestId('targetNodeId').textContent).toBe('');
    expect(screen.getByTestId('selectedCount').textContent).toBe('0');

    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('isBindingMode').textContent).toBe('true');
    expect(screen.getByTestId('targetNodeId').textContent).toBe('node-1');

    await user.click(screen.getByRole('button', { name: 'toggle-asset-1' }));
    expect(screen.getByTestId('selectedCount').textContent).toBe('1');
    expect(screen.getByTestId('selectedByIdCount').textContent).toBe('1');

    await user.click(screen.getByRole('button', { name: 'toggle-asset-1' }));
    expect(screen.getByTestId('selectedCount').textContent).toBe('0');
    expect(screen.getByTestId('selectedByIdCount').textContent).toBe('0');

    await user.click(screen.getByRole('button', { name: 'toggle-asset-1' }));
    await user.click(screen.getByRole('button', { name: 'remove-asset-1' }));
    expect(screen.getByTestId('selectedCount').textContent).toBe('0');
    expect(screen.getByTestId('selectedByIdCount').textContent).toBe('0');

    await user.click(screen.getByRole('button', { name: 'toggle-asset-1' }));
    await user.click(screen.getByRole('button', { name: 'clear' }));
    expect(screen.getByTestId('selectedCount').textContent).toBe('0');
    expect(screen.getByTestId('selectedByIdCount').textContent).toBe('0');

    await user.click(screen.getByRole('button', { name: 'exit' }));
    expect(screen.getByTestId('isBindingMode').textContent).toBe('false');
    expect(screen.getByTestId('targetNodeId').textContent).toBe('');
  });
});
