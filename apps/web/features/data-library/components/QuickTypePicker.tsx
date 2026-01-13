'use client';

/**
 * Story 9.7: Quick Type Picker Component
 * Task 2.3: Lightweight modal for batch per-file type selection
 *
 * AC4: When "apply to all" is unchecked, show per-file type picker
 */

import { createPortal } from 'react-dom';
import { Button } from '@cdm/ui';
import { Download, Upload, Paperclip, X } from 'lucide-react';
import type { DataLinkType } from '@cdm/types';

// ========================================
// Types
// ========================================

export interface QuickTypePickerProps {
    /** Current file name being processed */
    fileName: string;
    /** Current file index (1-based) */
    currentIndex: number;
    /** Total file count */
    totalCount: number;
    /** Callback when user selects a type */
    onSelect: (type: DataLinkType) => void;
    /** Callback to cancel the entire batch */
    onCancel: () => void;
}

interface TypeButtonConfig {
    type: DataLinkType;
    label: string;
    icon: typeof Download;
    colorClass: string;
}

// ========================================
// Constants
// ========================================

const TYPE_BUTTONS: TypeButtonConfig[] = [
    {
        type: 'input',
        label: '输入',
        icon: Download,
        colorClass: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
    {
        type: 'output',
        label: '输出',
        icon: Upload,
        colorClass: 'bg-green-500 hover:bg-green-600 text-white',
    },
    {
        type: 'reference',
        label: '参考',
        icon: Paperclip,
        colorClass: 'bg-slate-500 hover:bg-slate-600 text-white',
    },
];

// ========================================
// Component
// ========================================

/**
 * QuickTypePicker - Per-file type selection modal for batch upload
 * AC4: Light modal with three type buttons, shows file name and progress
 */
export function QuickTypePicker({
    fileName,
    currentIndex,
    totalCount,
    onSelect,
    onCancel,
}: QuickTypePickerProps) {
    return createPortal(
        <div
            data-testid="quick-type-picker"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        选择关联类型
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        className="h-7 w-7 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* File Name and Progress */}
                <div className="mb-4 rounded bg-gray-50 dark:bg-gray-700 px-3 py-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        文件 ({currentIndex}/{totalCount})
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {fileName}
                    </div>
                </div>

                {/* Type Buttons */}
                <div className="flex gap-3" role="group" aria-label="选择关联类型">
                    {TYPE_BUTTONS.map((config, index) => {
                        const Icon = config.icon;
                        return (
                            <button
                                key={config.type}
                                type="button"
                                tabIndex={0}
                                autoFocus={index === 0}
                                onClick={() => onSelect(config.type)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelect(config.type);
                                    }
                                }}
                                className={`flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-lg transition-colors ${config.colorClass}`}
                                data-testid={`quick-type-${config.type}`}
                                aria-label={`关联为${config.label}`}
                            >
                                <Icon className="w-6 h-6" />
                                <span className="text-sm font-medium">{config.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Cancel Hint */}
                <p className="mt-4 text-center text-xs text-gray-400">
                    点击外部区域取消剩余文件
                </p>
            </div>
        </div>,
        document.body
    );
}

export default QuickTypePicker;
