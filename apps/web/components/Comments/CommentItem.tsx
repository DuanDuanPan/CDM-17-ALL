'use client';

/**
 * Story 4.3: Contextual Comments & Mentions
 * CommentItem Component - Single comment display with author and actions
 *
 * Story 7.5: Refactored to use Hook-First pattern
 * - Removed 1 direct fetch() call for attachment download
 * - Now uses useCommentActions hook following Story 7.2 pattern
 */

import { useState, useMemo } from 'react';
import { Trash2, CornerDownRight, FileText, Download, Image as ImageIcon } from 'lucide-react';
import type { Comment } from '@cdm/types';
import { useCommentActions } from '@/hooks/useCommentActions';

// Helper: Format relative time
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
}

// Helper: Get initials from name
function getInitials(name?: string): string {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

// Helper: Highlight @mentions in content
// HIGH-4 Fix: Updated regex to support Chinese characters and quoted names
function highlightMentions(content: string): React.ReactNode {
    // Matches @{userId}, @"Quoted Name", or @UnquotedName (including Unicode)
    const mentionRegex = /@(?:(\{[a-z0-9-]+\})|"([^"]+)"|([\p{L}\p{N}_]+))/giu;

    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(content)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            result.push(content.slice(lastIndex, match.index));
        }

        // Determine which capture group matched
        const mentionText = match[1] || match[2] || match[3] || '';

        // Add the highlighted mention
        result.push(
            <span
                key={`mention-${match.index}`}
                className="text-primary font-semibold bg-primary/10 rounded-sm px-1"
            >
                @{mentionText}
            </span>
        );

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (lastIndex < content.length) {
        result.push(content.slice(lastIndex));
    }

    return result.length > 0 ? result : content;
}

interface CommentItemProps {
    comment: Comment;
    currentUserId: string;
    onReply?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    depth?: number;
    maxDepth?: number;
}

export function CommentItem({
    comment,
    currentUserId,
    onReply,
    onDelete,
    depth = 0,
    maxDepth = 2,
}: CommentItemProps) {
    const [showActions, setShowActions] = useState(false);
    const isAuthor = comment.authorId === currentUserId;
    const hasReplies = comment.replies && comment.replies.length > 0;

    const authorName = comment.author?.name || 'Unknown';
    const initials = useMemo(() => getInitials(authorName), [authorName]);

    // Story 7.5: Use Hook-First pattern for attachment actions
    const { downloadFile, viewImage } = useCommentActions();

    return (
        <div
            className={`group ${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Comment Content */}
            <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                        {initials}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                            {authorName}
                        </span>
                        <span className="text-xs text-gray-400">
                            {formatRelativeTime(comment.createdAt)}
                        </span>
                    </div>

                    {/* Content */}
                    <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {highlightMentions(comment.content)}
                    </div>

                    {/* Attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {comment.attachments.map((attachment) => {
                                const isImage = attachment.mimeType.startsWith('image/');

                                // Download handler using hook
                                const handleDownload = async (e: React.MouseEvent) => {
                                    e.preventDefault();
                                    try {
                                        if (isImage) {
                                            // Open image in new tab
                                            await viewImage(attachment.url, currentUserId);
                                        } else {
                                            // Trigger file download
                                            await downloadFile(
                                                attachment.url,
                                                currentUserId,
                                                attachment.fileName
                                            );
                                        }
                                    } catch (error) {
                                        console.error('Download error:', error);
                                    }
                                };

                                return (
                                    <button
                                        key={attachment.id}
                                        onClick={handleDownload}
                                        className={`group/att flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-200 
                                            hover:border-blue-300 hover:bg-blue-50 transition-colors max-w-[200px] text-left
                                            ${isImage ? 'flex-col p-1' : ''}`}
                                        title={attachment.fileName}
                                    >
                                        {isImage ? (
                                            <ImageIcon className="w-12 h-12 text-gray-400" />
                                        ) : (
                                            <>
                                                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-xs text-gray-600 truncate flex-1">
                                                    {attachment.fileName}
                                                </span>
                                                <Download className="h-3 w-3 text-gray-400 group-hover/att:text-blue-500 flex-shrink-0" />
                                            </>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Actions (hover) */}
                    <div
                        className={`flex items-center gap-3 mt-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        {/* Reply button - only show if we haven't reached max depth */}
                        {depth < maxDepth && onReply && (
                            <button
                                onClick={() => onReply(comment.id)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                <CornerDownRight className="h-3 w-3" />
                                回复
                            </button>
                        )}

                        {/* Delete button - only for author */}
                        {isAuthor && onDelete && (
                            <button
                                onClick={() => onDelete(comment.id)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
                            >
                                <Trash2 className="h-3 w-3" />
                                删除
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Nested Replies */}
            {hasReplies && (
                <div className="mt-4 space-y-4">
                    {comment.replies!.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            currentUserId={currentUserId}
                            onReply={depth + 1 < maxDepth ? onReply : undefined}
                            onDelete={onDelete}
                            depth={depth + 1}
                            maxDepth={maxDepth}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default CommentItem;
