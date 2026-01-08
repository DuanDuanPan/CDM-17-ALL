/**
 * GraphComponent hooks index.
 * Story 7.4: Hook-First extraction for GraphComponent.
 */

export { useGraphTransform } from './useGraphTransform';
export type { UseGraphTransformOptions, UseGraphTransformReturn, GraphTransform } from './useGraphTransform';

export { useGraphHotkeys } from './useGraphHotkeys';
export type { UseGraphHotkeysOptions, UseGraphHotkeysReturn } from './useGraphHotkeys';

export { useGraphEvents } from './useGraphEvents';
export type { UseGraphEventsOptions } from './useGraphEvents';

export { useGraphInitialization } from './useGraphInitialization';
export type { UseGraphInitializationOptions } from './useGraphInitialization';

export { useGraphSelection } from './useGraphSelection';
export type { UseGraphSelectionOptions } from './useGraphSelection';

export { useGraphDependencyMode } from './useGraphDependencyMode';
export type { UseGraphDependencyModeOptions, UseGraphDependencyModeReturn } from './useGraphDependencyMode';

export { useGraphContextMenu, DEPENDENCY_TYPES } from './useGraphContextMenu';
export { getEdgeMetadata } from '@/lib/edgeValidation';
export type {
    UseGraphContextMenuOptions,
    UseGraphContextMenuReturn,
    EdgeContextMenuState,
    NodeContextMenuState,
} from './useGraphContextMenu';

export { useGraphCursor } from './useGraphCursor';
export type { UseGraphCursorOptions, UseGraphCursorReturn } from './useGraphCursor';

// Story 8.1: Node Collapse & Expand
export { useNodeCollapse } from './useNodeCollapse';
export type { UseNodeCollapseOptions, UseNodeCollapseReturn } from './useNodeCollapse';

// Story 8.2: Minimap Navigation
export { useMinimap } from './useMinimap';
export type { UseMinimapOptions, UseMinimapReturn } from './useMinimap';

// Story 8.3: Zoom Shortcuts System
export { useZoomShortcuts } from './useZoomShortcuts';
export type { UseZoomShortcutsOptions, UseZoomShortcutsReturn } from './useZoomShortcuts';

// Story 8.4: Outline View
export { useOutlineData } from './useOutlineData';
export type { OutlineNode, UseOutlineDataOptions, UseOutlineDataReturn } from './useOutlineData';

// Story 8.5: Focus Mode
export { useFocusMode } from './useFocusMode';
export type { UseFocusModeOptions, UseFocusModeReturn } from './useFocusMode';
