/**
 * Story 8.8: Semantic Zoom LOD (Level of Detail)
 * SemanticZoomLOD - Global store for LOD state
 *
 * This store is used because X6 graph nodes (MindNode) are rendered via portals
 * outside the React tree, so they cannot access React Context.
 *
 * LOD Thresholds:
 * - LOD-0 (Full): scale >= 0.5 → Full content (Icon + Title + Metrics + Tags + Footer)
 * - LOD-1 (Compact): 0.25 <= scale < 0.5 → Icon + Title only
 * - LOD-2 (Micro): scale < 0.25 → Icon/color block only (no text)
 */

import { useSyncExternalStore } from 'react';

// ============================================================================
// Types
// ============================================================================

export type LODLevel = 'full' | 'compact' | 'micro';

// ============================================================================
// LOD Threshold Function
// ============================================================================

/**
 * Determine LOD level based on graph scale
 * @param scale - Current graph zoom level (1.0 = 100%)
 * @returns LODLevel - 'full' | 'compact' | 'micro'
 */
export function getLODLevel(scale: number): LODLevel {
  if (scale >= 0.5) {
    return 'full';
  }
  if (scale >= 0.25) {
    return 'compact';
  }
  return 'micro';
}

// ============================================================================
// Global Store State
// ============================================================================

let currentScale: number = 1.0;
let currentLOD: LODLevel = 'full';
const subscribers = new Set<() => void>();

// ============================================================================
// Store API
// ============================================================================

/**
 * Get the current LOD level
 */
export function getCurrentLOD(): LODLevel {
  return currentLOD;
}

/**
 * Get the current scale
 */
export function getCurrentScale(): number {
  return currentScale;
}

/**
 * Set the graph scale and update LOD level
 * Only notifies subscribers when LOD level actually changes (performance optimization)
 * @param scale - New graph zoom level
 */
export function setGraphScale(scale: number): void {
  currentScale = scale;
  const newLOD = getLODLevel(scale);

  // Only notify if LOD level changed (avoid high-frequency updates during continuous zoom)
  if (newLOD !== currentLOD) {
    currentLOD = newLOD;
    notifySubscribers();
  }
}

/**
 * Subscribe to LOD changes
 * @param callback - Function to call when LOD changes
 * @returns Unsubscribe function
 */
export function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Reset store to initial state (for testing)
 */
export function resetLODStore(): void {
  currentScale = 1.0;
  currentLOD = 'full';
  subscribers.clear();
}

// ============================================================================
// Internal Helpers
// ============================================================================

function notifySubscribers(): void {
  subscribers.forEach((callback) => callback());
}

// ============================================================================
// React Hook (useSyncExternalStore for concurrent mode safety)
// ============================================================================

/**
 * React hook to subscribe to LOD level changes
 * Uses useSyncExternalStore for concurrent mode safety
 * Works outside React Context (for X6 portal-rendered components)
 *
 * @returns Current LOD level
 */
export function useLODLevel(): LODLevel {
  return useSyncExternalStore(subscribe, getCurrentLOD, getServerSnapshot);
}

/**
 * Server snapshot for SSR (always return 'full' on server)
 */
function getServerSnapshot(): LODLevel {
  return 'full';
}
