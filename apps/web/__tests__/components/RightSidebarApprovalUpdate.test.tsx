import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { NodeType } from '@cdm/types';
import type { Graph } from '@antv/x6';
import type { PropertyPanelProps } from '@/components/PropertyPanel';

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

import { fetchNode } from '@/lib/api/nodes';
import { RightSidebar } from '@/components/layout/RightSidebar';

describe('RightSidebar approval refresh', () => {
  beforeEach(() => {
    capturedPropertyPanelProps = undefined;
    vi.mocked(fetchNode).mockReset();
  });

  it('syncs approval refresh to X6 with overwrite so empty deliverables clears', async () => {
    const x6Node = {
      id: 'node-1',
      isNode: () => true,
      getData: vi.fn(() => ({
        label: 'Task',
        nodeType: NodeType.TASK,
        props: {
          deliverables: [
            { id: 'd1', fileId: 'f1', fileName: 'a.pdf', uploadedAt: '2025-01-01T00:00:00.000Z' },
          ],
        },
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
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

    vi.mocked(fetchNode)
      // ensureNodeExists fetch (API is older → should not sync back to X6)
      .mockResolvedValueOnce({
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
        props: {},
      })
      // onApprovalUpdate fetch (deliverables cleared)
      .mockResolvedValueOnce({
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
        props: { deliverables: [] },
      });

    render(<RightSidebar selectedNodeId="node-1" graph={graph as unknown as Graph} graphId="g1" yDoc={null} />);

    await waitFor(() => {
      expect(capturedPropertyPanelProps?.onApprovalUpdate).toBeDefined();
    });

    // Wait for the initial ensureNodeExists fetch to happen before triggering approval refresh.
    await waitFor(() => expect(vi.mocked(fetchNode)).toHaveBeenCalledTimes(1));

    x6Node.setData.mockClear();

    if (!capturedPropertyPanelProps?.onApprovalUpdate) {
      throw new Error('Expected PropertyPanel to receive onApprovalUpdate');
    }

    const testDeliverables = [{ id: 'd1', fileId: 'f1', fileName: 'test.pdf', uploadedAt: '2024-01-01T00:00:00Z' }];
    const testApproval = {
      status: 'PENDING',
      currentStepIndex: 0,
      steps: [],
      history: [],
    };
    await act(async () => {
      await capturedPropertyPanelProps!.onApprovalUpdate!('node-1', { approval: testApproval, deliverables: testDeliverables });
    });

    expect(x6Node.setData).toHaveBeenCalledWith(
      expect.objectContaining({
        deliverables: testDeliverables,
        approval: testApproval,
      }),
      { overwrite: true }
    );
  });
});
