'use client';

import { memo } from 'react';

export interface FooterProps {
    /** Left content (typically avatar/owner) */
    leftContent?: React.ReactNode;
    /** Right content (typically badges/status) */
    rightContent?: React.ReactNode;
}

/**
 * Footer - Bottom row with owner and status information
 * 32px height, border-top separator
 */
export const Footer = memo(({ leftContent, rightContent }: FooterProps) => {
    return (
        <div className="w-full flex items-center justify-between h-8 pt-1.5 mt-1.5 border-t border-gray-100">
            {/* Left: Owner/Avatar */}
            <div className="flex items-center gap-1 overflow-hidden min-w-0">{leftContent}</div>

            {/* Right: Status/Badges */}
            <div className="flex items-center gap-1 flex-shrink-0">{rightContent}</div>
        </div>
    );
});

Footer.displayName = 'Footer';
