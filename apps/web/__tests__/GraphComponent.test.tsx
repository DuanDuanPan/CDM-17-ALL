'use client';

/**
 * Story 7.4: GraphComponent Enhanced Tests
 * Comprehensive tests for the refactored GraphComponent
 * 
 * Tests cover:
 * - Basic rendering and accessibility
 * - Props handling (callbacks, configuration)
 * - UI element rendering (toolbars, overlays, context menus)
 * - Collaboration integration
 * - Keyboard interaction setup
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ConfirmDialogProvider, ToastProvider } from '@cdm/ui';
import type { Graph } from '@antv/x6';

// Mock @antv/x6 to avoid ESM issues with NodeView
vi.mock('@antv/x6', () => ({
  NodeView: class { },
  Graph: class { },
  MiniMap: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  })),
}));

// ============================================================
// Mock Setup
// ============================================================

// Mock graph instance
const mockGraph = {
  getNodes: vi.fn(() => []),
  getEdges: vi.fn(() => []),
  select: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  zoom: vi.fn(() => 1),
  translate: vi.fn(() => ({ tx: 0, ty: 0 })),
  getPlugin: vi.fn(() => null),
  use: vi.fn(),
} as unknown as Graph;

// Mock useGraph hook
const mockUseGraph = vi.fn(() => ({ graph: null, isReady: false }));
vi.mock('@/hooks/useGraph', () => ({
  useGraph: (...args: unknown[]) => mockUseGraph(...args),
  addCenterNode: vi.fn(),
}));

// Mock plugins
vi.mock('@/hooks/useMindmapPlugin', () => ({
  useMindmapPlugin: vi.fn(),
}));

vi.mock('@/hooks/useLayoutPlugin', () => ({
  useLayoutPlugin: vi.fn(() => ({ gridEnabled: false })),
}));

// Mock collaboration
vi.mock('@/hooks/useCollaboration', () => ({
  useCollaboration: vi.fn(() => ({
    yDoc: null,
    provider: null,
    awareness: null,
    isConnected: false,
    isSynced: false,
    error: null,
    remoteUsers: [],
    updateCursor: vi.fn(),
    updateSelectedNode: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock selection
const mockSelectNodes = vi.fn();
const mockClearSelection = vi.fn();
vi.mock('@/hooks/useSelection', () => ({
  useSelection: vi.fn(() => ({
    selectedNodes: [],
    selectedNodeIds: [],
    hasSelection: false,
    selectNodes: mockSelectNodes,
    clearSelection: mockClearSelection,
  })),
}));

// Mock clipboard
const mockCopy = vi.fn();
const mockCut = vi.fn();
const mockPaste = vi.fn();
const mockDeleteNodes = vi.fn();
const mockHardDeleteNodes = vi.fn();
vi.mock('@/hooks/useClipboard', () => ({
  useClipboard: vi.fn(() => ({
    copy: mockCopy,
    cut: mockCut,
    paste: mockPaste,
    deleteNodes: mockDeleteNodes,
    hardDeleteNodes: mockHardDeleteNodes,
  })),
}));

vi.mock('@/hooks/useClipboardShortcuts', () => ({
  useClipboardShortcuts: vi.fn(),
}));

vi.mock('@/hooks/useEditingState', () => ({
  useEditingState: vi.fn(() => ({ isEditing: false })),
}));

// Mock subscription hooks
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: vi.fn(() => ({
    isSubscribed: false,
    isLoading: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
  useSubscriptionList: vi.fn(() => ({ subscriptions: [] })),
}));

vi.mock('@/lib/subscriptionStore', () => ({
  setSubscriptions: vi.fn(),
}));

// Mock extracted hooks
const mockHandleKeyDown = vi.fn();
vi.mock('@/components/graph/hooks', () => ({
  useGraphTransform: vi.fn(() => ({ canvasOffset: { x: 0, y: 0 }, scale: 1 })),
  useGraphHotkeys: vi.fn(() => ({ handleKeyDown: mockHandleKeyDown })),
  useGraphEvents: vi.fn(),
  useGraphSelection: vi.fn(),
  useGraphDependencyMode: vi.fn(),
  useGraphContextMenu: vi.fn(() => ({
    handleDependencyTypeChange: vi.fn(),
    handleCloseContextMenu: vi.fn(),
    removeEdge: vi.fn(),
  })),
  useGraphCursor: vi.fn(() => ({ handleMouseMove: vi.fn() })),
  useGraphInitialization: vi.fn(),
  useNodeCollapse: vi.fn(() => ({
    isCollapsed: vi.fn(() => false),
    toggleCollapse: vi.fn(),
    collapseNode: vi.fn(),
    expandNode: vi.fn(),
    collapseDescendants: vi.fn(),
    expandPathToNode: vi.fn(),
    getHiddenDescendantCount: vi.fn(() => 0),
    getChildCount: vi.fn(() => 0),
    hasChildren: vi.fn(() => false),
  })),
  // Story 8.2: Minimap mock
  useMinimap: vi.fn(() => ({
    isEnabled: false,
    toggle: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    highlightNodes: vi.fn(),
    clearHighlights: vi.fn(),
    isDisabledForPerformance: false,
  })),
  // Story 8.3: Zoom shortcuts mock
  useZoomShortcuts: vi.fn(() => ({
    zoomToFit: vi.fn(),
    zoomTo100: vi.fn(),
    centerNode: vi.fn(),
    prefersReducedMotion: false,
  })),
  // Story 8.5: Focus mode mock
  useFocusMode: vi.fn(() => ({
    isFocusMode: false,
    focusLevel: 1,
    toggleFocusMode: vi.fn(),
    exitFocusMode: vi.fn(),
    setFocusLevel: vi.fn(),
  })),
}));

// Mock context
vi.mock('@/contexts', () => ({
  useCollaborationUIOptional: vi.fn(() => null),
}));

// Mock plugin commands
vi.mock('@cdm/plugin-mindmap-core', () => ({
  AddChildCommand: class AddChildCommand { },
  AddSiblingCommand: class AddSiblingCommand { },
  NavigationCommand: class NavigationCommand { },
}));

// ============================================================
// Test Utilities
// ============================================================

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    <ConfirmDialogProvider>
      {children}
    </ConfirmDialogProvider>
  </ToastProvider>
);

const renderGraphComponent = async (props = {}) => {
  const { GraphComponent } = await import('@/components/graph/GraphComponent');
  return render(
    <TestWrapper>
      <GraphComponent {...props} />
    </TestWrapper>
  );
};

// ============================================================
// Tests
// ============================================================

describe('GraphComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGraph.mockReturnValue({ graph: null, isReady: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // Rendering Tests
  // ----------------------------------------------------------
  describe('Rendering', () => {
    it('renders a focusable graph container', async () => {
      await renderGraphComponent();
      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
      expect(container?.getAttribute('tabIndex')).toBe('0');
    });

    it('renders with proper structure', async () => {
      await renderGraphComponent();

      // Main container should exist
      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();

      // Container should have proper styling
      expect(container?.className).toContain('w-full');
      expect(container?.className).toContain('h-full');
    });

    it('renders ClipboardToolbar in correct position', async () => {
      await renderGraphComponent();

      // ClipboardToolbar should be positioned in top-right
      const toolbarContainer = document.querySelector('.absolute.top-4.right-4');
      expect(toolbarContainer).toBeTruthy();
    });
  });

  // ----------------------------------------------------------
  // Props Handling Tests
  // ----------------------------------------------------------
  describe('Props Handling', () => {
    it('calls onGraphReady when graph becomes available', async () => {
      const onGraphReady = vi.fn();
      mockUseGraph.mockReturnValue({ graph: mockGraph, isReady: true });

      await renderGraphComponent({ onGraphReady });

      expect(onGraphReady).toHaveBeenCalledWith(mockGraph);
    });

    it('calls onGraphReady with null on unmount', async () => {
      const onGraphReady = vi.fn();
      mockUseGraph.mockReturnValue({ graph: mockGraph, isReady: true });

      const { unmount } = await renderGraphComponent({ onGraphReady });

      // First call is with graph
      expect(onGraphReady).toHaveBeenCalledWith(mockGraph);

      unmount();

      // Second call is with null (cleanup)
      expect(onGraphReady).toHaveBeenCalledWith(null);
    });

    it('uses default props when not provided', async () => {
      await renderGraphComponent();

      // Component should render without errors with default props
      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });

    it('accepts custom graphId', async () => {
      const customGraphId = 'custom-test-graph';
      await renderGraphComponent({ graphId: customGraphId });

      // Component should render successfully with custom graphId
      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });

    it('accepts custom user prop', async () => {
      const customUser = { id: 'test-user', name: 'Test User', color: '#ff0000' };
      await renderGraphComponent({ user: customUser });

      // Component should render successfully with custom user
      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });
  });

  // ----------------------------------------------------------
  // Keyboard Interaction Tests
  // ----------------------------------------------------------
  describe('Keyboard Interactions', () => {
    it('container receives keyboard events', async () => {
      await renderGraphComponent();

      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();

      // Fire a keydown event
      fireEvent.keyDown(container!, { key: 'Tab' });

      // handleKeyDown should be called (mocked)
      expect(mockHandleKeyDown).toHaveBeenCalled();
    });

    it('container is focusable', async () => {
      await renderGraphComponent();

      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
      expect(container?.getAttribute('tabIndex')).toBe('0');

      // Focus should work
      container?.focus();
      expect(document.activeElement).toBe(container);
    });
  });

  // ----------------------------------------------------------
  // Collaboration Tests
  // ----------------------------------------------------------
  describe('Collaboration', () => {
    it('renders without collaboration by default', async () => {
      await renderGraphComponent();

      // Component should work without collaboration props
      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });

    it('accepts collaboration prop', async () => {
      const mockCollaboration = {
        yDoc: null,
        isConnected: true,
        isSynced: true,
        syncStatus: 'synced' as const,
        remoteUsers: [{ id: 'user-1', name: 'User 1', color: '#ff0000' }],
        updateCursor: vi.fn(),
        updateSelectedNode: vi.fn(),
      };

      await renderGraphComponent({ collaboration: mockCollaboration });

      // Component should render with collaboration props
      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });
  });

  // ----------------------------------------------------------
  // Dependency Mode Tests
  // ----------------------------------------------------------
  describe('Dependency Mode', () => {
    it('accepts isDependencyMode prop', async () => {
      await renderGraphComponent({ isDependencyMode: true });

      // DependencyModeIndicator should render when in dependency mode
      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });

    it('accepts onExitDependencyMode callback', async () => {
      const onExitDependencyMode = vi.fn();
      await renderGraphComponent({
        isDependencyMode: true,
        onExitDependencyMode
      });

      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });
  });

  // ----------------------------------------------------------
  // Layout Tests
  // ----------------------------------------------------------
  describe('Layout', () => {
    it('accepts currentLayout prop', async () => {
      await renderGraphComponent({ currentLayout: 'tree' });

      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });

    it('accepts onLayoutChange callback', async () => {
      const onLayoutChange = vi.fn();
      await renderGraphComponent({ onLayoutChange });

      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });

    it('accepts onGridToggle callback', async () => {
      const onGridToggle = vi.fn();
      await renderGraphComponent({ onGridToggle });

      const container = document.getElementById('graph-container');
      expect(container).toBeTruthy();
    });
  });

  // ----------------------------------------------------------
  // Accessibility Tests
  // ----------------------------------------------------------
  describe('Accessibility', () => {
    it('has focusable container for keyboard navigation', async () => {
      await renderGraphComponent();

      const container = document.getElementById('graph-container');
      expect(container?.getAttribute('tabIndex')).toBe('0');
    });

    it('container has no outline style to avoid visual distraction', async () => {
      await renderGraphComponent();

      const container = document.getElementById('graph-container');
      expect(container?.style.outline).toBe('none');
    });

    it('container has minimum height for visibility', async () => {
      await renderGraphComponent();

      const container = document.getElementById('graph-container');
      expect(container?.style.minHeight).toBe('100%');
    });
  });
});
