'use client';

import * as React from 'react';
import { ChevronRight, ChevronDown, Box, Layers } from 'lucide-react';
import { cn } from '@cdm/ui';
import type { Model, ModelNode } from 'online-3d-viewer';

export interface ModelStructureTreeProps {
  model: Model | null;
  selectedNodeId: number | null;
  onNodeSelect: (nodeId: number) => void;
  className?: string;
}

interface TreeNodeData {
  id: number;
  name: string;
  children: TreeNodeData[];
  meshCount: number;
}

// Convert Model to tree data structure
function buildTreeData(node: ModelNode): TreeNodeData {
  const children = node.GetChildNodes().map(buildTreeData);
  return {
    id: node.GetId(),
    name: node.GetName() || `Node ${node.GetId()}`,
    children,
    meshCount: node.MeshIndexCount(),
  };
}

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function TreeNode({ node, level, selectedId, onSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = React.useState(level < 2);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleSelect = () => {
    onSelect(node.id);
  };

  return (
    <div data-testid="structure-tree-node">
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 cursor-pointer rounded-md transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          isSelected && 'bg-blue-100 dark:bg-blue-900/50 selected'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggle}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            data-testid="tree-expand-button"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {hasChildren ? (
          <Layers className="w-4 h-4 text-blue-500 flex-shrink-0" />
        ) : (
          <Box className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}

        {/* Name */}
        <span
          className={cn(
            'text-sm truncate',
            isSelected
              ? 'text-blue-700 dark:text-blue-300 font-medium'
              : 'text-gray-700 dark:text-gray-300'
          )}
          title={node.name}
        >
          {node.name}
        </span>

        {/* Mesh count badge */}
        {node.meshCount > 0 && (
          <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
            {node.meshCount}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ModelStructureTree({
  model,
  selectedNodeId,
  onNodeSelect,
  className,
}: ModelStructureTreeProps) {
  const treeData = React.useMemo(() => {
    if (!model) return null;
    const rootNode = model.GetRootNode();
    return rootNode ? buildTreeData(rootNode) : null;
  }, [model]);

  if (!model || !treeData) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full text-sm text-gray-400',
          className
        )}
      >
        无结构数据
      </div>
    );
  }

  // If root has no children, show single node message
  if (treeData.children.length === 0) {
    return (
      <div
        className={cn('p-4 text-sm text-gray-500 dark:text-gray-400', className)}
        data-testid="model-structure-tree"
      >
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-gray-400" />
          <span>{treeData.name}</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">单一几何体，无层级结构</p>
      </div>
    );
  }

  return (
    <div
      className={cn('overflow-auto', className)}
      data-testid="model-structure-tree"
    >
      <TreeNode
        node={treeData}
        level={0}
        selectedId={selectedNodeId}
        onSelect={onNodeSelect}
      />
    </div>
  );
}
