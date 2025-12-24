'use client';

import { memo } from 'react';

export interface StatusHeaderProps {
    /** Primary color for the header bar */
    color: string;
    /** Visual pattern: solid or striped (for pending status) */
    pattern?: 'solid' | 'striped';
}

/**
 * StatusHeader - 6px colored bar at the top of Rich Nodes
 * Indicates node type or status through color and pattern
 */
export const StatusHeader = memo(({ color, pattern = 'solid' }: StatusHeaderProps) => {
    if (pattern === 'striped') {
        // Striped pattern for pending/warning states
        return (
            <div
                className="h-1.5 w-full rounded-t-lg"
                style={{
                    background: `repeating-linear-gradient(
            45deg,
            ${color},
            ${color} 6px,
            ${adjustColorBrightness(color, 20)} 6px,
            ${adjustColorBrightness(color, 20)} 12px
          )`,
                }}
            />
        );
    }

    // Solid color header
    return (
        <div
            className="h-1.5 w-full rounded-t-lg"
            style={{ backgroundColor: color }}
        />
    );
});

StatusHeader.displayName = 'StatusHeader';

/**
 * Helper: Adjust color brightness for striped pattern
 */
function adjustColorBrightness(hex: string, percent: number): string {
    // Simple brightness adjustment (for striped effect)
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return `#${(
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
        .toString(16)
        .slice(1)}`;
}
