'use client';

/**
 * Story 7.7: ProductCard Component
 * Displays a single product item in the search results
 * Extracted from ProductSearchDialog for separation of concerns
 */

import { Package, ChevronRight } from 'lucide-react';
import type { SatelliteProduct } from '@/lib/productLibrary';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  对地观测: 'bg-sky-100 text-sky-700',
  气象: 'bg-amber-100 text-amber-700',
  海洋测高: 'bg-teal-100 text-teal-700',
  冰冻圈: 'bg-indigo-100 text-indigo-700',
  '水文/土壤': 'bg-emerald-100 text-emerald-700',
  '水文/海洋测高': 'bg-cyan-100 text-cyan-700',
};

function CategoryBadge({ category }: { category: string }) {
  const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-700';

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

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductCardProps {
  product: SatelliteProduct;
  isSelected?: boolean;
}

export function ProductCard({ product, isSelected }: ProductCardProps) {
  // Note: Selection is handled by parent Command.Item's onSelect
  // ARIA attributes (role="option", aria-selected) are provided by Command.Item via asChild
  // Do NOT add onClick/onKeyDown/role here to avoid duplication
  return (
    <div
      className={`flex items-start gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all group ${
        isSelected
          ? 'bg-blue-50 ring-1 ring-blue-200'
          : 'hover:bg-gray-50'
      }`}
    >
      {/* Product Icon */}
      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
        <Package className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        {/* Name + Category */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-base text-gray-900 truncate">
            {product.name}
          </span>
          <CategoryBadge category={product.category} />
        </div>

        {/* Code + Mission Type */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            {product.code}
          </span>
          <span className="text-xs text-gray-400">| {product.missionType}</span>
        </div>

        {/* Metrics */}
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
          <MetricTag label="机构" value={product.agencies.slice(0, 2).join('/')} />
        </div>
      </div>

      {/* Chevron */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
        <ChevronRight className="w-5 h-5 text-blue-400" />
      </div>
    </div>
  );
}

export default ProductCard;
