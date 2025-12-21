'use client';

/**
 * Story 2.5: useSearch Hook
 * Provides search functionality with debouncing, tag search support, and pagination
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { SearchQueryDto, SearchResponse, SearchResultItem } from '@cdm/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface UseSearchOptions {
    debounceMs?: number;
    initialLimit?: number;
    graphId?: string;
}

export interface UseSearchReturn {
    query: string;
    setQuery: (q: string) => void;
    results: SearchResultItem[];
    isLoading: boolean;
    error: Error | null;
    total: number;
    hasMore: boolean;
    loadMore: () => void;
    reset: () => void;
    // Tag search helpers
    searchByTag: (tag: string) => void;
    isTagSearch: boolean;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
    const { debounceMs = 300, initialLimit = 20, graphId } = options;

    const [query, setQueryState] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Detect tag search pattern: #tagname
    const isTagSearch = query.startsWith('#');

    const fetchResults = useCallback(
        async (searchQuery: string, append = false) => {
            // Cancel previous request
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();

            setIsLoading(true);
            setError(null);

            try {
                const params: SearchQueryDto = {
                    limit: initialLimit,
                    offset: append ? offset : 0,
                };

                // Parse tag search
                if (searchQuery.startsWith('#')) {
                    params.tags = [searchQuery.slice(1).trim().toLowerCase()];
                } else {
                    params.q = searchQuery;
                }

                // Add graph scope if provided
                if (graphId) {
                    params.graphId = graphId;
                }

                // Build query string
                const queryParams = new URLSearchParams();
                if (params.q) queryParams.set('q', params.q);
                if (params.tags?.length) {
                    params.tags.forEach((tag) => queryParams.append('tags', tag));
                }
                if (params.limit) queryParams.set('limit', String(params.limit));
                if (params.offset) queryParams.set('offset', String(params.offset));
                if (params.graphId) queryParams.set('graphId', params.graphId);

                const response = await fetch(
                    `${API_BASE_URL}/api/nodes/search?${queryParams.toString()}`,
                    {
                        signal: abortControllerRef.current.signal,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );

                if (!response.ok) {
                    throw new Error(`Search failed: ${response.statusText}`);
                }

                const data: SearchResponse = await response.json();

                if (append) {
                    setResults((prev) => [...prev, ...data.results]);
                } else {
                    setResults(data.results);
                }
                setTotal(data.total);
                setHasMore(data.hasMore);
                setOffset((params.offset || 0) + data.results.length);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    setError(err as Error);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [initialLimit, offset, graphId]
    );

    // Debounced search
    const debouncedSearch = useDebouncedCallback((q: string) => {
        if (q.trim().length > 0) {
            fetchResults(q);
        } else {
            setResults([]);
            setTotal(0);
            setHasMore(false);
        }
    }, debounceMs);

    const setQuery = useCallback(
        (q: string) => {
            setQueryState(q);
            setOffset(0);
            debouncedSearch(q);
        },
        [debouncedSearch]
    );

    const loadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            fetchResults(query, true);
        }
    }, [isLoading, hasMore, fetchResults, query]);

    const reset = useCallback(() => {
        setQueryState('');
        setResults([]);
        setTotal(0);
        setOffset(0);
        setHasMore(false);
        setError(null);
    }, []);

    const searchByTag = useCallback(
        (tag: string) => {
            setQuery(`#${tag}`);
        },
        [setQuery]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    return {
        query,
        setQuery,
        results,
        isLoading,
        error,
        total,
        hasMore,
        loadMore,
        reset,
        searchByTag,
        isTagSearch,
    };
}
