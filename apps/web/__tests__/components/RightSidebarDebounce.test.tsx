/**
 * Story 7.8: RightSidebar Debounce Behavior Test (C2)
 *
 * Verifies that props persistence is debounced using PROPS_UPDATE_DEBOUNCE_MS
 * to prevent excessive API calls during rapid editing.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { NodeType } from '@cdm/types';
import type { Graph } from '@antv/x6';
import type { PropertyPanelProps } from '@/components/PropertyPanel';
import { PROPS_UPDATE_DEBOUNCE_MS } from '@/lib/constants';

let capturedPropertyPanelProps: PropertyPanelProps | undefined;

vi.mock('@/components/PropertyPanel', () => ({
  PropertyPanel: (props: PropertyPanelProps) => {
    capturedPropertyPanelProps = props;
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

import { fetchNode, updateNodeProps, updateNodeType } from '@/lib/api/nodes';
import { RightSidebar } from '@/components/layout/RightSidebar';

describe('RightSidebar props debounce (C2)', () => {
  beforeEach(() => {
    capturedPropertyPanelProps = undefined;
    vi.mocked(fetchNode).mockReset();
    vi.mocked(updateNodeProps).mockReset();
    vi.mocked(updateNodeType).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces props persistence and calls API once after PROPS_UPDATE_DEBOUNCE_MS', async () => {
    const x6Node = {
      id: 'node-1',
      isNode: () => true,
      getData: vi.fn(() => ({
        label: 'Task',
        nodeType: NodeType.TASK,
        props: { status: 'todo' },
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

    // API returns same data as local
    vi.mocked(fetchNode).mockResolvedValue({
      id: 'node-1',
      label: 'Task',
      type: NodeType.TASK,
      x: 0,
      y: 0,
      width: 120,
      height: 50,
      graphId: 'g1',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      creator: 'Mock',
      props: { status: 'todo' },
      tags: [],
      isArchived: false,
      archivedAt: null,
    });

    vi.mocked(updateNodeProps).mockResolvedValue(true);

    render(<RightSidebar selectedNodeId="node-1" graph={graph as unknown as Graph} graphId="g1" yDoc={null} />);

    // Wait for initial render and ensureNodeExists
    await waitFor(() => {
      expect(capturedPropertyPanelProps?.onPropsUpdate).toBeDefined();
    });

    vi.useFakeTimers();

    // Clear any existing calls
    vi.mocked(updateNodeProps).mockClear();

    // Simulate rapid props updates (3 times within debounce window)
    await act(async () => {
      capturedPropertyPanelProps!.onPropsUpdate!('node-1', NodeType.TASK, { status: 'in-progress' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    await act(async () => {
      capturedPropertyPanelProps!.onPropsUpdate!('node-1', NodeType.TASK, { status: 'in-progress', assigneeId: 'user-1' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    await act(async () => {
      capturedPropertyPanelProps!.onPropsUpdate!('node-1', NodeType.TASK, { status: 'done', assigneeId: 'user-1' });
    });

    // Before debounce expires, API should NOT have been called yet
    expect(vi.mocked(updateNodeProps)).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROPS_UPDATE_DEBOUNCE_MS - 1);
    });
    expect(vi.mocked(updateNodeProps)).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    // API should be called exactly once with the LAST value
    expect(vi.mocked(updateNodeProps)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateNodeProps)).toHaveBeenCalledWith(
      'node-1',
      NodeType.TASK,
      expect.objectContaining({ status: 'done', assigneeId: 'user-1' })
    );
  });

  it('calls API multiple times if updates are spaced beyond debounce window', async () => {
    const x6Node = {
      id: 'node-1',
      isNode: () => true,
      getData: vi.fn(() => ({
        label: 'Task',
        nodeType: NodeType.TASK,
        props: { status: 'todo' },
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

    vi.mocked(fetchNode).mockResolvedValue({
      id: 'node-1',
      label: 'Task',
      type: NodeType.TASK,
      x: 0,
      y: 0,
      width: 120,
      height: 50,
      graphId: 'g1',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      creator: 'Mock',
      props: { status: 'todo' },
      tags: [],
      isArchived: false,
      archivedAt: null,
    });

    vi.mocked(updateNodeProps).mockResolvedValue(true);

    render(<RightSidebar selectedNodeId="node-1" graph={graph as unknown as Graph} graphId="g1" yDoc={null} />);

    await waitFor(() => {
      expect(capturedPropertyPanelProps?.onPropsUpdate).toBeDefined();
    });

    vi.useFakeTimers();

    vi.mocked(updateNodeProps).mockClear();

    // First update
    await act(async () => {
      capturedPropertyPanelProps!.onPropsUpdate!('node-1', NodeType.TASK, { status: 'in-progress' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROPS_UPDATE_DEBOUNCE_MS);
    });
    expect(vi.mocked(updateNodeProps)).toHaveBeenCalledTimes(1);

    // Second update after debounce window
    await act(async () => {
      capturedPropertyPanelProps!.onPropsUpdate!('node-1', NodeType.TASK, { status: 'done' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROPS_UPDATE_DEBOUNCE_MS);
    });

    // Both updates should result in API calls
    expect(vi.mocked(updateNodeProps)).toHaveBeenCalledTimes(2);
  });

  it('clears debounce timer on type change', async () => {
    const x6Node = {
      id: 'node-1',
      isNode: () => true,
      getData: vi.fn(() => ({
        label: 'Task',
        nodeType: NodeType.TASK,
        props: { status: 'todo' },
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

    vi.mocked(fetchNode).mockResolvedValue({
      id: 'node-1',
      label: 'Task',
      type: NodeType.TASK,
      x: 0,
      y: 0,
      width: 120,
      height: 50,
      graphId: 'g1',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      creator: 'Mock',
      props: { status: 'todo' },
      tags: [],
      isArchived: false,
      archivedAt: null,
    });

    vi.mocked(updateNodeProps).mockResolvedValue(true);
    vi.mocked(updateNodeType).mockResolvedValue(true);

    render(<RightSidebar selectedNodeId="node-1" graph={graph as unknown as Graph} graphId="g1" yDoc={null} />);

    await waitFor(() => {
      expect(capturedPropertyPanelProps?.onPropsUpdate).toBeDefined();
      expect(capturedPropertyPanelProps?.onTypeChange).toBeDefined();
    });

    vi.useFakeTimers();

    vi.mocked(updateNodeProps).mockClear();

    // Start a props update (will be debounced)
    await act(async () => {
      capturedPropertyPanelProps!.onPropsUpdate!('node-1', NodeType.TASK, { status: 'in-progress' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    // Change type - this should cancel the pending props update
    await act(async () => {
      await capturedPropertyPanelProps!.onTypeChange!('node-1', NodeType.REQUIREMENT);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROPS_UPDATE_DEBOUNCE_MS + 10);
    });

    // The old props update should NOT have been called (timer was cleared)
    expect(vi.mocked(updateNodeProps)).not.toHaveBeenCalled();
  });
});
