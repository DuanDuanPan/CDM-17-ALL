'use client';

/**
 * Story 8.3: Zoom Shortcuts System
 * Provides zoom control functions for keyboard shortcuts and UI interactions.
 * AC: #2 (Fit to Screen), #3 (Reset to 100%), #4 (Double-click center), #5 (Animation + reduced-motion)
 */

import { useCallback, useMemo } from 'react';
import type { Graph, Node } from '@antv/x6';
import {
    animateGraphZoomAndCenterToPoint,
    animateGraphZoomTo,
    animateTranslateToCenterPoint,
    getPrefersReducedMotion,
} from '../utils/viewport';

export interface UseZoomShortcutsOptions {
    graph: Graph | null;
    isReady: boolean;
}

export interface UseZoomShortcutsReturn {
    /** Fit all nodes to screen (Cmd/Ctrl + 0), max zoom 100%. No-op if canvas is empty. */
    zoomToFit: () => void;
    /** Reset zoom to 100% (Cmd/Ctrl + 1) */
    zoomTo100: () => void;
    /** Center a node without changing zoom (double-click) */
    centerNode: (nodeId: string) => void;
    /** Check if reduced motion is preferred */
    prefersReducedMotion: boolean;
}

// Animation constants
const ZOOM_ANIMATION_DURATION = 300;
const CENTER_ANIMATION_DURATION = 400;
const FIT_PADDING = 40;

/**
 * Hook providing zoom shortcut functions for keyboard and UI interactions.
 *
 * Features:
 * - zoomToFit(): Fit all nodes to screen (max 100% zoom), no-op if canvas empty (AC2)
 * - zoomTo100(): Reset zoom to 100% (AC3)
 * - centerNode(): Center a node without changing zoom (AC4)
 * - All animations respect prefers-reduced-motion (AC5)
 */
export function useZoomShortcuts({
    graph,
    isReady,
}: UseZoomShortcutsOptions): UseZoomShortcutsReturn {
    // Memoize reduced motion check (stable across renders)
    const prefersReducedMotion = useMemo(() => getPrefersReducedMotion(), []);

    /**
     * AC2: Fit to Screen (Cmd/Ctrl + 0)
     * - Zooms to fit all nodes with padding
     * - Maximum zoom is 100% (scale = 1)
     * - No-op if canvas is empty (no nodes)
     */
    const zoomToFit = useCallback(() => {
        if (!graph || !isReady) return;

        // AC2: Empty canvas check - no-op if no nodes
        // Filter to only visible nodes (important for drill-down mode)
        const nodes = graph.getNodes().filter((n) => n.isVisible());
        if (nodes.length === 0) return;

        const container = (graph as unknown as { container?: HTMLElement }).container;
        const rect = container?.getBoundingClientRect();
        if (!rect?.width || !rect?.height) return;

        // Calculate bounding box of all nodes
        const bboxes = nodes.map((n) => n.getBBox());
        const bbox = bboxes.reduce((acc, r) => acc.union(r));

        const availableW = Math.max(1, rect.width - FIT_PADDING * 2);
        const availableH = Math.max(1, rect.height - FIT_PADDING * 2);

        // Calculate scale to fit, but cap at 1 (100%)
        const targetScale = Math.min(availableW / bbox.width, availableH / bbox.height, 1);

        const center = bbox.getCenter();

        animateGraphZoomAndCenterToPoint(
            graph,
            targetScale,
            center.x,
            center.y,
            ZOOM_ANIMATION_DURATION,
            prefersReducedMotion
        );
    }, [graph, isReady, prefersReducedMotion]);

    /**
     * AC3: Reset to 100% (Cmd/Ctrl + 1)
     * - Zooms to scale = 1 while keeping viewport center stable
     */
    const zoomTo100 = useCallback(() => {
        if (!graph || !isReady) return;

        animateGraphZoomTo(graph, 1, ZOOM_ANIMATION_DURATION, prefersReducedMotion);
    }, [graph, isReady, prefersReducedMotion]);

    /**
     * AC4: Center Node (double-click)
     * - Pans viewport to center the specified node
     * - Does NOT change zoom level
     */
    const centerNode = useCallback(
        (nodeId: string) => {
            if (!graph || !isReady) return;

            const cell = graph.getCellById(nodeId);
            if (!cell || !cell.isNode()) return;

            const node = cell as Node;
            const { x, y } = node.getBBox().getCenter();

            animateTranslateToCenterPoint(graph, x, y, CENTER_ANIMATION_DURATION, prefersReducedMotion);
        },
        [graph, isReady, prefersReducedMotion]
    );

    return {
        zoomToFit,
        zoomTo100,
        centerNode,
        prefersReducedMotion,
    };
}
