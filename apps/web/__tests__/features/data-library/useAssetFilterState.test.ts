/**
 * Story 9.9: useAssetFilterState Hook Tests
 * Task 7.3: Tests for asset filter state management
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssetFilterState } from '@/features/data-library/hooks/useAssetFilterState';
import { DEFAULT_FILTER_STATE } from '@/features/data-library/components/asset-filter/types';

describe('useAssetFilterState', () => {
    describe('initialization', () => {
        it('initializes with default filter state', () => {
            const { result } = renderHook(() => useAssetFilterState());

            expect(result.current.filterState).toEqual(DEFAULT_FILTER_STATE);
            expect(result.current.activeFilterCount).toBe(0);
            expect(result.current.hasActiveFilters).toBe(false);
        });
    });

    describe('setAssetSearchQuery', () => {
        it('updates search query', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setAssetSearchQuery('test query');
            });

            expect(result.current.filterState.assetSearchQuery).toBe('test query');
        });

        it('increments activeFilterCount when search query is set', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setAssetSearchQuery('test');
            });

            expect(result.current.activeFilterCount).toBe(1);
            expect(result.current.hasActiveFilters).toBe(true);
        });
    });

    describe('setSearchScope', () => {
        it('updates search scope to "all"', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setSearchScope('all');
            });

            expect(result.current.filterState.searchScope).toBe('all');
        });

        it('updates search scope to "unlinked"', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setSearchScope('unlinked');
            });

            expect(result.current.filterState.searchScope).toBe('unlinked');
        });

        it('does not affect activeFilterCount (scope always has a value)', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setSearchScope('all');
            });

            // Scope change alone should not count as an active filter
            expect(result.current.activeFilterCount).toBe(0);
        });
    });

    describe('setFormatFilter', () => {
        it('updates format filter', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setFormatFilter('PDF');
            });

            expect(result.current.filterState.formatFilter).toBe('PDF');
        });

        it('increments activeFilterCount when format is set', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setFormatFilter('STEP');
            });

            expect(result.current.activeFilterCount).toBe(1);
        });

        it('clears format filter with empty string', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setFormatFilter('PDF');
            });

            expect(result.current.filterState.formatFilter).toBe('PDF');

            act(() => {
                result.current.setFormatFilter('');
            });

            expect(result.current.filterState.formatFilter).toBe('');
            expect(result.current.activeFilterCount).toBe(0);
        });
    });

    describe('setDateRange', () => {
        it('updates date range filters', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setDateRange('2024-01-01', '2024-12-31');
            });

            expect(result.current.filterState.createdAfter).toBe('2024-01-01');
            expect(result.current.filterState.createdBefore).toBe('2024-12-31');
        });

        it('counts date range as single filter', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setDateRange('2024-01-01', '2024-12-31');
            });

            // Both dates set counts as 1 filter
            expect(result.current.activeFilterCount).toBe(1);
        });

        it('counts partial date range as single filter', () => {
            const { result } = renderHook(() => useAssetFilterState());

            act(() => {
                result.current.setDateRange('2024-01-01', '');
            });

            expect(result.current.activeFilterCount).toBe(1);
        });
    });

    describe('clearAllFilters', () => {
        it('resets all filters to default state', () => {
            const { result } = renderHook(() => useAssetFilterState());

            // Set various filters
            act(() => {
                result.current.setAssetSearchQuery('test');
                result.current.setSearchScope('unlinked');
                result.current.setFormatFilter('STEP');
                result.current.setDateRange('2024-01-01', '2024-12-31');
            });

            expect(result.current.activeFilterCount).toBe(3);

            act(() => {
                result.current.clearAllFilters();
            });

            expect(result.current.filterState).toEqual(DEFAULT_FILTER_STATE);
            expect(result.current.activeFilterCount).toBe(0);
            expect(result.current.hasActiveFilters).toBe(false);
        });
    });

    describe('resetOnViewChange (AC4)', () => {
        it('resets filters when view changes', () => {
            const { result } = renderHook(() => useAssetFilterState());

            // Set filters
            act(() => {
                result.current.setAssetSearchQuery('test');
                result.current.setFormatFilter('PDF');
            });

            expect(result.current.activeFilterCount).toBe(2);

            // Simulate view change
            act(() => {
                result.current.resetOnViewChange();
            });

            expect(result.current.filterState).toEqual(DEFAULT_FILTER_STATE);
            expect(result.current.activeFilterCount).toBe(0);
        });
    });

    describe('activeFilterCount calculation', () => {
        it('counts multiple active filters correctly', () => {
            const { result } = renderHook(() => useAssetFilterState());

            // Set all filter types
            act(() => {
                result.current.setAssetSearchQuery('test'); // +1
                result.current.setFormatFilter('STEP');      // +1
                result.current.setDateRange('2024-01-01', '2024-12-31'); // +1 (counts as one)
            });

            expect(result.current.activeFilterCount).toBe(3);
            expect(result.current.hasActiveFilters).toBe(true);
        });

        it('returns 0 when no filters are active', () => {
            const { result } = renderHook(() => useAssetFilterState());

            expect(result.current.activeFilterCount).toBe(0);
            expect(result.current.hasActiveFilters).toBe(false);
        });
    });
});
