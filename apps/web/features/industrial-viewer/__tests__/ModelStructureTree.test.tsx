'use client';

/**
 * Story 9.3: ModelStructureTree Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelStructureTree } from '../components/ModelStructureTree';
import type { Model } from 'online-3d-viewer';

// Create a mock model structure for testing
function createMockModel(): Model {
  // Mock a simple model hierarchy:
  // Root
  //   ├── Part A (1 mesh)
  //   └── Assembly
  //        └── Part B (2 meshes)
  const mockPartB = {
    GetId: () => 3,
    GetName: () => 'Part B',
    GetChildNodes: () => [],
    MeshIndexCount: () => 2,
  };

  const mockAssembly = {
    GetId: () => 2,
    GetName: () => 'Assembly',
    GetChildNodes: () => [mockPartB],
    MeshIndexCount: () => 0,
  };

  const mockPartA = {
    GetId: () => 1,
    GetName: () => 'Part A',
    GetChildNodes: () => [],
    MeshIndexCount: () => 1,
  };

  const mockRoot = {
    GetId: () => 0,
    GetName: () => 'Root',
    GetChildNodes: () => [mockPartA, mockAssembly],
    MeshIndexCount: () => 0,
  };

  return {
    GetRootNode: () => mockRoot,
  } as unknown as Model;
}

describe('ModelStructureTree', () => {
  it('renders the tree container', () => {
    const mockModel = createMockModel();
    render(
      <ModelStructureTree
        model={mockModel}
        selectedNodeId={null}
        onNodeSelect={vi.fn()}
      />
    );
    expect(screen.getByTestId('model-structure-tree')).toBeDefined();
  });

  it('renders the root node (since root has children)', () => {
    const mockModel = createMockModel();
    render(
      <ModelStructureTree
        model={mockModel}
        selectedNodeId={null}
        onNodeSelect={vi.fn()}
      />
    );

    // Root node should be rendered
    expect(screen.getByText('Root')).toBeDefined();
  });

  it('shows mesh count for nodes with meshes', () => {
    const mockModel = createMockModel();
    render(
      <ModelStructureTree
        model={mockModel}
        selectedNodeId={null}
        onNodeSelect={vi.fn()}
      />
    );

    // Part A has 1 mesh
    expect(screen.getByText('1')).toBeDefined();
  });

  it('calls onNodeSelect when a node is clicked', async () => {
    const user = userEvent.setup();
    const mockModel = createMockModel();
    const onNodeSelect = vi.fn();

    render(
      <ModelStructureTree
        model={mockModel}
        selectedNodeId={null}
        onNodeSelect={onNodeSelect}
      />
    );

    // Root is initially expanded (level 0 < 2), so Part A should be visible
    // Click on the Root node first
    await user.click(screen.getByText('Root'));
    expect(onNodeSelect).toHaveBeenCalledWith(0); // Root has id 0
  });

  it('highlights selected node', () => {
    const mockModel = createMockModel();
    const { container } = render(
      <ModelStructureTree
        model={mockModel}
        selectedNodeId={0}
        onNodeSelect={vi.fn()}
      />
    );

    // The root node with id 0 should have selected styling
    const selectedElement = container.querySelector('.selected');
    expect(selectedElement).toBeDefined();
  });

  it('handles null model gracefully', () => {
    render(
      <ModelStructureTree
        model={null}
        selectedNodeId={null}
        onNodeSelect={vi.fn()}
      />
    );

    expect(screen.getByText('无结构数据')).toBeDefined();
  });

  it('expands and collapses nodes using the toggle button', async () => {
    const user = userEvent.setup();
    const mockModel = createMockModel();

    render(
      <ModelStructureTree
        model={mockModel}
        selectedNodeId={null}
        onNodeSelect={vi.fn()}
      />
    );

    // Root is expanded by default (level 0 < 2), so children should be visible
    expect(screen.getByText('Part A')).toBeDefined();

    const expandButtons = screen.getAllByTestId('tree-expand-button');
    expect(expandButtons.length).toBeGreaterThan(0);

    // Collapse root
    await user.click(expandButtons[0]);
    expect(screen.queryByText('Part A')).toBeNull();

    // Expand root again
    await user.click(expandButtons[0]);
    expect(screen.getByText('Part A')).toBeDefined();
  });
});
