'use client';

/**
 * Story 7.9: ApprovalActions Component
 *
 * Extracted from ApprovalStatusPanel.tsx (lines 592-665)
 * Handles approval action buttons and reject form UI.
 *
 * This is a presentational component - all logic is received via props/callbacks.
 * No API calls are made here - follows Hook-First pattern.
 */

import { useState } from 'react';
import {
    Send,
    FileCheck,
    FileX,
    Loader2,
} from 'lucide-react';
import { Button } from '@cdm/ui';

// Props for ApprovalActions
export interface ApprovalActionsProps {
    canSubmit: boolean;
    canApprove: boolean;
    canReject: boolean;
    isLoading: boolean;
    onSubmit: () => Promise<void>;
    onApprove: () => Promise<void>;
    onReject: (reason: string) => Promise<void>;
}

/**
 * ApprovalActions - Action buttons for approval workflow
 *
 * Features:
 * - Submit for approval button
 * - Approve button
 * - Reject button with reason form
 *
 * @param canSubmit - Whether the submit button should be shown
 * @param canApprove - Whether the approve button should be shown
 * @param canReject - Whether the reject button should be shown
 * @param isLoading - Whether any action is in progress
 * @param onSubmit - Callback for submit action
 * @param onApprove - Callback for approve action
 * @param onReject - Callback for reject action (receives reason)
 */
export function ApprovalActions({
    canSubmit,
    canApprove,
    canReject,
    isLoading,
    onSubmit,
    onApprove,
    onReject,
}: ApprovalActionsProps) {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        try {
            await onReject(rejectReason);
            setShowRejectForm(false);
            setRejectReason('');
        } catch {
            // Error handling is done in parent component
        }
    };

    return (
        <>
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
                {canSubmit && (
                    <Button
                        className="flex-1"
                        onClick={onSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        提交审批
                    </Button>
                )}

                {canApprove && (
                    <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={onApprove}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileCheck className="h-4 w-4" />
                        )}
                        通过
                    </Button>
                )}

                {canReject && !showRejectForm && (
                    <Button
                        variant="outline"
                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => setShowRejectForm(true)}
                        disabled={isLoading}
                    >
                        <FileX className="h-4 w-4" />
                        驳回
                    </Button>
                )}
            </div>

            {/* Reject Form */}
            {showRejectForm && (
                <div className="p-3 bg-red-50 rounded-md space-y-3">
                    <h4 className="text-sm font-medium text-red-700">驳回原因</h4>
                    <textarea
                        placeholder="请输入驳回原因..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full min-h-[80px] text-sm border border-red-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRejectForm(false)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleReject}
                            disabled={!rejectReason.trim() || isLoading}
                        >
                            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                            确认驳回
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

export default ApprovalActions;
