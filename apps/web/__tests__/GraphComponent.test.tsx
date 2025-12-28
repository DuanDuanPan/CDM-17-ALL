'use client';

import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfirmDialogProvider, ToastProvider } from '@cdm/ui';
import { GraphComponent } from '@/components/graph/GraphComponent';

vi.mock('@/hooks/useGraph', () => ({
  useGraph: vi.fn(() => ({ graph: null, isReady: false })),
  addCenterNode: vi.fn(),
}));

vi.mock('@/hooks/useMindmapPlugin', () => ({
  useMindmapPlugin: vi.fn(),
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
  it('renders a focusable graph container', () => {
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
