/**
 * Story 8.2: Unit tests for useMediaQuery hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '../../hooks/useMediaQuery';

describe('useMediaQuery', () => {
    let mockMatchMedia: ReturnType<typeof vi.fn>;
    let changeListeners: Map<string, ((e: MediaQueryListEvent) => void)[]>;

    beforeEach(() => {
        changeListeners = new Map();

        mockMatchMedia = vi.fn().mockImplementation((query: string) => {
            const listeners: ((e: MediaQueryListEvent) => void)[] = [];
            changeListeners.set(query, listeners);

            return {
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
                    if (event === 'change') {
                        listeners.push(callback);
                    }
                }),
                removeEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
                    if (event === 'change') {
                        const index = listeners.indexOf(callback);
                        if (index > -1) {
                            listeners.splice(index, 1);
                        }
                    }
                }),
                dispatchEvent: vi.fn(),
            };
        });

        window.matchMedia = mockMatchMedia;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('useMediaQuery', () => {
        it('should return false when query does not match', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

            expect(result.current).toBe(false);
        });

        it('should return true when query matches', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: true,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

            expect(result.current).toBe(true);
        });

        it('should update when media query changes', () => {
            let currentMatches = false;
            const listeners: ((e: MediaQueryListEvent) => void)[] = [];

            mockMatchMedia.mockImplementation((query: string) => ({
                matches: currentMatches,
                media: query,
                onchange: null,
                addEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
                    if (event === 'change') {
                        listeners.push(callback);
                    }
                }),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

            expect(result.current).toBe(false);

            // Simulate media query change
            act(() => {
                currentMatches = true;
                listeners.forEach((cb) =>
                    cb({ matches: true, media: '(max-width: 768px)' } as MediaQueryListEvent)
                );
            });

            expect(result.current).toBe(true);
        });

        it('should cleanup event listener on unmount', () => {
            const removeEventListener = vi.fn();

            mockMatchMedia.mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener,
                dispatchEvent: vi.fn(),
            }));

            const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

            unmount();

            expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        });

        it('should reinitialize when query changes', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query.includes('768') ? true : false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result, rerender } = renderHook(
                ({ query }) => useMediaQuery(query),
                { initialProps: { query: '(max-width: 768px)' } }
            );

            expect(result.current).toBe(true);

            rerender({ query: '(max-width: 1024px)' });

            expect(result.current).toBe(false);
        });
    });

    describe('useIsMobile', () => {
        it('should return true for mobile viewport (< 768px)', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query.includes('767') ? true : false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useIsMobile());

            expect(result.current).toBe(true);
        });

        it('should return false for desktop viewport', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useIsMobile());

            expect(result.current).toBe(false);
        });
    });

    describe('useIsTablet', () => {
        it('should return true for tablet viewport (768px - 1024px)', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query.includes('768px') && query.includes('1024px') ? true : false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useIsTablet());

            expect(result.current).toBe(true);
        });

        it('should return false for mobile viewport', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useIsTablet());

            expect(result.current).toBe(false);
        });
    });

    describe('useIsDesktop', () => {
        it('should return true for desktop viewport (> 1024px)', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query.includes('1025px') ? true : false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useIsDesktop());

            expect(result.current).toBe(true);
        });

        it('should return false for mobile viewport', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useIsDesktop());

            expect(result.current).toBe(false);
        });
    });
});
