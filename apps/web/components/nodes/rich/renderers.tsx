'use client';

import type { ReactNode } from 'react';
import { NodeType, MindNodeData, TaskProps, RequirementProps, AppProps, DataProps } from '@cdm/types';
import { Box, CheckCircle, FileText, Database } from 'lucide-react';

/**
 * NodeRenderer - Strategy pattern interface for node-specific rendering
 */
export interface NodeRenderer {
    /** Get header color based on node state */
    getHeaderColor(status?: string): string;
    /** Get header pattern (solid or striped) */
    getHeaderPattern(status?: string): 'solid' | 'striped';
    /** Render metrics row content */
    renderMetrics(data: MindNodeData): ReactNode | null;
    /** Get icon for title row */
    getIcon(): ReactNode;
}

/**
 * PBSRenderer - Product Breakdown Structure node
 */
class PBSRenderer implements NodeRenderer {
    getHeaderColor(): string {
        return '#1E3A8A'; // Deep Blue
    }

    getHeaderPattern(): 'solid' | 'striped' {
        return 'solid';
    }

    renderMetrics(_data: MindNodeData): ReactNode {
        // Mock aggregated stats from child nodes
        const taskCount = 5;
        const riskCount = 2;
        const progress = 0.6;

        return (
            <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-0.5 whitespace-nowrap">
                    <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="text-[11px]">{taskCount}任务</span>
                </div>
                <div className="flex items-center gap-0.5 whitespace-nowrap">
                    <span className="text-amber-500 text-sm flex-shrink-0">⚠</span>
                    <span className="text-[11px]">{riskCount}风险</span>
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap">
                    <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full bg-blue-500" style={{ width: `${progress * 100}%` }} />
                    </div>
                    <span className="text-[10px]">{Math.round(progress * 100)}%</span>
                </div>
            </div>
        );
    }

    getIcon(): ReactNode {
        return <Box className="w-5 h-5 text-sky-500" />;
    }
}

/**
 * TaskRenderer - Task node
 */
class TaskRenderer implements NodeRenderer {
    getHeaderColor(status?: string): string {
        // Approval status takes precedence
        if (status === 'APPROVED') return '#10B981'; // Emerald
        if (status === 'PENDING') return '#F59E0B'; // Amber/Orange
        if (status === 'REJECTED') return '#F43F5E'; // Rose/Red

        // Default task color
        return '#64748B'; // Slate
    }

    getHeaderPattern(status?: string): 'solid' | 'striped' {
        return status === 'PENDING' ? 'striped' : 'solid';
    }

