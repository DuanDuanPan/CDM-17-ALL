'use client';

/**
 * Story 4.1: Approval Driven Workflow
 * Story 7.2: Refactored to use useApproval hook (Hook-First Pattern)
 *
 * ApprovalStatusPanel - Display and manage approval workflow status
 * Features: Stepper visualization, action buttons, deliverables section
 *
 * REFACTORING NOTES (Story 7.2):
 * - Removed 8 direct fetch() calls (Lines 451-609 in original)
 * - Now uses useApproval hook for all API interactions
 * - Component reduced from 794 lines to ~580 lines (-200 lines)
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    Plus,
    Settings,
    Download,
    Eye,
    FileText,
    FileImage,
    FileJson,
} from 'lucide-react';
import { WorkflowConfigDialog } from './WorkflowConfigDialog';
import type {
    ApprovalPipeline,
    ApprovalStep,
    ApprovalStatus,
    Deliverable
} from '@cdm/types';
import { useCurrentUserId } from '@/contexts';
import { useApproval } from '@/hooks/useApproval';

// API base URL (kept for deliverable download/preview only)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Props
interface ApprovalStatusPanelProps {
    nodeId: string;
    nodeLabel: string;
    approval: ApprovalPipeline | null;
    deliverables: Deliverable[];
    isAssignee: boolean;
    /** Callback when deliverables change - receives updated deliverables for Yjs sync */
    onUpdate?: (payload: { approval: ApprovalPipeline | null; deliverables: Deliverable[] }) => void;
}

/**
 * Get status badge color and label
 */
