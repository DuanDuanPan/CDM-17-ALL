'use client';

import {
  HIERARCHICAL_EDGE_GRADIENT,
  HIERARCHICAL_EDGE_GLOW_OPACITY,
  HIERARCHICAL_EDGE_GLOW_WIDTH,
  HIERARCHICAL_EDGE_WIDTH,
} from '@/lib/edgeStyles';

export const HIERARCHICAL_EDGE_SHAPE = 'cdm-hierarchical-edge';

let edgeShapesRegistered = false;

type GraphRegistrationAPI = {
  registerEdge: typeof import('@antv/x6').Graph.registerEdge;
};

/**
 * Register custom edge shapes used by the app.
 * Safe to call multiple times.
 */
export function registerEdgeShapes(Graph: GraphRegistrationAPI): void {
  if (edgeShapesRegistered) return;

  Graph.registerEdge(HIERARCHICAL_EDGE_SHAPE, {
    inherit: 'edge',
    markup: [
      {
        tagName: 'path',
        selector: 'wrap',
        groupSelector: 'lines',
        attrs: {
          fill: 'none',
          cursor: 'pointer',
          stroke: 'transparent',
          strokeLinecap: 'round',
        },
      },
      {
        tagName: 'path',
        selector: 'glow',
        groupSelector: 'lines',
        attrs: {
          fill: 'none',
          pointerEvents: 'none',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
      },
      {
        tagName: 'path',
        selector: 'line',
        groupSelector: 'lines',
        attrs: {
          fill: 'none',
          pointerEvents: 'none',
        },
      },
    ],
    attrs: {
      lines: {
        connection: true,
        strokeLinejoin: 'round',
      },
      wrap: {
        strokeWidth: 10,
      },
      glow: {
        stroke: HIERARCHICAL_EDGE_GRADIENT,
        strokeWidth: HIERARCHICAL_EDGE_GLOW_WIDTH,
        strokeOpacity: HIERARCHICAL_EDGE_GLOW_OPACITY,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      line: {
        stroke: HIERARCHICAL_EDGE_GRADIENT,
        strokeWidth: HIERARCHICAL_EDGE_WIDTH,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        targetMarker: null,
      },
    },
  });

  edgeShapesRegistered = true;
}
