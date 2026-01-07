'use client';

/**
 * Story 8.2: Minimap Toggle Button Component
 * AC: #1 (显示/隐藏)
 *
 * Standalone button shown when minimap is hidden.
 * Positioned in bottom-right corner of the graph canvas.
 *
 * Refactoring Compliance: Uses Button from @cdm/ui (ref: refactoring-proposal §1.3)
 */

import { Map } from 'lucide-react';
import { Button, cn } from '@cdm/ui';

export interface MinimapToggleButtonProps {
    onClick: () => void;
    className?: string;
}

/**
 * Toggle button for showing the minimap when hidden.
 * Uses glassmorphism styling consistent with MinimapContainer.
 */
export function MinimapToggleButton({ onClick, className = '' }: MinimapToggleButtonProps) {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            data-testid="minimap-show-button"
            className={cn(
                "absolute bottom-4 right-4 z-50",
                "h-10 w-10",
                "bg-background/80 backdrop-blur-sm",
                "border border-border/50",
                "shadow-lg",
                "hover:bg-muted/50",
                className
            )}
            aria-label="显示小地图"
        >
            <Map className="w-4 h-4 text-muted-foreground" />
        </Button>
    );
}

export default MinimapToggleButton;
