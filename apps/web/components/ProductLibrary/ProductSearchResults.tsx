'use client';

/**
 * Story 7.7: ProductSearchResults Component
 * Filter sidebar, results header, product list, and empty/loading states
 * Extracted from ProductSearchDialog for separation of concerns
 */

import { Command } from 'cmdk';
import { Loader2, Package, Filter, Check, X } from 'lucide-react';
import type { SatelliteProduct } from '@/lib/productLibrary';
import {
  type ProductFilters,
  type FacetKey,
  type RangeKey,
  type RangeFilter,
  type SortOption,
  type FilterTag,
  SORT_OPTIONS,
  EMPTY_RANGE,
} from '@/hooks/useProductSearch';
import { ProductCard } from './ProductCard';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductSearchResultsProps {
  // Filter sidebar
  showFilters: boolean;
  filters: ProductFilters;
  facetOptions: {
    categories: string[];
    missionTypes: string[];
    payloadTypes: string[];
    orbitTypes: string[];
    regions: string[];
    agencies: string[];
  };
  facetCounts: {
    categories: Record<string, number>;
    missionTypes: Record<string, number>;
    payloadTypes: Record<string, number>;
    orbitTypes: Record<string, number>;
    regions: Record<string, number>;
    agencies: Record<string, number>;
  };
  onToggleFacet: (key: FacetKey, value: string) => void;
  onRangeChange: (key: RangeKey, range: RangeFilter) => void;
  onClearFilters: () => void;

  // Active filter tags
  activeFilterTags: FilterTag[];
  onRemoveTag: (key: keyof ProductFilters, value: string) => void;

  // Results
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  products: SatelliteProduct[];
  isLoading: boolean;
  onSelectProduct: (product: SatelliteProduct) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface FacetGroupProps {
  title: string;
  options: string[];
  selected: string[];
  counts: Record<string, number>;
  onToggle: (value: string) => void;
}

function FacetGroup({ title, options, selected, counts, onToggle }: FacetGroupProps) {
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

interface RangeInputProps {
  label: string;
  range: RangeFilter;
  onChange: (next: RangeFilter) => void;
}

function RangeInput({ label, range, onChange }: RangeInputProps) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProductSearchResults({
  showFilters,
  filters,
  facetOptions,
  facetCounts,
  onToggleFacet,
  onRangeChange,
  onClearFilters,
  activeFilterTags,
  onRemoveTag,
  sortBy,
  onSortChange,
  products,
  isLoading,
  onSelectProduct,
}: ProductSearchResultsProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Filter Sidebar */}
      {showFilters && (
        <aside className="w-80 border-r border-gray-200/60 p-4 overflow-y-auto space-y-6 bg-gray-50/40">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-500" />
              条件筛选
            </span>
            <button
              onClick={onClearFilters}
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
            onToggle={(value) => onToggleFacet('categories', value)}
          />

          <FacetGroup
            title="任务类型"
            options={facetOptions.missionTypes}
            selected={filters.missionTypes}
            counts={facetCounts.missionTypes}
            onToggle={(value) => onToggleFacet('missionTypes', value)}
          />

          <FacetGroup
            title="载荷类型"
            options={facetOptions.payloadTypes}
            selected={filters.payloadTypes}
            counts={facetCounts.payloadTypes}
            onToggle={(value) => onToggleFacet('payloadTypes', value)}
          />

          <FacetGroup
            title="轨道类型"
            options={facetOptions.orbitTypes}
            selected={filters.orbitTypes}
            counts={facetCounts.orbitTypes}
            onToggle={(value) => onToggleFacet('orbitTypes', value)}
          />

          <FacetGroup
            title="机构"
            options={facetOptions.agencies}
            selected={filters.agencies}
            counts={facetCounts.agencies}
            onToggle={(value) => onToggleFacet('agencies', value)}
          />

          <FacetGroup
            title="区域"
            options={facetOptions.regions}
            selected={filters.regions}
            counts={facetCounts.regions}
            onToggle={(value) => onToggleFacet('regions', value)}
          />

          <RangeInput
            label="发射年份"
            range={filters.launchYear}
            onChange={(next) => onRangeChange('launchYear', next)}
          />
          <RangeInput
            label="轨道高度(km)"
            range={filters.orbitAltitudeKm}
            onChange={(next) => onRangeChange('orbitAltitudeKm', next)}
          />
          <RangeInput
            label="质量(kg)"
            range={filters.massKg}
            onChange={(next) => onRangeChange('massKg', next)}
          />
          <RangeInput
            label="功率(W)"
            range={filters.powerW}
            onChange={(next) => onRangeChange('powerW', next)}
          />
          <RangeInput
            label="分辨率(m)"
            range={filters.resolutionM}
            onChange={(next) => onRangeChange('resolutionM', next)}
          />
        </aside>
      )}

      {/* Results Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Results Header */}
        <div className="flex-none px-4 py-3 border-b border-gray-200/60 bg-white">
          {/* Active Filter Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {activeFilterTags.length === 0 && (
              <span className="text-xs text-gray-400">暂无筛选条件</span>
            )}
            {activeFilterTags.map((tag) => (
              <button
                key={`${tag.key}-${tag.value}`}
                onClick={() => onRemoveTag(tag.key, tag.value)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-blue-200 text-blue-600 bg-blue-50"
              >
                {tag.label}: {tag.value}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>

          {/* Results Count & Sort */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              共找到{' '}
              <span className="font-semibold text-gray-800">{products.length}</span>{' '}
              条结果
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>排序</span>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
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

        {/* Results List */}
        <Command.List className="flex-1 overflow-y-auto p-4">
          {/* Loading State */}
          {isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 mb-3 animate-spin text-blue-500/50" />
              <div className="text-sm">正在筛选产品库...</div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && products.length === 0 && (
            <Command.Empty className="h-full flex flex-col items-center justify-center text-gray-400">
              <Package className="w-12 h-12 mb-3 text-gray-200" />
              <div className="text-lg font-medium text-gray-900 mb-1">
                未找到匹配产品
              </div>
              <div className="text-sm">请调整关键词或筛选条件</div>
            </Command.Empty>
          )}

          {/* Product List */}
          {!isLoading && products.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {products.map((product) => (
                <Command.Item
                  key={product.id}
                  value={`${product.id}-${product.name}`}
                  onSelect={() => onSelectProduct(product)}
                  className="p-0 m-0"
                  asChild
                >
                  <div role="option">
                    <ProductCard product={product} />
                  </div>
                </Command.Item>
              ))}
            </div>
          )}
        </Command.List>
      </div>
    </div>
  );
}

export { EMPTY_RANGE };
export default ProductSearchResults;
