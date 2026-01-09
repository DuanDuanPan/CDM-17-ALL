import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Graph } from '@antv/x6';
import { useGraphHotkeys } from '../../components/graph/hooks/useGraphHotkeys';

vi.mock('@cdm/plugin-mindmap-core', () => {
    class AddChildCommand {
        execute() {
            return null;
        }
    }
    class AddSiblingCommand {
        execute() {
            return null;
        }
    }
    class NavigationCommand {
        navigateByArrowKey() {
            return null;
        }
    }

    return { AddChildCommand, AddSiblingCommand, NavigationCommand };
});

function createMockGraph(): Graph {
    return {
        getSelectedCells: vi.fn(() => []),
        canUndo: vi.fn(() => false),
        canRedo: vi.fn(() => false),
        undo: vi.fn(),
        redo: vi.fn(),
    } as unknown as Graph;
}

describe('useGraphHotkeys', () => {
    it('toggles minimap when IME reports key as "Process" (uses code fallback)', () => {
        const onToggleMinimap = vi.fn();

        const { result } = renderHook(() =>
            useGraphHotkeys({
                graph: createMockGraph(),
                isReady: true,
                currentLayout: 'mindmap',
                selectedEdge: null,
                setSelectedEdge: vi.fn(),
                connectionStartNode: null,
                setConnectionStartNode: vi.fn(),
                isDependencyMode: false,
                removeEdge: vi.fn(),
                onToggleMinimap,
            })
        );

        const preventDefault = vi.fn();
        const stopPropagation = vi.fn();

        act(() => {
            result.current.handleKeyDown({
                key: 'Process',
                code: 'KeyM',
                ctrlKey: false,
                metaKey: false,
                altKey: false,
                shiftKey: false,
                target: document.createElement('div'),
                preventDefault,
                stopPropagation,
            } as unknown as React.KeyboardEvent);
        });

        expect(onToggleMinimap).toHaveBeenCalledTimes(1);
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(stopPropagation).not.toHaveBeenCalled();
    });

    it('does not toggle minimap when typing in an input', () => {
        const onToggleMinimap = vi.fn();

        const { result } = renderHook(() =>
            useGraphHotkeys({
                graph: createMockGraph(),
                isReady: true,
                currentLayout: 'mindmap',
                selectedEdge: null,
                setSelectedEdge: vi.fn(),
                connectionStartNode: null,
                setConnectionStartNode: vi.fn(),
                isDependencyMode: false,
                removeEdge: vi.fn(),
                onToggleMinimap,
            })
        );

        const preventDefault = vi.fn();

        act(() => {
            result.current.handleKeyDown({
                key: 'Process',
                code: 'KeyM',
                ctrlKey: false,
                metaKey: false,
                altKey: false,
                shiftKey: false,
                target: document.createElement('input'),
                preventDefault,
            } as unknown as React.KeyboardEvent);
        });

        expect(onToggleMinimap).not.toHaveBeenCalled();
        expect(preventDefault).not.toHaveBeenCalled();
    });
});

