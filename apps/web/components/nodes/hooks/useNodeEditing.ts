'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Node } from '@antv/x6';
import type { MindNodeData } from '@cdm/types';
import { updateNode } from '@/lib/api/nodes';

type MindNodeOperation = 'addChild' | 'addSibling';

function dispatchNodeOperation(el: HTMLElement, action: MindNodeOperation, nodeId: string) {
    el.dispatchEvent(
        new CustomEvent('mindmap:node-operation', {
            bubbles: true,
            detail: { action, nodeId },
        })
    );
}

function dispatchBatchStop(el: HTMLElement, nodeId: string) {
    el.dispatchEvent(
        new CustomEvent('mindmap:batch-stop', {
            bubbles: true,
            detail: { nodeId },
        })
    );
}

export interface UseNodeEditingOptions {
    node: Node;
    getData: () => MindNodeData;
    label: string;
    description: string;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseNodeEditingReturn {
    titleInputRef: React.RefObject<HTMLInputElement>;
    descInputRef: React.RefObject<HTMLInputElement>;
    /** Start editing the node */
    startEditing: () => void;
    /** Commit changes */
    commit: () => void;
    /** Cancel editing */
    cancel: () => void;
    /** Handle keyboard events during editing */
    handleKeyDown: (e: React.KeyboardEvent) => void;
    /** Focus graph container */
    focusGraphContainer: () => void;
}

/**
 * Hook to manage node editing operations.
 * Story 7.4: Extracted from MindNode for single responsibility.
 */
export function useNodeEditing({
    node,
    getData,
    label,
    description,
    isEditing,
    setIsEditing,
    containerRef,
}: UseNodeEditingOptions): UseNodeEditingReturn {
    const titleInputRef = useRef<HTMLInputElement>(null);
    const descInputRef = useRef<HTMLInputElement>(null);

    const focusGraphContainer = useCallback(() => {
        const el = document.getElementById('graph-container') as HTMLElement | null;
        el?.focus();
        requestAnimationFrame(() => {
            document.getElementById('graph-container')?.focus();
        });
    }, []);

    const startEditing = useCallback(() => {
        const prevData = getData();
        setIsEditing(true);
        node.setData({ ...prevData, isEditing: true } as Partial<MindNodeData>);
    }, [getData, node, setIsEditing]);

    const commit = useCallback(() => {
        const el = containerRef.current;
        if (el) {
            dispatchBatchStop(el, node.id);
        }

        const prevData = getData();
        const labelChanged = label !== prevData.label;
        const descriptionChanged = description !== (prevData.description ?? '');

        node.setData({
            ...prevData,
            label,
            description,
            isEditing: false,
            updatedAt: new Date().toISOString(),
        } as Partial<MindNodeData>);
        setIsEditing(false);

        if ((labelChanged || descriptionChanged) && node.id) {
            const payload: { label?: string; description?: string } = {};
            if (labelChanged) payload.label = label;
            if (descriptionChanged) payload.description = description;

            updateNode(node.id, payload).catch((err) => {
                console.error('[MindNode] Failed to sync node to database:', err);
            });
        }
    }, [node, label, description, getData, containerRef, setIsEditing]);

    const cancel = useCallback(() => {
        const el = containerRef.current;
        if (el) {
            dispatchBatchStop(el, node.id);
        }

        const d = getData();
        node.setData({ ...d, isEditing: false } as Partial<MindNodeData>);
        setIsEditing(false);
    }, [getData, node, containerRef, setIsEditing]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                commit();
                focusGraphContainer();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                cancel();
                focusGraphContainer();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                commit();
                const el = containerRef.current;
                if (el) dispatchNodeOperation(el, 'addChild', node.id);
                focusGraphContainer();
            }
        },
        [commit, cancel, focusGraphContainer, containerRef, node.id]
    );

    // Focus management
    useEffect(() => {
        if (!isEditing) return;

        const focusTitleInput = () => {
            const input = titleInputRef.current;
            if (!input) return;
            input.focus();
            input.select();
        };

        focusTitleInput();
        const raf = requestAnimationFrame(focusTitleInput);
        return () => cancelAnimationFrame(raf);
    }, [isEditing]);

    return {
        titleInputRef: titleInputRef as React.RefObject<HTMLInputElement>,
        descInputRef: descInputRef as React.RefObject<HTMLInputElement>,
        startEditing,
        commit,
        cancel,
        handleKeyDown,
        focusGraphContainer,
    };
}

export { dispatchNodeOperation, dispatchBatchStop };
