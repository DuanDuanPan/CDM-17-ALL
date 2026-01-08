'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Graph } from '@antv/x6';
import {
    applyFocusOpacityToGraph,
    areSetsEqual,
    clearFocusOpacityOnGraph,
    getRelatedNodeIds,
} from './focusModeUtils';

/**
 * Story 8.5: Focus Mode
 * Local-only visual focus state (not synced via Yjs).
 */

export interface UseFocusModeOptions {
    /** X6 Graph instance */
    graph: Graph | null;
    /** Whether the graph is ready */
    isReady: boolean;
    /** Currently selected node ID */
    selectedNodeId: string | null;
}

export interface UseFocusModeReturn {
    /** Whether focus mode is active */
    isFocusMode: boolean;
    /** Current focus level (1-3) */
    focusLevel: 1 | 2 | 3;
    /** Toggle focus mode on/off */
    toggleFocusMode: () => void;
    /** Exit focus mode */
    exitFocusMode: () => void;
    /** Set focus level */
    setFocusLevel: (level: 1 | 2 | 3) => void;
}

const FOCUSED_OPACITY = 1;
const DIMMED_OPACITY = 0.2;

export function useFocusMode({ graph, isReady, selectedNodeId }: UseFocusModeOptions): UseFocusModeReturn {
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [focusLevel, setFocusLevel] = useState<1 | 2 | 3>(1);

    const prevFocusedIdsRef = useRef<Set<string>>(new Set());

    const applyFocusOpacity = useCallback(
        (focusedIds: Set<string>) => {
            if (!graph) return;

            // Performance guard: skip if focused IDs haven't changed
            if (areSetsEqual(focusedIds, prevFocusedIdsRef.current)) return;

            applyFocusOpacityToGraph(graph, focusedIds, {
                focusedOpacity: FOCUSED_OPACITY,
                dimmedOpacity: DIMMED_OPACITY,
            });

            prevFocusedIdsRef.current = focusedIds;
        },
        [graph]
    );

    const clearFocusOpacity = useCallback(() => {
        if (!graph) return;
        clearFocusOpacityOnGraph(graph, { focusedOpacity: FOCUSED_OPACITY });
        prevFocusedIdsRef.current.clear();
    }, [graph]);

    const toggleFocusMode = useCallback(() => {
        if (!graph || !isReady) return;

        // AC5: If no node selected, do nothing
        if (!selectedNodeId) return;

        if (isFocusMode) {
            clearFocusOpacity();
            setIsFocusMode(false);
            return;
        }

        const focusedIds = getRelatedNodeIds(graph, selectedNodeId, focusLevel);
        applyFocusOpacity(focusedIds);
        setIsFocusMode(true);
    }, [graph, isReady, selectedNodeId, isFocusMode, focusLevel, applyFocusOpacity, clearFocusOpacity]);

    const exitFocusMode = useCallback(() => {
        if (!isFocusMode) return;
        clearFocusOpacity();
        setIsFocusMode(false);
    }, [isFocusMode, clearFocusOpacity]);

    const handleSetFocusLevel = useCallback(
        (level: 1 | 2 | 3) => {
            setFocusLevel(level);

            if (isFocusMode && selectedNodeId && graph) {
                const focusedIds = getRelatedNodeIds(graph, selectedNodeId, level);
                applyFocusOpacity(focusedIds);
            }
        },
        [isFocusMode, selectedNodeId, graph, applyFocusOpacity]
    );

    // AC5: Update focus range when selection changes
    useEffect(() => {
        if (!graph || !isReady || !isFocusMode) return;

        if (!selectedNodeId) {
            exitFocusMode();
            return;
        }

        const focusedIds = getRelatedNodeIds(graph, selectedNodeId, focusLevel);
        applyFocusOpacity(focusedIds);
    }, [graph, isReady, isFocusMode, selectedNodeId, focusLevel, applyFocusOpacity, exitFocusMode]);

    useEffect(() => {
        return () => {
            if (isFocusMode) {
                clearFocusOpacity();
            }
        };
    }, [isFocusMode, clearFocusOpacity]);

    return {
        isFocusMode,
        focusLevel,
        toggleFocusMode,
        exitFocusMode,
        setFocusLevel: handleSetFocusLevel,
    };
}

