'use client';

/**
 * Story 4.3+: Comment Attachments
 * AttachmentViewer - Lightbox for viewing images
 */

import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useCallback, useState } from 'react';
import type { CommentAttachment } from '@cdm/types';

interface AttachmentViewerProps {
    attachments: CommentAttachment[];
    initialIndex: number;
    onClose: () => void;
}

export function AttachmentViewer({ attachments, initialIndex, onClose }: AttachmentViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const current = attachments[currentIndex];

    const goNext = useCallback(() => {
        if (currentIndex < attachments.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    }, [currentIndex, attachments.length]);

    const goPrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }, [currentIndex]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, goNext, goPrev]);

    // Download current file
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = current.url;
        link.download = current.fileName;
        link.click();
    };

    if (!current) return null;

    const isImage = current.mimeType.startsWith('image/');

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                <span className="text-white font-medium truncate max-w-[50%]">
                    {current.fileName}
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownload}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        title="下载"
                    >
                        <Download className="w-5 h-5 text-white" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        title="关闭"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[90vw] max-h-[80vh] flex items-center justify-center">
                {isImage ? (
                    <img
                        src={current.url}
                        alt={current.fileName}
                        className="max-w-full max-h-[80vh] object-contain"
                    />
                ) : (
                    <div className="text-white text-center p-8">
                        <p className="text-lg mb-4">此文件类型不支持预览</p>
                        <button
                            onClick={handleDownload}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                        >
                            下载文件
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation */}
            {attachments.length > 1 && (
                <>
                    {currentIndex > 0 && (
                        <button
                            onClick={goPrev}
                            className="absolute left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                    )}
                    {currentIndex < attachments.length - 1 && (
                        <button
                            onClick={goNext}
                            className="absolute right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <ChevronRight className="w-6 h-6 text-white" />
                        </button>
                    )}
                    <div className="absolute bottom-4 text-white text-sm">
                        {currentIndex + 1} / {attachments.length}
                    </div>
                </>
            )}
        </div>
    );
}
