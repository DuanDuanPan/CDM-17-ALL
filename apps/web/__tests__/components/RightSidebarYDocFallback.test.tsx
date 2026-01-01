import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { NodeType } from '@cdm/types';
import type { PropertyPanelProps } from '@/components/PropertyPanel';
import * as Y from 'yjs';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

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

import { archiveNode, unarchiveNode, updateNodeTags } from '@/lib/api/nodes';
import { RightSidebar } from '@/components/layout/RightSidebar';

describe('RightSidebar yDoc fallback (graph not ready)', () => {
  beforeEach(() => {
    capturedPropertyPanelProps = undefined;
    vi.mocked(updateNodeTags).mockReset();
    vi.mocked(archiveNode).mockReset();
    vi.mocked(unarchiveNode).mockReset();
  });

  it('syncs tags updates to yDoc when graph is null', async () => {
    const yDoc = new Y.Doc();
    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    yNodes.set('node-1', {
      id: 'node-1',
      x: 0,
      y: 0,
      label: 'Task',
      nodeType: NodeType.TASK,
      props: { status: 'todo' } as YjsNodeData['props'],
      tags: ['old'],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      creator: 'Mock',
    });

    vi.mocked(updateNodeTags).mockResolvedValueOnce(true);

    render(<RightSidebar selectedNodeId="node-1" graph={null} graphId="g1" yDoc={yDoc} creatorName="Mock" />);

    await waitFor(() => {
      expect(capturedPropertyPanelProps?.onTagsUpdate).toBeDefined();
    });

    await act(async () => {
      capturedPropertyPanelProps!.onTagsUpdate!('node-1', ['a', 'b']);
    });

    await waitFor(() => {
      expect(yNodes.get('node-1')?.tags).toEqual(['a', 'b']);
      expect(capturedPropertyPanelProps?.nodeData?.tags).toEqual(['a', 'b']);
    });
  });

  it('syncs archive toggle to yDoc when graph is null', async () => {
    const yDoc = new Y.Doc();
    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    yNodes.set('node-1', {
      id: 'node-1',
      x: 0,
      y: 0,
      label: 'Task',
      nodeType: NodeType.TASK,
      props: { status: 'todo' } as YjsNodeData['props'],
      tags: [],
      isArchived: false,
      archivedAt: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      creator: 'Mock',
    });

    vi.mocked(archiveNode).mockResolvedValueOnce(true);

    const onClose = vi.fn();
    render(<RightSidebar selectedNodeId="node-1" graph={null} graphId="g1" yDoc={yDoc} creatorName="Mock" onClose={onClose} />);

    await waitFor(() => {
      expect(capturedPropertyPanelProps?.onArchiveToggle).toBeDefined();
    });

    await act(async () => {
      await capturedPropertyPanelProps!.onArchiveToggle!('node-1', true);
    });

    await waitFor(() => {
      expect(yNodes.get('node-1')?.isArchived).toBe(true);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('syncs approval/deliverables to yDoc when graph is null', async () => {
    const yDoc = new Y.Doc();
    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    yNodes.set('node-1', {
      id: 'node-1',
      x: 0,
      y: 0,
      label: 'Task',
      nodeType: NodeType.TASK,
      props: {} as Record<string, never>,
      deliverables: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      creator: 'Mock',
    });

    render(<RightSidebar selectedNodeId="node-1" graph={null} graphId="g1" yDoc={yDoc} creatorName="Mock" />);

    await waitFor(() => {
      expect(capturedPropertyPanelProps?.onApprovalUpdate).toBeDefined();
    });

    const deliverables = [{ id: 'd1', fileId: 'f1', fileName: 'test.pdf', uploadedAt: '2024-01-01T00:00:00Z' }];
    const approval = { status: 'PENDING', currentStepIndex: 0, steps: [], history: [] };

    await act(async () => {
      await capturedPropertyPanelProps!.onApprovalUpdate!('node-1', { approval, deliverables });
    });

    await waitFor(() => {
      expect(yNodes.get('node-1')?.deliverables).toEqual(deliverables);
      expect(yNodes.get('node-1')?.approval).toEqual(approval);
      expect(yNodes.get('node-1')?.props?.deliverables).toEqual(deliverables);
    });
  });
});
