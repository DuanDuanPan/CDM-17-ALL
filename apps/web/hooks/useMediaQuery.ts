'use client';

/**
 * Story 8.2: Media Query Hook
 * Provides responsive detection using matchMedia API.
 */

import { useState, useEffect } from 'react';

/**
 * Hook to track media query matches.
 * @param query - Media query string (e.g., '(max-width: 768px)')
 * @returns Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        // SSR safety check
        if (typeof window === 'undefined') {
            return false;
        }
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);

        // Update state when media query changes
        const handleChange = (e: MediaQueryListEvent) => {
            setMatches(e.matches);
        };

        // Set initial value
        setMatches(mediaQuery.matches);

        // Listen for changes
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, [query]);

    return matches;
}

/**
 * Hook to detect mobile viewport (< 768px)
 */
export function useIsMobile(): boolean {
    return useMediaQuery('(max-width: 767px)');
}

/**
 * Hook to detect tablet viewport (768px - 1024px)
 */
export function useIsTablet(): boolean {
    return useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
}

/**
 * Hook to detect desktop viewport (> 1024px)
 */
export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 1025px)');
}
