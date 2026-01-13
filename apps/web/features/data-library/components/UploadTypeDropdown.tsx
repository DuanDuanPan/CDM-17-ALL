'use client';

/**
 * Story 9.7: Upload Type Dropdown Component
 * Task 2.2: Unified type selector for PBS/Task upload
 *
 * AC3/AC4: Type selection before upload (default: Task=output, PBS=reference)
 */

import { useState, useEffect } from 'react';
import { Select, type SelectOption } from '@cdm/ui';
import type { DataLinkType } from '@cdm/types';

// ========================================
// Types
// ========================================

export interface UploadTypeDropdownProps {
    /** Default link type (PBS=reference, Task=output) */
    defaultValue: DataLinkType;
    /** Callback when type changes */
    onChange: (type: DataLinkType) => void;
    /** Whether to show batch "apply to all" checkbox */
    showBatchCheckbox?: boolean;
    /** Callback when batch checkbox changes */
    onBatchChange?: (applyToAll: boolean) => void;
    /** Current batch checkbox value (default: true) */
    batchApplyToAll?: boolean;
}

// ========================================
// Constants
// ========================================

const LINK_TYPE_OPTIONS: SelectOption[] = [
    { value: 'input', label: '输入 (Input)' },
    { value: 'output', label: '输出 (Output)' },
    { value: 'reference', label: '参考 (Reference)' },
];

// ========================================
// Component
// ========================================

/**
 * UploadTypeDropdown - Type selector for context-aware upload
 * AC3/AC4: Users can select link type before upload
 */
export function UploadTypeDropdown({
    defaultValue,
    onChange,
    showBatchCheckbox = false,
    onBatchChange,
    batchApplyToAll = true,
}: UploadTypeDropdownProps) {
    const [selectedType, setSelectedType] = useState<DataLinkType>(defaultValue);

    // Reset to default when defaultValue changes (e.g., switching tabs)
    useEffect(() => {
        setSelectedType(defaultValue);
    }, [defaultValue]);

    const handleChange = (value: DataLinkType) => {
        setSelectedType(value);
        onChange(value);
    };

    return (
        <div className="flex items-center gap-2">
            <Select
                data-testid="upload-type-dropdown"
                options={LINK_TYPE_OPTIONS}
                value={selectedType}
                onChange={(value) => handleChange(value as DataLinkType)}
                className="min-w-[140px]"
            />

            {showBatchCheckbox && (
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                        type="checkbox"
                        data-testid="batch-apply-checkbox"
                        checked={batchApplyToAll}
                        onChange={(e) => onBatchChange?.(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>应用到所有</span>
                </label>
            )}
        </div>
    );
}

export default UploadTypeDropdown;
