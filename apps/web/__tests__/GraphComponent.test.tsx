'use client';

import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfirmDialogProvider, ToastProvider } from '@cdm/ui';

vi.mock('@cdm/plugin-mindmap-core', () => ({
  AddChildCommand: class AddChildCommand {},
  AddSiblingCommand: class AddSiblingCommand {},
  NavigationCommand: class NavigationCommand {},
}));

vi.mock('@/hooks/useGraph', () => ({
  useGraph: vi.fn(() => ({ graph: null, isReady: false })),
  addCenterNode: vi.fn(),
}));

vi.mock('@/hooks/useMindmapPlugin', () => ({
  useMindmapPlugin: vi.fn(),
}));

vi.mock('@/hooks/useLayoutPlugin', () => ({
  useLayoutPlugin: vi.fn(() => ({ gridEnabled: false })),
}));

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

describe('GraphComponent', () => {
  it('renders a focusable graph container', async () => {
    const { GraphComponent } = await import('@/components/graph/GraphComponent');
    render(
      <ToastProvider>
        <ConfirmDialogProvider>
          <GraphComponent />
        </ConfirmDialogProvider>
      </ToastProvider>
    );
    const container = document.getElementById('graph-container');
    expect(container).toBeTruthy();
    expect(container?.getAttribute('tabIndex')).toBe('0');
  });
});
