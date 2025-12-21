'use client';

/**
 * Story 2.6: Multi-Select & Clipboard
 * Hook for registering Cmd+C/X/V keyboard shortcuts
 * Handles conflict with text editing in node labels
 */

import { useEffect, useCallback, useRef } from 'react';

export interface UseClipboardShortcutsOptions {
    /** Copy function from useClipboard */
    copy: () => Promise<void>;
    /** Cut function from useClipboard */
    cut: () => Promise<void>;
    /** Paste function from useClipboard (position optional for keyboard paste) */
    paste: (position?: { x: number; y: number }) => Promise<void>;
    /** Delete function from useClipboard (Story 2.6) */
    deleteNodes: () => void;
    /** Whether there is at least one selected node */
    hasSelection: boolean;
    /** Whether editing is active (node label editing) */
    isEditing?: boolean;
    /** Whether this hook is enabled */
    enabled?: boolean;
}

/**
 * Hook for registering clipboard keyboard shortcuts (Cmd+C, Cmd+X, Cmd+V)
 * 
 * IMPORTANT: Must not interfere with text editing in node labels.
 * When isEditing is true, shortcuts are disabled to let the browser
 * handle clipboard operations for text selection.
 * 
 * @example
 * ```tsx
 * const { copy, cut, paste } = useClipboard({ ... });
 * const { hasSelection } = useSelection({ graph });
 * const { isEditing } = useEditingState({ graph });
 * 
 * useClipboardShortcuts({
 *   copy,
 *   cut,
 *   paste,
 *   hasSelection,
 *   isEditing,
 * });
 * ```
 */
export function useClipboardShortcuts({
    copy,
    cut,
    paste,
    deleteNodes,
    hasSelection,
    isEditing = false,
    enabled = true,
}: UseClipboardShortcutsOptions): void {

    // Use refs to access latest values without recreating the handler
    const copyRef = useRef(copy);
    const cutRef = useRef(cut);
    const pasteRef = useRef(paste);
    const deleteNodesRef = useRef(deleteNodes);
    const hasSelectionRef = useRef(hasSelection);
    const isEditingRef = useRef(isEditing);
    const enabledRef = useRef(enabled);

    // Update refs when values change
    useEffect(() => {
        copyRef.current = copy;
        cutRef.current = cut;
        pasteRef.current = paste;
        deleteNodesRef.current = deleteNodes;
        hasSelectionRef.current = hasSelection;
        isEditingRef.current = isEditing;
        enabledRef.current = enabled;
    }, [copy, cut, paste, deleteNodes, hasSelection, isEditing, enabled]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Skip if disabled
        if (!enabledRef.current) return;

        // Skip if editing text (let browser handle text clipboard)
        if (isEditingRef.current) return;

        // Skip if focus is in input/textarea/contenteditable
        const target = e.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        // Handle Delete/Backspace WITHOUT modifier (for multi-select deletion)
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (hasSelectionRef.current) {
                e.preventDefault();
                e.stopPropagation();
                deleteNodesRef.current();
            }
            return;
        }

        // Check for Cmd (Mac) or Ctrl (Windows/Linux)
        const isMac = navigator.platform.toLowerCase().includes('mac');
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        if (!modifier) return;

        switch (e.key.toLowerCase()) {
            case 'c':
                // Copy: only if there's a selection
                if (hasSelectionRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    copyRef.current();
                }
                break;

            case 'x':
                // Cut: only if there's a selection
                if (hasSelectionRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    cutRef.current();
                }
                break;

            case 'v':
                // Paste: always available (no position = center viewport)
                e.preventDefault();
                e.stopPropagation();
                pasteRef.current(); // No position = center on viewport
                break;

            case 'a':
                // Select All (Cmd+A) - handled separately in useSelection if needed
                break;
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
