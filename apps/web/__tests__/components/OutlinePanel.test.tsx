/**
 * Story 8.4: Component tests for OutlinePanel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OutlinePanel } from '../../components/graph/parts/OutlinePanel';
import type { OutlineNode } from '../../components/graph/hooks/useOutlineData';

describe('OutlinePanel', () => {
    const mockOnNodeClick = vi.fn();
    const mockOnReorder = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createTestData = (): OutlineNode[] => [
        {
            id: 'root-1',
            label: 'Root Node 1',
            type: 'topic',
            hasChildren: true,
            depth: 0,
            children: [
                {
                    id: 'child-1',
                    label: 'Child 1',
                    type: 'task',
                    hasChildren: false,
                    depth: 1,
                    children: [],
                },
                {
                    id: 'child-2',
                    label: 'Child 2',
                    type: 'topic',
                    hasChildren: false,
                    depth: 1,
                    children: [],
                },
            ],
        },
        {
            id: 'root-2',
            label: 'Root Node 2',
            type: 'pbs',
            hasChildren: false,
            depth: 0,
            children: [],
        },
    ];

    describe('rendering', () => {
        it('should render empty state when no data', () => {
            render(
                <OutlinePanel
                    data={[]}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            expect(screen.getByText('暂无节点')).toBeTruthy();
        });

        it('should render outline-panel with testid', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            expect(screen.getByTestId('outline-panel')).toBeTruthy();
        });

        it('should render all nodes in tree structure', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            expect(screen.getByText('Root Node 1')).toBeTruthy();
            expect(screen.getByText('Root Node 2')).toBeTruthy();
            expect(screen.getByText('Child 1')).toBeTruthy();
            expect(screen.getByText('Child 2')).toBeTruthy();
        });

        it('should render item testids correctly', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            expect(screen.getByTestId('outline-item-root-1')).toBeTruthy();
            expect(screen.getByTestId('outline-item-root-2')).toBeTruthy();
            expect(screen.getByTestId('outline-item-child-1')).toBeTruthy();
        });
    });

    describe('selection', () => {
        it('should highlight selected node', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId="child-1"
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            const selectedItem = screen.getByTestId('outline-item-child-1');
            expect(selectedItem.className).toContain('bg-blue-50');
        });

        it('should call onNodeClick when node is clicked', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            fireEvent.click(screen.getByTestId('outline-item-child-1'));

            expect(mockOnNodeClick).toHaveBeenCalledWith('child-1');
        });
    });

    describe('collapse/expand', () => {
        it('should hide children when parent is collapsed', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            // Initially children should be visible
            expect(screen.getByText('Child 1')).toBeTruthy();

            // Find and click the collapse button (chevron)
            const parentItem = screen.getByTestId('outline-item-root-1');
            const collapseButton = parentItem.querySelector('button');
            expect(collapseButton).toBeTruthy();

            fireEvent.click(collapseButton!);

            // Children should be hidden
            expect(screen.queryByText('Child 1')).toBeNull();
        });

        it('should show children when parent is expanded', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            const parentItem = screen.getByTestId('outline-item-root-1');
            const collapseButton = parentItem.querySelector('button');

            // Collapse
            fireEvent.click(collapseButton!);
            expect(screen.queryByText('Child 1')).toBeNull();

            // Expand again
            fireEvent.click(collapseButton!);
            expect(screen.getByText('Child 1')).toBeTruthy();
        });
    });

    describe('drag and drop', () => {
        it('should set dragged node opacity when dragging', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            const dragItem = screen.getByTestId('outline-item-child-1');
            fireEvent.dragStart(dragItem, {
                dataTransfer: {
                    effectAllowed: 'move',
                    setData: vi.fn(),
                } as unknown as DataTransfer,
            });

            // Parent div should have opacity class
            const wrapper = dragItem.parentElement;
            expect(wrapper?.className).toContain('opacity-50');
        });

        it('should call onReorder when item is dropped', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            const dragItem = screen.getByTestId('outline-item-child-1');
            const dropTarget = screen.getByTestId('outline-item-root-2');

            // Start drag
            fireEvent.dragStart(dragItem, {
                dataTransfer: {
                    effectAllowed: 'move',
                    setData: vi.fn(),
                } as unknown as DataTransfer,
            });

            // Drop on target
            fireEvent.drop(dropTarget, {
                dataTransfer: {
                    dropEffect: 'move',
                    getData: () => 'child-1',
                } as unknown as DataTransfer,
            });

            expect(mockOnReorder).toHaveBeenCalledWith('child-1', 'root-2', 0);
        });

        it('should not reorder when dropping on itself', () => {
            render(
                <OutlinePanel
                    data={createTestData()}
                    selectedNodeId={null}
                    onNodeClick={mockOnNodeClick}
                    onReorder={mockOnReorder}
                />
            );

            const dragItem = screen.getByTestId('outline-item-child-1');

            fireEvent.dragStart(dragItem, {
                dataTransfer: {
                    effectAllowed: 'move',
                    setData: vi.fn(),
                } as unknown as DataTransfer,
            });

            fireEvent.drop(dragItem, {
                dataTransfer: {
                    dropEffect: 'move',
                    getData: () => 'child-1',
                } as unknown as DataTransfer,
            });

            expect(mockOnReorder).not.toHaveBeenCalled();
        });
    });
});
