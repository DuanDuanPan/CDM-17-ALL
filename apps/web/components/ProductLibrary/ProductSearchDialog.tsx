'use client';

/**
 * Story 7.7: ProductSearchDialog (Refactored)
 * Modal dialog container for searching and selecting products
 * Uses extracted useProductSearch hook and child components
 *
 * Public API (unchanged):
 * - open: boolean
 * - onOpenChange: (open: boolean) => void
 * - onSelect: (product: ProductReference) => void
 */

import { useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Command } from 'cmdk';
import { X, Package } from 'lucide-react';
import type { ProductReference } from '@cdm/types';
import type { SatelliteProduct } from '@/lib/productLibrary';
import { useProductSearch } from '@/hooks/useProductSearch';
import { ProductSearchForm } from './ProductSearchForm';
import { ProductSearchResults } from './ProductSearchResults';

// ─────────────────────────────────────────────────────────────────────────────
// Types (Public API - unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: ProductReference) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProductSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: ProductSearchDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Hook for all search state and logic
  const search = useProductSearch({ open });

  // Handlers
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSelectProduct = useCallback(
    (product: SatelliteProduct) => {
      const productRef: ProductReference = {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        category: product.category,
      };
      search.pushRecentSearch(search.query || product.name);
      onSelect(productRef);
      onOpenChange(false);
    },
    [onSelect, onOpenChange, search]
  );

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle Escape key
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog Container */}
      <div className="relative w-full max-w-6xl flex flex-col shadow-2xl shadow-black/30 rounded-xl overflow-hidden">
        <Command
          shouldFilter={false}
          className="flex flex-col w-full h-[80vh] max-h-[860px] bg-white border border-gray-200/50 rounded-xl"
        >
          {/* Header */}
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

            {/* Search Form */}
            <ProductSearchForm
              query={search.query}
              onQueryChange={search.setQuery}
              onSubmit={search.handleSubmitSearch}
              onChipClick={search.handleSearchChipClick}
              onToggleFilters={search.toggleFilters}
              isLoading={search.isLoading}
              suggestions={search.suggestions}
              recentSearches={search.recentSearches}
              inputRef={inputRef}
            />
          </div>

          {/* Results (Filter Sidebar + List) */}
          <ProductSearchResults
            showFilters={search.showFilters}
            filters={search.filters}
            facetOptions={search.facetOptions}
            facetCounts={search.facetCounts}
            onToggleFacet={search.handleToggleFacet}
            onRangeChange={search.handleRangeChange}
            onClearFilters={search.handleClearFilters}
            activeFilterTags={search.activeFilterTags}
            onRemoveTag={search.handleRemoveTag}
            sortBy={search.sortBy}
            onSortChange={search.setSortBy}
            products={search.sortedProducts}
            isLoading={search.isLoading}
            onSelectProduct={handleSelectProduct}
          />

          {/* Footer */}
          <div className="flex-none flex items-center justify-between px-6 py-3 border-t border-gray-200/50 text-xs text-gray-400 bg-gray-50/50">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-sm font-sans">
                  ↑↓
                </kbd>
                导航
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-sm font-sans">
                  Enter
                </kbd>
                选择
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-sm font-sans">
                  Esc
                </kbd>
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
