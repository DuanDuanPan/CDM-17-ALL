/**
 * Story 9.9: Asset Filter Bar Component
 * Task 1.2: Main filter bar component (AC2)
 * 
 * Features:
 * - Search input with 300ms debounce (AC2)
 * - Scope selector (AC3)
 * - Type filter
 * - Date range filter
 * - Clear filters button
 * - Filter badge showing count
 * - Height ≤ 48px (AC2)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn, Input, Button } from '@cdm/ui';
import type { DataAssetFormat } from '@cdm/types';
import type { SearchScope } from './types';
import { ScopeSelector } from './ScopeSelector';
import { TypeFilter } from './TypeFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { FilterBadge } from './FilterBadge';

export interface AssetFilterBarProps {
    /** Current search query */
    searchQuery: string;
    /** Callback when search query changes (after debounce) */
    onSearchQueryChange: (query: string) => void;

    /** Current search scope */
    searchScope: SearchScope;
    /** Callback when scope changes */
    onSearchScopeChange: (scope: SearchScope) => void;

    /** Current format filter */
    formatFilter: DataAssetFormat | '';
    /** Callback when format changes */
    onFormatFilterChange: (format: DataAssetFormat | '') => void;

    /** Date range start */
    createdAfter: string;
    /** Date range end */
    createdBefore: string;
    /** Callback when date range changes */
    onDateRangeChange: (after: string, before: string) => void;

    /** Number of active filters (for badge) */
    activeFilterCount: number;

    /** Callback to clear all filters */
    onClearFilters: () => void;

    /** Whether scope selector is disabled (e.g., no node selected) */
    scopeDisabled?: boolean;

    /** Disable "current-node" scope option (e.g., no node selected) */
    disableCurrentNodeScope?: boolean;

    /** Whether in folder view (hides scope selector) */
    isFolderView?: boolean;

    /** Custom class name */
    className?: string;
}

export function AssetFilterBar({
    searchQuery,
    onSearchQueryChange,
    searchScope,
    onSearchScopeChange,
    formatFilter,
    onFormatFilterChange,
    createdAfter,
    createdBefore,
    onDateRangeChange,
    activeFilterCount,
    onClearFilters,
    scopeDisabled = false,
    disableCurrentNodeScope = false,
    isFolderView = false,
    className,
}: AssetFilterBarProps) {
    // Local state for search input (for debouncing)
    const [localQuery, setLocalQuery] = useState(searchQuery);

    // Sync local state when external query changes (e.g., on clear)
    useEffect(() => {
        setLocalQuery(searchQuery);
    }, [searchQuery]);

    // Debounce search query (AC2: 300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localQuery !== searchQuery) {
                onSearchQueryChange(localQuery);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [localQuery, searchQuery, onSearchQueryChange]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalQuery(e.target.value);
    }, []);

    const handleClearSearch = useCallback(() => {
        setLocalQuery('');
        onSearchQueryChange('');
    }, [onSearchQueryChange]);

    const hasActiveFilters = activeFilterCount > 0;

    return (
        <div
            className={cn(
                'flex items-center gap-3 px-4 py-2.5 border-b',
                'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800',
                'h-12', // 48px = h-12
                className
            )}
            data-testid="asset-filter-bar"
        >
            {/* Search input */}
            <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    type="text"
                    value={localQuery}
                    onChange={handleSearchChange}
                    placeholder="搜索资产..."
                    className="pl-9 pr-8 h-9"
                    data-testid="asset-search-input"
                />
                {localQuery && (
                    <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                        aria-label="清空搜索"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Scope selector (hidden in folder view) */}
            {!isFolderView && (
                <ScopeSelector
                    value={searchScope}
                    onChange={onSearchScopeChange}
                    disabled={scopeDisabled}
                    disableCurrentNode={disableCurrentNodeScope}
                />
            )}

            {/* Type filter */}
            <TypeFilter
                value={formatFilter}
                onChange={onFormatFilterChange}
            />

            {/* Date range filter */}
            <DateRangeFilter
                createdAfter={createdAfter}
                createdBefore={createdBefore}
                onChange={onDateRangeChange}
            />

            {/* Filter badge + clear button */}
            <div className="flex items-center gap-2">
                <FilterBadge count={activeFilterCount} />

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearFilters}
                        className="text-xs h-7"
                        data-testid="clear-filters-button"
                    >
                        清除筛选
                    </Button>
                )}
            </div>
        </div>
    );
}

export default AssetFilterBar;
