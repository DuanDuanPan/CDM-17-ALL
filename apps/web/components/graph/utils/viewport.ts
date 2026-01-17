'use client';

import type { Graph } from '@antv/x6';

export type GraphTransformTarget = {
    scale: number;
    tx: number;
    ty: number;
};

export function getPrefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

function getViewportCenterPoint(graph: Graph): { x: number; y: number } {
    const area = graph.getGraphArea();
    const center = area.getCenter();
    return { x: center.x, y: center.y };
}

function getGraphContainerRect(graph: Graph): DOMRect | null {
    const container = (graph as unknown as { container?: HTMLElement }).container;
    return container?.getBoundingClientRect() ?? null;
}

/**
 * Animate zoom + pan so that the given graph point ends up centered.
 * Uses `graph.centerPoint` so it works with both plain transform and Scroller plugin.
 */
export function animateGraphZoomAndCenterToPoint(
    graph: Graph,
    targetScale: number,
    x: number,
    y: number,
    durationMs: number,
    reduceMotion: boolean
): void {
    const duration = reduceMotion ? 0 : durationMs;

    if (duration <= 0) {
        graph.zoomTo(targetScale);
        graph.centerPoint(x, y);
        return;
    }

    const startScale = graph.zoom();
    const startCenter = getViewportCenterPoint(graph);
    const startTime = performance.now();

    const step = (now: number) => {
        const t = clamp((now - startTime) / duration, 0, 1);
        const eased = easeOutCubic(t);

        const currentScale = startScale + (targetScale - startScale) * eased;
        const currentX = startCenter.x + (x - startCenter.x) * eased;
        const currentY = startCenter.y + (y - startCenter.y) * eased;

        graph.zoomTo(currentScale);
        graph.centerPoint(currentX, currentY);

        if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}

/**
 * Animate graph transform (scale + translate) using requestAnimationFrame.
 * Respects prefers-reduced-motion by setting duration to 0.
 */
export function animateGraphTransformTo(
    graph: Graph,
    target: GraphTransformTarget,
    durationMs: number,
    reduceMotion: boolean
): void {
    const duration = reduceMotion ? 0 : durationMs;

    if (duration <= 0) {
        graph.zoomTo(target.scale);

        const rect = getGraphContainerRect(graph);
        const width = rect?.width ?? 0;
        const height = rect?.height ?? 0;
        if (width && height) {
            const centerX = (width / 2 - target.tx) / target.scale;
            const centerY = (height / 2 - target.ty) / target.scale;
            graph.centerPoint(centerX, centerY);
        } else {
            graph.translate(target.tx, target.ty);
        }
        return;
    }

    const rect = getGraphContainerRect(graph);
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;
    if (!width || !height) {
        // Fallback: no container size available; animate zoom only.
        animateGraphZoomTo(graph, target.scale, duration, reduceMotion);
        return;
    }

    const centerX = (width / 2 - target.tx) / target.scale;
    const centerY = (height / 2 - target.ty) / target.scale;
    animateGraphZoomAndCenterToPoint(graph, target.scale, centerX, centerY, duration, reduceMotion);
}

/**
 * Animate zoom to a specific scale while keeping viewport center stable.
 */
export function animateGraphZoomTo(
    graph: Graph,
    targetScale: number,
    durationMs: number,
    reduceMotion: boolean
): void {
    const duration = reduceMotion ? 0 : durationMs;

    const center = getViewportCenterPoint(graph);
    animateGraphZoomAndCenterToPoint(graph, targetScale, center.x, center.y, duration, reduceMotion);
}

/**
 * Animate translate to center a point in the viewport (without changing zoom).
 */
export function animateTranslateToCenterPoint(
    graph: Graph,
    x: number,
    y: number,
    durationMs: number,
    reduceMotion: boolean
): void {
    const duration = reduceMotion ? 0 : durationMs;

    if (duration <= 0) {
        graph.centerPoint(x, y);
        return;
    }

    const startCenter = getViewportCenterPoint(graph);
    const startTime = performance.now();

    const step = (now: number) => {
        const t = clamp((now - startTime) / duration, 0, 1);
        const eased = easeOutCubic(t);
        const currentX = startCenter.x + (x - startCenter.x) * eased;
        const currentY = startCenter.y + (y - startCenter.y) * eased;
        graph.centerPoint(currentX, currentY);
        if (t < 1) {
            requestAnimationFrame(step);
        }
    };

    requestAnimationFrame(step);
}
