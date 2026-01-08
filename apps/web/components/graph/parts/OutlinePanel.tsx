'use client';

import React, { useCallback, useState } from 'react';
import type { OutlineNode } from '../hooks/useOutlineData';
import { OutlineItem } from './OutlineItem';

/** Drop position relative to target node */
type DropPosition = 'above' | 'below' | 'inside' | null;

interface OutlinePanelProps {
    data: OutlineNode[];
    selectedNodeId: string | null;
    onNodeClick: (nodeId: string) => void;
    onReorder: (nodeId: string, newParentId: string | null, index: number) => void;
}

export function OutlinePanel({
    data,
    selectedNodeId,
    onNodeClick,
    onReorder,
}: OutlinePanelProps) {
    // Local collapse state (independent from canvas collapse)
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    // Drag state
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<DropPosition>(null);

    const toggleCollapse = useCallback((nodeId: string) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    // ═══════════════════════════════════════════════
    // Helper: Find parent and sibling index for a node
    // ═══════════════════════════════════════════════
    const findNodeContext = useCallback((nodeId: string, nodes: OutlineNode[], parentId: string | null = null): {
        parentId: string | null;
        siblingIndex: number;
    } | null => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === nodeId) {
                return { parentId, siblingIndex: i };
            }
            if (nodes[i].children.length > 0) {
                const found = findNodeContext(nodeId, nodes[i].children, nodes[i].id);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // ═══════════════════════════════════════════════
    // Drag Handlers
    // ═══════════════════════════════════════════════
    const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
        setDraggedId(nodeId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', nodeId);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverId(nodeId);

        // Detect drop position based on mouse Y within the element
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;

        if (y < height * 0.25) {
            setDropPosition('above');
        } else if (y > height * 0.75) {
            setDropPosition('below');
        } else {
            setDropPosition('inside');
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetNodeId: string) => {
        e.preventDefault();
        const currentDropPosition = dropPosition;
        setDragOverId(null);
        setDropPosition(null);

        const sourceId = e.dataTransfer.getData('text/plain');
        if (!sourceId || sourceId === targetNodeId) return;

        // Find target node context
        const targetContext = findNodeContext(targetNodeId, data);

        if (currentDropPosition === 'inside') {
            // Move source node to become child of target (index 0)
            onReorder(sourceId, targetNodeId, 0);
        } else if (currentDropPosition === 'above' && targetContext) {
            // Move source to be sibling above target
            onReorder(sourceId, targetContext.parentId, targetContext.siblingIndex);
        } else if (currentDropPosition === 'below' && targetContext) {
            // Move source to be sibling below target
            onReorder(sourceId, targetContext.parentId, targetContext.siblingIndex + 1);
        } else {
            // Fallback: make child
            onReorder(sourceId, targetNodeId, 0);
        }
        setDraggedId(null);
    }, [onReorder, dropPosition, findNodeContext, data]);

    const handleDragEnd = useCallback(() => {
        setDragOverId(null);
        setDraggedId(null);
        setDropPosition(null);
    }, []);

    // ═══════════════════════════════════════════════
    // Recursive render
    // ═══════════════════════════════════════════════
    const renderNode = useCallback((node: OutlineNode): React.ReactNode => {
        const isExpanded = !collapsedIds.has(node.id);
        const isDragging = draggedId === node.id;

        return (
            <div
                key={node.id}
                className={isDragging ? 'opacity-50' : ''}
                onDragEnd={handleDragEnd}
            >
                <OutlineItem
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    isExpanded={isExpanded}
                    onClick={onNodeClick}
                    onToggle={toggleCollapse}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    dragOverId={dragOverId}
                    dropPosition={dragOverId === node.id ? dropPosition : null}
                />
                {isExpanded && node.children.length > 0 && (
                    <div>
                        {node.children.map(renderNode)}
                    </div>
                )}
            </div>
        );
    }, [
        collapsedIds,
        selectedNodeId,
        draggedId,
        dragOverId,
        dropPosition,
        onNodeClick,
        toggleCollapse,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleDragEnd,
    ]);

    return (
        <div className="space-y-0.5" data-testid="outline-panel">
            {data.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">
                    暂无节点
                </p>
            ) : (
                data.map(renderNode)
            )}
        </div>
    );
}
