'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import type { MindNodeData } from '@cdm/types';

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
}

/**
 * Ordinary node renderer.
 * Story 7.4: Extracted from MindNode for single responsibility.
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
}: OrdinaryNodeProps) {
    return (
        <div
            ref={containerRef}
            className={`${containerClasses} relative`}
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

            {isEditing ? (
                <input
                    ref={titleInputRef}
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
                <span className="text-sm font-medium text-gray-700 text-center break-words w-full">
                    {label || 'New Topic'}
                </span>
            )}
        </div>
    );
}
