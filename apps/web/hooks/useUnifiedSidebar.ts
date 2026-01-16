'use client';

/**
 * Unified Sidebar State Management Hook
 * 
 * Manages the left sidebar panel state with the following behaviors:
 * - Panels are mutually exclusive (only one can be open at a time)
 * - Properties and Comments panels auto-collapse when no node is selected
 * - Clicking an already-active panel icon closes it
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/** Available sidebar panels */
export type SidebarPanel = 'templates' | 'outline' | 'properties' | 'comments' | 'archive' | null;

/** Panels that require a selected node to remain open */
const NODE_DEPENDENT_PANELS: SidebarPanel[] = ['properties', 'comments'];

export interface UseUnifiedSidebarOptions {
    /** Currently selected node ID - used for auto-collapse behavior */
    selectedNodeId: string | null;
    /** Initial panel to show (optional) */
    initialPanel?: SidebarPanel;
}

export interface UseUnifiedSidebarReturn {
    /** Currently active panel, or null if none */
    activePanel: SidebarPanel;
    /** Whether the sidebar content area is expanded */
    isExpanded: boolean;
    /** Open a specific panel (closes others). Pass force=true to skip node selection check */
    openPanel: (panel: SidebarPanel, force?: boolean) => void;
    /** Close the current panel */
    closePanel: () => void;
    /** Toggle a panel - opens if closed, closes if already open */
    togglePanel: (panel: SidebarPanel) => void;
}

/**
 * useUnifiedSidebar - Manages unified left sidebar state
 */
export function useUnifiedSidebar({
    selectedNodeId,
    initialPanel = null,
}: UseUnifiedSidebarOptions): UseUnifiedSidebarReturn {
    const [activePanel, setActivePanel] = useState<SidebarPanel>(initialPanel);

    // Track previous selectedNodeId to detect changes
    const prevSelectedNodeIdRef = useRef<string | null>(selectedNodeId);

    // Derived state: sidebar is expanded when any panel is active
    const isExpanded = activePanel !== null;

    /**
     * Open a specific panel (closes any other open panel)
     * @param force - If true, skip NODE_DEPENDENT check (used for notification navigation)
     */
    const openPanel = useCallback((panel: SidebarPanel, force = false) => {
        // Don't open node-dependent panels if no node is selected (unless force)
        if (!force && panel && NODE_DEPENDENT_PANELS.includes(panel) && !selectedNodeId) {
            return;
        }
        setActivePanel(panel);
    }, [selectedNodeId]);

    /**
     * Close the current panel
     */
    const closePanel = useCallback(() => {
        setActivePanel(null);
    }, []);

    /**
     * Toggle a panel - opens if closed/different, closes if already active
     */
    const togglePanel = useCallback((panel: SidebarPanel) => {
        setActivePanel((current) => {
            // If clicking the same panel, close it
            if (current === panel) {
                return null;
            }
            // Don't open node-dependent panels if no node is selected
            if (panel && NODE_DEPENDENT_PANELS.includes(panel) && !selectedNodeId) {
                return current;
            }
            return panel;
        });
    }, [selectedNodeId]);

    /**
     * Auto-collapse node-dependent panels when node is deselected or deleted
     * 
     * Key behavior: When the selectedNodeId changes to null (or to a different node,
     * then back to null), and a node-dependent panel is open, close it.
     */
    useEffect(() => {
        const prevNodeId = prevSelectedNodeIdRef.current;
        prevSelectedNodeIdRef.current = selectedNodeId;

        // If we had a node selected before and now we don't, close node-dependent panels
        if (prevNodeId !== null && selectedNodeId === null) {
            setActivePanel((current) => {
                if (current && NODE_DEPENDENT_PANELS.includes(current)) {
                    return null;
                }
                return current;
            });
        }
    }, [selectedNodeId]);

    return {
        activePanel,
        isExpanded,
        openPanel,
        closePanel,
        togglePanel,
    };
}

export default useUnifiedSidebar;
