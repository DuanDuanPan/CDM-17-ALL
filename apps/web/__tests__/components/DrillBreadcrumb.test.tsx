'use client';

/**
 * Story 8.9: DrillBreadcrumb Component Tests
 *
 * Tests cover:
 * - Rendering behavior (visibility when in/out of drill mode)
 * - Breadcrumb item display and labels
 * - Navigation callbacks (Home, path items)
 * - Accessibility attributes
 * - Glassmorphic styling
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DrillBreadcrumb } from '@/components/graph/parts/DrillBreadcrumb';
import type { Graph, Node } from '@antv/x6';

// Mock graph instance
const createMockGraph = (nodeData: Record<string, { label?: string; title?: string }> = {}) => {
    const mockGraph = {
        getCellById: vi.fn((id: string) => {
            const data = nodeData[id];
            if (!data) return null;
            return {
                isNode: () => true,
                getData: () => data,
            } as unknown as Node;
        }),
    } as unknown as Graph;
    return mockGraph;
};

describe('DrillBreadcrumb', () => {
    const defaultProps = {
        drillPath: [],
        isDrillMode: false,
        graph: null,
        onNavigate: vi.fn(),
        onNavigateToRoot: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ----------------------------------------------------------
    // Visibility Tests
    // ----------------------------------------------------------
    describe('Visibility', () => {
        it('does not render when not in drill mode', () => {
            render(<DrillBreadcrumb {...defaultProps} isDrillMode={false} />);

            expect(screen.queryByTestId('drill-breadcrumb')).toBeNull();
        });

        it('renders when in drill mode', () => {
            const mockGraph = createMockGraph({ node1: { label: 'Node 1' } });
            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={mockGraph}
                />
            );

            expect(screen.getByTestId('drill-breadcrumb')).toBeTruthy();
        });

        it('renders with empty path when isDrillMode is true (shows only Home)', () => {
            render(<DrillBreadcrumb {...defaultProps} isDrillMode={true} drillPath={[]} />);

            // When isDrillMode is true but path is empty, it still renders (just Home button)
            // The component only returns null when isDrillMode is false
            expect(screen.getByTestId('drill-breadcrumb')).toBeTruthy();
            expect(screen.getByTitle('返回主视图')).toBeTruthy();
        });
    });

    // ----------------------------------------------------------
    // Breadcrumb Item Display Tests
    // ----------------------------------------------------------
    describe('Breadcrumb Items', () => {
        it('displays node labels from graph data', () => {
            const mockGraph = createMockGraph({
                node1: { label: 'First Node' },
                node2: { label: 'Second Node' },
            });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1', 'node2']}
                    graph={mockGraph}
                />
            );

            expect(screen.getByText('First Node')).toBeTruthy();
            expect(screen.getByText('Second Node')).toBeTruthy();
        });

        it('uses title as fallback when label is not available', () => {
            const mockGraph = createMockGraph({
                node1: { title: 'Title Only' },
            });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={mockGraph}
                />
            );

            expect(screen.getByText('Title Only')).toBeTruthy();
        });

        it('uses node ID as fallback when no label or title', () => {
            const mockGraph = createMockGraph({
                'unique-node-id': {},
            });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['unique-node-id']}
                    graph={mockGraph}
                />
            );

            expect(screen.getByText('unique-node-id')).toBeTruthy();
        });

        it('falls back to node ID when node not found in graph', () => {
            const mockGraph = createMockGraph({}); // Empty - no nodes

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['missing-node']}
                    graph={mockGraph}
                />
            );

            expect(screen.getByText('missing-node')).toBeTruthy();
        });

        it('handles null graph by showing Home button only (no path items)', () => {
            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={null}
                />
            );

            // Component renders with just Home button when graph is null
            // Path items are not shown because breadcrumbItems returns [] when graph is null
            expect(screen.getByTestId('drill-breadcrumb')).toBeTruthy();
            expect(screen.getByTitle('返回主视图')).toBeTruthy();
            // node1 should not be displayed as text since graph is null
            expect(screen.queryByText('node1')).toBeNull();
        });
    });

    // ----------------------------------------------------------
    // Navigation Tests
    // ----------------------------------------------------------
    describe('Navigation', () => {
        it('calls onNavigateToRoot when Home button is clicked', () => {
            const onNavigateToRoot = vi.fn();
            const mockGraph = createMockGraph({ node1: { label: 'Node 1' } });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={mockGraph}
                    onNavigateToRoot={onNavigateToRoot}
                />
            );

            const homeButton = screen.getByTitle('返回主视图');
            fireEvent.click(homeButton);

            expect(onNavigateToRoot).toHaveBeenCalledTimes(1);
        });

        it('calls onNavigate with correct path when intermediate item is clicked', () => {
            const onNavigate = vi.fn();
            const mockGraph = createMockGraph({
                node1: { label: 'First' },
                node2: { label: 'Second' },
                node3: { label: 'Third' },
            });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1', 'node2', 'node3']}
                    graph={mockGraph}
                    onNavigate={onNavigate}
                />
            );

            // Click on "First" (first intermediate item)
            const firstButton = screen.getByTitle('返回 First');
            fireEvent.click(firstButton);

            expect(onNavigate).toHaveBeenCalledWith(['node1']);
        });

        it('does not trigger navigation when clicking the last (current) item', () => {
            const onNavigate = vi.fn();
            const mockGraph = createMockGraph({
                node1: { label: 'Current Node' },
            });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={mockGraph}
                    onNavigate={onNavigate}
                />
            );

            // The last item should be a span, not a button
            const currentItem = screen.getByText('Current Node');
            expect(currentItem.tagName).toBe('SPAN');

            // Clicking should not trigger navigation
            fireEvent.click(currentItem);
            expect(onNavigate).not.toHaveBeenCalled();
        });

        it('correctly builds partial paths for navigation', () => {
            const onNavigate = vi.fn();
            const mockGraph = createMockGraph({
                node1: { label: 'Level 1' },
                node2: { label: 'Level 2' },
                node3: { label: 'Level 3' },
            });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1', 'node2', 'node3']}
                    graph={mockGraph}
                    onNavigate={onNavigate}
                />
            );

            // Click on "Level 2" (second intermediate item)
            const level2Button = screen.getByTitle('返回 Level 2');
            fireEvent.click(level2Button);

            expect(onNavigate).toHaveBeenCalledWith(['node1', 'node2']);
        });
    });

    // ----------------------------------------------------------
    // Accessibility Tests
    // ----------------------------------------------------------
    describe('Accessibility', () => {
        it('has navigation role with correct aria-label', () => {
            const mockGraph = createMockGraph({ node1: { label: 'Node 1' } });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={mockGraph}
                />
            );

            const nav = screen.getByTestId('drill-breadcrumb');
            expect(nav.tagName).toBe('NAV');
            expect(nav.getAttribute('aria-label')).toBe('下钻导航路径');
        });

        it('Home button has proper aria-label', () => {
            const mockGraph = createMockGraph({ node1: { label: 'Node 1' } });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={mockGraph}
                />
            );

            const homeButton = screen.getByLabelText('返回主视图');
            expect(homeButton).toBeTruthy();
        });
    });

    // ----------------------------------------------------------
    // Styling Tests
    // ----------------------------------------------------------
    describe('Styling', () => {
        it('applies Glassmorphic styling classes', () => {
            const mockGraph = createMockGraph({ node1: { label: 'Node 1' } });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={mockGraph}
                />
            );

            const nav = screen.getByTestId('drill-breadcrumb');

            // Check for key Glassmorphic classes
            expect(nav.className).toContain('backdrop-blur-md');
            expect(nav.className).toContain('z-50');
        });

        it('truncates long labels with max-width', () => {
            const mockGraph = createMockGraph({
                node1: { label: 'This is a very long label that should be truncated' },
            });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={mockGraph}
                />
            );

            const lastItem = screen.getByText(
                'This is a very long label that should be truncated'
            );
            expect(lastItem.className).toContain('truncate');
        });
    });

    // ----------------------------------------------------------
    // Edge Cases
    // ----------------------------------------------------------
    describe('Edge Cases', () => {
        it('handles single-item path correctly', () => {
            const mockGraph = createMockGraph({ node1: { label: 'Only Node' } });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['node1']}
                    graph={mockGraph}
                />
            );

            // Should show Home and one item
            expect(screen.getByTitle('返回主视图')).toBeTruthy();
            expect(screen.getByText('Only Node')).toBeTruthy();

            // The single item should not be clickable (it's the current one)
            const onlyNode = screen.getByText('Only Node');
            expect(onlyNode.tagName).toBe('SPAN');
        });

        it('handles deeply nested paths', () => {
            const mockGraph = createMockGraph({
                n1: { label: 'L1' },
                n2: { label: 'L2' },
                n3: { label: 'L3' },
                n4: { label: 'L4' },
                n5: { label: 'L5' },
            });

            render(
                <DrillBreadcrumb
                    {...defaultProps}
                    isDrillMode={true}
                    drillPath={['n1', 'n2', 'n3', 'n4', 'n5']}
                    graph={mockGraph}
                />
            );

            // Overflow behavior: collapse middle items into "..." when path > 4
            expect(screen.getByText('L1')).toBeTruthy();
            expect(screen.getByText('...')).toBeTruthy();
            expect(screen.getByText('L4')).toBeTruthy();
            expect(screen.getByText('L5')).toBeTruthy();
            expect(screen.queryByText('L2')).toBeNull();
            expect(screen.queryByText('L3')).toBeNull();

            // L1 and L4 should be clickable, L5 should not (it's current)
            expect(screen.getByTitle('返回 L1')).toBeTruthy();
            expect(screen.getByTitle('返回 L4')).toBeTruthy();
            expect(screen.queryByTitle('返回 L5')).toBeNull();
        });
    });
});
