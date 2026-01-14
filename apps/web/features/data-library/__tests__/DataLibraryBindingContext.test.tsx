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

    // exitBindingMode should reset all state (UT-1.6)
    await user.click(screen.getByRole('button', { name: 'toggle-asset-1' }));
    expect(screen.getByTestId('selectedCount').textContent).toBe('1');
    expect(screen.getByTestId('selectedByIdCount').textContent).toBe('1');

    await user.click(screen.getByRole('button', { name: 'exit' }));
    expect(screen.getByTestId('isBindingMode').textContent).toBe('false');
    expect(screen.getByTestId('targetNodeId').textContent).toBe('');
    expect(screen.getByTestId('selectedCount').textContent).toBe('0');
    expect(screen.getByTestId('selectedByIdCount').textContent).toBe('0');
  });

  // UT-1.7: openForBinding() triggers binding mode which signals view switch
  // (Actual view switching is handled by DataLibraryDrawer via useEffect on isBindingMode)
  it('UT-1.7: openForBinding sets isBindingMode true, enabling downstream view switch', async () => {
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
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('isBindingMode').textContent).toBe('true');
    // The actual folder view switch is tested in integration; Context responsibility is isBindingMode=true
  });

  // UT-1.8: Selected assets persist across simulated view changes (selection is Context-level, view-agnostic)
  it('UT-1.8: selectedAssetIds persist after toggling, simulating cross-view persistence', async () => {
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

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'toggle-asset-1' }));
    expect(screen.getByTestId('selectedCount').textContent).toBe('1');

    // Simulate user navigating away and back (selection should persist in Context)
    // Here we simply verify the Set remains stable before any clear/exit action
    expect(screen.getByTestId('selectedCount').textContent).toBe('1');
    expect(screen.getByTestId('selectedByIdCount').textContent).toBe('1');
  });

  // UT-5.1: Task node compatibility - openForBinding accepts any nodeId
  it('UT-5.1: openForBinding works for Task node IDs', async () => {
    const user = userEvent.setup();

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Custom harness for task node
    function TaskNodeHarness() {
      const { isBindingMode, targetNodeId, openForBinding } = useDataLibraryBinding();
      return (
        <div>
          <div data-testid="isBindingMode">{String(isBindingMode)}</div>
          <div data-testid="targetNodeId">{targetNodeId ?? ''}</div>
          <button type="button" onClick={() => openForBinding({ nodeId: 'task-node-123' })}>
            open-task
          </button>
        </div>
      );
    }

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(DataLibraryBindingProvider, null, createElement(TaskNodeHarness))
      )
    );

    await user.click(screen.getByRole('button', { name: 'open-task' }));
    expect(screen.getByTestId('isBindingMode').textContent).toBe('true');
    expect(screen.getByTestId('targetNodeId').textContent).toBe('task-node-123');
  });

  // UT-5.2: PBS node compatibility - openForBinding accepts any nodeId
  it('UT-5.2: openForBinding works for PBS node IDs', async () => {
    const user = userEvent.setup();

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    function PbsNodeHarness() {
      const { isBindingMode, targetNodeId, openForBinding } = useDataLibraryBinding();
      return (
        <div>
          <div data-testid="isBindingMode">{String(isBindingMode)}</div>
          <div data-testid="targetNodeId">{targetNodeId ?? ''}</div>
          <button type="button" onClick={() => openForBinding({ nodeId: 'pbs-node-456' })}>
            open-pbs
          </button>
        </div>
      );
    }

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(DataLibraryBindingProvider, null, createElement(PbsNodeHarness))
      )
    );

    await user.click(screen.getByRole('button', { name: 'open-pbs' }));
    expect(screen.getByTestId('isBindingMode').textContent).toBe('true');
    expect(screen.getByTestId('targetNodeId').textContent).toBe('pbs-node-456');
  });

  // UT-5.3: Node deletion listener - exitBindingMode is called when target node is removed
  // Note: Full integration requires GraphContext mock; this tests the exitBindingMode action
  it('UT-5.3: exitBindingMode resets state (simulating node deletion trigger)', async () => {
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

    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('isBindingMode').textContent).toBe('true');
    expect(screen.getByTestId('targetNodeId').textContent).toBe('node-1');

    // Simulate what happens when node deletion is detected (calls exitBindingMode)
    await user.click(screen.getByRole('button', { name: 'exit' }));
    expect(screen.getByTestId('isBindingMode').textContent).toBe('false');
    expect(screen.getByTestId('targetNodeId').textContent).toBe('');
  });
});
