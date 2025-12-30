'use client';

/**
 * Story 7.2: useTaskDispatch Hook
 * Encapsulates all task dispatch-related API interactions
 * Extracted from TaskDispatchSection.tsx to enforce Hook-First architecture
 *
 * Features:
 * - Dispatch task to assignee
 * - Accept dispatched task
 * - Reject with reason
 * - Toast notifications for user feedback
 */

import { useState, useCallback } from 'react';
import type { TaskProps } from '@cdm/types';
import { useToast } from '@cdm/ui';
import { useCurrentUserId } from '@/contexts';

/**
 * Return type for useTaskDispatch hook
 */
export interface UseTaskDispatchReturn {
    // State
    isSubmitting: boolean;
    error: string | null;

    // Actions (corresponding to TaskDispatchSection fetch calls)
    dispatch: (formData: TaskProps) => Promise<TaskProps>;
    accept: (formData: TaskProps) => Promise<TaskProps>;
    reject: (formData: TaskProps, reason: string) => Promise<TaskProps>;

    // Utilities
    clearError: () => void;
}

/**
 * Options for useTaskDispatch hook
 */
export interface UseTaskDispatchOptions {
    /** Callback when task is updated */
    onUpdate?: (data: TaskProps) => void;
}

/**
 * Safely parse error response from API
 */
async function parseApiError(
    response: Response,
    defaultMessage: string
): Promise<string> {
    const errorText = await response.text();
    try {
        const errorJson = JSON.parse(errorText);
        return errorJson.message || errorJson.error || defaultMessage;
    } catch {
        return errorText || defaultMessage;
    }
}

/**
 * Custom hook for managing task dispatch workflow
 *
 * @param nodeId - The node ID to manage dispatch for
 * @param options - Optional configuration
 * @returns Dispatch state and actions
 *
 * @example
 * ```tsx
 * const { dispatch, accept, reject, isSubmitting } = useTaskDispatch(nodeId);
 *
 * // Dispatch task
 * const updated = await dispatch(formData);
 *
 * // Accept task
 * const accepted = await accept(formData);
 *
 * // Reject task with reason
 * const rejected = await reject(formData, '任务描述不清晰');
 * ```
 */
export function useTaskDispatch(
    nodeId: string,
    options: UseTaskDispatchOptions = {}
): UseTaskDispatchReturn {
    const { onUpdate } = options;
    const currentUserId = useCurrentUserId();
    const { addToast } = useToast();

    // State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Clear error utility
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Dispatch task - corresponds to TaskDispatchSection Line 53-87
     */
    const dispatch = useCallback(
        async (formData: TaskProps): Promise<TaskProps> => {
            if (!formData.assigneeId) {
                addToast({
                    type: 'warning',
                    title: '缺少信息',
                    description: '请先指定执行人',
                });
                throw new Error('Missing assignee');
            }

            setIsSubmitting(true);
            setError(null);
            try {
                const response = await fetch(
                    `/api/nodes/${nodeId}:dispatch?userId=${encodeURIComponent(currentUserId)}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    }
                );

                if (!response.ok) {
                    throw new Error(await parseApiError(response, '派发失败'));
                }

                const now = new Date().toISOString();
                const updatedData: TaskProps = {
                    ...formData,
                    assignmentStatus: 'dispatched',
                    ownerId: currentUserId,
                    dispatchedAt: now,
                };

                onUpdate?.(updatedData);
                addToast({
                    type: 'success',
                    title: '派发成功',
                    description: '任务已成功派发！',
                });

                return updatedData;
            } catch (err) {
                const message = err instanceof Error ? err.message : '派发失败，请重试';
                setError(message);
                addToast({ type: 'error', title: '派发失败', description: message });
                throw err;
            } finally {
                setIsSubmitting(false);
            }
        },
        [nodeId, currentUserId, addToast, onUpdate]
    );

    /**
     * Accept task - corresponds to TaskDispatchSection Line 89-120
     */
    const accept = useCallback(
        async (formData: TaskProps): Promise<TaskProps> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const response = await fetch(
                    `/api/nodes/${nodeId}:feedback?userId=${encodeURIComponent(currentUserId)}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'accept' }),
                    }
                );

                if (!response.ok) {
                    throw new Error(await parseApiError(response, '接受失败'));
                }

                const now = new Date().toISOString();
                const updatedData: TaskProps = {
                    ...formData,
                    assignmentStatus: 'accepted',
                    status: 'todo',
                    feedbackAt: now,
                };

                onUpdate?.(updatedData);
                addToast({
                    type: 'success',
                    title: '接受成功',
                    description: '任务已接受！',
                });

                return updatedData;
            } catch (err) {
                const message = err instanceof Error ? err.message : '接受失败，请重试';
                setError(message);
                addToast({ type: 'error', title: '接受失败', description: message });
                throw err;
            } finally {
                setIsSubmitting(false);
            }
        },
        [nodeId, currentUserId, addToast, onUpdate]
    );

    /**
     * Reject task - corresponds to TaskDispatchSection Line 122-159
     */
    const reject = useCallback(
        async (formData: TaskProps, reason: string): Promise<TaskProps> => {
            if (!reason?.trim()) {
                addToast({
                    type: 'warning',
                    title: '提示',
                    description: '请填写驳回理由',
                });
                throw new Error('Missing reason');
            }

            setIsSubmitting(true);
            setError(null);
            try {
                const response = await fetch(
                    `/api/nodes/${nodeId}:feedback?userId=${encodeURIComponent(currentUserId)}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'reject', reason }),
                    }
                );

                if (!response.ok) {
                    throw new Error(await parseApiError(response, '驳回失败'));
                }

                const now = new Date().toISOString();
                const updatedData: TaskProps = {
                    ...formData,
                    assignmentStatus: 'rejected',
                    rejectionReason: reason,
                    feedbackAt: now,
                };

                onUpdate?.(updatedData);
                addToast({
                    type: 'success',
                    title: '驳回成功',
                    description: '任务已驳回',
                });

                return updatedData;
            } catch (err) {
                const message = err instanceof Error ? err.message : '驳回失败，请重试';
                setError(message);
                addToast({ type: 'error', title: '驳回失败', description: message });
                throw err;
            } finally {
                setIsSubmitting(false);
            }
        },
        [nodeId, currentUserId, addToast, onUpdate]
    );

    return {
        // State
        isSubmitting,
        error,

        // Actions
        dispatch,
        accept,
        reject,

        // Utilities
        clearError,
    };
}

export default useTaskDispatch;
