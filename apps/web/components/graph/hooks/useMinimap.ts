'use client';

/**
 * Story 8.2: Minimap Navigation Hook
 * Provides minimap functionality using X6 built-in MiniMap plugin (styles via @antv/x6-plugin-minimap)
 * AC: #1 (基础渲染), #2 (视口拖动), #3 (点击定位), #4 (缩略渲染), #5 (选中高亮), #6 (搜索高亮)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { Graph } from '@antv/x6';

export interface UseMinimapOptions {
    graph: Graph | null;
    isReady: boolean;
    containerRef: RefObject<HTMLDivElement | null>;
    enabled?: boolean;
    width?: number;
    height?: number;
    /** Performance guard: max nodes before auto-disabling (default: 1000) */
    maxNodes?: number;
    /** Debounce highlight updates to avoid O(n) redraws (default: 50ms) */
    highlightDebounceMs?: number;
}

export interface UseMinimapReturn {
    isEnabled: boolean;
    toggle: () => void;
    show: () => void;
    hide: () => void;
    highlightNodes: (nodeIds: string[], type: 'selected' | 'search') => void;
    clearHighlights: (type?: 'selected' | 'search') => void;
    /** True if minimap was disabled due to node count exceeding maxNodes */
    isDisabledForPerformance: boolean;
}

// Local highlight state - NOT synced to Yjs
interface HighlightState {
    selected: Set<string>;
    search: Set<string>;
}

type HighlightType = keyof HighlightState;

type MinimapHighlightData = {
    selected?: boolean;
    search?: boolean;
};

function shouldReduceMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function animateTranslateToCenterPoint(graph: Graph, x: number, y: number, durationMs: number): void {
    const reduceMotion = shouldReduceMotion();
    const duration = reduceMotion ? 0 : durationMs;

    // Fallback to immediate if duration is 0 or graph has no container yet
    const container = (graph as unknown as { container?: HTMLElement }).container;
    const rect = container?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;
    if (!width || !height || duration <= 0) {
        graph.centerPoint(x, y);
        return;
    }

    const scale = graph.zoom();
    const start = graph.translate();
    const targetTx = width / 2 - x * scale;
    const targetTy = height / 2 - y * scale;

    const startTime = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
        const t = clamp((now - startTime) / duration, 0, 1);
        const eased = easeOutCubic(t);
        const tx = start.tx + (targetTx - start.tx) * eased;
        const ty = start.ty + (targetTy - start.ty) * eased;
        graph.translate(tx, ty);
        if (t < 1) {
            requestAnimationFrame(step);
        }
    };

    requestAnimationFrame(step);
}

// Get computed CSS variable value with fallback
function getCssVar(varName: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) return fallback;
    // Handle HSL format: "240 10% 3.9%" -> "hsl(240, 10%, 3.9%)"
    if (/^\d/.test(value) && value.includes('%')) {
        return `hsl(${value.replace(/\s+/g, ', ')})`;
    }
    return value;
}

// Factory function to create MinimapNodeView class dynamically after NodeView is loaded
// This is necessary for SSR compatibility since NodeView is browser-only
function createMinimapNodeViewClass(NodeView: typeof import('@antv/x6').NodeView) {
    return class MinimapNodeView extends NodeView {
        private rect?: SVGRectElement;

        // Subscribe to data changes to update highlights reactively
        protected init() {
            super.init();
            this.cell.on('change:data', () => {
                this.update();
            });
        }

        render() {
            this.empty();

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('rx', '2');
            rect.setAttribute('ry', '2');
            this.rect = rect;
            this.container.appendChild(rect);

            this.update();
            this.updateTransform();

            return this;
        }

        resize() {
            this.update();
        }

        update() {
            if (!this.rect) return;

            const { width, height } = this.cell.getSize();
            const data = (this.cell as unknown as { getData?: () => Record<string, unknown> }).getData?.() ?? {};
            const highlight = (data._minimapHighlight as MinimapHighlightData | undefined) ?? {};

            const classNames = ['minimap-node'];
            // Use explicit colors with CSS variable resolution for SVG compatibility
            // Fallback colors: muted=#e5e7eb (gray-200), primary=#6366f1 (indigo-500)
            let fill = getCssVar('--muted', '#e5e7eb');
            if (highlight.search) {
                classNames.push('search-match-highlight');
                fill = '#facc15'; // yellow-400
            }
            if (highlight.selected) {
                classNames.push('selected-node-highlight');
                fill = getCssVar('--primary', '#6366f1');
            }

            this.rect.setAttribute('width', String(width));
            this.rect.setAttribute('height', String(height));
            this.rect.setAttribute('fill', fill);
            this.rect.setAttribute('class', classNames.join(' '));
        }
    };
}

