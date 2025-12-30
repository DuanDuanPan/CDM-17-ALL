/**
 * Story 7.2: useTaskDispatch Hook Tests
 * Tests for the task dispatch workflow hook
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskDispatch } from '../useTaskDispatch';
import type { TaskProps } from '@cdm/types';

// Mock dependencies
vi.mock('@/contexts', () => ({
    useCurrentUserId: () => 'test-user-id',
}));

const mockAddToast = vi.fn();
vi.mock('@cdm/ui', () => ({
    useToast: () => ({ addToast: mockAddToast }),
}));

describe('useTaskDispatch', () => {
    const baseFormData: TaskProps = {
        status: 'todo',
        priority: 'medium',
        assigneeId: 'assignee-123',
        assignmentStatus: 'idle',
    };

    beforeEach(() => {
        global.fetch = vi.fn();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('dispatch', () => {
        it('should dispatch task with correct API call', async () => {
            (fetch as Mock).mockResolvedValueOnce({ ok: true });

            const onUpdate = vi.fn();
            const { result } = renderHook(() =>
                useTaskDispatch('node-1', { onUpdate })
            );

            const updatedData = await act(async () => {
                return result.current.dispatch(baseFormData);
            });

            expect(fetch).toHaveBeenCalledWith(
                '/api/nodes/node-1:dispatch?userId=test-user-id',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            expect(updatedData.assignmentStatus).toBe('dispatched');
            expect(updatedData.ownerId).toBe('test-user-id');
            expect(onUpdate).toHaveBeenCalledWith(updatedData);
            expect(mockAddToast).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'success', title: '派发成功' })
            );
        });

        it('should show warning when assigneeId is missing', async () => {
            const { result } = renderHook(() => useTaskDispatch('node-1'));

            await expect(
                act(async () => {
                    await result.current.dispatch({ ...baseFormData, assigneeId: undefined });
                })
            ).rejects.toThrow('Missing assignee');

            expect(mockAddToast).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'warning', title: '缺少信息' })
            );
            expect(fetch).not.toHaveBeenCalled();
        });
    });

    describe('accept', () => {
        it('should accept task with correct API call', async () => {
            (fetch as Mock).mockResolvedValueOnce({ ok: true });

            const dispatchedFormData = {
                ...baseFormData,
                assignmentStatus: 'dispatched' as const,
            };

            const onUpdate = vi.fn();
            const { result } = renderHook(() =>
                useTaskDispatch('node-1', { onUpdate })
            );

            const updatedData = await act(async () => {
                return result.current.accept(dispatchedFormData);
            });

            expect(fetch).toHaveBeenCalledWith(
                '/api/nodes/node-1:feedback?userId=test-user-id',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ action: 'accept' }),
                })
            );

            expect(updatedData.assignmentStatus).toBe('accepted');
            expect(updatedData.status).toBe('todo');
            expect(mockAddToast).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'success', title: '接受成功' })
            );
        });
    });

    describe('reject', () => {
        it('should reject task with reason and correct API call', async () => {
            (fetch as Mock).mockResolvedValueOnce({ ok: true });

            const dispatchedFormData = {
                ...baseFormData,
                assignmentStatus: 'dispatched' as const,
            };

            const onUpdate = vi.fn();
            const { result } = renderHook(() =>
                useTaskDispatch('node-1', { onUpdate })
            );

            const updatedData = await act(async () => {
                return result.current.reject(dispatchedFormData, '任务描述不清晰');
            });

            expect(fetch).toHaveBeenCalledWith(
                '/api/nodes/node-1:feedback?userId=test-user-id',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ action: 'reject', reason: '任务描述不清晰' }),
                })
            );

            expect(updatedData.assignmentStatus).toBe('rejected');
            expect(updatedData.rejectionReason).toBe('任务描述不清晰');
            expect(mockAddToast).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'success', title: '驳回成功' })
            );
        });

        it('should show warning when reason is empty', async () => {
            const { result } = renderHook(() => useTaskDispatch('node-1'));

            await expect(
                act(async () => {
                    await result.current.reject(baseFormData, '');
                })
            ).rejects.toThrow('Missing reason');

            expect(mockAddToast).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'warning', title: '提示' })
            );
            expect(fetch).not.toHaveBeenCalled();
        });
    });

    describe('clearError', () => {
        it('should be a callable function that clears any error state', () => {
            const { result } = renderHook(() => useTaskDispatch('node-1'));

            // Verify clearError exists and is callable
            expect(typeof result.current.clearError).toBe('function');

            // Initial error should be null
            expect(result.current.error).toBeNull();

            // Calling clearError should not throw
            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });
});
