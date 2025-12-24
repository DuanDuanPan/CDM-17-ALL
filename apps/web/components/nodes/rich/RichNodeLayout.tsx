'use client';

import { memo, type ReactNode } from 'react';
import { StatusHeader } from './StatusHeader';

export interface RichNodeLayoutProps {
    /** Header color (from renderer) */
    headerColor: string;
    /** Header pattern (solid or striped) */
    headerPattern?: 'solid' | 'striped';
    /** Whether node is selected */
    isSelected?: boolean;
    /** Node type for shadow styling */
    nodeType?: string;
    /** Children components (TitleRow, MetricsRow, Footer) */
    children: ReactNode;
    /** Optional hanging pill for rejected status */
    hangingPill?: ReactNode;
    /** Double click handler */
    onDoubleClick?: () => void;
    /** Mouse event handlers */
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

/**
 * RichNodeLayout - 4-layer container for all rich nodes
 * Provides unified structure: Header → Title → Metrics → Footer
 */
export const RichNodeLayout = memo(
    ({
        headerColor,
        headerPattern = 'solid',
        isSelected = false,
        nodeType,
        children,
        hangingPill,
        onDoubleClick,
        onMouseEnter,
        onMouseLeave,
    }: RichNodeLayoutProps) => {
        // Container classes with selection
        return (
            <div
                className={`
        relative w-full h-full
        rounded-lg overflow-hidden
        transition-all duration-200
        ${isSelected
                        ? 'ring-2 ring-blue-500 shadow-lg'
                        : 'shadow-sm hover:shadow-md'
                    }
      `}
                onDoubleClick={onDoubleClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {/* Status Header - 6px colored bar */}
                <StatusHeader color={headerColor} pattern={headerPattern} />

                {/* Main Content Area with proper padding */}
                <div className="bg-white px-3 py-2 space-y-2">
                    {children}
                </div>

                {/* Hanging Pill (for rejected/error states) */}
                {hangingPill && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        {hangingPill}
                    </div>
                )}
            </div>
        );
    }
);

RichNodeLayout.displayName = 'RichNodeLayout';
