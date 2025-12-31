'use client';

/**
 * Story 7.7: useProductSearch Hook
 * Extracted from ProductSearchDialog for separation of concerns
 * Manages: search state, filtering, sorting, recent searches, facet calculations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import {
  HOT_KEYWORDS,
  SATELLITE_PRODUCTS,
  type SatelliteProduct,
} from '@/lib/productLibrary';
import { STORAGE_KEY_PRODUCT_SEARCH_HISTORY } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RangeFilter = {
  min: string;
  max: string;
};

export type ProductFilters = {
  categories: string[];
  missionTypes: string[];
  payloadTypes: string[];
  orbitTypes: string[];
  agencies: string[];
  regions: string[];
  launchYear: RangeFilter;
  orbitAltitudeKm: RangeFilter;
  massKg: RangeFilter;
  powerW: RangeFilter;
  resolutionM: RangeFilter;
};

// Facet keys (array-valued filters) - used for handleToggleFacet
export type FacetKey = 'categories' | 'missionTypes' | 'payloadTypes' | 'orbitTypes' | 'agencies' | 'regions';

// Range keys - used for handleRangeChange
export type RangeKey = 'launchYear' | 'orbitAltitudeKm' | 'massKg' | 'powerW' | 'resolutionM';

export type SortOption =
  | 'relevance'
  | 'launchDesc'
  | 'launchAsc'
  | 'massAsc'
  | 'massDesc'
  | 'powerDesc'
  | 'resolutionAsc';

export type FilterTag = {
  key: keyof ProductFilters;
  label: string;
  value: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const SORT_OPTIONS: Array<{ id: SortOption; label: string }> = [
  { id: 'relevance', label: '相关度' },
  { id: 'launchDesc', label: '发射时间(新→旧)' },
  { id: 'launchAsc', label: '发射时间(旧→新)' },
  { id: 'massDesc', label: '质量(高→低)' },
  { id: 'massAsc', label: '质量(低→高)' },
  { id: 'powerDesc', label: '功率(高→低)' },
  { id: 'resolutionAsc', label: '分辨率(高→低)' },
];

export const EMPTY_RANGE: RangeFilter = { min: '', max: '' };

export const DEFAULT_FILTERS: ProductFilters = {
  categories: [],
  missionTypes: [],
  payloadTypes: [],
  orbitTypes: [],
  agencies: [],
  regions: [],
  launchYear: { ...EMPTY_RANGE },
  orbitAltitudeKm: { ...EMPTY_RANGE },
  massKg: { ...EMPTY_RANGE },
  powerW: { ...EMPTY_RANGE },
  resolutionM: { ...EMPTY_RANGE },
};

export const FILTER_LABELS: Record<keyof ProductFilters, string> = {
  categories: '类别',
  missionTypes: '任务类型',
  payloadTypes: '载荷类型',
  orbitTypes: '轨道类型',
  agencies: '机构',
  regions: '区域',
  launchYear: '发射年份',
  orbitAltitudeKm: '轨道高度(km)',
  massKg: '质量(kg)',
  powerW: '功率(W)',
  resolutionM: '分辨率(m)',
};

// Re-export for convenience
export { HOT_KEYWORDS };

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function toNumber(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inRange(value: number | undefined, range: RangeFilter): boolean {
  if (value === undefined) return false;
  const min = toNumber(range.min);
  const max = toNumber(range.max);
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function buildSearchText(product: SatelliteProduct) {
  return normalize(
    [
      product.name,
      product.code,
      product.category,
      product.missionType,
      product.payloadType,
      product.orbitType,
      product.region,
      product.agencies.join(' '),
      ...(product.keywords || []),
    ].join(' ')
  );
}

function getSearchScore(product: SatelliteProduct, tokens: string[]) {
  if (tokens.length === 0) return 0;
  const name = normalize(product.name);
  const code = normalize(product.code);
  const category = normalize(product.category);
  const mission = normalize(product.missionType);
  const payload = normalize(product.payloadType);
  const agencies = normalize(product.agencies.join(' '));
  const keywords = normalize((product.keywords || []).join(' '));

  let score = 0;
  for (const token of tokens) {
    if (name.includes(token)) score += 6;
    if (code.includes(token)) score += 5;
    if (category.includes(token)) score += 3;
    if (mission.includes(token)) score += 3;
    if (payload.includes(token)) score += 2;
    if (agencies.includes(token)) score += 2;
    if (keywords.includes(token)) score += 2;
  }
  return score;
}

function applyFilters(
  products: SatelliteProduct[],
  queryTokens: string[],
  filters: ProductFilters,
  omit?: keyof ProductFilters
) {
  return products.filter((product) => {
    if (queryTokens.length > 0) {
      const searchText = buildSearchText(product);
      const matchesAll = queryTokens.every((token) => searchText.includes(token));
      if (!matchesAll) return false;
    }

    if (omit !== 'categories' && filters.categories.length > 0) {
      if (!filters.categories.includes(product.category)) return false;
    }

    if (omit !== 'missionTypes' && filters.missionTypes.length > 0) {
      if (!filters.missionTypes.includes(product.missionType)) return false;
    }

    if (omit !== 'payloadTypes' && filters.payloadTypes.length > 0) {
      if (!filters.payloadTypes.includes(product.payloadType)) return false;
    }

    if (omit !== 'orbitTypes' && filters.orbitTypes.length > 0) {
      if (!filters.orbitTypes.includes(product.orbitType)) return false;
    }

    if (omit !== 'agencies' && filters.agencies.length > 0) {
      const matchesAgency = product.agencies.some((agency) =>
        filters.agencies.includes(agency)
      );
      if (!matchesAgency) return false;
    }

    if (omit !== 'regions' && filters.regions.length > 0) {
      if (!filters.regions.includes(product.region)) return false;
    }

    if (omit !== 'launchYear' && (filters.launchYear.min || filters.launchYear.max)) {
      if (!inRange(product.launchYear, filters.launchYear)) return false;
    }

    if (
      omit !== 'orbitAltitudeKm' &&
      (filters.orbitAltitudeKm.min || filters.orbitAltitudeKm.max)
    ) {
      if (!inRange(product.orbitAltitudeKm, filters.orbitAltitudeKm)) return false;
    }

    if (omit !== 'massKg' && (filters.massKg.min || filters.massKg.max)) {
      if (!inRange(product.massKg, filters.massKg)) return false;
    }

    if (omit !== 'powerW' && (filters.powerW.min || filters.powerW.max)) {
      if (!inRange(product.powerW, filters.powerW)) return false;
    }

    if (omit !== 'resolutionM' && (filters.resolutionM.min || filters.resolutionM.max)) {
      if (!inRange(product.resolutionM, filters.resolutionM)) return false;
    }

    return true;
  });
}

function sortProducts(
  products: SatelliteProduct[],
  queryTokens: string[],
  sortBy: SortOption
) {
  const sorted = [...products];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'launchDesc':
        return b.launchYear - a.launchYear;
      case 'launchAsc':
        return a.launchYear - b.launchYear;
      case 'massAsc':
        return (
          (a.massKg ?? Number.POSITIVE_INFINITY) -
          (b.massKg ?? Number.POSITIVE_INFINITY)
        );
      case 'massDesc':
        return (
          (b.massKg ?? Number.NEGATIVE_INFINITY) -
          (a.massKg ?? Number.NEGATIVE_INFINITY)
        );
      case 'powerDesc':
        return (
          (b.powerW ?? Number.NEGATIVE_INFINITY) -
          (a.powerW ?? Number.NEGATIVE_INFINITY)
        );
      case 'resolutionAsc':
        return (
          (a.resolutionM ?? Number.POSITIVE_INFINITY) -
          (b.resolutionM ?? Number.POSITIVE_INFINITY)
        );
      case 'relevance':
      default: {
        if (queryTokens.length === 0) return b.launchYear - a.launchYear;
        return getSearchScore(b, queryTokens) - getSearchScore(a, queryTokens);
      }
    }
  });

  return sorted;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseProductSearchOptions {
  open: boolean;
}

export function useProductSearch({ open }: UseProductSearchOptions) {
  // Core state
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 200);
  const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS });
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  // Derived: query tokens
  const queryTokens = useMemo(
    () =>
      debouncedQuery
        .split(/[\s,，/]+/)
        .map((token) => normalize(token))
        .filter(Boolean),
    [debouncedQuery]
  );

  // Derived: filtered products
  const filteredProducts = useMemo(
    () => applyFilters(SATELLITE_PRODUCTS, queryTokens, filters),
    [queryTokens, filters]
  );

  // Derived: sorted products
  const sortedProducts = useMemo(
    () => sortProducts(filteredProducts, queryTokens, sortBy),
    [filteredProducts, queryTokens, sortBy]
  );

  // Derived: suggestions
  const suggestions = useMemo(() => {
    if (!debouncedQuery) return [];
    const tokens = queryTokens;
    return sortProducts(
      applyFilters(SATELLITE_PRODUCTS, tokens, { ...DEFAULT_FILTERS }),
      tokens,
      'relevance'
    )
      .slice(0, 6)
      .map((item) => item.name);
  }, [debouncedQuery, queryTokens]);

  // Derived: facet options (static, computed once from all products)
  const facetOptions = useMemo(() => {
    const categories = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.category));
    const missionTypes = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.missionType));
    const payloadTypes = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.payloadType));
    const orbitTypes = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.orbitType));
    const regions = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.region));
    const agencies = uniqueSorted(SATELLITE_PRODUCTS.flatMap((p) => p.agencies));

    return { categories, missionTypes, payloadTypes, orbitTypes, regions, agencies };
  }, []);

  // Derived: facet counts (dynamic based on current filters)
  const facetCounts = useMemo(() => {
    const base = (omit: keyof ProductFilters) =>
      applyFilters(SATELLITE_PRODUCTS, queryTokens, filters, omit);

    const countMap = (
      items: SatelliteProduct[],
      getter: (p: SatelliteProduct) => string | string[]
    ) => {
      const counts: Record<string, number> = {};
      for (const item of items) {
        const values = getter(item);
        const list = Array.isArray(values) ? values : [values];
        list.forEach((value) => {
          counts[value] = (counts[value] || 0) + 1;
        });
      }
      return counts;
    };

    return {
      categories: countMap(base('categories'), (p) => p.category),
      missionTypes: countMap(base('missionTypes'), (p) => p.missionType),
      payloadTypes: countMap(base('payloadTypes'), (p) => p.payloadType),
      orbitTypes: countMap(base('orbitTypes'), (p) => p.orbitType),
      regions: countMap(base('regions'), (p) => p.region),
      agencies: countMap(base('agencies'), (p) => p.agencies),
    };
  }, [queryTokens, filters]);

  // Derived: active filter tags
  const activeFilterTags = useMemo(() => {
    const tags: FilterTag[] = [];

    filters.categories.forEach((value) =>
      tags.push({ key: 'categories', label: '类别', value })
    );
    filters.missionTypes.forEach((value) =>
      tags.push({ key: 'missionTypes', label: '任务', value })
    );
    filters.payloadTypes.forEach((value) =>
      tags.push({ key: 'payloadTypes', label: '载荷', value })
    );
    filters.orbitTypes.forEach((value) =>
      tags.push({ key: 'orbitTypes', label: '轨道', value })
    );
    filters.agencies.forEach((value) =>
      tags.push({ key: 'agencies', label: '机构', value })
    );
    filters.regions.forEach((value) =>
      tags.push({ key: 'regions', label: '区域', value })
    );

    (
      ['launchYear', 'orbitAltitudeKm', 'massKg', 'powerW', 'resolutionM'] as Array<
        keyof ProductFilters
      >
    ).forEach((key) => {
      const range = filters[key] as RangeFilter;
      if (range.min || range.max) {
        tags.push({
          key,
          label: FILTER_LABELS[key],
          value: `${range.min || '0'}-${range.max || '∞'}`,
        });
      }
    });

    return tags;
  }, [filters]);

  // Handlers
  const handleToggleFacet = useCallback((key: FacetKey, value: string) => {
    setFilters((prev) => {
      const selected = new Set(prev[key]);
      if (selected.has(value)) {
        selected.delete(value);
      } else {
        selected.add(value);
      }
      return { ...prev, [key]: Array.from(selected) };
    });
  }, []);

  const handleRangeChange = useCallback(
    (key: RangeKey, range: RangeFilter) => {
      setFilters((prev) => ({ ...prev, [key]: range }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const handleRemoveTag = useCallback((tagKey: keyof ProductFilters, value: string) => {
    setFilters((prev) => {
      if (Array.isArray(prev[tagKey])) {
        return {
          ...prev,
          [tagKey]: (prev[tagKey] as string[]).filter((item) => item !== value),
        };
      }
      return { ...prev, [tagKey]: { ...EMPTY_RANGE } };
    });
  }, []);

  const pushRecentSearch = useCallback((value: string) => {
    if (!value) return;
    setRecentSearches((prev) => {
      const next = [value, ...prev.filter((item) => item !== value)].slice(0, 8);
      return next;
    });
  }, []);

  const handleSubmitSearch = useCallback(() => {
    if (!query.trim()) return;
    pushRecentSearch(query.trim());
  }, [query, pushRecentSearch]);

  const handleSearchChipClick = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const resetState = useCallback(() => {
    setQuery('');
    setFilters({ ...DEFAULT_FILTERS });
    setSortBy('relevance');
  }, []);

  // Effects: Load recent searches from localStorage
  useEffect(() => {
    if (!open) return;
    const stored = window.localStorage.getItem(STORAGE_KEY_PRODUCT_SEARCH_HISTORY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((item) => typeof item === 'string'));
        }
      } catch {
        setRecentSearches([]);
      }
    }
  }, [open]);

  // Effects: Save recent searches to localStorage
  useEffect(() => {
    if (!open) return;
    window.localStorage.setItem(
      STORAGE_KEY_PRODUCT_SEARCH_HISTORY,
      JSON.stringify(recentSearches)
    );
  }, [recentSearches, open]);

  // Effects: Simulate loading state
  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, [debouncedQuery, filters, sortBy, open]);

  // Effects: Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  return {
    // State
    query,
    setQuery,
    filters,
    sortBy,
    setSortBy,
    isLoading,
    recentSearches,
    showFilters,

    // Derived data
    queryTokens,
    sortedProducts,
    suggestions,
    facetOptions,
    facetCounts,
    activeFilterTags,

    // Handlers
    handleToggleFacet,
    handleRangeChange,
    handleClearFilters,
    handleRemoveTag,
    pushRecentSearch,
    handleSubmitSearch,
    handleSearchChipClick,
    toggleFilters,
    resetState,
  };
}
