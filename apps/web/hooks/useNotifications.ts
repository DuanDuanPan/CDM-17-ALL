/**
 * Story 2.4: Task Dispatch & Feedback
 * useNotifications Hook - WebSocket + Polling Fallback
 * [AI-Review][MEDIUM-4] Fixed: Polling effect memory leak
 * [AI-Review][MEDIUM-6] Fixed: Use correct env variable NEXT_PUBLIC_API_BASE_URL
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Notification } from '@cdm/types';
import { io, Socket } from 'socket.io-client';

// [AI-Review][MEDIUM-6] Use project-standard env variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const POLLING_INTERVAL = 30000; // 30 seconds fallback polling

export interface UseNotificationsOptions {
  userId: string;
  enableWebSocket?: boolean;
  enablePolling?: boolean;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useNotifications({
  userId,
  enableWebSocket = true,
  enablePolling = true,
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Fetch notifications from REST API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store', // Prevent browser caching
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('[useNotifications] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications/unread-count?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store', // Prevent browser caching
      });
      if (response.ok) {
        const { count } = await response.json();
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('[useNotifications] Unread count fetch error:', err);
    }
  }, [userId]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}:markRead`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[useNotifications] Mark as read error:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications/markAllRead?userId=${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[useNotifications] Mark all as read error:', err);
    }
  }, [userId]);

  // WebSocket connection setup
  useEffect(() => {
    if (!enableWebSocket) return;

    // [AI-Review][MEDIUM-6] Use API_BASE_URL instead of WS_URL
    const socket = io(`${API_BASE_URL}/notifications`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 3, // Reduced from 5 to prevent spam
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[useNotifications] WebSocket connected');
      setIsConnected(true);
      setError(null);
      // Join user room
      socket.emit('join', userId);
    });

    socket.on('disconnect', (reason) => {
      console.log('[useNotifications] WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('notification:new', (notification: Notification) => {
      console.log('[useNotifications] New notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on('connect_error', () => {
      // Suppress verbose error logging - connection failures are expected in development
      console.debug('[useNotifications] WebSocket unavailable (falling back to polling)');
      setIsConnected(false);
      // Don't set error state for connection failures - polling will handle it
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, enableWebSocket]);

  // [AI-Review][MEDIUM-4] Fixed: Use refs for callbacks to avoid recreating interval
  const fetchNotificationsRef = useRef(fetchNotifications);
  const fetchUnreadCountRef = useRef(fetchUnreadCount);

  // Keep refs updated
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
    fetchUnreadCountRef.current = fetchUnreadCount;
  }, [fetchNotifications, fetchUnreadCount]);

  // Polling fallback - [AI-Review][MEDIUM-4] Fixed: Stable dependencies
  useEffect(() => {
    if (!enablePolling) return;

    // Initial fetch
    fetchNotificationsRef.current();

    // Setup polling interval with stable callback
    const intervalId = setInterval(() => {
      // Only poll when WebSocket is disconnected
      // Note: We check socketRef instead of isConnected to avoid dependency
      if (!socketRef.current?.connected) {
        fetchNotificationsRef.current();
        fetchUnreadCountRef.current();
      }
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [enablePolling, userId]); // Minimal stable dependencies

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
    isLoading,
    error,
  };
}
