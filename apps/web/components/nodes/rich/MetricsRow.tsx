'use client';

import { memo } from 'react';

export interface MetricsRowProps {
    /** Flexible content for metrics display */
    children: React.ReactNode;
}

/**
 * MetricsRow - Dashboard-style metrics container
 * Auto height based on content
 */
export const MetricsRow = memo(({ children }: MetricsRowProps) => {
    if (!children) return null;

    return <div className="w-full mt-1.5">{children}</div>;
});

MetricsRow.displayName = 'MetricsRow';
