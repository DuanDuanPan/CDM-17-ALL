'use client';

import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GraphComponent } from '@/components/graph/GraphComponent';

vi.mock('@/hooks/useGraph', () => ({
  useGraph: vi.fn(() => ({ graph: null, isReady: false })),
  addCenterNode: vi.fn(),
}));

vi.mock('@/hooks/useMindmapPlugin', () => ({
  useMindmapPlugin: vi.fn(),
}));

describe('GraphComponent', () => {
  it('renders a focusable graph container', () => {
    render(<GraphComponent />);
    const container = document.getElementById('graph-container');
    expect(container).toBeTruthy();
    expect(container?.getAttribute('tabIndex')).toBe('0');
  });
});

