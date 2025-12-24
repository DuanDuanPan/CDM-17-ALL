'use client';

import { memo } from 'react';
import { MoreHorizontal } from 'lucide-react';

export interface TitleRowProps {
    /** Icon element (e.g., Box, CheckCircle) */
    icon: React.ReactNode;
    /** Title text */
    title: string;
    /** Whether title is in editing mode */
    isEditing?: boolean;
    /** Whether task is marked as done (applies strikethrough) */
    isDone?: boolean;
    /** Callback when title changes (editing mode) */
    onTitleChange?: (value: string) => void;
    /** Input ref for edit mode focus */
    inputRef?: React.RefObject<HTMLInputElement>;
    /** Key down handler for edit mode (Enter/Esc) */
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * TitleRow - Icon + Title + Menu trigger
 * Handles both display and editing modes
 */
export const TitleRow = memo(
    ({
        icon,
        title,
        isEditing = false,
        isDone = false,
        onTitleChange,
        inputRef,
        onKeyDown,
    }: TitleRowProps) => {
        return (
            <div className="flex items-center gap-2 w-full h-8">
                {/* Icon */}
                <div className="flex-shrink-0 scale-75 origin-center">{icon}</div>

                {/* Title (Edit or Display) */}
                {isEditing ? (
                    <input
                        ref={inputRef}
                        value={title}
                        onChange={(e) => onTitleChange?.(e.target.value)}
                        onKeyDown={onKeyDown}
                        className="flex-1 bg-transparent text-sm font-bold text-gray-900 outline-none min-w-0"
                        placeholder="Title"
                    />
                ) : (
                    <div
                        className={`flex-1 text-sm font-bold truncate ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'
                            }`}
                    >
                        {title || 'New Item'}
                    </div>
                )}

                {/* Menu Trigger (shown on hover in future) */}
                <button className="flex-shrink-0 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-3 h-3" />
                </button>
            </div>
        );
    }
);

TitleRow.displayName = 'TitleRow';
