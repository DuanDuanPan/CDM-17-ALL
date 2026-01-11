/**
 * Story 9.2: PBS Tree View Component
 * Displays PBS nodes in a tree structure with selection and expand/collapse
 * AC#1: Left side shows PBS tree, right side shows linked assets
 */

'use client';

import { Box, ChevronRight, ChevronDown, FolderTree } from 'lucide-react';
import { cn, Button } from '@cdm/ui';
import { usePbsNodes, type PbsTreeNode } from '../hooks/usePbsNodes';

interface PbsTreeViewProps {
  /** Currently selected PBS node ID */
  selectedId: string | null;
  /** Callback when a node is selected */
  onSelect: (id: string | null) => void;
  /** Expanded PBS node IDs (AC#5) */
  expandedIds: Set<string>;
  /** Toggle expand/collapse for a PBS node (AC#5) */
  onToggleExpand: (nodeId: string) => void;
  /** Whether to include sub-nodes in asset query */
  includeSubNodes?: boolean;
  /** Callback when includeSubNodes changes */
  onIncludeSubNodesChange?: (value: boolean) => void;
}

/**
 * PBS Tree View - displays PBS nodes from the graph
 */
export function PbsTreeView({
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
  includeSubNodes = false,
  onIncludeSubNodesChange,
}: PbsTreeViewProps) {
  const { pbsNodes } = usePbsNodes();

  // Empty state
  if (pbsNodes.length === 0) {
    return (
      <div
        data-testid="empty-state-pbs"
        className="flex flex-col items-center justify-center h-full py-12 text-gray-400"
      >
        <FolderTree className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-medium">暂无 PBS 节点</p>
        <p className="text-xs mt-1 text-gray-400">
          在脑图中创建 PBS 节点后，它们将显示在这里
        </p>
      </div>
    );
  }

  return (
    <div data-testid="pbs-tree" className="flex flex-col h-full">
      {/* Toolbar with "Include Sub-nodes" toggle */}
      {onIncludeSubNodesChange && (
        <div className="flex items-center justify-end px-2 py-2 border-b border-gray-100 dark:border-gray-800">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSubNodes}
              onChange={(e) => onIncludeSubNodesChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            包含子节点
          </label>
        </div>
      )}

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto py-2">
        {pbsNodes.map((node) => (
          <PbsTreeItem
            key={node.id}
            node={node}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggle={onToggleExpand}
            level={0}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual PBS tree item
 */
interface PbsTreeItemProps {
  node: PbsTreeNode;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string | null) => void;
  onToggle: (id: string) => void;
  level: number;
}

function PbsTreeItem({
  node,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  level,
}: PbsTreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  const handleClick = () => {
    onSelect(isSelected ? null : node.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  };

  return (
    <div>
      <div
        data-testid={`pbs-tree-node-${node.id}`}
        className={cn(
          'flex items-center gap-1 h-8 px-2 cursor-pointer rounded transition-colors duration-150',
          'hover:bg-gray-50 dark:hover:bg-gray-800',
          isSelected && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse toggle */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-4 h-4 p-0 text-gray-400 hover:text-gray-600"
            onClick={handleToggle}
            aria-label={isExpanded ? '折叠' : '展开'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </Button>
        ) : (
          <span className="w-4" />
        )}

        {/* PBS icon */}
        <Box className="w-4 h-4 text-blue-500 flex-shrink-0" />

        {/* Label */}
        <span className="text-sm truncate flex-1">{node.label}</span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div data-testid={`pbs-tree-children-${node.id}`}>
          {node.children.map((child) => (
            <PbsTreeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
