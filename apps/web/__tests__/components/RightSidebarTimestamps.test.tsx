/**
 * Story 7.8: RightSidebar Timestamp Completion Test (C4)
 * 
 * Verifies that timestamps (createdAt, updatedAt) and creator are properly
 * added to nodes when missing.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { NodeType } from '@cdm/types';
import type { Graph } from '@antv/x6';
import type { PropertyPanelProps } from '@/components/PropertyPanel';
import { DEFAULT_CREATOR_NAME } from '@/lib/constants';

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

describe('RightSidebar timestamp completion (C4)', () => {
    beforeEach(() => {
        capturedPropertyPanelProps = undefined;
        vi.mocked(fetchNode).mockReset();
    });

    it('should add timestamps when X6 node has none', async () => {
        const setDataMock = vi.fn();
        const x6Node = {
            id: 'node-1',
            isNode: () => true,
            getData: vi.fn(() => ({
                label: 'Node without timestamps',
                nodeType: NodeType.ORDINARY,
                props: {},
                tags: [],
                // No createdAt, updatedAt, or creator
            })),
            setData: setDataMock,
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
            label: 'Node without timestamps',
            type: NodeType.ORDINARY,
            x: 0,
            y: 0,
            width: 120,
            height: 50,
            graphId: 'g1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            creator: DEFAULT_CREATOR_NAME,
            props: {},
            tags: [],
            isArchived: false,
            archivedAt: null,
        });

        render(<RightSidebar selectedNodeId="node-1" graph={graph as unknown as Graph} graphId="g1" yDoc={null} />);

        // Verify setData was called to add timestamps
        await waitFor(() => {
            expect(setDataMock).toHaveBeenCalled();
        });

        // Check that timestamps were added
        const setDataCalls = setDataMock.mock.calls;
        const timestampCall = setDataCalls.find((call) => {
            const data = call[0];
            return data.createdAt && data.updatedAt;
        });

        expect(timestampCall).toBeDefined();
        if (timestampCall) {
            expect(timestampCall[0].createdAt).toBeDefined();
            expect(timestampCall[0].updatedAt).toBeDefined();
        }

        // Verify nodeData passed to PropertyPanel has timestamps
        await waitFor(() => {
            expect(capturedPropertyPanelProps?.nodeData?.createdAt).toBeDefined();
            expect(capturedPropertyPanelProps?.nodeData?.updatedAt).toBeDefined();
        });
    });

    it('should preserve existing timestamps', async () => {
        const existingCreatedAt = '2025-12-25T10:00:00.000Z';
        const existingUpdatedAt = '2025-12-26T15:30:00.000Z';
        const existingCreator = 'Original Creator';

        const setDataMock = vi.fn();
        const x6Node = {
            id: 'node-1',
            isNode: () => true,
            getData: vi.fn(() => ({
                label: 'Node with timestamps',
                nodeType: NodeType.TASK,
                props: { status: 'todo' },
                tags: [],
                createdAt: existingCreatedAt,
                updatedAt: existingUpdatedAt,
                creator: existingCreator,
            })),
            setData: setDataMock,
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
            label: 'Node with timestamps',
            type: NodeType.TASK,
            x: 0,
            y: 0,
            width: 120,
            height: 50,
            graphId: 'g1',
            createdAt: existingCreatedAt,
            updatedAt: existingUpdatedAt,
            creator: existingCreator,
            props: { status: 'todo' },
            tags: [],
            isArchived: false,
            archivedAt: null,
        });

        render(<RightSidebar selectedNodeId="node-1" graph={graph as unknown as Graph} graphId="g1" yDoc={null} />);

        // Verify nodeData preserves existing timestamps
        await waitFor(() => {
            expect(capturedPropertyPanelProps?.nodeData?.createdAt).toBe(existingCreatedAt);
            expect(capturedPropertyPanelProps?.nodeData?.updatedAt).toBe(existingUpdatedAt);
            expect(capturedPropertyPanelProps?.nodeData?.creator).toBe(existingCreator);
        });
    });

    it('should use creatorName prop when no creator exists', async () => {
        const customCreatorName = 'Custom Creator';

        const setDataMock = vi.fn();
        const x6Node = {
            id: 'node-1',
            isNode: () => true,
            getData: vi.fn(() => ({
                label: 'Node without creator',
                nodeType: NodeType.ORDINARY,
                props: {},
                tags: [],
                // No creator
            })),
            setData: setDataMock,
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
            label: 'Node without creator',
            type: NodeType.ORDINARY,
            x: 0,
            y: 0,
            width: 120,
            height: 50,
            graphId: 'g1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            creator: customCreatorName,
            props: {},
            tags: [],
            isArchived: false,
            archivedAt: null,
        });

        render(
            <RightSidebar
                selectedNodeId="node-1"
                graph={graph as unknown as Graph}
                graphId="g1"
                yDoc={null}
                creatorName={customCreatorName}
            />
        );

        // Verify creator is set to the provided creatorName
        await waitFor(() => {
            expect(capturedPropertyPanelProps?.nodeData?.creator).toBe(customCreatorName);
        });
    });

    it('should use DEFAULT_CREATOR_NAME when no creatorName prop provided', async () => {
        const setDataMock = vi.fn();
        const x6Node = {
            id: 'node-1',
            isNode: () => true,
            getData: vi.fn(() => ({
                label: 'Node without creator',
                nodeType: NodeType.ORDINARY,
                props: {},
                tags: [],
                // No creator
            })),
            setData: setDataMock,
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
            label: 'Node without creator',
            type: NodeType.ORDINARY,
            x: 0,
            y: 0,
            width: 120,
            height: 50,
            graphId: 'g1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            creator: DEFAULT_CREATOR_NAME,
            props: {},
            tags: [],
            isArchived: false,
            archivedAt: null,
        });

        render(
            <RightSidebar
                selectedNodeId="node-1"
                graph={graph as unknown as Graph}
                graphId="g1"
                yDoc={null}
            // No creatorName prop
            />
        );

        // Verify creator falls back to DEFAULT_CREATOR_NAME
        await waitFor(() => {
            expect(capturedPropertyPanelProps?.nodeData?.creator).toBe(DEFAULT_CREATOR_NAME);
        });
    });

    it('should update timestamps on props change', async () => {
        const originalCreatedAt = '2025-12-25T10:00:00.000Z';
        const originalUpdatedAt = '2025-12-26T15:30:00.000Z';
        const beforeUpdate = Date.now();

        const setDataMock = vi.fn();
        const x6Node = {
            id: 'node-1',
            isNode: () => true,
            getData: vi.fn(() => ({
                label: 'Task',
                nodeType: NodeType.TASK,
                props: { status: 'todo' },
                tags: [],
                createdAt: originalCreatedAt,
                updatedAt: originalUpdatedAt,
                creator: 'Test User',
            })),
            setData: setDataMock,
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
            createdAt: originalCreatedAt,
            updatedAt: originalUpdatedAt,
            creator: 'Test User',
            props: { status: 'todo' },
            tags: [],
            isArchived: false,
            archivedAt: null,
        });

        render(<RightSidebar selectedNodeId="node-1" graph={graph as unknown as Graph} graphId="g1" yDoc={null} />);

        await waitFor(() => {
            expect(capturedPropertyPanelProps?.onPropsUpdate).toBeDefined();
        });

        setDataMock.mockClear();

        // Trigger props update
        await act(async () => {
            capturedPropertyPanelProps!.onPropsUpdate!('node-1', NodeType.TASK, { status: 'done' });
        });

        // Verify setData was called with overwrite mode and updated timestamp
        await waitFor(() => {
            expect(setDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    createdAt: originalCreatedAt, // createdAt should not change
                }),
                { overwrite: true }
            );
        });

        // Verify updatedAt is recent (after beforeUpdate)
        const lastCall = setDataMock.mock.calls[setDataMock.mock.calls.length - 1];
        const updatedAtInCall = lastCall[0].updatedAt;
        expect(new Date(updatedAtInCall).getTime()).toBeGreaterThanOrEqual(beforeUpdate);

        // Verify nodeData reflects the update
        await waitFor(() => {
            expect(capturedPropertyPanelProps?.nodeData?.createdAt).toBe(originalCreatedAt);
        });
    });
});
