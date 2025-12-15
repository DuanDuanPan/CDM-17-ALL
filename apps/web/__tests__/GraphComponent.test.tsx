import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphComponent } from '@/components/graph/GraphComponent';

// Mock X6 Graph
vi.mock('@antv/x6', () => ({
  Graph: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    on: vi.fn(),
    addNode: vi.fn(),
    centerContent: vi.fn(),
    container: {
      clientWidth: 800,
      clientHeight: 600,
    },
  })),
}));

describe('GraphComponent', () => {
  it('renders graph container', () => {
    render(<GraphComponent />);
    const container = document.getElementById('graph-container');
    expect(container).toBeTruthy();
  });

  it('applies correct CSS classes', () => {
    render(<GraphComponent />);
    const container = document.getElementById('graph-container');
    expect(container?.className).toContain('w-full');
    expect(container?.className).toContain('h-full');
  });

  it('accepts onNodeSelect callback', () => {
    const mockCallback = vi.fn();
    render(<GraphComponent onNodeSelect={mockCallback} />);
    const container = document.getElementById('graph-container');
    expect(container).toBeTruthy();
  });
});
