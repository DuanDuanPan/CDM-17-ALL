/**
 * Story 4.3: Contextual Comments & Mentions
 * useComments Hook - Fetch and manage comments for a node
 * Includes real-time updates via Socket.io
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Comment } from '@cdm/types';
import { COMMENT_SOCKET_EVENTS } from '@cdm/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

function commentExists(list: Comment[], commentId: string): boolean {
    for (const item of list) {
        if (item.id === commentId) return true;
        if (item.replies && item.replies.length > 0) {
            if (commentExists(item.replies, commentId)) return true;
        }
    }
    return false;
}

export interface UseCommentsOptions {
    nodeId: string | null;
    userId: string;
    mindmapId?: string;
}

export interface UseCommentsReturn {
    comments: Comment[];
    isLoading: boolean;
    error: Error | null;
    createComment: (content: string, replyToId?: string, attachmentIds?: string[]) => Promise<Comment | null>;
    deleteComment: (commentId: string) => Promise<boolean>;
    refresh: () => Promise<void>;
    hasMore: boolean;
    loadMore: () => Promise<void>;
}

export function useComments({
    nodeId,
    userId,
    mindmapId,
}: UseCommentsOptions): UseCommentsReturn {
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const cursorRef = useRef<string | undefined>(undefined);

    // Fetch comments from API
    const fetchComments = useCallback(async (loadMore = false) => {
        if (!nodeId) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams({ nodeId });
            if (loadMore && cursorRef.current) {
                params.set('cursor', cursorRef.current);
            }
            params.set('limit', '50');

            const response = await fetch(`/api/comments?${params}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch comments');
            }

            const data = await response.json();

            if (loadMore) {
                setComments((prev) => [...prev, ...data]);
            } else {
                setComments(data);
            }

            // Set cursor for pagination
            if (data.length > 0) {
                cursorRef.current = data[data.length - 1].id;
                setHasMore(data.length >= 50);
            } else {
                setHasMore(false);
            }

            setError(null);
        } catch (err) {
            setError(err as Error);
            console.error('[useComments] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [nodeId, userId]);

    // Create a new comment
    const createComment = useCallback(async (
        content: string,
        replyToId?: string,
        attachmentIds?: string[]
    ): Promise<Comment | null> => {
        if (!nodeId) return null;

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId,
                },
                body: JSON.stringify({ content, nodeId, replyToId, attachmentIds }),
            });

            if (!response.ok) {
                throw new Error('Failed to create comment');
            }

            const newComment = await response.json();

            // Optimistic update - add to beginning of list
            if (replyToId) {
                // Add as reply
                setComments((prev) => {
                    if (commentExists(prev, newComment.id)) return prev;
                    return prev.map((c) =>
                        c.id === replyToId
                            ? { ...c, replies: [...(c.replies || []), newComment] }
                            : c
                    );
                });
            } else {
                // Add as top-level comment
                setComments((prev) => {
                    if (commentExists(prev, newComment.id)) return prev;
                    return [newComment, ...prev];
                });
            }

            return newComment;
        } catch (err) {
            console.error('[useComments] Create error:', err);
            return null;
        }
    }, [nodeId, userId]);

    // Delete a comment
    const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'x-user-id': userId,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete comment');
            }

            // Optimistic update - remove from list
            setComments((prev) =>
                prev
                    .filter((c) => c.id !== commentId)
                    .map((c) => ({
                        ...c,
                        replies: c.replies?.filter((r) => r.id !== commentId),
                    }))
            );

            return true;
        } catch (err) {
            console.error('[useComments] Delete error:', err);
            return false;
        }
    }, [userId]);

    // Load more comments
    const loadMore = useCallback(async () => {
        await fetchComments(true);
    }, [fetchComments]);

    // Refresh comments
    const refresh = useCallback(async () => {
        cursorRef.current = undefined;
        await fetchComments(false);
    }, [fetchComments]);

    // Socket.io real-time updates
    useEffect(() => {
        if (!mindmapId) return;

        const socket = io(API_BASE_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 3,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join', `mindmap:${mindmapId}`);
        });

        socket.on(COMMENT_SOCKET_EVENTS.CREATED, (comment: Comment) => {
            if (comment.nodeId === nodeId) {
                setComments((prev) => {
                    if (commentExists(prev, comment.id)) return prev;
                    if (comment.replyToId) {
                        let inserted = false;
                        const next = prev.map((c) => {
                            if (c.id === comment.replyToId) {
                                inserted = true;
                                return { ...c, replies: [...(c.replies || []), comment] };
                            }
                            return c;
                        });
                        return inserted ? next : prev;
                    }
                    return [comment, ...prev];
                });
            }
        });

        socket.on(COMMENT_SOCKET_EVENTS.DELETED, (payload: { commentId: string; nodeId: string }) => {
            if (payload.nodeId === nodeId) {
                setComments((prev) =>
                    prev
                        .filter((c) => c.id !== payload.commentId)
                        .map((c) => ({
                            ...c,
                            replies: c.replies?.filter((r) => r.id !== payload.commentId),
                        }))
                );
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [mindmapId, nodeId]);

    // Fetch comments when nodeId changes
    useEffect(() => {
        if (nodeId) {
            setComments([]);
            cursorRef.current = undefined;
            fetchComments(false);
        }
    }, [nodeId, fetchComments]);

    return {
        comments,
        isLoading,
        error,
        createComment,
        deleteComment,
        refresh,
        hasMore,
        loadMore,
    };
}
