'use client';

/**
 * Story 2.9: File Preview Modal Component
 * Displays file content in a modal dialog with support for various file types
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, File, FileText, FileImage, FileJson, Loader2, ExternalLink } from 'lucide-react';
import type { AppOutput } from '@cdm/types';

export interface FilePreviewModalProps {
    output: AppOutput | null;
    onClose: () => void;
}

/**
 * Generate mock file content based on output type and name
 */
function generateMockContent(output: AppOutput): string {
    const mimeType = output.mimeType || '';
    const key = output.key.toLowerCase();

    if (mimeType === 'application/json' || key.includes('json') || key.includes('数据')) {
        // Generate mock JSON data
        if (key.includes('星历') || key.includes('ephemeris')) {
            return JSON.stringify({
                satellite: "SAT-2024-001",
                epoch: new Date().toISOString(),
                orbitalElements: {
                    semiMajorAxis: 6878.137,
                    eccentricity: 0.001245,
                    inclination: 97.45,
                    raan: 125.34,
                    argPerigee: 90.0,
                    trueAnomaly: 45.67
                },
                stateVector: {
                    position: { x: 4523.456, y: 2345.678, z: 5123.789 },
                    velocity: { vx: -3.456, vy: 6.123, vz: 2.345 }
                },
                generatedAt: output.generatedAt
            }, null, 2);
        }
        if (key.includes('任务') || key.includes('mission') || key.includes('schedule')) {
            return JSON.stringify({
                missionId: "MISSION-" + Date.now().toString(36).toUpperCase(),
                timeline: [
                    { time: "T+00:00:00", event: "卫星入境", status: "completed" },
                    { time: "T+00:02:30", event: "数据链路建立", status: "completed" },
                    { time: "T+00:05:00", event: "载荷开机", status: "completed" },
                    { time: "T+00:12:00", event: "数据下传开始", status: "in_progress" },
                    { time: "T+00:18:30", event: "数据下传完成", status: "pending" },
                    { time: "T+00:20:00", event: "卫星出境", status: "pending" }
                ],
                groundStation: "北京站",
                coverage: { elevation: 12.5, azimuth: 156.3 }
            }, null, 2);
        }
        if (key.includes('控制') || key.includes('control') || key.includes('响应')) {
            return JSON.stringify({
                controlSystem: "三轴稳定姿态控制",
                actuators: ["反作用轮组", "磁力矩器", "推力器"],
                performance: {
                    pointingAccuracy: "±0.05°",
                    stability: "0.001°/s",
                    slewRate: "1.0°/s"
                },
                margins: {
                    phaseMargin: "45°",
                    gainMargin: "12 dB"
                }
            }, null, 2);
        }
        return JSON.stringify({
            fileName: output.fileName,
            type: output.type,
            generatedAt: output.generatedAt,
            mockData: true,
            values: Array.from({ length: 10 }, (_, i) => ({
                index: i,
                value: (Math.random() * 100).toFixed(4)
            }))
        }, null, 2);
    }

    if (mimeType === 'text/csv' || key.includes('csv') || key.includes('曲线')) {
        // Generate mock CSV data
        let csv = 'Time,Value1,Value2,Value3\n';
        for (let i = 0; i < 20; i++) {
            const t = i * 60;
            csv += `${t},${(50 + Math.sin(i * 0.3) * 20).toFixed(2)},${(30 + Math.cos(i * 0.2) * 15).toFixed(2)},${(Math.random() * 10).toFixed(2)}\n`;
        }
        return csv;
    }

    if (mimeType.startsWith('text/') || key.includes('txt') || key.includes('报告')) {
        return `========================================
    ${output.fileName || output.key}
========================================

生成时间: ${output.generatedAt ? new Date(output.generatedAt).toLocaleString() : '未知'}
文件类型: ${output.mimeType || '未指定'}

----------------------------------------
模拟分析结果
----------------------------------------

1. 系统状态检查
   - 子系统 A: 正常 ✓
   - 子系统 B: 正常 ✓
   - 子系统 C: 正常 ✓

2. 性能指标
   - 指标 1: ${(Math.random() * 100).toFixed(2)} (满足要求)
   - 指标 2: ${(Math.random() * 100).toFixed(2)} (满足要求)
   - 指标 3: ${(Math.random() * 100).toFixed(2)} (满足要求)

3. 结论
   所有指标均满足设计要求，系统运行正常。

----------------------------------------
注: 此为模拟数据，仅供演示使用
----------------------------------------`;
    }

    return `[Mock Content]\nFile: ${output.fileName}\nGenerated: ${output.generatedAt}`;
}

