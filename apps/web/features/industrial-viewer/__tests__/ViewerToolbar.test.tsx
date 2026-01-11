'use client';

/**
 * Story 9.3: ViewerToolbar Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewerToolbar } from '../components/ViewerToolbar';

describe('ViewerToolbar', () => {
  const defaultProps = {
    edgesEnabled: true,
    isFullscreen: false,
    onToggleEdges: vi.fn(),
    onResetView: vi.fn(),
    onToggleFullscreen: vi.fn(),
  };

  it('renders the toolbar with all buttons', () => {
    render(<ViewerToolbar {...defaultProps} />);
    expect(screen.getByTestId('viewer-toolbar')).toBeDefined();
    expect(screen.getByTestId('reset-view-button')).toBeDefined();
    expect(screen.getByTestId('fullscreen-toggle')).toBeDefined();
  });

  it('renders the edges toggle', () => {
    render(<ViewerToolbar {...defaultProps} />);
    const toggleLabel = screen.getByText('边线');
    expect(toggleLabel).toBeDefined();
    expect(screen.getByTestId('edge-toggle')).toBeDefined();
  });

  it('calls onResetView when reset button is clicked', async () => {
    const user = userEvent.setup();
    const onResetView = vi.fn();
    render(<ViewerToolbar {...defaultProps} onResetView={onResetView} />);

    await user.click(screen.getByTestId('reset-view-button'));
    expect(onResetView).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleFullscreen when fullscreen button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleFullscreen = vi.fn();
    render(<ViewerToolbar {...defaultProps} onToggleFullscreen={onToggleFullscreen} />);

    await user.click(screen.getByTestId('fullscreen-toggle'));
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleEdges when edges toggle is changed', async () => {
    const user = userEvent.setup();
    const onToggleEdges = vi.fn();
    render(<ViewerToolbar {...defaultProps} onToggleEdges={onToggleEdges} />);

    const toggle = screen.getByTestId('edge-toggle');
    await user.click(toggle);
    expect(onToggleEdges).toHaveBeenCalledTimes(1);
  });

  it('reflects edge state in toggle data-state', () => {
    const { rerender } = render(<ViewerToolbar {...defaultProps} edgesEnabled={true} />);
    const toggle = screen.getByTestId('edge-toggle');
    expect(toggle.getAttribute('data-state')).toBe('checked');

    rerender(<ViewerToolbar {...defaultProps} edgesEnabled={false} />);
    expect(toggle.getAttribute('data-state')).toBe('unchecked');
  });

  it('shows exit fullscreen title when isFullscreen is true', () => {
    render(<ViewerToolbar {...defaultProps} isFullscreen={true} />);
    expect(screen.getByTitle('退出全屏')).toBeDefined();
  });

  it('shows fullscreen title when isFullscreen is false', () => {
    render(<ViewerToolbar {...defaultProps} isFullscreen={false} />);
    expect(screen.getByTitle('全屏显示')).toBeDefined();
  });
});
