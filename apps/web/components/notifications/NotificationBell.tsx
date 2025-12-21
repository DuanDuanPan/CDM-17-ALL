/**
 * Story 2.4: Task Dispatch & Feedback
 * NotificationBell - Bell icon with unread count badge
 */

'use client';

import { Bell } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { NotificationList } from './NotificationList';
import type { Notification } from '@cdm/types';

export interface NotificationBellProps {
  unreadCount: number;
  notifications: Notification[];
  isConnected: boolean;
  isLoading: boolean;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onRefresh: () => Promise<void>;
  /** Story 2.4: Navigate to the related node when clicking a notification */
  onNavigate?: (nodeId: string) => void;
}

export function NotificationBell({
  unreadCount,
  notifications,
  isConnected,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onNavigate,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="w-4 h-4 text-gray-600" />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* WebSocket Connection Indicator */}
        {!isConnected && (
          <span
            className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-400 rounded-full border border-white"
            title="Offline mode - using polling"
          />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onRefresh={onRefresh}
            onClose={() => setIsOpen(false)}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  );
}
