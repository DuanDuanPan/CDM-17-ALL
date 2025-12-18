'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Node } from '@antv/x6';
import { CheckCircle, FileText, Box, Database } from 'lucide-react';
import { NodeType, type TaskProps } from '@cdm/types';
import type { MindNodeData } from '@cdm/types';
import { updateNodeProps } from '@/lib/api/nodes';
import { graphLogger as logger } from '@/lib/logger';

type MindNodeOperation = 'addChild' | 'addSibling';

export interface MindNodeProps {
  node: Node;
}

const DEFAULT_DATA: MindNodeData = {
  id: '',
  label: '',
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

export function MindNode({ node }: MindNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const getData = useCallback((): MindNodeData => {
    return (node?.getData() as MindNodeData) ?? DEFAULT_DATA;
  }, [node]);

  const [isEditing, setIsEditing] = useState(() => !!getData().isEditing);
  const [isSelected, setIsSelected] = useState(() => !!getData().isSelected);
  const [text, setText] = useState(() => getData().label ?? '');

  // Sync local state when node data changes (selection/editing/label).
  useEffect(() => {
    if (!node) return;

    const onDataChange = () => {
      const data = (node.getData() as MindNodeData) ?? DEFAULT_DATA;
      setIsEditing(!!data.isEditing);
      setIsSelected(!!data.isSelected);
      if (!data.isEditing) {
        setText(data.label ?? '');
      }
    };

    node.on('change:data', onDataChange);
    return () => {
      node.off('change:data', onDataChange);
    };
  }, [node]);

  // Focus input when entering edit mode.
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Auto-resize node height based on rendered text to avoid overflow.
  useLayoutEffect(() => {
    const measureEl = measureRef.current;
    if (!measureEl) return;

    const minHeight = 50;
    const nextHeight = Math.max(minHeight, measureEl.scrollHeight);
    const currentSize = node.getSize();

    if (Math.abs(currentSize.height - nextHeight) > 1) {
      node.resize(currentSize.width, nextHeight);
    }
  }, [node, text, isEditing]);

  const enterEditMode = () => {
    setIsEditing(true);
    node.setData({ isEditing: true } as Partial<MindNodeData>);
  };

  const commit = useCallback(() => {
    node.setData({ label: text, isEditing: false } as Partial<MindNodeData>);
    setIsEditing(false);
  }, [node, text]);

  const cancel = useCallback(() => {
    const data = getData();
    setText(data.label ?? '');
    node.setData({ isEditing: false } as Partial<MindNodeData>);
    setIsEditing(false);
  }, [getData, node]);

  const focusGraphContainer = useCallback(() => {
    // Ensure browse-mode shortcuts (Enter/Tab) keep working after commit/cancel.
    const el = document.getElementById('graph-container') as HTMLElement | null;
    el?.focus();
    requestAnimationFrame(() => {
      document.getElementById('graph-container')?.focus();
    });
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Keep these shortcuts inside the input; don't bubble to graph shortcuts.
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commit();
      focusGraphContainer();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      commit();

      const el = containerRef.current;
      if (el) {
        dispatchNodeOperation(el, 'addChild', node.id);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
      focusGraphContainer();
    }
  };

  // Get node type and props from data (Story 2.1)
  // [AI-Review-2][MEDIUM-3] Fixed: Use MindNodeData type instead of 'as any'
  const data = getData();
  const nodeType = data.nodeType || NodeType.ORDINARY;
  const taskStatus = (data.props as TaskProps | undefined)?.status;
  const isTaskDone = nodeType === NodeType.TASK && taskStatus === 'done';

  // Visual differentiation by type (Story 2.1)
  // [AI-Review][HIGH-3] Added: Task 'done' status shows gray/strikethrough
  const getTypeStyles = () => {
    // Special case: completed task
    if (isTaskDone) {
      return {
        borderColor: 'border-gray-400',
        bgColor: 'bg-gray-100/90',
        icon: null,
        textClass: 'text-gray-500 line-through',
      };
    }

    switch (nodeType) {
      case NodeType.TASK:
        return {
          borderColor: 'border-green-400',
          bgColor: 'bg-green-50/90',
          icon: null,
          textClass: 'text-gray-900',
        };
      case NodeType.REQUIREMENT:
        return {
          borderColor: 'border-purple-400',
          bgColor: 'bg-purple-50/90',
          icon: <FileText className="w-4 h-4 text-purple-600" />,
          textClass: 'text-gray-900',
        };
      case NodeType.PBS:
        return {
          borderColor: 'border-blue-400',
          bgColor: 'bg-blue-50/90',
          icon: <Box className="w-4 h-4 text-blue-600" />,
          textClass: 'text-gray-900',
        };
      case NodeType.DATA:
        return {
          borderColor: 'border-orange-400',
          bgColor: 'bg-orange-50/90',
          icon: <Database className="w-4 h-4 text-orange-600" />,
          textClass: 'text-gray-900',
        };
      default:
        return {
          borderColor: 'border-gray-300',
          bgColor: 'bg-white/90',
          icon: null,
          textClass: 'text-gray-900',
        };
    }
  };

  const typeStyles = getTypeStyles();
  const borderClass = isSelected
    ? 'border-2 border-blue-500 ring-2 ring-blue-200'
    : `border ${typeStyles.borderColor}`;
  const bgClass = isEditing ? 'bg-white' : `${typeStyles.bgColor} backdrop-blur-sm`;
  const textClass = typeStyles.textClass || 'text-gray-900';

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative flex items-center justify-center gap-2 px-4 py-3 ${bgClass} rounded-lg shadow-md ${borderClass} transition-all`}
      onDoubleClick={enterEditMode}
      style={{ cursor: isEditing ? 'text' : 'pointer' }}
    >
      {/* Task checkbox (AC#9-10) */}
      {!isEditing && nodeType === NodeType.TASK && (
        <button
          type="button"
          aria-label="Toggle task done"
          className="flex-shrink-0 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 bg-white"
          onClick={(event) => {
            event.stopPropagation();
            const currentData = getData();
            const currentProps = (currentData.props as TaskProps) || {};
            const nextStatus = currentProps.status === 'done' ? 'todo' : 'done';
            const nextProps: TaskProps = { ...currentProps, status: nextStatus };
            node.setData({ ...currentData, props: nextProps } as Partial<MindNodeData>);
            updateNodeProps(node.id, NodeType.TASK, nextProps).then((success) => {
              if (!success) {
                logger.warn('Backend props update failed', { nodeId: node.id });
              }
            }).catch((error) => {
              logger.error('Failed to update task status', { nodeId: node.id, error });
            });
          }}
        >
          {isTaskDone && <CheckCircle className="w-4 h-4 text-green-600" />}
        </button>
      )}

      {/* Type Icon (Story 2.1) */}
      {!isEditing && typeStyles.icon && (
        <div className="flex-shrink-0">{typeStyles.icon}</div>
      )}

      <div
        ref={measureRef}
        aria-hidden="true"
        className="absolute inset-0 px-4 py-3 text-sm font-medium text-gray-900 text-center break-words opacity-0 pointer-events-none select-none"
      >
        {text || '新主题'}
      </div>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={handleInputKeyDown}
          className="w-full bg-transparent text-center text-sm font-medium text-gray-900 outline-none border-none"
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <div className={`flex-1 text-sm font-medium ${textClass} text-center break-words`}>
          {text || '新主题'}
        </div>
      )}
    </div>
  );
}
