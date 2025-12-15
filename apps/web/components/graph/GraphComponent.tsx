'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGraph, addCenterNode } from '@/hooks/useGraph';

export interface GraphComponentProps {
  onNodeSelect?: (nodeId: string | null) => void;
}

export function GraphComponent({ onNodeSelect }: GraphComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // Set container after mount
  useEffect(() => {
    if (containerRef.current) {
      setContainer(containerRef.current);
    }
  }, []);

  const { graph, isReady } = useGraph({ container });

  // Add center node when graph is ready
  useEffect(() => {
    if (graph && isReady) {
      // Add the default center node
      addCenterNode(graph);

      // Setup node selection event
      graph.on('node:selected', ({ node }) => {
        onNodeSelect?.(node.id);
      });

      graph.on('blank:click', () => {
        onNodeSelect?.(null);
      });

      graph.on('node:unselected', () => {
        onNodeSelect?.(null);
      });
    }
  }, [graph, isReady, onNodeSelect]);

  return (
    <div
      id="graph-container"
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '100%' }}
    />
  );
}
