'use client';

/**
 * PropertiesPanelContent - Property panel content for unified left sidebar
 * 
 * Extracted from RightSidebar to work within the left sidebar layout.
 * Displays node properties when a node is selected.
 */

import { PropertyPanel } from '@/components/PropertyPanel';
import type { Graph } from '@antv/x6';
import type * as Y from 'yjs';
import { useRightSidebarNodeData } from '@/hooks/right-sidebar/useRightSidebarNodeData';
import { useRightSidebarActions } from '@/hooks/right-sidebar/useRightSidebarActions';
import { Loader2 } from 'lucide-react';

export interface PropertiesPanelContentProps {
    selectedNodeId: string | null;
    graph: Graph | null;
    graphId: string;
    yDoc?: Y.Doc | null;
    creatorName?: string;
}

export function PropertiesPanelContent({
    selectedNodeId,
    graph,
    graphId,
    yDoc = null,
    creatorName,
}: PropertiesPanelContentProps) {
    // Node data management (fetch, ensureNodeExists, subscriptions)
    const {
        nodeData,
        setNodeData,
        isLoading,
        fetchError,
        getX6Node,
        resolvedCreatorName,
    } = useRightSidebarNodeData({
        selectedNodeId,
        graph,
        graphId,
        yDoc,
        creatorName,
    });

    // Action handlers (type change, props update, tags, archive, approval)
    const {
        handleTypeChange,
        handlePropsUpdate,
        handleTagsUpdate,
        handleArchiveToggle,
        handleApprovalUpdate,
    } = useRightSidebarActions({
        nodeData,
        setNodeData,
        graph,
        yDoc,
        getX6Node,
        resolvedCreatorName,
        // No onClose callback - panel close is handled by parent
    });

    if (!selectedNodeId) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-400">
                <p className="text-sm">请选中一个节点</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-sm text-red-500">{fetchError}</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <PropertyPanel
                nodeId={selectedNodeId}
                nodeData={nodeData || undefined}
                onTypeChange={handleTypeChange}
                onPropsUpdate={handlePropsUpdate}
                onTagsUpdate={handleTagsUpdate}
                onArchiveToggle={handleArchiveToggle}
                onApprovalUpdate={handleApprovalUpdate}
                // Don't show close button - handled by sidebar header
                hideCloseButton
            />
        </div>
    );
}

export default PropertiesPanelContent;
