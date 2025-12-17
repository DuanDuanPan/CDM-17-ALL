'use client';

/**
 * Story 2.1: Dynamic Property Panel
 * Main component that renders type-specific forms based on node type
 */

import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { NodeType, type EnhancedNodeData } from '@cdm/types';
import { CommonHeader } from './CommonHeader';
import { getFormComponent } from './PropertyPanelRegistry';

export interface PropertyPanelProps {
  nodeId: string | null;
  nodeData?: EnhancedNodeData;
  onClose?: () => void;
  onTypeChange?: (nodeId: string, newType: NodeType) => void;
  onPropsUpdate?: (nodeId: string, nodeType: NodeType, props: any) => void;
}

export function PropertyPanel({
  nodeId,
  nodeData,
  onClose,
  onTypeChange,
  onPropsUpdate,
}: PropertyPanelProps) {
  const [currentType, setCurrentType] = useState<NodeType>(nodeData?.type || NodeType.ORDINARY);

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

  const handlePropsUpdate = (props: any) => {
    onPropsUpdate?.(nodeId, currentType, props);
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
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200" />

          {/* Dynamic Form based on Node Type */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">类型属性</h3>
            <FormComponent
              nodeId={nodeId}
              initialData={nodeData.props}
              onUpdate={handlePropsUpdate}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        <p className="text-xs text-gray-500 text-center">
          节点 ID: <span className="font-mono">{nodeId}</span>
        </p>
      </div>
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
