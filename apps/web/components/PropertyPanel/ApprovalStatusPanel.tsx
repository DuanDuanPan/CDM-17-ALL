'use client';

/**
 * Story 4.1: Approval Driven Workflow
 * ApprovalStatusPanel - Display and manage approval workflow status
 * Features: Stepper visualization, action buttons, deliverables section
 */

import { useState, useCallback } from 'react';
import {
    ShieldCheck,
    Check,
    X,
    Clock,
    FileCheck,
    FileX,
    Send,
    Upload,
    File,
    Trash2,
    Loader2,
} from 'lucide-react';
import type {
    ApprovalPipeline,
    ApprovalStep,
    ApprovalStatus,
    Deliverable
} from '@cdm/types';

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Props
interface ApprovalStatusPanelProps {
    nodeId: string;
    nodeLabel: string;
    approval: ApprovalPipeline | null;
    deliverables: Deliverable[];
    currentUserId: string;
    isAssignee: boolean;
    onUpdate?: () => void;
}

/**
 * Get status badge color and label
 */
function getStatusBadge(status: ApprovalStatus): { className: string; label: string; icon: React.ReactNode } {
    switch (status) {
        case 'PENDING':
            return { className: 'bg-yellow-100 text-yellow-700', label: '待审批', icon: <Clock className="h-3 w-3" /> };
        case 'APPROVED':
            return { className: 'bg-green-100 text-green-700', label: '已通过', icon: <Check className="h-3 w-3" /> };
        case 'REJECTED':
            return { className: 'bg-red-100 text-red-700', label: '已驳回', icon: <X className="h-3 w-3" /> };
        default:
            return { className: 'bg-gray-100 text-gray-600', label: '未配置', icon: <ShieldCheck className="h-3 w-3" /> };
    }
}

/**
 * Step Status Icon
 */
function StepIcon({ step, isActive }: { step: ApprovalStep; isActive: boolean }) {
    if (step.status === 'approved') {
        return (
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
            </div>
        );
    }
    if (step.status === 'rejected') {
        return (
            <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
                <X className="h-4 w-4 text-white" />
            </div>
        );
    }
    if (step.status === 'pending' || isActive) {
        return (
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                <Clock className="h-4 w-4 text-white" />
            </div>
        );
    }
    return (
        <div className="h-8 w-8 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-400">{step.index + 1}</span>
        </div>
    );
}

/**
 * Approval Stepper - Vertical progress tracker
 */
