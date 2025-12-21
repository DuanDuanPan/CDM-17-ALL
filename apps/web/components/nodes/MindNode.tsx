'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Node } from '@antv/x6';
import {
  CheckCircle,
  FileText,
  Box,
  Database,
  MoreHorizontal,
  Lock,
  User,
  Send,
  AlertCircle,
  Clock
} from 'lucide-react';
import { NodeType, type TaskProps, type RequirementProps, type PBSProps, type DataProps } from '@cdm/types';
import type { MindNodeData } from '@cdm/types';
import { updateNode } from '@/lib/api/nodes';
import { graphLogger as logger } from '@/lib/logger';

type MindNodeOperation = 'addChild' | 'addSibling';

export interface MindNodeProps {
  node: Node;
}

const DEFAULT_DATA: MindNodeData = {
  id: '',
  label: '',
  description: '',
  isEditing: false,
  isSelected: false,
};

function dispatchNodeOperation(
  el: HTMLElement,
  action: MindNodeOperation,
  nodeId: string
) {
  el.dispatchEvent(
    new CustomEvent('mindmap:node-operation', {
      bubbles: true,
      detail: { action, nodeId },
    })
  );
}

// Dispatch batch-stop event to finalize undo grouping after node creation+editing
function dispatchBatchStop(el: HTMLElement, nodeId: string) {
  el.dispatchEvent(
    new CustomEvent('mindmap:batch-stop', {
      bubbles: true,
      detail: { nodeId },
    })
  );
}

// Helpers for semantic styling
const getTypeConfig = (type: NodeType, isDone: boolean = false) => {
  if (isDone) {
    return {
      borderColor: 'border-emerald-200',
      bgColor: 'bg-emerald-50/80',
      shadowColor: 'shadow-emerald-900/5',
      accentColor: 'text-emerald-600',
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      pill: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Done' }
    };
  }

  switch (type) {
    case NodeType.TASK:
      return {
        borderColor: 'border-emerald-400',
        bgColor: 'bg-white/90',
        shadowColor: 'shadow-emerald-500/20',
        accentColor: 'text-emerald-600',
        icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        pill: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Todo' }
      };
    case NodeType.REQUIREMENT:
      return {
        borderColor: 'border-violet-400',
        bgColor: 'bg-white/90',
        shadowColor: 'shadow-violet-500/20',
        accentColor: 'text-violet-600',
        icon: <FileText className="w-5 h-5 text-violet-500" />,
        pill: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Must Have' }
      };
    case NodeType.PBS:
      return {
        borderColor: 'border-sky-400',
        bgColor: 'bg-white/90',
        shadowColor: 'shadow-sky-500/20',
        accentColor: 'text-sky-600',
        icon: <Box className="w-5 h-5 text-sky-500" />,
        pill: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'v1.0' }
      };
    case NodeType.DATA:
      return {
        borderColor: 'border-amber-400',
        bgColor: 'bg-white/90',
        shadowColor: 'shadow-amber-500/20',
        accentColor: 'text-amber-600',
        icon: <Database className="w-5 h-5 text-amber-500" />,
        pill: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Internal' }
      };
    default: // ORDINARY
      return {
        borderColor: 'border-gray-200',
        bgColor: 'bg-white',
        shadowColor: 'shadow-sm',
        accentColor: 'text-gray-600',
        icon: null,
        pill: null
      };
  }
};

const NODE_WIDTH = 220;

