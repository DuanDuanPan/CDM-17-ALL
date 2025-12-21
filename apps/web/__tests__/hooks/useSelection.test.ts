/**
 * Story 2.6: Multi-Select & Clipboard
 * Unit tests for useSelection hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '@/hooks/useSelection';

// Mock X6 Graph
const createMockGraph = () => {
    const selectedCells: any[] = [];
    const nodes = [
        { id: 'node-1', isNode: () => true },
        { id: 'node-2', isNode: () => true },
        { id: 'node-3', isNode: () => true },
    ];
    const listeners: Record<string, Function[]> = {};

    return {
        on: vi.fn((event: string, handler: Function) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(handler);
        }),
        off: vi.fn((event: string, handler: Function) => {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(h => h !== handler);
            }
        }),
        getSelectedCells: vi.fn(() => selectedCells),
        select: vi.fn((cells: any[]) => {
            selectedCells.length = 0;
            selectedCells.push(...(Array.isArray(cells) ? cells : [cells]));
            // Trigger selection:changed event
            listeners['selection:changed']?.forEach(h => h({
                added: cells,
                removed: [],
                selected: selectedCells,
            }));
        }),
        unselect: vi.fn((cells: any[]) => {
            const toRemove = Array.isArray(cells) ? cells : [cells];
            toRemove.forEach(cell => {
                const idx = selectedCells.findIndex(c => c.id === cell.id);
                if (idx !== -1) selectedCells.splice(idx, 1);
            });
            // Trigger selection:changed event
            listeners['selection:changed']?.forEach(h => h({
                added: [],
                removed: toRemove,
                selected: selectedCells,
            }));
        }),
        getNodes: vi.fn(() => nodes),
        getCellById: vi.fn((id: string) => nodes.find(n => n.id === id)),
        isSelected: vi.fn((cell: any) => selectedCells.some(c => c.id === cell.id)),
        _emit: (event: string, payload: any) => {
            listeners[event]?.forEach(h => h(payload));
        },
    };
};

describe('useSelection', () => {
    let mockGraph: ReturnType<typeof createMockGraph>;

    beforeEach(() => {
        mockGraph = createMockGraph();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should return empty selection when no nodes selected', () => {
            const { result } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            expect(result.current.selectedNodes).toEqual([]);
            expect(result.current.selectedNodeIds).toEqual([]);
            expect(result.current.selectionCount).toBe(0);
            expect(result.current.hasSelection).toBe(false);
        });

        it('should register selection:changed listener on mount', () => {
            renderHook(() => useSelection({ graph: mockGraph as any }));

            expect(mockGraph.on).toHaveBeenCalledWith(
                'selection:changed',
                expect.any(Function)
            );
        });

        it('should unregister listener on unmount', () => {
            const { unmount } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            unmount();

            expect(mockGraph.off).toHaveBeenCalledWith(
                'selection:changed',
                expect.any(Function)
            );
        });
    });

    describe('selectAll', () => {
        it('should select all nodes in the graph', () => {
            const { result } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            act(() => {
                result.current.selectAll();
            });

            expect(mockGraph.getNodes).toHaveBeenCalled();
            expect(mockGraph.select).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ id: 'node-1' }),
                    expect.objectContaining({ id: 'node-2' }),
                    expect.objectContaining({ id: 'node-3' }),
                ])
            );
        });
    });

    describe('clearSelection', () => {
        it('should clear all selected nodes', () => {
            const { result } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            // First select some nodes
            act(() => {
                result.current.selectAll();
            });

            // Then clear
            act(() => {
                result.current.clearSelection();
            });

            expect(mockGraph.unselect).toHaveBeenCalled();
        });
    });

    describe('selectNodes', () => {
        it('should select specific nodes by ID', () => {
            const { result } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            act(() => {
                result.current.selectNodes(['node-1', 'node-3']);
            });

            expect(mockGraph.unselect).toHaveBeenCalled(); // Clear first
            expect(mockGraph.select).toHaveBeenCalled();
        });

        it('should handle non-existent node IDs gracefully', () => {
            const { result } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            act(() => {
                result.current.selectNodes(['non-existent']);
            });

            // Should not throw
            expect(mockGraph.getCellById).toHaveBeenCalledWith('non-existent');
        });
    });

    describe('addToSelection', () => {
        it('should add node to existing selection', () => {
            const { result } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            act(() => {
                result.current.addToSelection('node-1');
            });

            expect(mockGraph.getCellById).toHaveBeenCalledWith('node-1');
            expect(mockGraph.select).toHaveBeenCalled();
        });
    });

    describe('removeFromSelection', () => {
        it('should remove node from selection', () => {
            const { result } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            act(() => {
                result.current.removeFromSelection('node-1');
            });

            expect(mockGraph.getCellById).toHaveBeenCalledWith('node-1');
            expect(mockGraph.unselect).toHaveBeenCalled();
        });
    });

    describe('toggleSelection', () => {
        it('should add node if not selected', () => {
            mockGraph.isSelected.mockReturnValue(false);

            const { result } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            act(() => {
                result.current.toggleSelection('node-1');
            });

            expect(mockGraph.select).toHaveBeenCalled();
        });

        it('should remove node if already selected', () => {
            mockGraph.isSelected.mockReturnValue(true);

            const { result } = renderHook(() =>
                useSelection({ graph: mockGraph as any })
            );

            act(() => {
                result.current.toggleSelection('node-1');
            });

            expect(mockGraph.unselect).toHaveBeenCalled();
        });
    });

    describe('null graph handling', () => {
        it('should handle null graph gracefully', () => {
            const { result } = renderHook(() =>
                useSelection({ graph: null })
            );

            expect(result.current.selectedNodes).toEqual([]);
            expect(result.current.hasSelection).toBe(false);

            // Operations should not throw
            act(() => {
                result.current.selectAll();
                result.current.clearSelection();
                result.current.selectNodes(['node-1']);
            });
        });
    });
});
