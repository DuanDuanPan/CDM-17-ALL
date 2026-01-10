/**
 * Story 9.1: Data Library - DataLibraryDrawer Component Tests
 * Tests drawer behavior including open/close, resize, and keyboard shortcuts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

// Mock the useDataAssets hook
vi.mock('../hooks/useDataAssets', () => ({
  useDataAssets: vi.fn(() => ({
    assets: [],
    total: 0,
    totalPages: 0,
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

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('DataLibraryDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    graphId: 'test-graph-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Drawer opens from right side', () => {
    it('should render when isOpen is true', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId('data-library-drawer')).toBeDefined();
    });

    it('should not render when isOpen is false', () => {
      render(
        createElement(DataLibraryDrawer, { ...defaultProps, isOpen: false }),
        { wrapper: createWrapper() }
      );

      expect(screen.queryByTestId('data-library-drawer')).toBeNull();
    });

    it('should render with correct title', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('数据资源库')).toBeDefined();
    });

    it('should render close button', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText('关闭')).toBeDefined();
    });
  });

  describe('AC2: Drawer close behavior', () => {
    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(
        createElement(DataLibraryDrawer, { ...defaultProps, onClose }),
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByLabelText('关闭'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(
        createElement(DataLibraryDrawer, { ...defaultProps, onClose }),
        { wrapper: createWrapper() }
      );

      // Click on backdrop (the dark overlay)
      const backdrop = screen.getByTestId('drawer-backdrop');
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      const onClose = vi.fn();

      render(
        createElement(DataLibraryDrawer, { ...defaultProps, onClose }),
        { wrapper: createWrapper() }
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC3: View toggle and search', () => {
    it('should render search input', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByPlaceholderText('搜索')).toBeDefined();
    });

    it('should render date range filters', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText('开始日期')).toBeDefined();
      expect(screen.getByLabelText('结束日期')).toBeDefined();
    });

    it('should render view toggle buttons', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByTitle('网格视图')).toBeDefined();
      expect(screen.getByTitle('列表视图')).toBeDefined();
    });

    it('should render format filter dropdown', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText('类型')).toBeDefined();
    });

    it('should update search value on input', async () => {
      const user = userEvent.setup();

      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText('搜索');
      await user.type(searchInput, 'satellite');

      expect(searchInput).toHaveProperty('value', 'satellite');
    });

    it('should toggle between grid and list view', async () => {
      const user = userEvent.setup();

      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      const gridButton = screen.getByTitle('网格视图');
      const listButton = screen.getByTitle('列表视图');

      // Grid button should be active by default (has blue color class)
      expect(gridButton.className).toContain('bg-blue');

      // Switch to list view
      await user.click(listButton);
      expect(listButton.className).toContain('bg-blue');
    });
  });

  describe('Resize functionality', () => {
    it('should render resize handle', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId('drawer-resize-handle')).toBeDefined();
    });

    it('should have resize cursor on handle', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      const handle = screen.getByTestId('drawer-resize-handle');
      expect(handle.className).toContain('cursor-ew-resize');
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no assets', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('暂无数据资产')).toBeDefined();
    });

    it('should show asset count in footer', () => {
      render(createElement(DataLibraryDrawer, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/共 0 个数据资产/)).toBeDefined();
    });
  });
});
