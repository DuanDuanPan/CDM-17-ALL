'use client';

import React from 'react';
import {
    CheckCircle,
    MoreHorizontal,
    Lock,
    AlertCircle,
    Clock,
    Play,
    Loader2,
    MessageSquare,
    Eye,
} from 'lucide-react';
import { NodeType, type TaskProps } from '@cdm/types';
import type { TypeConfig, ApprovalDecoration } from './nodeConfig';

export interface LegacyCardNodeProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    containerClasses: string;
    titleMeasureRef: React.RefObject<HTMLDivElement | null>;
    descMeasureRef: React.RefObject<HTMLDivElement | null>;
    titleInputRef: React.RefObject<HTMLInputElement | null>;
    descInputRef: React.RefObject<HTMLInputElement | null>;
    nodeId: string;
    nodeType: NodeType;
    label: string;
    setLabel: (label: string) => void;
    description: string;
    setDescription: (desc: string) => void;
    tags: string[];
    isEditing: boolean;
    isWatched: boolean;
    isTaskDone: boolean;
    appRunning: boolean;
    unreadCount: number;
    styles: TypeConfig;
    pill: { bg: string; text: string; label: string } | null;
    approvalDecoration: ApprovalDecoration | null;
    taskProps?: TaskProps;
    commit: () => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    handleAppExecute: (e: React.MouseEvent<HTMLButtonElement>) => void;
    handleOpenComments: (e: React.MouseEvent) => void;
    startEditing: () => void;
}

/**
 * Legacy card node renderer (Requirement, Data, App).
 * Story 7.4: Extracted from MindNode for single responsibility.
 */