/**
 * Get appropriate icon for file type
 */
function getFileIcon(mimeType?: string) {
    if (!mimeType) return <File className="w-5 h-5" />;
    if (mimeType.startsWith('image/')) return <FileImage className="w-5 h-5" />;
    if (mimeType === 'application/json') return <FileJson className="w-5 h-5" />;
    if (mimeType.startsWith('text/') || mimeType === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
}

export function FilePreviewModal({ output, onClose }: FilePreviewModalProps) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Ensure we're mounted before using portal (for SSR compatibility)
    useEffect(() => {
        setMounted(true);
    }, []);

    // Load mock content when output changes
    useEffect(() => {
        if (!output) {
            setContent(null);
            return;
        }

        setLoading(true);
        setError(null);

        // Simulate async loading
        const timer = setTimeout(() => {
            try {
                const mockContent = generateMockContent(output);
                setContent(mockContent);
            } catch (err) {
                setError('无法加载文件内容');
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [output]);

    // Handle download
    const handleDownload = useCallback(() => {
        if (!output || !content) return;

        const blob = new Blob([content], { type: output.mimeType || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = output.fileName || 'output.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [output, content]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!output || !mounted) return null;

    const isJson = output.mimeType === 'application/json' || output.key.toLowerCase().includes('json');
    const isImage = output.mimeType?.startsWith('image/');
    const isPdf = output.mimeType === 'application/pdf';

    // Use createPortal to render at document.body level
    // This ensures the modal is centered on the entire page, not within parent container
    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            {getFileIcon(output.mimeType)}
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">
                                {output.fileName || output.key}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {output.mimeType || '未知类型'}
                                {output.generatedAt && (
                                    <span className="ml-2">
                                        • 生成于 {new Date(output.generatedAt).toLocaleString()}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            下载
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-gray-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <p className="text-sm text-gray-500">加载中...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <p className="text-red-500 mb-2">{error}</p>
                                <button
                                    onClick={onClose}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    关闭
                                </button>
                            </div>
                        </div>
                    ) : isImage ? (
                        <div className="flex items-center justify-center p-6 min-h-[300px]">
                            <div className="bg-white rounded-lg shadow-md p-4">
                                {/* Mock image placeholder */}
                                <div className="w-80 h-60 bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                                    <div className="text-center">
                                        <FileImage className="w-12 h-12 text-blue-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">{output.fileName}</p>
                                        <p className="text-xs text-gray-400 mt-1">[Mock 图片预览]</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : isPdf ? (
                        <div className="flex items-center justify-center p-6 min-h-[300px]">
                            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                                <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                <p className="text-lg font-medium text-gray-700 mb-2">{output.fileName}</p>
                                <p className="text-sm text-gray-500 mb-4">PDF 文件预览</p>
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        下载 PDF
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Mock: Open in new tab
                                            window.open(`data:application/pdf;base64,`, '_blank');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        新窗口打开
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4">
                            <pre className={`p-4 rounded-lg text-sm overflow-auto max-h-[60vh] ${isJson
                                ? 'bg-gray-900 text-green-400 font-mono'
                                : 'bg-white text-gray-700 font-mono border border-gray-200'
                                }`}>
                                {content}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                        ⓘ 此为模拟预览，实际文件内容将由后端服务提供
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );

    // Render modal at document.body level using portal
    return createPortal(modalContent, document.body);
}
