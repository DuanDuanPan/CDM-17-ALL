'use client';

/**
 * Story 7.2: useApproval Hook
 * Encapsulates all approval-related API interactions
 * Extracted from ApprovalStatusPanel.tsx to enforce Hook-First architecture
 *
 * Features:
 * - Fetch approval status
 * - Submit for approval
 * - Approve/Reject actions
 * - Upload/Delete deliverables
 * - Optimistic updates for better UX
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ApprovalPipeline, Deliverable } from '@cdm/types';
import { useCurrentUserId } from '@/contexts';

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Return type for useApproval hook
 */
export interface UseApprovalReturn {
    // State
    approval: ApprovalPipeline | null;
    deliverables: Deliverable[];
    isLoading: boolean;
    isUploading: boolean;
    error: string | null;

    // Actions (corresponding to ApprovalStatusPanel fetch calls)
    fetchApproval: () => Promise<{ approval: ApprovalPipeline | null; deliverables: Deliverable[] } | null>;
    submit: () => Promise<void>;
    approve: () => Promise<void>;
    reject: (reason: string) => Promise<void>;
    uploadDeliverable: (file: File) => Promise<void>;
    deleteDeliverable: (id: string) => Promise<void>;

    // Utilities
    clearError: () => void;
}

/**
 * Options for useApproval hook
 */
export interface UseApprovalOptions {
    /** Initial approval data (optional, from parent) */
    initialApproval?: ApprovalPipeline | null;
    /** Initial deliverables (optional, from parent) */
    initialDeliverables?: Deliverable[];
    /** Callback when approval/deliverables change - passes payload for Yjs sync */
    onUpdate?: (payload: { approval: ApprovalPipeline | null; deliverables: Deliverable[] }) => void;
}

/**
 * Custom hook for managing approval workflow
 *
 * @param nodeId - The node ID to manage approval for
 * @param options - Optional configuration
 * @returns Approval state and actions
 *
 * @example
 * ```tsx
 * const { approval, deliverables, submit, approve, reject } = useApproval(nodeId);
 *
 * // Submit for approval
 * await submit();
 *
 * // Approve with current user
 * await approve();
 *
 * // Reject with reason
 * await reject('需要修改设计方案');
 * ```
 */
// Empty array constant to avoid creating new reference on each render
const EMPTY_DELIVERABLES: Deliverable[] = [];

function areDeliverablesEqual(a: Deliverable[], b: Deliverable[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const da = a[i];
        const db = b[i];
        if (
            da.id !== db.id ||
            da.fileId !== db.fileId ||
            da.fileName !== db.fileName ||
            da.uploadedAt !== db.uploadedAt
        ) {
            return false;
        }
    }
    return true;
}

