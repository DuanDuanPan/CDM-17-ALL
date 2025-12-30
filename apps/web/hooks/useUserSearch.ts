'use client';

/**
 * Story 7.5: User Search Hook
 * Encapsulates user search state and API calls
 * Pattern: Follows Story 7.2's useApproval hook structure
 *
 * Used by: UserSelector, CommentInput (@mention)
 *
 * Features:
 * - Debounced search
 * - Loading state
 * - Fetch single user by ID
 * - Error handling
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { searchUsers, fetchUserById, type UserOption } from '@/lib/api/users';

export interface UseUserSearchOptions {
    /** Debounce delay in ms (default: 300) */
    debounceMs?: number;
    /** Result limit (default: 20) */
    limit?: number;
    /** Auto-search on mount with empty query */
    autoSearch?: boolean;
}

export interface UseUserSearchReturn {
    // State
    users: UserOption[];
    isLoading: boolean;
    error: string | null;

    // Actions
    search: (query: string) => void;
    fetchUser: (userId: string) => Promise<UserOption | null>;
    clearResults: () => void;
    clearError: () => void;
}

export function useUserSearch(options: UseUserSearchOptions = {}): UseUserSearchReturn {
    const { debounceMs = 300, limit = 20, autoSearch = false } = options;

    const [users, setUsers] = useState<UserOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced search
    const search = useCallback((query: string) => {
        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Immediate search for empty query or debounce for text
        const delay = query.trim().length > 0 ? debounceMs : 0;

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            setError(null);
            try {
                const results = await searchUsers(query.trim(), limit);
                setUsers(results);
            } catch (err) {
                const message = err instanceof Error ? err.message : '搜索用户失败';
                console.error('[useUserSearch] Search failed:', err);
                setError(message);
                setUsers([]);
            } finally {
                setIsLoading(false);
            }
        }, delay);
    }, [debounceMs, limit]);

    // Fetch single user by ID
    const fetchUser = useCallback(async (userId: string): Promise<UserOption | null> => {
        try {
            return await fetchUserById(userId);
        } catch (err) {
            console.error('[useUserSearch] Fetch user failed:', err);
            return null;
        }
    }, []);

    // Clear results
    const clearResults = useCallback(() => {
        setUsers([]);
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
        users,
        isLoading,
        error,
        search,
        fetchUser,
        clearResults,
        clearError,
    };
}

export default useUserSearch;
