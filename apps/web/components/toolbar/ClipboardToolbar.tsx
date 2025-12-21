'use client';

/**
 * Story 2.6: Multi-Select & Clipboard
 * Toolbar component for Copy/Cut/Paste operations
 * AC1.4 & AC6.1: Visual feedback for clipboard operations
 */

import { Copy, Scissors, ClipboardPaste } from 'lucide-react';

export interface ClipboardToolbarProps {
    /** Whether there are selected nodes */
    hasSelection: boolean;
    /** Number of selected nodes */
    selectionCount: number;
    /** Copy operation handler */
    onCopy: () => void;
    /** Cut operation handler */
    onCut: () => void;
    /** Paste operation handler (no position = center viewport) */
    onPaste: () => void;
    /** Whether component is disabled */
    disabled?: boolean;
}

/**
 * ClipboardToolbar - UI component for clipboard operations
 *
 * Provides:
 * - Copy button (enabled when nodes selected)
 * - Cut button (enabled when nodes selected)
 * - Paste button (always enabled)
 *
 * Story: 2.6 - Multi-Select & Clipboard
 */
export function ClipboardToolbar({
    hasSelection,
    selectionCount,
    onCopy,
    onCut,
    onPaste,
    disabled = false,
}: ClipboardToolbarProps) {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
    const modKey = isMac ? '⌘' : 'Ctrl';

    return (
        <div
            className="flex items-center gap-1 px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg"
            data-testid="clipboard-toolbar"
        >
            {/* Selection count indicator */}
            {hasSelection && (
                <span className="text-xs text-gray-400 px-2 min-w-[3rem]">
                    {selectionCount} 选中
                </span>
            )}

            {/* Separator */}
            {hasSelection && <div className="w-px h-5 bg-white/20" />}

            {/* Copy Button */}
            <button
                onClick={onCopy}
                disabled={disabled || !hasSelection}
                className={`
                    p-2 rounded-md transition-all duration-200 flex items-center gap-1.5
                    ${hasSelection && !disabled
                        ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        : 'text-gray-500 cursor-not-allowed opacity-50'
                    }
                `}
                data-testid="clipboard-copy"
                title={`复制 (${modKey}+C)`}
            >
                <Copy className="w-4 h-4" />
            </button>

            {/* Cut Button */}
            <button
                onClick={onCut}
                disabled={disabled || !hasSelection}
                className={`
                    p-2 rounded-md transition-all duration-200 flex items-center gap-1.5
                    ${hasSelection && !disabled
                        ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        : 'text-gray-500 cursor-not-allowed opacity-50'
                    }
                `}
                data-testid="clipboard-cut"
                title={`剪切 (${modKey}+X)`}
            >
                <Scissors className="w-4 h-4" />
            </button>

            {/* Paste Button */}
            <button
                onClick={onPaste}
                disabled={disabled}
                className={`
                    p-2 rounded-md transition-all duration-200 flex items-center gap-1.5
                    ${!disabled
                        ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        : 'text-gray-500 cursor-not-allowed opacity-50'
                    }
                `}
                data-testid="clipboard-paste"
                title={`粘贴 (${modKey}+V)`}
            >
                <ClipboardPaste className="w-4 h-4" />
            </button>
        </div>
    );
}
