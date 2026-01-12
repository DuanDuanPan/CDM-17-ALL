'use client';

/**
 * Story 2.1: Dynamic Property Panel
 * Main component that renders type-specific forms based on node type
 * Story 9.5: Added LinkedAssetsSection for TASK and DATA nodes
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Archive, ChevronDown, RotateCcw, X } from 'lucide-react';
import { NodeType, type EnhancedNodeData, type NodeProps, type TaskProps, type Deliverable, type ApprovalPipeline } from '@cdm/types';
import { CommonHeader } from './CommonHeader';
import { getFormComponent } from './PropertyPanelRegistry';
import { TagEditor } from './TagEditor';
import { useConfirmDialog } from '@cdm/ui';
import { KnowledgeRecommendation } from '@/components/Knowledge'; // Story 2.8
import { ApprovalStatusPanel } from './ApprovalStatusPanel'; // Story 4.1
import { useCurrentUserId } from '@/contexts'; // Story 4.1: FIX-9
import { useAssetPreview } from '@/features/data-library/hooks/useAssetPreview'; // Story 9.5

// Story 9.5: Lazy load preview modals to avoid SSR issues
const ModelViewerModal = dynamic(
  () => import('@/features/industrial-viewer').then((mod) => mod.ModelViewerModal),
  { ssr: false }
);

const ContourViewerModal = dynamic(
  () => import('@/features/industrial-viewer').then((mod) => mod.ContourViewerModal),
  { ssr: false }
);

export interface PropertyPanelProps {
  nodeId: string | null;
  nodeData?: EnhancedNodeData;
  onClose?: () => void;
  onTypeChange?: (nodeId: string, newType: NodeType) => void;
  onPropsUpdate?: (nodeId: string, nodeType: NodeType, props: NodeProps) => void;
  onTagsUpdate?: (nodeId: string, tags: string[]) => void;
  onArchiveToggle?: (nodeId: string, nextIsArchived: boolean) => void;
  /** Story 7.2: Callback when approval/deliverables change - receives nodeId and payload for Yjs sync */
  onApprovalUpdate?: (nodeId: string, payload: { approval: ApprovalPipeline | null; deliverables: Deliverable[] }) => void;
}

