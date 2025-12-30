'use client';

/**
 * Story 4.3: Contextual Comments & Mentions
 * CommentPanel Component - Side panel overlay for viewing and adding comments
 *
 * Story 7.5: Refactored to use Hook-First pattern
 * - Removed 1 direct fetch() call for mark-as-read
 * - Now uses useCommentActions hook following Story 7.2 pattern
 */

import { useState, useCallback, useEffect } from 'react';
import { X, MessageSquareDashed, Loader2 } from 'lucide-react';
import { useComments } from '../../hooks/useComments';
import { useCommentActions } from '../../hooks/useCommentActions';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';

interface CommentPanelProps {
    nodeId: string | null;
    nodeLabel?: string;
    mindmapId: string;
    userId: string;
    onClose: () => void;
    onMarkAsRead?: () => void;
}

export function CommentPanel({
    nodeId,
    nodeLabel = '节点',
    mindmapId,
    userId,
    onClose,
    onMarkAsRead,
}: CommentPanelProps) {
    const [replyToId, setReplyToId] = useState<string | null>(null);
    const [replyToName, setReplyToName] = useState<string | null>(null);

    const {
        comments,
        isLoading,
        error,
        createComment,
        deleteComment,
        hasMore,
        loadMore,
    } = useComments({ nodeId, userId, mindmapId });

    // Story 7.5: Use Hook-First pattern for mark-as-read
    const { markAsRead } = useCommentActions();

    // Mark as read when opening panel using hook
    useEffect(() => {
        if (!nodeId) return;

        markAsRead(nodeId, userId).then(() => {
            onMarkAsRead?.();
        });
    }, [nodeId, userId, markAsRead, onMarkAsRead]);

    // Handle close with Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (replyToId) {
                    setReplyToId(null);
                    setReplyToName(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, replyToId]);

    // Handle reply
    const handleReply = useCallback((commentId: string) => {
        const comment = comments.find((c) => c.id === commentId);
        if (comment) {
            setReplyToId(commentId);
            setReplyToName(comment.author?.name || 'Unknown');
        }
    }, [comments]);

    // Handle cancel reply
    const handleCancelReply = useCallback(() => {
        setReplyToId(null);
        setReplyToName(null);
    }, []);

    // Handle submit comment
    const handleSubmit = useCallback(async (content: string, attachmentIds?: string[]) => {
        await createComment(content, replyToId || undefined, attachmentIds);
        setReplyToId(null);
        setReplyToName(null);
    }, [createComment, replyToId]);

    // Handle delete
    const handleDelete = useCallback(async (commentId: string) => {
        await deleteComment(commentId);
    }, [deleteComment]);

    // Count total comments including replies
    const totalCount = comments.reduce(
        (acc, c) => acc + 1 + (c.replies?.length || 0),
        0
    );

    if (!nodeId) return null;

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-[400px] max-w-full flex flex-col
      bg-white/95 backdrop-blur-sm shadow-xl border-l border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                        评论
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        {totalCount}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title="关闭 (Esc)"
                >
                    <X className="h-4 w-4 text-gray-500" />
                </button>
            </div>

            {/* Node info */}
            <div className="px-4 py-2 border-b border-gray-50 bg-gray-50/50">
                <p className="text-xs text-gray-500 truncate">
                    {nodeLabel}
                </p>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {isLoading && comments.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-sm text-red-500 mb-2">加载评论失败</p>
                        <p className="text-xs text-gray-400">{error.message}</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageSquareDashed className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500 mb-1">暂无评论</p>
                        <p className="text-xs text-gray-400">
                            使用 @提及 来讨论这个节点
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {comments.map((comment) => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                currentUserId={userId}
                                onReply={handleReply}
                                onDelete={handleDelete}
                            />
                        ))}

                        {/* Load more button */}
                        {hasMore && (
                            <button
                                onClick={loadMore}
                                disabled={isLoading}
                                className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 
                  disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        加载中...
                                    </span>
                                ) : (
                                    '加载更多'
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="border-t border-gray-100 px-4 py-3 bg-white">
                <CommentInput
                    onSubmit={handleSubmit}
                    replyToName={replyToName || undefined}
                    onCancelReply={handleCancelReply}
                    userId={userId}
                />
            </div>
        </div>
    );
}

export default CommentPanel;
