'use client';

import { useEffect } from 'react';
import { Graph } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { MindNode } from '@/components/nodes';
import { mindmapCorePlugin } from '@cdm/plugin-mindmap-core';

/**
 * useMindmapPlugin - Initialize mindmap plugin with graph
 *
 * Responsibilities:
 * - Register MindNode React shape
 * - Initialize plugin with graph instance
 * - Provide reusable command logic (keyboard is handled by GraphComponent)
 */
export function useMindmapPlugin(graph: Graph | null, isReady: boolean) {
  useEffect(() => {
    if (!graph || !isReady) return;

    // Register MindNode React Shape
    register({
      shape: 'mind-node',
      width: 120,
      height: 50,
      component: MindNode,
    });

    // Initialize plugin with graph instance
    mindmapCorePlugin.initialize(graph);

    // Cleanup on unmount
    return () => {
      mindmapCorePlugin.dispose();
    };
  }, [graph, isReady]);
}
