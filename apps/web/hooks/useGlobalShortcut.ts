'use client';

/**
 * Story 2.5: useGlobalShortcut Hook
 * Provides cross-platform keyboard shortcut handling (Cmd+K on Mac, Ctrl+K on Windows/Linux)
 */

import { useEffect, useCallback } from 'react';

export interface UseGlobalShortcutOptions {
    key: string;
    enabled?: boolean;
}

/**
 * Listen for a global keyboard shortcut
 * Automatically handles Cmd (Mac) vs Ctrl (Windows/Linux)
 */
export function useGlobalShortcut(
    key: string,
    callback: () => void,
    options: { enabled?: boolean } = {}
) {
    const { enabled = true } = options;

    const handler = useCallback(
        (e: KeyboardEvent) => {
            if (!enabled) return;

            // Detect platform
            const isMac =
                typeof navigator !== 'undefined' &&
                navigator.platform.toLowerCase().includes('mac');

            // Check for Cmd+Key (Mac) or Ctrl+Key (Windows/Linux)
            const isCorrectModifier = isMac ? e.metaKey : e.ctrlKey;

            // Match the key (case-insensitive) with correct modifier and no extra modifiers
            if (
                e.key.toLowerCase() === key.toLowerCase() &&
                isCorrectModifier &&
                !e.shiftKey &&
                !e.altKey
            ) {
                e.preventDefault();
                callback();
            }
        },
        [key, callback, enabled]
    );

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handler, enabled]);
}

/**
 * Check if current platform is Mac
 */
export function useIsMac(): boolean {
    if (typeof navigator === 'undefined') return false;
    return navigator.platform.toLowerCase().includes('mac');
}

/**
 * Get the modifier key display text for current platform
 */
export function useModifierKey(): string {
    const isMac = useIsMac();
    return isMac ? '⌘' : 'Ctrl';
}
