'use client';

import { useEffect, useRef, useState } from 'react';
import { Graph, Selection, History } from '@antv/x6';

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
      // Story 2.6: Require Space key for panning to avoid conflict with rubberband selection
      // Users can hold Space + drag to pan, or use middle mouse button
      panning: {
        enabled: true,
        modifiers: ['alt'], // Alt + drag to pan (Space not supported by X6)
        eventTypes: ['leftMouseDown', 'mouseWheel'], // Also allow middle mouse for panning
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
    // Story 2.6: Enable multi-select and rubberband selection
    graph.use(
      new Selection({
        enabled: true,
        multiple: true,              // Story 2.6 AC1.1: Allow Shift+Click multi-select
        rubberband: true,            // Story 2.6 AC1.2: Enable rubberband selection box
        modifiers: undefined,        // No modifier needed for rubberband (direct drag)
        strict: false,               // Story 2.6 AC1.3: Intersect mode (not strict contain)
        movable: true,               // Allow moving selected group together
        showNodeSelectionBox: true,  // Story 2.6 AC1.4: Visual feedback with selection box
        showEdgeSelectionBox: false, // Story 2.2: Disable edge box, use highlight instead
        pointerEvents: 'auto',       // Allow selection box interactions
        // Note: No filter - allow both nodes and edges to be selected
        // Story 2.2 needs edge selection for dependency management
        // Selection box styling (AC1.4)
        className: 'cdm-selection-box',
      })
    );

    // Enable History plugin for undo/redo functionality (Ctrl+Z / Ctrl+Y)
    graph.use(
      new History({
        enabled: true,
        stackSize: 50, // Limit history stack to 50 operations
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