export function LegacyCardNode({
    containerRef,
    containerClasses,
    titleMeasureRef,
    descMeasureRef,
    titleInputRef,
    descInputRef,
    nodeId,
    nodeType,
    label,
    setLabel,
    description,
    setDescription,
    tags,
    isEditing,
    isWatched,
    isTaskDone,
    appRunning,
    unreadCount,
    styles,
    pill,
    approvalDecoration,
    taskProps,
    commit,
    handleKeyDown,
    handleAppExecute,
    handleOpenComments,
    startEditing,
}: LegacyCardNodeProps) {
    const assignmentStatus = taskProps?.assignmentStatus;
    const showAssignmentIndicator = nodeType === NodeType.TASK && assignmentStatus && assignmentStatus !== 'idle';

    return (
        <div
            ref={containerRef}
            className={`${containerClasses} relative group`}
            onDoubleClick={startEditing}
            title={label}
        >
            {/* Story 4.4: Subscription indicator badge */}
            {isWatched && (
                <div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm z-10"
                    title="已关注"
                >
                    <Eye className="w-2.5 h-2.5 text-white" />
                </div>
            )}

            {/* Header (Icon + Title) */}
            <div className="flex items-center gap-2 w-full">
                <div className="flex-shrink-0">
                    {styles.icon && <div className="scale-75 origin-center">{styles.icon}</div>}
                </div>

                {isEditing ? (
                    <input
                        ref={titleInputRef}
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-xs font-bold text-gray-900 outline-none min-w-0"
                        placeholder="Title"
                    />
                ) : (
                    <div
                        className={`flex-1 text-xs font-bold truncate ${
                            isTaskDone ? 'text-gray-400 line-through' : 'text-gray-800'
                        }`}
                    >
                        {label || 'New Item'}
                    </div>
                )}

                <button className="flex-shrink-0 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-3 h-3" />
                </button>
            </div>

            {/* Body (Description) */}
            {(isEditing || description) && (
                <div className="w-full mt-1 min-h-0">
                    {isEditing ? (
                        <input
                            ref={descInputRef}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={commit}
                            className="w-full bg-transparent text-[10px] text-gray-500 outline-none placeholder-gray-300"
                            placeholder="Description..."
                        />
                    ) : (
                        <div className="text-[10px] text-gray-500 truncate leading-tight">{description}</div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="w-full flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                {/* Left: Status Pill + Tags */}
                <div className="flex items-center gap-1 overflow-hidden min-w-0">
                    {/* Approval Badge */}
                    {approvalDecoration && nodeType === NodeType.TASK && (
                        <div
                            className={`flex items-center gap-0.5 px-1 py-0.5 border border-transparent rounded text-[8px] font-medium leading-none flex-shrink-0 ${approvalDecoration.badgeClass}`}
                            title={`审批状态: ${approvalDecoration.badgeText}`}
                        >
                            <span className="truncate">{approvalDecoration.badgeText}</span>
                        </div>
                    )}

                    {pill ? (
                        <div
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium leading-none truncate ${pill.bg} ${pill.text}`}
                            title={pill.label}
                        >
                            {pill.label}
                        </div>
                    ) : (
                        <div />
                    )}

                    {/* Tags */}
                    {tags && tags.length > 0 && (
                        <div className="flex items-center gap-0.5 overflow-hidden">
                            {tags.slice(0, 2).map((tag) => (
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
                                    className="px-1 py-0.5 rounded text-[8px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer truncate max-w-[50px] flex-shrink-0"
                                    title={`搜索标签: #${tag}`}
                                >
                                    #{tag}
                                </button>
                            ))}
                            {tags.length > 2 && (
                                <span className="text-[8px] text-gray-400 flex-shrink-0">+{tags.length - 2}</span>
                            )}
                        </div>
                    )}

                    {/* Assignment Status Badge */}
                    {showAssignmentIndicator && (
                        <div
                            className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium leading-none flex-shrink-0 ${
                                assignmentStatus === 'accepted'
                                    ? 'bg-green-100 text-green-700'
                                    : assignmentStatus === 'dispatched'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : assignmentStatus === 'rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : ''
                            }`}
                            title={
                                assignmentStatus === 'accepted'
                                    ? '已接受'
                                    : assignmentStatus === 'dispatched'
                                      ? '待确认'
                                      : assignmentStatus === 'rejected'
                                        ? '已驳回'
                                        : ''
                            }
                        >
                            {assignmentStatus === 'accepted' && <CheckCircle className="w-2 h-2" />}
                            {assignmentStatus === 'dispatched' && <Clock className="w-2 h-2" />}
                            {assignmentStatus === 'rejected' && <AlertCircle className="w-2 h-2" />}
                            <span className="hidden sm:inline">
                                {assignmentStatus === 'accepted' && '已接受'}
                                {assignmentStatus === 'dispatched' && '待确认'}
                                {assignmentStatus === 'rejected' && '驳回'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right: Meta ID + APP Execute Button */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* APP Execute Button */}
                    {nodeType === NodeType.APP && (
                        <button
                            onClick={handleAppExecute}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[9px] ${
                                appRunning
                                    ? 'text-yellow-700 bg-yellow-100 cursor-wait'
                                    : 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100'
                            }`}
                            title={appRunning ? '执行中...' : '启动应用'}
                            aria-label="启动应用"
                            disabled={appRunning}
                        >
                            {appRunning ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Play className="w-3 h-3" />
                            )}
                            <span>启动</span>
                        </button>
                    )}

                    {/* Comments Button */}
                    <button
                        onClick={handleOpenComments}
                        className="relative inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                        title="查看评论"
                    >
                        <MessageSquare className="w-3 h-3" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                    </button>

                    <span className="text-[9px] font-mono text-gray-400">{nodeId.slice(0, 6).toUpperCase()}</span>
                    {nodeType === NodeType.DATA && <Lock className="w-2.5 h-2.5 text-gray-300" />}
                </div>
            </div>

            {/* Hidden Measures for auto-resize */}
            <div
                ref={titleMeasureRef}
                className="absolute opacity-0 pointer-events-none text-xs font-bold w-[200px]"
            >
                {label}
            </div>
            <div
                ref={descMeasureRef}
                className="absolute opacity-0 pointer-events-none text-[10px] w-[200px]"
            >
                {description}
            </div>
        </div>
    );
}
