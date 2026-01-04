'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Node, Graph, Edge } from '@antv/x6';
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
import { isDependencyEdge } from '@/lib/edgeValidation';

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

export interface MindNodeProps {
    node: Node;
}

export function MindNode({ node }: MindNodeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const titleMeasureRef = useRef<HTMLDivElement>(null);
    const descMeasureRef = useRef<HTMLDivElement>(null);

    // Story 7.4: Use extracted hooks
    const {
        getData, isEditing, setIsEditing, isSelected, label, setLabel,
        description, setDescription, tags, appRunning, setAppRunning,
        unreadCount, isWatched, isCollapsed,
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
        const container = containerRef.current;
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        const renderer = getNodeRenderer(nodeType);

        if (renderer) {
            const RICH_NODE_WIDTH = 240;
            const minHeight = 100;
            const newHeight = Math.max(height + 8, minHeight);
            const currentSize = node.getSize();
            if (currentSize.width !== RICH_NODE_WIDTH || Math.abs(currentSize.height - newHeight) > 2) {
                node.resize(RICH_NODE_WIDTH, newHeight);
            }
        } else {
            const newWidth = nodeType === NodeType.ORDINARY ? width : Math.max(width, 180);
            const newHeight = Math.max(height, nodeType === NodeType.ORDINARY ? 40 : 80);
            const currentSize = node.getSize();
            if (Math.abs(currentSize.width - newWidth) > 2 || Math.abs(currentSize.height - newHeight) > 2) {
                node.resize(newWidth, newHeight);
            }
        }
    }, [node, label, description, tags, nodeType, isTaskDone, approvalDecoration]);

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

    // Story 8.1: Ensure the node UI reacts to outgoing edge changes (e.g. remote child added/removed)
    // Without this, child count / collapse toggle can become stale when only edges change.
    const [, bumpOutgoingEdgeRevision] = useState(0);
    useEffect(() => {
        if (!graph) return;

        const bumpIfOutgoing = ({ edge }: { edge: Edge }) => {
            if (edge.getSourceCellId() === node.id) {
                bumpOutgoingEdgeRevision((v) => v + 1);
            }
        };

        graph.on('edge:added', bumpIfOutgoing);
        graph.on('edge:removed', bumpIfOutgoing);

        return () => {
            graph.off('edge:added', bumpIfOutgoing);
            graph.off('edge:removed', bumpIfOutgoing);
        };
    }, [graph, node.id]);

    // Story 8.1: Get child count from node's graph
    const childCount = (() => {
        if (!graph) return 0;
        const outgoingEdges = graph.getOutgoingEdges(node) ?? [];
        const uniqueChildIds = new Set<string>();

        outgoingEdges.forEach((edge) => {
            // Only hierarchical edges define children; skip dependency edges
            if (isDependencyEdge(edge)) return;
            const targetId = edge.getTargetCellId();
            if (targetId) uniqueChildIds.add(targetId);
        });

        let count = 0;
        uniqueChildIds.forEach((childId) => {
            const cell = graph.getCellById(childId);
            if (cell && cell.isNode()) count += 1;
        });

        return count;
    })();

    const hasChildren = childCount > 0;

    // Story 8.1: Get hidden descendant count for collapsed node
    const hiddenDescendantCount = (() => {
        if (!isCollapsed) return 0;
        if (!graph) return 0;
        const visited = new Set<string>([node.id]);
        const queue: string[] = [node.id];
        let count = 0;

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const outgoingEdges = graph.getOutgoingEdges(currentId) ?? [];
            outgoingEdges.forEach((edge) => {
                if (isDependencyEdge(edge)) return;
                const targetId = edge.getTargetCellId();
                if (!targetId || visited.has(targetId)) return;

                visited.add(targetId);
                const cell = graph.getCellById(targetId);
                if (cell && cell.isNode()) {
                    count += 1;
                    queue.push(targetId);
                }
            });
        }

        return count;
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
            <div className="relative">
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
                />
            </div>
        );
    }

    // 2. RICH NODE (PBS, Task, Requirement, App, Data with renderer)
    const renderer = getNodeRenderer(nodeType);
    if (renderer) {
        return (
            <div className="relative">
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
                />
            </div>
        );
    }

    // 3. LEGACY CARD NODE
    return (
        <div className="relative">
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
            />
        </div>
    );
}
