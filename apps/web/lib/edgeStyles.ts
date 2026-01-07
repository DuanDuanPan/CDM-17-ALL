'use client';

// Gradient + glow styling for hierarchical edges (mindmap/logic tree edges)
// Matches the "purple → blue" look from the design reference.
export const HIERARCHICAL_EDGE_WIDTH = 1;
export const HIERARCHICAL_EDGE_GLOW_WIDTH = 6;
export const HIERARCHICAL_EDGE_GLOW_OPACITY = 0.35;

export const HIERARCHICAL_EDGE_GRADIENT = {
    type: 'linearGradient',
    stops: [
        { offset: '0%', color: '#A855F7' }, // Purple
        { offset: '55%', color: '#6366F1' }, // Indigo
        { offset: '100%', color: '#4B8DFF' }, // Blue
    ],
};

export const HIERARCHICAL_EDGE_ATTRS = {
    glow: {
        stroke: HIERARCHICAL_EDGE_GRADIENT,
        strokeWidth: HIERARCHICAL_EDGE_GLOW_WIDTH,
        strokeOpacity: HIERARCHICAL_EDGE_GLOW_OPACITY,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        targetMarker: null,
    },
    line: {
        stroke: HIERARCHICAL_EDGE_GRADIENT,
        strokeWidth: HIERARCHICAL_EDGE_WIDTH,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        targetMarker: null,
    },
};

export const HIERARCHICAL_EDGE_SELECTED_ATTRS = {
    glow: {
        stroke: HIERARCHICAL_EDGE_GRADIENT,
        strokeWidth: HIERARCHICAL_EDGE_GLOW_WIDTH + 3,
        strokeOpacity: 0.55,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        targetMarker: null,
    },
    line: {
        stroke: HIERARCHICAL_EDGE_GRADIENT,
        strokeWidth: HIERARCHICAL_EDGE_WIDTH + 1,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        targetMarker: null,
    },
};
