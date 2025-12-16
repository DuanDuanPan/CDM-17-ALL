'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGraph, addCenterNode } from '@/hooks/useGraph';
import { useMindmapPlugin } from '@/hooks/useMindmapPlugin';
import { useLayoutPlugin } from '@/hooks/useLayoutPlugin';
import { Graph, Node } from '@antv/x6';
import { AddChildCommand, AddSiblingCommand, RemoveNodeCommand } from '@cdm/plugin-mindmap-core';
import { LayoutMode } from '@cdm/types';

export interface GraphComponentProps {
  onNodeSelect?: (nodeId: string | null) => void;
  onLayoutChange?: (mode: LayoutMode) => void;
  onGridToggle?: (enabled: boolean) => void;
  currentLayout?: LayoutMode;
  gridEnabled?: boolean;
}

export function GraphComponent({
  onNodeSelect,
  onLayoutChange,
  onGridToggle,
  currentLayout = 'mindmap',
}: GraphComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // Set container after mount
  useEffect(() => {
    if (containerRef.current) {
      setContainer(containerRef.current);
    }
  }, []);

  const { graph, isReady } = useGraph({ container });

  // Initialize mindmap plugin (registers React shape)
  useMindmapPlugin(graph, isReady);

  // Initialize layout plugin
  const { gridEnabled } = useLayoutPlugin(graph, isReady, currentLayout ?? 'mindmap');

  useEffect(() => {
    onGridToggle?.(gridEnabled);
  }, [gridEnabled, onGridToggle]);

  // Keyboard event handler - must be at container level to intercept Tab
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!graph || !isReady) return;

      // Get selected nodes
      const selectedNodes = graph.getSelectedCells().filter((cell) => cell.isNode());
      if (selectedNodes.length !== 1) return;

      const node = selectedNodes[0] as Node;
      const nodeData = node.getData() || {};

      // If node is in edit mode, don't handle shortcuts (except Escape)
      if (nodeData.isEditing) {
        if (e.key === 'Escape') {
          e.preventDefault();
          node.setData({ ...nodeData, isEditing: false });
        }
        return;
      }

      // Handle keyboard shortcuts
      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          createChildNode(graph, node);
          break;

        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          createSiblingOrChildNode(graph, node);
          break;

        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          e.stopPropagation();
          removeNode(graph, node);
          break;

        case ' ': // Space
          e.preventDefault();
          e.stopPropagation();
          node.setData({ ...nodeData, isEditing: true });
          break;
      }
    },
    [graph, isReady]
  );

  // Add center node when graph is ready
  useEffect(() => {
    if (graph && isReady) {
      // Add the default center node using mind-node shape
      addCenterNode(graph);

      // Event handlers
      const handleNodeSelected = ({ node }: { node: Node }) => {
        // Update node data to reflect selected state
        const nodeData = node.getData() || {};
        node.setData({ ...nodeData, isSelected: true });
        onNodeSelect?.(node.id);

        // Keep focus on graph container for keyboard shortcuts, unless we are entering edit mode
        if (!nodeData.isEditing) {
          containerRef.current?.focus();
        }
      };

      const handleNodeUnselected = ({ node }: { node: Node }) => {
        // Update node data to reflect unselected state
        const nodeData = node.getData() || {};
        node.setData({ ...nodeData, isSelected: false });
      };

      const handleBlankClick = () => {
        onNodeSelect?.(null);
        // Keep focus on graph container
        containerRef.current?.focus();
      };

      // Handle node click to ensure focus stays on container
      const handleNodeClick = ({ node, e }: { node: Node; e: MouseEvent }) => {
        // Don't steal focus from the in-node input while editing.
        const target = e?.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            (target as HTMLElement).isContentEditable)
        ) {
          return;
        }

        const nodeData = node.getData() || {};
        if (nodeData.isEditing) return;

        containerRef.current?.focus();
      };

      // Handle node operations dispatched from MindNode while editing (Tab/Enter).
      const handleMindmapNodeOperation = (event: Event) => {
        const detail = (event as CustomEvent<{ action?: string; nodeId?: string }>).detail;
        const action = detail?.action;
        const nodeId = detail?.nodeId;
        if (!action || !nodeId) return;

        const cell = graph.getCellById(nodeId);
        if (!cell || !cell.isNode()) return;

        const targetNode = cell as Node;
        if (action === 'addChild') {
          createChildNode(graph, targetNode);
        } else if (action === 'addSibling') {
          createSiblingOrChildNode(graph, targetNode);
        }
      };

      const containerEl = containerRef.current;
      containerEl?.addEventListener(
        'mindmap:node-operation',
        handleMindmapNodeOperation as EventListener
      );

      // Setup node selection events
      graph.on('node:selected', handleNodeSelected);
      graph.on('node:unselected', handleNodeUnselected);
      graph.on('blank:click', handleBlankClick);
      graph.on('node:click', handleNodeClick);

      // Cleanup function to remove event listeners
      return () => {
        containerEl?.removeEventListener(
          'mindmap:node-operation',
          handleMindmapNodeOperation as EventListener
        );
        if (graph && typeof graph.off === 'function') {
          graph.off('node:selected', handleNodeSelected);
          graph.off('node:unselected', handleNodeUnselected);
          graph.off('blank:click', handleBlankClick);
          graph.off('node:click', handleNodeClick);
        }
      };
    }
  }, [graph, isReady, onNodeSelect]);

  return (
    <div
      id="graph-container"
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '100%', outline: 'none' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    />
  );
}

const addChildCommand = new AddChildCommand();
const addSiblingCommand = new AddSiblingCommand();
const removeNodeCommand = new RemoveNodeCommand();

// Helper: Create child node
function createChildNode(graph: Graph, parentNode: Node): void {
  const newNode = addChildCommand.execute(graph, parentNode);
  if (newNode) {
    graph.select(newNode);
  }
}

// Helper: Create sibling (or child if root)
function createSiblingOrChildNode(graph: Graph, selectedNode: Node): void {
  const newNode = addSiblingCommand.execute(graph, selectedNode);
  if (newNode) {
    graph.select(newNode);
  }
}

// Helper: Remove node and its descendants
function removeNode(graph: Graph, node: Node): void {
  removeNodeCommand.execute(graph, node);
}
