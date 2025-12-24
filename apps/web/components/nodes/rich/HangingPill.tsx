'use client';

import { memo } from 'react';
import { AlertCircle } from 'lucide-react';

export interface HangingPillProps {
    /** Rejection reason text */
    reason: string;
    /** Optional type (default: 'rejected') */
    type?: 'rejected' | 'error' | 'warning';
}

/**
 * HangingPill - Floating pill below node for rejection/error states
 * Displays rejection reason with alert icon
 */
export const HangingPill = memo(({ reason, type = 'rejected' }: HangingPillProps) => {
    // Color scheme based on type
    const colorClasses = {
        rejected: 'bg-rose-50 border-rose-200 text-rose-700',
        error: 'bg-red-50 border-red-200 text-red-700',
        warning: 'bg-amber-50 border-amber-200 text-amber-700',
    }[type];

    const iconColor = {
        rejected: 'text-rose-500',
        error: 'text-red-500',
        warning: 'text-amber-500',
    }[type];

    return (
        <div
            className={`
                flex items-center gap-1.5 
                px-2.5 py-1.5 
                rounded-full border
                text-xs font-medium
                shadow-sm
                ${colorClasses}
            `}
        >
            <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
            <span className="truncate max-w-[180px]">{reason}</span>
        </div>
    );
});

HangingPill.displayName = 'HangingPill';
