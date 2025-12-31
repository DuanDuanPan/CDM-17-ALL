/**
 * Story 7.7: useProductSearch Hook Tests
 * Tests for search state management, filtering, and sorting logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProductSearch } from '@/hooks/useProductSearch';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useProductSearch', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty query', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      expect(result.current.query).toBe('');
    });

    it('should initialize with default sort option', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      expect(result.current.sortBy).toBe('relevance');
    });

    it('should initialize with empty filters', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      expect(result.current.filters.categories).toEqual([]);
      expect(result.current.filters.missionTypes).toEqual([]);
    });

    it('should have showFilters enabled by default', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      expect(result.current.showFilters).toBe(true);
    });
  });

  describe('Query Management', () => {
    it('should update query when setQuery is called', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.setQuery('GOES');
      });
      expect(result.current.query).toBe('GOES');
    });

    it('should filter products based on query', async () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.setQuery('landsat');
      });
      // Wait for debounce
      await waitFor(() => {
        expect(result.current.sortedProducts.some((p) =>
          p.name.toLowerCase().includes('landsat')
        )).toBe(true);
      });
    });
  });

  describe('Filter Management', () => {
    it('should toggle facet filter', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.handleToggleFacet('categories', '对地观测');
      });
      expect(result.current.filters.categories).toContain('对地观测');
    });

    it('should remove facet filter on second toggle', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.handleToggleFacet('categories', '对地观测');
      });
      act(() => {
        result.current.handleToggleFacet('categories', '对地观测');
      });
      expect(result.current.filters.categories).not.toContain('对地观测');
    });

    it('should update range filter', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.handleRangeChange('launchYear', { min: '2010', max: '2020' });
      });
      expect(result.current.filters.launchYear).toEqual({ min: '2010', max: '2020' });
    });

    it('should clear all filters', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.handleToggleFacet('categories', '对地观测');
        result.current.handleRangeChange('launchYear', { min: '2010', max: '2020' });
      });
      act(() => {
        result.current.handleClearFilters();
      });
      expect(result.current.filters.categories).toEqual([]);
      expect(result.current.filters.launchYear).toEqual({ min: '', max: '' });
    });

    it('should remove individual tag', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.handleToggleFacet('categories', '对地观测');
        result.current.handleToggleFacet('categories', '气象');
      });
      act(() => {
        result.current.handleRemoveTag('categories', '对地观测');
      });
      expect(result.current.filters.categories).not.toContain('对地观测');
      expect(result.current.filters.categories).toContain('气象');
    });
  });

  describe('Sorting', () => {
    it('should change sort option', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.setSortBy('launchDesc');
      });
      expect(result.current.sortBy).toBe('launchDesc');
    });

    it('should sort by launch year descending', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.setSortBy('launchDesc');
      });
      const years = result.current.sortedProducts.map((p) => p.launchYear);
      for (let i = 1; i < years.length; i++) {
        expect(years[i - 1]).toBeGreaterThanOrEqual(years[i]);
      }
    });
  });

  describe('Active Filter Tags', () => {
    it('should generate filter tags for selected facets', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.handleToggleFacet('categories', '对地观测');
      });
      expect(result.current.activeFilterTags).toContainEqual({
        key: 'categories',
        label: '类别',
        value: '对地观测',
      });
    });

    it('should generate filter tags for range filters', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.handleRangeChange('launchYear', { min: '2010', max: '2020' });
      });
      const tag = result.current.activeFilterTags.find((t) => t.key === 'launchYear');
      expect(tag).toBeDefined();
      expect(tag?.value).toBe('2010-2020');
    });
  });

  describe('Facet Options and Counts', () => {
    it('should provide facet options', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      expect(result.current.facetOptions.categories.length).toBeGreaterThan(0);
      expect(result.current.facetOptions.missionTypes.length).toBeGreaterThan(0);
    });

    it('should provide facet counts', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      const categoryKeys = Object.keys(result.current.facetCounts.categories);
      expect(categoryKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Suggestions', () => {
    it('should return empty suggestions for empty query', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      expect(result.current.suggestions).toEqual([]);
    });
  });

  describe('Recent Searches', () => {
    it('should add recent search', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.pushRecentSearch('GOES');
      });
      expect(result.current.recentSearches).toContain('GOES');
    });

    it('should not duplicate recent searches', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.pushRecentSearch('GOES');
        result.current.pushRecentSearch('GOES');
      });
      const count = result.current.recentSearches.filter((s) => s === 'GOES').length;
      expect(count).toBe(1);
    });

    it('should limit recent searches to 8', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.pushRecentSearch(`search-${i}`);
        }
      });
      expect(result.current.recentSearches.length).toBeLessThanOrEqual(8);
    });
  });

  describe('Filter Toggle', () => {
    it('should toggle showFilters', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      const initial = result.current.showFilters;
      act(() => {
        result.current.toggleFilters();
      });
      expect(result.current.showFilters).toBe(!initial);
    });
  });

  describe('Search Chip Click', () => {
    it('should set query when chip is clicked', () => {
      const { result } = renderHook(() => useProductSearch({ open: true }));
      act(() => {
        result.current.handleSearchChipClick('气象');
      });
      expect(result.current.query).toBe('气象');
    });
  });

  describe('State Reset', () => {
    it('should reset state when open changes to false', () => {
      const { result, rerender } = renderHook(
        ({ open }) => useProductSearch({ open }),
        { initialProps: { open: true } }
      );

      act(() => {
        result.current.setQuery('test');
        result.current.handleToggleFacet('categories', '对地观测');
      });

      rerender({ open: false });

      expect(result.current.query).toBe('');
      expect(result.current.filters.categories).toEqual([]);
    });
  });
});
