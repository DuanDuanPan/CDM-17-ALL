/**
 * Story 9.9: Node Search Component (Simplified from DualSearch)
 *
 * Features:
 * - Node search only (PBS/TASK scope)
 * - Regex injection prevention via escapeRegex()
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { cn, Input } from '@cdm/ui';

// ========================================
// Types
// ========================================

export type SearchMode = 'node';

export interface DualSearchProps {
    /** Current search query */
    query: string;
    /** Callback when query changes */
    onQueryChange: (query: string) => void;
    /** Placeholder text */
    placeholder?: string;
    /** Custom class name */
    className?: string;
}

// ========================================
// Utility: Escape Regex (Red Team - AC6.6)
// ========================================

/**
 * Escapes special regex characters in a string to prevent regex injection
 * @param str - The string to escape
 * @returns Escaped string safe for use in RegExp constructor
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========================================
// DualSearch Component
// ========================================

export function NodeSearch({
    query,
    onQueryChange,
    placeholder = '搜索节点 (PBS/任务)...',
    className,
}: DualSearchProps) {
    const [isFocused, setIsFocused] = useState(false);

    const handleClear = useCallback(() => {
        onQueryChange('');
    }, [onQueryChange]);

    const handleQueryChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onQueryChange(e.target.value);
        },
        [onQueryChange]
    );

    return (
      <div className={cn('flex flex-col gap-2', className)} data-testid="node-search">
        {/* Search input */}
        <div className="relative">
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors',
              isFocused ? 'text-blue-500' : 'text-gray-400'
            )}
          />
          <Input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="pl-9 pr-8"
            data-testid="node-search-input"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
              aria-label="清空搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search scope hint */}
        <p className="text-xs text-gray-400">在 PBS 和任务节点中搜索</p>
      </div>
    );
}

// ========================================
// Hook for managing dual search state
// ========================================

export interface UseDualSearchResult {
    query: string;
    setQuery: (query: string) => void;
    /** Escaped query safe for regex operations */
    escapedQuery: string;
    /** Clear the search */
    clear: () => void;
}

export function useDualSearch(): UseDualSearchResult {
    const [query, setQuery] = useState('');

    const escapedQuery = useMemo(() => escapeRegex(query), [query]);

    const clear = useCallback(() => {
        setQuery('');
    }, []);

    return {
        query,
        setQuery,
        escapedQuery,
        clear,
    };
}

/** @deprecated Use `NodeSearch` instead. */
export const DualSearch = NodeSearch;
export default NodeSearch;
