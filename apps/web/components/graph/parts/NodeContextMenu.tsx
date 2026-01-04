'use client';

import type { Graph } from '@antv/x6';
import { LayoutTemplate, ChevronRight, ChevronDown, ChevronsDownUp } from 'lucide-react';

export interface NodeContextMenuProps {
    visible: boolean;
    x: number;
    y: number;
    graphX: number;
    graphY: number;
    nodeId: string | null;
    graph: Graph | null;
    hasSelection: boolean;
    isSubscribed: boolean;
    isSubscriptionLoading: boolean;
    onCopy: () => void;
    onCut: () => void;
    onPaste: (position: { x: number; y: number }) => void;
    onSelectAll: () => void;
    onSubscriptionToggle: () => void;
    onSaveAsTemplate?: () => void; // Story 5.2
    onClose: () => void;
    // Story 8.1: Collapse/expand
    isCollapsed?: boolean;
    hasChildren?: boolean;
    onCollapse?: () => void;
    onExpand?: () => void;
    onCollapseDescendants?: () => void;
}

/**
 * Node context menu for clipboard operations, subscriptions, and collapse/expand.
 * Story 7.4: Extracted from GraphComponent for single responsibility.
 * Story 8.1: Added collapse/expand menu items.
 */
export function NodeContextMenu({
    visible,
    x,
    y,
    graphX,
    graphY,
    nodeId,
    hasSelection,
    isSubscribed,
    isSubscriptionLoading,
    onCopy,
    onCut,
    onPaste,
    onSelectAll,
    onSubscriptionToggle,
    onSaveAsTemplate,
    onClose,
    // Story 8.1: Collapse/expand
    isCollapsed,
    hasChildren,
    onCollapse,
    onExpand,
    onCollapseDescendants,
}: NodeContextMenuProps) {
    if (!visible) return null;

    const handleAction = (action: () => void) => {
        action();
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
                style={{ left: x, top: y }}
            >
                {hasSelection && (
                    <>
                        <button
                            onClick={() => handleAction(onCopy)}
                            className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                            <span className="w-4">📋</span>复制
                            <span className="ml-auto text-xs text-gray-400">⌘C</span>
                        </button>
                        <button
                            onClick={() => handleAction(onCut)}
                            className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                            <span className="w-4">✂️</span>剪切
                            <span className="ml-auto text-xs text-gray-400">⌘X</span>
                        </button>
                        {/* Story 5.2: Save as Template */}
                        {onSaveAsTemplate && (
                            <button
                                onClick={() => handleAction(onSaveAsTemplate)}
                                className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                            >
                                <LayoutTemplate className="w-4 h-4 text-blue-500" />
                                保存为模板
                            </button>
                        )}
                        <div className="border-t border-gray-100 my-1" />
                    </>
                )}
                <button
                    onClick={() => handleAction(() => onPaste({ x: graphX, y: graphY }))}
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                    <span className="w-4">📥</span>粘贴到此处
                    <span className="ml-auto text-xs text-gray-400">⌘V</span>
                </button>
                <button
                    onClick={() => handleAction(onSelectAll)}
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                    <span className="w-4">☑️</span>全选
                    <span className="ml-auto text-xs text-gray-400">⌘A</span>
                </button>
                {nodeId && (
                    <>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                            onClick={() => handleAction(onSubscriptionToggle)}
                            disabled={isSubscriptionLoading}
                            className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            <span className="w-4">{isSubscribed ? '🔕' : '🔔'}</span>
                            {isSubscriptionLoading
                                ? '处理中...'
                                : isSubscribed
                                    ? '取消关注'
                                    : '关注节点'}
                        </button>
                    </>
                )}
                {/* Story 8.1: Collapse/expand menu items */}
                {nodeId && hasChildren && (
                    <>
                        <div className="border-t border-gray-100 my-1" />
                        {!isCollapsed && onCollapse && (
                            <button
                                onClick={() => handleAction(onCollapse)}
                                className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                折叠子节点
                                <span className="ml-auto text-xs text-gray-400">⌘[</span>
                            </button>
                        )}
                        {isCollapsed && onExpand && (
                            <button
                                onClick={() => handleAction(onExpand)}
                                className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                            >
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                                展开子节点
                                <span className="ml-auto text-xs text-gray-400">⌘]</span>
                            </button>
                        )}
                        {onCollapseDescendants && (
                            <button
                                onClick={() => handleAction(onCollapseDescendants)}
                                className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                            >
                                <ChevronsDownUp className="w-4 h-4 text-gray-500" />
                                折叠所有后代
                                <span className="ml-auto text-xs text-gray-400">⌘⌥[</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
