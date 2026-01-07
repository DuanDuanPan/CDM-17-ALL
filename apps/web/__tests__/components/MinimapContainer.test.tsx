'use client';

/**
 * Story 8.2: MinimapContainer component tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MinimapContainer } from '@/components/graph/parts/MinimapContainer';

vi.mock('@antv/x6', () => ({
  NodeView: class { },
  MiniMap: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  })),
}));

describe('MinimapContainer', () => {
  it('renders minimap container when visible', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <MinimapContainer
        graph={null}
        isReady={false}
        isVisible
        onToggle={onToggle}
      />
    );

    expect(screen.getByTestId('minimap-container')).toBeTruthy();
    expect(screen.getByLabelText('小地图导航')).toBeTruthy();
    expect(screen.getByTestId('minimap-toggle')).toBeTruthy();
    expect(screen.getByTestId('minimap-canvas')).toBeTruthy();

    await user.click(screen.getByTestId('minimap-toggle'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders toggle button when hidden', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <MinimapContainer
        graph={null}
        isReady={false}
        isVisible={false}
        onToggle={onToggle}
      />
    );

    expect(screen.getByTestId('minimap-show-button')).toBeTruthy();

    await user.click(screen.getByTestId('minimap-show-button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
