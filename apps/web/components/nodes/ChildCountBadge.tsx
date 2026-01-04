'use client';

import * as React from 'react';
import { cn } from '@cdm/ui';

/**
 * Story 8.1: ChildCountBadge Component
 * 
 * Displays the count of hidden children when a node is collapsed.
 * Follows design spec:
 * - Glassmorphism: bg-primary/10 backdrop-blur-sm
 * - Format: +{count}, +99+ for > 99
 * - Positioned to right of collapsed node
 * - Clickable to expand
 */
export interface ChildCountBadgeProps {
    /** Number of hidden descendants */
    count: number;
    /** Click handler to expand */
    onClick: () => void;
    /** Additional class names */
    className?: string;
}

export function ChildCountBadge({
    count,
    onClick,
    className,
}: ChildCountBadgeProps) {
    const displayCount = count > 99 ? '99+' : String(count);

    const handleClick = React.useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            onClick();
        },
        [onClick]
    );

    const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onClick();
            }
        },
        [onClick]
    );

    if (count <= 0) return null;

    return (
        <button
            type="button"
            data-testid="child-count-badge"
            aria-label={`展开 ${count} 个隐藏节点`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={cn(
                // Positioning (applied by parent)
                // Base styles
                'inline-flex items-center justify-center',
                'px-2 py-0.5',
                'rounded-full',
                // Glassmorphism
                'bg-primary/10 backdrop-blur-sm',
                'border border-white/10',
                // Typography
                'text-[11px] font-medium text-primary-foreground',
                // Interactive
                'cursor-pointer',
                'hover:bg-primary/20',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                // Transition
                'transition-colors duration-150',
                className
            )}
        >
            +{displayCount}
        </button>
    );
}

ChildCountBadge.displayName = 'ChildCountBadge';
