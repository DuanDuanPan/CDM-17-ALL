'use client';

/**
 * Story 9.3: ModelViewerModal Component Tests
 */

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock ModelViewer to avoid initializing Online3DViewer/WebGL in unit tests
vi.mock('../components/ModelViewer', () => ({
  ModelViewer: () => <div data-testid="mock-model-viewer" />,
}));

import { ModelViewerModal } from '../components/ModelViewerModal';

describe('ModelViewerModal', () => {
  it('toggles structure tree panel visibility', async () => {
    const user = userEvent.setup();
    render(
      <ModelViewerModal
        assetUrl="/mock/storage/AntiqueCamera.glb"
        assetName="AntiqueCamera.glb"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Panel is open by default
    expect(screen.getByText('模型结构')).toBeDefined();

    const toggleButton = screen.getByTestId('toggle-structure-tree');
    await user.click(toggleButton);
    expect(screen.queryByText('模型结构')).toBeNull();

    await user.click(toggleButton);
    expect(screen.getByText('模型结构')).toBeDefined();
  });
});

