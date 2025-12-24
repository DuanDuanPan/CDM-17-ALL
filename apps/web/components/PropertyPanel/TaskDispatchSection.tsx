'use client';

/**
 * Story 2.4: Task Dispatch Section
 * Extracted from TaskForm.tsx for better maintainability
 * Handles task dispatch, accept, and reject workflows
 */

import { useState } from 'react';
import { Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { TaskProps } from '@cdm/types';
import { useToast } from '@cdm/ui';
import { RejectReasonDialog } from './RejectReasonDialog';
import { useCurrentUserId } from '../../contexts'; // Story 4.1: FIX-9

// Story 4.1: FIX-9 - currentUserId removed, now uses context
export interface TaskDispatchSectionProps {
    nodeId: string;
    formData: TaskProps;
    isSubmitting: boolean;
    setIsSubmitting: (value: boolean) => void;
    onFormDataChange: (data: TaskProps) => void;
    onUpdate?: (data: TaskProps) => void;
}

/**
 * Safely parse error response from API
 */
async function parseApiError(response: Response, defaultMessage: string): Promise<string> {
    const errorText = await response.text();
    try {
        const errorJson = JSON.parse(errorText);
        return errorJson.message || errorJson.error || defaultMessage;
    } catch {
        return errorText || defaultMessage;
    }
}

// Story 4.1: FIX-9 - Use context for currentUserId
export function TaskDispatchSection({
    nodeId,
    formData,
    isSubmitting,
    setIsSubmitting,
    onFormDataChange,
    onUpdate,
}: TaskDispatchSectionProps) {
    const currentUserId = useCurrentUserId();
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const { addToast } = useToast();

    // Task dispatch handler
    const handleDispatch = async () => {
        if (!formData.assigneeId) {
            addToast({ type: 'warning', title: '缺少信息', description: '请先指定执行人' });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/nodes/${nodeId}:dispatch?userId=${encodeURIComponent(currentUserId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

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
            onFormDataChange(updatedData);
            onUpdate?.(updatedData);

            addToast({ type: 'success', title: '派发成功', description: '任务已成功派发！' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '派发失败，请重试';
            addToast({ type: 'error', title: '派发失败', description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Task accept handler
    const handleAccept = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/nodes/${nodeId}:feedback?userId=${encodeURIComponent(currentUserId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept' }),
            });

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
            onFormDataChange(updatedData);
            onUpdate?.(updatedData);

            addToast({ type: 'success', title: '接受成功', description: '任务已接受！' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '接受失败，请重试';
            addToast({ type: 'error', title: '接受失败', description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Task reject handler
    const handleReject = async (reason: string) => {
        if (!reason?.trim()) {
            addToast({ type: 'warning', title: '提示', description: '请填写驳回理由' });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/nodes/${nodeId}:feedback?userId=${encodeURIComponent(currentUserId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', reason }),
            });

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
            onFormDataChange(updatedData);
            onUpdate?.(updatedData);

            setShowRejectDialog(false);
            addToast({ type: 'success', title: '驳回成功', description: '任务已驳回' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '驳回失败，请重试';
            addToast({ type: 'error', title: '驳回失败', description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isOwnerOrCanDispatch = currentUserId === formData.ownerId ||
        (!formData.ownerId && (formData.assignmentStatus === 'idle' || formData.assignmentStatus === 'rejected'));

    const isAssigneeAndDispatched = currentUserId === formData.assigneeId && formData.assignmentStatus === 'dispatched';

    return (
        <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4" />
                任务派发
            </h3>

            {/* Assignment Status Badge */}
            <div className="mb-3 p-3 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">派发状态</span>
                    <span
                        className={`px-2 py-1 rounded text-xs font-medium ${formData.assignmentStatus === 'accepted'
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : formData.assignmentStatus === 'dispatched'
                                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                    : formData.assignmentStatus === 'rejected'
                                        ? 'bg-red-100 text-red-700 border border-red-300'
                                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                            }`}
                    >
                        {formData.assignmentStatus === 'accepted' && '✓ 已接受'}
                        {formData.assignmentStatus === 'dispatched' && '⏳ 待确认'}
                        {formData.assignmentStatus === 'rejected' && '✗ 已驳回'}
                        {formData.assignmentStatus === 'idle' && '待派发'}
                    </span>
                </div>
            </div>

            {/* Rejection Reason Display */}
            {formData.assignmentStatus === 'rejected' && formData.rejectionReason && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-xs font-medium text-red-800 mb-1">驳回理由</p>
                            <p className="text-xs text-red-700">{formData.rejectionReason}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons - Owner View */}
            {isOwnerOrCanDispatch && (
                <div className="space-y-2">
                    {(formData.assignmentStatus === 'idle' || formData.assignmentStatus === 'rejected') && (
                        <button
                            type="button"
                            onClick={handleDispatch}
                            disabled={isSubmitting || !formData.assigneeId}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                            <Send className="w-4 h-4" />
                            {isSubmitting ? '派发中...' : '派发任务'}
                        </button>
                    )}
                    {formData.assignmentStatus === 'dispatched' && (
                        <div className="text-xs text-gray-500 text-center py-2">
                            等待执行人确认...
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons - Assignee View */}
            {isAssigneeAndDispatched && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleAccept}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                        <CheckCircle className="w-4 h-4" />
                        {isSubmitting ? '接受中...' : '接受'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowRejectDialog(true)}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                        <XCircle className="w-4 h-4" />
                        驳回
                    </button>
                </div>
            )}

            {/* Timestamp Info */}
            {formData.dispatchedAt && (
                <div className="mt-3 text-xs text-gray-500">
                    派发时间: {new Date(formData.dispatchedAt).toLocaleString('zh-CN')}
                </div>
            )}
            {formData.feedbackAt && (
                <div className="text-xs text-gray-500">
                    反馈时间: {new Date(formData.feedbackAt).toLocaleString('zh-CN')}
                </div>
            )}

            {/* Reject Reason Dialog */}
            {showRejectDialog && (
                <RejectReasonDialog
                    onConfirm={handleReject}
                    onCancel={() => setShowRejectDialog(false)}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}
