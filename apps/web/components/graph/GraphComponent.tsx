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

      // Event handlers
      const handleNodeSelected = ({ node }: { node: any }) => {
        onNodeSelect?.(node.id);
      };

      const handleBlankClick = () => {
        onNodeSelect?.(null);
      };

      // Setup node selection events
      graph.on('node:selected', handleNodeSelected);
      graph.on('blank:click', handleBlankClick);

      // Cleanup function to remove event listeners
      return () => {
        if (graph && typeof graph.off === 'function') {
          graph.off('node:selected', handleNodeSelected);
          graph.off('blank:click', handleBlankClick);
        }
      };
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
