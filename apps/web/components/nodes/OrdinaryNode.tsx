'use client';

import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import type { MindNodeData } from '@cdm/types';
import type { LODLevel } from '@/lib/semanticZoomLOD';

export interface OrdinaryNodeProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    containerClasses: string;
    titleMeasureRef: React.RefObject<HTMLDivElement | null>;
    titleInputRef: React.RefObject<HTMLInputElement | null>;
    label: string;
    setLabel: (label: string) => void;
    isEditing: boolean;
    isWatched: boolean;
    getData: () => MindNodeData;
    commit: () => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    startEditing: () => void;
    /** Story 8.8: LOD level for semantic zoom */
    lod?: LODLevel;
}

/**
 * Ordinary node renderer.
 * Story 7.4: Extracted from MindNode for single responsibility.
 * Story 8.8: Added LOD support for semantic zoom.
 */
export function OrdinaryNode({
    containerRef,
    containerClasses,
    titleMeasureRef,
    titleInputRef,
    label,
    setLabel,
    isEditing,
    isWatched,
    getData,
    commit,
    handleKeyDown,
    startEditing,
    lod = 'full',
}: OrdinaryNodeProps) {
    const isMicroTarget = lod === 'micro';

    // Story 8.8: LOD transition styles
    const transitionClasses = 'transition-[opacity,transform] duration-200 motion-reduce:transition-none';
    const visibleClasses = 'opacity-100 scale-100';
    const hiddenClasses = 'opacity-0 scale-[0.98] pointer-events-none';
    const ANIMATION_DURATION_MS = 200;

    // Crossfade title ↔ micro marker (AC2 + AC4)
    const [renderMicro, setRenderMicro] = useState(isMicroTarget);
    const [renderTitle, setRenderTitle] = useState(!isMicroTarget);

    useEffect(() => {
        if (isMicroTarget) {
            setRenderMicro(true);
            const timeout = window.setTimeout(() => setRenderTitle(false), ANIMATION_DURATION_MS);
            return () => window.clearTimeout(timeout);
        }

        setRenderTitle(true);
        const timeout = window.setTimeout(() => setRenderMicro(false), ANIMATION_DURATION_MS);
        return () => window.clearTimeout(timeout);
    }, [isMicroTarget]);

    return (
        <div
            ref={containerRef}
            className={`${containerClasses} relative ${transitionClasses}`}
            onDoubleClick={startEditing}
        >
            {/* Story 4.4: Subscription indicator badge */}
            {isWatched && (
                <div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm z-10"
                    title="已关注"
                >
                    <Eye className="w-2.5 h-2.5 text-white" />
                </div>
            )}

            {/* Measure element for auto-resize */}
            <div
                ref={titleMeasureRef}
                className="absolute opacity-0 pointer-events-none text-sm font-medium px-2 text-center w-full break-words"
            >
                {label || 'New Topic'}
            </div>

            <div className="grid w-full">
                {/* Story 8.8: Micro mode - show color block only (AC2) */}
                {renderMicro && (
                    <div
                        data-testid="mind-node-micro"
                        className={`col-start-1 row-start-1 w-full h-full min-h-[24px] rounded bg-primary ${transitionClasses} ${isMicroTarget ? visibleClasses : hiddenClasses}`}
                        title={label || 'New Topic'}
                    />
                )}

                {/* Title view (Full/Compact) */}
                {renderTitle && (
                    <div
                        className={`col-start-1 row-start-1 w-full ${transitionClasses} ${isMicroTarget ? hiddenClasses : visibleClasses}`}
                    >
                        {isEditing ? (
                            <input
                                ref={titleInputRef}
                                data-testid="mind-node-title"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                onBlur={() => {
                                    if (getData().isEditing) commit();
                                }}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-transparent text-center text-sm font-medium text-gray-900 outline-none placeholder-gray-300"
                                placeholder="New Topic"
                            />
                        ) : (
                            <span
                                data-testid="mind-node-title"
                                className="text-sm font-medium text-gray-700 text-center break-words w-full"
                            >
                                {label || 'New Topic'}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
