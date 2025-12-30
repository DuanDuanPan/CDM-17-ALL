'use client';

/**
 * Story 7.5: App Library Hook
 * Encapsulates app library search state and API calls
 * Pattern: Follows Story 7.2's useApproval hook structure
 *
 * Used by: AppLibraryDialog, AppForm
 *
 * Features:
 * - Search app library entries
 * - Fetch categories
 * - Execute app
 * - Loading states
 * - Error handling
 */

import { useState, useCallback } from 'react';
import type { AppLibraryEntry } from '@cdm/types';
import {
    fetchAppLibraryEntries,
    fetchAppCategories,
    executeApp,
    type ExecuteAppRequest,
    type ExecuteAppResponse,
} from '@/lib/api/app-library';

export interface UseAppLibraryReturn {
    // State
    entries: AppLibraryEntry[];
    categories: string[];
    isLoading: boolean;
    isExecuting: boolean;
    error: string | null;

    // Actions
    searchEntries: (query?: string) => Promise<void>;
    loadCategories: () => Promise<void>;
    execute: (nodeId: string, request: ExecuteAppRequest) => Promise<ExecuteAppResponse>;
    clearError: () => void;
}

export function useAppLibrary(): UseAppLibraryReturn {
    const [entries, setEntries] = useState<AppLibraryEntry[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search entries
    const searchEntries = useCallback(async (query?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchAppLibraryEntries(query);
            setEntries(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : '加载应用库失败';
            console.error('[useAppLibrary] Search failed:', err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load categories
    const loadCategories = useCallback(async () => {
        try {
            const data = await fetchAppCategories();
            setCategories(data);
        } catch (err) {
            console.error('[useAppLibrary] Load categories failed:', err);
            // Don't set error for categories - non-critical
        }
    }, []);

    // Execute app
    const execute = useCallback(async (
        nodeId: string,
        request: ExecuteAppRequest
    ): Promise<ExecuteAppResponse> => {
        setIsExecuting(true);
        setError(null);
        try {
            const result = await executeApp(nodeId, request);
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : '执行失败';
            console.error('[useAppLibrary] Execute failed:', err);
            setError(message);
            throw err;
        } finally {
            setIsExecuting(false);
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        entries,
        categories,
        isLoading,
        isExecuting,
        error,
        searchEntries,
        loadCategories,
        execute,
        clearError,
    };
}

export default useAppLibrary;
