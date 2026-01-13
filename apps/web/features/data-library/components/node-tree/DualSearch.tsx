/**
 * Story 9.8: Dual Search Component
 * Task 6.1-6.6: Provides separate search for nodes and assets with regex escape
 * 
 * Features:
 * - Tabbed search: Node search vs Asset search
 * - Node search filters the projected tree (PBS/TASK scope)
 * - Asset search uses existing graph-wide search
 * - Regex injection prevention via escapeRegex()
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Search, X, GitBranch, FileText } from 'lucide-react';
import { cn, Input, Button } from '@cdm/ui';

// ========================================
// Types
// ========================================

export type SearchMode = 'node' | 'asset';

export interface DualSearchProps {
    /** Current search mode */
    mode: SearchMode;
    /** Callback when mode changes */
    onModeChange: (mode: SearchMode) => void;
    /** Current search query */
    query: string;
    /** Callback when query changes */
    onQueryChange: (query: string) => void;
    /** Placeholder text for node search */
    nodePlaceholder?: string;
    /** Placeholder text for asset search */
    assetPlaceholder?: string;
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

export function DualSearch({
    mode,
    onModeChange,
    query,
    onQueryChange,
    nodePlaceholder = '搜索节点 (PBS/任务)...',
    assetPlaceholder = '搜索资产...',
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

    const placeholder = mode === 'node' ? nodePlaceholder : assetPlaceholder;

    return (
        <div className={cn('flex flex-col gap-2', className)} data-testid="dual-search">
            {/* Mode toggle tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                    onClick={() => onModeChange('node')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                        mode === 'node'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    )}
                    data-testid="search-mode-node"
                >
                    <GitBranch className="w-3.5 h-3.5" />
                    节点
                </button>
                <button
                    onClick={() => onModeChange('asset')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                        mode === 'asset'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    )}
                    data-testid="search-mode-asset"
                >
                    <FileText className="w-3.5 h-3.5" />
                    资产
                </button>
            </div>

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
                    data-testid="dual-search-input"
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
            <p className="text-xs text-gray-400">
                {mode === 'node' ? '在 PBS 和任务节点中搜索' : '在全部资产中搜索'}
            </p>
        </div>
    );
}

// ========================================
// Hook for managing dual search state
// ========================================

export interface UseDualSearchResult {
    mode: SearchMode;
    setMode: (mode: SearchMode) => void;
    query: string;
    setQuery: (query: string) => void;
    /** Escaped query safe for regex operations */
    escapedQuery: string;
    /** Clear the search */
    clear: () => void;
}

export function useDualSearch(): UseDualSearchResult {
    const [mode, setMode] = useState<SearchMode>('node');
    const [query, setQuery] = useState('');

    const escapedQuery = useMemo(() => escapeRegex(query), [query]);

    const clear = useCallback(() => {
        setQuery('');
    }, []);

    return {
        mode,
        setMode,
        query,
        setQuery,
        escapedQuery,
        clear,
    };
}

export default DualSearch;
