'use client';

/**
 * Story 4.1: User Context for managing current user state
 *
 * TODO: Replace mock implementation with actual auth integration (e.g., Clerk)
 * This context provides a centralized way to access current user info
 * throughout the application, making it easier to integrate auth later.
 * 
 * Current behavior: Reads userId from URL search params (?userId=xxx)
 * Falls back to 'test1' if not provided.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

export interface CurrentUser {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
}

interface UserContextValue {
    currentUser: CurrentUser | null;
    isLoading: boolean;
    setCurrentUser: (user: CurrentUser | null) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

// Create user object from userId
function createUserFromId(userId: string): CurrentUser {
    return {
        id: userId,
        name: `User ${userId}`,
        email: `${userId}@example.com`,
    };
}

// Default mock user ID for development
const DEFAULT_USER_ID = 'test1';

export interface UserProviderProps {
    children: ReactNode;
    initialUser?: CurrentUser | null;
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
    const searchParams = useSearchParams();

    // Read userId from URL search params, fallback to default
    const urlUserId = searchParams.get('userId');

    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
        if (initialUser) return initialUser;
        const userId = urlUserId || DEFAULT_USER_ID;
        return createUserFromId(userId);
    });
    const [isLoading] = useState(false);

    // Sync with URL changes
    useEffect(() => {
        if (urlUserId && currentUser?.id !== urlUserId) {
            setCurrentUser(createUserFromId(urlUserId));
        }
    }, [urlUserId, currentUser?.id]);

    const handleSetCurrentUser = useCallback((user: CurrentUser | null) => {
        setCurrentUser(user);
    }, []);

    const value = useMemo(() => ({
        currentUser,
        isLoading,
        setCurrentUser: handleSetCurrentUser,
    }), [currentUser, isLoading, handleSetCurrentUser]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

/**
 * Hook to access current user context
 * Throws if used outside of UserProvider
 */
export function useCurrentUser(): UserContextValue {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useCurrentUser must be used within a UserProvider');
    }
    return context;
}

/**
 * Hook to get just the current user ID
 * Returns 'anonymous' if no user is set
 */
export function useCurrentUserId(): string {
    const { currentUser } = useCurrentUser();
    return currentUser?.id ?? 'anonymous';
}

/**
 * Optional hook that returns null if used outside provider
 * Useful for components that can work with or without user context
 */
export function useCurrentUserOptional(): UserContextValue | null {
    return useContext(UserContext) ?? null;
}