export function useMinimap({
    graph,
    isReady,
    containerRef,
    enabled = true,
    width = 200,
    height = 150,
    maxNodes = 1000,
    highlightDebounceMs = 50,
}: UseMinimapOptions): UseMinimapReturn {
    // Use unknown type for minimap ref since we load it dynamically
    const minimapRef = useRef<{ dispose: () => void } | null>(null);
    const [isEnabled, setIsEnabled] = useState(enabled);
    const [isDisabledForPerformance, setIsDisabledForPerformance] = useState(false);
    const highlightStateRef = useRef<HighlightState>({
        selected: new Set(),
        search: new Set(),
    });
    const pendingHighlightRef = useRef<Record<HighlightType, string[]>>({
        selected: [],
        search: [],
    });
    const highlightTimerRef = useRef<Record<HighlightType, number | null>>({
        selected: null,
        search: null,
    });

    // Keep internal enabled state in sync with controlled prop.
    useEffect(() => {
        setIsEnabled(enabled);
    }, [enabled]);

    // Initialize minimap plugin with performance guard
    useEffect(() => {
        if (!graph || !isReady || !containerRef.current || !isEnabled) {
            return;
        }

        // SSR guard: only run on client
        if (typeof window === 'undefined') {
            return;
        }

        // Performance guard: check node count (Task 4.4)
        const nodeCount = graph.getNodes().length;
        if (nodeCount >= maxNodes) {
            console.warn(
                `[useMinimap] Minimap disabled for performance: ${nodeCount} nodes >= ${maxNodes} threshold`
            );
            setIsDisabledForPerformance(true);
            return;
        }
        setIsDisabledForPerformance(false);

        // Unit-test guard: Vitest runs in Node and @antv/x6 isn't Node-importable due to upstream packaging.
        if (process.env.NODE_ENV === 'test') {
            return;
        }

        let cleanupFn: (() => void) | undefined;
        let isMounted = true;
        const container = containerRef.current;

        // Async IIFE to dynamically import browser-only modules
        (async () => {
            try {
                // Dynamic imports for SSR compatibility
                const { NodeView, MiniMap } = await import('@antv/x6');

                if (!isMounted) return;

                // Create the MinimapNodeView class now that we have NodeView
                const MinimapNodeView = createMinimapNodeViewClass(NodeView);

                // Check if minimap is already registered and dispose it
                const existingMinimap = graph.getPlugin('minimap') as { dispose?: () => void } | undefined;
                if (existingMinimap) {
                    try {
                        existingMinimap.dispose?.();
                    } catch {
                        // Ignore disposal errors
                    }
                    minimapRef.current = null;
                }

                const minimap = new MiniMap({
                    container,
                    width,
                    height,
                    padding: 10,
                    scalable: true,
                    minScale: 0.01,
                    maxScale: 1,
                    graphOptions: {
                        // Simplified rendering - lightweight node view + skip edges (AC4/AC5/AC6)
                        createCellView(cell: { isEdge: () => boolean }) {
                            if (cell.isEdge()) return null;
                            return MinimapNodeView;
                        },
                    },
                });

                graph.use(minimap);
                minimapRef.current = minimap;

                // AC3: Smooth click-to-navigate (override default immediate centerPoint).
                const mm = minimap as unknown as {
                    container?: HTMLElement;
                    ratio?: number;
                    targetGraph?: { translate: () => { tx: number; ty?: number } };
                    sourceGraph?: Graph;
                };

                const miniGraphEl = mm.container?.querySelector('.x6-graph') as HTMLElement | null;
                if (miniGraphEl) {
                    const handlePointer = (e: MouseEvent | TouchEvent) => {
                        // Only handle "click-to-navigate" on the minimap graph area.
                        // Don't interfere with viewport dragging (handled on minimap viewport element).
                        e.preventDefault();
                        e.stopPropagation();

                        const ratio = mm.ratio ?? 1;
                        const ts = mm.targetGraph?.translate?.() ?? { tx: 0, ty: 0 };
                        const ty = ts.ty ?? 0;

                        const bounds = miniGraphEl.getBoundingClientRect();
                        const client = 'touches' in e && e.touches.length > 0 ? e.touches[0] : (e as MouseEvent);
                        const x = client.clientX - bounds.left;
                        const y = client.clientY - bounds.top;

                        const cx = (x - ts.tx) / ratio;
                        const cy = (y - ty) / ratio;

                        animateTranslateToCenterPoint(graph, cx, cy, 220);
                    };

                    // Capture phase to prevent the plugin's delegated handler from running.
                    miniGraphEl.addEventListener('mousedown', handlePointer, true);
                    miniGraphEl.addEventListener('touchstart', handlePointer, true);

                    cleanupFn = () => {
                        miniGraphEl.removeEventListener('mousedown', handlePointer, true);
                        miniGraphEl.removeEventListener('touchstart', handlePointer, true);
                        minimap.dispose();
                        minimapRef.current = null;
                    };
                }
            } catch (error) {
                console.error('[useMinimap] Failed to initialize minimap:', error);
            }
        })();

        return () => {
            isMounted = false;
            if (cleanupFn) {
                cleanupFn();
            } else if (minimapRef.current) {
                try {
                    minimapRef.current.dispose();
                } catch {
                    // Ignore disposal errors
                }
                minimapRef.current = null;
            }
        };
    }, [graph, isReady, containerRef, isEnabled, width, height, maxNodes]);

    // Show minimap
    const show = useCallback(() => {
        setIsEnabled(true);
    }, []);

    // Hide minimap
    const hide = useCallback(() => {
        setIsEnabled(false);
    }, []);

    // Toggle minimap visibility
    const toggle = useCallback(() => {
        if (isEnabled) {
            hide();
        } else {
            show();
        }
    }, [isEnabled, show, hide]);

    const applyHighlights = useCallback(
        (nodeIds: string[], type: HighlightType) => {
            if (!graph) return;

            const state = highlightStateRef.current;
            const next = new Set(nodeIds);
            const prev = state[type];

            // No-op if identical
            if (next.size === prev.size) {
                let isSame = true;
                prev.forEach((id) => {
                    if (!next.has(id)) isSame = false;
                });
                if (isSame) return;
            }

            const toRemove: string[] = [];
            prev.forEach((id) => {
                if (!next.has(id)) toRemove.push(id);
            });
            const toAdd: string[] = [];
            next.forEach((id) => {
                if (!prev.has(id)) toAdd.push(id);
            });

            state[type] = next;

            // Batch graph updates for performance
            graph.batchUpdate(() => {
                toRemove.forEach((nodeId) => {
                    const cell = graph.getCellById(nodeId);
                    if (!cell || !cell.isNode()) return;
                    const currentData = cell.getData() || {};
                    const highlights: MinimapHighlightData = { ...(currentData._minimapHighlight as MinimapHighlightData | undefined) };
                    delete highlights[type];

                    if (Object.keys(highlights).length === 0) {
                        const { _minimapHighlight, ...rest } = currentData as Record<string, unknown>;
                        cell.setData(rest, { overwrite: true });
                    } else {
                        cell.setData({ ...currentData, _minimapHighlight: highlights }, { overwrite: true });
                    }
                });

                toAdd.forEach((nodeId) => {
                    const cell = graph.getCellById(nodeId);
                    if (!cell || !cell.isNode()) return;
                    const currentData = cell.getData() || {};
                    const highlights: MinimapHighlightData = {
                        ...(currentData._minimapHighlight as MinimapHighlightData | undefined),
                        [type]: true,
                    };
                    cell.setData({ ...currentData, _minimapHighlight: highlights }, { overwrite: true });
                });
            });
        },
        [graph]
    );

    // Highlight nodes in minimap (local UI state only, never synced to Yjs)
    const highlightNodes = useCallback(
        (nodeIds: string[], type: HighlightType) => {
            if (!graph) return;

            pendingHighlightRef.current[type] = nodeIds;

            const existing = highlightTimerRef.current[type];
            if (existing) {
                window.clearTimeout(existing);
            }

            const delay = type === 'selected' ? 0 : highlightDebounceMs;
            highlightTimerRef.current[type] = window.setTimeout(() => {
                const pending = pendingHighlightRef.current[type];
                applyHighlights(pending, type);
            }, delay);
        },
        [applyHighlights, graph, highlightDebounceMs]
    );

    // Clear highlights
    const clearHighlights = useCallback(
        (type?: HighlightType) => {
            if (!graph) return;

            const state = highlightStateRef.current;
            const typesToClear = type ? [type] : (['selected', 'search'] as const);

            typesToClear.forEach((t) => {
                pendingHighlightRef.current[t] = [];
                if (highlightTimerRef.current[t]) {
                    window.clearTimeout(highlightTimerRef.current[t]!);
                    highlightTimerRef.current[t] = null;
                }
                applyHighlights([], t);
            });
        },
        [applyHighlights, graph]
    );

    // Cleanup highlights on unmount
    useEffect(() => {
        return () => {
            (Object.keys(highlightTimerRef.current) as HighlightType[]).forEach((type) => {
                if (highlightTimerRef.current[type]) {
                    window.clearTimeout(highlightTimerRef.current[type]!);
                    highlightTimerRef.current[type] = null;
                }
            });
            clearHighlights();
        };
    }, [clearHighlights]);

    return {
        isEnabled,
        toggle,
        show,
        hide,
        highlightNodes,
        clearHighlights,
        isDisabledForPerformance,
    };
}
