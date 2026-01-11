'use client';

/**
 * ContourViewerModal Component
 *
 * Story 9.4 Task 2.5: Full-screen modal for contour/scalar field preview.
 * Integrates ContourViewer with ColorScaleControl and ColorBar.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, cn } from '@cdm/ui';
import { ContourViewer, type ContourViewerControls } from './ContourViewer';
import { ColorScaleControl } from './ColorScaleControl';
import { ColorBar } from './ColorBar';

export interface ContourViewerModalProps {
    /** Whether modal is open */
    isOpen: boolean;
    /** Close callback */
    onClose: () => void;
    /** URL to contour data */
    assetUrl: string;
    /** Asset name for title */
    assetName?: string;
}

/**
 * Full-screen modal for contour visualization.
 * Features floating control panel and color legend.
 */
export function ContourViewerModal({
    isOpen,
    onClose,
    assetUrl,
    assetName = 'Contour Preview',
}: ContourViewerModalProps) {
    const [controls, setControls] = React.useState<ContourViewerControls | null>(null);

    // Reset controls when assetUrl changes or modal closes to prevent stale controls flash
    React.useEffect(() => {
        setControls(null);
    }, [assetUrl, isOpen]);

    // Handle ESC to close
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm isolate" data-testid="contour-viewer-modal">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-gray-900/90 to-transparent">
                <h2 className="text-lg font-semibold text-white truncate max-w-[60%]">
                    {assetName}
                </h2>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-gray-300 hover:text-white hover:bg-white/10"
                    data-testid="close-button"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Viewer */}
            <ContourViewer
                dataUrl={assetUrl}
                className="w-full h-full"
                onControlsReady={setControls}
            />

            {/* Right-side Controls Panel */}
            {controls && (
                <div className="absolute top-20 right-6 z-20">
                    <ColorScaleControl
                        colorMap={controls.colorMap}
                        onColorMapChange={controls.setColorMap}
                        minValue={controls.range.min}
                        maxValue={controls.range.max}
                        onRangeChange={controls.setRange}
                    />
                </div>
            )}

            {/* Color Bar Legend */}
            {controls && (
                <div
                    className={cn(
                        'absolute right-6 top-1/2 -translate-y-1/2 z-10'
                    )}
                >
                    <ColorBar
                        colorMap={controls.colorMap}
                        minValue={controls.range.min}
                        maxValue={controls.range.max}
                        unit={controls.unit || undefined}
                    />
                </div>
            )}
        </div>
    );

    return typeof window !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null;
}
