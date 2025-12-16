'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Node } from '@antv/x6';
import type { MindNodeData } from '@cdm/types';

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

  const borderClass = isSelected
    ? 'border-2 border-blue-500 ring-2 ring-blue-200'
    : 'border border-gray-300';
  const bgClass = isEditing ? 'bg-white' : 'bg-white/90 backdrop-blur-sm';

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative flex items-center justify-center px-4 py-3 ${bgClass} rounded-lg shadow-md ${borderClass} transition-all`}
      onDoubleClick={enterEditMode}
      style={{ cursor: isEditing ? 'text' : 'pointer' }}
    >
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
        <div className="text-sm font-medium text-gray-900 text-center break-words">
          {text || '新主题'}
        </div>
      )}
    </div>
  );
}
