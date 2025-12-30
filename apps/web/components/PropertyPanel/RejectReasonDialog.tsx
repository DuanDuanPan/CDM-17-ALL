'use client';

/**
 * Story 2.4: Reject Reason Dialog
 * Extracted from TaskForm.tsx for better maintainability
 * Modal dialog for entering task rejection reason
 */

import { useState } from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '@cdm/ui';

export interface RejectReasonDialogProps {
    onConfirm: (reason: string) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export function RejectReasonDialog({ onConfirm, onCancel, isSubmitting }: RejectReasonDialogProps) {
    const [reason, setReason] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
            <div
                className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    驳回任务
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    请说明驳回理由，以便任务所有者了解问题所在。
                </p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="例如：任务描述不清晰，需要更多细节..."
                    className="w-full h-32 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    autoFocus
                />
                <div className="flex gap-3 mt-4">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        取消
                    </Button>
                    <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => onConfirm(reason)}
                        disabled={isSubmitting || !reason.trim()}
                    >
                        {isSubmitting ? '提交中...' : '确认驳回'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