export function useApproval(
    nodeId: string,
    options: UseApprovalOptions = {}
): UseApprovalReturn {
    const { initialApproval = null, initialDeliverables = EMPTY_DELIVERABLES, onUpdate } = options;
    const currentUserId = useCurrentUserId();

    // Use ref to track if this is the first mount and avoid re-syncing
    const isFirstMountRef = useRef(true);

    // State - only use initial values on first mount
    const [approval, setApproval] = useState<ApprovalPipeline | null>(() => initialApproval);
    const [deliverables, setDeliverables] = useState<Deliverable[]>(() => initialDeliverables);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync external updates (e.g. Yjs-propagated deliverables) into local hook state.
    // Important: deep-compare to avoid render loops when parent passes new array references (e.g. `?? []`).
    useEffect(() => {
        if (isFirstMountRef.current) {
            isFirstMountRef.current = false;
            return;
        }

        if (!areDeliverablesEqual(initialDeliverables, deliverables)) {
            setDeliverables(initialDeliverables);
        }
    }, [initialDeliverables]);

    // Clear error utility
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Fetch approval status - corresponds to ApprovalStatusPanel Line 451-461
     */
    const fetchApproval = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/approval/${nodeId}`);
            if (response.ok) {
                const data = await response.json();
                const nextApproval = (data.approval ?? null) as ApprovalPipeline | null;
                setApproval(nextApproval);
                // Also update deliverables if included in response
                if (data.deliverables) {
                    setDeliverables(data.deliverables);
                }
                return {
                    approval: nextApproval,
                    deliverables: Array.isArray(data.deliverables) ? data.deliverables : deliverables,
                };
            }
        } catch (err) {
            console.error('Failed to fetch approval status:', err);
            setError('获取审批状态失败');
        }
        return null;
    }, [nodeId, deliverables]);

    /**
     * Submit for approval - corresponds to ApprovalStatusPanel Line 549-565
     */
    const submit = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/approval/${nodeId}/submit`, {
                method: 'POST',
                headers: { 'x-user-id': currentUserId },
            });
            if (response.ok) {
                const data = await response.json();
                const nextApproval = (data.approval ?? null) as ApprovalPipeline | null;
                setApproval(nextApproval);
                onUpdate?.({ approval: nextApproval, deliverables });
            } else {
                throw new Error('提交失败');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '提交失败';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [nodeId, currentUserId, deliverables, onUpdate]);

    /**
     * Approve - corresponds to ApprovalStatusPanel Line 567-583
     */
    const approve = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/approval/${nodeId}/approve`, {
                method: 'POST',
                headers: { 'x-user-id': currentUserId },
            });
            if (response.ok) {
                const data = await response.json();
                const nextApproval = (data.approval ?? null) as ApprovalPipeline | null;
                setApproval(nextApproval);
                onUpdate?.({ approval: nextApproval, deliverables });
            } else {
                throw new Error('审批失败');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '审批失败';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [nodeId, currentUserId, deliverables, onUpdate]);

    /**
     * Reject - corresponds to ApprovalStatusPanel Line 585-609
     */
    const reject = useCallback(
        async (reason: string) => {
            if (!reason.trim()) {
                setError('请填写驳回原因');
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE}/api/approval/${nodeId}/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': currentUserId,
                    },
                    body: JSON.stringify({ reason }),
                });
                if (response.ok) {
                    const data = await response.json();
                    const nextApproval = (data.approval ?? null) as ApprovalPipeline | null;
                    setApproval(nextApproval);
                    onUpdate?.({ approval: nextApproval, deliverables });
                } else {
                    throw new Error('驳回失败');
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : '驳回失败';
                setError(message);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [nodeId, currentUserId, deliverables, onUpdate]
    );

    /**
     * Upload deliverable - corresponds to ApprovalStatusPanel Line 480-521 (2 fetch calls)
     * FIXED: Uses optimistic update to immediately show uploaded file
     */
    const uploadDeliverable = useCallback(
        async (file: File) => {
            setIsUploading(true);
            setError(null);
            try {
                // Step 1: Upload file to file service
                const formData = new FormData();
                formData.append('file', file);

                const uploadResponse = await fetch(`${API_BASE}/api/files/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    throw new Error('文件上传失败');
                }

                const fileMetadata = await uploadResponse.json();

                // Step 2: Associate deliverable with node
                const deliverableData: Deliverable = {
                    id: crypto.randomUUID(),
                    fileId: fileMetadata.id,
                    fileName: file.name,
                    uploadedAt: new Date().toISOString(),
                };

                const deliverableResponse = await fetch(
                    `${API_BASE}/api/approval/${nodeId}/deliverables`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(deliverableData),
                    }
                );

                if (deliverableResponse.ok) {
                    // FIX: Optimistic update - immediately add to local state
                    // The API response may include updated deliverables, use those if available
                    try {
                        const responseData = await deliverableResponse.json();
                        if (responseData.deliverables && Array.isArray(responseData.deliverables)) {
                            setDeliverables(responseData.deliverables);
                            onUpdate?.({ approval, deliverables: responseData.deliverables });
                        } else {
                            // Fallback: add the new deliverable to current state
                            const newDeliverables = [...deliverables, deliverableData];
                            setDeliverables((prev) => [...prev, deliverableData]);
                            onUpdate?.({ approval, deliverables: newDeliverables });
                        }
                    } catch {
                        // JSON parse failed, use optimistic update
                        const newDeliverables = [...deliverables, deliverableData];
                        setDeliverables((prev) => [...prev, deliverableData]);
                        onUpdate?.({ approval, deliverables: newDeliverables });
                    }
                } else {
                    throw new Error('关联交付物失败');
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : '上传失败';
                setError(message);
                throw err;
            } finally {
                setIsUploading(false);
            }
        },
        [nodeId, approval, deliverables, onUpdate]
    );

    /**
     * Delete deliverable - corresponds to ApprovalStatusPanel Line 524-539
     * Uses optimistic update for better UX
     */
    const deleteDeliverable = useCallback(
        async (deliverableId: string) => {
            setError(null);
            // Optimistic update: immediately remove from local state
            const previousDeliverables = deliverables;
            setDeliverables((prev) => prev.filter((d) => d.id !== deliverableId));

            try {
                const response = await fetch(
                    `${API_BASE}/api/approval/${nodeId}/deliverables/${deliverableId}`,
                    {
                        method: 'DELETE',
                    }
                );

                if (!response.ok) {
                    // Rollback on failure
                    setDeliverables(previousDeliverables);
                    throw new Error('删除失败');
                }

                // Pass updated deliverables (after filter) for Yjs sync
                const updatedDeliverables = deliverables.filter((d) => d.id !== deliverableId);
                onUpdate?.({ approval, deliverables: updatedDeliverables });
            } catch (err) {
                // Rollback already done above
                const message = err instanceof Error ? err.message : '删除失败';
                setError(message);
                throw err;
            }
        },
        [nodeId, approval, deliverables, onUpdate]
    );

    // Fetch on mount and when nodeId changes - use nodeId directly to avoid infinite loop
    useEffect(() => {
        let cancelled = false;

        const doFetch = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/approval/${nodeId}`);
                if (response.ok && !cancelled) {
                    const data = await response.json();
                    setApproval(data.approval);
                    if (data.deliverables) {
                        setDeliverables(data.deliverables);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Failed to fetch approval status:', err);
                    setError('获取审批状态失败');
                }
            }
        };

        doFetch();

        return () => {
            cancelled = true;
        };
    }, [nodeId]);

    return {
        // State
        approval,
        deliverables,
        isLoading,
        isUploading,
        error,

        // Actions
        fetchApproval,
        submit,
        approve,
        reject,
        uploadDeliverable,
        deleteDeliverable,

        // Utilities
        clearError,
    };
}

export default useApproval;
