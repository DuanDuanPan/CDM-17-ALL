/**
 * Story 9.9: Asset Filter State Hook
 * Task 3.1: Manages asset filter state (AC4)
 * 
 * Features:
 * - Manages assetSearchQuery, searchScope, formatFilter, createdAfter, createdBefore
 * - Provides clear all filters function
 * - Calculates active filter count for badge
 * - Provides reset function for view changes (AC4)
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import type { DataAssetFormat } from '@cdm/types';
import type { SearchScope, AssetFilterState } from '../components/asset-filter/types';
import { DEFAULT_FILTER_STATE } from '../components/asset-filter/types';

export interface UseAssetFilterStateResult {
    /** Current filter state */
    filterState: AssetFilterState;

    /** Set search query */
    setAssetSearchQuery: (query: string) => void;

    /** Set search scope */
    setSearchScope: (scope: SearchScope) => void;

    /** Set format filter */
    setFormatFilter: (format: DataAssetFormat | '') => void;

    /** Set date range */
    setDateRange: (after: string, before: string) => void;

    /** Clear all filters */
    clearAllFilters: () => void;

    /** Reset filters on view change (AC4) */
    resetOnViewChange: () => void;

    /** Count of active filters (for badge) */
    activeFilterCount: number;

    /** Whether any filters are active */
    hasActiveFilters: boolean;
}

/**
 * Hook for managing asset filter state
 * AC4: Implements filter state behavior rules
 */
export function useAssetFilterState(): UseAssetFilterStateResult {
    const [filterState, setFilterState] = useState<AssetFilterState>(DEFAULT_FILTER_STATE);

    const setAssetSearchQuery = useCallback((query: string) => {
        setFilterState((prev) => ({ ...prev, assetSearchQuery: query }));
    }, []);

    const setSearchScope = useCallback((scope: SearchScope) => {
        setFilterState((prev) => ({ ...prev, searchScope: scope }));
    }, []);

    const setFormatFilter = useCallback((format: DataAssetFormat | '') => {
        setFilterState((prev) => ({ ...prev, formatFilter: format }));
    }, []);

    const setDateRange = useCallback((after: string, before: string) => {
        setFilterState((prev) => ({
            ...prev,
            createdAfter: after,
            createdBefore: before,
        }));
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilterState(DEFAULT_FILTER_STATE);
    }, []);

    /**
     * Reset filters on view change (AC4)
     * Called when switching between node/folder views
     */
    const resetOnViewChange = useCallback(() => {
        setFilterState(DEFAULT_FILTER_STATE);
    }, []);

    /**
     * Calculate active filter count (for AC2 badge)
     * Counts non-empty filter values (excluding default scope)
     */
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filterState.assetSearchQuery) count++;
        if (filterState.formatFilter) count++;
        if (filterState.createdAfter || filterState.createdBefore) count++;
        // Scope is not counted as it always has a value
        return count;
    }, [filterState]);

    const hasActiveFilters = activeFilterCount > 0;

    return {
        filterState,
        setAssetSearchQuery,
        setSearchScope,
        setFormatFilter,
        setDateRange,
        clearAllFilters,
        resetOnViewChange,
        activeFilterCount,
        hasActiveFilters,
    };
}

export default useAssetFilterState;
