'use client';

import { useEffect, useRef, useState } from 'react';
import { Graph, Selection } from '@antv/x6';

export interface UseGraphOptions {
  container: HTMLElement | null;
  width?: number | string;
  height?: number | string;
}

export interface UseGraphReturn {
  graph: Graph | null;
  isReady: boolean;
}

export function useGraph({ container, width = '100%', height = '100%' }: UseGraphOptions): UseGraphReturn {
  const graphRef = useRef<Graph | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!container) return;

    // Create graph instance
    const graph = new Graph({
      container,
      width: typeof width === 'number' ? width : undefined,
      height: typeof height === 'number' ? height : undefined,
      autoResize: true,

      // Grid with dot pattern (Infinite dot grid background)
      grid: {
        visible: true,
        type: 'dot',
        size: 20,
        args: {
          color: '#e5e7eb',
          thickness: 1,
        },
      },

      // Enable panning (drag background)
      panning: {
        enabled: true,
        modifiers: [],
      },

      // Enable mousewheel zoom
      mousewheel: {
        enabled: true,
        zoomAtMousePosition: true,
        modifiers: [],
        minScale: 0.2,
        maxScale: 4,
      },

      // Background color
      background: {
        color: '#fafafa',
      },

      // Connection options
      connecting: {
        snap: true,
        allowBlank: false,
        allowLoop: false,
        highlight: true,
      },
    });

    // Enable selection plugin so graph emits `node:selected`/`node:unselected`
    // and `graph.getSelectedCells()` works for keyboard operations.
    // Story 2.2: Enable edge selection for dependency edge management
    graph.use(
      new Selection({
        enabled: true,
        multiple: false,
        rubberband: false,
        showNodeSelectionBox: false, // We handle selection UI in MindNode
        showEdgeSelectionBox: false, // Story 2.2: Disable box, use highlight instead
        pointerEvents: 'none', // Critical: Selection box should not block interactions
        strict: true, // Only select if fully enclosed (for rubberband) or precise click
      })
    );

    graphRef.current = graph;
    setIsReady(true);

    // Cleanup function to prevent double-instantiation in React Strict Mode
    return () => {
      if (graphRef.current) {
        const graphToDispose = graphRef.current;
        graphRef.current = null;
        setIsReady(false);
        // Defer disposal to avoid React unmount during render (ReactShapeView unmount warning)
        setTimeout(() => {
          try {
            graphToDispose.dispose();
          } catch (error) {
            // Disposal should be safe but guard against double-dispose in dev
            console.warn('[useGraph] Graph dispose failed', error);
          }
        }, 0);
      }
    };
  }, [container, width, height]);

  return {
    graph: graphRef.current,
    isReady,
  };
}

// Helper to add a center node (using mind-node shape)
export function addCenterNode(graph: Graph, creatorName?: string): void {
  const now = new Date().toISOString();
  graph.addNode({
    shape: 'mind-node',
    id: 'center-node',
    // Use fixed document coordinates so all collaborators share the same origin.
    x: 0,
    y: 0,
    width: 160,
    height: 50,
    data: {
      id: 'center-node',
      label: '中心主题',
      type: 'root',
      isEditing: false,
      creator: creatorName,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Center the view on the node
  graph.centerContent();
}
