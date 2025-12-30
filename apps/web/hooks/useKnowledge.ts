'use client';

/**
 * Story 7.5: Knowledge Search Hook
 * Encapsulates knowledge library search state and API calls
 * Pattern: Follows Story 7.2's useApproval hook structure
 *
 * Used by: KnowledgeSearchDialog
 *
 * Features:
 * - Debounced search
 * - Loading state
 * - Error handling
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { KnowledgeReference } from '@cdm/types';
import { searchKnowledgeResources } from '@/lib/api/knowledge';

export interface UseKnowledgeOptions {
    /** Debounce delay in ms (default: 300) */
    debounceMs?: number;
    /** Auto-search on mount with empty query */
    autoSearch?: boolean;
}

export interface UseKnowledgeReturn {
    // State
    results: KnowledgeReference[];
    isLoading: boolean;
    error: string | null;

    // Actions
    search: (query?: string) => void;
    clearResults: () => void;
    clearError: () => void;
}

export function useKnowledge(options: UseKnowledgeOptions = {}): UseKnowledgeReturn {
    const { debounceMs = 300, autoSearch = false } = options;

    const [results, setResults] = useState<KnowledgeReference[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced search
    const search = useCallback((query?: string) => {
        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await searchKnowledgeResources(query);
                setResults(data);
            } catch (err) {
                const message = err instanceof Error ? err.message : '搜索知识资源失败';
                console.error('[useKnowledge] Search failed:', err);
                setError(message);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, debounceMs);
    }, [debounceMs]);

    // Clear results
    const clearResults = useCallback(() => {
        setResults([]);
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Auto-search on mount (optional)
    useEffect(() => {
        if (autoSearch) {
            search('');
        }
    }, [autoSearch, search]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return {
        results,
        isLoading,
        error,
        search,
        clearResults,
        clearError,
    };
}

export default useKnowledge;
