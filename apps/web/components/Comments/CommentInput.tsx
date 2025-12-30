'use client';

/**
 * Story 4.3: Contextual Comments & Mentions
 * CommentInput Component - Textarea with @mention suggestions and attachments
 *
 * Story 7.5: Refactored to use Hook-First pattern
 * - Removed 1 direct fetch() call for @mention search
 * - Now uses useUserSearch hook following Story 7.2 pattern
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Send, Loader2, X, Paperclip } from 'lucide-react';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';
import { useUserSearch } from '@/hooks/useUserSearch';
import { AttachmentPreview } from './AttachmentPreview';
import type { UserOption } from '@/lib/api/users';

interface CommentInputProps {
    onSubmit: (content: string, attachmentIds?: string[]) => Promise<void>;
    placeholder?: string;
    replyToName?: string;
    onCancelReply?: () => void;
    disabled?: boolean;
    userId: string;  // Required for attachment upload
}

export function CommentInput({
    onSubmit,
    placeholder = '添加评论... 使用 @ 来提及用户',
    replyToName,
    onCancelReply,
    disabled = false,
    userId,
}: CommentInputProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartPos, setMentionStartPos] = useState(0);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Story 7.5: Use Hook-First pattern for user search
    const {
        users: suggestions,
        search: searchUsers,
    } = useUserSearch({ debounceMs: 200, limit: 10 });

    // Attachment upload hook
    const {
        files: uploadingFiles,
        upload,
        remove: removeFile,
        clear: clearFiles,
        getAttachmentIds,
        isUploading,
    } = useAttachmentUpload({ userId, maxFiles: 5, maxSize: 10 * 1024 * 1024 });

    // Handle content change and detect @mentions
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const value = e.target.value;
            const cursorPos = e.target.selectionStart || 0;
            setContent(value);

            // Check if we're in a mention
            // HIGH-4 Fix: Use Unicode-aware regex to support Chinese names
            const textBeforeCursor = value.slice(0, cursorPos);
            const mentionMatch = textBeforeCursor.match(/@([\p{L}\p{N}_]*)$/u);

            if (mentionMatch) {
                const query = mentionMatch[1];
                setMentionQuery(query);
                setMentionStartPos(mentionMatch.index || 0);
                setShowSuggestions(true);
                setSelectedIndex(0);

                // Use hook's search function with debouncing built-in
                searchUsers(query);
            } else {
                setShowSuggestions(false);
            }
        },
        [searchUsers]
    );

    // Handle suggestion selection
    const handleSelectSuggestion = useCallback(
        (user: UserOption) => {
            const displayName = user.name || user.email;
            const mentionToken =
                displayName.includes('"')
                    ? `@{${user.id}}`
                    : /[^\p{L}\p{N}_]/u.test(displayName)
                        ? `@"${displayName}"`
                        : `@${displayName}`;
            const before = content.slice(0, mentionStartPos);
            const after = content.slice(mentionStartPos + mentionQuery.length + 1);
            const newContent = `${before}${mentionToken} ${after}`;

            setContent(newContent);
            setShowSuggestions(false);

            // Focus back and set cursor position
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const newCursorPos = mentionStartPos + mentionToken.length + 1; // +1 for space
                    textareaRef.current.selectionStart = newCursorPos;
                    textareaRef.current.selectionEnd = newCursorPos;
                }
            }, 0);
        },
        [content, mentionStartPos, mentionQuery]
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (showSuggestions && suggestions.length > 0) {
                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                        break;
                    case 'Enter':
                        if (!e.shiftKey) {
                            e.preventDefault();
                            handleSelectSuggestion(suggestions[selectedIndex]);
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        setShowSuggestions(false);
                        break;
                }
                return;
            }

            // Submit with Cmd/Ctrl + Enter when no suggestions shown
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
            }
        },
        [showSuggestions, suggestions, selectedIndex, handleSelectSuggestion]
    );

    // Handle submit
    const handleSubmit = async () => {
        const trimmedContent = content.trim();
        // Allow submit if there's content OR attachments
        if ((!trimmedContent && uploadingFiles.length === 0) || isSubmitting || isUploading) return;

        setIsSubmitting(true);
        try {
            const attachmentIds = getAttachmentIds();
            await onSubmit(trimmedContent || '📎', attachmentIds.length > 0 ? attachmentIds : undefined);
            setContent('');
            clearFiles();
            onCancelReply?.();
        } catch (err) {
            console.error('[CommentInput] Submit error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            try {
                await upload(file);
            } catch (err) {
                console.error('[CommentInput] Upload error:', err);
            }
        }
        // Reset input to allow selecting the same file again
        e.target.value = '';
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [content]);

    return (
        <div className="relative">
            {/* Reply indicator */}
            {replyToName && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded">
                    <span>回复 <strong>{replyToName}</strong></span>
                    <button
                        onClick={onCancelReply}
                        className="ml-auto hover:text-gray-700"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}

            {/* Input container */}
            <div className={`group relative border rounded-xl bg-white transition-all duration-200 ease-in-out
                ${isSubmitting ? 'bg-gray-50' : ''}
                ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
                border-gray-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10
            `}>
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled || isSubmitting}
                    rows={1}
                    className="w-full resize-none border-none bg-transparent px-4 py-3 text-sm focus:ring-0 placeholder:text-gray-400 min-h-[48px]"
                />

                {/* Toolbar */}
                <div className="flex justify-between items-center px-2 pb-2">
                    <div className="flex items-center gap-1">
                        {/* Attachment button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || isSubmitting || uploadingFiles.length >= 5}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="添加附件 (最多5个)"
                        >
                            <Paperclip className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-300 hidden sm:inline-block">⌘+Enter 发送</span>
                        <button
                            onClick={handleSubmit}
                            disabled={(!content.trim() && uploadingFiles.length === 0) || disabled || isSubmitting || isUploading}
                            className={`p-2 rounded-lg transition-all duration-200
                                ${(!content.trim() && uploadingFiles.length === 0) || disabled || isSubmitting || isUploading
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                                }`}
                            title="发送"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mention suggestions popover */}
                {showSuggestions && suggestions.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="absolute bottom-full left-0 mb-2 w-full max-h-[200px] overflow-y-auto
                bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-1"
                    >
                        {suggestions.map((user, index) => (
                            <div
                                key={user.id}
                                onClick={() => handleSelectSuggestion(user)}
                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors
                    ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {user.name || '未命名用户'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Attachment preview */}
            {uploadingFiles.length > 0 && (
                <div className="mt-2">
                    <AttachmentPreview
                        files={uploadingFiles}
                        onRemove={removeFile}
                        disabled={isSubmitting}
                    />
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
}

export default CommentInput;
