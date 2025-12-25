'use client';

/**
 * Story 4.3+: Comment Attachments
 * AttachmentPreview - Display uploaded/uploading files with preview
 */

import { X, FileText, Image as ImageIcon, File, Archive, Loader2 } from 'lucide-react';
import type { UploadingFile } from '@/hooks/useAttachmentUpload';

interface AttachmentPreviewProps {
    files: UploadingFile[];
    onRemove: (id: string) => void;
    disabled?: boolean;
}

export function AttachmentPreview({ files, onRemove, disabled }: AttachmentPreviewProps) {
    if (files.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            {files.map((file) => (
                <div
                    key={file.id}
                    className="relative group flex flex-col items-center p-2 w-20 bg-white rounded border border-gray-200"
                >
                    {/* Preview / Icon */}
                    <div className="w-12 h-12 flex items-center justify-center mb-1">
                        {file.status === 'uploading' ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                <span className="absolute text-[10px] font-medium text-gray-600">
                                    {file.progress}%
                                </span>
                            </div>
                        ) : file.file.type.startsWith('image/') ? (
                            <img
                                src={URL.createObjectURL(file.file)}
                                alt={file.file.name}
                                className="w-full h-full object-cover rounded"
                            />
                        ) : (
                            <FileIcon mimeType={file.file.type} />
                        )}
                    </div>

                    {/* File name */}
                    <span
                        className="text-[10px] text-gray-600 text-center truncate w-full"
                        title={file.file.name}
                    >
                        {file.file.name}
                    </span>

                    {/* Error indicator */}
                    {file.status === 'error' && (
                        <span className="text-[9px] text-red-500 truncate" title={file.error}>
                            {file.error}
                        </span>
                    )}

                    {/* Remove button */}
                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => onRemove(file.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full 
                                       flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="删除"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

function FileIcon({ mimeType }: { mimeType: string }) {
    const iconClass = "w-8 h-8 text-gray-400";

    if (mimeType.startsWith('image/')) {
        return <ImageIcon className={iconClass} />;
    }
    if (mimeType === 'application/pdf') {
        return <FileText className={`${iconClass} text-red-400`} />;
    }
    if (mimeType.includes('document') || mimeType.includes('word')) {
        return <FileText className={`${iconClass} text-blue-400`} />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return <FileText className={`${iconClass} text-green-400`} />;
    }
    if (mimeType.includes('zip') || mimeType.includes('archive')) {
        return <Archive className={iconClass} />;
    }
    return <File className={iconClass} />;
}
