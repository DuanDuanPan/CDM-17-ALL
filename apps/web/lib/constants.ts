/**
 * Application-wide constants
 *
 * Story 1.4 LOW-1: Extract magic numbers into named constants
 */

// ============================================================================
// UI & Layout Constants
// ============================================================================

/** Duration for layout transition animations (ms) */
export const LAYOUT_TRANSITION_MS = 600;

/** Maximum visible avatars in the TopBar user stack before "+N" overflow */
export const MAX_VISIBLE_AVATARS = 3;

// ============================================================================
// Collaboration Constants
// ============================================================================

/** Throttle interval for cursor position updates to prevent WebSocket flooding (ms) */
export const CURSOR_UPDATE_THROTTLE_MS = 50;

/** Default collaboration WebSocket URL */
export const DEFAULT_COLLAB_WS_URL = 'ws://localhost:1234';

// ============================================================================
// Storage Keys
// ============================================================================

/** LocalStorage key for persisted layout mode */
export const STORAGE_KEY_LAYOUT_MODE = 'cdm:layoutMode';

/** LocalStorage key for persisted grid enabled state */
export const STORAGE_KEY_GRID_ENABLED = 'cdm:gridEnabled';
