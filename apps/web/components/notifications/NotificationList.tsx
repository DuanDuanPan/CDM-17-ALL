/**
 * Story 2.4: Task Dispatch & Feedback
 * NotificationList - Dropdown list of notifications
 */

'use client';

import { CheckCircle, XCircle, Send, RefreshCw, CheckCheck, X, AtSign, Eye } from 'lucide-react';
import type { WatchNotificationContent } from '@cdm/types';
import type { Notification, NotificationContent } from '@cdm/types';

export interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onClose: () => void;
  /** Story 2.4: Navigate to the related node when clicking a notification */
  onNavigate?: (nodeId: string) => void;
  /** Story 4.4: Unsubscribe callback for WATCH_UPDATE notifications (AC#3) */
  onUnsubscribe?: (nodeId: string) => Promise<void>;
}

export function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onClose,
  onNavigate,
  onUnsubscribe,
}: NotificationListProps) {
  const hasNotifications = notifications.length > 0;
  const hasUnread = notifications.some((n) => !n.isRead);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_DISPATCH':
        return <Send className="w-4 h-4 text-blue-600" />;
      case 'TASK_ACCEPTED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'TASK_REJECTED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'MENTION':
        // Story 4.3: @mention notification icon
        return <AtSign className="w-4 h-4 text-purple-600" />;
      case 'WATCH_UPDATE':
        // Story 4.4: Watch subscription notification icon
        return <Eye className="w-4 h-4 text-amber-600" />;
      default:
        return <Send className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="w-[380px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">通知中心</h3>
        <div className="flex items-center gap-2">
          {hasUnread && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="全部标为已读"
            >
              <CheckCheck className="w-3 h-3" />
              全部已读
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 text-gray-500 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="刷新"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:bg-gray-200 rounded transition-colors"
            title="关闭"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[480px] overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            加载中...
          </div>
        ) : !hasNotifications ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const content = notification.content as NotificationContent;
              return (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  content={content}
                  formatTime={formatTime}
                  getIcon={getNotificationIcon}
                  onMarkAsRead={onMarkAsRead}
                  onNavigate={onNavigate}
                  onClose={onClose}
                  onUnsubscribe={onUnsubscribe}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Bell({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

interface NotificationItemProps {
  notification: Notification;
  content: NotificationContent;
  formatTime: (date: string) => string;
  getIcon: (type: string) => React.ReactElement;
  onMarkAsRead: (id: string) => Promise<void>;
  /** Story 2.4: Navigate to the related node */
  onNavigate?: (nodeId: string) => void;
  /** Close the notification panel after navigation */
  onClose: () => void;
  /** Story 4.4: Unsubscribe callback for WATCH_UPDATE notifications */
  onUnsubscribe?: (nodeId: string) => Promise<void>;
}

function NotificationItem({
  notification,
  content,
  formatTime,
  getIcon,
  onMarkAsRead,
  onNavigate,
  onClose,
  onUnsubscribe,
}: NotificationItemProps) {
  const handleClick = () => {
    // 1. Mark as read if not already
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    const mentionNodeId =
      notification.type === 'MENTION' && 'nodeId' in content
        ? (content as { nodeId: string }).nodeId
        : undefined;

    // Story 4.4: Get node ID from WATCH_UPDATE notification
    const watchNodeId =
      notification.type === 'WATCH_UPDATE' && 'nodeId' in content
        ? (content as WatchNotificationContent).nodeId
        : undefined;

    const targetNodeId = notification.refNodeId || mentionNodeId || watchNodeId;

    // 2. Navigate to the related node (if any)
    if (targetNodeId && onNavigate) {
      onNavigate(targetNodeId);
    }

    // Story 4.3: Open CommentPanel when clicking a MENTION notification
    if (notification.type === 'MENTION' && targetNodeId) {
      const nodeLabel =
        'nodeName' in content ? (content as { nodeName: string }).nodeName : '节点';

      window.dispatchEvent(
        new CustomEvent('mindmap:open-comments', {
          detail: { nodeId: targetNodeId, nodeLabel },
        })
      );
    }

    // 3. Close the notification panel
    onClose();
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/50' : ''
        }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900 leading-tight">
              {notification.title}
            </h4>
            {!notification.isRead && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
            )}
          </div>

          <p className="text-xs text-gray-600 mb-1 leading-relaxed">
            {/* Story 4.3: Handle MENTION notifications separately */}
            {notification.type === 'MENTION' && 'preview' in content && (
              <>
                <span className="font-medium">{(content as { senderName: string }).senderName}</span> 在「
                {(content as { nodeName: string }).nodeName}」中提到了您：
                <span className="block mt-1 text-gray-500 italic truncate">
                  {(content as { preview: string }).preview}
                </span>
              </>
            )}
            {/* Task Dispatch notifications */}
            {'action' in content && content.action === 'dispatch' && (
              <>
                <span className="font-medium">{content.senderName}</span> 派发了任务「
                {(content as { taskName: string }).taskName}」给您
              </>
            )}
            {'action' in content && content.action === 'accept' && (
              <>
                <span className="font-medium">{content.senderName}</span> 已接受任务「
                {(content as { taskName: string }).taskName}」
              </>
            )}
            {'action' in content && content.action === 'reject' && (
              <>
                <span className="font-medium">{content.senderName}</span> 驳回了任务「
                {(content as { taskName: string }).taskName}」
                {'reason' in content && content.reason && (
                  <span className="block mt-1 text-red-600">理由: {content.reason as string}</span>
                )}
              </>
            )}
            {/* Story 4.4: WATCH_UPDATE notifications */}
            {notification.type === 'WATCH_UPDATE' && 'message' in content && (
              <>
                <span className="text-amber-700">
                  {(content as WatchNotificationContent).message}
                </span>
                {(content as WatchNotificationContent).changeCount > 1 && (
                  <span className="block mt-1 text-gray-500 text-[10px]">
                    共 {(content as WatchNotificationContent).changeCount} 处变更
                  </span>
                )}
                {/* Story 4.4 AC#3: Unsubscribe button directly in notification */}
                {onUnsubscribe && (content as WatchNotificationContent).nodeId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nodeId = (content as WatchNotificationContent).nodeId;
                      if (nodeId) {
                        onUnsubscribe(nodeId);
                        onMarkAsRead(notification.id);
                      }
                    }}
                    className="mt-2 px-2 py-1 text-[10px] text-amber-600 border border-amber-300 rounded hover:bg-amber-50 transition-colors"
                  >
                    取消关注
                  </button>
                )}
              </>
            )}
          </p>

          <span className="text-[10px] text-gray-400">
            {formatTime(notification.createdAt)}
          </span>
        </div>
      </div>
    </button>
  );
}
