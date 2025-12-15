'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Graph } from '@antv/x6';

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

    graphRef.current = graph;
    setIsReady(true);

    // Cleanup function to prevent double-instantiation in React Strict Mode
    return () => {
      if (graphRef.current) {
        graphRef.current.dispose();
        graphRef.current = null;
        setIsReady(false);
      }
    };
  }, [container, width, height]);

  return {
    graph: graphRef.current,
    isReady,
  };
}

// Helper to add a center node
export function addCenterNode(graph: Graph): void {
  const containerWidth = graph.container.clientWidth;
  const containerHeight = graph.container.clientHeight;

  graph.addNode({
    id: 'center-node',
    x: containerWidth / 2 - 80,
    y: containerHeight / 2 - 25,
    width: 160,
    height: 50,
    label: '中心主题',
    attrs: {
      body: {
        fill: '#3b82f6',
        stroke: '#2563eb',
        strokeWidth: 2,
        rx: 8,
        ry: 8,
      },
      label: {
        fill: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
  });

  // Center the view on the node
  graph.centerContent();
}
