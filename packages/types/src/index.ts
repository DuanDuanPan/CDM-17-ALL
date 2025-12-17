// Node types for the mindmap graph
export interface NodeData {
  id: string;
  label: string;
  type?: 'root' | 'topic' | 'subtopic';
  parentId?: string;
  collapsed?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// Layout mode type for the mindmap
export type LayoutMode = 'mindmap' | 'logic' | 'free';

// Story 2.1: Import semantic node types for MindNodeData extension
import type { NodeType, NodeProps } from './node-types';

// Enhanced node data for MindNode component (supports editing)
// [AI-Review-2][MEDIUM-3] Extended with Story 2.1 fields (nodeType, props)
export interface MindNodeData extends NodeData {
  isEditing?: boolean;   // Whether node is in edit mode
  isSelected?: boolean;  // Whether node is selected
  x?: number;            // Node position X
  y?: number;            // Node position Y
  width?: number;        // Node width (auto-resize)
  height?: number;       // Node height (auto-resize)
  layoutMode?: LayoutMode; // Layout mode for the mindmap (default: 'mindmap')
  // Story 2.1: Semantic node type and properties
  nodeType?: NodeType;
  props?: NodeProps;
}

// Edge types for connections between nodes
export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type?: 'hierarchical' | 'reference';
}

// Graph state representation
export interface GraphState {
  nodes: NodeData[];
  edges: EdgeData[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Story 2.1: Export semantic node types
export * from './node-types';