    renderMetrics(data: MindNodeData): ReactNode | null {
        const props = (data.props as TaskProps) || {};
        const startDate = props.startDate;
        const dueDate = props.dueDate;
        const progress = props.progress ?? 0;

        const hasDateInfo = startDate || dueDate;

        if (!hasDateInfo && progress === 0) {
            return null;
        }

        return (
            <div className="flex items-center gap-1.5 text-xs">
                {/* Date Range */}
                {hasDateInfo && (
                    <span className="text-gray-600 text-[10px] whitespace-nowrap flex-shrink-0">
                        {startDate && new Date(startDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                        {startDate && dueDate && '-'}
                        {dueDate && new Date(dueDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                    </span>
                )}

                {/* Progress Bar */}
                {progress > 0 && (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">{Math.round(progress * 100)}%</span>
                    </div>
                )}
            </div>
        );
    }

    getIcon(): ReactNode {
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
}

/**
 * RequirementRenderer - Requirement node
 */
class RequirementRenderer implements NodeRenderer {
    getHeaderColor(): string {
        return '#7C3AED'; // Purple
    }

    getHeaderPattern(): 'solid' | 'striped' {
        return 'solid';
    }

    renderMetrics(data: MindNodeData): ReactNode | null {
        const props = (data.props as RequirementProps) || {};
        const priority = props.priority || 'must';
        const reqType = props.reqType || 'functional';

        // Mock criteria count (can be extended when acceptanceCriteria is structured)
        const criteriaCount = 3;

        return (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600 whitespace-nowrap">
                <span className="flex-shrink-0">{reqType === 'functional' ? '功能' : reqType === 'non-functional' ? '非功能' : reqType}</span>
                <span className="text-gray-400">•</span>
                <span className={`flex-shrink-0 ${priority === 'must' ? 'text-rose-600 font-semibold' :
                        priority === 'should' ? 'text-amber-600' :
                            'text-gray-500'
                    }`}>
                    {priority === 'must' ? '必须' : priority === 'should' ? '应有' : priority === 'could' ? '可选' : priority}
                </span>
                <span className="text-gray-400">•</span>
                <span className="flex-shrink-0">{criteriaCount}条</span>
            </div>
        );
    }
    getIcon(): ReactNode {
        return <FileText className="w-5 h-5 text-violet-500" />;
    }
}

/**
 * AppRenderer - Application node
 */
class AppRenderer implements NodeRenderer {
    getHeaderColor(): string {
        return '#111827'; // Dark gray (almost black)
    }

    getHeaderPattern(): 'solid' | 'striped' {
        return 'solid';
    }

    renderMetrics(data: MindNodeData): ReactNode | null {
        const props = (data.props as AppProps) || {};
        const sourceType = props.appSourceType || 'local';
        const lastRun = props.lastExecutedAt;
        const inputCount = props.inputs?.length || 0;
        const outputCount = props.outputs?.length || 0;

        return (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600 whitespace-nowrap">
                <span className="flex-shrink-0">{sourceType === 'local' ? '本地' : sourceType === 'library' ? '应用库' : sourceType}</span>
                {lastRun && (
                    <>
                        <span className="text-gray-400">•</span>
                        <span className="flex-shrink-0">{getRelativeTime(lastRun)}</span>
                    </>
                )}
                <span className="text-gray-400">•</span>
                <span className="flex-shrink-0">{inputCount}入/{outputCount}出</span>
            </div>
        );
    }
    getIcon(): ReactNode {
        return (
            <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
        );
    }
}

/**
 * DataRenderer - Data asset node
 */
class DataRenderer implements NodeRenderer {
    getHeaderColor(): string {
        return '#0D9488'; // Teal
    }

    getHeaderPattern(): 'solid' | 'striped' {
        return 'solid';
    }

    renderMetrics(data: MindNodeData): ReactNode | null {
        const props = (data.props as DataProps) || {};
        const dataType = props.dataType || 'document';
        const version = props.version;
        const secretLevel = props.secretLevel || 'public';

        // Mock file size (could be computed from storagePath metadata)
        const fileSize = '2.4 MB';

        return (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600 whitespace-nowrap">
                <span className="flex-shrink-0">{dataType === 'document' ? '文档' : dataType === 'model' ? '模型' : dataType === 'drawing' ? '图纸' : dataType}</span>
                <span className="text-gray-400">•</span>
                <span className="flex-shrink-0">{fileSize}</span>
                {version && (
                    <>
                        <span className="text-gray-400">•</span>
                        <span className="flex-shrink-0">{version}</span>
                    </>
                )}
                <span className="text-gray-400">•</span>
                <span className={`flex-shrink-0 ${secretLevel === 'secret' ? 'text-rose-600' :
                        secretLevel === 'internal' ? 'text-amber-600' :
                            'text-gray-500'
                    }`}>
                    {secretLevel === 'secret' ? '机密' : secretLevel === 'internal' ? '内部' : secretLevel === 'public' ? '公开' : secretLevel}
                </span>
            </div>
        );
    }
    getIcon(): ReactNode {
        return <Database className="w-5 h-5 text-teal-500" />;
    }
}

/**
 * Helper: Get relative time string
 */
function getRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前`;
}

/**
 * NODE_RENDERERS - Registry of all node renderers
 */
export const NODE_RENDERERS: Partial<Record<NodeType, NodeRenderer>> = {
    [NodeType.PBS]: new PBSRenderer(),
    [NodeType.TASK]: new TaskRenderer(),
    [NodeType.REQUIREMENT]: new RequirementRenderer(),
    [NodeType.APP]: new AppRenderer(),
    [NodeType.DATA]: new DataRenderer(),
};

/**
 * Get renderer for a node type, with fallback
 */
export function getNodeRenderer(nodeType: NodeType): NodeRenderer | null {
    return NODE_RENDERERS[nodeType] || null;
}
