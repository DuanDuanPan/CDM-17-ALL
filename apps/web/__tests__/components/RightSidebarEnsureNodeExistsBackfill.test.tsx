import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { NodeType } from '@cdm/types';
import type { Graph } from '@antv/x6';
import type { PropertyPanelProps } from '@/components/PropertyPanel';

let capturedPropertyPanelProps: PropertyPanelProps | undefined;
let observedNodeDataIds: Array<string | undefined> = [];

vi.mock('@/components/PropertyPanel', () => ({
  PropertyPanel: (props: PropertyPanelProps) => {
    capturedPropertyPanelProps = props;
    observedNodeDataIds.push(props.nodeData?.id);
    return null;
  },
}));

vi.mock('@/lib/api/nodes', () => ({
  fetchNode: vi.fn(),
  createNode: vi.fn(),
  updateNodeProps: vi.fn(),
  updateNodeTags: vi.fn(),
  updateNodeType: vi.fn(),
  archiveNode: vi.fn(),
  unarchiveNode: vi.fn(),
}));

import { createNode, fetchNode, updateNodeProps } from '@/lib/api/nodes';
import { RightSidebar } from '@/components/layout/RightSidebar';

describe('RightSidebar ensureNodeExists', () => {
  beforeEach(() => {
    capturedPropertyPanelProps = undefined;
    observedNodeDataIds = [];
    vi.mocked(createNode).mockReset();
    vi.mocked(fetchNode).mockReset();
    vi.mocked(updateNodeProps).mockReset();
  });

  it('prefers local props when API props is empty (prevents wipe) and backfills backend', async () => {
    const localProps = {
      assigneeId: 'user-1',
      dueDate: '2025-01-05T00:00:00.000Z',
      status: 'todo',
    };

    const x6Node = {
      id: 'node-1',
      isNode: () => true,
      getData: vi.fn(() => ({
        label: 'Task',
        nodeType: NodeType.TASK,
        props: localProps,
        tags: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        creator: 'Mock',
      })),
      setData: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      hide: vi.fn(),
      show: vi.fn(),
    };

    const graph = {
      getCellById: vi.fn(() => x6Node),
      cleanSelection: vi.fn(),
    };

    vi.mocked(fetchNode).mockResolvedValueOnce({
      id: 'node-1',
      label: 'Task',
      type: NodeType.TASK,
      x: 0,
      y: 0,
      width: 120,
      height: 50,
      graphId: 'g1',
      createdAt: '2025-01-01T00:00:00.000Z',
      // API appears newer (e.g., created on server after paste)
      updatedAt: '2025-01-02T00:00:00.000Z',
      creator: 'Mock',
      props: {},
      tags: [],
      isArchived: false,
      archivedAt: null,
    });

    vi.mocked(updateNodeProps).mockResolvedValueOnce(true);

    render(<RightSidebar selectedNodeId="node-1" graph={graph as unknown as Graph} graphId="g1" yDoc={null} />);

    await waitFor(() => {
      expect(capturedPropertyPanelProps?.nodeData?.props).toEqual(localProps);
    });

    await waitFor(() => {
      expect(vi.mocked(updateNodeProps)).toHaveBeenCalledWith('node-1', NodeType.TASK, localProps);
    });

    expect(x6Node.setData).not.toHaveBeenCalledWith(
      expect.objectContaining({ props: {} }),
      expect.anything()
    );
  });

  it('does not clobber selected nodeData while ensuring parent exists (paste ordering)', async () => {
    const childProps = { status: 'todo' };

    const parentNode = {
      id: 'parent-1',
      isNode: () => true,
      getData: vi.fn(() => ({
        label: 'Parent',
        nodeType: NodeType.TASK,
        props: {},
        tags: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        creator: 'Mock',
      })),
      setData: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      hide: vi.fn(),
      show: vi.fn(),
    };

    const childNode = {
      id: 'child-1',
      isNode: () => true,
      getData: vi.fn(() => ({
        label: 'Child',
        nodeType: NodeType.TASK,
        parentId: 'parent-1',
        props: childProps,
        tags: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        creator: 'Mock',
      })),
      getPosition: vi.fn(() => ({ x: 0, y: 0 })),
      setData: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      hide: vi.fn(),
      show: vi.fn(),
    };

    const graph = {
      getCellById: vi.fn((id: string) => {
        if (id === 'child-1') return childNode;
        if (id === 'parent-1') return parentNode;
        return null;
      }),
      cleanSelection: vi.fn(),
    };

    vi.mocked(fetchNode).mockImplementation(async (id: string) => {
      if (id === 'child-1') return null;
      if (id === 'parent-1') {
        return {
          id: 'parent-1',
          label: 'Parent',
          type: NodeType.TASK,
          x: 0,
          y: 0,
          width: 120,
          height: 50,
          graphId: 'g1',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          creator: 'Mock',
          props: {},
          tags: [],
          isArchived: false,
          archivedAt: null,
        };
      }
      return null;
    });

    vi.mocked(createNode).mockResolvedValueOnce({
      id: 'child-1',
      label: 'Child',
      type: NodeType.TASK,
      x: 0,
      y: 0,
      width: 120,
      height: 50,
      graphId: 'g1',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      creator: 'Mock',
      props: {},
      tags: [],
    });

    vi.mocked(updateNodeProps).mockResolvedValueOnce(true);

    render(<RightSidebar selectedNodeId="child-1" graph={graph as unknown as Graph} graphId="g1" yDoc={null} />);

    await waitFor(() => {
      expect(vi.mocked(createNode)).toHaveBeenCalled();
    });

    expect(observedNodeDataIds).toContain('child-1');
    expect(observedNodeDataIds).not.toContain('parent-1');
  });
});
