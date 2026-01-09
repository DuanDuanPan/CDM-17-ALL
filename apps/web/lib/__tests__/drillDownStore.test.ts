/**
 * Story 8.9: 子图下钻导航 (Subgraph Drill-Down Navigation)
 * 单元测试 - drillDownStore
 *
 * 测试覆盖矩阵:
 * - AC1: 右键菜单/快捷键进入子图
 * - AC3: 通过面包屑返回上层
 * - AC5: 下钻状态持久化
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getDrillPath,
    setDrillPath,
    pushPath,
    popPath,
    goToPath,
    resetPath,
    subscribe,
    restoreFromUrl,
    getCurrentRootId,
} from '../drillDownStore';

// Mock window.location and sessionStorage
const mockLocation = {
    pathname: '/mindmap/123',
    search: '?userId=abc',
    hash: '',
};

const mockSessionStorage: Record<string, string> = {};

beforeEach(() => {
    // Reset store state
    resetPath();

    // Reset mocks
    vi.stubGlobal('location', { ...mockLocation, hash: '' });
    vi.stubGlobal('sessionStorage', {
        getItem: (key: string) => mockSessionStorage[key] ?? null,
        setItem: (key: string, value: string) => {
            mockSessionStorage[key] = value;
        },
        removeItem: (key: string) => {
            delete mockSessionStorage[key];
        },
        clear: () => {
            Object.keys(mockSessionStorage).forEach((k) => delete mockSessionStorage[k]);
        },
    });

    // Reset history mock
    vi.stubGlobal('history', {
        replaceState: vi.fn(),
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    Object.keys(mockSessionStorage).forEach((k) => delete mockSessionStorage[k]);
});

describe('drillDownStore', () => {
    describe('核心功能测试 (Core Functionality)', () => {
        // AC1: pushPath 添加节点到路径
        it('pushPath 添加节点到路径', () => {
            pushPath('nodeA');
            expect(getDrillPath()).toEqual(['nodeA']);

            pushPath('nodeB');
            expect(getDrillPath()).toEqual(['nodeA', 'nodeB']);
        });

        // AC1: pushPath 多层连续下钻
        it('pushPath 多层连续下钻', () => {
            pushPath('root');
            pushPath('level1');
            pushPath('level2');
            pushPath('level3');

            expect(getDrillPath()).toEqual(['root', 'level1', 'level2', 'level3']);
        });

        // AC3: popPath 返回上一层
        it('popPath 返回上一层', () => {
            setDrillPath(['nodeA', 'nodeB', 'nodeC']);

            const result = popPath();
            expect(result).toBe(true);
            expect(getDrillPath()).toEqual(['nodeA', 'nodeB']);
        });

        // AC3: popPath 空路径返回 false
        it('popPath 空路径返回 false', () => {
            const result = popPath();
            expect(result).toBe(false);
            expect(getDrillPath()).toEqual([]);
        });

        // AC2: goToPath 直接跳转到指定路径
        it('goToPath 直接跳转到指定路径', () => {
            setDrillPath(['a', 'b', 'c', 'd']);

            goToPath(['a', 'b']);
            expect(getDrillPath()).toEqual(['a', 'b']);
        });

        // AC2: goToPath 跨层级跳转（level 3 → level 1）
        it('goToPath 跨层级跳转（level 3 → level 1）', () => {
            setDrillPath(['root', 'level1', 'level2', 'level3']);

            goToPath(['root']);
            expect(getDrillPath()).toEqual(['root']);
        });

        // AC3: resetPath 清空所有层级
        it('resetPath 清空所有层级', () => {
            setDrillPath(['a', 'b', 'c']);

            resetPath();
            expect(getDrillPath()).toEqual([]);
        });

        // AC1: getDrillPath 返回稳定快照（不可变）
        it('getDrillPath 返回稳定快照（不可变）', () => {
            setDrillPath(['a', 'b']);

            const path1 = getDrillPath();
            const path2 = getDrillPath();

            // useSyncExternalStore 要求 getSnapshot 返回稳定引用（除非 store 发生变化）
            expect(path1).toBe(path2);
            expect(Object.isFrozen(path1)).toBe(true);

            // 尝试修改（应失败），且不影响 store
            expect(() => (path1 as unknown as string[]).push('c')).toThrow();
            expect(getDrillPath()).toEqual(['a', 'b']); // 原始路径不变
        });

        // 获取当前根节点 ID
        it('getCurrentRootId 返回路径的最后一个节点', () => {
            expect(getCurrentRootId()).toBeNull();

            pushPath('nodeA');
            expect(getCurrentRootId()).toBe('nodeA');

            pushPath('nodeB');
            expect(getCurrentRootId()).toBe('nodeB');
        });
    });

    describe('持久化测试 (Persistence)', () => {
        // AC5: URL hash 同步
        it('URL hash 同步 (#drill=a/b/c)', () => {
            pushPath('a');
            pushPath('b');
            pushPath('c');

            expect(window.history.replaceState).toHaveBeenCalled();
            // 验证 URL hash 格式正确
            const lastCall = vi.mocked(window.history.replaceState).mock.lastCall;
            expect(lastCall).toBeDefined();
            // URL 应包含 drill= 参数
            const url = lastCall?.[2] as string;
            expect(url).toContain('#drill=');
            expect(url).toContain('a');
        });

        // AC5: restoreFromUrl 从 URL hash 恢复
        it('restoreFromUrl 从 URL hash 恢复', () => {
            vi.stubGlobal('location', {
                ...mockLocation,
                hash: '#drill=nodeA/nodeB/nodeC',
            });

            const restored = restoreFromUrl();
            expect(restored).toBe(true);
            expect(getDrillPath()).toEqual(['nodeA', 'nodeB', 'nodeC']);
        });

        // AC5: restoreFromUrl sessionStorage fallback
        it('restoreFromUrl sessionStorage fallback', () => {
            vi.stubGlobal('location', {
                ...mockLocation,
                hash: '',
            });
            mockSessionStorage['cdm:drillPath:123'] = JSON.stringify(['fallbackA', 'fallbackB']);

            const restored = restoreFromUrl();
            expect(restored).toBe(true);
            expect(getDrillPath()).toEqual(['fallbackA', 'fallbackB']);
        });

        // AC5: URL 特殊字符编码
        it('URL 特殊字符编码（nodeId 包含 / 和 #）', () => {
            pushPath('node/with/slash');
            pushPath('node#with#hash');

            const lastCall = vi.mocked(window.history.replaceState).mock.lastCall;
            const url = lastCall?.[2] as string;
            // 特殊字符应该被编码
            expect(url).not.toContain('node/with/slash');
            expect(url).toContain(encodeURIComponent('node/with/slash'));
        });
    });

    describe('订阅与通知测试 (Subscription & Notification)', () => {
        // AC4: subscribe 多订阅者通知
        it('subscribe 多订阅者通知', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            subscribe(callback1);
            subscribe(callback2);

            pushPath('nodeA');

            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        // 取消订阅后不再通知
        it('取消订阅后不再通知', () => {
            const callback = vi.fn();

            const unsubscribe = subscribe(callback);
            pushPath('nodeA');
            expect(callback).toHaveBeenCalledTimes(1);

            unsubscribe();
            pushPath('nodeB');
            expect(callback).toHaveBeenCalledTimes(1); // 不应增加
        });
    });

    describe('边界条件测试 (Edge Cases)', () => {
        // 空路径下钻尝试
        it('空路径时 popPath 返回 false', () => {
            expect(popPath()).toBe(false);
        });

        // 单节点路径
        it('单节点路径 popPath 后变为空', () => {
            pushPath('onlyNode');
            expect(popPath()).toBe(true);
            expect(getDrillPath()).toEqual([]);
        });

        // URL hash 格式错误时的 fallback
        it('URL hash 格式错误时的 fallback', () => {
            vi.stubGlobal('location', {
                ...mockLocation,
                hash: '#invalid-format',
            });

            const restored = restoreFromUrl();
            expect(restored).toBe(false);
            expect(getDrillPath()).toEqual([]);
        });

        // 不存在的节点 ID 不影响路径操作
        it('setDrillPath 接受任意字符串数组', () => {
            // Store 不验证节点是否存在，这是 GraphComponent 的责任
            setDrillPath(['nonexistent', 'also-nonexistent']);
            expect(getDrillPath()).toEqual(['nonexistent', 'also-nonexistent']);
        });
    });
});
