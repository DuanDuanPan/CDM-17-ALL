/**
 * Story 8.4: Component tests for OutlineItem
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OutlineItem } from '../../components/graph/parts/OutlineItem';
import type { OutlineNode } from '../../components/graph/hooks/useOutlineData';

describe('OutlineItem', () => {
    const mockOnClick = vi.fn();
    const mockOnToggle = vi.fn();
    const mockOnDragStart = vi.fn();
    const mockOnDragOver = vi.fn();
    const mockOnDrop = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createTestNode = (overrides: Partial<OutlineNode> = {}): OutlineNode => ({
        id: 'test-node',
        label: 'Test Node',
        type: 'topic',
        hasChildren: false,
        depth: 0,
        children: [],
        ...overrides,
    });

    const renderItem = (node: OutlineNode, props: Partial<Parameters<typeof OutlineItem>[0]> = {}) => {
        return render(
            <OutlineItem
                node={node}
                isSelected={false}
                isExpanded={true}
                onClick={mockOnClick}
                onToggle={mockOnToggle}
                onDragStart={mockOnDragStart}
                onDragOver={mockOnDragOver}
                onDrop={mockOnDrop}
                dragOverId={null}
                {...props}
            />
        );
    };

    describe('rendering', () => {
        it('should render with correct testid', () => {
            renderItem(createTestNode({ id: 'my-node' }));

            expect(screen.getByTestId('outline-item-my-node')).toBeTruthy();
        });

        it('should render node label', () => {
            renderItem(createTestNode({ label: 'My Label' }));

            expect(screen.getByText('My Label')).toBeTruthy();
        });

        it('should apply correct indentation based on depth', () => {
            const { container } = renderItem(createTestNode({ depth: 2 }));

            const item = container.firstElementChild as HTMLElement;
            // depth=2 should have paddingLeft = 2 * 20 + 8 = 48px
            expect(item.style.paddingLeft).toBe('48px');
        });

        it('should show chevron for nodes with children', () => {
            renderItem(createTestNode({ hasChildren: true }));

            const button = screen.getByRole('button');
            expect(button).toBeTruthy();
        });

        it('should not show chevron for leaf nodes', () => {
            renderItem(createTestNode({ hasChildren: false }));

            expect(screen.queryByRole('button')).toBeNull();
        });
    });

    describe('selection state', () => {
        it('should have blue background when selected', () => {
            renderItem(createTestNode(), { isSelected: true });

            const item = screen.getByTestId('outline-item-test-node');
            expect(item.className).toContain('bg-blue-50');
        });

        it('should not have blue background when not selected', () => {
            renderItem(createTestNode(), { isSelected: false });

            const item = screen.getByTestId('outline-item-test-node');
            expect(item.className).not.toContain('bg-blue-50');
        });
    });

    describe('drag indicator', () => {
        it('should show drag indicator when being dragged over', () => {
            renderItem(createTestNode({ id: 'target' }), { dragOverId: 'target', dropPosition: 'above' });

            const item = screen.getByTestId('outline-item-target');
            expect(item.className).toContain('border-t-2');
            expect(item.className).toContain('border-blue-500');
        });

        it('should show bottom border when drop position is below', () => {
            renderItem(createTestNode({ id: 'target' }), { dragOverId: 'target', dropPosition: 'below' });

            const item = screen.getByTestId('outline-item-target');
            expect(item.className).toContain('border-b-2');
            expect(item.className).toContain('border-blue-500');
        });

        it('should show ring highlight when drop position is inside', () => {
            renderItem(createTestNode({ id: 'target' }), { dragOverId: 'target', dropPosition: 'inside' });

            const item = screen.getByTestId('outline-item-target');
            expect(item.className).toContain('ring-2');
            expect(item.className).toContain('ring-blue-400');
        });
    });

    describe('interactions', () => {
        it('should call onClick when item is clicked', () => {
            renderItem(createTestNode({ id: 'click-node' }));

            fireEvent.click(screen.getByTestId('outline-item-click-node'));

            expect(mockOnClick).toHaveBeenCalledWith('click-node');
        });

        it('should call onToggle when chevron is clicked', () => {
            renderItem(createTestNode({ id: 'toggle-node', hasChildren: true }));

            const chevronButton = screen.getByRole('button');
            fireEvent.click(chevronButton);

            expect(mockOnToggle).toHaveBeenCalledWith('toggle-node');
            // Should not trigger onClick
            expect(mockOnClick).not.toHaveBeenCalled();
        });

        it('should call onDragStart when drag begins', () => {
            renderItem(createTestNode({ id: 'drag-node' }));

            const item = screen.getByTestId('outline-item-drag-node');
            const mockEvent = {
                dataTransfer: {
                    effectAllowed: 'move',
                    setData: vi.fn(),
                },
            } as unknown as React.DragEvent;

            fireEvent.dragStart(item, mockEvent);

            expect(mockOnDragStart).toHaveBeenCalled();
        });

        it('should call onDragOver when dragged over', () => {
            renderItem(createTestNode({ id: 'over-node' }));

            const item = screen.getByTestId('outline-item-over-node');
            fireEvent.dragOver(item);

            expect(mockOnDragOver).toHaveBeenCalled();
        });

        it('should call onDrop when item is dropped', () => {
            renderItem(createTestNode({ id: 'drop-node' }));

            const item = screen.getByTestId('outline-item-drop-node');
            fireEvent.drop(item);

            expect(mockOnDrop).toHaveBeenCalled();
        });
    });

    describe('chevron icon', () => {
        it('should show ChevronDown when expanded', () => {
            renderItem(createTestNode({ hasChildren: true }), { isExpanded: true });

            const button = screen.getByRole('button');
            expect(button.getAttribute('aria-label')).toBe('折叠');
        });

        it('should show ChevronRight when collapsed', () => {
            renderItem(createTestNode({ hasChildren: true }), { isExpanded: false });

            const button = screen.getByRole('button');
            expect(button.getAttribute('aria-label')).toBe('展开');
        });
    });
});
