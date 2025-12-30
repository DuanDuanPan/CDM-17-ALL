'use client';

import { useEffect, useState, useCallback } from 'react';
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

    const updateTransform = useCallback(() => {
        if (!graph) return;
        const translate = graph.translate();
        const currentScale = graph.zoom();
        setCanvasOffset({ x: translate.tx, y: translate.ty });
        setScale(currentScale);
    }, [graph]);

    useEffect(() => {
        if (!graph || !isReady) return;

        graph.on('translate', updateTransform);
        graph.on('scale', updateTransform);

        return () => {
            graph.off('translate', updateTransform);
            graph.off('scale', updateTransform);
        };
    }, [graph, isReady, updateTransform]);

    return {
        canvasOffset,
        scale,
        updateTransform,
    };
}