export function MindNode({ node }: MindNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);
  // Separate refs for measuring title and description
  const titleMeasureRef = useRef<HTMLDivElement>(null);
  const descMeasureRef = useRef<HTMLDivElement>(null);

  const getData = useCallback((): MindNodeData => {
    return (node?.getData() as MindNodeData) ?? DEFAULT_DATA;
  }, [node]);

  const [isEditing, setIsEditing] = useState(() => !!getData().isEditing);
  const [isSelected, setIsSelected] = useState(() => !!getData().isSelected);

  // State for content
  const [label, setLabel] = useState(() => getData().label ?? '');
  const [description, setDescription] = useState(() => getData().description ?? '');

  // Story 2.6 Fix: State for tags to trigger re-render when tags change
  const [tags, setTags] = useState<string[]>(() => getData().tags ?? []);

  // Sync state with node data
  useEffect(() => {
    if (!node) return;
    const onDataChange = () => {
      const data = (node.getData() as MindNodeData) ?? DEFAULT_DATA;
      setIsEditing(!!data.isEditing);
      setIsSelected(!!data.isSelected);
      // Story 2.6 Fix: Always update tags to ensure UI reflects changes
      setTags(data.tags ?? []);
      if (!data.isEditing) {
        setLabel(data.label ?? '');
        setDescription(data.description ?? '');
      }
    };
    node.on('change:data', onDataChange);
    return () => {
      node.off('change:data', onDataChange);
    };
  }, [node]);

  // Focus management
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  // Derived state for styling
  const data = getData();
  const nodeType = data.nodeType || NodeType.ORDINARY;
  const taskProps = data.props as TaskProps | undefined;
  const isTaskDone = nodeType === NodeType.TASK && taskProps?.status === 'done';
  const styles = getTypeConfig(nodeType, isTaskDone);

  // Story 2.4: Assignment status indicator
  const assignmentStatus = taskProps?.assignmentStatus;
  const showAssignmentIndicator = nodeType === NodeType.TASK && assignmentStatus && assignmentStatus !== 'idle';

  // Dynamic pills based on props
  let pill = styles.pill;
  if (nodeType === NodeType.REQUIREMENT) {
    const priority = (data.props as RequirementProps)?.priority;
    if (priority) pill = { ...pill!, label: priority.charAt(0).toUpperCase() + priority.slice(1) };
  } else if (nodeType === NodeType.PBS) {
    const version = (data.props as PBSProps)?.version;
    if (version) pill = { ...pill!, label: version };
  } else if (nodeType === NodeType.DATA) {
    const secretLevel = (data.props as DataProps)?.secretLevel;
    if (secretLevel) pill = { ...pill!, label: secretLevel.charAt(0).toUpperCase() + secretLevel.slice(1) };
  }

  // Auto-resize logic - OPTIMIZED FOR FIXED WIDTH
  useLayoutEffect(() => {
    // Force fixed width for ALL nodes to ensure grid alignment
    // Height is dynamic based on content but we try to keep it minimal
    const currentSize = node.getSize();

    // Calculate required height based on content or use defaults
    // Note: We don't actually measure DOM here anymore for strict compactness
    // unless editing. For view mode, we trust CSS content flow.
    // However, X6 needs explicit size.

    const titleEl = titleMeasureRef.current;

    // Base height calculation
    let targetHeight = 40; // Default for ordinary

    if (nodeType !== NodeType.ORDINARY) {
      // Calculation for Card Nodes
      // Header (24) + Body (Text) + Footer (24) + Padding (16)
      // Approx minimal height = 64px
      targetHeight = 64;

      if (description) {
        targetHeight += 16; // Add space for 1 line of description
      }
    } else {
      // Ordinary node
      targetHeight = 36;
    }

    // If editing, let it grow
    if (isEditing && descMeasureRef.current && titleEl) {
      targetHeight = Math.max(targetHeight, titleEl.scrollHeight + descMeasureRef.current.scrollHeight + 32);
    }

    if (currentSize.width !== NODE_WIDTH || Math.abs(currentSize.height - targetHeight) > 2) {
      node.resize(NODE_WIDTH, targetHeight);
    }
  }, [node, label, description, isEditing, nodeType]);


  const focusGraphContainer = useCallback(() => {
    // Ensure browse-mode shortcuts (Enter/Tab) keep working after commit/cancel.
    const el = document.getElementById('graph-container') as HTMLElement | null;
    el?.focus();
    // Safety net for async React updates
    requestAnimationFrame(() => {
      document.getElementById('graph-container')?.focus();
    });
  }, []);

  const commit = useCallback(() => {
    // Dispatch batch-stop event to finalize undo grouping (if this node was just created)
    const el = containerRef.current;
    if (el) {
      dispatchBatchStop(el, node.id);
    }

    // Get previous data to check if label changed
    const prevData = getData();
    const labelChanged = label !== prevData.label;
    const descriptionChanged = description !== (prevData.description ?? '');

    // CRITICAL: Preserve ALL existing node data when updating label/description
    // X6's setData() REPLACES data, so we must spread existing data first
    // Story 2.6 Fix: Prevents loss of nodeType, props, tags when editing label
    node.setData({
      ...prevData,  // Preserve existing nodeType, props, tags, parentId, etc.
      label,
      description,
      isEditing: false,
      updatedAt: new Date().toISOString(),
    } as Partial<MindNodeData>);
    setIsEditing(false);

    // Sync to database if changed
    if ((labelChanged || descriptionChanged) && node.id) {
      const payload: { label?: string; description?: string } = {};
      if (labelChanged) payload.label = label;
      if (descriptionChanged) payload.description = description;

      updateNode(node.id, payload).catch((err) => {
        console.error('[MindNode] Failed to sync node to database:', err);
      });
    }
  }, [node, label, description, getData]);

  const cancel = useCallback(() => {
    // Dispatch batch-stop event to finalize undo grouping (if this node was just created)
    const el = containerRef.current;
    if (el) {
      dispatchBatchStop(el, node.id);
    }

    const d = getData();
    setLabel(d.label ?? '');
    setDescription(d.description ?? '');
    // CRITICAL: Preserve ALL existing node data when canceling edit
    // X6's setData() REPLACES data, so we must spread existing data first
    node.setData({ ...d, isEditing: false } as Partial<MindNodeData>);
    setIsEditing(false);
  }, [getData, node]);

  // Handle keyboard events (similar to before but adapted for 2 inputs)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Allow shift+enter for multiline description? maybe later
      e.preventDefault(); e.stopPropagation();
      commit();
      focusGraphContainer();
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      cancel();
      focusGraphContainer();
    } else if (e.key === 'Tab') {
      e.preventDefault(); e.stopPropagation();
      commit();
      // Add child logic...
      const el = containerRef.current;
      if (el) dispatchNodeOperation(el, 'addChild', node.id);
      // We don't strictly need to focus graph container here because the new node will take focus?
      // Actually, AddChildCommand creates a new node which auto-focuses.
      // However, if for some reason it fails, we should return focus.
      // But wait, if we focus container, and then new node mounts and steals focus, that's fine.
      focusGraphContainer();
    }
  };

  const containerClasses = `
    relative flex flex-col w-full h-full transition-all duration-200
    ${styles.bgColor} backdrop-blur-sm
    ${isSelected ? 'ring-2 ring-blue-500 border-transparent z-10' : `border ${styles.borderColor}`}
    ${isSelected ? 'shadow-md scale-[1.01]' : 'shadow-sm hover:shadow-md'}
    ${nodeType === NodeType.ORDINARY ? 'rounded px-3 py-1.5 items-center justify-center' : 'rounded-lg p-2 justify-between'}
  `;

  // === RENDER IMPL ===

  // 1. ORDINARY NODE RENDERING
  if (nodeType === NodeType.ORDINARY) {
    return (
      <div
        ref={containerRef}
        className={containerClasses}
        onDoubleClick={() => { setIsEditing(true); node.setData({ isEditing: true }); }}
      >
        {/* Measures */}
        <div ref={titleMeasureRef} className="absolute opacity-0 pointer-events-none text-sm font-medium px-2 text-center w-full break-words">
          {label || 'New Topic'}
        </div>

        {isEditing ? (
          <input
            ref={titleInputRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-center text-sm font-medium text-gray-900 outline-none placeholder-gray-300"
            placeholder="New Topic"
          />
        ) : (
          <span className="text-sm font-medium text-gray-700 text-center break-words w-full">
            {label || 'New Topic'}
          </span>
        )}
      </div>
    );
  }

  // 2. CARD NODE RENDERING (Task, Req, PBS, Data)
  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onDoubleClick={() => { setIsEditing(true); node.setData({ isEditing: true }); }}
      title={label} // Native tooltip for full text
    >
      {/* === HEADER (Icon + Title) === */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex-shrink-0">
          {styles.icon && <div className="scale-75 origin-center">{styles.icon}</div>}
        </div>

        {isEditing ? (
          <input
            ref={titleInputRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-xs font-bold text-gray-900 outline-none min-w-0"
            placeholder="Title"
          />
        ) : (
          <div className={`flex-1 text-xs font-bold truncate ${isTaskDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {label || 'New Item'}
          </div>
        )}

        {/* Menu Trigger */}
        <button className="flex-shrink-0 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>

      {/* === BODY (Desc) === */}
      {/* Only show description if editing or if it exists (very compact) */}
      {(isEditing || description) && (
        <div className="w-full mt-1 min-h-0">
          {isEditing ? (
            <input
              ref={descInputRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commit}
              className="w-full bg-transparent text-[10px] text-gray-500 outline-none placeholder-gray-300"
              placeholder="Description..."
            />
          ) : (
            <div className="text-[10px] text-gray-500 truncate leading-tight">
              {description}
            </div>
          )}
        </div>
      )}

      {/* === FOOTER (Pill + Tags + Assignment + ID) === */}
      <div className="w-full flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
        {/* Left: Status Pill + Tags */}
        <div className="flex items-center gap-1 overflow-hidden">
          {pill ? (
            <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium leading-none flex-shrink-0 ${pill.bg} ${pill.text}`}>
              {pill.label}
            </div>
          ) : <div />}

          {/* Story 2.5: Tag badges (max 2, then +N) */}
          {/* Story 2.6 Fix: Use tags state variable to ensure re-render on tag changes */}
          {tags && tags.length > 0 && (
            <div className="flex items-center gap-0.5 overflow-hidden">
              {tags.slice(0, 2).map((tag: string) => (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Dispatch custom event for tag search
                    const el = containerRef.current;
                    if (el) {
                      el.dispatchEvent(new CustomEvent('mindmap:tag-search', {
                        bubbles: true,
                        detail: { tag }
                      }));
                    }
                  }}
                  className="px-1 py-0.5 rounded text-[8px] font-medium
                             bg-blue-50 text-blue-600 hover:bg-blue-100
                             transition-colors cursor-pointer truncate max-w-[50px] flex-shrink-0"
                  title={`搜索标签: #${tag}`}
                >
                  #{tag}
                </button>
              ))}
              {tags.length > 2 && (
                <span className="text-[8px] text-gray-400 flex-shrink-0">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Story 2.4: Assignment Status Badge */}
          {showAssignmentIndicator && (
            <div
              className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium leading-none flex-shrink-0 ${assignmentStatus === 'accepted'
                  ? 'bg-green-100 text-green-700'
                  : assignmentStatus === 'dispatched'
                    ? 'bg-yellow-100 text-yellow-700'
                    : assignmentStatus === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : ''
                }`}
              title={
                assignmentStatus === 'accepted'
                  ? '已接受'
                  : assignmentStatus === 'dispatched'
                    ? '待确认'
                    : assignmentStatus === 'rejected'
                      ? '已驳回'
                      : ''
              }
            >
              {assignmentStatus === 'accepted' && <CheckCircle className="w-2 h-2" />}
              {assignmentStatus === 'dispatched' && <Clock className="w-2 h-2" />}
              {assignmentStatus === 'rejected' && <AlertCircle className="w-2 h-2" />}
              <span className="hidden sm:inline">
                {assignmentStatus === 'accepted' && '已接受'}
                {assignmentStatus === 'dispatched' && '待确认'}
                {assignmentStatus === 'rejected' && '驳回'}
              </span>
            </div>
          )}
        </div>

        {/* Right: Meta ID (Always visible for engineering context) */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-gray-400">{node.id.slice(0, 6).toUpperCase()}</span>
          {nodeType === NodeType.DATA && <Lock className="w-2.5 h-2.5 text-gray-300" />}
        </div>
      </div>

      {/* Hidden Measures for auto-resize calculation if needed */}
      <div ref={titleMeasureRef} className="absolute opacity-0 pointer-events-none text-xs font-bold w-[200px]">{label}</div>
      <div ref={descMeasureRef} className="absolute opacity-0 pointer-events-none text-[10px] w-[200px]">{description}</div>
    </div>
  );
}
