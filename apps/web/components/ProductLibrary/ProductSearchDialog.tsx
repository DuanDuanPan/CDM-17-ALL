'use client';

/**
 * Story 2.7: Product Search Dialog
 * Modal dialog for searching and selecting products from mock product library
 * Uses cmdk (Command) component pattern from GlobalSearchDialog
 * Uses React Portal to escape PropertyPanel container constraints
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Command } from 'cmdk';
import {
  Search,
  X,
  Loader2,
  Package,
  ChevronRight,
  Filter,
  Check,
  ArrowUpDown,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import type { ProductReference } from '@cdm/types';
import {
  HOT_KEYWORDS,
  SATELLITE_PRODUCTS,
  type SatelliteProduct,
} from '@/lib/productLibrary';
import { STORAGE_KEY_PRODUCT_SEARCH_HISTORY } from '@/lib/constants';

type RangeFilter = {
  min: string;
  max: string;
};

type ProductFilters = {
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

type SortOption =
  | 'relevance'
  | 'launchDesc'
  | 'launchAsc'
  | 'massAsc'
  | 'massDesc'
  | 'powerDesc'
  | 'resolutionAsc';

const SORT_OPTIONS: Array<{ id: SortOption; label: string }> = [
  { id: 'relevance', label: '相关度' },
  { id: 'launchDesc', label: '发射时间(新→旧)' },
  { id: 'launchAsc', label: '发射时间(旧→新)' },
  { id: 'massDesc', label: '质量(高→低)' },
  { id: 'massAsc', label: '质量(低→高)' },
  { id: 'powerDesc', label: '功率(高→低)' },
  { id: 'resolutionAsc', label: '分辨率(高→低)' },
];

const EMPTY_RANGE: RangeFilter = { min: '', max: '' };

const DEFAULT_FILTERS: ProductFilters = {
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

const FILTER_LABELS: Record<keyof ProductFilters, string> = {
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

export interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: ProductReference) => void;
}

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
      const matchesAgency = product.agencies.some((agency) => filters.agencies.includes(agency));
      if (!matchesAgency) return false;
    }

    if (omit !== 'regions' && filters.regions.length > 0) {
      if (!filters.regions.includes(product.region)) return false;
    }

    if (omit !== 'launchYear' && (filters.launchYear.min || filters.launchYear.max)) {
      if (!inRange(product.launchYear, filters.launchYear)) return false;
    }

    if (omit !== 'orbitAltitudeKm' && (filters.orbitAltitudeKm.min || filters.orbitAltitudeKm.max)) {
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
        return (a.massKg ?? Number.POSITIVE_INFINITY) - (b.massKg ?? Number.POSITIVE_INFINITY);
      case 'massDesc':
        return (b.massKg ?? Number.NEGATIVE_INFINITY) - (a.massKg ?? Number.NEGATIVE_INFINITY);
      case 'powerDesc':
        return (b.powerW ?? Number.NEGATIVE_INFINITY) - (a.powerW ?? Number.NEGATIVE_INFINITY);
      case 'resolutionAsc':
        return (a.resolutionM ?? Number.POSITIVE_INFINITY) - (b.resolutionM ?? Number.POSITIVE_INFINITY);
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

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    对地观测: 'bg-sky-100 text-sky-700',
    气象: 'bg-amber-100 text-amber-700',
    海洋测高: 'bg-teal-100 text-teal-700',
    冰冻圈: 'bg-indigo-100 text-indigo-700',
    '水文/土壤': 'bg-emerald-100 text-emerald-700',
    '水文/海洋测高': 'bg-cyan-100 text-cyan-700',
  };

  const colorClass = colors[category] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colorClass}`}>
      {category}
    </span>
  );
}

function MetricTag({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
      {label}: {value}
    </span>
  );
}

function RangeInput({
  label,
  range,
  onChange,
}: {
  label: string;
  range: RangeFilter;
  onChange: (next: RangeFilter) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-600">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={range.min}
          onChange={(e) => onChange({ ...range, min: e.target.value })}
          placeholder="最小"
          className="w-20 text-xs border border-gray-200 rounded-md px-2 py-1"
        />
        <span className="text-xs text-gray-400">-</span>
        <input
          type="number"
          value={range.max}
          onChange={(e) => onChange({ ...range, max: e.target.value })}
          placeholder="最大"
          className="w-20 text-xs border border-gray-200 rounded-md px-2 py-1"
        />
      </div>
    </div>
  );
}

function FacetGroup({
  title,
  options,
  selected,
  counts,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  counts: Record<string, number>;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-600">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected.includes(option);
          return (
            <button
              key={option}
              onClick={() => onToggle(option)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                isActive
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {isActive ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
              <span>{option}</span>
              <span className="text-[10px] text-gray-400">({counts[option] ?? 0})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProductSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: ProductSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 200);
  const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS });
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const queryTokens = useMemo(
    () =>
      debouncedQuery
        .split(/[\s,，/]+/)
        .map((token) => normalize(token))
        .filter(Boolean),
    [debouncedQuery]
  );

  const filteredProducts = useMemo(
    () => applyFilters(SATELLITE_PRODUCTS, queryTokens, filters),
    [queryTokens, filters]
  );

  const sortedProducts = useMemo(
    () => sortProducts(filteredProducts, queryTokens, sortBy),
    [filteredProducts, queryTokens, sortBy]
  );

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

  const facetOptions = useMemo(() => {
    const categories = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.category));
    const missionTypes = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.missionType));
    const payloadTypes = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.payloadType));
    const orbitTypes = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.orbitType));
    const regions = uniqueSorted(SATELLITE_PRODUCTS.map((p) => p.region));
    const agencies = uniqueSorted(
      SATELLITE_PRODUCTS.flatMap((p) => p.agencies)
    );

    return { categories, missionTypes, payloadTypes, orbitTypes, regions, agencies };
  }, []);

  const facetCounts = useMemo(() => {
    const base = (omit: keyof ProductFilters) =>
      applyFilters(SATELLITE_PRODUCTS, queryTokens, filters, omit);

    const countMap = (items: SatelliteProduct[], getter: (p: SatelliteProduct) => string | string[]) => {
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

  const activeFilterTags = useMemo(() => {
    const tags: Array<{ key: keyof ProductFilters; label: string; value: string }> = [];

    filters.categories.forEach((value) => tags.push({ key: 'categories', label: '类别', value }));
    filters.missionTypes.forEach((value) => tags.push({ key: 'missionTypes', label: '任务', value }));
    filters.payloadTypes.forEach((value) => tags.push({ key: 'payloadTypes', label: '载荷', value }));
    filters.orbitTypes.forEach((value) => tags.push({ key: 'orbitTypes', label: '轨道', value }));
    filters.agencies.forEach((value) => tags.push({ key: 'agencies', label: '机构', value }));
    filters.regions.forEach((value) => tags.push({ key: 'regions', label: '区域', value }));

    (['launchYear', 'orbitAltitudeKm', 'massKg', 'powerW', 'resolutionM'] as Array<keyof ProductFilters>)
      .forEach((key) => {
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

  const handleToggleFacet = useCallback(
    (key: keyof ProductFilters, value: string) => {
      setFilters((prev) => {
        const selected = new Set(prev[key] as string[]);
        if (selected.has(value)) {
          selected.delete(value);
        } else {
          selected.add(value);
        }
        return { ...prev, [key]: Array.from(selected) };
      });
    },
    []
  );

  const handleRangeChange = useCallback(
    (key: keyof ProductFilters, range: RangeFilter) => {
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

  const handleSelect = useCallback(
    (product: SatelliteProduct) => {
      const productRef: ProductReference = {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        category: product.category,
      };
      pushRecentSearch(query || product.name);
      onSelect(productRef);
      onOpenChange(false);
    },
    [onSelect, onOpenChange, query, pushRecentSearch]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmitSearch = useCallback(() => {
    if (!query.trim()) return;
    pushRecentSearch(query.trim());
  }, [query, pushRecentSearch]);

  const handleSearchChipClick = useCallback((value: string) => {
    setQuery(value);
  }, []);

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

  useEffect(() => {
    if (!open) return;
    window.localStorage.setItem(
      STORAGE_KEY_PRODUCT_SEARCH_HISTORY,
      JSON.stringify(recentSearches)
    );
  }, [recentSearches, open]);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, [debouncedQuery, filters, sortBy, open]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setFilters({ ...DEFAULT_FILTERS });
      setSortBy('relevance');
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, handleClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-6xl flex flex-col shadow-2xl shadow-black/30 rounded-xl overflow-hidden">
        <Command
          shouldFilter={false}
          className="flex flex-col w-full h-[80vh] max-h-[860px] bg-white border border-gray-200/50 rounded-xl"
        >
          <div className="flex-none px-6 py-4 border-b border-gray-200/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                产品库搜索
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-gray-400" />
                )}
                <Command.Input
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSubmitSearch();
                    }
                  }}
                  placeholder="输入产品名称、型号、任务类型或机构..."
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-gray-400"
                />
                <button
                  className="text-xs text-gray-500 hover:text-blue-600"
                  onClick={() => setShowFilters((prev) => !prev)}
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-2 text-gray-500">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  热门
                </div>
                {HOT_KEYWORDS.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => handleSearchChipClick(keyword)}
                    className="px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    {keyword}
                  </button>
                ))}
              </div>

              {query && suggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />
                    智能联想
                  </div>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSearchChipClick(suggestion)}
                      className="px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {recentSearches.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    最近搜索
                  </div>
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleSearchChipClick(item)}
                      className="px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {showFilters && (
              <aside className="w-80 border-r border-gray-200/60 p-4 overflow-y-auto space-y-6 bg-gray-50/40">
                <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                  <span className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-500" />
                    条件筛选
                  </span>
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-gray-400 hover:text-blue-500"
                  >
                    清空
                  </button>
                </div>

                <FacetGroup
                  title="类别"
                  options={facetOptions.categories}
                  selected={filters.categories}
                  counts={facetCounts.categories}
                  onToggle={(value) => handleToggleFacet('categories', value)}
                />

                <FacetGroup
                  title="任务类型"
                  options={facetOptions.missionTypes}
                  selected={filters.missionTypes}
                  counts={facetCounts.missionTypes}
                  onToggle={(value) => handleToggleFacet('missionTypes', value)}
                />

                <FacetGroup
                  title="载荷类型"
                  options={facetOptions.payloadTypes}
                  selected={filters.payloadTypes}
                  counts={facetCounts.payloadTypes}
                  onToggle={(value) => handleToggleFacet('payloadTypes', value)}
                />

                <FacetGroup
                  title="轨道类型"
                  options={facetOptions.orbitTypes}
                  selected={filters.orbitTypes}
                  counts={facetCounts.orbitTypes}
                  onToggle={(value) => handleToggleFacet('orbitTypes', value)}
                />

                <FacetGroup
                  title="机构"
                  options={facetOptions.agencies}
                  selected={filters.agencies}
                  counts={facetCounts.agencies}
                  onToggle={(value) => handleToggleFacet('agencies', value)}
                />

                <FacetGroup
                  title="区域"
                  options={facetOptions.regions}
                  selected={filters.regions}
                  counts={facetCounts.regions}
                  onToggle={(value) => handleToggleFacet('regions', value)}
                />

                <RangeInput
                  label="发射年份"
                  range={filters.launchYear}
                  onChange={(next) => handleRangeChange('launchYear', next)}
                />
                <RangeInput
                  label="轨道高度(km)"
                  range={filters.orbitAltitudeKm}
                  onChange={(next) => handleRangeChange('orbitAltitudeKm', next)}
                />
                <RangeInput
                  label="质量(kg)"
                  range={filters.massKg}
                  onChange={(next) => handleRangeChange('massKg', next)}
                />
                <RangeInput
                  label="功率(W)"
                  range={filters.powerW}
                  onChange={(next) => handleRangeChange('powerW', next)}
                />
                <RangeInput
                  label="分辨率(m)"
                  range={filters.resolutionM}
                  onChange={(next) => handleRangeChange('resolutionM', next)}
                />
              </aside>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-none px-4 py-3 border-b border-gray-200/60 bg-white">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {activeFilterTags.length === 0 && (
                    <span className="text-xs text-gray-400">暂无筛选条件</span>
                  )}
                  {activeFilterTags.map((tag) => (
                    <button
                      key={`${tag.key}-${tag.value}`}
                      onClick={() => handleRemoveTag(tag.key, tag.value)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-blue-200 text-blue-600 bg-blue-50"
                    >
                      {tag.label}: {tag.value}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    共找到 <span className="font-semibold text-gray-800">{sortedProducts.length}</span> 条结果
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>排序</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Command.List className="flex-1 overflow-y-auto p-4">
                {isLoading && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-8 h-8 mb-3 animate-spin text-blue-500/50" />
                    <div className="text-sm">正在筛选产品库...</div>
                  </div>
                )}

                {!isLoading && sortedProducts.length === 0 && (
                  <Command.Empty className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Package className="w-12 h-12 mb-3 text-gray-200" />
                    <div className="text-lg font-medium text-gray-900 mb-1">未找到匹配产品</div>
                    <div className="text-sm">请调整关键词或筛选条件</div>
                  </Command.Empty>
                )}

                {!isLoading && sortedProducts.length > 0 && (
                  <div className="grid grid-cols-1 gap-3">
                    {sortedProducts.map((product) => (
                      <Command.Item
                        key={product.id}
                        value={`${product.id}-${product.name}`}
                        onSelect={() => handleSelect(product)}
                        className="flex items-start gap-4 px-4 py-3 rounded-xl cursor-pointer hover:bg-gray-50 data-[selected=true]:bg-blue-50 data-[selected=true]:ring-1 data-[selected=true]:ring-blue-200 transition-all group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                          <Package className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-base text-gray-900 truncate">
                              {product.name}
                            </span>
                            <CategoryBadge category={product.category} />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {product.code}
                            </span>
                            <span className="text-xs text-gray-400">| {product.missionType}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <MetricTag label="发射" value={String(product.launchYear)} />
                            <MetricTag
                              label="轨道"
                              value={product.orbitAltitudeKm ? `${product.orbitAltitudeKm} km` : undefined}
                            />
                            <MetricTag
                              label="质量"
                              value={product.massKg ? `${product.massKg} kg` : undefined}
                            />
                            <MetricTag
                              label="功率"
                              value={product.powerW ? `${product.powerW} W` : undefined}
                            />
                            <MetricTag
                              label="分辨率"
                              value={product.resolutionM ? `${product.resolutionM} m` : undefined}
                            />
                            <MetricTag
                              label="机构"
                              value={product.agencies.slice(0, 2).join('/')}
                            />
                          </div>
                        </div>

                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                          <ChevronRight className="w-5 h-5 text-blue-400" />
                        </div>
                      </Command.Item>
                    ))}
                  </div>
                )}
              </Command.List>
            </div>
          </div>

          <div className="flex-none flex items-center justify-between px-6 py-3 border-t border-gray-200/50 text-xs text-gray-400 bg-gray-50/50">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-sm font-sans">↑↓</kbd>
                导航
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-sm font-sans">Enter</kbd>
                选择
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-sm font-sans">Esc</kbd>
                关闭
              </span>
            </div>
            <span>支持名称/型号/机构/轨道/指标综合过滤</span>
          </div>
        </Command>
      </div>
    </div>,
    document.body
  );
}

export default ProductSearchDialog;
