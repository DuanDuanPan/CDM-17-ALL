/**
 * Story 8.2: Minimap Storage Hook
 * Manages localStorage persistence for minimap visibility preference
 * Responsive: defaults to hidden on mobile (< 768px) but respects user preference
 */

import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from './useMediaQuery';

const STORAGE_KEY = 'cdm-minimap-visible';

export interface UseMinimapStorageReturn {
    isVisible: boolean;
    setIsVisible: (visible: boolean) => void;
    toggle: () => void;
    /** Whether the device is mobile viewport */
    isMobile: boolean;
}

/**
 * Hook for persisting minimap visibility state to localStorage
 * - Desktop: defaults to visible (true) if no stored preference
 * - Mobile (< 768px): defaults to hidden (false) if no stored preference
 * - Always respects user's manual toggle (stored in localStorage)
 */
export function useMinimapStorage(defaultVisible = true): UseMinimapStorageReturn {
    const isMobile = useIsMobile();

    // Track whether we've completed client-side hydration
    const [isHydrated, setIsHydrated] = useState(false);

    // Always start with defaultVisible to prevent hydration mismatch
    // Server and client both render with the same initial value
    const [isVisible, setIsVisibleState] = useState<boolean>(defaultVisible);

    // After hydration, sync with localStorage (client-only effect)
    useEffect(() => {
        setIsHydrated(true);

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored !== null) {
                // User has explicit preference - respect it
                setIsVisibleState(stored === 'true');
                return;
            }
        } catch {
            // localStorage may not be available
        }

        // No stored preference - use responsive default
        // On mobile, default to hidden; on desktop, use defaultVisible
        const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
        if (isMobileViewport) {
            setIsVisibleState(false);
        }
        // If not mobile, keep the defaultVisible value
    }, []); // Empty deps - only run once on mount

    // Sync to localStorage when state changes (only after hydration)
    useEffect(() => {
        if (!isHydrated) return;

        try {
            localStorage.setItem(STORAGE_KEY, String(isVisible));
        } catch {
            // localStorage may not be available
        }
    }, [isVisible, isHydrated]);

    const setIsVisible = useCallback((visible: boolean) => {
        setIsVisibleState(visible);
    }, []);

    const toggle = useCallback(() => {
        setIsVisibleState((prev) => !prev);
    }, []);

    return {
        isVisible,
        setIsVisible,
        toggle,
        isMobile,
    };
}
