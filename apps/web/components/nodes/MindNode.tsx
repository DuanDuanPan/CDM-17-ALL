'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Node, Graph } from '@antv/x6';
import {
    NodeType,
    type TaskProps,
    type RequirementProps,
    type PBSProps,
    type DataProps,
    type AppProps,
    type AppExecutionStatus,
    type ApprovalPipeline,
} from '@cdm/types';
import { CollapseToggle } from '@cdm/ui';
import {
    getDirectChildrenByParentId,
    getAllDescendantsByParentId,
} from '@/lib/parentIdUtils';

// Story 7.4: Extracted hooks
import { useNodeDataSync, useAppExecution, useNodeEditing } from './hooks';

// Story 7.4: Extracted configuration
import { getTypeConfig, getApprovalDecoration } from './nodeConfig';

// Story 7.4: Extracted node renderers
import { OrdinaryNode } from './OrdinaryNode';
import { RichNode } from './RichNode';
import { LegacyCardNode } from './LegacyCardNode';
import { getNodeRenderer } from './rich';

// Story 8.1: Child count badge
import { ChildCountBadge } from './ChildCountBadge';

// Story 8.8: Semantic Zoom LOD
import { useLODLevel } from '@/lib/semanticZoomLOD';

export interface MindNodeProps {
    node: Node;
}

