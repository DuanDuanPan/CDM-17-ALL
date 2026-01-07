'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Graph } from '@antv/x6';

export interface GraphTransform {
    canvasOffset: { x: number; y: number };
    scale: number;
}

export interface UseGraphTransformOptions {
    graph: Graph | null;
    isReady: boolean;
}

export interface UseGraphTransformReturn extends GraphTransform {
    /** Update transform from graph state */
    updateTransform: () => void;
}

/**
 * Hook to track canvas transform (pan/zoom) for cursor rendering.
 * Story 1.4: Canvas transform state for collaboration cursor overlay.
 */
export function useGraphTransform({
    graph,
    isReady,
}: UseGraphTransformOptions): UseGraphTransformReturn {
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

    const rafIdRef = useRef<number | null>(null);
    const lastOffsetRef = useRef(canvasOffset);
    const lastScaleRef = useRef(scale);

    const applyTransform = useCallback(() => {
        if (!graph) return;

        const translate = graph.translate();
        const nextOffset = { x: translate.tx, y: translate.ty };
        const nextScale = graph.zoom();

        if (lastOffsetRef.current.x !== nextOffset.x || lastOffsetRef.current.y !== nextOffset.y) {
            lastOffsetRef.current = nextOffset;
            setCanvasOffset(nextOffset);
        }

        if (lastScaleRef.current !== nextScale) {
            lastScaleRef.current = nextScale;
            setScale(nextScale);
        }
    }, [graph]);

    const updateTransform = useCallback(() => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = window.requestAnimationFrame(() => {
            rafIdRef.current = null;
            applyTransform();
        });
    }, [applyTransform]);

    useEffect(() => {
        if (!graph || !isReady) return;

        // Sync once after graph becomes ready.
        applyTransform();

        graph.on('translate', updateTransform);
        graph.on('scale', updateTransform);

        return () => {
            graph.off('translate', updateTransform);
            graph.off('scale', updateTransform);

            if (rafIdRef.current !== null) {
                window.cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [graph, isReady, applyTransform, updateTransform]);

    return {
        canvasOffset,
        scale,
        updateTransform,
    };
}
