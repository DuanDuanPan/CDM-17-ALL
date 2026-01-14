/**
 * Story 9.9: Date Range Filter Component
 * Task 1.5: Date range selector (AC2)
 * 
 * Features:
 * - Two native date inputs for start and end
 * - Clear button when dates are set
 * - Calendar icon
 */

'use client';

import { Calendar, X } from 'lucide-react';
import { cn } from '@cdm/ui';

export interface DateRangeFilterProps {
    /** Start date (ISO string) */
    createdAfter: string;
    /** End date (ISO string) */
    createdBefore: string;
    /** Callback when dates change */
    onChange: (after: string, before: string) => void;
    /** Custom class name */
    className?: string;
}

export function DateRangeFilter({
    createdAfter,
    createdBefore,
    onChange,
    className,
}: DateRangeFilterProps) {
    const hasValue = createdAfter || createdBefore;

    const handleClear = () => {
        onChange('', '');
    };

    return (
        <div
            className={cn('flex items-center gap-2', className)}
            data-testid="date-range-filter"
        >
            {/* Start date */}
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                    type="date"
                    value={createdAfter}
                    onChange={(e) => onChange(e.target.value, createdBefore)}
                    aria-label="开始日期"
                    className={cn(
                        'pl-9 pr-3 py-2 text-sm rounded-lg border',
                        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                        'text-gray-700 dark:text-gray-300',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                        'transition-colors'
                    )}
                    data-testid="date-filter-start"
                />
            </div>

            {/* Separator */}
            <span className="text-xs text-gray-400">-</span>

            {/* End date */}
            <div className="relative">
                <input
                    type="date"
                    value={createdBefore}
                    onChange={(e) => onChange(createdAfter, e.target.value)}
                    aria-label="结束日期"
                    className={cn(
                        'px-3 py-2 text-sm rounded-lg border',
                        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                        'text-gray-700 dark:text-gray-300',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                        'transition-colors'
                    )}
                    data-testid="date-filter-end"
                />
            </div>

            {/* Clear button */}
            {hasValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="清除日期筛选"
                    className={cn(
                        'p-2 rounded-lg transition-colors',
                        'hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    data-testid="date-filter-clear"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            )}
        </div>
    );
}

export default DateRangeFilter;
