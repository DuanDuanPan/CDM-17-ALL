/**
 * Story 9.9: Type Filter Component
 * Task 1.4: Type filter dropdown (AC2)
 * 
 * Features:
 * - Reuses DataAssetFormat enum
 * - Shows all format options
 * - Filter icon + label
 */

'use client';

import { Filter } from 'lucide-react';
import { cn } from '@cdm/ui';
import type { DataAssetFormat } from '@cdm/types';
import { DATA_ASSET_FORMAT_OPTIONS } from '../data-library-drawer/formatOptions';

export interface TypeFilterProps {
    /** Current filter value */
    value: DataAssetFormat | '';
    /** Callback when filter changes */
    onChange: (format: DataAssetFormat | '') => void;
    /** Custom class name */
    className?: string;
}

export function TypeFilter({
    value,
    onChange,
    className,
}: TypeFilterProps) {
    return (
        <div className={cn('relative', className)} data-testid="type-filter">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as DataAssetFormat | '')}
                aria-label="类型筛选"
                className={cn(
                    'pl-9 pr-8 py-2 text-sm rounded-lg border appearance-none cursor-pointer',
                    'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                    'text-gray-700 dark:text-gray-300',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                    'transition-colors'
                )}
                data-testid="type-filter-select"
            >
                {DATA_ASSET_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default TypeFilter;
