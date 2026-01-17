'use client';

/**
 * CommentsPanelContent - Comments panel content for unified left sidebar
 * 
 * Extracted from CommentPanel to work within the left sidebar layout.
 * Displays comments for the selected node.
 */

import { useState, useCallback, useEffect } from 'react';
import { MessageSquareDashed, Loader2 } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import { useCommentActions } from '@/hooks/useCommentActions';
import { CommentItem } from '@/components/Comments/CommentItem';
import { CommentInput } from '@/components/Comments/CommentInput';

export interface CommentsPanelContentProps {
    nodeId: string | null;
    nodeLabel?: string;
    mindmapId: string;
    userId: string;
    onMarkAsRead?: () => void;
}

export function CommentsPanelContent({
    nodeId,
    nodeLabel = '节点',
    mindmapId,
    userId,
    onMarkAsRead,
}: CommentsPanelContentProps) {
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

    const { markAsRead } = useCommentActions();

    // Mark as read when node changes
    useEffect(() => {
        if (!nodeId) return;

        let cancelled = false;

        (async () => {
            try {
                await markAsRead(nodeId, userId);
                if (!cancelled) {
                    onMarkAsRead?.();
                }
            } catch (err) {
                if (!cancelled) {
                    console.warn('[CommentsPanelContent] markAsRead failed:', err);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [nodeId, userId, markAsRead, onMarkAsRead]);

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

    // Reset reply state when node changes
    useEffect(() => {
        setReplyToId(null);
        setReplyToName(null);
    }, [nodeId]);

    if (!nodeId) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-400">
                <p className="text-sm">请选中一个节点</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Node info */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <p className="text-xs text-gray-500 truncate flex-1">{nodeLabel}</p>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full ml-2">
                    {totalCount}
                </span>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
                {isLoading && comments.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-xs text-red-500 mb-1">加载评论失败</p>
                        <p className="text-xs text-gray-400">{error.message}</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <MessageSquareDashed className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-xs text-gray-500 mb-1">暂无评论</p>
                        <p className="text-xs text-gray-400">使用 @提及 来讨论</p>
                    </div>
                ) : (
                    <div className="space-y-4">
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
                                className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
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
            <div className="border-t border-gray-100 px-3 py-2 bg-white">
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

export default CommentsPanelContent;
