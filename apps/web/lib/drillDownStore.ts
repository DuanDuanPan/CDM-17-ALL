/**
 * Story 8.9: 子图下钻导航 (Subgraph Drill-Down Navigation)
 * DrillDownStore - 下钻路径状态管理
 *
 * 技术决策:
 * - TD-1: 下钻路径存储在 URL hash + sessionStorage，不写入 Yjs
 * - TD-2: 不使用 Yjs Awareness 同步（下钻是纯本地视图状态）
 * - GR-3: 遵循 Yjs-First 原则，下钻路径是视图状态，不是数据
 * - GR-3.2: URL Hash 更新保留 pathname + search
 *
 * 类似于 subscriptionStore.ts，用于跨 X6 portal 访问
 */

import { useSyncExternalStore } from 'react';

type DrillPath = readonly string[];

// Cached empty array for SSR/client (stable reference)
const EMPTY_PATH: DrillPath = Object.freeze([]) as DrillPath;

// Store state: Array of node IDs representing the drill path
// NOTE: This value is used as the snapshot for useSyncExternalStore; it must be a stable reference
// between store updates. Avoid returning a new array/object from getSnapshot.
let drillPath: DrillPath = EMPTY_PATH;
const subscribers = new Set<() => void>();

// Session key prefix for sessionStorage
const SESSION_KEY_PREFIX = 'cdm:drillPath:';

/**
 * Get the current drill path snapshot (stable reference).
 *
 * Important: `useSyncExternalStore` requires `getSnapshot()` to return a referentially stable value
 * unless the store actually changed. Do NOT allocate a new array here.
 */
export function getDrillPath(): DrillPath {
    return drillPath;
}

/**
 * Get server snapshot (SSR) - returns stable reference
 * Required by useSyncExternalStore to prevent infinite loop during hydration
 */
function getServerSnapshot(): DrillPath {
    return EMPTY_PATH;
}

/**
 * Set the entire drill path
 */
export function setDrillPath(path: DrillPath): void {
    drillPath = path.length > 0 ? Object.freeze([...path]) : EMPTY_PATH;
    syncToUrl();
    notifySubscribers();
}

/**
 * Push a new node ID onto the drill path (drill down)
 */
export function pushPath(nodeId: string): void {
    drillPath = Object.freeze([...drillPath, nodeId]);
    syncToUrl();
    notifySubscribers();
}

/**
 * Pop the last node ID from the drill path (return to parent)
 * Returns true if successful, false if path is empty
 */
export function popPath(): boolean {
    if (drillPath.length === 0) {
        return false;
    }
    const next = drillPath.slice(0, -1);
    drillPath = next.length > 0 ? Object.freeze(next) : EMPTY_PATH;
    syncToUrl();
    notifySubscribers();
    return true;
}

/**
 * Jump to a specific path (used when clicking breadcrumb items)
 */
export function goToPath(path: DrillPath): void {
    drillPath = path.length > 0 ? Object.freeze([...path]) : EMPTY_PATH;
    syncToUrl();
    notifySubscribers();
}

/**
 * Reset the drill path to empty (return to root/main view)
 */
export function resetPath(): void {
    if (drillPath.length === 0) {
        return;
    }
    drillPath = EMPTY_PATH;
    syncToUrl();
    notifySubscribers();
}

/**
 * Get the current root node ID (last item in path, or null if at main view)
 */
export function getCurrentRootId(): string | null {
    return drillPath.length > 0 ? drillPath[drillPath.length - 1] : null;
}

/**
 * Subscribe to path changes
 * Returns unsubscribe function
 */
export function subscribe(callback: () => void): () => void {
    subscribers.add(callback);
    return () => {
        subscribers.delete(callback);
    };
}

/**
 * Notify all subscribers of state change
 */
function notifySubscribers(): void {
    subscribers.forEach((callback) => callback());
}

/**
 * Sync drill path to URL hash
 * GR-3.2: Preserves pathname + search, only updates hash
 */
