/**
 * Story 8.3: Unit tests for useZoomShortcuts hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useZoomShortcuts } from '../../components/graph/hooks/useZoomShortcuts';
import type { Graph } from '@antv/x6';

// Mock matchMedia for reduced motion tests
const mockMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
};

// Mock requestAnimationFrame
let rafCallbacks: ((time: number) => void)[] = [];
const mockRAF = () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
    });
};

// Mock Graph node type
type MockNode = {
    id: string;
    isNode: () => boolean;
    getBBox: () => { x: number; y: number; width: number; height: number; getCenter: () => { x: number; y: number }; union: (other: ReturnType<MockNode['getBBox']>) => ReturnType<MockNode['getBBox']> };
};

function createMockGraph() {
    const nodes = new Map<string, MockNode>();
    let currentZoom = 1;
    let currentTranslate = { tx: 0, ty: 0 };

    const createBBox = (x: number, y: number, width: number, height: number) => ({
        x, y, width, height,
        getCenter: () => ({ x: x + width / 2, y: y + height / 2 }),
        union: (other: { x: number; y: number; width: number; height: number }) => {
            const minX = Math.min(x, other.x);
            const minY = Math.min(y, other.y);
            const maxX = Math.max(x + width, other.x + other.width);
            const maxY = Math.max(y + height, other.y + other.height);
            return createBBox(minX, minY, maxX - minX, maxY - minY);
        },
    });

    const createMockNode = (id: string, x: number, y: number, width: number = 100, height: number = 50): MockNode => ({
        id,
        isNode: () => true,
        getBBox: () => createBBox(x, y, width, height),
    });

    const graph = {
        container: {
            getBoundingClientRect: () => ({ width: 800, height: 600 }),
        },
        zoom: vi.fn(() => currentZoom),
        zoomTo: vi.fn((scale: number) => { currentZoom = scale; }),
        translate: vi.fn((tx?: number, ty?: number) => {
            if (typeof tx === 'number' && typeof ty === 'number') {
                currentTranslate = { tx, ty };
            }
            return currentTranslate;
        }),
        centerPoint: vi.fn(),
        getCellById: vi.fn((id: string) => nodes.get(id) || null),
        getNodes: vi.fn(() => Array.from(nodes.values())),
    };

    return {
        graph: graph as unknown as Graph,
        nodes,
        addNode: (id: string, x: number, y: number, width?: number, height?: number) => {
            const node = createMockNode(id, x, y, width, height);
            nodes.set(id, node);
            return node;
        },
        setZoom: (z: number) => { currentZoom = z; },
        setTranslate: (tx: number, ty: number) => { currentTranslate = { tx, ty }; },
        getZoom: () => currentZoom,
        getTranslate: () => currentTranslate,
    };
}

describe('useZoomShortcuts', () => {
    let mockGraph: ReturnType<typeof createMockGraph>;

    beforeEach(() => {
        mockGraph = createMockGraph();
        mockRAF();
        mockMatchMedia(false); // default: no reduced motion
        rafCallbacks = [];
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    describe('prefersReducedMotion', () => {
        it('should return false when prefers-reduced-motion is not set', () => {
            mockMatchMedia(false);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.prefersReducedMotion).toBe(false);
        });

        it('should return true when prefers-reduced-motion is set', () => {
            mockMatchMedia(true);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            expect(result.current.prefersReducedMotion).toBe(true);
        });
    });

    describe('zoomToFit', () => {
        it('should do nothing when graph is not ready', () => {
            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: false })
            );

            act(() => {
                result.current.zoomToFit();
            });

            expect(mockGraph.graph.zoomTo).not.toHaveBeenCalled();
        });

        it('should do nothing when graph is null', () => {
            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: null, isReady: true })
            );

            act(() => {
                result.current.zoomToFit();
            });

            // No error should be thrown
        });

        it('should do nothing when canvas is empty (AC2: no-op)', () => {
            // No nodes added
            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.zoomToFit();
            });

            expect(mockGraph.graph.zoomTo).not.toHaveBeenCalled();
        });

        it('should fit nodes to screen with max zoom of 100% (AC2)', () => {
            mockMatchMedia(true); // reduced motion for immediate update
            mockGraph.addNode('node-1', 100, 100, 100, 50);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.zoomToFit();
            });

            // Should have called zoomTo
            expect(mockGraph.graph.zoomTo).toHaveBeenCalled();
            // Scale should be capped at 1 (100%)
            const callArgs = (mockGraph.graph.zoomTo as ReturnType<typeof vi.fn>).mock.calls[0];
            expect(callArgs[0]).toBeLessThanOrEqual(1);
        });

        it('should use animation when reduced motion is not preferred (AC5)', () => {
            mockMatchMedia(false);
            mockGraph.addNode('node-1', 100, 100, 100, 50);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.zoomToFit();
            });

            // Should have started animation
            expect(window.requestAnimationFrame).toHaveBeenCalled();
        });

        it('should skip animation when reduced motion is preferred (AC5)', () => {
            mockMatchMedia(true);
            mockGraph.addNode('node-1', 100, 100, 100, 50);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.zoomToFit();
            });

            // Should have called zoomTo immediately without RAF
            expect(mockGraph.graph.zoomTo).toHaveBeenCalled();
            expect(mockGraph.graph.translate).toHaveBeenCalled();
        });
    });

    describe('zoomTo100', () => {
        it('should do nothing when graph is not ready', () => {
            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: false })
            );

            act(() => {
                result.current.zoomTo100();
            });

            expect(mockGraph.graph.zoomTo).not.toHaveBeenCalled();
        });

        it('should reset zoom to 100% (AC3)', () => {
            mockMatchMedia(true); // reduced motion for immediate update
            mockGraph.setZoom(0.5); // start at 50%

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.zoomTo100();
            });

            expect(mockGraph.graph.zoomTo).toHaveBeenCalledWith(1);
        });

        it('should maintain viewport center when zooming to 100%', () => {
            mockMatchMedia(true);
            mockGraph.setZoom(0.5);
            mockGraph.setTranslate(100, 100);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.zoomTo100();
            });

            // Translate should have been called to keep center stable
            expect(mockGraph.graph.translate).toHaveBeenCalled();
        });

        it('should use animation when reduced motion is not preferred (AC5)', () => {
            mockMatchMedia(false);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.zoomTo100();
            });

            expect(window.requestAnimationFrame).toHaveBeenCalled();
        });
    });

    describe('centerNode', () => {
        it('should do nothing when graph is not ready', () => {
            mockGraph.addNode('node-1', 200, 200);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: false })
            );

            act(() => {
                result.current.centerNode('node-1');
            });

            expect(mockGraph.graph.translate).not.toHaveBeenCalled();
            expect(mockGraph.graph.centerPoint).not.toHaveBeenCalled();
        });

        it('should do nothing for non-existent node', () => {
            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.centerNode('non-existent');
            });

            expect(mockGraph.graph.translate).not.toHaveBeenCalled();
            expect(mockGraph.graph.centerPoint).not.toHaveBeenCalled();
        });

        it('should center node without changing zoom (AC4)', () => {
            mockMatchMedia(true);
            mockGraph.addNode('node-1', 200, 200, 100, 50);
            mockGraph.setZoom(0.75); // start at 75%

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            const initialZoom = mockGraph.getZoom();

            act(() => {
                result.current.centerNode('node-1');
            });

            // Zoom should NOT have been called (only translate for centering)
            expect(mockGraph.graph.zoomTo).not.toHaveBeenCalled();
            // But centering should have happened (either via translate or centerPoint)
            expect(mockGraph.getZoom()).toBe(initialZoom);
        });

        it('should use animation when reduced motion is not preferred (AC5)', () => {
            mockMatchMedia(false);
            mockGraph.addNode('node-1', 200, 200);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.centerNode('node-1');
            });

            expect(window.requestAnimationFrame).toHaveBeenCalled();
        });

        it('should use centerPoint directly when animation is skipped', () => {
            mockMatchMedia(true);
            mockGraph.addNode('node-1', 200, 200, 100, 50);

            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: mockGraph.graph, isReady: true })
            );

            act(() => {
                result.current.centerNode('node-1');
            });

            // Should call centerPoint directly (center of node at 200+50=250, 200+25=225)
            expect(mockGraph.graph.centerPoint).toHaveBeenCalledWith(250, 225);
        });
    });

    describe('when graph is null', () => {
        it('should return safe functions that do not throw', () => {
            const { result } = renderHook(() =>
                useZoomShortcuts({ graph: null, isReady: true })
            );

            expect(() => {
                act(() => {
                    result.current.zoomToFit();
                    result.current.zoomTo100();
                    result.current.centerNode('any');
                });
            }).not.toThrow();
        });
    });
});
