import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GraphProvider } from '@/contexts';
import { DataLibraryBindingProvider, useDataLibraryBinding } from '../contexts';
import { BindingTargetBanner } from '../components/binding/BindingTargetBanner';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

function Harness() {
  const { openForBinding } = useDataLibraryBinding();
  return (
    <div>
      <button type="button" onClick={() => openForBinding({ nodeId: 'node-1' })}>
        open
      </button>
      <BindingTargetBanner />
    </div>
  );
}

describe('BindingTargetBanner', () => {
  it('renders target label and clears binding mode', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const graphMock = {
      on: vi.fn(),
      off: vi.fn(),
      getCellById: (id: string) => {
        if (id !== 'node-1') return null;
        return {
          id,
          isNode: () => true,
          getData: () => ({ label: '测试节点' }),
          getAttrs: () => ({ text: { text: '测试节点(Attrs)' } }),
        };
      },
    } as any;

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          GraphProvider,
          { graph: graphMock, graphId: 'graph-1' },
          createElement(DataLibraryBindingProvider, null, createElement(Harness))
        )
      )
    );

    expect(screen.queryByTestId('binding-target-banner')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('binding-target-banner')).toBeDefined();
    expect(screen.getByText('测试节点')).toBeDefined();

    await user.click(screen.getByTestId('binding-target-clear'));
    expect(screen.queryByTestId('binding-target-banner')).toBeNull();
  });

  // UT-2.3: Accessibility - aria-label on clear button
  it('has accessible aria-label on clear button', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const graphMock = {
      on: vi.fn(),
      off: vi.fn(),
      getCellById: (id: string) => {
        if (id !== 'node-1') return null;
        return {
          id,
          isNode: () => true,
          getData: () => ({ label: 'Node' }),
          getAttrs: () => ({}),
        };
      },
    } as any;

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          GraphProvider,
          { graph: graphMock, graphId: 'graph-1' },
          createElement(DataLibraryBindingProvider, null, createElement(Harness))
        )
      )
    );

    await user.click(screen.getByRole('button', { name: 'open' }));

    const clearButton = screen.getByTestId('binding-target-clear');
    expect(clearButton.getAttribute('aria-label')).toBe('清除选择');
    expect(screen.getByRole('banner')).toBeDefined();
  });

  // Edge case: null nodeLabel fallback to '未命名节点'
  it('falls back to 未命名节点 when node has no label', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const graphMock = {
      on: vi.fn(),
      off: vi.fn(),
      getCellById: (id: string) => {
        if (id !== 'node-1') return null;
        return {
          id,
          isNode: () => true,
          getData: () => ({}), // No label
          getAttrs: () => ({}), // No attrs.text.text
        };
      },
    } as any;

    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          GraphProvider,
          { graph: graphMock, graphId: 'graph-1' },
          createElement(DataLibraryBindingProvider, null, createElement(Harness))
        )
      )
    );

    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByText('未命名节点')).toBeDefined();
  });
});

