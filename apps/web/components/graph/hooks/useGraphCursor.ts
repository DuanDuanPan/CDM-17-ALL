'use client';

import { useCallback, useRef } from 'react';
import type { Graph } from '@antv/x6';
import { CURSOR_UPDATE_THROTTLE_MS } from '@/lib/constants';

export interface UseGraphCursorOptions {
    graph: Graph | null;
    isConnected: boolean;
    /** Update cursor position in awareness for collaboration */
    updateCursor: (x: number, y: number) => void;
}

export interface UseGraphCursorReturn {
    /** Mouse move handler for cursor tracking */
    handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Hook to track mouse movement for cursor awareness.
 * Story 1.4: Collaboration cursor tracking with HIGH-3 throttling.
 */
export function useGraphCursor({
    graph,
    isConnected,
    updateCursor,
}: UseGraphCursorOptions): UseGraphCursorReturn {
    const lastCursorUpdateTime = useRef<number>(0);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!graph || !isConnected) return;

            // HIGH-3: Throttle cursor updates to 50ms to prevent WebSocket flooding
            const now = Date.now();
            if (now - lastCursorUpdateTime.current < CURSOR_UPDATE_THROTTLE_MS) {
                return;
            }
            lastCursorUpdateTime.current = now;

            const point = graph.clientToLocal(e.clientX, e.clientY);
            updateCursor(point.x, point.y);
        },
        [graph, isConnected, updateCursor]
    );

    return { handleMouseMove };
}
