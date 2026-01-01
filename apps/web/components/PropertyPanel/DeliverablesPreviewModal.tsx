'use client';

import { createPortal } from 'react-dom';
import { Download, File, FileImage, FileJson, FileText, X } from 'lucide-react';
import { Button } from '@cdm/ui';
import type { Deliverable } from '@cdm/types';

/**
 * Get file icon based on file extension.
 */
export function getDeliverableFileIcon(fileName: string) {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        return <FileImage className="h-4 w-4 text-blue-500" />;
    }
    if (ext === 'json') {
        return <FileJson className="h-4 w-4 text-yellow-500" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
        return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <File className="h-4 w-4 text-gray-400" />;
}

/**
 * Generate mock preview content for demonstration.
 */
function generateMockContent(deliverable: Deliverable): string {
    const ext = deliverable.fileName.toLowerCase().split('.').pop() || '';
    if (ext === 'json') {
        return JSON.stringify(
            {
                fileName: deliverable.fileName,
                uploadedAt: deliverable.uploadedAt,
                mockData: true,
                values: Array.from({ length: 5 }, (_, i) => ({
                    index: i,
                    value: (i * 10.1234).toFixed(4),
                })),
            },
            null,
            2,
        );
    }
    if (ext === 'csv') {
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
}

export interface DeliverablesPreviewModalProps {
    file: Deliverable | null;
    mounted: boolean;
    onClose: () => void;
    onDownload: (deliverable: Deliverable) => void;
}

export function DeliverablesPreviewModal({
    file,
    mounted,
    onClose,
    onDownload,
}: DeliverablesPreviewModalProps) {
    if (!file || !mounted) return null;

    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.fileName);
    const isJson = /\.json$/i.test(file.fileName);
    const isPdf = /\.pdf$/i.test(file.fileName);

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            {getDeliverableFileIcon(file.fileName)}
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">{file.fileName}</h3>
                            <p className="text-xs text-gray-500">
                                上传于 {new Date(file.uploadedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onDownload(file)}>
                            <Download className="w-4 h-4" />
                            下载
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 p-4">
                    {isImage ? (
                        <div className="flex items-center justify-center min-h-[200px]">
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <div className="w-64 h-48 bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                                    <div className="text-center">
                                        <FileImage className="w-12 h-12 text-blue-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">{file.fileName}</p>
                                        <p className="text-xs text-gray-400 mt-1">[Mock 图片预览]</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : isPdf ? (
                        <div className="flex items-center justify-center min-h-[200px]">
                            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                                <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                <p className="text-lg font-medium text-gray-700 mb-2">{file.fileName}</p>
                                <p className="text-sm text-gray-500 mb-4">PDF 文件预览</p>
                                <Button onClick={() => onDownload(file)} className="mx-auto">
                                    <Download className="w-4 h-4" />
                                    下载查看
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <pre
                            className={`p-4 rounded-lg text-sm overflow-auto max-h-[50vh] ${isJson
                                ? 'bg-gray-900 text-green-400 font-mono'
                                : 'bg-white text-gray-700 font-mono border border-gray-200'
                                }`}
                        >
                            {generateMockContent(file)}
                        </pre>
                    )}
                </div>

                <div className="px-5 py-3 border-t bg-gray-50/80 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                        ⓘ 此为模拟预览，实际内容将由后端服务提供
                    </p>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        关闭
                    </Button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

