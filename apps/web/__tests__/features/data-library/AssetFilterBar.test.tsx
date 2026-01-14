/**
 * Story 9.9: AssetFilterBar Component Tests
 * Task 7.1: Tests for the main asset filter bar component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { AssetFilterBar } from '@/features/data-library/components/asset-filter/AssetFilterBar';
import type { DataAssetFormat } from '@cdm/types';
import type { SearchScope } from '@/features/data-library/components/asset-filter/types';

describe('AssetFilterBar', () => {
    const defaultProps = {
        searchQuery: '',
        onSearchQueryChange: vi.fn(),
        searchScope: 'current-node' as SearchScope,
        onSearchScopeChange: vi.fn(),
        formatFilter: '' as DataAssetFormat | '',
        onFormatFilterChange: vi.fn(),
        createdAfter: '',
        createdBefore: '',
        onDateRangeChange: vi.fn(),
        activeFilterCount: 0,
        onClearFilters: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('rendering', () => {
        it('renders all filter components', () => {
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} />);

            expect(getByTestId('asset-filter-bar')).toBeTruthy();
            expect(getByTestId('asset-search-input')).toBeTruthy();
            expect(getByTestId('scope-selector')).toBeTruthy();
            expect(getByTestId('type-filter')).toBeTruthy();
            expect(getByTestId('date-range-filter')).toBeTruthy();
        });

        it('hides scope selector in folder view', () => {
            const { queryByTestId } = render(<AssetFilterBar {...defaultProps} isFolderView />);

            expect(queryByTestId('scope-selector')).toBeNull();
        });

        it('shows scope selector in node view', () => {
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} isFolderView={false} />);

            expect(getByTestId('scope-selector')).toBeTruthy();
        });

        it('has correct height class (h-12 = 48px)', () => {
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} />);

            const filterBar = getByTestId('asset-filter-bar');
            expect(filterBar.className).toContain('h-12');
        });
    });

    describe('search input', () => {
        it('shows current search query value', () => {
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} searchQuery="test search" />);

            const input = getByTestId('asset-search-input') as HTMLInputElement;
            expect(input.value).toBe('test search');
        });

        it('debounces search input by 300ms (AC2)', () => {
            const onSearchQueryChange = vi.fn();
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} onSearchQueryChange={onSearchQueryChange} />);

            const input = getByTestId('asset-search-input');
            fireEvent.change(input, { target: { value: 'test' } });

            // Should not be called immediately
            expect(onSearchQueryChange).not.toHaveBeenCalled();

            // Advance timer by 299ms - still should not be called
            vi.advanceTimersByTime(299);
            expect(onSearchQueryChange).not.toHaveBeenCalled();

            // Advance timer by 1ms more (total 300ms) - now should be called
            vi.advanceTimersByTime(1);
            expect(onSearchQueryChange).toHaveBeenCalledWith('test');
        });

        it('shows clear button when search query is not empty', () => {
            const { getByLabelText } = render(<AssetFilterBar {...defaultProps} searchQuery="test" />);

            expect(getByLabelText('清空搜索')).toBeTruthy();
        });

        it('hides clear button when search query is empty', () => {
            const { queryByLabelText } = render(<AssetFilterBar {...defaultProps} searchQuery="" />);

            expect(queryByLabelText('清空搜索')).toBeNull();
        });

        it('clears search immediately on clear button click', async () => {
            const onSearchQueryChange = vi.fn();
            const { getByLabelText } = render(
                <AssetFilterBar
                    {...defaultProps}
                    searchQuery="test"
                    onSearchQueryChange={onSearchQueryChange}
                />
            );

            fireEvent.click(getByLabelText('清空搜索'));

            expect(onSearchQueryChange).toHaveBeenCalledWith('');
        });
    });

    describe('filter badge', () => {
        it('shows filter badge when activeFilterCount > 0', () => {
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} activeFilterCount={2} />);

            expect(getByTestId('filter-badge').textContent).toContain('已应用 2 个筛选');
        });

        it('hides filter badge when activeFilterCount is 0', () => {
            const { queryByTestId } = render(<AssetFilterBar {...defaultProps} activeFilterCount={0} />);

            expect(queryByTestId('filter-badge')).toBeNull();
        });

        it('shows clear filters button when filters are active', () => {
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} activeFilterCount={1} />);

            expect(getByTestId('clear-filters-button')).toBeTruthy();
        });

        it('hides clear filters button when no filters are active', () => {
            const { queryByTestId } = render(<AssetFilterBar {...defaultProps} activeFilterCount={0} />);

            expect(queryByTestId('clear-filters-button')).toBeNull();
        });

        it('calls onClearFilters when clear button is clicked', () => {
            const onClearFilters = vi.fn();
            const { getByTestId } = render(
                <AssetFilterBar
                    {...defaultProps}
                    activeFilterCount={1}
                    onClearFilters={onClearFilters}
                />
            );

            fireEvent.click(getByTestId('clear-filters-button'));

            expect(onClearFilters).toHaveBeenCalled();
        });
    });

    describe('type filter', () => {
        it('renders type filter select', () => {
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} />);

            expect(getByTestId('type-filter-select')).toBeTruthy();
        });

        it('calls onFormatFilterChange when type is selected', () => {
            const onFormatFilterChange = vi.fn();
            const { getByTestId } = render(
                <AssetFilterBar
                    {...defaultProps}
                    onFormatFilterChange={onFormatFilterChange}
                />
            );

            fireEvent.change(getByTestId('type-filter-select'), {
                target: { value: 'PDF' },
            });

            expect(onFormatFilterChange).toHaveBeenCalledWith('PDF');
        });
    });

    describe('date range filter', () => {
        it('renders date range inputs', () => {
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} />);

            expect(getByTestId('date-filter-start')).toBeTruthy();
            expect(getByTestId('date-filter-end')).toBeTruthy();
        });

        it('calls onDateRangeChange when start date changes', () => {
            const onDateRangeChange = vi.fn();
            const { getByTestId } = render(
                <AssetFilterBar
                    {...defaultProps}
                    onDateRangeChange={onDateRangeChange}
                    createdBefore="2024-12-31"
                />
            );

            fireEvent.change(getByTestId('date-filter-start'), {
                target: { value: '2024-01-01' },
            });

            expect(onDateRangeChange).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
        });

        it('shows clear button when dates are set', () => {
            const { getByTestId } = render(
                <AssetFilterBar
                    {...defaultProps}
                    createdAfter="2024-01-01"
                    createdBefore="2024-12-31"
                />
            );

            expect(getByTestId('date-filter-clear')).toBeTruthy();
        });
    });

    describe('scope selector', () => {
        it('calls onSearchScopeChange when scope changes', () => {
            const onSearchScopeChange = vi.fn();
            const { getByTestId } = render(
                <AssetFilterBar
                    {...defaultProps}
                    onSearchScopeChange={onSearchScopeChange}
                />
            );

            // Open dropdown
            fireEvent.click(getByTestId('scope-selector-trigger'));
            // Select "all" option
            fireEvent.click(getByTestId('scope-option-all'));

            expect(onSearchScopeChange).toHaveBeenCalledWith('all');
        });

        it('disables scope selector when scopeDisabled is true', () => {
            const { getByTestId } = render(<AssetFilterBar {...defaultProps} scopeDisabled />);

            expect(getByTestId('scope-selector-trigger').hasAttribute('disabled')).toBe(true);
        });
    });

    describe('integration', () => {
        it('syncs local state when external searchQuery changes', () => {
            vi.useRealTimers(); // Use real timers for this test

            const { getByTestId, rerender } = render(
                <AssetFilterBar {...defaultProps} searchQuery="" />
            );

            const input = getByTestId('asset-search-input') as HTMLInputElement;
            expect(input.value).toBe('');

            // External update (e.g., from clearAllFilters)
            rerender(<AssetFilterBar {...defaultProps} searchQuery="external update" />);

            // Synchronous check after rerender
            expect(input.value).toBe('external update');
        });
    });
});
