'use client';

import * as React from 'react';
import { cn } from './utils';

/**
 * Inline ChevronDown icon SVG
 * Matches lucide-react ChevronDown for consistency
 */
function ChevronDownIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

/**
 * Story 8.1: CollapseToggle Component
 * 
 * Atomic component for node collapse/expand toggle button.
 * Follows design spec:
 * - 16x16px icon, 24x24px click area
 * - ChevronDown rotates -90deg when collapsed
 * - Glassmorphism hover effect
 */
export interface CollapseToggleProps {
    /** Whether the node is collapsed */
    isCollapsed: boolean;
    /** Number of children (for aria-label) */
    childCount: number;
    /** Toggle callback */
    onToggle: () => void;
    /** Additional class names */
    className?: string;
    /** Disable the toggle */
    disabled?: boolean;
}

export function CollapseToggle({
    isCollapsed,
    childCount,
    onToggle,
    className,
    disabled = false,
}: CollapseToggleProps) {
    const handleClick = React.useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            if (!disabled) {
                onToggle();
            }
        },
        [onToggle, disabled]
    );

    const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                if (!disabled) {
                    onToggle();
                }
            }
        },
        [onToggle, disabled]
    );

    return (
        <button
            type="button"
            data-testid="collapse-toggle"
            aria-expanded={!isCollapsed}
            aria-label={
                isCollapsed
                    ? `展开 ${childCount} 个子节点`
                    : `折叠 ${childCount} 个子节点`
            }
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
                // Base styles
                'flex items-center justify-center',
                'w-6 h-6', // 24px hit area
                'rounded-sm',
                // Colors
                'text-muted-foreground',
                'hover:bg-muted/80 hover:backdrop-blur-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                // Transition
                'transition-all duration-200 ease-out',
                // Disabled state
                'disabled:opacity-50 disabled:cursor-not-allowed',
                className
            )}
        >
            <ChevronDownIcon
                className={cn(
                    'w-4 h-4', // 16px icon
                    'transition-transform duration-200 ease-out',
                    isCollapsed && '-rotate-90'
                )}
            />
        </button>
    );
}

CollapseToggle.displayName = 'CollapseToggle';

