'use client';

/**
 * Story 8.3: Zoom Shortcuts System
 * Provides zoom control functions for keyboard shortcuts and UI interactions.
 * AC: #2 (Fit to Screen), #3 (Reset to 100%), #4 (Double-click center), #5 (Animation + reduced-motion)
 */

import { useCallback, useMemo } from 'react';
import type { Graph, Node } from '@antv/x6';

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
 * Detect user preference for reduced motion (accessibility).
 * SSR-safe: returns false on server.
 */
function shouldReduceMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Ease-out cubic function for smooth animation deceleration.
 */
function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Animate graph transform (scale + translate) using requestAnimationFrame.
 * Respects prefers-reduced-motion by setting duration to 0.
 */
function animateGraphTransformTo(
    graph: Graph,
    target: { scale: number; tx: number; ty: number },
    durationMs: number,
    reduceMotion: boolean
): void {
    const duration = reduceMotion ? 0 : durationMs;

    if (duration <= 0) {
        // Immediate update
        graph.zoomTo(target.scale);
        graph.translate(target.tx, target.ty);
        return;
    }

    const startScale = graph.zoom();
    const start = graph.translate();
    const startTime = performance.now();

    const step = (now: number) => {
        const t = clamp((now - startTime) / duration, 0, 1);
        const eased = easeOutCubic(t);

        const currentScale = startScale + (target.scale - startScale) * eased;
        const currentTx = start.tx + (target.tx - start.tx) * eased;
        const currentTy = start.ty + (target.ty - start.ty) * eased;

        graph.zoomTo(currentScale);
        graph.translate(currentTx, currentTy);

        if (t < 1) {
            requestAnimationFrame(step);
        }
    };

    requestAnimationFrame(step);
}

/**
 * Animate zoom to a specific scale while keeping viewport center stable.
 */
function animateGraphZoomTo(
    graph: Graph,
    targetScale: number,
    durationMs: number,
    reduceMotion: boolean
): void {
    const duration = reduceMotion ? 0 : durationMs;

    // Get current state
    const startScale = graph.zoom();
    const start = graph.translate();

    // Get container dimensions
    const container = (graph as unknown as { container?: HTMLElement }).container;
    const rect = container?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;

    if (!width || !height) {
        graph.zoomTo(targetScale);
        return;
    }

    // Calculate center point in graph coordinates
    const centerX = (width / 2 - start.tx) / startScale;
    const centerY = (height / 2 - start.ty) / startScale;

    // Calculate target translate to keep center point stable
    const targetTx = width / 2 - centerX * targetScale;
    const targetTy = height / 2 - centerY * targetScale;

    animateGraphTransformTo(graph, { scale: targetScale, tx: targetTx, ty: targetTy }, duration, reduceMotion);
}

/**
 * Animate translate to center a point in the viewport (without changing zoom).
 */
function animateTranslateToCenterPoint(
    graph: Graph,
    x: number,
    y: number,
    durationMs: number,
    reduceMotion: boolean
): void {
    const duration = reduceMotion ? 0 : durationMs;

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
    const prefersReducedMotion = useMemo(() => shouldReduceMotion(), []);

    /**
     * AC2: Fit to Screen (Cmd/Ctrl + 0)
     * - Zooms to fit all nodes with padding
     * - Maximum zoom is 100% (scale = 1)
     * - No-op if canvas is empty (no nodes)
     */
    const zoomToFit = useCallback(() => {
        if (!graph || !isReady) return;

        // AC2: Empty canvas check - no-op if no nodes
        const nodes = graph.getNodes();
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

        // Calculate translate to center the content
        const center = bbox.getCenter();
        const targetTx = rect.width / 2 - center.x * targetScale;
        const targetTy = rect.height / 2 - center.y * targetScale;

        animateGraphTransformTo(
            graph,
            { scale: targetScale, tx: targetTx, ty: targetTy },
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
