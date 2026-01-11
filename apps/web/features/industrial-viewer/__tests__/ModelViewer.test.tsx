'use client';

/**
 * Story 9.3: ModelViewer Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelViewer } from '../components/ModelViewer';

// Mock the useOnline3DViewer hook since Online3DViewer requires browser WebGL
vi.mock('../hooks/useOnline3DViewer', () => ({
  useOnline3DViewer: vi.fn(() => ({
    containerRef: { current: null },
    isLoading: false,
    error: null,
    model: null,
    edgesEnabled: true,
    toggleEdges: vi.fn(),
    resetView: vi.fn(),
    highlightNode: vi.fn(),
    clearHighlight: vi.fn(),
    // Story 9.4: Added renderMode support
    renderMode: 'solid' as const,
    setRenderMode: vi.fn(),
    toggleRenderMode: vi.fn(),
  })),
}));

// Import the mocked hook for controlling behavior
import { useOnline3DViewer } from '../hooks/useOnline3DViewer';

const mockedUseOnline3DViewer = vi.mocked(useOnline3DViewer);

describe('ModelViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state when isLoading is true', () => {
    mockedUseOnline3DViewer.mockReturnValueOnce({
      containerRef: { current: null },
      isLoading: true,
      error: null,
      model: null,
      edgesEnabled: true,
      toggleEdges: vi.fn(),
      resetView: vi.fn(),
      highlightNode: vi.fn(),
      clearHighlight: vi.fn(),
      renderMode: 'solid',
      setRenderMode: vi.fn(),
      toggleRenderMode: vi.fn(),
    });

    render(<ModelViewer assetUrl="/test/model.step" />);
    expect(screen.getByTestId('model-viewer-container')).toBeDefined();
    expect(screen.getByTestId('loading-state')).toBeDefined();
    expect(screen.getByText('加载中...')).toBeDefined();
  });

  it('renders error state when error is set', () => {
    const errorObj = new Error('Failed to load model');
    mockedUseOnline3DViewer.mockReturnValueOnce({
      containerRef: { current: null },
      isLoading: false,
      error: errorObj,
      model: null,
      edgesEnabled: true,
      toggleEdges: vi.fn(),
      resetView: vi.fn(),
      highlightNode: vi.fn(),
      clearHighlight: vi.fn(),
      renderMode: 'solid',
      setRenderMode: vi.fn(),
      toggleRenderMode: vi.fn(),
    });

    render(<ModelViewer assetUrl="/test/model.step" />);
    expect(screen.getByTestId('error-state')).toBeDefined();
    expect(screen.getByText('加载失败')).toBeDefined();
    expect(screen.getByText('Failed to load model')).toBeDefined();
  });

  it('renders viewer container when loaded successfully', () => {
    render(<ModelViewer assetUrl="/test/model.step" />);
    expect(screen.getByTestId('model-viewer-container')).toBeDefined();
    expect(screen.getByTestId('viewer-canvas')).toBeDefined();
  });

  it('calls onControlsReady with controls when hook provides them', () => {
    const onControlsReady = vi.fn();
    const mockControls = {
      edgesEnabled: true,
      toggleEdges: vi.fn(),
      resetView: vi.fn(),
      highlightNode: vi.fn(),
      clearHighlight: vi.fn(),
      renderMode: 'solid' as const,
      toggleRenderMode: vi.fn(),
    };

    mockedUseOnline3DViewer.mockReturnValueOnce({
      containerRef: { current: null },
      isLoading: false,
      error: null,
      model: null,
      ...mockControls,
      renderMode: 'solid',
      setRenderMode: vi.fn(),
      toggleRenderMode: vi.fn(),
    });

    render(
      <ModelViewer assetUrl="/test/model.step" onControlsReady={onControlsReady} />
    );

    expect(onControlsReady).toHaveBeenCalledWith(
      expect.objectContaining({
        edgesEnabled: true,
        toggleEdges: expect.any(Function),
        resetView: expect.any(Function),
        highlightNode: expect.any(Function),
        clearHighlight: expect.any(Function),
        renderMode: 'solid',
        toggleRenderMode: expect.any(Function),
      })
    );
  });
});
