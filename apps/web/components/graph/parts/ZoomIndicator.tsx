'use client';

/**
 * Story 8.3: Zoom Level Indicator Component (AC6)
 *
 * Displays current zoom percentage in bottom-right corner (above minimap).
 * Clicking resets zoom to 100%.
 * Uses glassmorphism styling consistent with MinimapContainer.
 */

import { Button, cn } from '@cdm/ui';
import { ZoomIn } from 'lucide-react';

export interface ZoomIndicatorProps {
    /** Current zoom level (1.0 = 100%) */
    zoom: number;
    /** Callback to reset zoom to 100% */
    onReset: () => void;
    /** Whether the graph is ready for interaction */
    disabled?: boolean;
    className?: string;
}

/**
 * Zoom level indicator with glassmorphism styling.
 * Position: Fixed bottom-right, above minimap (bottom-[210px]).
 */
export function ZoomIndicator({ zoom, onReset, disabled = false, className }: ZoomIndicatorProps) {
    const percentage = Math.round(zoom * 100);

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={disabled}
            data-testid="zoom-indicator"
            aria-label={`当前缩放 ${percentage}%，点击重置为 100%`}
            title="点击重置为 100%"
            className={cn(
                "min-w-[48px] px-2 py-1",
                "bg-background/80 backdrop-blur-sm",
                "border border-border/50 rounded-md",
                "text-xs tabular-nums text-muted-foreground",
                "hover:bg-muted/50 cursor-pointer",
                "transition-colors duration-150",
                className
            )}
        >
            <ZoomIn className="w-3.5 h-3.5 mr-1.5" />
            <span>{percentage}%</span>
        </Button>
    );
}

export default ZoomIndicator;
