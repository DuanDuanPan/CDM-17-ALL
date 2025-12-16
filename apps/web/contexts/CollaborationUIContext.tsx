'use client';

import { createContext, useContext, ReactNode, useMemo, useCallback, useState } from 'react';
import type { AwarenessUser } from '@/hooks/useCollaboration';

/**
 * CollaborationUI Context Value
 *
 * Provides collaboration UI state to components that need it without prop drilling.
 * This is separate from the Hocuspocus/Yjs connection (useCollaboration hook).
 */
export interface CollaborationUIContextValue {
    /** Remote users currently collaborating */
    remoteUsers: AwarenessUser[];
    /** Update remote users list (called by GraphComponent) */
    setRemoteUsers: (users: AwarenessUser[]) => void;
    /** Callback when hovering over user avatar (highlight their cursor) */
    onUserHover: (userId: string | null) => void;
    /** Callback when clicking user avatar (pan to their position) */
    onUserClick: (userId: string) => void;
}

const CollaborationUIContext = createContext<CollaborationUIContextValue | null>(null);

export interface CollaborationUIProviderProps {
    children: ReactNode;
    /** Optional external handler for user hover */
    onUserHoverExternal?: (userId: string | null) => void;
    /** Optional external handler for user click */
    onUserClickExternal?: (userId: string) => void;
}

/**
 * CollaborationUIProvider - Provides collaboration UI state to descendants
 *
 * Story 1.4: MED-12 - Replace props drilling with Context
 *
 * @example
 * ```tsx
 * <CollaborationUIProvider>
 *   <TopBar />
 *   <GraphComponent />
 * </CollaborationUIProvider>
 * ```
 */
export function CollaborationUIProvider({
    children,
    onUserHoverExternal,
    onUserClickExternal,
}: CollaborationUIProviderProps) {
    const [remoteUsers, setRemoteUsers] = useState<AwarenessUser[]>([]);

    const onUserHover = useCallback(
        (userId: string | null) => {
            // In future: could highlight the user's cursor on canvas
            onUserHoverExternal?.(userId);
        },
        [onUserHoverExternal]
    );

    const onUserClick = useCallback(
        (userId: string) => {
            // In future: could pan canvas to user's position
            onUserClickExternal?.(userId);
        },
        [onUserClickExternal]
    );

    const value = useMemo<CollaborationUIContextValue>(
        () => ({
            remoteUsers,
            setRemoteUsers,
            onUserHover,
            onUserClick,
        }),
        [remoteUsers, onUserHover, onUserClick]
    );

    return (
        <CollaborationUIContext.Provider value={value}>
            {children}
        </CollaborationUIContext.Provider>
    );
}

/**
 * useCollaborationUI - Hook to access collaboration UI context
 *
 * @throws Error if used outside of CollaborationUIProvider
 */
export function useCollaborationUI(): CollaborationUIContextValue {
    const context = useContext(CollaborationUIContext);
    if (!context) {
        throw new Error('useCollaborationUI must be used within a CollaborationUIProvider');
    }
    return context;
}

/**
 * useCollaborationUIOptional - Hook to optionally access collaboration UI context
 *
 * Returns null if not within provider (graceful fallback for standalone usage)
 */
export function useCollaborationUIOptional(): CollaborationUIContextValue | null {
    return useContext(CollaborationUIContext);
}
