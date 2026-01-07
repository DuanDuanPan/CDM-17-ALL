/**
 * Story 8.2: Unit tests for useMinimapStorage hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMinimapStorage } from '../../hooks/useMinimapStorage';

// Mock useMediaQuery
vi.mock('../../hooks/useMediaQuery', () => ({
    useIsMobile: vi.fn(() => false),
}));

// Import mocked function for controlling in tests
import { useIsMobile } from '../../hooks/useMediaQuery';

const STORAGE_KEY = 'cdm-minimap-visible';

describe('useMinimapStorage', () => {
    let mockMatchMedia: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();

        // Mock matchMedia
        mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('max-width: 767px') ? false : true,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        window.matchMedia = mockMatchMedia;

        // Reset useIsMobile mock
        vi.mocked(useIsMobile).mockReturnValue(false);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should default to visible (true) on desktop when no stored preference', () => {
            const { result } = renderHook(() => useMinimapStorage());

            expect(result.current.isVisible).toBe(true);
        });

        it('should default to hidden (false) on mobile when no stored preference', () => {
            // Simulate mobile viewport
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query.includes('max-width: 767px') ? true : false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useMinimapStorage());

            expect(result.current.isVisible).toBe(false);
        });

        it('should respect stored preference (visible=true)', () => {
            localStorage.setItem(STORAGE_KEY, 'true');

            const { result } = renderHook(() => useMinimapStorage());

            expect(result.current.isVisible).toBe(true);
        });

        it('should respect stored preference (visible=false)', () => {
            localStorage.setItem(STORAGE_KEY, 'false');

            const { result } = renderHook(() => useMinimapStorage());

            expect(result.current.isVisible).toBe(false);
        });

        it('should respect stored preference on mobile (overrides mobile default)', () => {
            // User explicitly set to visible on mobile
            localStorage.setItem(STORAGE_KEY, 'true');

            // Simulate mobile viewport
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query.includes('max-width: 767px') ? true : false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useMinimapStorage());

            // Should respect user preference over mobile default
            expect(result.current.isVisible).toBe(true);
        });
    });

    describe('setIsVisible', () => {
        it('should update visibility state', () => {
            const { result } = renderHook(() => useMinimapStorage());

            expect(result.current.isVisible).toBe(true);

            act(() => {
                result.current.setIsVisible(false);
            });

            expect(result.current.isVisible).toBe(false);
        });

        it('should persist to localStorage', () => {
            const { result } = renderHook(() => useMinimapStorage());

            act(() => {
                result.current.setIsVisible(false);
            });

            expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
        });
    });

    describe('toggle', () => {
        it('should toggle from visible to hidden', () => {
            const { result } = renderHook(() => useMinimapStorage());

            expect(result.current.isVisible).toBe(true);

            act(() => {
                result.current.toggle();
            });

            expect(result.current.isVisible).toBe(false);
        });

        it('should toggle from hidden to visible', () => {
            localStorage.setItem(STORAGE_KEY, 'false');

            const { result } = renderHook(() => useMinimapStorage());

            expect(result.current.isVisible).toBe(false);

            act(() => {
                result.current.toggle();
            });

            expect(result.current.isVisible).toBe(true);
        });

        it('should persist toggled state to localStorage', () => {
            const { result } = renderHook(() => useMinimapStorage());

            act(() => {
                result.current.toggle();
            });

            expect(localStorage.getItem(STORAGE_KEY)).toBe('false');

            act(() => {
                result.current.toggle();
            });

            expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
        });
    });

    describe('isMobile', () => {
        it('should return false on desktop', () => {
            vi.mocked(useIsMobile).mockReturnValue(false);

            const { result } = renderHook(() => useMinimapStorage());

            expect(result.current.isMobile).toBe(false);
        });

        it('should return true on mobile', () => {
            vi.mocked(useIsMobile).mockReturnValue(true);

            const { result } = renderHook(() => useMinimapStorage());

            expect(result.current.isMobile).toBe(true);
        });
    });

    describe('defaultVisible parameter', () => {
        it('should use custom default when no stored preference on desktop', () => {
            const { result } = renderHook(() => useMinimapStorage(false));

            expect(result.current.isVisible).toBe(false);
        });

        it('should ignore custom default when stored preference exists', () => {
            localStorage.setItem(STORAGE_KEY, 'true');

            const { result } = renderHook(() => useMinimapStorage(false));

            expect(result.current.isVisible).toBe(true);
        });
    });
});
