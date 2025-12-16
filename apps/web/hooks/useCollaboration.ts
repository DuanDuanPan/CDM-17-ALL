'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { LayoutMode } from '@cdm/types';

/**
 * User presence information for Awareness
 */
export interface CollabUser {
    id: string;
    name: string;
    color: string;
    avatar?: string;
}

/**
 * Remote user awareness state
 */
export interface AwarenessUser extends CollabUser {
    cursor?: { x: number; y: number };
    selectedNodeId?: string;
}

/**
 * Collaboration hook return type
 */
export interface UseCollaborationReturn {
    /** Yjs document instance */
    yDoc: Y.Doc | null;
    /** Hocuspocus provider instance */
    provider: HocuspocusProvider | null;
    /** Yjs Awareness API */
    awareness: HocuspocusProvider['awareness'] | null;
    /** Whether connected to collaboration server */
    isConnected: boolean;
    /** Whether initial document sync is completed */
    isSynced: boolean;
    /** Connection error if any */
    error: Error | null;
    /** Remote users currently in the document */
    remoteUsers: AwarenessUser[];
    /** Update local user cursor position */
    updateCursor: (x: number, y: number) => void;
    /** Update local user selected node */
    updateSelectedNode: (nodeId: string | null) => void;
    /** Disconnect from collaboration */
    disconnect: () => void;
}

/**
 * Collaboration configuration
 */
export interface CollaborationConfig {
    /** Graph/Document ID to collaborate on */
    graphId: string;
    /** Current user information */
    user: CollabUser;
    /** WebSocket URL (default: ws://localhost:1234) */
    wsUrl?: string;
    /** Auth token (Clerk token for production) */
    token?: string;
}

// Predefined color palette for user cursors (Magic UI aesthetic)
const USER_COLORS = [
    '#3b82f6', // Electric Blue
    '#8b5cf6', // Neon Purple
    '#10b981', // Emerald Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
];

/**
 * Get a consistent color for a user based on their ID
 */
function getUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

/**
 * useCollaboration - Real-time collaboration hook
 *
 * Manages Hocuspocus WebSocket connection and Yjs document synchronization.
 * Provides awareness for user presence (cursors, selections).
 *
 * Story 1.4: Real-time Collaboration Engine
 *
 * @example
 * ```tsx
 * const { yDoc, provider, awareness, isConnected, remoteUsers } = useCollaboration({
 *   graphId: 'my-graph-id',
 *   user: { id: 'user-1', name: 'John', color: '#3b82f6' },
 * });
 * ```
 */
export function useCollaboration(config: CollaborationConfig): UseCollaborationReturn {
    const { graphId, user, wsUrl = 'ws://localhost:1234', token } = config;

    // Refs to persist across renders
    const yDocRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<HocuspocusProvider | null>(null);
    const prevRemoteUsersRef = useRef<AwarenessUser[]>([]);

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<AwarenessUser[]>([]);

    // Initialize collaboration
    useEffect(() => {
        if (!graphId) return;

        // Create Yjs document
        const yDoc = new Y.Doc();
        yDocRef.current = yDoc;

        // Build WebSocket URL with token if provided
        const params = new URLSearchParams();
        if (token) {
            params.set('token', token);
        }
        const fullUrl = `${wsUrl}?${params.toString()}`;

        // Create Hocuspocus provider
        const provider = new HocuspocusProvider({
            url: fullUrl,
            name: `graph:${graphId}`,
            document: yDoc,
            // Connection lifecycle handlers
            onConnect: () => {
                console.log('[Collab] Connected to collaboration server');
                setIsConnected(true);
                setIsSynced(false);
                setError(null);
            },
            onClose: () => {
                console.log('[Collab] Disconnected from collaboration server');
                setIsConnected(false);
                setIsSynced(false);
            },
            onDisconnect: () => {
                console.log('[Collab] WebSocket disconnected');
                setIsConnected(false);
                setIsSynced(false);
            },
            onSynced: () => {
                console.log('[Collab] Document synced');
                setIsSynced(true);
            },
        });

        providerRef.current = provider;

        // Set local user awareness state
        const userColor = user.color || getUserColor(user.id);
        provider.awareness?.setLocalStateField('user', {
            id: user.id,
            name: user.name,
            color: userColor,
            avatar: user.avatar,
        });

        // Listen to awareness changes (remote users)
        const handleAwarenessChange = () => {
            if (!provider.awareness) return;

            const states = provider.awareness.getStates();
            const users: AwarenessUser[] = [];

            states.forEach((state, clientId) => {
                // Skip local user
                if (clientId === provider.awareness?.clientID) return;

                if (state.user) {
                    users.push({
                        id: state.user.id,
                        name: state.user.name,
                        color: state.user.color,
                        avatar: state.user.avatar,
                        cursor: state.cursor,
                        selectedNodeId: state.selectedNodeId,
                    });
                }
            });

            // Avoid unnecessary state updates that can cause render loops under rapid cursor/move events
            const prev = prevRemoteUsersRef.current;
            const isSame =
                prev.length === users.length &&
                prev.every((u, idx) => {
                    const v = users[idx];
                    return (
                        u.id === v.id &&
                        u.name === v.name &&
                        u.color === v.color &&
                        u.avatar === v.avatar &&
                        u.cursor?.x === v.cursor?.x &&
                        u.cursor?.y === v.cursor?.y &&
                        u.selectedNodeId === v.selectedNodeId
                    );
                });

            if (!isSame) {
                prevRemoteUsersRef.current = users;
                setRemoteUsers(users);
            }
        };

        provider.awareness?.on('change', handleAwarenessChange);

        // Initial state
        handleAwarenessChange();

        // Cleanup
        return () => {
            provider.awareness?.off('change', handleAwarenessChange);
            provider.destroy();
            yDoc.destroy();
            yDocRef.current = null;
            providerRef.current = null;
            setIsConnected(false);
            setIsSynced(false);
            setRemoteUsers([]);
        };
    }, [graphId, wsUrl, token, user.id, user.name, user.color, user.avatar]);

    // Update cursor position in awareness
    const updateCursor = useCallback((x: number, y: number) => {
        const provider = providerRef.current;
        if (!provider?.awareness) return;

        provider.awareness.setLocalStateField('cursor', { x, y });
    }, []);

    // Update selected node in awareness
    const updateSelectedNode = useCallback((nodeId: string | null) => {
        const provider = providerRef.current;
        if (!provider?.awareness) return;

        provider.awareness.setLocalStateField('selectedNodeId', nodeId);
    }, []);

    // Disconnect from collaboration
    const disconnect = useCallback(() => {
        const provider = providerRef.current;
        if (provider) {
            provider.destroy();
            providerRef.current = null;
            setIsConnected(false);
        }
    }, []);

    return {
        yDoc: yDocRef.current,
        provider: providerRef.current,
        awareness: providerRef.current?.awareness ?? null,
        isConnected,
        isSynced,
        error,
        remoteUsers,
        updateCursor,
        updateSelectedNode,
        disconnect,
    };
}
