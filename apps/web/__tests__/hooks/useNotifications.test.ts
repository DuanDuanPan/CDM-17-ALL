/**
 * Story 4.5: Smart Notification Center
 * Unit tests for useNotifications hook (HIGH priority toast + flag)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Notification } from '@cdm/types';

type Handler = (payload?: unknown) => void;

class MockSocket {
  handlers = new Map<string, Handler>();
  connected = true;
  on = vi.fn((event: string, handler: Handler) => {
    this.handlers.set(event, handler);
  });
  emit = vi.fn();
  disconnect = vi.fn();
}

const toast = vi.fn();

describe('useNotifications', () => {
  let socket: MockSocket;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    toast.mockClear();
    socket = new MockSocket();
    socket.handlers.clear();
    socket.connected = true;

    vi.doMock('socket.io-client', () => ({
      io: vi.fn(() => socket),
    }));
    vi.doMock('sonner', () => ({
      toast,
    }));
  });

  it('sets HIGH priority flag and triggers toast on notification:new', async () => {
    const { useNotifications } = await import('@/hooks/useNotifications');

    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        enablePolling: false,
        enableWebSocket: true,
        enableHighPriorityToast: true,
      })
    );

    const handler = socket.handlers.get('notification:new');
    expect(handler).toBeTruthy();

    const high: Notification = {
      id: 'n1',
      recipientId: 'user-1',
      type: 'MENTION',
      title: '@张三 提到了你',
      content: {
        commentId: 'c1',
        nodeId: 'node-1',
        nodeName: 'Test Node',
        preview: 'hello',
        senderName: '张三',
        mindmapId: 'mindmap-1',
      },
      isRead: false,
      createdAt: new Date().toISOString(),
      priority: 'HIGH',
    };

    await act(async () => {
      handler?.(high);
    });

    expect(result.current.hasNewHighPriority).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      '@张三 提到了你',
      expect.objectContaining({
        duration: 5000,
        action: expect.objectContaining({ label: '查看' }),
      })
    );
  });

  it('does not trigger toast for LOW priority notifications', async () => {
    const { useNotifications } = await import('@/hooks/useNotifications');

    const { result } = renderHook(() =>
      useNotifications({
        userId: 'user-1',
        enablePolling: false,
        enableWebSocket: true,
        enableHighPriorityToast: true,
      })
    );

    const handler = socket.handlers.get('notification:new');
    expect(handler).toBeTruthy();

    const low: Notification = {
      id: 'n2',
      recipientId: 'user-1',
      type: 'WATCH_UPDATE',
      title: '关注内容更新',
      content: {
        mindmapId: 'mindmap-1',
        nodeId: 'node-1',
        nodeName: 'Test Node',
        message: '多人修改了 1 个节点',
        changeCount: 1,
        changedNodes: ['Test Node'],
      },
      isRead: false,
      createdAt: new Date().toISOString(),
      priority: 'LOW',
    };

    await act(async () => {
      handler?.(low);
    });

    expect(result.current.hasNewHighPriority).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });
});
