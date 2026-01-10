/**
 * Story 9.2: Organization Views (PBS/Task/Folder) Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataLibraryDrawer } from '../components/DataLibraryDrawer';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../hooks/useDataAssets', () => ({
  useDataAssets: vi.fn(() => ({
    assets: [
      {
        id: 'asset-1',
        name: '卫星总体结构',
        description: null,
        format: 'STEP',
        fileSize: 1024,
        storagePath: null,
        thumbnail: null,
        version: 'v1.0.0',
        tags: [],
        graphId: 'test-graph-1',
        folderId: null,
        creatorId: null,
        secretLevel: 'internal',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        folder: null,
      },
    ],
    total: 1,
    totalPages: 1,
    page: 1,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('../hooks/useDataFolders', () => ({
  useDataFolders: vi.fn(() => ({
    folders: [],
    isLoading: false,
    createFolder: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
    isCreating: false,
    deleteError: null,
    moveAsset: vi.fn(),
    isMovingAsset: false,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('Organization Views (Story 9.2)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    graphId: 'test-graph-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders tabs and shows PBS empty state by default', () => {
    render(createElement(DataLibraryDrawer, defaultProps), { wrapper: createWrapper() });

    expect(screen.getByTestId('organization-tabs')).toBeDefined();
    expect(screen.getByTestId('org-tab-pbs').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('empty-state-pbs')).toBeDefined();
  });

  it('switches between PBS/Task/Folder views and keeps view state during tab switching (AC5)', async () => {
    const user = userEvent.setup();
    render(createElement(DataLibraryDrawer, defaultProps), { wrapper: createWrapper() });

    await user.click(screen.getByTestId('org-tab-task'));
    expect(screen.getByTestId('org-tab-task').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('empty-state-task')).toBeDefined();

    await user.click(screen.getByTestId('org-tab-folder'));
    expect(screen.getByTestId('org-tab-folder').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('empty-state-folder')).toBeDefined();

    await user.click(screen.getByTestId('org-tab-pbs'));
    expect(screen.getByTestId('org-tab-pbs').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('empty-state-pbs')).toBeDefined();
  });

  it('enables asset dragging in folder view (AC4)', async () => {
    const user = userEvent.setup();
    render(createElement(DataLibraryDrawer, defaultProps), { wrapper: createWrapper() });

    await user.click(screen.getByTestId('org-tab-folder'));
    await user.click(screen.getByTitle('网格视图'));

    const assetName = screen.getByText('卫星总体结构');
    const draggableContainer = assetName.closest('div[draggable="true"]');
    expect(draggableContainer).toBeTruthy();
  });
});
