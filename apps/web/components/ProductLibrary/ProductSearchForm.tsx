'use client';

/**
 * Story 7.7: ProductSearchForm Component
 * Search input, hot keywords, suggestions, recent searches, and filter toggle
 * Extracted from ProductSearchDialog for separation of concerns
 */

import { type KeyboardEvent, type RefObject } from 'react';
import { Command } from 'cmdk';
import {
  Search,
  Loader2,
  Filter,
  Sparkles,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import { HOT_KEYWORDS } from '@/hooks/useProductSearch';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductSearchFormProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onChipClick: (value: string) => void;
  onToggleFilters: () => void;
  isLoading: boolean;
  suggestions: string[];
  recentSearches: string[];
  inputRef?: RefObject<HTMLInputElement | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface ChipGroupProps {
  icon: React.ReactNode;
  label: string;
  items: string[];
  onChipClick: (value: string) => void;
}

function ChipGroup({ icon, label, items, onChipClick }: ChipGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
      <div className="flex items-center gap-2">
        {icon}
        {label}
      </div>
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChipClick(item)}
          className="px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProductSearchForm({
  query,
  onQueryChange,
  onSubmit,
  onChipClick,
  onToggleFilters,
  isLoading,
  suggestions,
  recentSearches,
  inputRef,
}: ProductSearchFormProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search Input */}
      <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        ) : (
          <Search className="w-5 h-5 text-gray-400" />
        )}
        <Command.Input
          ref={inputRef}
          value={query}
          onValueChange={onQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="输入产品名称、型号、任务类型或机构..."
          className="flex-1 bg-transparent text-base outline-none placeholder:text-gray-400"
        />
        <button
          className="text-xs text-gray-500 hover:text-blue-600"
          onClick={onToggleFilters}
          aria-label="Toggle filters"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Hot Keywords */}
      <ChipGroup
        icon={<Sparkles className="w-3.5 h-3.5 text-blue-500" />}
        label="热门"
        items={HOT_KEYWORDS}
        onChipClick={onChipClick}
      />

      {/* Suggestions (only when query exists) */}
      {query && suggestions.length > 0 && (
        <ChipGroup
          icon={<ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />}
          label="智能联想"
          items={suggestions}
          onChipClick={onChipClick}
        />
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <ChipGroup
          icon={<Clock className="w-3.5 h-3.5 text-blue-500" />}
          label="最近搜索"
          items={recentSearches}
          onChipClick={onChipClick}
        />
      )}
    </div>
  );
}

export default ProductSearchForm;
