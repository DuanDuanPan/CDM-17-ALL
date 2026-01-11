'use client';

/**
 * ColorBar Component
 *
 * Story 9.4 Task 2.4: Displays color scale legend for contour preview.
 * Shows gradient visualization with min/max labels.
 */

import * as React from 'react';
import { cn } from '@cdm/ui';

export type ColorMapType = 'rainbow' | 'jet' | 'coolwarm';

export interface ColorBarProps {
    /** Color map preset */
    colorMap: ColorMapType;
    /** Minimum scalar value */
    minValue: number;
    /** Maximum scalar value */
    maxValue: number;
    /** Optional unit label (e.g., "°C", "MPa") */
    unit?: string;
    /** Additional CSS classes */
    className?: string;
}

/** Color stops for each preset */
const COLOR_MAP_GRADIENTS: Record<ColorMapType, string> = {
    rainbow: 'linear-gradient(to top, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
    jet: 'linear-gradient(to top, #000080, #0000ff, #00ffff, #ffff00, #ff0000, #800000)',
    coolwarm: 'linear-gradient(to top, #3b4cc0, #7699ea, #b3cce4, #f7c4a5, #e97660, #b40426)',
};

/**
 * Color legend bar showing gradient and value range.
 */
export function ColorBar({
    colorMap,
    minValue,
    maxValue,
    unit = '',
    className,
}: ColorBarProps) {
    const gradient = COLOR_MAP_GRADIENTS[colorMap] || COLOR_MAP_GRADIENTS.rainbow;

    // Calculate intermediate values for labels
    const range = maxValue - minValue;
    const q1 = minValue + range * 0.25;
    const median = minValue + range * 0.5;
    const q3 = minValue + range * 0.75;

    const formatValue = (val: number) => {
        if (Math.abs(val) >= 1000 || (Math.abs(val) < 0.01 && val !== 0)) {
            return val.toExponential(1);
        }
        return val.toFixed(2);
    };

    return (
        <div
            className={cn(
                'flex items-center gap-2 select-none',
                className
            )}
            data-testid="colorbar"
        >
            {/* Value labels */}
            <div className="flex flex-col justify-between h-[200px] text-[10px] text-gray-300 tabular-nums">
                <span>{formatValue(maxValue)}{unit && <span className="text-gray-500 ml-0.5">{unit}</span>}</span>
                <span>{formatValue(q3)}</span>
                <span>{formatValue(median)}</span>
                <span>{formatValue(q1)}</span>
                <span>{formatValue(minValue)}{unit && <span className="text-gray-500 ml-0.5">{unit}</span>}</span>
            </div>

            {/* Gradient bar */}
            <div
                className="w-4 h-[200px] rounded border border-gray-600"
                style={{ background: gradient }}
                data-testid="colorbar-gradient"
            />
        </div>
    );
}
