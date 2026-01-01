'use client';

/**
 * Story 7.9: DeliverablesSection Component
 *
 * Extracted from ApprovalStatusPanel.tsx (lines 163-431)
 * Manages file upload, preview, download, and deletion for deliverables.
 *
 * This is a presentational component that receives data and callbacks via props.
 * No direct API calls - follows Hook-First pattern.
 */

import { useState, useRef, useEffect } from 'react';
import {
    FileCheck,
    Trash2,
    Loader2,
    Upload,
    Download,
    Eye,
} from 'lucide-react';
import { Button } from '@cdm/ui';
import type { Deliverable } from '@cdm/types';
import { DeliverablesPreviewModal, getDeliverableFileIcon } from './DeliverablesPreviewModal';

// API base URL (for deliverable download/preview only)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Props for DeliverablesSection
export interface DeliverablesSectionProps {
    deliverables: Deliverable[];
    canEdit: boolean;
    onUpload: (file: File) => Promise<void>;
    onDelete: (deliverableId: string) => Promise<void>;
    isUploading: boolean;
}

/**
 * DeliverablesSection - File management UI for approval workflow
 *
 * Features:
 * - Upload with loading state
 * - List display
 * - Preview (mock)
 * - Download
 * - Delete (when editing is allowed)
 */
export function DeliverablesSection({
    deliverables,
    canEdit,
    onUpload,
    onDelete,
    isUploading,
}: DeliverablesSectionProps) {
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
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                            {isUploading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Upload className="h-3 w-3" />
                            )}
                            上传
                        </Button>
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
                                {getDeliverableFileIcon(d.fileName)}
                                <span className="text-sm truncate flex-1">{d.fileName}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handlePreview(d)}
                                    title="预览"
                                    className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownload(d)}
                                    title="下载"
                                    className="h-7 w-7 text-gray-400 hover:text-green-600 hover:bg-green-50"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                                {canEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(d.id)}
                                        title="删除"
                                        className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <DeliverablesPreviewModal
                file={previewFile}
                mounted={mounted}
                onClose={() => setPreviewFile(null)}
                onDownload={handleDownload}
            />
        </div>
    );
}

export default DeliverablesSection;