export function MindNode({ node }: MindNodeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const titleMeasureRef = useRef<HTMLDivElement>(null);
    const descMeasureRef = useRef<HTMLDivElement>(null);

    // Story 8.8: Get current LOD level from global store (works outside React Context)
    const lod = useLODLevel();

    // Story 7.4: Use extracted hooks
    const {
        getData, isEditing, setIsEditing, isSelected, label, setLabel,
        description, setDescription, tags, appRunning, setAppRunning,
        unreadCount, isWatched, isCollapsed, visibilityBump,
    } = useNodeDataSync(node);

    const { handleAppExecute } = useAppExecution({ node, getData, appRunning, setAppRunning });

    const {
        titleInputRef, descInputRef, startEditing, commit, handleKeyDown,
    } = useNodeEditing({ node, getData, label, description, isEditing, setIsEditing, containerRef });

    // Derived state for styling
    const data = getData();
    const nodeType = data.nodeType || NodeType.ORDINARY;
    const taskProps = data.props as TaskProps | undefined;
    const isTaskDone = nodeType === NodeType.TASK && taskProps?.status === 'done';
    const styles = getTypeConfig(nodeType, isTaskDone);

    // Story 4.1: Approval status decoration
    const approval = data.approval as ApprovalPipeline | undefined;
    const approvalStatus = approval?.status;
    const approvalDecoration = getApprovalDecoration(approvalStatus);

    // Dynamic pills based on props
    let pill = styles.pill;
    if (nodeType === NodeType.REQUIREMENT) {
        const priority = (data.props as RequirementProps)?.priority;
        if (priority) pill = { ...pill!, label: priority.charAt(0).toUpperCase() + priority.slice(1) };
    } else if (nodeType === NodeType.PBS) {
        const pbsProps = data.props as PBSProps;
        const productCode = pbsProps?.productRef?.productCode;
        const version = pbsProps?.version;
        if (productCode) pill = { bg: 'bg-indigo-100', text: 'text-indigo-700', label: productCode };
        else if (version) pill = { ...pill!, label: version };
    } else if (nodeType === NodeType.DATA) {
        const secretLevel = (data.props as DataProps)?.secretLevel;
        if (secretLevel) pill = { ...pill!, label: secretLevel.charAt(0).toUpperCase() + secretLevel.slice(1) };
    } else if (nodeType === NodeType.APP) {
        const appProps = data.props as AppProps;
        const executionStatus: AppExecutionStatus | undefined = appRunning ? 'running' : appProps?.executionStatus;
        const appName = appProps?.libraryAppName;
        if (executionStatus === 'running') pill = { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '执行中' };
        else if (executionStatus === 'success') pill = { bg: 'bg-green-100', text: 'text-green-700', label: '成功' };
        else if (executionStatus === 'error') pill = { bg: 'bg-red-100', text: 'text-red-700', label: '失败' };
        else if (appName) pill = { ...pill!, label: appName };
    }

    // Auto-resize logic
    useLayoutEffect(() => {
        if (!containerRef.current || !node) return;
        // Never measure/resize while the node is hidden (offsetWidth/Height will be 0 and can corrupt size).
        // This is critical for ORDINARY nodes which don't enforce a minimum width.
        if (typeof node.isVisible === 'function' && !node.isVisible()) return;
        const container = containerRef.current;
        const measuredWidth = container.offsetWidth;
        const measuredHeight = container.offsetHeight;
        const renderer = getNodeRenderer(nodeType);
        const currentSize = node.getSize();

        if (renderer) {
            const RICH_NODE_WIDTH = 240;
            const minHeight = 100;
            const newHeight = measuredHeight > 0
                ? Math.max(measuredHeight + 8, minHeight)
                : Math.max(currentSize.height, minHeight);
            if (currentSize.width !== RICH_NODE_WIDTH || Math.abs(currentSize.height - newHeight) > 2) {
                node.resize(RICH_NODE_WIDTH, newHeight);
            }
        } else {
            const resolvedWidth = measuredWidth > 0 ? measuredWidth : currentSize.width;
            const defaultWidth = nodeType === NodeType.ORDINARY ? 160 : 180;
            const baseWidth = resolvedWidth > 0 ? resolvedWidth : defaultWidth;
            const newWidth = nodeType === NodeType.ORDINARY ? baseWidth : Math.max(baseWidth, 180);

            const resolvedHeight = measuredHeight > 0 ? measuredHeight : currentSize.height;
            const minHeight = nodeType === NodeType.ORDINARY ? 40 : 80;
            const newHeight = Math.max(resolvedHeight > 0 ? resolvedHeight : minHeight, minHeight);
            if (Math.abs(currentSize.width - newWidth) > 2 || Math.abs(currentSize.height - newHeight) > 2) {
                node.resize(newWidth, newHeight);
            }
        }
    }, [node, label, description, tags, nodeType, visibilityBump]);

    // Story 4.3: Open comments panel
    const handleOpenComments = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            window.dispatchEvent(
                new CustomEvent('mindmap:open-comments', { detail: { nodeId: node.id, nodeLabel: label } })
            );
        },
        [node.id, label]
    );

    const graph = node.model?.graph as Graph | undefined;

    // Story 8.10: Ensure the node UI reacts to parentId changes (e.g. child added/removed)
    // Without this, child count / collapse toggle can become stale when children change.
    const [, bumpParentIdRevision] = useState(0);
    useEffect(() => {
        if (!graph) return;

        const bumpIfRelevant = ({
            node: changedNode,
            current,
            previous,
        }: {
            node: Node;
            current?: unknown;
            previous?: unknown;
        }) => {
            const currentData = (current ?? changedNode.getData() ?? {}) as {
                parentId?: string;
            } | null;
            const previousData = (previous ?? {}) as { parentId?: string } | null;

            const currentParentId = currentData?.parentId;
            const previousParentId = previousData?.parentId;

            const shouldBump =
                // This node's own data changed
                changedNode.id === node.id ||
                // This node gained or lost a child (child parentId changed to/from this node)
                currentParentId === node.id ||
                previousParentId === node.id;

            if (shouldBump) {
                bumpParentIdRevision((v) => v + 1);
            }
        };

        graph.on('node:change:data', bumpIfRelevant);
        graph.on('node:added', bumpIfRelevant);
        graph.on('node:removed', bumpIfRelevant);

        return () => {
            graph.off('node:change:data', bumpIfRelevant);
            graph.off('node:added', bumpIfRelevant);
            graph.off('node:removed', bumpIfRelevant);
        };
    }, [graph, node.id]);

    // Story 8.10: Get child count from node's graph (parentId-based)
    const childCount = (() => {
        if (!graph) return 0;
        const children = getDirectChildrenByParentId(graph, node.id);
        return children.length;
    })();

    const hasChildren = childCount > 0;

    // Story 8.10: Get hidden descendant count for collapsed node (parentId-based)
    const hiddenDescendantCount = (() => {
        if (!isCollapsed) return 0;
        if (!graph) return 0;
        const descendants = getAllDescendantsByParentId(graph, node.id);
        return descendants.length;
    })();

    // Story 8.1: Handle collapse toggle
    const handleToggleCollapse = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            window.dispatchEvent(
                new CustomEvent('mindmap:toggle-collapse', { detail: { nodeId: node.id } })
            );
        },
        [node.id]
    );

    // Story 8.1: Handle expand (click on badge)
    const handleExpand = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            window.dispatchEvent(
                new CustomEvent('mindmap:expand-node', { detail: { nodeId: node.id } })
            );
        },
        [node.id]
    );

    // Container classes
    const containerClasses = `
        relative flex flex-col w-full h-full transition-all duration-200 backdrop-blur-sm
        ${approvalDecoration
            ? `${approvalDecoration.containerClass} ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}`
            : `${styles.bgColor} ${isSelected ? 'ring-2 ring-blue-500 border-transparent z-10' : `border ${styles.borderColor}`}`
        }
        ${isSelected && !approvalDecoration ? 'shadow-md scale-[1.01]' : 'shadow-sm hover:shadow-md'}
        ${nodeType === NodeType.ORDINARY ? 'rounded px-3 py-1.5 items-center justify-center' : 'rounded-lg p-2 justify-between'}
    `;

    // 1. ORDINARY NODE
    if (nodeType === NodeType.ORDINARY) {
        return (
            <div className="relative" data-testid="mind-node" data-lod={lod}>
                {/* Story 8.1: Collapse toggle for nodes with children */}
                {hasChildren && (
                    <div className="absolute -left-7 top-1/2 -translate-y-1/2 z-10">
                        <CollapseToggle
                            isCollapsed={isCollapsed}
                            childCount={childCount}
                            onToggle={handleToggleCollapse}
                        />
                    </div>
                )}
                {/* Story 8.1: Hidden count badge for collapsed nodes */}
                {isCollapsed && hiddenDescendantCount > 0 && (
                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 z-10">
                        <ChildCountBadge count={hiddenDescendantCount} onClick={handleExpand} />
                    </div>
                )}
                <OrdinaryNode
                    containerRef={containerRef}
                    containerClasses={containerClasses}
                    titleMeasureRef={titleMeasureRef}
                    titleInputRef={titleInputRef}
                    label={label}
                    setLabel={setLabel}
                    isEditing={isEditing}
                    isWatched={isWatched}
                    getData={getData}
                    commit={commit}
                    handleKeyDown={handleKeyDown}
                    startEditing={startEditing}
                    lod={lod}
                />
            </div>
        );
    }

    // 2. RICH NODE (PBS, Task, Requirement, App, Data with renderer)
    const renderer = getNodeRenderer(nodeType);
    if (renderer) {
        return (
            <div className="relative" data-testid="mind-node" data-lod={lod}>
                {/* Story 8.1: Collapse toggle for nodes with children */}
                {hasChildren && (
                    <div className="absolute -left-7 top-1/2 -translate-y-1/2 z-10">
                        <CollapseToggle
                            isCollapsed={isCollapsed}
                            childCount={childCount}
                            onToggle={handleToggleCollapse}
                        />
                    </div>
                )}
                {/* Story 8.1: Hidden count badge for collapsed nodes */}
                {isCollapsed && hiddenDescendantCount > 0 && (
                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 z-10">
                        <ChildCountBadge count={hiddenDescendantCount} onClick={handleExpand} />
                    </div>
                )}
                <RichNode
                    containerRef={containerRef}
                    titleMeasureRef={titleMeasureRef}
                    titleInputRef={titleInputRef}
                    nodeId={node.id}
                    nodeType={nodeType}
                    data={data}
                    label={label}
                    setLabel={setLabel}
                    tags={tags}
                    isEditing={isEditing}
                    isSelected={isSelected}
                    isWatched={isWatched}
                    isTaskDone={isTaskDone}
                    appRunning={appRunning}
                    unreadCount={unreadCount}
                    approval={approval}
                    approvalStatus={approvalStatus}
                    approvalDecoration={approvalDecoration}
                    pill={pill}
                    handleKeyDown={handleKeyDown}
                    handleAppExecute={handleAppExecute}
                    handleOpenComments={handleOpenComments}
                    startEditing={startEditing}
                    lod={lod}
                />
            </div>
        );
    }

    // 3. LEGACY CARD NODE
    return (
        <div className="relative" data-testid="mind-node" data-lod={lod}>
            {/* Story 8.1: Collapse toggle for nodes with children */}
            {hasChildren && (
                <div className="absolute -left-7 top-1/2 -translate-y-1/2 z-10">
                    <CollapseToggle
                        isCollapsed={isCollapsed}
                        childCount={childCount}
                        onToggle={handleToggleCollapse}
                    />
                </div>
            )}
            {/* Story 8.1: Hidden count badge for collapsed nodes */}
            {isCollapsed && hiddenDescendantCount > 0 && (
                <div className="absolute -right-10 top-1/2 -translate-y-1/2 z-10">
                    <ChildCountBadge count={hiddenDescendantCount} onClick={handleExpand} />
                </div>
            )}
            <LegacyCardNode
                containerRef={containerRef}
                containerClasses={containerClasses}
                titleMeasureRef={titleMeasureRef}
                descMeasureRef={descMeasureRef}
                titleInputRef={titleInputRef}
                descInputRef={descInputRef}
                nodeId={node.id}
                nodeType={nodeType}
                label={label}
                setLabel={setLabel}
                description={description}
                setDescription={setDescription}
                tags={tags}
                isEditing={isEditing}
                isWatched={isWatched}
                isTaskDone={isTaskDone}
                appRunning={appRunning}
                unreadCount={unreadCount}
                styles={styles}
                pill={pill}
                approvalDecoration={approvalDecoration}
                taskProps={taskProps}
                commit={commit}
                handleKeyDown={handleKeyDown}
                handleAppExecute={handleAppExecute}
                handleOpenComments={handleOpenComments}
                startEditing={startEditing}
                lod={lod}
            />
        </div>
    );
}