function getStatusBadge(status: ApprovalStatus, hasSteps: boolean): { className: string; label: string; icon: React.ReactNode } {
    switch (status) {
        case 'PENDING':
            return { className: 'bg-yellow-100 text-yellow-700', label: '待审批', icon: <Clock className="h-3 w-3" /> };
        case 'APPROVED':
            return { className: 'bg-green-100 text-green-700', label: '已通过', icon: <Check className="h-3 w-3" /> };
        case 'REJECTED':
            return { className: 'bg-red-100 text-red-700', label: '已驳回', icon: <X className="h-3 w-3" /> };
        default:
            if (hasSteps) {
                return { className: 'bg-blue-100 text-blue-700', label: '待提交', icon: <Send className="h-3 w-3" /> };
            }
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
 * Deliverables Section with file upload, download, and preview
 */
function DeliverablesSection({
    deliverables,
    canEdit,
    onUpload,
    onDelete,
    isUploading,
}: {
    deliverables: Deliverable[];
    canEdit: boolean;
    onUpload: (file: File) => Promise<void>;
    onDelete: (deliverableId: string) => Promise<void>;
    isUploading: boolean;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewFile, setPreviewFile] = useState<Deliverable | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await onUpload(file);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDownload = (deliverable: Deliverable) => {
        window.open(`${API_BASE}/api/files/${deliverable.fileId}`, '_blank');
    };

    const handlePreview = (deliverable: Deliverable) => {
        setPreviewFile(deliverable);
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.toLowerCase().split('.').pop() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
            return <FileImage className="h-4 w-4 text-blue-500" />;
        }
        if (['json'].includes(ext)) {
            return <FileJson className="h-4 w-4 text-yellow-500" />;
        }
        if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
            return <FileText className="h-4 w-4 text-red-500" />;
        }
        return <File className="h-4 w-4 text-gray-400" />;
    };

    const generateMockContent = (deliverable: Deliverable): string => {
        const ext = deliverable.fileName.toLowerCase().split('.').pop() || '';
        if (['json'].includes(ext)) {
            return JSON.stringify({
                fileName: deliverable.fileName,
                uploadedAt: deliverable.uploadedAt,
                mockData: true,
                values: Array.from({ length: 5 }, (_, i) => ({
                    index: i,
                    value: (Math.random() * 100).toFixed(4)
                }))
            }, null, 2);
        }
        if (['csv'].includes(ext)) {
            let csv = 'Time,Value1,Value2\n';
            for (let i = 0; i < 10; i++) {
                csv += `${i * 60},${(50 + Math.sin(i) * 20).toFixed(2)},${(30 + Math.cos(i) * 15).toFixed(2)}\n`;
            }
            return csv;
        }
        return `========================================
    ${deliverable.fileName}
========================================

上传时间: ${new Date(deliverable.uploadedAt).toLocaleString()}

此为模拟预览内容，实际内容将由后端服务提供。

----------------------------------------
注: Mock 预览
----------------------------------------`;
    };

    const PreviewModal = () => {
        if (!previewFile || !mounted) return null;

        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewFile.fileName);
        const isJson = /\.json$/i.test(previewFile.fileName);
        const isPdf = /\.pdf$/i.test(previewFile.fileName);

        const modalContent = (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                {getFileIcon(previewFile.fileName)}
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">{previewFile.fileName}</h3>
                                <p className="text-xs text-gray-500">
                                    上传于 {new Date(previewFile.uploadedAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleDownload(previewFile)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                下载
                            </button>
                            <button
                                onClick={() => setPreviewFile(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-gray-50 p-4">
                        {isImage ? (
                            <div className="flex items-center justify-center min-h-[200px]">
                                <div className="bg-white rounded-lg shadow-md p-4">
                                    <div className="w-64 h-48 bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                                        <div className="text-center">
                                            <FileImage className="w-12 h-12 text-blue-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">{previewFile.fileName}</p>
                                            <p className="text-xs text-gray-400 mt-1">[Mock 图片预览]</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : isPdf ? (
                            <div className="flex items-center justify-center min-h-[200px]">
                                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                                    <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                    <p className="text-lg font-medium text-gray-700 mb-2">{previewFile.fileName}</p>
                                    <p className="text-sm text-gray-500 mb-4">PDF 文件预览</p>
                                    <button
                                        onClick={() => handleDownload(previewFile)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mx-auto"
                                    >
                                        <Download className="w-4 h-4" />
                                        下载查看
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <pre className={`p-4 rounded-lg text-sm overflow-auto max-h-[50vh] ${isJson
                                ? 'bg-gray-900 text-green-400 font-mono'
                                : 'bg-white text-gray-700 font-mono border border-gray-200'
                                }`}>
                                {generateMockContent(previewFile)}
                            </pre>
                        )}
                    </div>

                    <div className="px-5 py-3 border-t bg-gray-50/80 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                            ⓘ 此为模拟预览，实际内容将由后端服务提供
                        </p>
                        <button
                            onClick={() => setPreviewFile(null)}
                            className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        );

        return createPortal(modalContent, document.body);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <FileCheck className="h-4 w-4" />
                    交付物
                </h4>
                {canEdit && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar,.json"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isUploading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Upload className="h-3 w-3" />
                            )}
                            上传
                        </button>
                    </>
                )}
            </div>
            {deliverables.length === 0 ? (
                <p className="text-sm text-gray-400 italic">暂无交付物</p>
            ) : (
                <div className="space-y-1">
                    {deliverables.map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded group hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                {getFileIcon(d.fileName)}
                                <span className="text-sm truncate flex-1">{d.fileName}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={() => handlePreview(d)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="预览"
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownload(d)}
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="下载"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </button>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete(d.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <PreviewModal />
        </div>
    );
}

/**
 * ApprovalStatusPanel - Main component
 * Story 7.2: Refactored to use useApproval hook
 */
export function ApprovalStatusPanel({
    nodeId,
    nodeLabel: _nodeLabel,
    approval: initialApproval,
    deliverables: initialDeliverables,
    isAssignee,
    onUpdate,
}: ApprovalStatusPanelProps) {
    const currentUserId = useCurrentUserId();
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [showConfigDialog, setShowConfigDialog] = useState(false);

    // Story 7.2: Use useApproval hook instead of direct fetch calls
    const {
        approval,
        deliverables,
        isLoading,
        isUploading,
        submit,
        approve,
        reject,
        uploadDeliverable,
        deleteDeliverable,
        fetchApproval,
    } = useApproval(nodeId, {
        initialApproval,
        initialDeliverables,
        onUpdate,
    });

    // Handler to refresh data after configuration
    const handleRefreshAfterConfig = async () => {
        const snapshot = await fetchApproval();
        onUpdate?.({
            approval: snapshot?.approval ?? approval ?? null,
            deliverables: snapshot?.deliverables ?? deliverables,
        });
    };

    // Determine user role
    const currentStep = approval?.steps?.[approval.currentStepIndex];
    const isApprover = currentStep?.assigneeId === currentUserId;
    const canSubmit = isAssignee && approval?.status !== 'PENDING' && approval?.status !== 'APPROVED' && deliverables.length > 0;
    const canApprove = isApprover && approval?.status === 'PENDING';
    const canReject = isApprover && approval?.status === 'PENDING';

    // Action handlers using hook methods
    const handleSubmit = async () => {
        try {
            await submit();
        } catch {
            // Error already handled in hook
        }
    };

    const handleApprove = async () => {
        try {
            await approve();
        } catch {
            // Error already handled in hook
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        try {
            await reject(rejectReason);
            setShowRejectForm(false);
            setRejectReason('');
        } catch {
            // Error already handled in hook
        }
    };

    const hasSteps = (approval?.steps?.length ?? 0) > 0;
    const statusBadge = getStatusBadge(approval?.status || 'NONE', hasSteps);

    // Not configured state
    if (!approval || approval.steps.length === 0) {
        return (
            <>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-medium flex items-center gap-2 text-gray-700">
                            <ShieldCheck className="h-4 w-4" />
                            审批流程
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowConfigDialog(true)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                            <Plus className="h-3 w-3" />
                            配置流程
                        </button>
                    </div>
                    <div className="p-4 text-center">
                        <Settings className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400 mb-3">
                            此任务未配置审批流程
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowConfigDialog(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            配置审批流程
                        </button>
                    </div>
                </div>

                {showConfigDialog && (
                    <WorkflowConfigDialog
                        nodeId={nodeId}
                        onClose={() => setShowConfigDialog(false)}
                        onConfigured={handleRefreshAfterConfig}
                    />
                )}
            </>
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
                    onUpload={uploadDeliverable}
                    onDelete={deleteDeliverable}
                    isUploading={isUploading}
                />

                <hr className="border-gray-100" />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    {canSubmit && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
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
                            disabled={isLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
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
                            disabled={isLoading}
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
                                disabled={!rejectReason.trim() || isLoading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
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
