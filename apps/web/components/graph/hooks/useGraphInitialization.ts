'use client';

import { useEffect, useState } from 'react';
import type { Graph } from '@antv/x6';
import type { LayoutMode } from '@cdm/types';
import type * as Y from 'yjs';
import { addCenterNode } from '@/hooks/useGraph';
import { graphSyncManager } from '@/features/collab/GraphSyncManager';

export interface UseGraphInitializationOptions {
    graph: Graph | null;
    isReady: boolean;
    graphId: string;
    creatorName: string;
    yDoc: Y.Doc | null;
    isConnected: boolean;
    isSynced: boolean;
    currentLayout: LayoutMode;
    onLayoutChange?: (mode: LayoutMode) => void;
}

/**
 * Hook to initialize graph content and collaboration state.
 *
 * Responsibilities:
 * - Initialize GraphSyncManager when collaboration is enabled
 * - Load initial state from Yjs after sync, or create center node
 * - Keep layout mode in sync with Yjs
 *
 * Story 7.4: Extracted from GraphComponent to keep it as a composition root.
 */
export function useGraphInitialization({
    graph,
    isReady,
    graphId,
    creatorName,
    yDoc,
    isConnected,
    isSynced,
    currentLayout,
    onLayoutChange,
}: UseGraphInitializationOptions): void {
    const [hasInitializedGraphState, setHasInitializedGraphState] = useState(false);

    useEffect(() => {
        setHasInitializedGraphState(false);
    }, [graphId]);

    // Story 1.4: Initialize GraphSyncManager
    useEffect(() => {
        if (!isReady || !graph || !yDoc) return;
        graphSyncManager.initialize(graph, yDoc, (mode) => {
            onLayoutChange?.(mode);
        });
        return () => {
            graphSyncManager.destroy();
        };
    }, [isReady, graph, yDoc, onLayoutChange]);

    // Initialize graph content after collaboration sync
    useEffect(() => {
        if (!graph || !isReady || hasInitializedGraphState) return;
        if (graph.getNodes().length > 0) {
            setHasInitializedGraphState(true);
            return;
        }

        const isCollabMode = Boolean(graphId && yDoc);
        if (isCollabMode && !isSynced) return;

        if (isCollabMode && yDoc) {
            const yNodes = yDoc.getMap('nodes');
            if (yNodes.size > 0) {
                graphSyncManager.loadInitialState();
            } else {
                addCenterNode(graph, creatorName);
            }
        } else {
            addCenterNode(graph, creatorName);
        }

        setHasInitializedGraphState(true);
    }, [graph, isReady, graphId, yDoc, isSynced, hasInitializedGraphState, creatorName]);

    // Sync layout mode to Yjs
    useEffect(() => {
        if (!isConnected || !yDoc) return;
        graphSyncManager.setLayoutMode(currentLayout);
    }, [currentLayout, isConnected, yDoc]);
}

