'use client';

/**
 * Story 2.5: Tag Editor Component
 * Provides inline tag editing with add/remove functionality
 * AC#2.1, AC#2.2, AC#2.3
 */

import { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagEditorProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    maxTags?: number;
    placeholder?: string;
    disabled?: boolean;
}

/**
 * Tag Editor Component
 * Allows adding and removing tags with keyboard support
 */
export function TagEditor({
    tags,
    onChange,
    maxTags = 10,
    placeholder = '添加标签...',
    disabled = false,
}: TagEditorProps) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = useCallback(
        (tag: string) => {
            const normalized = tag.trim().toLowerCase();
            if (!normalized || tags.includes(normalized) || tags.length >= maxTags) {
                return;
            }
            onChange([...tags, normalized]);
            setInput('');
        },
        [tags, onChange, maxTags]
    );

    const removeTag = useCallback(
        (tagToRemove: string) => {
            onChange(tags.filter((t) => t !== tagToRemove));
        },
        [tags, onChange]
    );

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const handleBlur = () => {
        if (input) {
            addTag(input);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                标签
            </label>
            <div
                className={`flex flex-wrap gap-1.5 p-2 min-h-[40px] border rounded-lg
                   border-gray-200 dark:border-gray-700 
                   bg-white dark:bg-gray-800
                   focus-within:ring-2 focus-within:ring-blue-500/20 
                   focus-within:border-blue-500
                   ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
                onClick={() => !disabled && inputRef.current?.focus()}
            >
                {/* Existing Tags */}
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md
                       text-xs font-medium bg-blue-50 text-blue-700
                       dark:bg-blue-900/30 dark:text-blue-300"
                    >
                        #{tag}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTag(tag);
                                }}
                                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </span>
                ))}

                {/* Input */}
                {!disabled && tags.length < maxTags && (
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder={tags.length === 0 ? placeholder : ''}
                        className="flex-1 min-w-[100px] text-sm outline-none bg-transparent
                       dark:text-white dark:placeholder:text-gray-500"
                        disabled={disabled}
                    />
                )}
            </div>

            {/* Helper text */}
            <div className="flex justify-between text-[10px] text-gray-400">
                <span>按 Enter 或逗号添加</span>
                <span>
                    {tags.length}/{maxTags}
                </span>
            </div>
        </div>
    );
}

export default TagEditor;