// Story 4.1: FIX-9 - Use context instead of prop for currentUserId
export function PropertyPanel({
  nodeId,
  nodeData,
  onClose,
  onTypeChange,
  onPropsUpdate,
  onTagsUpdate,
  onArchiveToggle,
  onApprovalUpdate,
}: PropertyPanelProps) {
  const currentUserId = useCurrentUserId();
  const [currentType, setCurrentType] = useState<NodeType>(nodeData?.type || NodeType.ORDINARY);
  const { showConfirm } = useConfirmDialog();

  // Story 9.5: Asset preview state
  const { previewAsset, previewType, handleAssetPreview, handleClosePreview } = useAssetPreview();

  useEffect(() => {
    if (nodeData?.type) {
      setCurrentType(nodeData.type);
    }
  }, [nodeData]);

  if (!nodeId || !nodeData) {
    return null;
  }

  const handleTypeChange = (newType: NodeType) => {
    setCurrentType(newType);
    onTypeChange?.(nodeId, newType);
  };

  const handlePropsUpdate = (props: NodeProps) => {
    onPropsUpdate?.(nodeId, currentType, props);
  };

  const handleTagsUpdate = (tags: string[]) => {
    onTagsUpdate?.(nodeId, tags);
  };

  const handleArchiveToggle = () => {
    if (!onArchiveToggle) return;
    const nextIsArchived = !nodeData.isArchived;

    if (nextIsArchived) {
      // Show confirmation dialog for archive action
      showConfirm({
        title: '确认归档节点？',
        description: '归档后将从画布隐藏，但可在"归档箱"中随时恢复。',
        confirmText: '确认归档',
        cancelText: '取消',
        variant: 'warning',
        onConfirm: () => onArchiveToggle(nodeId, nextIsArchived),
      });
    } else {
      // No confirmation needed for unarchive
      onArchiveToggle(nodeId, nextIsArchived);
    }
  };


  // Get the appropriate form component
  const FormComponent = getFormComponent(currentType);

  return (
    <aside className="w-80 h-full bg-white/95 backdrop-blur-md border-l border-gray-200/50 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">属性面板</h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="关闭面板"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Common Header - Title, Creator, Timestamps */}
          {/* [AI-Review][MEDIUM-4] Fixed: Use nodeData.creator instead of hardcoded value */}
          <CommonHeader
            title={nodeData.label}
            createdAt={nodeData.createdAt}
            updatedAt={nodeData.updatedAt}
            creator={nodeData.creator || undefined}
          />

          {/* Node Type Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">节点类型</label>
            <div className="relative">
              <select
                value={currentType}
                onChange={(e) => handleTypeChange(e.target.value as NodeType)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value={NodeType.ORDINARY}>普通 (Ordinary)</option>
                <option value={NodeType.TASK}>任务 (Task)</option>
                <option value={NodeType.REQUIREMENT}>需求 (Requirement)</option>
                <option value={NodeType.PBS}>研发对象 (PBS)</option>
                <option value={NodeType.DATA}>数据 (Data)</option>
                <option value={NodeType.APP}>工业应用 (APP)</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Tags + Archive (Story 2.5) */}
          <div className="space-y-4">
            <TagEditor
              tags={nodeData.tags ?? []}
              onChange={handleTagsUpdate}
              maxTags={20}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">归档</span>
              <button
                type="button"
                onClick={handleArchiveToggle}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${nodeData.isArchived
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
              >
                {nodeData.isArchived ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    恢复
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    归档
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200" />

          {/* Dynamic Form based on Node Type */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">类型属性</h3>
            <FormComponent
              key={`form-${nodeId}-${currentType}`}
              nodeId={nodeId}
              initialData={nodeData.props}
              onUpdate={handlePropsUpdate}
              onAssetPreview={handleAssetPreview}
            />
          </div>

          {/* Story 2.8: Knowledge Recommendation (AC1.1 - visible for any selected node) */}
          <KnowledgeRecommendation
            nodeId={nodeId}
            nodeTitle={nodeData.label}
          />

          {/* Story 4.1: Approval Workflow Panel (visible for TASK nodes only) */}
          {currentType === NodeType.TASK && (() => {
            const taskProps = (nodeData.props as TaskProps | undefined) ?? {};
            const deliverables = taskProps.deliverables ?? nodeData.deliverables ?? [];
            return (
              <>
                <div className="border-t border-gray-200" />
                <ApprovalStatusPanel
                  nodeId={nodeId}
                  nodeLabel={nodeData.label}
                  approval={nodeData.approval ?? null}
                  deliverables={deliverables}
                  isAssignee={taskProps.assigneeId === currentUserId}
                  onUpdate={(payload) => onApprovalUpdate?.(nodeId, payload)}
                />
              </>
            );
          })()}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        <p className="text-xs text-gray-500 text-center">
          节点 ID: <span className="font-mono">{nodeId}</span>
        </p>
      </div>

      {/* Story 9.5: Preview modals based on asset type */}
      {previewAsset && previewAsset.storagePath && previewType === 'model' && (
        <ModelViewerModal
          isOpen={!!previewAsset}
          onClose={handleClosePreview}
          assetUrl={previewAsset.storagePath}
          assetName={previewAsset.name}
        />
      )}

      {previewAsset && previewAsset.storagePath && previewType === 'contour' && (
        <ContourViewerModal
          isOpen={!!previewAsset}
          onClose={handleClosePreview}
          assetUrl={previewAsset.storagePath}
          assetName={previewAsset.name}
        />
      )}
    </aside>
  );
}

// Export all components
export { CommonHeader } from './CommonHeader';
export { OrdinaryForm } from './OrdinaryForm';
export { TaskForm } from './TaskForm';
export { RequirementForm } from './RequirementForm';
export { PBSForm } from './PBSForm';
export { DataForm } from './DataForm';
export { DataPreviewDialog } from './DataPreviewDialog';
export { PropertyFormRegistry, getFormComponent } from './PropertyPanelRegistry';
