/**
 * Story 9.9: Filter Badge Component
 * Task 1.7: Shows "已应用 N 个筛选" badge (AC2)
 */

'use client';

import { cn } from '@cdm/ui';

export interface FilterBadgeProps {
    /** Number of active filters */
    count: number;
    /** Custom class name */
    className?: string;
}

export function FilterBadge({ count, className }: FilterBadgeProps) {
    if (count === 0) return null;

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                className
            )}
            data-testid="filter-badge"
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            已应用 {count} 个筛选
        </span>
    );
}

export default FilterBadge;
