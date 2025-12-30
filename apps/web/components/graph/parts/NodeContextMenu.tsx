'use client';

import type { Graph } from '@antv/x6';

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
    onClose: () => void;
}

/**
 * Node context menu for clipboard operations and subscriptions.
 * Story 7.4: Extracted from GraphComponent for single responsibility.
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
    onClose,
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
            </div>
        </>
    );
}