function syncToUrl(): void {
    if (typeof window === 'undefined') return;

    try {
        const pathname = window.location.pathname;
        const search = window.location.search;

        if (drillPath.length === 0) {
            // Clear hash when at root
            const url = pathname + search;
            window.history.replaceState(null, '', url);
        } else {
            // Encode each path segment to handle special characters
            const encodedPath = drillPath.map((id) => encodeURIComponent(id)).join('/');
            const url = `${pathname}${search}#drill=${encodedPath}`;
            window.history.replaceState(null, '', url);
        }

        // Also save to sessionStorage as backup
        const mindmapId = extractMindmapId();
        if (mindmapId) {
            const key = `${SESSION_KEY_PREFIX}${mindmapId}`;
            if (drillPath.length > 0) {
                window.sessionStorage.setItem(key, JSON.stringify(drillPath));
            } else {
                window.sessionStorage.removeItem(key);
            }
        }
    } catch (e) {
        // Silently fail if URL manipulation is not possible
        console.warn('[drillDownStore] Failed to sync to URL:', e);
    }
}

/**
 * Restore drill path from URL hash or sessionStorage
 * Returns true if a path was restored, false otherwise
 */
export function restoreFromUrl(): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const hash = window.location.hash;

        // Try URL hash first
        if (hash.startsWith('#drill=')) {
            const encodedPath = hash.substring(7); // Remove '#drill='
            if (encodedPath) {
                const pathSegments = encodedPath.split('/').map((segment) => decodeURIComponent(segment));
                if (pathSegments.length > 0 && pathSegments.every((s) => s.length > 0)) {
                    drillPath = Object.freeze(pathSegments);
                    notifySubscribers();
                    return true;
                }
            }
        }

        // Fallback to sessionStorage
        const mindmapId = extractMindmapId();
        if (mindmapId) {
            const key = `${SESSION_KEY_PREFIX}${mindmapId}`;
            const stored = window.sessionStorage.getItem(key);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
                        drillPath =
                            parsed.length > 0 ? Object.freeze(parsed as string[]) : EMPTY_PATH;
                        // Sync back to URL
                        syncToUrl();
                        notifySubscribers();
                        return true;
                    }
                } catch {
                    // Invalid JSON, ignore
                }
            }
        }

        return false;
    } catch (e) {
        console.warn('[drillDownStore] Failed to restore from URL:', e);
        return false;
    }
}

/**
 * Extract mindmap ID from URL pathname
 * Expects URL pattern like /mindmap/:id or /workspace/:workspaceId/mindmap/:id
 */
function extractMindmapId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
        const pathname = window.location.pathname;
        // Match /mindmap/:id pattern
        const mindmapMatch = pathname.match(/\/mindmap\/([^/]+)/);
        if (mindmapMatch) {
            return mindmapMatch[1];
        }

        // Fallback: use last path segment if it looks like an ID
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
            return segments[segments.length - 1];
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Check if currently in drill-down mode (not at root)
 */
export function isDrillMode(): boolean {
    return drillPath.length > 0;
}

/**
 * Get the depth of current drill path
 */
export function getDrillDepth(): number {
    return drillPath.length;
}

// =============================================================================
// React Hook Integration (useSyncExternalStore pattern)
// =============================================================================

/**
 * React hook to subscribe to drill path changes
 * Uses useSyncExternalStore for optimal React 18+ integration
 *
 * @returns Current drill path array
 */
export function useDrillPath(): DrillPath {
    return useSyncExternalStore(subscribe, getDrillPath, getServerSnapshot);
}

/**
 * React hook to get the current root node ID
 *
 * @returns Current root node ID or null if at main view
 */
export function useDrillRootId(): string | null {
    const path = useDrillPath();
    return path.length > 0 ? path[path.length - 1] : null;
}

/**
 * React hook to check if in drill mode
 *
 * @returns true if currently drilling into a subgraph
 */
export function useIsDrillMode(): boolean {
    const path = useDrillPath();
    return path.length > 0;
}
