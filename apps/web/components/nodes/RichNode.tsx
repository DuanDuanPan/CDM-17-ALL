'use client';

import React from 'react';
import { Eye, Play, Loader2, MessageSquare } from 'lucide-react';
import { NodeType, type MindNodeData, type ApprovalStatus, type ApprovalPipeline, type TaskProps } from '@cdm/types';
import { RichNodeLayout } from './rich/RichNodeLayout';
import { TitleRow } from './rich/TitleRow';
import { MetricsRow } from './rich/MetricsRow';
import { HangingPill } from './rich/HangingPill';
import { Footer, getNodeRenderer } from './rich';
import type { ApprovalDecoration } from './nodeConfig';

export interface RichNodeProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    titleMeasureRef: React.RefObject<HTMLDivElement | null>;
    titleInputRef: React.RefObject<HTMLInputElement | null>;
    nodeId: string;
    nodeType: NodeType;
    data: MindNodeData;
    label: string;
    setLabel: (label: string) => void;
    tags: string[];
    isEditing: boolean;
    isSelected: boolean;
    isWatched: boolean;
    isTaskDone: boolean;
    appRunning: boolean;
    unreadCount: number;
    approval?: ApprovalPipeline;
    approvalStatus?: ApprovalStatus;
    approvalDecoration: ApprovalDecoration | null;
    pill: { bg: string; text: string; label: string } | null;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    handleAppExecute: (e: React.MouseEvent<HTMLButtonElement>) => void;
    handleOpenComments: (e: React.MouseEvent) => void;
    startEditing: () => void;
}

/**
 * Rich node renderer (PBS, Task, Requirement).
 * Story 7.4: Extracted from MindNode for single responsibility.
 */
export function RichNode({
    containerRef,
    titleMeasureRef,
    titleInputRef,
    nodeId,
    nodeType,
    data,
    label,
    setLabel,
    tags,
    isEditing,
    isSelected,
    isWatched,
    isTaskDone,
    appRunning,
    unreadCount,
    approval,
    approvalStatus,
    approvalDecoration,
    pill,
    handleKeyDown,
    handleAppExecute,
    handleOpenComments,
    startEditing,
}: RichNodeProps) {
    const renderer = getNodeRenderer(nodeType);
    if (!renderer) return null;

    const headerColor = renderer.getHeaderColor(approvalStatus);
    const headerPattern = renderer.getHeaderPattern(approvalStatus);
    const metricsContent = renderer.renderMetrics(data);

    const rejectionReason =
        approvalStatus === 'REJECTED'
            ? approval?.history?.find((h) => h.action === 'rejected')?.reason || '未提供驳回原因'
            : null;

    return (
        <div ref={containerRef} className="relative">
            {/* Subscription indicator badge */}
            {isWatched && (
                <div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm z-10"
                    title="已关注"
                >
                    <Eye className="w-2.5 h-2.5 text-white" />
                </div>
            )}
            <RichNodeLayout
                headerColor={headerColor}
                headerPattern={headerPattern}
                isSelected={isSelected}
                onDoubleClick={startEditing}
                hangingPill={rejectionReason ? <HangingPill reason={rejectionReason} /> : undefined}
            >
                <TitleRow
                    icon={renderer.getIcon()}
                    title={label}
                    isEditing={isEditing}
                    isDone={isTaskDone}
                    onTitleChange={setLabel}
                    inputRef={titleInputRef}
                    onKeyDown={handleKeyDown}
                />

                {metricsContent && <MetricsRow>{metricsContent}</MetricsRow>}

                {/* Tags Row */}
                {tags && tags.length > 0 && (
                    <div className="flex items-center gap-1 overflow-hidden w-full min-h-[16px]">
                        {tags.slice(0, 3).map((tag) => (
                            <button
                                key={tag}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    containerRef.current?.dispatchEvent(
                                        new CustomEvent('mindmap:tag-search', {
                                            bubbles: true,
                                            detail: { tag },
                                        })
                                    );
                                }}
                                className="px-1.5 py-0.5 rounded-sm text-[9px] font-medium bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer truncate max-w-[80px] flex-shrink-0"
                                title={`搜索标签: #${tag}`}
                            >
                                #{tag}
                            </button>
                        ))}
                        {tags.length > 3 && (
                            <span className="text-[9px] text-gray-400 flex-shrink-0">+{tags.length - 3}</span>
                        )}
                    </div>
                )}

                <Footer
                    leftContent={
                        <>
                            {approvalDecoration && (
                                <div
                                    className={`px-1.5 py-0.5 text-[9px] font-medium leading-none rounded ${approvalDecoration.badgeClass}`}
                                >
                                    {approvalDecoration.badgeText}
                                </div>
                            )}
                            {pill && (
                                <div
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium leading-none truncate ${pill.bg} ${pill.text}`}
                                    title={pill.label}
                                >
                                    {pill.label}
                                </div>
                            )}
                        </>
                    }
                    rightContent={
                        <>
                            {nodeType === NodeType.TASK && (
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                    👤 {(data.props as TaskProps | undefined)?.assigneeId?.slice(0, 6) || '未分配'}
                                </span>
                            )}
                            {nodeType === NodeType.APP && (
                                <button
                                    onClick={handleAppExecute}
                                    disabled={appRunning}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                                        appRunning
                                            ? 'bg-yellow-100 text-yellow-700 cursor-wait'
                                            : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                                    }`}
                                    title={appRunning ? '执行中...' : '启动应用'}
                                >
                                    {appRunning ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Play className="w-3 h-3" />
                                    )}
                                    <span>启动</span>
                                </button>
                            )}
                            <button
                                onClick={handleOpenComments}
                                className="relative inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                title="查看评论"
                            >
                                <MessageSquare className="w-3 h-3" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                                )}
                            </button>
                            <span className="text-[10px] text-gray-400 font-mono">{nodeId.slice(0, 6)}</span>
                        </>
                    }
                />
            </RichNodeLayout>

            {/* Hidden Measure */}
            <div
                ref={titleMeasureRef}
                className="absolute opacity-0 pointer-events-none text-sm font-bold w-[200px]"
            >
                {label}
            </div>
        </div>
    );
}