function ApprovalStepper({ steps, currentStepIndex }: { steps: ApprovalStep[]; currentStepIndex: number }) {
    return (
        <div className="space-y-4">
            {steps.map((step, index) => (
                <div key={step.index} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                        <StepIcon step={step} isActive={index === currentStepIndex} />
                        {index < steps.length - 1 && (
                            <div className={`w-0.5 h-8 mt-1 ${step.status === 'approved' ? 'bg-green-500' : 'bg-gray-200'}`} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${step.status === 'approved' ? 'text-green-600' :
                                step.status === 'rejected' ? 'text-red-600' :
                                    step.status === 'pending' ? 'text-blue-600' : 'text-gray-700'
                            }`}>
                            {step.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium">
                                {step.assigneeId.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-500 truncate">
                                {step.assigneeId}
                            </span>
                        </div>
                        {step.completedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(step.completedAt).toLocaleString()}
                            </p>
                        )}
                        {step.reason && (
                            <p className="text-xs text-red-500 mt-1 italic">
                                驳回原因: {step.reason}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Deliverables Section
 */
function DeliverablesSection({
    deliverables,
    canEdit,
}: {
    deliverables: Deliverable[];
    canEdit: boolean;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <FileCheck className="h-4 w-4" />
                    交付物
                </h4>
                {canEdit && (
                    <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-50 rounded cursor-not-allowed"
                    >
                        <Upload className="h-3 w-3" />
                        上传
                    </button>
                )}
            </div>
            {deliverables.length === 0 ? (
                <p className="text-sm text-gray-400 italic">暂无交付物</p>
            ) : (
                <div className="space-y-1">
                    {deliverables.map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2 min-w-0">
                                <File className="h-4 w-4 text-gray-400" />
                                <span className="text-sm truncate">{d.fileName}</span>
                            </div>
                            {canEdit && (
                                <button
                                    type="button"
                                    disabled
                                    className="p-1 text-gray-300 cursor-not-allowed"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * ApprovalStatusPanel - Main component
 */
export function ApprovalStatusPanel({
    nodeId,
    nodeLabel,
    approval,
    deliverables,
    currentUserId,
    isAssignee,
    onUpdate,
}: ApprovalStatusPanelProps) {
    const [loading, setLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    // Determine user role
    const currentStep = approval?.steps?.[approval.currentStepIndex];
    const isApprover = currentStep?.assigneeId === currentUserId;
    const canSubmit = isAssignee && approval?.status !== 'PENDING' && approval?.status !== 'APPROVED' && deliverables.length > 0;
    const canApprove = isApprover && approval?.status === 'PENDING';
    const canReject = isApprover && approval?.status === 'PENDING';

    // API calls
    const handleSubmit = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/approval/${nodeId}/submit`, {
                method: 'POST',
                headers: { 'x-user-id': currentUserId },
            });
            if (response.ok) {
                onUpdate?.();
            }
        } catch (error) {
            console.error('Submit failed:', error);
        } finally {
            setLoading(false);
        }
    }, [nodeId, currentUserId, onUpdate]);

    const handleApprove = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/approval/${nodeId}/approve`, {
                method: 'POST',
                headers: { 'x-user-id': currentUserId },
            });
            if (response.ok) {
                onUpdate?.();
            }
        } catch (error) {
            console.error('Approve failed:', error);
        } finally {
            setLoading(false);
        }
    }, [nodeId, currentUserId, onUpdate]);

    const handleReject = useCallback(async () => {
        if (!rejectReason.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/approval/${nodeId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUserId,
                },
                body: JSON.stringify({ reason: rejectReason }),
            });
            if (response.ok) {
                setShowRejectForm(false);
                setRejectReason('');
                onUpdate?.();
            }
        } catch (error) {
            console.error('Reject failed:', error);
        } finally {
            setLoading(false);
        }
    }, [nodeId, currentUserId, rejectReason, onUpdate]);

    const statusBadge = getStatusBadge(approval?.status || 'NONE');

    // Not configured state
    if (!approval || approval.steps.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-gray-700">
                        <ShieldCheck className="h-4 w-4" />
                        审批流程
                    </h3>
                </div>
                <div className="p-4">
                    <p className="text-sm text-gray-400">
                        此任务未配置审批流程
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <ShieldCheck className="h-4 w-4" />
                    审批流程
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}>
                    {statusBadge.icon}
                    {statusBadge.label}
                </span>
            </div>

            <div className="p-4 space-y-4">
                {/* Stepper */}
                <ApprovalStepper
                    steps={approval.steps}
                    currentStepIndex={approval.currentStepIndex}
                />

                <hr className="border-gray-100" />

                {/* Deliverables */}
                <DeliverablesSection
                    deliverables={deliverables}
                    canEdit={isAssignee && approval.status !== 'APPROVED'}
                />

                <hr className="border-gray-100" />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    {canSubmit && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            提交审批
                        </button>
                    )}

                    {canApprove && (
                        <button
                            type="button"
                            onClick={handleApprove}
                            disabled={loading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileCheck className="h-4 w-4" />
                            )}
                            通过
                        </button>
                    )}

                    {canReject && !showRejectForm && (
                        <button
                            type="button"
                            onClick={() => setShowRejectForm(true)}
                            disabled={loading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FileX className="h-4 w-4" />
                            驳回
                        </button>
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
                            <button
                                type="button"
                                onClick={() => setShowRejectForm(false)}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || loading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                                确认驳回
                            </button>
                        </div>
                    </div>
                )}

                {/* Status message */}
                {approval.status === 'APPROVED' && (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        审批已通过
                    </p>
                )}
                {approval.status === 'REJECTED' && (
                    <p className="text-sm text-red-600 flex items-center gap-2">
                        <X className="h-4 w-4" />
                        审批已驳回
                    </p>
                )}
            </div>
        </div>
    );
}

export default ApprovalStatusPanel;
