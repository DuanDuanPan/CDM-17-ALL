'use client';

/**
 * Story 5.2: Mini Tree Preview Component
 * Displays a simplified visual representation of template structure.
 * Used in sidebar template cards for quick structure overview.
 */

import type { TemplateStructure, TemplateNode } from '@cdm/types';

export interface MiniTreePreviewProps {
    structure: TemplateStructure;
    /** Maximum depth to display (default: 2) */
    maxDepth?: number;
    /** Maximum children per level to display (default: 3) */
    maxChildren?: number;
}

/**
 * Count total nodes in a template structure
 */
function countNodes(node: TemplateNode): number {
    let count = 1;
    if (node.children) {
        for (const child of node.children) {
            count += countNodes(child);
        }
    }
    return count;
}

/**
 * Get node type color for mini preview dots
 */
function getNodeColor(type?: string): string {
    switch (type) {
        case 'TASK':
            return 'bg-green-400';
        case 'REQUIREMENT':
            return 'bg-purple-400';
        case 'PBS':
            return 'bg-blue-400';
        case 'DATA':
            return 'bg-yellow-400';
        case 'APP':
            return 'bg-cyan-400';
        default:
            return 'bg-gray-400';
    }
}

/**
 * Render a single node dot with connection lines
 */
function MiniNode({
    node,
    depth,
    maxDepth,
    maxChildren,
    isLast: _isLast,
    siblingIndex,
}: {
    node: TemplateNode;
    depth: number;
    maxDepth: number;
    maxChildren: number;
    isLast: boolean;
    siblingIndex: number;
}) {
    const hasChildren = node.children && node.children.length > 0;
    const visibleChildren = hasChildren
        ? node.children!.slice(0, maxChildren)
        : [];
    const hasMoreChildren =
        hasChildren && node.children!.length > maxChildren;
    const showChildren = depth < maxDepth && visibleChildren.length > 0;

    return (
        <div className="flex items-start">
            {/* Connection line from parent */}
            {depth > 0 && (
                <div className="flex flex-col items-center mr-1">
                    <div
                        className={`w-px h-2 ${siblingIndex === 0 ? 'bg-transparent' : 'bg-gray-300'}`}
                    />
                    <div className="w-2 h-px bg-gray-300" />
                </div>
            )}

            <div className="flex flex-col">
                {/* Node dot */}
                <div className="flex items-center gap-1">
                    <div
                        className={`w-2 h-2 rounded-full ${getNodeColor(node.type)}`}
                        title={node.label}
                    />
                    {/* Show truncated label only for root */}
                    {depth === 0 && (
                        <span className="text-[10px] text-gray-500 truncate max-w-[60px]">
                            {node.label}
                        </span>
                    )}
                </div>

                {/* Children */}
                {showChildren && (
                    <div className="ml-1 mt-0.5 pl-1 border-l border-gray-200">
                        {visibleChildren.map((child, index) => (
                            <MiniNode
                                key={child._tempId || index}
                                node={child}
                                depth={depth + 1}
                                maxDepth={maxDepth}
                                maxChildren={maxChildren}
                                isLast={index === visibleChildren.length - 1}
                                siblingIndex={index}
                            />
                        ))}
                        {hasMoreChildren && (
                            <div className="text-[8px] text-gray-400 ml-3">
                                +{node.children!.length - maxChildren}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function MiniTreePreview({
    structure,
    maxDepth = 2,
    maxChildren = 3,
}: MiniTreePreviewProps) {
    const nodeCount = countNodes(structure.rootNode);

    return (
        <div className="py-1">
            <MiniNode
                node={structure.rootNode}
                depth={0}
                maxDepth={maxDepth}
                maxChildren={maxChildren}
                isLast={true}
                siblingIndex={0}
            />
            <div className="text-[9px] text-gray-400 mt-1">
                {nodeCount} 个节点
            </div>
        </div>
    );
}

export default MiniTreePreview;
